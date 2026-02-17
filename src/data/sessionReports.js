
import { ref as databaseRef, set, onValue, get } from 'firebase/database';
import { db } from '../firebase';

// Path: sessionReports/YYYY-MM-DD/sport_startTime
const REPORTS_PATH = 'sessionReports';

/**
 * Helper to generate report ID from session details
 */
const getReportId = (date, sport, startTime) => {
    // Sanitize time (10:00 -> 10-00) for path safety, though : is usually fine in keys, safer to replace
    const timeSafe = startTime.replace(':', '-');
    return `${date}/${sport}_${timeSafe}`;
};

/**
 * Mark a player's actual attendance status
 * @param {string} date - YYYY-MM-DD
 * @param {string} sport - 'tennis' | 'fuss'
 * @param {string} startTime - HH:MM
 * @param {string} playerName 
 * @param {string} status - 'attended' | 'noshow' | null (to remove)
 * @param {string} markedBy - Name of coach/admin
 */
export async function markActualAttendance(date, sport, startTime, playerName, status, markedBy) {
    const reportId = getReportId(date, sport, startTime);
    const path = `${REPORTS_PATH}/${reportId}/players/${playerName}`;
    const metaPath = `${REPORTS_PATH}/${reportId}/metadata`;

    const playerRef = databaseRef(db, path);
    const metaRef = databaseRef(db, metaPath);

    await set(playerRef, status);

    // Update metadata timestamp
    await set(metaRef, {
        updatedAt: Date.now(),
        lastMarkedBy: markedBy || 'system'
    });
}

/**
 * Subscribe to a specific session's report
 */
export function subscribeToSessionReport(date, sport, startTime, callback) {
    const reportId = getReportId(date, sport, startTime);
    const reportRef = databaseRef(db, `${REPORTS_PATH}/${reportId}`);

    const unsub = onValue(reportRef, (snapshot) => {
        const data = snapshot.val();
        callback(data || { players: {}, metadata: {} });
    });

    return unsub;
}

/**
 * Subscribe to all reports for a specific date
 * Returns object: { "sport_time": { players: {...} } }
 */
export function subscribeToReportsForDay(date, callback) {
    const dayRef = databaseRef(db, `${REPORTS_PATH}/${date}`);

    const unsub = onValue(dayRef, (snapshot) => {
        const data = snapshot.val();
        callback(data || {});
    });

    return unsub;
}
