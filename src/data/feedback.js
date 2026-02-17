import { ref, set } from 'firebase/database';
import { db } from '../firebase';

/**
 * Saves player feedback to Firebase
 * @param {string} date - Date string YYYY-MM-DD
 * @param {string} playerName - Player's name
 * @param {Object} data - Feedback object { intensity, coachAttention, objectiveClarity }
 */
/**
 * Saves player feedback to Firebase
 * @param {string} date - Date string YYYY-MM-DD
 * @param {string} playerName - Player's name
 * @param {Object} data - Feedback object { intensity, coachAttention, objectiveClarity }
 * @param {string} sessionId - START TIME or UNIQUE ID for the session (Optional for backward compat, but required for multi-session)
 */
export const savePlayerFeedback = async (date, playerName, data, sessionId) => {
    try {
        let path = `feedback/${date}/${playerName}`;
        // If sessionId is provided, we store deeper or use a composite key?
        // Current structure: feedback/date/player = { ... }
        // Proposed structure: feedback/date/sessionId/player = { ... } OR feedback/date/player/sessionId = { ... }

        // ISSUE: Validating with existing data. 
        // Existing data: feedback/2023-10-27/Sass = { intensity: 5 ... }
        // New data: feedback/2023-10-27/Sass/12:00 = { intensity: 5 ... }

        // If I change structure, I break old data view unless I migrate or handle both.
        // Easier: feedback/date/player_sessionId ? No.

        // Let's use: feedback/${date}/${playerName}_${sessionId} ?
        // Or keep root `feedback/${date}` and keys are `player_session`?

        // User said: "One feedback entry per session.id".
        // session.id in my refactor is `date-sport-time`.

        // If I use `feedback/${date}/${session.id}/${playerName}`, it's clean.
        // But `PlayerScheduleView` currently reads `feedbackData[player][date]`.
        // I need to change the listener or the read logic.

        // Let's stick to a non-destructive change if possible, but the requirement is strict.
        // "Likely issues to audit: Session cards are grouped by date instead of session.id"

        // I will change the save path to: `feedback/${date}/${sessionId}/${playerName}` (if sessionId exists).
        // If no sessionId (legacy), fallback to `feedback/${date}/${playerName}` (BUT this is what we want to avoid).

        // Actually, to make it easy for `PlayerScheduleView` which subscribes to `feedback`,
        // The current subscription usually fetches `feedback` root or `feedback/date`.
        // Let's look at `App.js` subscription to `feedback`.

        if (sessionId) {
            await set(ref(db, `feedback/${date}/${sessionId}/${playerName}`), data);
        } else {
            // Fallback for legacy / safety
            await set(ref(db, `feedback/${date}/${playerName}`), data);
        }
    } catch (error) {
        console.error("Error saving feedback:", error);
        throw error;
    }
};

/**
 * Saves coach feedback to Firebase
 * @param {string} date - Date string YYYY-MM-DD
 * @param {string} sessionId - Session ID
 * @param {Object} data - Feedback object { playerName: rating }
 */
export const saveCoachFeedback = async (date, sessionId, data) => {
    try {
        await set(ref(db, `coachFeedback/${date}/${sessionId}`), data);
    } catch (error) {
        console.error("Error saving coach feedback:", error);
        throw error;
    }
};

/**
 * Saves coach feedback for a specific player (Atomic update)
 * @param {string} date - Date string YYYY-MM-DD
 * @param {string} sessionId - Session ID
 * @param {string} playerName - Player Name
 * @param {number} rating - Rating 1-5
 */
export const saveCoachFeedbackForPlayer = async (date, sessionId, playerName, rating) => {
    try {
        await set(ref(db, `coachFeedback/${date}/${sessionId}/${playerName}`), rating);
    } catch (error) {
        console.error("Error saving coach feedback for player:", error);
        throw error;
    }
};

export const FEEDBACK_EMOJI_Q1 = [
    { val: 1, icon: "🥵", label: "Väga raske" },
    { val: 2, icon: "😰", label: "Raske" },
    { val: 3, icon: "😐", label: "Keskmine" },
    { val: 4, icon: "🙂", label: "Kerge" },
    { val: 5, icon: "🤩", label: "Väga kerge" }
];

export const FEEDBACK_EMOJI_Q2 = [
    { val: 1, icon: "🙇‍♂️", label: "Väga vähe" },
    { val: 2, icon: "🙋‍♂️", label: "Vähe" },
    { val: 3, icon: "🤷‍♂️", label: "Keskmiselt" },
    { val: 4, icon: "🙆‍♂️", label: "Palju" },
    { val: 5, icon: "🧘‍♂️", label: "Väga palju" }
];

export const FEEDBACK_EMOJI_Q3 = [
    { val: 1, icon: "😫", label: "Väga ebaselge" },
    { val: 2, icon: "😕", label: "Ebaselge" },
    { val: 3, icon: "😐", label: "Keskmine" },
    { val: 4, icon: "🙂", label: "Selge" },
    { val: 5, icon: "💡", label: "Väga selge" }
];

export const COACH_FEEDBACK_EMOJI = [
    { val: 1, icon: "😞", label: "Väga väike" },
    { val: 2, icon: "😕", label: "Keskmisest väiksem" },
    { val: 3, icon: "😐", label: "Keskmine" },
    { val: 4, icon: "🙂", label: "Keskmisest suurem" },
    { val: 5, icon: "💪", label: "Väga suur" }
];

/**
 * Calculates feedback trend and average from raw feedback data.
 * @param {Object} playerFeedbackData - feedbackData[player] object (dates as keys)
 * @returns {Object|null} { avg: string, trend: 'up'|'down'|'flat', count: number } or null
 */
export const getFeedbackTrend = (playerFeedbackData) => {
    if (!playerFeedbackData) return null;

    const feedDates = Object.keys(playerFeedbackData).sort();
    if (feedDates.length === 0) return null;

    // Take last 7 entries
    const recentDates = feedDates.slice(-7);
    const recentFeedbacks = recentDates.map(d => playerFeedbackData[d]);

    let totalEffort = 0;
    let count = 0;

    recentFeedbacks.forEach(fb => {
        if (fb.intensity) { // 'intensity' maps to 'effort' in older code, checking both
            totalEffort += parseInt(fb.intensity, 10);
            count++;
        } else if (fb.effort) {
            totalEffort += parseInt(fb.effort, 10);
            count++;
        }
    });

    if (count === 0) return null;

    const avg = (totalEffort / count).toFixed(1);

    // Simple trend: Compare last entry vs previous entry (if enough data)
    let trend = 'flat';
    if (recentFeedbacks.length >= 2) {
        const lastFb = recentFeedbacks[recentFeedbacks.length - 1];
        const prevFb = recentFeedbacks[recentFeedbacks.length - 2];

        const last = parseInt(lastFb.intensity || lastFb.effort || 0);
        const prev = parseInt(prevFb.intensity || prevFb.effort || 0);

        if (last > prev) trend = 'up';
        if (last < prev) trend = 'down';
    }

    return { avg, trend, count };
};

/**
 * Retrieves a specific coach feedback rating.
 * @param {Object} coachFeedbackData - The full feedback data object
 * @param {string} date - Date string YYYY-MM-DD
 * @param {string} sessionId - Session ID (optional if searching all for date)
 * @param {string} playerName - Player's name
 * @returns {number|undefined} The rating (1-5) or undefined if not found
 */
export const getCoachFeedback = (coachFeedbackData, date, sessionId, playerName) => {
    if (!coachFeedbackData || !date || !playerName) return undefined;

    // 1. Try direct lookup if sessionId provided
    if (sessionId && coachFeedbackData[date]?.[sessionId]?.[playerName]) {
        return coachFeedbackData[date][sessionId][playerName];
    }

    // 2. Fallback: Search all sessions for this player on this date
    // Useful for Dashboard view where we just want to know "Did they get feedback?"
    if (!sessionId && coachFeedbackData[date]) {
        for (const sId of Object.keys(coachFeedbackData[date])) {
            if (coachFeedbackData[date][sId]?.[playerName]) {
                return coachFeedbackData[date][sId][playerName];
            }
        }
    }

    return undefined;
};
