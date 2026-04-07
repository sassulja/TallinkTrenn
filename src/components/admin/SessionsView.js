// src/components/admin/SessionsView.js
import React, { useState, useEffect } from 'react';
import SessionOverview from '../coach/SessionOverview';
import UserManagement from './UserManagement';
// REMOVED: BulkScheduleUpload
import SessionOptionsManager from './SessionOptionsManager';
import AuditLogViewer from './AuditLogViewer';



const SessionsView = ({
    isAdmin,
    playerPasswords, // For list of all players
    sessionOptions,
    // REMOVED: playerWeeklySchedules
    scheduleOverrides,
    attendance,
    fussAttendance,
    onAttendanceChange,

    allDates, // All dates object
    currentUser,
    // Feedback props
    feedbackData,
    coachFeedbackData,
    // REMOVED: playerGroups, fussGroups
}) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [showHistory, setShowHistory] = useState(false); // New state for History Mode
    const [activeSport, setActiveSport] = useState('tennis');
    // REMOVED: showBulkUpload
    const [showOptionsManager, setShowOptionsManager] = useState(false);
    const [showUserManagement, setShowUserManagement] = useState(false);
    const [showAuditLog, setShowAuditLog] = useState(false);

    // Ensure selectedDate is valid, default to today if not set
    useEffect(() => {
        if (!selectedDate) {
            setSelectedDate(new Date().toISOString().split('T')[0]);
        }
    }, [selectedDate]);

    // Simple date navigation
    const handleDateChange = (days) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    const currentAttendance = activeSport === 'tennis' ? attendance : fussAttendance;

    // Helper to generate last 7 days dates
    const historyDates = React.useMemo(() => {
        if (!showHistory) return [];
        const result = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            result.push(d.toISOString().split('T')[0]);
        }
        return result;
    }, [showHistory]);

    return (
        <div style={{ padding: '0 20px 40px' }}>
            <h2 style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                📅 Treeningud
                {isAdmin && (
                    <div style={{ fontSize: 13, fontWeight: 'normal', marginLeft: 'auto', display: 'flex', gap: 12 }}>
                        <button
                            onClick={() => {
                                setShowUserManagement(!showUserManagement);
                                setShowOptionsManager(false);
                                setShowAuditLog(false);
                            }}
                            style={{
                                padding: '6px 12px',
                                background: showUserManagement ? '#6c757d' : 'white',
                                color: showUserManagement ? 'white' : '#6c757d',
                                border: '1px solid #6c757d',
                                borderRadius: 4,
                                cursor: 'pointer'
                            }}
                        >
                            👥 Kasutajad
                        </button>
                        <button
                            onClick={() => {
                                setShowOptionsManager(!showOptionsManager);
                                setShowUserManagement(false);
                                setShowAuditLog(false);
                            }}
                            style={{
                                padding: '6px 12px',
                                background: showOptionsManager ? '#6c757d' : 'white',
                                color: showOptionsManager ? 'white' : '#6c757d',
                                border: '1px solid #6c757d',
                                borderRadius: 4,
                                cursor: 'pointer'
                            }}
                        >
                            ⚙️ Treeningajad
                        </button>
                        <button
                            onClick={() => {
                                setShowAuditLog(!showAuditLog);
                                setShowUserManagement(false);
                                setShowOptionsManager(false);
                            }}
                            style={{
                                padding: '6px 12px',
                                background: showAuditLog ? '#6c757d' : 'white',
                                color: showAuditLog ? 'white' : '#6c757d',
                                border: '1px solid #6c757d',
                                borderRadius: 4,
                                cursor: 'pointer'
                            }}
                        >
                            📋 Logi
                        </button>
                    </div>
                )}
            </h2>

            {/* Admin Tools Area */}
            {isAdmin && showOptionsManager && (
                <div style={{ marginBottom: 32 }}>
                    <SessionOptionsManager sessionOptions={sessionOptions} />
                </div>
            )}



            {isAdmin && showUserManagement && (
                <div style={{ marginBottom: 32 }}>
                    <UserManagement allPlayers={playerPasswords} />
                </div>
            )}

            {isAdmin && showAuditLog && (
                <div style={{ marginBottom: 32 }}>
                    <AuditLogViewer />
                </div>
            )}

            {/* Main Controls */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 20,
                marginBottom: 24,
                background: 'white',
                padding: 16,
                borderRadius: 8,
                border: '1px solid #eee'
            }}>

                {/* Sport Toggle */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={() => setActiveSport('tennis')}
                        style={{
                            padding: '8px 24px',
                            background: activeSport === 'tennis' ? '#007bff' : '#f8f9fa',
                            color: activeSport === 'tennis' ? 'white' : '#333',
                            border: '1px solid #ddd',
                            borderRadius: 20,
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                    >
                        🎾 Tennis
                    </button>
                    <button
                        onClick={() => setActiveSport('fuss')}
                        style={{
                            padding: '8px 24px',
                            background: activeSport === 'fuss' ? '#007bff' : '#f8f9fa',
                            color: activeSport === 'fuss' ? 'white' : '#333',
                            border: '1px solid #ddd',
                            borderRadius: 20,
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                    >
                        ⚽ Üldfüüsiline
                    </button>
                </div>

                {/* Date Picker (Hidden if history mode) */}
                {!showHistory ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => handleDateChange(-1)} style={{ padding: '8px 12px', border: '1px solid #ddd', background: 'white', borderRadius: 4, cursor: 'pointer' }}>◀</button>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{ padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
                        />
                        <button onClick={() => handleDateChange(1)} style={{ padding: '8px 12px', border: '1px solid #ddd', background: 'white', borderRadius: 4, cursor: 'pointer' }}>▶</button>

                        {!isToday && (
                            <button
                                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                                style={{ padding: '8px 12px', border: 'none', background: '#e9ecef', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}
                            >
                                Täna
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{ fontStyle: 'italic', color: '#666', padding: '8px 0' }}>
                        Viimased 7 päeva
                    </div>
                )}

                <button
                    onClick={() => setShowHistory(!showHistory)}
                    style={{
                        padding: '8px 16px',
                        background: showHistory ? '#333' : 'white',
                        color: showHistory ? 'white' : '#333',
                        border: '1px solid #333',
                        borderRadius: 20,
                        cursor: 'pointer',
                        marginLeft: 'auto'
                    }}
                >
                    {showHistory ? '📅 Näita kalendrit' : '📜 Näita ajalugu'}
                </button>

            </div>

            {/* Sessions Grid */}
            {showHistory ? (
                // HISTORY MODE: Render list of 7 days
                <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
                    {historyDates.map(date => (
                        <div key={date}>
                            <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: 8, marginBottom: 16, color: '#666' }}>
                                {new Date(date).toLocaleDateString('et-EE', { weekday: 'long', day: 'numeric', month: 'long' })}
                            </h3>
                            <SessionOverview
                                date={date}
                                sport={activeSport}
                                sessionOptions={sessionOptions}
                                attendance={activeSport === 'tennis' ? attendance : fussAttendance}
                                onAttendanceChange={(newVal) => onAttendanceChange(activeSport, newVal, date)}
                                allPlayers={playerPasswords}
                                isAdmin={isAdmin}
                                currentUser={currentUser}
                                feedbackData={feedbackData}
                                coachFeedbackData={coachFeedbackData}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                // CALENDAR MODE: Single day
                <SessionOverview
                    date={selectedDate}
                    sport={activeSport}
                    sessionOptions={sessionOptions}
                    // REMOVED: playerWeeklySchedules
                    scheduleOverrides={scheduleOverrides}
                    attendance={currentAttendance}
                    onAttendanceChange={(newVal) => onAttendanceChange(activeSport, newVal, selectedDate)}
                    // Extra props needed for adding players
                    allPlayers={playerPasswords}
                    isAdmin={isAdmin}
                    currentUser={currentUser}
                    feedbackData={feedbackData}
                    coachFeedbackData={coachFeedbackData}
                // REMOVED: playerGroups, fussGroups
                />
            )}

        </div>
    );
};

export default SessionsView;
