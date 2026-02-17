// src/components/coach/SessionOverview.js
import React, { useState, useMemo } from 'react';
import {
    getSessionsForDay,
    getCapacityStatus, // Import this
    getCapacityColor,
    getCapacityLabel,
    formatCapacity,
    getPlayersForSession,
    formatSessionTime,
    getDayNameFromDate,
    writeAuditLog,
    AUDIT_ACTIONS,
    removeScheduleOverride, // Updated
    logPlayerMove,
    logCapacityOverride,
    addScheduleOverride,
    // setScheduleOverride - Removed/Deprecated
    // removeScheduleOverrideTime - Removed/Deprecated

    wouldExceedCapacity,
    subscribeToApplicationsForDate, // Import this
    subscribeToReportsForDay, // Import this
    requestAccess
} from '../../data';
import SessionDetailModal from './SessionDetailModal';

const SessionOverview = ({
    date,
    sport,
    sessionOptions,
    // REMOVED: playerWeeklySchedules
    scheduleOverrides,
    attendance,
    onAttendanceChange,
    // Extra props passed from parent
    allPlayers,
    isAdmin,
    currentUser,
    feedbackData,
    coachFeedbackData
}) => {
    const [selectedSession, setSelectedSession] = useState(null);
    const [confirmRemove, setConfirmRemove] = useState(null);

    const handleConfirmRemove = async () => {
        if (!confirmRemove) return;

        const { playerName, sessionId } = confirmRemove;
        console.log(`[SessionOverview] Removing ${playerName} from session ${sessionId}`);

        try {
            await removeScheduleOverride(date, playerName, sessionId);

            await writeAuditLog({
                action: AUDIT_ACTIONS.SCHEDULE_OVERRIDE,
                player: playerName,
                date,
                oldValue: { [sport]: selectedSession.startTime },
                newValue: { [sport]: null },
                changedBy: 'coach',
                reason: 'removed_from_session'
            });

            console.log(`[SessionOverview] Removed ${playerName} successfully`);
            setConfirmRemove(null);
        } catch (err) {
            console.error(`[SessionOverview] Failed to remove ${playerName}`, err);
            alert("Viga eemaldamisel: " + err.message);
        }
    };

    const dayName = useMemo(() => getDayNameFromDate(date), [date]);

    // Get all available sessions for this day
    const dailySessions = useMemo(() => {
        return getSessionsForDay(sessionOptions[sport], dayName);
    }, [sessionOptions, sport, dayName]);

    // Calculate capacity and players for each session
    const sessionsWithData = useMemo(() => {
        return dailySessions.map(session => {
            // Get all players for this session
            const players = getPlayersForSession(
                null, // Was playerWeeklySchedules
                scheduleOverrides?.[date] || {},
                session.id
            );

            // Calculate confirmed vs unconfirmed
            const confirmedCount = players.filter(p =>
                attendance[date]?.[p.name] === 'Jah'
            ).length;

            // Use confirmed count for capacity status (Fix for Red card issue)
            const capacity = getCapacityStatus(
                confirmedCount,
                session.maxCapacity
            );

            return {
                ...session,
                players,
                confirmedCount,
                capacity
            };
        });
    }, [dailySessions, scheduleOverrides, date, sport, dayName, attendance]);

    // Subscribe to applications (for Badges)
    const [applications, setApplications] = useState({});

    // Reset applications when date/sport changes to avoid showing stale data briefly? 
    // Actually the subscription updates fast.

    React.useEffect(() => {
        const unsub = subscribeToApplicationsForDate(date, sport, (apps) => {
            setApplications(apps || {});
        });
        return () => unsub();
    }, [date, sport]);

    // Subscribe to attendance reports for the day
    const [reports, setReports] = useState({});

    React.useEffect(() => {
        const unsub = subscribeToReportsForDay(date, (data) => {
            setReports(data || {});
        });
        return () => unsub();
    }, [date]);


    // Filter sessions based on permissions
    const [showBrowseMode, setShowBrowseMode] = useState(false);

    // Get coach requests to show status (mock/state)
    const [myRequests, setMyRequests] = useState({});

    const visibleSessions = useMemo(() => {
        if (isAdmin) return sessionsWithData;
        if (!currentUser) return sessionsWithData; // Fallback

        // Global coach for this sport?
        if (currentUser.type === 'global' && currentUser.sports?.includes(sport)) {
            return sessionsWithData;
        }

        // Specific coach
        if (showBrowseMode) {
            return sessionsWithData;
        }

        // Only assigned sessions
        return sessionsWithData.filter(s =>
            s.assignedCoaches?.includes(currentUser.username)
        );
    }, [sessionsWithData, isAdmin, currentUser, sport, showBrowseMode]);

    // Handle Access Request
    const handleRequestAccess = async (e, session) => {
        console.log("handleRequestAccess clicked", { session, currentUser });
        e.stopPropagation();
        if (!currentUser) {
            console.error("No currentUser found in handleRequestAccess");
            return;
        }

        try {
            const label = `${dayName} ${formatSessionTime(session.startTime, session.endTime)}`;
            console.log("Sending request...", { username: currentUser.username, option: 'option', sessionId: session.id, label, sport });
            await requestAccess(currentUser.username, 'option', session.id, label, sport);
            console.log("Request sent successfully");
            alert("Ligipääsu taotlus saadetud!");
        } catch (err) {
            console.error("Request failed", err);
            alert("Viga taotluse saatmisel: " + err.message);
        }
    };

    const isAssigned = (session) => {
        if (isAdmin) return true;
        if (currentUser?.type === 'global' && currentUser?.sports?.includes(sport)) return true;
        return session.assignedCoaches?.includes(currentUser?.username);
    };

    if (dailySessions.length === 0) {
        return <div style={{ padding: 20, fontStyle: 'italic', color: '#666' }}>
            Selleks päevaks pole treeninguid planeeritud.
        </div>;
    }

    return (
        <div>
            {/* Coach Controls */}
            {!isAdmin && currentUser?.type === 'specific' && (
                <div style={{ marginBottom: 16 }}>
                    <button
                        onClick={() => setShowBrowseMode(!showBrowseMode)}
                        style={{
                            padding: '8px 16px',
                            background: showBrowseMode ? '#6c757d' : 'white',
                            color: showBrowseMode ? 'white' : '#6c757d',
                            border: '1px solid #6c757d',
                            borderRadius: 4,
                            cursor: 'pointer'
                        }}
                    >
                        {showBrowseMode ? "Näita ainult minu trenne" : "Sirvi kõiki trenne"}
                    </button>
                </div>
            )}

            {/* Sessions Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 16,
                marginBottom: 24
            }}>
                {visibleSessions.map(session => {
                    // Count pending applications for this session
                    const sessionApps = Object.values(applications[session.id] || {});
                    const pendingCount = sessionApps.filter(a => a.status === 'pending').length;

                    const hasAccess = isAssigned(session);

                    return (
                        <div
                            key={session.id}
                            onClick={() => hasAccess && setSelectedSession(session)}
                            style={{
                                border: '1px solid #ddd',
                                borderRadius: 8,
                                padding: 16,
                                background: hasAccess ? 'white' : '#f9f9f9',
                                cursor: hasAccess ? 'pointer' : 'default',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                transition: 'transform 0.2s',
                                ':hover': { transform: hasAccess ? 'translateY(-2px)' : 'none' },
                                position: 'relative',
                                opacity: hasAccess ? 1 : 0.8
                            }}
                        >
                            {!hasAccess && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    background: 'rgba(255,255,255,0.6)',
                                    zIndex: 5,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <button
                                        onClick={(e) => handleRequestAccess(e, session)}
                                        style={{
                                            padding: '8px 16px',
                                            background: '#007bff',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: 4,
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                        }}
                                    >
                                        Küsi ligipääsu
                                    </button>
                                </div>
                            )}

                            {/* Pending Apps Badge */}
                            {hasAccess && pendingCount > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: -8,
                                    right: -8,
                                    background: '#dc3545',
                                    color: 'white',
                                    fontSize: 12,
                                    fontWeight: 'bold',
                                    padding: '4px 8px',
                                    borderRadius: 12,
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                    zIndex: 10
                                }}>
                                    {pendingCount} taotlust
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <strong style={{ fontSize: 16 }}>
                                    {formatSessionTime(session.startTime, session.endTime)}
                                </strong>
                                <span style={{
                                    fontSize: 12,
                                    padding: '2px 8px',
                                    borderRadius: 12,
                                    background: getCapacityColor(session.capacity.status) + '20',
                                    color: getCapacityColor(session.capacity.status),
                                    fontWeight: 'bold'
                                }}>
                                    {getCapacityLabel(session.capacity.status)}
                                </span>
                            </div>

                            {/* Actual Attendance Stats (if available) */}
                            {
                                (() => {
                                    if (!hasAccess) return null;
                                    const reportKey = `${sport}_${session.startTime.replace(':', '-')}`;
                                    const report = reports[reportKey];
                                    if (!report || !report.players) return null;

                                    const attended = Object.values(report.players).filter(s => s === 'attended').length;
                                    const noshow = Object.values(report.players).filter(s => s === 'noshow').length;

                                    if (attended === 0 && noshow === 0) return null;

                                    return (
                                        <div style={{ fontSize: 13, marginBottom: 8, background: '#f8f9fa', padding: 4, borderRadius: 4, display: 'flex', gap: 12 }}>
                                            <span title="Kohal" style={{ color: '#28a745' }}>✅ {attended}</span>
                                            <span title="Puudus" style={{ color: '#dc3545' }}>❌ {noshow}</span>
                                        </div>
                                    );
                                })()}

                            {/* Feedback Indicator */}
                            {(() => {
                                if (!hasAccess) return null;
                                // Check if this session has any feedback
                                // coachFeedbackData[date][sessionId]
                                const sessionFeedback = coachFeedbackData?.[date]?.[session.id];
                                const feedbackCount = sessionFeedback ? Object.keys(sessionFeedback).length : 0;

                                if (feedbackCount === 0) return null;

                                return (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 12,
                                        right: 12,
                                        background: '#e6f7ff',
                                        color: '#0050b3',
                                        padding: '2px 8px',
                                        borderRadius: 12,
                                        fontSize: 12,
                                        fontWeight: 'bold',
                                        border: '1px solid #91d5ff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4
                                    }}>
                                        <span>📢</span> {feedbackCount}
                                    </div>
                                );
                            })()}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <div style={{ fontSize: 13, color: '#666' }}>
                                    <div>Nimekirjas: {session.players.length}</div>
                                    <div>Kinnitanud: <strong style={{ color: '#28a745' }}>{session.confirmedCount}</strong></div>
                                </div>
                                <div style={{
                                    fontSize: 20,
                                    fontWeight: 'bold',
                                    color: getCapacityColor(session.capacity.status)
                                }}>
                                    {formatCapacity(session.confirmedCount, session.maxCapacity)}
                                </div>
                            </div>

                            {/* Short player list preview (limited to 3) */}
                            {hasAccess && (
                                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eee', fontSize: 12 }}>
                                    {session.players.slice(0, 3).map(p => (
                                        <div key={p.name} style={{ marginBottom: 2 }}>{p.name}</div>
                                    ))}
                                    {session.players.length > 3 && (
                                        <div style={{ color: '#666', fontStyle: 'italic' }}>
                                            + {session.players.length - 3} veel...
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {
                selectedSession && (
                    <SessionDetailModal
                        session={sessionsWithData.find(s => s.id === selectedSession.id) || selectedSession}
                        date={date}
                        sport={sport}
                        dayName={dayName}
                        allSessions={dailySessions}
                        attendance={attendance}
                        onClose={() => setSelectedSession(null)}
                        onAttendanceChange={onAttendanceChange}
                        allPlayers={allPlayers}
                        // REMOVED: playerWeeklySchedules
                        scheduleOverrides={scheduleOverrides}
                        isAdmin={isAdmin}
                        feedbackData={feedbackData}
                        coachFeedbackData={coachFeedbackData}
                        // Pass data functions for updates
                        onMovePlayer={async (playerName, targetSessionId, isPermanent) => {
                            const targetSession = dailySessions.find(s => s.id === targetSessionId);
                            if (!targetSession) return;

                            // Check capacity
                            const currentPlayers = getPlayersForSession(
                                null, // Was playerWeeklySchedules
                                scheduleOverrides?.[date] || {},
                                targetSession.id
                            );

                            if (wouldExceedCapacity(currentPlayers.length, targetSession.maxCapacity)) {
                                if (!window.confirm("Grupp on täis! Kas soovid siiski mängija sinna liigutada?")) {
                                    return;
                                }
                                await logCapacityOverride(playerName, date, sport, targetSession.startTime, 'coach');
                            }

                            // Apply move
                            if (isPermanent) {
                                // Not implementing permanent move from coach view yet as per plan phase 3
                                // Keeping it one-off for now for safety
                                alert("Püsivaks muutmiseks palun pöördu admini poole või kasuta admin vaadet.");
                                return;
                            } else {
                                // MOVE PLAYER: 
                                // 1. Remove from old session (specific time)
                                // 2. Add to new session (append)

                                // Import these if not available, or assume they are passed/available in scope? 
                                // SessionOverview imports them from ../../data usually. 
                                // Checking imports... imports are likely missing for specific new functions.
                                // We'll need to check imports at top of file too.

                                // For now, let's assume we need to update the imports first. 
                                // But I can't do that in this block.
                                // I will use the imported names assuming I fix imports next.

                                await removeScheduleOverride(date, playerName, selectedSession.id);
                                await addScheduleOverride(date, playerName, targetSession.id);

                                await logPlayerMove(
                                    playerName,
                                    date,
                                    sport,
                                    selectedSession.startTime,
                                    targetSession.startTime,
                                    'coach'
                                );
                            }
                        }}
                        onRemoveFromSession={(playerName) => {
                            // Open confirmation modal instead of window.confirm
                            setConfirmRemove({ playerName, sessionId: selectedSession.id });
                        }}
                    />
                )
            }

            {/* Confirmation Modal */}
            {confirmRemove && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    zIndex: 1400, // Higher than detail modal
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: 24,
                        borderRadius: 8,
                        maxWidth: 400,
                        width: '90%',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}>
                        <h3 style={{ marginTop: 0 }}>Kinnita eemaldamine</h3>
                        <p>Kas oled kindel, et soovid eemaldada mängija <strong>{confirmRemove.playerName}</strong>?</p>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                            <button
                                onClick={() => setConfirmRemove(null)}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#f0f0f0',
                                    border: 'none',
                                    borderRadius: 4,
                                    cursor: 'pointer'
                                }}
                            >
                                Loobu
                            </button>
                            <button
                                onClick={handleConfirmRemove}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                Eemalda
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default SessionOverview;
