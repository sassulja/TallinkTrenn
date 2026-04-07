// src/data/playerSchedules.js
// Manages player weekly schedule templates and date-specific overrides

import { ref as databaseRef, onValue, set, get } from 'firebase/database';
import { db } from '../firebase';
import { updatePlayerAttendance } from './attendance';

// Firebase paths
const PLAYER_SCHEDULES_PATH = 'playerWeeklySchedule';
const SCHEDULE_OVERRIDES_PATH = 'scheduleOverrides';

/**
 * Get all players scheduled for a specific session (sport + date + time)
 * STRICT SESSION-BASED: Only looks at scheduleOverrides (assignments).
 * 
 * @param {object} unused_weeklySchedules - Kept for API compatibility but ignored
 * @param {object} dateOverrides - Overrides for that date { playerName: { sport: "time1,time2", ... } }
 * @param {string} sport - 'tennis' or 'fuss'
 * @param {string} dayName - 'Monday' etc (unused now)
 * @param {string} time - "16:00"
 * @returns {Array} Array of { name, isOverride }
 */
/**
 * Get all players scheduled for a specific session (sessionId)
 * STRICT SESSION-BASED: Checks if player has this sessionId in overrides.
 * 
 * @param {object} unused_weeklySchedules - Ignored
 * @param {object} dateOverrides - Overrides for that date { playerName: { sessionId: true, ... } }
 * @param {string} sessionId - Unique Session ID
 * @returns {Array} Array of { name, isOverride }
 */
export function getPlayersForSession(unused_weeklySchedules, dateOverrides, sessionId) {
    const players = [];

    // Iterate over all players in dateOverrides
    if (!dateOverrides) return players;

    // dateOverrides structure: { playerName: { [sessionId]: true, ... } }
    for (const [playerName, playerOverrides] of Object.entries(dateOverrides)) {
        if (playerOverrides && playerOverrides[sessionId]) {
            // DEBUG: Log override read
            // console.log(`[Override Read] Date: (from context), Player: ${playerName}, SessionId: ${sessionId}, Result: true`);
            players.push({
                name: playerName,
                isOverride: true,
                changedBy: 'schedule' // Simplified
            });
        }
    }

    return players;
}

/**
 * Add a schedule override (assign player to session)
 * STRICT SESSION-BASED: Uses sessionId as key.
 */

/**
 * Get day name from date string
 * @param {string} dateStr - "YYYY-MM-DD"
 * @returns {string} "Monday", "Tuesday", etc.
 */
export function getDayNameFromDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Check if a date is in the past
 * @param {string} dateStr - "YYYY-MM-DD"
 * @returns {boolean}
 */
export function isDateInPast(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateStr);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
}

/**
 * Subscribe to all schedule overrides
 * @param {function} callback 
 * @returns {function} unsubscribe
 */
export function subscribeToAllOverrides(callback) {
    const overridesRef = databaseRef(db, SCHEDULE_OVERRIDES_PATH);
    return onValue(overridesRef, (snapshot) => {
        callback(snapshot.val() || {});
    });
}

/**
 * Subscribe to overrides for a specific date
 * @param {string} date 
 * @param {function} callback 
 * @returns {function} unsubscribe
 */
export function subscribeToDateOverrides(date, callback) {
    const overridesRef = databaseRef(db, `${SCHEDULE_OVERRIDES_PATH}/${date}`);
    return onValue(overridesRef, (snapshot) => {
        callback(snapshot.val() || {});
    });
}

export async function addScheduleOverride(date, playerName, sessionId) {
    // Path: scheduleOverrides/YYYY-MM-DD/PlayerName/SessionId = true
    const path = `${SCHEDULE_OVERRIDES_PATH}/${date}/${playerName}/${sessionId}`;

    // DEBUG: Log override write
    // console.log(`[Override Write] Date: ${date}, Player: ${playerName}, SessionId: ${sessionId}`);

    await set(databaseRef(db, path), true);
}

/**
 * Remove a schedule override
 * STRICT SESSION-BASED: Removes specific sessionId key.
 */
export async function removeScheduleOverride(date, playerName, sessionId) {
    const path = `${SCHEDULE_OVERRIDES_PATH}/${date}/${playerName}/${sessionId}`;
    const playerPath = `${SCHEDULE_OVERRIDES_PATH}/${date}/${playerName}`;

    // console.log(`[Override Remove Start] Date: ${date}, Player: ${playerName}, SessionId: ${sessionId}`);

    // 1. Remove the specific session ID
    await set(databaseRef(db, path), null);

    // 2. Check if player has any other sessions left for this date
    try {
        const snapshot = await get(databaseRef(db, playerPath));
        if (snapshot.exists()) {
            const data = snapshot.val();
            // data is { sessionId: true, ... }
            // If data is empty or null, we remove the player node
            const keys = Object.keys(data || {});
            if (keys.length === 0) {
                // console.log(`[Override Cleanup] Removing empty player node for ${playerName}`);
                await set(databaseRef(db, playerPath), null);
            } else {
                // console.log(`[Override Cleanup] Player ${playerName} still has ${keys.length} sessions:`, keys);
            }

            // 3. CLEAN UP ATTENDANCE (Bug 2 Fix)
            // When removing override, we must also remove attendance for that session
            // console.log('[Attendance Cleanup]', {
            //     date,
            //     sessionId,
            //     player: playerName
            // });
            await updatePlayerAttendance(date, playerName, null, sessionId);

        } else {
            // Already empty/removed
            console.log(`[Override Cleanup] Player node already empty for ${playerName}`);
        }
    } catch (err) {
        console.error("[Override Cleanup Error]", err);
    }

    // console.log(`[Override Remove End] Completed removal for ${playerName}`);
}




