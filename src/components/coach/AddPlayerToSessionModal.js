// src/components/coach/AddPlayerToSessionModal.js
import React, { useState, useMemo } from 'react';
import {
    addScheduleOverride,
    logScheduleOverride,
    logCapacityOverride,
    AUDIT_ACTIONS,
    getCapacityStatus,
    CAPACITY_STATUS,
    updatePlayerAttendance // Added import
} from '../../data';

const AddPlayerToSessionModal = ({
    session,
    date,
    sport,
    dayName,
    allPlayers, // List of { name, password, ... }
    playerWeeklySchedules,
    scheduleOverrides,
    onClose,
    isAdmin,
    existingSessionPlayers // [{name, isOverride}]
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPlayers, setSelectedPlayers] = useState([]);
    const [adminOverrideCapacity, setAdminOverrideCapacity] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Filter available players
    const availablePlayers = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return allPlayers
            .filter(p => !p.archivedDate) // Exclude archived
            .filter(p => {
                // exclude already in THIS session
                return !existingSessionPlayers.find(ep => ep.name === p.name);
            })
            .filter(p => p.name.toLowerCase().includes(term))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [allPlayers, searchTerm, existingSessionPlayers]);

    // Check for conflicts for a single player
    const checkConflict = (playerName) => {
        // Simplified conflict check: Check if player has ANY other sessions today
        if (scheduleOverrides[date] && scheduleOverrides[date][playerName]) {
            const sessions = Object.keys(scheduleOverrides[date][playerName]);
            // Filter out current session if present (shouldn't be)
            const otherSessions = sessions.filter(id => id !== session.id);
            if (otherSessions.length > 0) {
                return { type: 'OTHER_SESSION', count: otherSessions.length };
            }
        }
        return null;
    };

    const togglePlayer = (playerName) => {
        if (selectedPlayers.includes(playerName)) {
            setSelectedPlayers(selectedPlayers.filter(p => p !== playerName));
        } else {
            setSelectedPlayers([...selectedPlayers, playerName]);
        }
    };

    const handleSave = async () => {
        // Validate capacity
        const totalAfter = existingSessionPlayers.length + selectedPlayers.length;
        if (totalAfter > session.maxCapacity && !isAdmin) {
            alert(`Grupi maht on täis! (Max ${session.maxCapacity}). Ainult admin saab seda ületada.`);
            return;
        }

        if (totalAfter > session.maxCapacity && isAdmin && !adminOverrideCapacity) {
            alert("Maht ületatud! Palun kinnita ülesõit linnukesega.");
            return;
        }

        setIsSaving(true);
        try {
            for (const playerName of selectedPlayers) {
                // 1. Add override to place them in this session
                // STRICT SESSION-BASED: addScheduleOverride(date, playerName, sessionId)
                await addScheduleOverride(date, playerName, session.id);

                // 2. Log it
                if (existingSessionPlayers.length + 1 > session.maxCapacity) { // Approximate check
                    await logCapacityOverride(playerName, date, sport, session.startTime, isAdmin ? 'admin' : 'coach');
                } else {
                    await logScheduleOverride(playerName, date, sport, 'N/A', session.startTime, isAdmin ? 'admin' : 'coach');
                }

                // 3. Auto-mark attendance if session has started
                const sessionStart = new Date(`${date}T${session.startTime}`);
                if (new Date() >= sessionStart) {
                    await updatePlayerAttendance(date, playerName, 'Jah', session.id);
                }
            }

            // Re-doing the block to include the import logic effectively implies I should update imports too.
            // But I can't update imports in this block.
            // I'll assume I need to do a separate add-import call or just use what's available?
            // `data/attendance` is likely not imported.
            // PROCEEDING to add import first.
            onClose();
        } catch (e) {
            console.error(e);
            alert("Viga salvestamisel: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    const capacityStatus = getCapacityStatus(existingSessionPlayers.length + selectedPlayers.length, session.maxCapacity);
    const capacityColor = capacityStatus === CAPACITY_STATUS.FULL ? '#dc3545' :
        capacityStatus === CAPACITY_STATUS.OVERFLOW ? '#dc3545' : '#28a745';

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '8px',
                width: '500px',
                maxWidth: '90%',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <h3 style={{ margin: 0 }}>Lisa mängijaid ({sport})</h3>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
                </div>

                <div style={{ marginBottom: 8, fontSize: 13, color: '#666' }}>
                    Sessioon: {session.startTime} - {session.endTime} <br />
                    Hetkel: {existingSessionPlayers.length} / {session.maxCapacity}
                    {selectedPlayers.length > 0 && <span> + {selectedPlayers.length} valitud = <strong style={{ color: capacityColor }}>{existingSessionPlayers.length + selectedPlayers.length}</strong></span>}
                </div>

                <input
                    type="text"
                    placeholder="Otsi nime järgi..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ padding: '8px', width: '100%', boxSizing: 'border-box', marginBottom: 12, borderRadius: 4, border: '1px solid #ddd' }}
                />

                <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #eee', borderRadius: 4, marginBottom: 16 }}>
                    {availablePlayers.length === 0 ? (
                        <div style={{ padding: 12, color: '#999', textAlign: 'center' }}>Mängijaid ei leitud</div>
                    ) : (
                        availablePlayers.map(p => {
                            const conflict = checkConflict(p.name);
                            const isSelected = selectedPlayers.includes(p.name);
                            return (
                                <div
                                    key={p.name}
                                    onClick={() => togglePlayer(p.name)}
                                    style={{
                                        padding: '8px 12px',
                                        borderBottom: '1px solid #f9f9f9',
                                        cursor: 'pointer',
                                        backgroundColor: isSelected ? '#e7f5ff' : 'white',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 500 }}>{p.name}</div>
                                        {conflict && (
                                            <div style={{ fontSize: 11, color: '#ff9800', display: 'flex', alignItems: 'center' }}>
                                                ⚠️ {`On juba kirjas ${conflict.count} muus trennis täna`}
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        readOnly
                                        style={{ pointerEvents: 'none' }}
                                    />
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer / Actions */}
                <div>
                    {(existingSessionPlayers.length + selectedPlayers.length > session.maxCapacity) && (
                        <div style={{
                            marginBottom: 12,
                            padding: 10,
                            background: '#fff3cd',
                            borderRadius: 4,
                            border: '1px solid #ffeeba',
                            fontSize: 13
                        }}>
                            <div style={{ color: '#856404', marginBottom: 4 }}>
                                <strong>Hoiatus:</strong> Mahutavus on ületatud!
                            </div>
                            {isAdmin ? (
                                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={adminOverrideCapacity}
                                        onChange={e => setAdminOverrideCapacity(e.target.checked)}
                                        style={{ marginRight: 8 }}
                                    />
                                    Luba ületada (Admin)
                                </label>
                            ) : (
                                <div style={{ color: '#dc3545' }}>Ainult administraator saab mahtu ületada.</div>
                            )}
                        </div>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={
                            isSaving ||
                            selectedPlayers.length === 0 ||
                            (!isAdmin && (existingSessionPlayers.length + selectedPlayers.length > session.maxCapacity)) ||
                            (isAdmin && (existingSessionPlayers.length + selectedPlayers.length > session.maxCapacity) && !adminOverrideCapacity)
                        }
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            fontSize: 14,
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            opacity: (selectedPlayers.length === 0) ? 0.6 : 1
                        }}
                    >
                        {isSaving ? 'Salvestan...' : `Lisa ${selectedPlayers.length} mängijat`}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default AddPlayerToSessionModal;
