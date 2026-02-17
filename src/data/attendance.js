import { ref as databaseRef, set } from 'firebase/database';
import { db } from '../firebase';

// Firebase path
const ATTENDANCE_PATH = 'attendance';

/**
 * Update a player's attendance for a specific date
 * @param {string} date - "YYYY-MM-DD"
 * @param {string} playerName - Player name
 * @param {string} status - "Jah" | "Ei" | null
 * @param {string} sessionId - OPTIONAL: Session ID for precise targeting
 */
export async function updatePlayerAttendance(date, playerName, status, sessionId) {
    let path = `${ATTENDANCE_PATH}/${date}/${playerName}`;
    // NEW STRUCTURE: attendance/YYYY-MM-DD/sessionId/player
    if (sessionId) {
        path = `${ATTENDANCE_PATH}/${date}/${sessionId}/${playerName}`;
    } else {
        console.warn('[Attendance] No sessionId provided, falling back to legacy date-based path.');
    }

    const attendanceRef = databaseRef(db, path);
    // DEBUG: Log attendance write
    // console.log(`[Attendance Write] Path: ${path}, Status: ${status}`);
    return set(attendanceRef, status);
}
