import React, { useState, useEffect } from 'react';
import { getSessionsForDay, formatSessionTime } from '../../data/sessionOptions';
import { createApplication, subscribeToApplicationsForDate, deleteApplication } from '../../data/sessionApplications';
import { getCapacityStatus } from '../../data/capacityManager';
import { getPlayersForSession, removeScheduleOverride } from '../../data/playerSchedules';
import { updatePlayerAttendance } from '../../data/attendance';
import { estonianDate } from '../../utils';

// Simple estonian date helper if not available
const getEstonianDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('et-EE', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric' });
};

export default function ApplySessionModal({
    isOpen,
    onClose,
    sessionOptions,
    player,
    playerWeeklySchedules,
    scheduleOverrides,
    attendance = {} // Default to empty object
}) {
    const [sport, setSport] = useState('tennis');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [availableSessions, setAvailableSessions] = useState([]);
    const [dateApplications, setDateApplications] = useState({});

    // Custom Confirmation State
    const [confirmation, setConfirmation] = useState(null); // { message, action, session }

    // Subscribe to applications for selected date/sport
    useEffect(() => {
        if (!isOpen) return;
        const unsub = subscribeToApplicationsForDate(date, sport, (apps) => {
            setDateApplications(apps || {});
        });
        return () => unsub();
    }, [date, sport, isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
        const sessions = getSessionsForDay(sessionOptions?.[sport], dayName);

        // Enhance sessions with capacity data
        const enhancedHandler = sessions.map(session => {
            // 1. Get honest player list (Template + Overrides)
            const currentPlayers = getPlayersForSession(
                playerWeeklySchedules,
                scheduleOverrides?.[date],
                session.id
            );

            // 2. Count confirmed for capacity calculation
            const confirmedCount = currentPlayers.filter(p => attendance[date]?.[p.name] === 'Jah').length;
            const cap = getCapacityStatus(confirmedCount, session.maxCapacity);

            // 3. Check if *I* am in the list
            const isJoined = currentPlayers.some(p => p.name === player);

            // 4. Check specific attendance status for this date
            const myAttendance = attendance[date]?.[player];
            const isDeclined = myAttendance === 'Ei';
            const isConfirmed = myAttendance === 'Jah'; // Explicit confirmation

            // DEBUG LOGGING
            if (isJoined) {
                console.log(`SESSION ${session.id} JOINED DEBUG:`, {
                    playerName: player,
                    isJoined,
                    players: currentPlayers,
                    override: scheduleOverrides?.[date]?.[player],
                    template: playerWeeklySchedules?.[player]?.[sport]?.[dayName],
                    attendance: myAttendance
                });
            }

            return {
                ...session,
                ...cap,
                isJoined,
                isDeclined,
                isConfirmed
            };
        });

        setAvailableSessions(enhancedHandler);
    }, [date, sport, sessionOptions, isOpen, playerWeeklySchedules, scheduleOverrides, attendance]);

    const handleAction = async (session, status) => {
        if (!status) {
            // Apply immediately
            await createApplication(date, sport, session.id, player, player);
            return;
        }

        if (status === 'pending') {
            setConfirmation({
                message: "Kas soovid taotluse tühistada?",
                action: async () => {
                    await deleteApplication(date, sport, session.id, player);
                    setConfirmation(null);
                }
            });
            return;
        }

        if (status === 'approved') {
            const sessionStart = new Date(`${date}T${session.startTime}`);
            const cutoff = new Date(sessionStart.getTime() - 60 * 60 * 1000);

            if (Date.now() > cutoff.getTime()) {
                alert("Tühistamine pole enam võimalik (vähem kui 1h trenni alguseni).");
                return;
            }

            setConfirmation({
                message: "Oled kirjas. Kas soovid tühistada?",
                action: async () => {
                    try {
                        console.log("Cancelling session...", { date, player, sport, sessionId: session.id });
                        await deleteApplication(date, sport, session.id, player);

                        // Explicitly unset attendance
                        await updatePlayerAttendance(date, player, null);

                        // STRICT SESSION-BASED: Just remove the override
                        // We assume weekly templates are either migrated or ignored in this new mode
                        await removeScheduleOverride(date, player, session.id);

                        console.log("Schedule override removed.");

                        setConfirmation(null);
                    } catch (err) {
                        console.error("Error cancelling session:", err);
                        alert("Tühistamine ebaõnnestus. Palun proovi uuesti.");
                    }
                }
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
            <div style={{
                backgroundColor: 'white', padding: 24, borderRadius: 12, width: '90%', maxWidth: 500,
                maxHeight: '90vh', overflowY: 'auto', position: 'relative'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ margin: 0, fontSize: 20 }}>Lisa treening</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer' }}>×</button>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                    <select
                        value={sport}
                        onChange={(e) => setSport(e.target.value)}
                        style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #ddd' }}
                    >
                        <option value="tennis">Tennis</option>
                        <option value="fuss">ÜKE (Füss)</option>
                    </select>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        style={{ flex: 1, padding: 8, borderRadius: 8, border: '1px solid #ddd' }}
                    />
                </div>

                {/* Session List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {availableSessions.length === 0 ? (
                        <div style={{ color: '#666', textAlign: 'center', padding: 20 }}>
                            Selleks päevaks treeninguid ei leitud.
                        </div>
                    ) : (
                        availableSessions
                            .filter(session => !session.isJoined) // APPLY ONLY: Hide joined sessions
                            .map(session => {
                                const myApp = Object.values(dateApplications[session.id] || {}).find(a => a.playerId === player);
                                let status = myApp?.status || null; // pending, approved, rejected, or null
                                const isFull = session.isFull;

                                let label = "Taotle";
                                let disabled = false;
                                let color = "#007bff";
                                let subText = "";

                                if (status === 'pending') {
                                    label = "Ootel (Tühista)";
                                    color = "#ffc107"; // Warning
                                } else if (status === 'rejected') {
                                    label = "Tagasi lükatud";
                                    color = "#dc3545";
                                    disabled = true;
                                } else if (isFull) {
                                    label = "Täis";
                                    color = "#6c757d";
                                    disabled = true;
                                }

                                return (
                                    <div key={session.id} style={{
                                        border: '1px solid #eee', borderRadius: 8, padding: 12,
                                        background: '#fff'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <span style={{ fontWeight: 600 }}>
                                                {formatSessionTime(session.startTime, session.endTime)}
                                            </span>
                                            <span style={{ fontSize: 13, color: isFull ? '#dc3545' : '#28a745', fontWeight: 600 }}>
                                                {isFull ? 'TÄIS' : 'VABA'} ({session.confirmedCount}/{session.maxCapacity})
                                            </span>
                                        </div>
                                        <div style={{ color: '#666', fontSize: 13, marginBottom: 12 }}>
                                            {getEstonianDate(date)}
                                        </div>

                                        <button
                                            onClick={() => handleAction(session, status === 'pending' ? 'pending' : null)}
                                            disabled={disabled}
                                            style={{
                                                width: '100%', padding: '10px', borderRadius: 6, border: 'none',
                                                fontWeight: 600,
                                                background: color,
                                                color: (status === 'pending') ? '#000' : 'white',
                                                cursor: disabled ? 'default' : 'pointer',
                                                opacity: disabled ? 0.7 : 1
                                            }}
                                        >
                                            {label}
                                        </button>
                                        {subText && (
                                            <div style={{ fontSize: 11, color: '#dc3545', marginTop: 4, textAlign: 'center' }}>
                                                {subText}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                    )}
                </div>

                {/* Custom Confirmation Dialog Overlay */}
                {confirmation && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        zIndex: 1200, borderRadius: 12
                    }}>
                        <div style={{ textAlign: 'center', padding: 20 }}>
                            <h3 style={{ marginBottom: 20 }}>{confirmation.message}</h3>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                <button
                                    onClick={() => setConfirmation(null)}
                                    style={{
                                        padding: '10px 20px', borderRadius: 8, border: '1px solid #ccc',
                                        background: 'white', cursor: 'pointer', fontWeight: 600
                                    }}
                                >
                                    Ei, katkesta
                                </button>
                                <button
                                    onClick={confirmation.action}
                                    style={{
                                        padding: '10px 20px', borderRadius: 8, border: 'none',
                                        background: '#dc3545', color: 'white', cursor: 'pointer', fontWeight: 600
                                    }}
                                >
                                    Jah, tühista
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
}
