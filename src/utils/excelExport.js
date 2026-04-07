import * as XLSX from 'xlsx';
import {
    getSessionsForDay,
    getPlayersForSession,
    formatSessionTime,
    formatCapacity,
    getCapacityLabel,
    getDayNameFromDate
} from '../data';

export const handleDownloadExcel = (
    allDates,
    sessionOptions,
    playerWeeklySchedules,
    scheduleOverrides,
    attendance,
    fussAttendance
) => {
    // We want to export the NEXT 7 DAYS starting from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const exportDates = allDates
        .map(d => ({ ...d, dateObj: new Date(d.date) }))
        .filter(d => {
            const dateObj = new Date(d.date);
            dateObj.setHours(0, 0, 0, 0);
            const diff = (dateObj - today) / (1000 * 60 * 60 * 24);
            return diff >= 0 && diff < 14; // Export next 2 weeks to be safe
        })
        .sort((a, b) => a.dateObj - b.dateObj);

    const rows = [];

    rows.push(['Kuupäev', 'Nädalapäev', 'Aeg', 'Ala', 'Osalejaid', 'Mängijad']);

    exportDates.forEach(dateObj => {
        const dateStr = dateObj.date;
        const dayName = getDayNameFromDate(dateStr);

        // Get all sessions for this day
        const tennisSessions = getSessionsForDay(sessionOptions.tennis, dayName);
        const fussSessions = getSessionsForDay(sessionOptions.fuss, dayName);
        const allSessions = [...tennisSessions, ...fussSessions].sort((a, b) => a.startTime.localeCompare(b.startTime));

        if (allSessions.length === 0) {
            rows.push([dateStr, dateObj.weekday, '-', '-', 'Vaba päev', '-']);
            return; // Empty day
        }

        allSessions.forEach(session => {
            // Get players
            const players = getPlayersForSession(
                playerWeeklySchedules,
                scheduleOverrides[dateStr],
                session.sport,
                dayName,
                session.startTime
            );

            // Format player list with attendance status
            // Name (Jah/Ei/?)
            const playerListStr = players.map(p => {
                const att = session.sport === 'tennis'
                    ? attendance[dateStr]?.[p.name]
                    : fussAttendance[dateStr]?.[p.name];

                let statusMark = '?';
                if (att === 'Jah') statusMark = '✅';
                if (att === 'Ei') statusMark = '❌';

                return `${p.name} ${statusMark}`;
            }).join(', ');

            rows.push([
                dateStr.split('-').reverse().join('/'),
                dateObj.weekday,
                formatSessionTime(session.startTime, session.endTime),
                session.sport === 'tennis' ? 'Tennis' : 'Füss',
                `${players.length}/${session.maxCapacity}`,
                playerListStr
            ]);
        });

        // Add empty row separator
        rows.push(['', '', '', '', '', '']);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Graafik");
    XLSX.writeFile(workbook, "Tallink_Graafik.xlsx");
};
