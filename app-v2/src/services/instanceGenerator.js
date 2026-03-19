import { ref, get, child, update } from "firebase/database";
import { database } from "./firebase";
import { getTallinnNow } from "../utils/dateUtils";
import { formatInTimeZone } from "date-fns-tz";
import { addDays, format, getISODay } from "date-fns";

const TALLINN_TZ = "Europe/Tallinn";

/**
 * Generates session instances for the next 30 days based on active definitions.
 * Date horizon matches: date >= today AND date <= today + 30.
 * Idempotent: checks if instance exists before creating.
 * 
 * @returns {Promise<{newCount: number, skippedCount: number}>}
 */
export async function generateInstancesForNext30Days() {
    // 1. Calculate explicit date horizon (0 to 30 days inclusive)
    const now = getTallinnNow();
    const todayString = formatInTimeZone(now, TALLINN_TZ, 'yyyy-MM-dd');

    // Parse into a safe UTC noon date to cleanly step forward without DST glitches
    const [year, month, day] = todayString.split('-').map(Number);
    const baseDateUTC = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

    const horizonDates = []; // e.g. [{ date: '2026-03-01', weekday: 7 }]
    for (let i = 0; i <= 30; i++) {
        const currentDate = addDays(baseDateUTC, i);
        const dateStr = format(currentDate, 'yyyy-MM-dd');
        // getISODay: 1 = Monday, 7 = Sunday
        const weekday = getISODay(currentDate);
        horizonDates.push({ date: dateStr, weekday });
    }

    // 2. Fetch all active definitions
    const defsRef = ref(database, 'sessionDefinitions');
    const defsSnap = await get(defsRef);

    const definitions = [];
    if (defsSnap.exists()) {
        defsSnap.forEach(childSnap => {
            const def = childSnap.val();
            if (def.active === true) {
                definitions.push({ id: childSnap.key, ...def });
            }
        });
    }

    // 3. Generate instances
    let newCount = 0;
    let skippedCount = 0;
    const updates = {};
    const checkPromises = [];

    const dbRef = ref(database);

    for (const def of definitions) {
        // Defensive check
        if (typeof def.weekday !== 'number') {
            console.warn(`Definition ${def.id} is missing a valid 'weekday'. Skipping.`);
            continue;
        }

        for (const hDate of horizonDates) {
            if (hDate.weekday === def.weekday) {
                const instanceId = `${hDate.date}__${def.id}`;

                // Add to standard promise array for parallel resolution
                checkPromises.push(
                    get(child(dbRef, `sessionInstances/${instanceId}`)).then(snap => {
                        if (snap.exists()) {
                            skippedCount++;
                        } else {
                            updates[`sessionInstances/${instanceId}`] = {
                                definitionId: def.id,
                                date: hDate.date,
                                startTime: def.startTime || "",
                                endTime: def.endTime || "",
                                sport: def.sport || "",
                                capacity: def.capacity || 0,
                                assignedCoachIds: def.assignedCoachIds || {},
                                status: "scheduled",
                                createdBy: "system",
                                createdAt: new Date().toISOString()
                            };
                            newCount++;
                        }
                    }).catch(err => {
                        console.error(`Failed to check instance ${instanceId}`, err);
                    })
                );
            }
        }
    }

    // Wait for all read checks to complete
    await Promise.all(checkPromises);

    // 4. Atomic write of all new instances
    if (Object.keys(updates).length > 0) {
        await update(dbRef, updates);
    }

    console.log(`Generated ${newCount} new instances, skipped ${skippedCount} existing instances.`);

    return { newCount, skippedCount };
}
