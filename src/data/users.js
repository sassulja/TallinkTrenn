import { db } from '../firebase';
import { ref as databaseRef, set, get, update, remove, push, child, onValue } from 'firebase/database';
import playerPasswordsData from '../player_passwords.json';
import parentPasswordsData from '../parent_passwords.json';

// Paths
const COACHES_PATH = 'coaches';
const PARENTS_PATH = 'parents';
const COACH_REQUESTS_PATH = 'coachRequests';

// --- Auth / Login ---

export async function loginUser(username, password) {
    if (!username || !password) throw new Error("Sisestamata kasutajanimi või parool");

    // 1. Check Admin
    if (username === "admin" && password === "TallinkAdmin") {
        return { role: 'admin', name: 'Admin', username: 'admin' };
    }

    // 2. Check Coaches (Firebase)
    const coachSnapshot = await get(databaseRef(db, `${COACHES_PATH}/${username}`));
    if (coachSnapshot.exists()) {
        const coach = coachSnapshot.val();
        if (coach.password === password) {
            return {
                role: 'coach',
                name: coach.name || username,
                username: username,
                sports: coach.sports || [],
                type: coach.type || 'global' // 'global' or 'specific'
            };
        }
    }

    // 2b. Backward compatibility for hardcoded "coach" user
    if (username === "coach" && password === "TallinkCoach") {
        return { role: 'coach', name: 'Coach', username: 'coach', sports: ['tennis', 'fuss'], type: 'global' };
    }


    // 3. Check Parents (Firebase)
    const parentSnapshot = await get(databaseRef(db, `${PARENTS_PATH}/${username}`));
    if (parentSnapshot.exists()) {
        const parent = parentSnapshot.val();
        if (parent.password === password) {
            return {
                role: 'parent',
                name: parent.name || username,
                username: username,
                linkedPlayers: parent.linkedPlayers || []
            };
        }
    }

    // 3b. Backward compatibility for legacy parent passwords (from JSON)
    // Note: We might phase this out, but for now checking JSON
    const legacyParent = parentPasswordsData.find(p => p.name === username && p.parent_password === password);
    if (legacyParent) {
        return {
            role: 'parent',
            name: `${username} (Vanem)`,
            username: username,
            linkedPlayers: [username] // Legacy: linked only to the child with same name
        };
    }

    // 4. Check Players (JSON) - Legacy but primary for players
    const player = playerPasswordsData.find(p => p.name === username && p.password === password);
    if (player) {
        return {
            role: 'player',
            name: player.name,
            username: player.name
        };
    }

    throw new Error("Vale kasutajanimi või parool");
}

// --- Coach Management ---

export async function createCoach(username, data) {
    if (!username || !data.password) throw new Error("Missing fields");
    const ref = databaseRef(db, `${COACHES_PATH}/${username}`);
    const snap = await get(ref);
    if (snap.exists()) throw new Error("Kasutajanimi on juba kasutusel (treener)");

    await set(ref, {
        username,
        name: data.name || username,
        password: data.password,
        sports: data.sports || [], // ['tennis', 'fuss']
        type: data.type || 'global', // 'global' | 'specific'
        createdAt: Date.now()
    });
}

export async function updateCoach(username, data) {
    const ref = databaseRef(db, `${COACHES_PATH}/${username}`);
    await update(ref, data);
}

export async function deleteCoach(username) {
    const ref = databaseRef(db, `${COACHES_PATH}/${username}`);
    await remove(ref);
}

export async function getCoaches() {
    const snap = await get(databaseRef(db, COACHES_PATH));
    return snap.val() || {};
}

// --- Parent Management ---

export async function createParent(username, data) {
    if (!username || !data.password) throw new Error("Missing fields");
    const ref = databaseRef(db, `${PARENTS_PATH}/${username}`);
    const snap = await get(ref);
    if (snap.exists()) throw new Error("Kasutajanimi on juba kasutusel (lapsevanem)");

    await set(ref, {
        username,
        name: data.name || username,
        password: data.password,
        linkedPlayers: data.linkedPlayers || [],
        createdAt: Date.now()
    });
}

export async function updateParent(username, data) {
    const ref = databaseRef(db, `${PARENTS_PATH}/${username}`);
    await update(ref, data);
}

export async function deleteParent(username) {
    const ref = databaseRef(db, `${PARENTS_PATH}/${username}`);
    await remove(ref);
}

export async function getParents() {
    const snap = await get(databaseRef(db, PARENTS_PATH));
    return snap.val() || {};
}

// --- Coach Access Requests ---

export async function requestAccess(coachUsername, sessionType, sessionId, sessionLabel, sport) {
    const newRef = push(databaseRef(db, COACH_REQUESTS_PATH));
    await set(newRef, {
        coach: coachUsername,
        sessionType, // 'option' (template)
        sessionId,
        sessionLabel, // E.g. "Tennis E 14:00"
        sport,
        status: 'pending',
        requestedAt: Date.now()
    });
}

export async function approveAccessRequest(requestId, coachUsername, sessionType, sessionId, sport) {
    // 1. Grant access (add to sessionOptions)
    if (sessionType === 'option' && sport) {
        const optionRef = databaseRef(db, `sessionOptions/${sport}/${sessionId}`);
        const snap = await get(optionRef);
        if (snap.exists()) {
            const data = snap.val();
            const currentCoaches = data.assignedCoaches || [];
            if (!currentCoaches.includes(coachUsername)) {
                const newCoaches = [...currentCoaches, coachUsername];
                await update(optionRef, { assignedCoaches: newCoaches });
            }
        }
    }

    // 2. Update status
    const ref = databaseRef(db, `${COACH_REQUESTS_PATH}/${requestId}`);
    await update(ref, { status: 'approved', approvedAt: Date.now() });
}

export async function deleteRequest(requestId) {
    const ref = databaseRef(db, `${COACH_REQUESTS_PATH}/${requestId}`);
    await remove(ref);
}

export async function denyAccessRequest(requestId) {
    const ref = databaseRef(db, `${COACH_REQUESTS_PATH}/${requestId}`);
    await update(ref, { status: 'denied', deniedAt: Date.now() });
}

export function subscribeToCoachRequests(cb) {
    const ref = databaseRef(db, COACH_REQUESTS_PATH);
    return onValue(ref, (snapshot) => {
        const data = snapshot.val() || {};
        cb(data);
    });
}
