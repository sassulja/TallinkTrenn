// src/data/capacityManager.js
// Manages session capacity tracking and warnings

import { getPlayersForSession } from './playerSchedules';

/**
 * Capacity status levels
 */
export const CAPACITY_STATUS = {
    AVAILABLE: 'available',  // < 80%
    LIMITED: 'limited',      // 80-99%
    FULL: 'full'            // 100%
};

/**
 * Calculate capacity status for a session
 * @param {number} currentCount - Number of players currently in session
 * @param {number} maxCapacity - Maximum capacity
 * @returns {object} { status, count, max, percentage }
 */
export function getCapacityStatus(currentCount, maxCapacity) {
    const percentage = maxCapacity > 0 ? (currentCount / maxCapacity) * 100 : 0;

    let status;
    if (percentage >= 100) {
        status = CAPACITY_STATUS.FULL;
    } else if (percentage >= 80) {
        status = CAPACITY_STATUS.LIMITED;
    } else {
        status = CAPACITY_STATUS.AVAILABLE;
    }

    return {
        status,
        count: currentCount,
        max: maxCapacity,
        percentage: Math.round(percentage)
    };
}

/**
 * Get capacity info for a specific session
 * @param {object} allPlayerSchedules - All player weekly schedules
 * @param {object} dateOverrides - Overrides for the date
 * @param {object} sessionOption - { startTime, endTime, maxCapacity }
 * @param {string} sport - 'tennis' or 'fuss'
 * @param {string} dayName - 'Monday', etc.
 * @returns {object} Capacity status object
 */
export function getSessionCapacity(allPlayerSchedules, dateOverrides, sessionOption, sport, dayName) {
    const players = getPlayersForSession(
        allPlayerSchedules,
        dateOverrides,
        sessionOption.id
    );

    return getCapacityStatus(players.length, sessionOption.maxCapacity);
}

/**
 * Get color for capacity status (for UI)
 * @param {string} status - CAPACITY_STATUS value
 * @returns {string} CSS color
 */
export function getCapacityColor(status) {
    switch (status) {
        case CAPACITY_STATUS.FULL:
            return '#dc3545'; // red
        case CAPACITY_STATUS.LIMITED:
            return '#ffc107'; // yellow
        case CAPACITY_STATUS.AVAILABLE:
        default:
            return '#28a745'; // green
    }
}

/**
 * Get Estonian label for capacity status
 * @param {string} status - CAPACITY_STATUS value
 * @returns {string} Estonian label
 */
export function getCapacityLabel(status) {
    switch (status) {
        case CAPACITY_STATUS.FULL:
            return 'Täis';
        case CAPACITY_STATUS.LIMITED:
            return 'Piiratud';
        case CAPACITY_STATUS.AVAILABLE:
        default:
            return 'Vaba';
    }
}

/**
 * Check if adding a player would exceed capacity
 * @param {number} currentCount - Current player count
 * @param {number} maxCapacity - Maximum capacity
 * @returns {boolean} True if would exceed
 */
export function wouldExceedCapacity(currentCount, maxCapacity) {
    return currentCount >= maxCapacity;
}

/**
 * Format capacity display string
 * @param {number} count - Current count
 * @param {number} max - Maximum capacity
 * @returns {string} e.g., "5/8"
 */
export function formatCapacity(count, max) {
    return `${count}/${max}`;
}
