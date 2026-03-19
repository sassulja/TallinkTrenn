import { toDate } from "date-fns-tz";

const TALLINN_TZ = "Europe/Tallinn";

/**
 * Returns the current time formatted accurately for Europe/Tallinn.
 * Typically stored or used as ISO string, but the prompt asks for time utility.
 * We return a Date object representing the current moment, which inherently is UTC-based
 * but can be formatted for Tallinn. If the user just needs the current local date/time string:
 */
export function getTallinnNow() {
    // Just returns a new Date, timezone is handled during formatting
    return new Date();
}

/**
 * Combines a date string (YYYY-MM-DD) and a time string (HH:MM) into an ISO string
 * assuming the provided date/time is in Europe/Tallinn time.
 * @param {string} dateString - e.g. "2026-02-23"
 * @param {string} timeString - e.g. "14:30"
 * @returns {string} - Full ISO string representation
 */
export function combineDateAndTime(dateString, timeString) {
    if (!dateString || !timeString) {
        throw new Error("Both dateString and timeString are required.");
    }

    // Create an ISO string without Z to be parsed strictly as local in the target TZ
    // Format: YYYY-MM-DDTHH:MM:00
    const localIsoString = `${dateString}T${timeString}:00`;

    // Convert to Date object specifying that the local Iso string is in Europe/Tallinn
    const zonedDate = toDate(localIsoString, { timeZone: TALLINN_TZ });

    return zonedDate.toISOString();
}
