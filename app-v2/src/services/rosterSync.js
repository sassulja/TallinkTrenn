import { ref, get, update } from "firebase/database";
import { database } from "./firebase";
import { getTallinnNow } from "../utils/dateUtils";
import { formatInTimeZone } from "date-fns-tz";
import { addDays, format } from "date-fns";

const TALLINN_TZ = "Europe/Tallinn";

function hasValidDateRange(record) {
    if (!record || !record.effectiveFrom) {
        return false;
    }

    const from = new Date(record.effectiveFrom);
    if (isNaN(from)) {
        return false;
    }

    if (!record.effectiveTo) {
        return true;
    }

    const to = new Date(record.effectiveTo);
    if (isNaN(to)) {
        return false;
    }

    return from <= to;
}

/**
 * Synchronizes the rosters for sessionInstances within the 30-day horizon.
 * Additive and protective rules. Applies enrollments and individual date changes.
 * 
 * @param {string} runByUserId - The UID of the Admin/System executing the sync
 * @returns {Promise<{added: number, removed: number, skippedProtected: number, instancesProcessed: number}>}
 */
export async function syncRostersForNext30Days(runByUserId) {
    if (!runByUserId) {
        throw new Error("runByUserId is required to sync rosters.");
    }

    // 1. Calculate the explicit 30-day horizon
    const now = getTallinnNow();
    const todayString = formatInTimeZone(now, TALLINN_TZ, 'yyyy-MM-dd');

    // Parse to true UTC noon to avoid DST skips during AddDays
    const [year, month, day] = todayString.split('-').map(Number);
    const baseDateUTC = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

    const horizonDates = new Set();
    for (let i = 0; i <= 30; i++) {
        horizonDates.add(format(addDays(baseDateUTC, i), 'yyyy-MM-dd'));
    }

    // 2. Read only required tables
    const dbRef = ref(database);
    const [instancesSnap, definitionsSnap, enrollmentsSnap, changesSnap, rostersSnap] = await Promise.all([
        get(ref(database, 'sessionInstances')),
        get(ref(database, 'sessionDefinitions')),
        get(ref(database, 'recurringEnrollments')),
        get(ref(database, 'recurringChanges')),
        get(ref(database, 'rosters'))
    ]);

    const instances = instancesSnap.exists() ? instancesSnap.val() : {};
    const definitions = definitionsSnap.exists() ? definitionsSnap.val() : {};
    const enrollments = enrollmentsSnap.exists() ? enrollmentsSnap.val() : {};
    const changes = changesSnap.exists() ? changesSnap.val() : {};
    const existingRosters = rostersSnap.exists() ? rostersSnap.val() : {};

    let addedCount = 0;
    let removedCount = 0;
    let skippedProtectedCount = 0;
    let instancesProcessedCount = 0;

    const updates = {};

    // 3. Process each valid instance within the horizon
    for (const [instanceId, instanceData] of Object.entries(instances)) {
        // Skip one-offs or instances outside our specific 30 day horizon
        if (!instanceData.definitionId || !horizonDates.has(instanceData.date)) {
            continue;
        }

        instancesProcessedCount++;
        const dateD = instanceData.date;
        const defId = instanceData.definitionId;
        if (!definitions[defId]) {
            continue;
        }

        // Build Expected Players Set based on Policy
        const expectedPlayers = new Set();

        // A) Process base recurring enrollments for this definition
        const defEnrollments = enrollments[defId] || {};
        for (const [playerId, enrollData] of Object.entries(defEnrollments)) {
            if (!hasValidDateRange(enrollData)) {
                continue;
            }

            if (enrollData.active) {
                const effFrom = enrollData.effectiveFrom;
                const effTo = enrollData.effectiveTo;

                const isAfterOrEqualFrom = !effFrom || (effFrom <= dateD);
                const isBeforeOrEqualTo = !effTo || (dateD <= effTo);

                if (isAfterOrEqualFrom && isBeforeOrEqualTo) {
                    expectedPlayers.add(playerId);
                }
            }
        }

        // B) Apply recurringChanges (Precedence over base)
        const defChanges = changes[defId] || {};
        for (const [, changeData] of Object.entries(defChanges)) {
            if (!hasValidDateRange(changeData)) {
                continue;
            }

            // Check if change applies to Date D
            const cFrom = changeData.effectiveFrom;
            const cTo = changeData.effectiveTo;

            const isAfterOrEqualFrom = !cFrom || (cFrom <= dateD);
            const isBeforeOrEqualTo = !cTo || (dateD <= cTo);

            if (isAfterOrEqualFrom && isBeforeOrEqualTo) {
                // remove wins over add on conflict per spec, achieved sequentially if we simply enforce it.
                // Assuming "remove wins" means if BOTH add and remove apply, remove happens.
                // If the data guarantees a single change per player/date, order doesn't matter,
                // but if there are multiple changes for the same player, we should favor REMOVE.
                // The safest way is to do ADDs first, then REMOVEs.

                // However, we can just track per player ID.
                // If action === 'add', add. If action === 'remove', delete.
            }
        }

        // Re-process changes accurately prioritizing REMOVE over ADD.
        const playerChangesForDate = {}; // { playerId: "add" | "remove" }
        for (const [, changeData] of Object.entries(defChanges)) {
            if (!hasValidDateRange(changeData) || !changeData.playerId || (changeData.action !== "add" && changeData.action !== "remove")) {
                continue;
            }

            const cFrom = changeData.effectiveFrom;
            const cTo = changeData.effectiveTo;

            const isAfterOrEqualFrom = !cFrom || (cFrom <= dateD);
            const isBeforeOrEqualTo = !cTo || (dateD <= cTo);

            if (isAfterOrEqualFrom && isBeforeOrEqualTo) {
                const pId = changeData.playerId;
                const action = changeData.action; // "add" | "remove"

                if (playerChangesForDate[pId] !== "remove") {
                    // If it's already remove, don't overwrite it with an add. (Remove wins)
                    playerChangesForDate[pId] = action;
                }
            }
        }

        // Apply prioritized changes to expectedPlayers
        for (const [pId, action] of Object.entries(playerChangesForDate)) {
            if (action === "add") {
                expectedPlayers.add(pId);
            } else if (action === "remove") {
                expectedPlayers.delete(pId);
            }
        }



        // C) Compare Expected vs Existing Roster
        const currentInstanceRoster = existingRosters[instanceId] || {};

        // C1: Add missing
        for (const expectedPlayerId of expectedPlayers) {

            // In the current schema, existingRosters[instanceId] is an object keyed by playerId.
            // i.e., { playerId1: { source, etc }, playerId2: { source, etc } }
            if (!Object.prototype.hasOwnProperty.call(currentInstanceRoster, expectedPlayerId)) {
                updates[`rosters/${instanceId}/${expectedPlayerId}`] = {
                    source: "recurring",
                    addedBy: runByUserId,
                    addedAt: new Date().toISOString(),
                    walkIn: false,
                    removedByCoach: false
                };
                addedCount++;
            }
        }

        // C2: Verify removals / protections
        for (const [existingPlayerId, rosterEntry] of Object.entries(currentInstanceRoster)) {
            const src = rosterEntry.source;

            if (src === "manual_add" || src === "approved_request" || rosterEntry.removedByCoach === true) {
                // Must not be modified or removed, regardless of expectedPlayers
                // Specifically tracking skippedProtected when they would otherwise have been removed
                // by the sync engine, or simply tracking every time we evaluate one? 
                // Spec implies "Count as skippedProtected". We will count if it is evaluated 
                // and we intentionally skip touching it. Assuming per-player counting.
                skippedProtectedCount++;
                continue;
            }

            if (src === "recurring" && !expectedPlayers.has(existingPlayerId)) {
                // They are no longer expected but have a 'recurring' source, safe to remove
                updates[`rosters/${instanceId}/${existingPlayerId}`] = null;
                removedCount++;
            }
        }
    }

    // 4. Batch Execute Updates
    if (Object.keys(updates).length > 0) {
        await update(dbRef, updates);
    }

    return {
        added: addedCount,
        removed: removedCount,
        skippedProtected: skippedProtectedCount,
        instancesProcessed: instancesProcessedCount
    };
}
