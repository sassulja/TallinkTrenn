// src/data/sessionOptions.js
// Manages session options (admin-defined training slots)

import { ref as databaseRef, onValue, set, push, remove } from 'firebase/database';
import { db } from '../firebase';

/**
 * Session option structure:
 * {
 *   startTime: "16:00",
 *   endTime: "17:30",
 *   maxCapacity: 8,
 *   days: ["Monday", "Wednesday", "Friday"]
 * }
 */

// Firebase path
const SESSION_OPTIONS_PATH = 'sessionOptions';

/**
 * Subscribe to session options for a sport
 * @param {string} sport - 'tennis' or 'fuss'
 * @param {function} callback - Called with options object
 * @returns {function} Unsubscribe function
 */
export function subscribeToSessionOptions(sport, callback) {
    const optionsRef = databaseRef(db, `${SESSION_OPTIONS_PATH}/${sport}`);
    return onValue(optionsRef, (snapshot) => {
        callback(snapshot.val() || {});
    });
}

/**
 * Subscribe to all session options
 * @param {function} callback - Called with { tennis: {...}, fuss: {...} }
 * @returns {function} Unsubscribe function
 */
export function subscribeToAllSessionOptions(callback) {
    const optionsRef = databaseRef(db, SESSION_OPTIONS_PATH);
    return onValue(optionsRef, (snapshot) => {
        callback(snapshot.val() || { tennis: {}, fuss: {} });
    });
}

/**
 * Add a new session option
 * @param {string} sport - 'tennis' or 'fuss'
 * @param {object} option - { startTime, endTime, maxCapacity, days, assignedCoaches }
 * @returns {Promise<string>} The new option ID
 */
export async function addSessionOption(sport, option) {
    const optionsRef = databaseRef(db, `${SESSION_OPTIONS_PATH}/${sport}`);
    const newRef = push(optionsRef);
    await set(newRef, {
        startTime: option.startTime,
        endTime: option.endTime,
        maxCapacity: parseInt(option.maxCapacity) || 8, // Ensure it's a number, default to 8
        days: option.days || [],
        assignedCoaches: option.assignedCoaches || []
    });
    return newRef.key;
}

/**
 * Update an existing session option
 * @param {string} sport - 'tennis' or 'fuss'
 * @param {string} optionId - The option key
 * @param {object} updates - Partial updates
 */
export async function updateSessionOption(sport, optionId, updates) {
    const optionRef = databaseRef(db, `${SESSION_OPTIONS_PATH}/${sport}/${optionId}`);
    // Get current value first to merge
    return new Promise((resolve, reject) => {
        onValue(optionRef, (snapshot) => {
            const current = snapshot.val() || {};
            set(optionRef, { ...current, ...updates })
                .then(resolve)
                .catch(reject);
        }, { onlyOnce: true });
    });
}

/**
 * Delete a session option
 * @param {string} sport - 'tennis' or 'fuss'
 * @param {string} optionId - The option key
 */
export async function deleteSessionOption(sport, optionId) {
    const optionRef = databaseRef(db, `${SESSION_OPTIONS_PATH}/${sport}/${optionId}`);
    return remove(optionRef);
}

/**
 * Get available session times for a sport on a specific day
 * @param {object} sessionOptions - The session options object for a sport
 * @param {string} day - 'Monday', 'Tuesday', etc.
 * @returns {Array} Array of { id, startTime, endTime, maxCapacity }
 */
export function getSessionsForDay(sessionOptions, day) {
    if (!sessionOptions) return [];

    return Object.entries(sessionOptions)
        .filter(([_, opt]) => opt.days?.includes(day))
        .map(([id, opt]) => ({
            id,
            ...opt
        }))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/**
 * Format session time display
 * @param {string} startTime - "16:00"
 * @param {string} endTime - "17:30"
 * @returns {string} "16:00 - 17:30"
 */
export function formatSessionTime(startTime, endTime) {
    return `${startTime} - ${endTime}`;
}
