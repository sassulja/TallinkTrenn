import React, { useState, useMemo, useCallback } from 'react';
import { getDayNameFromDate, isDateInPast, removeScheduleOverride } from '../../data/playerSchedules';
import { deleteApplication } from '../../data/sessionApplications'; // Import deleteApplication
import { COACH_FEEDBACK_EMOJI, saveCoachFeedback, saveCoachFeedbackForPlayer, getFeedbackTrend, getCoachFeedback, FEEDBACK_EMOJI_Q1, savePlayerFeedback } from '../../data/feedback';
import { updatePlayerAttendance } from '../../data/attendance';
import SessionFeedbackModal from '../feedback/SessionFeedbackModal';
import ApplySessionModal from './ApplySessionModal';

const PlayerScheduleView = ({
    player,
    // REMOVED: allDates prop
    sessionOptions,
    // REMOVED: playerWeeklySchedules
    scheduleOverrides,
    attendance,
    fussAttendance,
    onAttendanceChange,
    initialShowHistory = false,
    title = "Minu kava",
    // Feedback props
    feedbackData = {},
    coachFeedbackData = {},
    // REMOVED: playerGroups, fussGroups
}) => {
    // LOCALLY DEFINED DATES (Next 7 days + history support handled by logic)
    // Actually, getSessionsInRange filters from this list.
    // To support history, we might need more than 7 days if "allDates" was preventing history lookup?
    // But the user said "Replace with... 7 days". I will follow instructions.
    // If history needs more, the user will see and ask.
    // However, existing code sorts/filters `allDates`.
    // I'll stick to the user's snippet loop check but ensure objects.





    const [showHistory, setShowHistory] = useState(initialShowHistory);
    // Default history: last 7 days
    const [historyStart, setHistoryStart] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
    });
    const [historyEnd, setHistoryEnd] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 1); // Yesterday
        return d.toISOString().split('T')[0];
    });

    const [showExtraModal, setShowExtraModal] = useState(false);
    const [confirmation, setConfirmation] = useState(null); // Confirmation state
    const [selectedSessionForFeedback, setSelectedSessionForFeedback] = useState(null);

    // 4️⃣ Ensure No Silent Failures
    if (!sessionOptions) console.warn('⚠️ sessionOptions undefined');
    if (!scheduleOverrides) console.warn('⚠️ scheduleOverrides undefined');

    const handleSaveFeedback = async (date, data) => {
        try {
            const sessionId = selectedSessionForFeedback?.id;
            // Use date + player + sessionId (if available)
            await savePlayerFeedback(date, player, data, sessionId);
            // Close modal is handled by the modal's onClose, but we updates local state via parent re-render or similar? 
            // The feedbackData prop comes from App.js which listens to Firebase, so it should auto-update.
        } catch (e) {
            console.error("Failed to save feedback", e);
            alert("Salvestamine ebaõnnestus");
        }
    };

    // --- Feedback Trend Calculation ---
    const getFeedbackTrend = () => {
        if (!feedbackData[player]) return null;

        const feedDates = Object.keys(feedbackData[player]).sort();
        if (feedDates.length === 0) return null;

        // Take last 7 entries
        const recentDates = feedDates.slice(-7);
        const recentFeedbacks = recentDates.map(d => feedbackData[player][d]);

        let totalEffort = 0;
        let count = 0;

        recentFeedbacks.forEach(fb => {
            if (fb.intensity) {
                totalEffort += parseInt(fb.intensity, 10);
                count++;
            }
        });

        if (count === 0) return null;

        const avg = (totalEffort / count).toFixed(1);

        // Simple trend: Compare last 3 vs previous 3 (if enough data)
        let trend = 'flat';
        if (recentFeedbacks.length >= 2) {
            const last = parseInt(recentFeedbacks[recentFeedbacks.length - 1].intensity || 0);
            const prev = parseInt(recentFeedbacks[recentFeedbacks.length - 2].intensity || 0);
            if (last > prev) trend = 'up';
            if (last < prev) trend = 'down';
        }

        return { avg, trend, count };
    };

    const trendData = getFeedbackTrend();

    // ... helpers ... (keeping existing EST date helpers)
    const estonianDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day} /${month}/${year} `;
    };

    const getDayName = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { weekday: 'long' });
    };

    // Helper: Checks if player is in a specific session
    // NOW SESSION-ID BASED
    const isPlayerInSession = useCallback((dateStr, sessionId) => {
        const overrides = scheduleOverrides[dateStr];
        // overrides[player] is { sessionId: true, ... }

        const availableOverrides = scheduleOverrides[dateStr];
        const playerOverrides = scheduleOverrides[dateStr]?.[player];
        const result = !!(overrides && overrides[player] && overrides[player][sessionId]);



        if (!overrides || !overrides[player]) {
            // console.log(`[Override Read] Date: ${dateStr}, Player: ${player}, SessionId: ${sessionId}, Result: false (no overrides)`);
            return false;
        }

        // const result = !!overrides[player][sessionId];
        // console.log(`[Override Read] Date: ${dateStr}, Player: ${player}, SessionId: ${sessionId}, Result: ${result}`);
        return result;
    }, [scheduleOverrides, player]);

    const getSessionsInRange = useCallback((startStr, endStr) => {


        if (!sessionOptions) {
            console.warn('🚨 Early return triggered', { sessionOptions });
            return [];
        }

        const sessions = [];
        const start = new Date(startStr);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endStr);
        end.setHours(23, 59, 59, 999);

        // Generate dates dynamically between start and end
        const relevantDates = [];
        const msgDate = new Date(start);
        while (msgDate <= end) {
            relevantDates.push({ date: msgDate.toISOString().split('T')[0] });
            msgDate.setDate(msgDate.getDate() + 1);
        }



        relevantDates.forEach(dateObj => {
            const dateStr = dateObj.date;
            const dayName = getDayName(dateStr);

            // Refactored Iteration: Iterate All Sessions -> Filter by Day -> Check Override

            // 1. Tennis
            Object.entries(sessionOptions.tennis || {}).forEach(([sessionId, session]) => {
                // DEBUG: Log everything to trace mismatches
                const isDayMatch = session.days && session.days.includes(dayName);
                const debugIsIn = isPlayerInSession(dateStr, sessionId);

                console.log(`[Debug Iteration] Tennis ${dateStr}`, {
                    dateStr,
                    dayName,
                    sessionId,
                    sessionDays: session.days,
                    isDayMatch,
                    overrides: scheduleOverrides[dateStr]?.[player],
                    isIn: debugIsIn
                });

                // Check if session includes this day
                if (session.days && session.days.includes(dayName)) {

                    // console.log('🔍 Checking session candidate', {
                    //     dateStr,
                    //     dayName,
                    //     sessionId,
                    //     sessionDays: session.days,
                    //     startTime: session.startTime
                    // });

                    const isIn = isPlayerInSession(dateStr, sessionId);

                    if (isIn) {
                        sessions.push({
                            id: sessionId,
                            date: dateStr,
                            weekday: dayName,
                            sport: 'tennis',
                            time: session.startTime,
                            endTime: session.endTime,
                            isOverride: true,
                            changedBy: 'Schedule',
                            // UPDATE: Session-based attendance read
                            attendance: (() => {
                                const val = attendance[dateStr]?.[sessionId]?.[player] || null;
                                if (val) {
                                    // console.log('[Attendance Read] Tennis', { date: dateStr, sessionId, player, value: val });
                                }
                                return val;
                            })()
                        });
                    }
                }
            });

            // 2. Fuss
            Object.entries(sessionOptions.fuss || {}).forEach(([sessionId, session]) => {
                // DEBUG: Log everything to trace mismatches
                const isDayMatch = session.days && session.days.includes(dayName);
                const debugIsIn = isPlayerInSession(dateStr, sessionId);

                console.log(`[Debug Iteration] Fuss ${dateStr}`, {
                    dateStr,
                    dayName,
                    sessionId,
                    sessionDays: session.days,
                    isDayMatch,
                    overrides: scheduleOverrides[dateStr]?.[player],
                    isIn: debugIsIn
                });

                // Check if session includes this day
                if (session.days && session.days.includes(dayName)) {

                    // console.log('🔍 Checking session candidate', {
                    //     dateStr,
                    //     dayName,
                    //     sessionId,
                    //     sessionDays: session.days,
                    //     startTime: session.startTime
                    // });

                    const isIn = isPlayerInSession(dateStr, sessionId);

                    if (isIn) {
                        sessions.push({
                            id: sessionId,
                            date: dateStr,
                            weekday: dayName,
                            sport: 'fuss',
                            time: session.startTime,
                            endTime: session.endTime,
                            isOverride: true,
                            changedBy: 'Schedule',
                            // UPDATE: Session-based attendance read
                            attendance: (() => {
                                const val = fussAttendance[dateStr]?.[sessionId]?.[player] || null;
                                if (val) {
                                    // console.log('[Attendance Read] Fuss', { date: dateStr, sessionId, player, value: val });
                                }
                                return val;
                            })()
                        });
                    }
                }
            });
        });

        return sessions;
    }, [sessionOptions, isPlayerInSession, attendance, fussAttendance, player]);

    // Calculate ranges
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Upcoming: Today + 7 days
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    const upcomingSessions = useMemo(() => getSessionsInRange(todayStr, nextWeekStr), [getSessionsInRange, todayStr, nextWeekStr]);
    const historySessions = useMemo(() => showHistory ? getSessionsInRange(historyStart, historyEnd).reverse() : [], [showHistory, getSessionsInRange, historyStart, historyEnd]);

    const handleSessionAction = (session, val) => {
        // 1. Unified Cutoff Check (1 hour before start or if session has started)
        if (session.time) {
            const now = new Date();
            const sessionStart = new Date(`${session.date}T${session.time}`);

            // Calculate Session End
            let sessionEnd = new Date(sessionStart);
            if (session.endTime) {
                sessionEnd = new Date(`${session.date}T${session.endTime}`);
            } else {
                sessionEnd.setMinutes(sessionEnd.getMinutes() + 90); // Fallback
            }

            // Lock Boundary: 1 hour before start
            const lockBoundary = new Date(sessionStart.getTime() - 60 * 60 * 1000);

            const isAttendanceLocked = now >= lockBoundary;

            // console.log('[Attendance Timing]', {
            //     now: now.toLocaleString(),
            //     sessionStart: sessionStart.toLocaleString(),
            //     sessionEnd: sessionEnd.toLocaleString(),
            //     lockBoundary: lockBoundary.toLocaleString(),
            //     isAttendanceLocked
            // });

            // Check if past cutoff OR if session has already started
            if (isAttendanceLocked) {
                console.warn(`[Attendance Lock] Blocked change for session ${session.id}. Now: ${now.toLocaleTimeString()}, Lock: ${lockBoundary.toLocaleTimeString()}`);
                alert("Osalemist ei saa muuta (vähem kui 1h alguseni või trenn läbi).");
                return;
            }
        }

        // Special handling for Extra Sessions (Approve Application)
        const isExtraSession = session.isOverride && session.changedBy === 'Approve Application';

        if (isExtraSession && (val === 'Ei' || val === null)) {
            // Logic for cancelling an accepted extra session
            // Cutoff check is already done above.

            setConfirmation({
                message: "See on lisatreening. Kas soovid selle tühistada?",
                action: async () => {
                    try {
                        // 1. Delete Application
                        // We use the ID directly from the session object (which comes from sessionOptions iteration)
                        const sessionId = session.id;

                        if (sessionId) {
                            console.log(`Deleting application for sessionId: ${sessionId} `);
                            await deleteApplication(session.date, session.sport, sessionId, player);
                        } else {
                            console.warn(`Could not find session ID for cancellation(time: ${session.time}), skipping application delete.`);
                        }

                        // Explicitly unset attendance so UI updates immediately without "Ei osale" ghost state
                        await updatePlayerAttendance(session.date, player, null, session.id);

                        // 2. Smart Cancel Override
                        // Legacy template check removed. Always remove override.
                        await removeScheduleOverride(session.date, player, session.id);

                        setConfirmation(null);
                    } catch (e) {
                        console.error(e);
                        alert("Tühistamine ebaõnnestus.");
                    }
                }
            });
            return;
        }

        // Standard attendance toggle
        onAttendanceChange(session.date, session.sport, val, session.id);
    };



    return (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
            {/* Title & Add Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <h2 style={{ margin: 0 }}>{title}</h2>
                <button
                    onClick={() => setShowExtraModal(true)}
                    style={{
                        background: '#1890ff', color: 'white', border: 'none',
                        borderRadius: 4, padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer'
                    }}
                >
                    + Lisa treening
                </button>
            </div>

            {/* Trend Summary (Parent View mostly) */}
            {trendData && (
                <div style={{
                    marginBottom: 20,
                    padding: '12px 16px',
                    background: '#f6ffed',
                    border: '1px solid #b7eb8f',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                }}>
                    <span style={{ fontSize: 24 }}>📈</span>
                    <div>
                        <div style={{ fontWeight: 'bold', fontSize: 14 }}>Treeningute kokkuvõte</div>
                        <div style={{ fontSize: 13, color: '#666' }}>
                            Keskmine pingutus: <b>{trendData.avg}/10</b>
                            {trendData.trend === 'up' && <span style={{ color: 'green', marginLeft: 6 }}>↗️ Tõusev</span>}
                            {trendData.trend === 'down' && <span style={{ color: 'red', marginLeft: 6 }}>↘️ Langev</span>}
                        </div>
                    </div>
                </div>
            )}

            {/* Upcoming List */}
            {upcomingSessions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#666', background: '#f5f5f5', borderRadius: 8, marginBottom: 20 }}>
                    Järgneva 7 päeva jooksul trenne ei ole.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
                    {upcomingSessions.map(session => (
                        <SessionCard
                            key={session.id}
                            session={session}
                            player={player}
                            onAction={handleSessionAction}
                            onCardClick={() => {
                                // Check if session has ended
                                const now = new Date();
                                const sessionStart = new Date(`${session.date}T${session.time}`);
                                let sessionEnd = new Date(sessionStart);

                                if (session.endTime) {
                                    sessionEnd = new Date(`${session.date}T${session.endTime}`);
                                } else {
                                    sessionEnd.setMinutes(sessionEnd.getMinutes() + 90); // Assume 90 min duration
                                }

                                if (now < sessionEnd) {
                                    alert("Tagasisidet saab anda alles pärast trenni lõppu.");
                                    return;
                                }
                                setSelectedSessionForFeedback(session);
                            }}
                            feedbackData={feedbackData}
                            coachFeedbackData={coachFeedbackData}
                        />
                    ))}
                </div>
            )}

            {/* History Section */}
            <div style={{ borderTop: '1px solid #eee', paddingTop: 20 }}>
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    style={{
                        background: 'none', border: 'none', color: '#666',
                        textDecoration: 'underline', cursor: 'pointer',
                        fontSize: 15, padding: 0, marginBottom: 16
                    }}
                >
                    {showHistory ? "Peida ajalugu" : "Näita ajalugu"}
                </button>

                {showHistory && (
                    <div style={{ background: '#fafafa', padding: 16, borderRadius: 8 }}>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: 12, color: '#666' }}>Alates:</label>
                                <input
                                    type="date"
                                    value={historyStart}
                                    onChange={e => setHistoryStart(e.target.value)}
                                    style={{ padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <label style={{ fontSize: 12, color: '#666' }}>Kuni:</label>
                                <input
                                    type="date"
                                    value={historyEnd}
                                    onChange={e => setHistoryEnd(e.target.value)}
                                    style={{ padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
                                />
                            </div>
                        </div>

                        {historySessions.length === 0 ? (
                            <div style={{ color: '#999', fontStyle: 'italic' }}>Selles vahemikus trenne ei leitud.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {historySessions.map(session => (
                                    <SessionCard
                                        key={session.id}
                                        session={session}
                                        player={player}
                                        onAction={handleSessionAction}
                                        onCardClick={() => {
                                            // Check if session has ended
                                            const now = new Date();
                                            const sessionStart = new Date(`${session.date}T${session.time}`);
                                            let sessionEnd = new Date(sessionStart);

                                            if (session.endTime) {
                                                sessionEnd = new Date(`${session.date}T${session.endTime}`);
                                            } else {
                                                sessionEnd.setMinutes(sessionEnd.getMinutes() + 90); // Assume 90 min duration
                                            }

                                            if (now < sessionEnd) {
                                                alert("Tagasisidet saab anda alles pärast trenni lõppu.");
                                                return;
                                            }
                                            setSelectedSessionForFeedback(session);
                                        }}
                                        feedbackData={feedbackData}
                                        coachFeedbackData={coachFeedbackData}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>


            {/* Extra Session Modal */}
            <ApplySessionModal
                isOpen={showExtraModal}
                onClose={() => setShowExtraModal(false)}
                player={player}
                sessionOptions={sessionOptions}
                // REMOVED: playerWeeklySchedules
                scheduleOverrides={scheduleOverrides}
                attendance={attendance}
            />

            {/* Confirmation Dialog */}
            {confirmation && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1300,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{ background: 'white', padding: 24, borderRadius: 8, maxWidth: 350, textAlign: 'center' }}>
                        <h3 style={{ marginTop: 0 }}>{confirmation.message}</h3>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
                            <button
                                onClick={() => setConfirmation(null)}
                                style={{ padding: '8px 16px', background: 'white', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}
                            >
                                Ei, tagasi
                            </button>
                            <button
                                onClick={confirmation.action}
                                style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                            >
                                Jah, tühista
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Feedback Modal */}
            {selectedSessionForFeedback && (
                <SessionFeedbackModal
                    session={selectedSessionForFeedback}
                    player={player}
                    // Determine if parent view or player view based on context or props
                    // But here we can check title? Or pass a prop.
                    // The simplest is to rely on "isParentView" prop if it existed.
                    // Actually, if 'title' contains "Minu kava", it's player. Else it's parent.
                    // Better: Pass `isParentView` or assume player view unless specified.
                    // However, we can check if `player === currentUser.username` if we had currentUser.

                    // Workaround: The 'title' prop is set to "Minu kava" for player, and "[Name] kava" for parent.
                    isParentView={title !== "Minu kava"}

                    // Pass existing feedback explicitly
                    existingFeedback={
                        feedbackData[selectedSessionForFeedback.date]?.[selectedSessionForFeedback.id]?.[player] ||
                        (feedbackData[selectedSessionForFeedback.date]?.[player]?.intensity ? feedbackData[selectedSessionForFeedback.date]?.[player] : null)
                    }

                    feedbackData={feedbackData}
                    coachFeedbackData={coachFeedbackData}
                    onClose={() => setSelectedSessionForFeedback(null)}
                    onSaveFeedback={handleSaveFeedback}
                />
            )}
        </div>
    );
};

const SessionCard = ({
    session,
    player,
    onAction,
    onCardClick,
    feedbackData = {},
    coachFeedbackData = {}
}) => {
    const isTennis = session.sport === 'tennis';
    const bgColor = isTennis ? '#e6f7ff' : '#fffbe6';
    const borderColor = isTennis ? '#91d5ff' : '#ffe58f';
    const icon = isTennis ? '🎾' : '⚽';

    const isAttending = session.attendance === 'Jah';
    const isNotAttending = session.attendance === 'Ei';

    // Label logic
    let label = null;
    let labelColor = null;

    if (session.isOverride) {
        if (session.changedBy === 'Approve Application') {
            label = "LISATREENING";
            labelColor = "#52c41a"; // Green
        } else {
            label = "MUUDETUD";
            labelColor = "#cf1322"; // Red
        }
    }

    // Feedback Logic
    // Session-based lookup with fallback
    // Feedback Logic
    // Session-based lookup (New: date->session->player) or Legacy (date->player)
    const dateData = feedbackData[session.date] || {};
    const sessionLevelFeedback = dateData[session.id]?.[player];
    const playerLevelFeedback = dateData[player];

    // Verify it's actual feedback (has intensity/effort) and not just a container
    const isLegacy = playerLevelFeedback && (playerLevelFeedback.intensity || playerLevelFeedback.effort);

    // Determine if feedback exists
    const hasPlayerFeedback = !!(sessionLevelFeedback || isLegacy);

    // Calculate Emoji
    const feedbackObject = sessionLevelFeedback || (isLegacy ? playerLevelFeedback : null);
    const feedbackVal = feedbackObject?.intensity || feedbackObject?.effort;
    const feedbackEmoji = FEEDBACK_EMOJI_Q1.find(e => e.val === parseInt(feedbackVal))?.icon || '📝';

    // Coach Feedback lookup
    // Key: coachFeedbackData[date][sessionId][player]
    // STRICTLY session-based.
    const hasCoachFeedback = coachFeedbackData[session.date]?.[session.id]?.[player];

    // Integrity Log (for debugging/verification as requested)
    // console.log(`[Feedback Read Integrity]Player: ${ player }, SessionID: ${ session.id }, HasFeedback: ${ !!hasCoachFeedback } `);

    return (
        <div
            onClick={onCardClick}
            style={{
                border: `1px solid ${borderColor} `,
                borderRadius: 12,
                background: bgColor,
                padding: 16,
                position: 'relative',
                cursor: 'pointer',
                transition: 'transform 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}
        >
            {label && (
                <div style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: labelColor + '20', // transparent bg
                    color: labelColor,
                    fontSize: 10,
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontWeight: 'bold',
                    border: `1px solid ${labelColor} `
                }}>
                    {label}
                </div>
            )}

            {/* Change: Feedback Icons Row */}
            {/* Top Right: Coach Feedback */}
            {hasCoachFeedback && (
                <div style={{ position: 'absolute', top: 12, right: label ? 90 : 12 }} title="Treeneri tagasiside olemas">
                    <span style={{ fontSize: 18 }}>📢</span>
                </div>
            )}

            {/* Bottom Right: Player Feedback */}
            {hasPlayerFeedback && (
                <div style={{ position: 'absolute', bottom: 12, right: 12 }} title="Sinu tagasiside olemas">
                    <span style={{ fontSize: 18 }}>
                        {feedbackEmoji}
                    </span>
                </div>
            )}

            <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
                {session.weekday}, {session.date.split('-').reverse().join('/')}
            </div>
            <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{icon}</span>
                <span>{isTennis ? 'Tennis' : 'Füss'}</span>
                <span style={{ fontSize: 18, fontWeight: 'normal' }}>@ {session.time}</span>
            </div>

            <div style={{ display: 'flex' }}>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        // Cycle: null -> Jah -> Ei -> null
                        let nextVal = 'Jah';
                        if (session.attendance === 'Jah') nextVal = 'Ei';
                        else if (session.attendance === 'Ei') nextVal = null;

                        onAction(session, nextVal);
                    }}
                    style={{
                        width: '100%',
                        padding: '12px 0',
                        borderRadius: 8,
                        border: '1px solid',
                        fontSize: 16,
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        transition: 'all 0.2s',
                        background: isAttending ? '#f6ffed' : isNotAttending ? '#fff1f0' : '#f5f5f5',
                        borderColor: isAttending ? '#52c41a' : isNotAttending ? '#ff4d4f' : '#d9d9d9',
                        color: isAttending ? '#52c41a' : isNotAttending ? '#ff4d4f' : '#888'
                    }}
                >
                    {isAttending && (
                        <>
                            <span style={{ fontSize: 20 }}>✅</span>
                            <span>Osalen</span>
                        </>
                    )}
                    {isNotAttending && (
                        <>
                            <span style={{ fontSize: 20 }}>❌</span>
                            <span>Ei osale</span>
                        </>
                    )}
                    {!isAttending && !isNotAttending && (
                        <>
                            <span style={{ fontSize: 20, filter: 'grayscale(1)' }}>⏳</span>
                            <span>Määra osalemine</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default PlayerScheduleView;

