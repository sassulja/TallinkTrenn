// src/data/auditLog.js
// Manages audit logging for schedule changes and approvals

import { ref as databaseRef, push, set, query, orderByChild, limitToLast, onValue } from 'firebase/database';
import { db } from '../firebase';

const AUDIT_LOG_PATH = 'auditLog';

/**
 * Audit log entry structure:
 * {
 *   action: "schedule_template_change" | "schedule_override" | "extra_request_approved" | etc.,
 *   player: "Jan Tamm",
 *   date: "2026-02-15" (if applicable),
 *   oldValue: {...},
 *   newValue: {...},
 *   changedBy: "admin" | "coach",
 *   timestamp: 1707900000000,
 *   reason: "one-off" | null
 * }
 */

// Action types
export const AUDIT_ACTIONS = {
    SCHEDULE_TEMPLATE_CHANGE: 'schedule_template_change',
    SCHEDULE_OVERRIDE: 'schedule_override',
    SCHEDULE_OVERRIDE_REMOVED: 'schedule_override_removed',
    EXTRA_REQUEST_APPROVED: 'extra_request_approved',
    EXTRA_REQUEST_DECLINED: 'extra_request_declined',
    PLAYER_MOVED: 'player_moved',
    CAPACITY_OVERRIDE: 'capacity_override',
    SESSION_OPTION_ADDED: 'session_option_added',
    SESSION_OPTION_UPDATED: 'session_option_updated',
    SESSION_OPTION_DELETED: 'session_option_deleted',
    BULK_UPLOAD: 'bulk_upload'
};

/**
 * Write an audit log entry
 * @param {object} entry - The audit entry
 * @returns {Promise<string>} The log entry ID
 */
export async function writeAuditLog(entry) {
    const logRef = databaseRef(db, AUDIT_LOG_PATH);
    const newRef = push(logRef);

    await set(newRef, {
        ...entry,
        timestamp: Date.now()
    });

    return newRef.key;
}

/**
 * Log a schedule template change
 */
export async function logScheduleTemplateChange(playerName, oldSchedule, newSchedule, changedBy) {
    return writeAuditLog({
        action: AUDIT_ACTIONS.SCHEDULE_TEMPLATE_CHANGE,
        player: playerName,
        oldValue: oldSchedule,
        newValue: newSchedule,
        changedBy
    });
}

/**
 * Log a one-off schedule override
 */
export async function logScheduleOverride(playerName, date, sport, oldTime, newTime, changedBy) {
    return writeAuditLog({
        action: AUDIT_ACTIONS.SCHEDULE_OVERRIDE,
        player: playerName,
        date,
        oldValue: { [sport]: oldTime },
        newValue: { [sport]: newTime },
        changedBy,
        reason: 'one-off'
    });
}

/**
 * Log a player move between sessions
 */
export async function logPlayerMove(playerName, date, sport, fromTime, toTime, changedBy, permanent = false) {
    return writeAuditLog({
        action: AUDIT_ACTIONS.PLAYER_MOVED,
        player: playerName,
        date,
        oldValue: { [sport]: fromTime },
        newValue: { [sport]: toTime },
        changedBy,
        reason: permanent ? 'permanent' : 'one-off'
    });
}

/**
 * Log capacity override (adding player to full session)
 */
export async function logCapacityOverride(playerName, date, sport, time, changedBy) {
    return writeAuditLog({
        action: AUDIT_ACTIONS.CAPACITY_OVERRIDE,
        player: playerName,
        date,
        newValue: { sport, time },
        changedBy,
        reason: 'capacity_override'
    });
}

/**
 * Log bulk upload
 */
export async function logBulkUpload(playerCount, changedBy) {
    return writeAuditLog({
        action: AUDIT_ACTIONS.BULK_UPLOAD,
        newValue: { playerCount },
        changedBy
    });
}

/**
 * Subscribe to recent audit logs
 * @param {number} limit - Number of entries to fetch
 * @param {function} callback - Called with entries array
 * @returns {function} Unsubscribe function
 */
export function subscribeToRecentLogs(limit, callback) {
    const logsQuery = query(
        databaseRef(db, AUDIT_LOG_PATH),
        orderByChild('timestamp'),
        limitToLast(limit)
    );

    return onValue(logsQuery, (snapshot) => {
        const logs = [];
        snapshot.forEach((child) => {
            logs.push({ id: child.key, ...child.val() });
        });
        // Reverse to get newest first
        callback(logs.reverse());
    });
}

/**
 * Get Estonian label for audit action
 */
export function getActionLabel(action) {
    switch (action) {
        case AUDIT_ACTIONS.SCHEDULE_TEMPLATE_CHANGE:
            return 'Graafiku malli muutmine';
        case AUDIT_ACTIONS.SCHEDULE_OVERRIDE:
            return 'Ühekordne ajamuutus';
        case AUDIT_ACTIONS.SCHEDULE_OVERRIDE_REMOVED:
            return 'Ühekordne muutus eemaldatud';
        case AUDIT_ACTIONS.EXTRA_REQUEST_APPROVED:
            return 'Lisatreening kinnitatud';
        case AUDIT_ACTIONS.EXTRA_REQUEST_DECLINED:
            return 'Lisatreening keeldud';
        case AUDIT_ACTIONS.PLAYER_MOVED:
            return 'Mängija liigutatud';
        case AUDIT_ACTIONS.CAPACITY_OVERRIDE:
            return 'Mahutavuse ületamine';
        case AUDIT_ACTIONS.SESSION_OPTION_ADDED:
            return 'Treeninguaeg lisatud';
        case AUDIT_ACTIONS.SESSION_OPTION_UPDATED:
            return 'Treeninguaeg muudetud';
        case AUDIT_ACTIONS.SESSION_OPTION_DELETED:
            return 'Treeninguaeg kustutatud';
        case AUDIT_ACTIONS.BULK_UPLOAD:
            return 'Graafikute massimport';
        default:
            return action;
    }
}
