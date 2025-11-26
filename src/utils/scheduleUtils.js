// src/utils/scheduleUtils.js

/**
 * Returns the time string for a specific player's tennis session on a given day.
 * @param {object} playerSchedules - The full playerSchedules object from Firebase.
 * @param {string} playerName - The name of the player.
 * @param {string} day - The day name, e.g., 'Monday', 'Tuesday'.
 * @returns {string|null} Time string like '16:00' or '17:30', or null if not found.
 */
export function getPlayerTennisTime(playerSchedules, playerName, day) {
  return playerSchedules?.[playerName]?.tennis?.[day] || null;
}

/**
 * Returns the time string for a specific player's fitness session on a given day.
 * @param {object} playerSchedules - The full playerSchedules object from Firebase.
 * @param {string} playerName - The name of the player.
 * @param {string} day - The day name, e.g., 'Monday', 'Tuesday'.
 * @returns {string|null} Time string like '16:00' or '17:30', or null if not found.
 */
export function getPlayerFitnessTime(playerSchedules, playerName, day) {
  return playerSchedules?.[playerName]?.fitness?.[day] || null;
}

/**
 * Get all players who have tennis training at a specific day and time.
 * @param {object} playerSchedules - The full playerSchedules object.
 * @param {string} day - The day name, e.g., 'Monday'.
 * @param {string} time - The session time, e.g., '16:00'.
 * @returns {string[]} Array of player names.
 */
export function getTennisPlayersForDayTime(playerSchedules, day, time) {
  return Object.entries(playerSchedules || {})
    .filter(([_, sched]) => sched?.tennis?.[day] === time)
    .map(([name]) => name);
}

/**
 * Get all players who have fitness training at a specific day and time.
 * @param {object} playerSchedules - The full playerSchedules object.
 * @param {string} day - The day name, e.g., 'Monday'.
 * @param {string} time - The session time, e.g., '16:00'.
 * @returns {string[]} Array of player names.
 */
export function getFitnessPlayersForDayTime(playerSchedules, day, time) {
  return Object.entries(playerSchedules || {})
    .filter(([_, sched]) => sched?.fitness?.[day] === time)
    .map(([name]) => name);
}