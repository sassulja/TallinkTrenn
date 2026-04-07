// src/data/sessionApplications.js
import { ref as databaseRef, onValue, set, push, remove, get } from 'firebase/database';
import { db } from '../firebase';

// Path: sessionApplications/{date}/{sport}/{sessionId}/{applicationId}
const APPLICATIONS_PATH = 'sessionApplications';

/**
 * Application structure:
 * {
 *   playerId: string,
 *   playerName: string,
 *   status: 'pending' | 'approved' | 'rejected', // Default 'pending'
 *   timestamp: number,
 *   sessionId: string, // Redundant but useful
 *   sport: string,     // Redundant but useful
 *   date: string       // Redundant but useful
 * }
 */

/**
 * Create a new session application
 */
export async function createApplication(date, sport, sessionId, playerId, playerName) {
    // We stick to a list under the session ID, so multiple people can apply
    const appsRef = databaseRef(db, `${APPLICATIONS_PATH}/${date}/${sport}/${sessionId}`);

    // Check if user already applied? 
    // Ideally we'd use playerId as key, but let's stick to push ID for flexibility, 
    // or use playerId to prevent duplicates easily.
    // Let's use push() to generate ID, then store playerId inside. 
    // BUT to easily check "did I apply?", using playerId as key is easier. 
    // Let's use playerId as the key for the application under the session.

    // Path: sessionApplications/{date}/{sport}/${sessionId}/{playerId}
    const appRef = databaseRef(db, `${APPLICATIONS_PATH}/${date}/${sport}/${sessionId}/${playerId}`);

    const application = {
        playerId,
        playerName,
        status: 'pending',
        timestamp: Date.now(),
        sessionId,
        sport,
        date
    };

    return set(appRef, application);
}

/**
 * Update application status (approve/reject/cancel)
 */
export async function updateApplicationStatus(date, sport, sessionId, playerId, status) {
    const appRef = databaseRef(db, `${APPLICATIONS_PATH}/${date}/${sport}/${sessionId}/${playerId}`);
    // We only update status
    // Use get to ensure it exists or just merge? set with merge logic via update? 
    // Simple set valid for now if we assume it exists, but let's be safe and just update status field specifically duplicate data if needed
    // Actually, simple set on the path .../status is enough
    const statusRef = databaseRef(db, `${APPLICATIONS_PATH}/${date}/${sport}/${sessionId}/${playerId}/status`);
    return set(statusRef, status);
}

/**
 * Remove/Cancel an application completely (e.g. user cancels pending)
 */
export async function deleteApplication(date, sport, sessionId, playerId) {
    const appRef = databaseRef(db, `${APPLICATIONS_PATH}/${date}/${sport}/${sessionId}/${playerId}`);
    return remove(appRef);
}

/**
 * Subscribe to ALL applications for a specific date (and sport)
 * Useful for Admin/Coach view to see who applied where
 */
export function subscribeToApplicationsForDate(date, sport, callback) {
    // This returns object of objects: { sessionId: { playerId: { ...app } } }
    const dateRef = databaseRef(db, `${APPLICATIONS_PATH}/${date}/${sport}`);
    return onValue(dateRef, (snapshot) => {
        callback(snapshot.val() || {});
    });
}

/**
 * Subscribe to a SPECIFIC session's applications
 */
export function subscribeToSessionApplications(date, sport, sessionId, callback) {
    const sessionAppsRef = databaseRef(db, `${APPLICATIONS_PATH}/${date}/${sport}/${sessionId}`);
    return onValue(sessionAppsRef, (snapshot) => {
        callback(snapshot.val() || {});
    });
}

/**
 * Subscribe to ALL applications globally (or we might need to query by player)
 * Firebase Realtime DB querying is limited. 
 * For "My Applications" view, we might need to iterate or duplicate data if scale is large.
 * allow fetching all for now, assuming data set isn't massive yet.
 * Or better: The UI can load relevant days (next 7 days) and check applications for those days.
 */
export function subscribeToAllApplications(callback) {
    const allAppsRef = databaseRef(db, `${APPLICATIONS_PATH}`);
    return onValue(allAppsRef, (snapshot) => {
        callback(snapshot.val() || {});
    });
}
