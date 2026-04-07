// src/data/migration.js
// Migration script to convert group-based schedules to player-based weekly templates

import { ref as databaseRef, get, set } from 'firebase/database';
import { db } from '../firebase';

/**
 * Migrate from group-based scheduling to player-based weekly templates
 * 
 * This converts:
 * - playerGroups: { "Jan Tamm": "1", "Mari Mets": "2" }
 * - fussGroups: { "Jan Tamm": "A", "Mari Mets": "B" }
 * - schedule: { tennis: { group1: {...}, group2: {...} }, fuss: { groupA: {...}, groupB: {...} } }
 * 
 * Into:
 * - playerWeeklySchedule: { "Jan Tamm": { tennis: { Monday: "16:00", ... }, fuss: { ... }, group: "1", fussGroup: "A" } }
 * - sessionOptions: { tennis: { opt_1: { startTime, endTime, maxCapacity, days } }, ... }
 */

/**
 * Run the full migration
 * @param {function} onProgress - Progress callback with (step, total, message)
 * @returns {Promise<object>} Migration result
 */
export async function runMigration(onProgress = () => { }) {
    const result = {
        success: false,
        playersProcessed: 0,
        sessionOptionsCreated: 0,
        errors: []
    };

    try {
        onProgress(1, 5, 'Laen olemasolevaid andmeid...');

        // 1. Load existing data
        const [scheduleSnap, playerGroupsSnap, fussGroupsSnap, playersSnap] = await Promise.all([
            get(databaseRef(db, 'schedule')),
            get(databaseRef(db, 'playerGroups')),
            get(databaseRef(db, 'fussGroups')),
            get(databaseRef(db, 'players')) // or wherever player list is stored
        ]);

        const schedule = scheduleSnap.val() || {};
        const playerGroups = playerGroupsSnap.val() || {};
        const fussGroups = fussGroupsSnap.val() || {};

        onProgress(2, 5, 'Loon treeningute valikuid...');

        // 2. Create session options from existing schedule
        const sessionOptions = {
            tennis: {},
            fuss: {}
        };

        // Parse tennis schedule
        if (schedule.tennis) {
            const allTennisTimes = new Set();

            // Collect all unique times from groups
            Object.values(schedule.tennis).forEach(groupSchedule => {
                Object.values(groupSchedule || {}).forEach(timeStr => {
                    if (timeStr) allTennisTimes.add(timeStr);
                });
            });

            // Create session options for each unique time
            let optIdx = 1;
            allTennisTimes.forEach(timeStr => {
                const [start, end] = parseTimeRange(timeStr);
                if (start && end) {
                    const days = getDaysForTime(schedule.tennis, timeStr);
                    sessionOptions.tennis[`opt_${optIdx}`] = {
                        startTime: start,
                        endTime: end,
                        maxCapacity: 8,
                        days
                    };
                    optIdx++;
                }
            });
        }

        // Parse fuss schedule
        if (schedule.fuss) {
            const allFussTimes = new Set();

            Object.values(schedule.fuss).forEach(groupSchedule => {
                Object.values(groupSchedule || {}).forEach(timeStr => {
                    if (timeStr) allFussTimes.add(timeStr);
                });
            });

            let optIdx = 1;
            allFussTimes.forEach(timeStr => {
                const [start, end] = parseTimeRange(timeStr);
                if (start && end) {
                    const days = getDaysForFuss(schedule.fuss, timeStr);
                    sessionOptions.fuss[`opt_${optIdx}`] = {
                        startTime: start,
                        endTime: end,
                        maxCapacity: 12,
                        days
                    };
                    optIdx++;
                }
            });
        }

        // Save session options
        await set(databaseRef(db, 'sessionOptions'), sessionOptions);
        result.sessionOptionsCreated =
            Object.keys(sessionOptions.tennis).length +
            Object.keys(sessionOptions.fuss).length;

        onProgress(3, 5, 'Loon mängijate graafikuid...');

        // 3. Create player weekly schedules
        const playerWeeklySchedule = {};
        const allPlayers = new Set([
            ...Object.keys(playerGroups),
            ...Object.keys(fussGroups)
        ]);

        for (const playerName of allPlayers) {
            const tennisGroup = playerGroups[playerName];
            const fussGroup = fussGroups[playerName];

            const playerSchedule = {
                group: tennisGroup || null,
                fussGroup: fussGroup || null,
                tennis: {},
                fuss: {}
            };

            // Assign tennis times based on group
            if (tennisGroup && schedule.tennis) {
                const groupKey = tennisGroup === '1' ? 'group1' : 'group2';
                const groupSchedule = schedule.tennis[groupKey] || {};

                // Convert group schedule to player schedule
                for (const [dayKey, timeStr] of Object.entries(groupSchedule)) {
                    // Normalize day key (e.g., "Monday1" -> "Monday")
                    const day = dayKey.replace(/[12]$/, '');
                    const [startTime] = parseTimeRange(timeStr);
                    if (startTime) {
                        playerSchedule.tennis[day] = startTime;
                    }
                }
            }

            // Assign fuss times based on group
            if (fussGroup && schedule.fuss) {
                const groupKey = fussGroup === 'A' ? 'groupA' : 'groupB';
                const groupSchedule = schedule.fuss[groupKey] || {};

                for (const [day, timeStr] of Object.entries(groupSchedule)) {
                    const [startTime] = parseTimeRange(timeStr);
                    if (startTime) {
                        playerSchedule.fuss[day] = startTime;
                    }
                }
            }

            playerWeeklySchedule[playerName] = playerSchedule;
            result.playersProcessed++;
        }

        onProgress(4, 5, 'Salvestan mängijate graafikud...');

        // Save player schedules
        await set(databaseRef(db, 'playerWeeklySchedule'), playerWeeklySchedule);

        onProgress(5, 5, 'Migratsioon lõpetatud!');

        result.success = true;
    } catch (error) {
        result.errors.push(error.message);
        console.error('Migration error:', error);
    }

    return result;
}

/**
 * Parse time range string like "11:00 - 12:30" into [start, end]
 */
function parseTimeRange(timeStr) {
    if (!timeStr) return [null, null];
    const match = timeStr.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (match) {
        return [match[1], match[2]];
    }
    return [null, null];
}

/**
 * Get days that have a specific time in tennis schedule
 */
function getDaysForTime(tennisSchedule, timeStr) {
    const days = new Set();
    const dayMapping = {
        'Monday': 'Monday', 'Monday1': 'Monday', 'Monday2': 'Monday',
        'Tuesday': 'Tuesday', 'Tuesday1': 'Tuesday', 'Tuesday2': 'Tuesday',
        'Wednesday': 'Wednesday', 'Wednesday1': 'Wednesday', 'Wednesday2': 'Wednesday',
        'Thursday': 'Thursday', 'Thursday1': 'Thursday', 'Thursday2': 'Thursday',
        'Friday': 'Friday', 'Friday1': 'Friday', 'Friday2': 'Friday'
    };

    Object.values(tennisSchedule).forEach(groupSchedule => {
        Object.entries(groupSchedule || {}).forEach(([dayKey, time]) => {
            if (time === timeStr && dayMapping[dayKey]) {
                days.add(dayMapping[dayKey]);
            }
        });
    });

    return Array.from(days);
}

/**
 * Get days that have a specific time in fuss schedule
 */
function getDaysForFuss(fussSchedule, timeStr) {
    const days = new Set();

    Object.values(fussSchedule).forEach(groupSchedule => {
        Object.entries(groupSchedule || {}).forEach(([day, time]) => {
            if (time === timeStr) {
                days.add(day);
            }
        });
    });

    return Array.from(days);
}

/**
 * Check if migration has already been run
 */
export async function isMigrationComplete() {
    const scheduleSnap = await get(databaseRef(db, 'playerWeeklySchedule'));
    return scheduleSnap.exists() && Object.keys(scheduleSnap.val() || {}).length > 0;
}

/**
 * Preview migration without applying changes
 */
export async function previewMigration() {
    const [scheduleSnap, playerGroupsSnap, fussGroupsSnap] = await Promise.all([
        get(databaseRef(db, 'schedule')),
        get(databaseRef(db, 'playerGroups')),
        get(databaseRef(db, 'fussGroups'))
    ]);

    const playerGroups = playerGroupsSnap.val() || {};
    const fussGroups = fussGroupsSnap.val() || {};
    const allPlayers = new Set([
        ...Object.keys(playerGroups),
        ...Object.keys(fussGroups)
    ]);

    return {
        playerCount: allPlayers.size,
        hasSchedule: scheduleSnap.exists(),
        tennisGroups: Object.keys(playerGroups).length > 0 ? ['1', '2'] : [],
        fussGroups: Object.keys(fussGroups).length > 0 ? ['A', 'B'] : []
    };
}
