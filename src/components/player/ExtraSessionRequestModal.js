import React, { useState, useMemo } from 'react';
import { getSessionCapacity, formatCapacity, getCapacityColor, CAPACITY_STATUS } from '../../data/capacityManager';
import { getSessionsForDay, formatSessionTime } from '../../data/sessionOptions';
import { getDayNameFromDate, isDateInPast } from '../../data/playerSchedules';
import { requestExtraSession } from '../../data/extraSessions';

const ExtraSessionRequestModal = ({
    isOpen,
    onClose,
    player,
    allDates,
    sessionOptions,
    playerWeeklySchedules,
    scheduleOverrides
}) => {
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedSport, setSelectedSport] = useState('tennis');
    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    // Filter valid future dates (next 14 days)
    const availableDates = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return allDates
            .filter(d => {
                const dateObj = new Date(d.date);
                dateObj.setHours(0, 0, 0, 0);
                const diffStats = (dateObj - today) / (1000 * 60 * 60 * 24);
                return diffStats >= 0 && diffStats <= 14;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [allDates]);

    // Get sessions for selected date
    const availableSessions = useMemo(() => {
        if (!selectedDate) return [];

        const dayName = getDayNameFromDate(selectedDate);
        const options = getSessionsForDay(sessionOptions, dayName);

        // Calculate capacity for each option
        return options
            .filter(opt => opt.sport === selectedSport) // Filter by sport
            .map(opt => {
                const dateOverridesForDate = scheduleOverrides[selectedDate] || {};
                const cap = getSessionCapacity(playerWeeklySchedules, dateOverridesForDate, opt, opt.sport, dayName);
                return {
                    ...opt,
                    currentCapacity: cap.count,
                    maxCapacity: cap.max,
                    status: cap.status
                };
            });
    }, [selectedDate, selectedSport, sessionOptions, playerWeeklySchedules, scheduleOverrides]);

    const handleRequest = async (session) => {
        setSubmitting(true);
        try {
            const timeStr = formatSessionTime(session.startTime, session.endTime);
            await requestExtraSession(selectedDate, timeStr, selectedSport, player);
            setSuccessMsg('Sooviavaldus saadetud!');
            setTimeout(() => {
                setSuccessMsg('');
                onClose();
            }, 1500);
        } catch (e) {
            alert('Viga saatmisel: ' + e.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
            <div style={{
                backgroundColor: 'white', padding: 24, borderRadius: 12,
                maxWidth: 500, width: '90%', maxHeight: '90vh', overflowY: 'auto'
            }}>
                <h2 style={{ marginTop: 0 }}>Lisa treeningu soov</h2>

                {successMsg ? (
                    <div style={{ color: 'green', textAlign: 'center', padding: 20, fontSize: 18 }}>
                        ✅ {successMsg}
                    </div>
                ) : (
                    <>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Vali spordiala:</label>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button
                                    onClick={() => setSelectedSport('tennis')}
                                    style={{
                                        flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ccc',
                                        background: selectedSport === 'tennis' ? '#e6f7ff' : '#f5f5f5',
                                        fontWeight: selectedSport === 'tennis' ? 'bold' : 'normal',
                                        borderColor: selectedSport === 'tennis' ? '#1890ff' : '#d9d9d9'
                                    }}
                                >
                                    Tennis
                                </button>
                                <button
                                    onClick={() => setSelectedSport('fuss')}
                                    style={{
                                        flex: 1, padding: 10, borderRadius: 6, border: '1px solid #ccc',
                                        background: selectedSport === 'fuss' ? '#fffbe6' : '#f5f5f5',
                                        fontWeight: selectedSport === 'fuss' ? 'bold' : 'normal',
                                        borderColor: selectedSport === 'fuss' ? '#faad14' : '#d9d9d9'
                                    }}
                                >
                                    Füss
                                </button>
                            </div>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Vali kuupäev:</label>
                            <select
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                                style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
                            >
                                <option value="">-- Vali kuupäev --</option>
                                {availableDates.map(d => (
                                    <option key={d.date} value={d.date}>
                                        {d.weekday}, {d.date.split('-').reverse().join('/')}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedDate && (
                            <div style={{ marginBottom: 20 }}>
                                <h4 style={{ marginBottom: 10 }}>Saadaolevad ajad:</h4>
                                {availableSessions.length === 0 ? (
                                    <div style={{ color: '#999', fontStyle: 'italic' }}>Selleks päevaks treeninguid ei leitud.</div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {availableSessions.map((session, idx) => (
                                            <div key={idx} style={{
                                                border: '1px solid #eee', padding: 12, borderRadius: 8,
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                            }}>
                                                <div>
                                                    <div style={{ fontWeight: 'bold' }}>{formatSessionTime(session.startTime, session.endTime)}</div>
                                                    <div style={{ fontSize: 13, color: '#666' }}>
                                                        Täituvus: <span style={{ color: getCapacityColor(session.status), fontWeight: 'bold' }}>
                                                            {formatCapacity(session.currentCapacity, session.maxCapacity)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <button
                                                    disabled={submitting}
                                                    onClick={() => handleRequest(session)}
                                                    style={{
                                                        background: '#007bff', color: 'white', border: 'none',
                                                        padding: '6px 12px', borderRadius: 4, cursor: 'pointer',
                                                        opacity: submitting ? 0.7 : 1
                                                    }}
                                                >
                                                    Saada soov
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ borderTop: '1px solid #eee', paddingTop: 16, textAlign: 'right' }}>
                            <button onClick={onClose} style={{ padding: '8px 16px', background: '#ccc', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
                                Loobu
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ExtraSessionRequestModal;
