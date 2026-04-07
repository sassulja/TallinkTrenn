// src/components/coach/SessionDetailModal.js
import React, { useState, useEffect, useMemo } from 'react';
import AddPlayerToSessionModal from './AddPlayerToSessionModal';
import { subscribeToSessionApplications, updateApplicationStatus } from '../../data/sessionApplications';
// setScheduleOverride removed
import { addScheduleOverride } from '../../data/playerSchedules';
import { updatePlayerAttendance } from '../../data/attendance';
import { markActualAttendance, subscribeToSessionReport } from '../../data/sessionReports';
import { COACH_FEEDBACK_EMOJI, saveCoachFeedback, saveCoachFeedbackForPlayer, getFeedbackTrend, getCoachFeedback } from '../../data/feedback';

const SessionDetailModal = ({
    session,
    date,
    sport,
    dayName,
    allSessions,
    attendance,
    onClose,
    onMovePlayer,
    onRemoveFromSession,
    // New props for adding players
    allPlayers, // passed from parent
    playerWeeklySchedules,
    scheduleOverrides,
    isAdmin,
    // Feedback props
    feedbackData = {},
    coachFeedbackData = {}
}) => {
    const [selectedPlayers, setSelectedPlayers] = useState([]);
    const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
    const [applications, setApplications] = useState({});

    // Tab State
    const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'feedback'

    // Walk-in UI state
    const [walkInSearchMode, setWalkInSearchMode] = useState(false);
    const [walkInQuery, setWalkInQuery] = useState('');

    // --- Feedback Helpers ---
    // Local state for optimistic updates
    const [localRatings, setLocalRatings] = useState({});

    // Sync local state with props when modal opens or props change
    useEffect(() => {
        // Flatten coachFeedbackData for easier access? Or just keep it as is.
        // Let's just create a flattened map of { playerName: rating } for the current view
        if (coachFeedbackData && coachFeedbackData[date]) {
            // We need to merge all groups or just pick the relevant ones?
            // Since we construct groupKey dynamically per player, we might need to lazy load or just rely on the prop for initial render.
            // But for optimistic updates, we need a local map.
            // Let's store { [playerName]: rating }
            const newRatings = {};
            // We iterate over the potential keys? Or just wait for render?
            // Simpler: Just rely on props for reading, but allow local override?
            // Or fully controlled:
            // On mount/prop update, parse *all* relevant players.
            // But we don't know the players' groups easily without iterating.
        }
    }, [coachFeedbackData, date]);

    // Better approach: Just use a local cache that we update on change,
    // and when rendering, prioritize local cache over props.

    // --- Feedback Helpers ---
    // --- Feedback Helpers ---
    const handleCoachFeedback = async (playerName, rating) => {
        // STRICT SESSION-BASED SAVE
        const sessionId = session.id;
        console.log(`[Feedback Write Integrity] Saving for: ${playerName}, SessionID: ${sessionId}, Rating: ${rating}`);

        // Optimistic Update
        setLocalRatings(prev => ({ ...prev, [playerName]: rating }));

        try {
            // Write to: coachFeedback/date/sessionId/player
            // Atomic update using new helper
            await saveCoachFeedbackForPlayer(date, sessionId, playerName, rating);
        } catch (e) {
            console.error(e);
            alert("Salvestamine ebaõnnestus");
            // Revert optimistic update
            setLocalRatings(prev => {
                const next = { ...prev };
                delete next[playerName];
                return next;
            });
        }
    };

    // Subscribe to applications for this session
    useEffect(() => {
        const unsub = subscribeToSessionApplications(date, sport, session.id, (apps) => {
            setApplications(apps || {});
        });
        return () => unsub();
    }, [date, sport, session.id]);

    // Attendance Report State
    const [report, setReport] = useState({ players: {}, metadata: {} });

    // Subscribe to attendance report
    useEffect(() => {
        const unsub = subscribeToSessionReport(date, sport, session.startTime, (data) => {
            setReport(data);
        });
        return () => unsub();
    }, [date, sport, session.startTime]);

    // Check if session has started (allow marking if now >= startTime)
    const canMarkAttendance = new Date(`${date}T${session.startTime}`) <= new Date();

    const handleAttendanceToggle = async (playerName, currentStatus) => {
        // Cycle: null -> 'attended' -> 'noshow' -> null
        let nextStatus = 'attended';
        if (currentStatus === 'attended') nextStatus = 'noshow';
        else if (currentStatus === 'noshow') nextStatus = null;

        await markActualAttendance(date, sport, session.startTime, playerName, nextStatus, 'coach');
    };

    const handleWalkIn = async (playerName) => {
        // Walk-in immediately marked as attended
        await markActualAttendance(date, sport, session.startTime, playerName, 'attended', 'coach');
        setShowAddPlayerModal(false); // Close modal if open
    };

    const togglePlayerSelection = (playerName) => {
        if (selectedPlayers.includes(playerName)) {
            setSelectedPlayers(selectedPlayers.filter(p => p !== playerName));
        } else {
            setSelectedPlayers([...selectedPlayers, playerName]);
        }
    };

    const handleMoveSelected = (targetSessionId) => {
        selectedPlayers.forEach(playerName => {
            onMovePlayer(playerName, targetSessionId, false); // false = one-off move
        });
        setSelectedPlayers([]);
        onClose();
    };

    const handleApproveApp = async (app) => {
        // 1. Create override (STRICT SESSION-BASED)
        await addScheduleOverride(date, app.playerId, session.id);
        // 2. Set attendance to "Jah" (Confirmed)
        await updatePlayerAttendance(date, app.playerName, 'Jah', session.id);
        // 3. Update status
        await updateApplicationStatus(date, sport, session.id, app.playerId, 'approved');
    };

    const handleRejectApp = async (app) => {
        await updateApplicationStatus(date, sport, session.id, app.playerId, 'rejected');
    };


    // Group players by confirmation status
    const confirmedPlayers = session.players.filter(p => attendance[date]?.[p.name] === 'Jah');
    const declinedPlayers = session.players.filter(p => attendance[date]?.[p.name] === 'Ei');
    const pendingPlayers = session.players.filter(p =>
        attendance[date]?.[p.name] !== 'Jah' && attendance[date]?.[p.name] !== 'Ei'
    );

    const attendedPlayers = [
        ...confirmedPlayers.map(p => p.name),
        ...Object.keys(report.players || {}).filter(name =>
            report.players[name] !== null &&
            !confirmedPlayers.some(cp => cp.name === name)
        )
    ];

    // Calculate Trend for Session
    const sessionAverageEffort = useMemo(() => {
        let total = 0;
        let count = 0;
        attendedPlayers.forEach(name => {
            const fb = feedbackData[name]?.[date];
            if (fb && (fb.intensity || fb.effort)) {
                total += parseInt(fb.intensity || fb.effort, 10);
                count++;
            }
        });
        return count > 0 ? (total / count).toFixed(1) : null;
    }, [attendedPlayers, feedbackData, date]);

    // Helper for attendance change (new in the provided code)
    const onAttendanceChange = async (date, playerName, status) => {
        await updatePlayerAttendance(date, playerName, status, session.id);
    };

    // Helper for formatting time (new in the provided code)
    const formatSessionTime = (startTime, endTime) => {
        return `${startTime.substring(0, 5)} - ${endTime.substring(0, 5)}`;
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
        }}>
            <div style={{
                background: 'white',
                borderRadius: 8,
                width: '100%', // Max width logic below
                maxWidth: 600,
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{ padding: 16, borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: 18 }}>{dayName}, {formatSessionTime(session.startTime, session.endTime)}</h3>
                        <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                            {/* Simple Attendance Summary */}
                            {(() => {
                                const attended = session.players.filter(p => attendance[date]?.[p.name] === 'Jah').length;
                                return `Kohal: ${attended} / ${session.players.length}`;
                            })()}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', color: '#666' }}>
                        &times;
                    </button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
                    <button
                        onClick={() => setActiveTab('attendance')}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: activeTab === 'attendance' ? 'white' : '#f9f9f9',
                            border: 'none',
                            borderBottom: activeTab === 'attendance' ? '2px solid #007bff' : 'none',
                            fontWeight: activeTab === 'attendance' ? 'bold' : 'normal',
                            cursor: 'pointer'
                        }}
                    >
                        Kohalolek
                    </button>
                    <button
                        onClick={() => setActiveTab('feedback')}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: activeTab === 'feedback' ? 'white' : '#f9f9f9',
                            border: 'none',
                            borderBottom: activeTab === 'feedback' ? '2px solid #007bff' : 'none',
                            fontWeight: activeTab === 'feedback' ? 'bold' : 'normal',
                            cursor: 'pointer'
                        }}
                    >
                        Tagasiside
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

                    {activeTab === 'attendance' && (
                        <>
                            {/* Walk-in Add Player */}
                            <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #eee' }}>
                                {!walkInSearchMode ? (
                                    <button
                                        onClick={() => setWalkInSearchMode(true)}
                                        style={{
                                            width: '100%',
                                            padding: 12,
                                            border: '1px dashed #ccc',
                                            borderRadius: 4,
                                            background: '#f9f9f9',
                                            color: '#666',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        + Lisa mängija siia trenni
                                    </button>
                                ) : (
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            autoFocus
                                            placeholder="Otsi nime..."
                                            value={walkInQuery}
                                            onChange={(e) => setWalkInQuery(e.target.value)}
                                            style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                                        />
                                        <button
                                            onClick={() => { setWalkInSearchMode(false); setWalkInQuery(''); }}
                                            style={{ padding: '8px 12px', border: '1px solid #ddd', background: 'white', borderRadius: 4 }}
                                        >
                                            Loobu
                                        </button>
                                    </div>
                                )}

                                {walkInSearchMode && walkInQuery && (
                                    <div style={{ marginTop: 8, maxHeight: 150, overflowY: 'auto', border: '1px solid #eee', borderRadius: 4 }}>
                                        {Object.values(allPlayers)
                                            .filter(p =>
                                                p.name.toLowerCase().includes(walkInQuery.toLowerCase()) &&
                                                !session.players.some(sp => sp.name === p.name)
                                            )
                                            .slice(0, 5)
                                            .map(p => (
                                                <div
                                                    key={p.name}
                                                    onClick={() => {
                                                        onMovePlayer(p.name, session.id, false);
                                                        setWalkInSearchMode(false);
                                                        setWalkInQuery('');
                                                    }}
                                                    style={{ padding: 8, borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}
                                                >
                                                    {p.name}
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>

                            {/* Pending Applications */}
                            {Object.keys(applications).length > 0 && (
                                <div style={{ marginBottom: 24, background: '#fff3cd', padding: 12, borderRadius: 8 }}>
                                    <h4 style={{ color: '#856404', borderBottom: '1px solid #ffeeba', paddingBottom: 8, marginBottom: 12, marginTop: 0 }}>
                                        📬 Taotlused
                                    </h4>
                                    {Object.values(applications).filter(app => app.status === 'pending' && !session.players.some(p => p.name === app.playerName)).map(app => (
                                        <div key={app.playerId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #ffeeba' }}>
                                            <span style={{ fontWeight: 600 }}>{app.playerName}</span>
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button onClick={() => handleRejectApp(app)} style={{ padding: '4px 8px', border: '1px solid #dc3545', background: 'white', color: '#dc3545', borderRadius: 4, cursor: 'pointer' }}>Keeldu</button>
                                                <button onClick={() => handleApproveApp(app)} style={{ padding: '4px 8px', border: 'none', background: '#28a745', color: 'white', borderRadius: 4, cursor: 'pointer' }}>Kinnita</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Confirmed Players */}
                            {confirmedPlayers.length > 0 && (
                                <div style={{ marginBottom: 24 }}>
                                    <h4 style={{ color: '#28a745', borderBottom: '1px solid #eee', paddingBottom: 8, marginBottom: 12 }}>
                                        ✅ Kinnitatud ({confirmedPlayers.length})
                                    </h4>
                                    {confirmedPlayers.map(p => (
                                        <PlayerRow
                                            key={p.name}
                                            player={p}
                                            isSelected={selectedPlayers.includes(p.name)}
                                            onToggle={() => togglePlayerSelection(p.name)}
                                            onRemove={() => onRemoveFromSession(p.name)}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Pending / Unanswered Players */}
                            <div style={{ marginBottom: 24 }}>
                                <h4 style={{ color: '#6c757d', borderBottom: '1px solid #eee', paddingBottom: 8, marginBottom: 12 }}>
                                    ⏳ Ootel / Ei ole vastanud ({pendingPlayers.length})
                                </h4>
                                {pendingPlayers.length === 0 ? (
                                    <div style={{ fontStyle: 'italic', color: '#999' }}>Puuduvad</div>
                                ) : (
                                    pendingPlayers.map(p => (
                                        <PlayerRow
                                            key={p.name}
                                            player={p}
                                            isSelected={selectedPlayers.includes(p.name)}
                                            onToggle={() => togglePlayerSelection(p.name)}
                                            onRemove={() => onRemoveFromSession(p.name)}
                                        />
                                    ))
                                )}
                            </div>

                            {/* Declined Players */}
                            {declinedPlayers.length > 0 && (
                                <div style={{ marginBottom: 24 }}>
                                    <h4 style={{ color: '#dc3545', borderBottom: '1px solid #eee', paddingBottom: 8, marginBottom: 12 }}>
                                        ❌ Ei osale ({declinedPlayers.length})
                                    </h4>
                                    {declinedPlayers.map(p => (
                                        <PlayerRow
                                            key={p.name}
                                            player={p}
                                            isSelected={selectedPlayers.includes(p.name)}
                                            onToggle={() => togglePlayerSelection(p.name)}
                                            onRemove={() => onRemoveFromSession(p.name)}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Actions Footer */}
                            <div style={{ borderTop: '1px solid #eee', paddingTop: 16, marginTop: 16 }}>
                                <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 13 }}>
                                    Tegevused valitud mängijatega ({selectedPlayers.length}):
                                </div>
                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                    {allSessions.filter(s => s.id !== session.id).map(targetSession => (
                                        <button
                                            key={targetSession.id}
                                            disabled={selectedPlayers.length === 0}
                                            onClick={() => handleMoveSelected(targetSession.id)}
                                            style={{
                                                padding: '8px 12px',
                                                background: selectedPlayers.length === 0 ? '#eee' : '#e7f5ff',
                                                color: selectedPlayers.length === 0 ? '#999' : '#007bff',
                                                border: '1px solid #ccc',
                                                borderRadius: 4,
                                                cursor: selectedPlayers.length === 0 ? 'default' : 'pointer'
                                            }}
                                        >
                                            → Liiguta {targetSession.startTime}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'feedback' && (
                        <div style={{ minHeight: 300 }}>
                            {/* Session Aggregate */}
                            <div style={{ marginBottom: 20, padding: 16, background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 16 }}>
                                <span style={{ fontSize: 32 }}>📈</span>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>Mängijate keskmine pingutus</div>
                                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#389e0d' }}>
                                        {sessionAverageEffort ? `${sessionAverageEffort} / 5` : '-'}
                                    </div>
                                    <div style={{ fontSize: 13, color: '#666' }}>
                                        (Põhineb {attendedPlayers.filter(n => feedbackData[n]?.[date]?.intensity || feedbackData[n]?.[date]?.effort).length} vastusel)
                                    </div>
                                </div>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                                        <th style={{ padding: 8 }}>Mängija</th>
                                        <th style={{ padding: 8 }}>Sinu hinnang</th>
                                        <th style={{ padding: 8 }}>Tema trend</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendedPlayers.map(playerName => {
                                        // Trend Logic
                                        const playerHistory = feedbackData[playerName] || {};
                                        const trend = getFeedbackTrend(playerHistory);

                                        // Session-based feedback lookup (NO GROUP KEY)
                                        const propRating = getCoachFeedback(coachFeedbackData, date, session.id, playerName);
                                        const existingRating = localRatings[playerName] !== undefined ? localRatings[playerName] : propRating;

                                        return (
                                            <tr key={playerName} style={{ borderBottom: '1px solid #eee' }}>
                                                <td style={{ padding: 8, fontWeight: 500 }}>{playerName}</td>
                                                <td style={{ padding: 8 }}>
                                                    <select
                                                        value={existingRating || ""}
                                                        onChange={(e) => handleCoachFeedback(playerName, parseInt(e.target.value))}
                                                        style={{ padding: 4, borderRadius: 4, border: '1px solid #ccc', maxWidth: 120 }}
                                                    >
                                                        <option value="">- Vali -</option>
                                                        {COACH_FEEDBACK_EMOJI.map(emoji => (
                                                            <option key={emoji.val} value={emoji.val}>
                                                                {emoji.icon} {emoji.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td style={{ padding: 8 }}>
                                                    {trend ? (
                                                        <div title={`Keskmine: ${trend.avg}`}>
                                                            {trend.trend === 'up' && <span style={{ color: 'green' }}>↗️</span>}
                                                            {trend.trend === 'down' && <span style={{ color: 'red' }}>↘️</span>}
                                                            {trend.trend === 'flat' && <span style={{ color: 'gray' }}>➡️</span>}
                                                        </div>
                                                    ) : <span style={{ color: '#ccc' }}>-</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {attendedPlayers.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>Selles trennis pole veel osalejaid.</div>}
                        </div>
                    )}
                </div>
            </div>

            {showAddPlayerModal && (
                <AddPlayerToSessionModal
                    session={session}
                    date={date}
                    sport={sport}
                    dayName={dayName}
                    allPlayers={allPlayers}
                    playerWeeklySchedules={playerWeeklySchedules}
                    scheduleOverrides={scheduleOverrides}
                    isAdmin={isAdmin}
                    existingSessionPlayers={session.players}
                    onClose={() => setShowAddPlayerModal(false)}
                />
            )}
        </div>
    );
};

const PlayerRow = ({ player, isSelected, onToggle, onRemove }) => {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f8f9fa' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={onToggle}
                    style={{ cursor: 'pointer', width: 16, height: 16 }}
                />
                <div>
                    <span style={{ fontWeight: 500 }}>{player.name}</span>
                    {player.isOverride && (
                        <span style={{ fontSize: 11, background: '#fff3cd', padding: '2px 6px', borderRadius: 10, marginLeft: 8 }}>
                            Ühekordne
                        </span>
                    )}
                </div>
            </div>
            <button onClick={onRemove} style={{ border: 'none', background: 'none', color: '#dc3545', cursor: 'pointer', fontSize: 18, padding: '0 8px' }} title="Eemalda sellest trennist">
                ×
            </button>
        </div>
    );
};

export default SessionDetailModal;
