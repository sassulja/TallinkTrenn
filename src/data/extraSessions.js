import { ref as databaseRef, onValue, set, push, serverTimestamp, get } from 'firebase/database';
import { db } from '../firebase';

const REQUESTS_PATH = 'extraSessionRequests';

/**
 * Request structure:
 * {
 *   date: "2023-10-25",
 *   time: "16:00-17:30",
 *   sport: "tennis",
 *   player: "Sass",
 *   status: "pending", // pending, approved, declined
 *   createdAt: timestamp
 * }
 */

/**
 * Submit a request to join a specific session
 */
export async function requestExtraSession(date, time, sport, player) {
    const listRef = databaseRef(db, REQUESTS_PATH);
    const newRef = push(listRef);
    return set(newRef, {
        date,
        time,
        sport,
        player,
        status: 'pending',
        createdAt: serverTimestamp()
    });
}

/**
 * Subscribe to requests made by a specific player
 */
export function subscribeToPlayerRequests(playerName, callback) {
    const requestsRef = databaseRef(db, REQUESTS_PATH);
    return onValue(requestsRef, (snapshot) => {
        const allData = snapshot.val() || {};
        const myRequests = Object.entries(allData)
            .map(([id, data]) => ({ id, ...data }))
            .filter(req => req.player === playerName);
        callback(myRequests);
    });
}

/**
 * Subscribe to pending requests for a specific date (for admin/coach)
 */
export function subscribeToRequestsForDate(date, callback) {
    const requestsRef = databaseRef(db, REQUESTS_PATH);
    return onValue(requestsRef, (snapshot) => {
        const allData = snapshot.val() || {};
        const filtered = Object.entries(allData)
            .map(([id, data]) => ({ id, ...data }))
            .filter(req => req.date === date && req.status === 'pending');
        callback(filtered);
    });
}

/**
 * Update request status
 */
export async function updateRequestStatus(requestId, status, processedBy) {
    const reqRef = databaseRef(db, `${REQUESTS_PATH}/${requestId}`);
    const snapshot = await get(reqRef);
    if (!snapshot.exists()) return;

    const current = snapshot.val();
    return set(reqRef, {
        ...current,
        status,
        processedBy,
        processedAt: serverTimestamp()
    });
}
