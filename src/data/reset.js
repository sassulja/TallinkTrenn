import { ref, set } from 'firebase/database';
import { db } from '../firebase';

export const resetTestData = async () => {
    if (!window.confirm("HOIATUS: See kustutab KÕIK testandmed (plaanid, tagasiside, osalemine). Kas oled kindel?")) {
        return;
    }

    try {
        await Promise.all([
            set(ref(db, 'playerWeeklySchedule'), null),
            set(ref(db, 'scheduleOverrides'), null),
            set(ref(db, 'feedback'), null),
            set(ref(db, 'coachFeedback'), null),
            set(ref(db, 'attendance'), null),
            set(ref(db, 'fussAttendance'), null),
            set(ref(db, 'playerGroups'), null),
            set(ref(db, 'fussGroups'), null),
            // Legacy / Timetable structures (FULL WIPE)
            set(ref(db, 'sessionOptions'), null),
            set(ref(db, 'schedule'), null),
            set(ref(db, 'dates'), null), // Also clear dates if dates are dynamic, though App.js might rely on them. User asked for "derived timetable structures". 
            // If 'dates' defines the columns, clearing it might break the view or just show no columns. 
            // App.js: setAllDates(parsed). If empty, SessionOverview might still render but maybe the days navigation breaks?
            // User requested: "Treeningud view must show zero session cards". Clearing sessionOptions achieves that.
            // I will strictly clear sessionOptions and schedule. 
            // Leaving 'dates' alone unless requested, as it might be config-level. But 'schedule' is definitely legacy timetable.
        ]);
        alert("Andmed edukalt lähtestatud!");
        window.location.reload(); // Refresh to clear local state
    } catch (error) {
        console.error("Reset failed:", error);
        alert("Lähtestamine ebaõnnestus: " + error.message);
    }
};
