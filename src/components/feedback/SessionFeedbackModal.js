import React, { useState, useEffect } from 'react';
import { estonianDate } from '../../utils';
import {
    FEEDBACK_EMOJI_Q1,
    FEEDBACK_EMOJI_Q2,
    FEEDBACK_EMOJI_Q3,
    COACH_FEEDBACK_EMOJI,
    getFeedbackTrend,
    getCoachFeedback
} from '../../data/feedback';
import { updatePlayerAttendance } from '../../data/attendance';

const SessionFeedbackModal = ({
    session,
    player,
    isParentView,
    isAdminView,
    feedbackData, // All feedback data for this player { date: { ... } }
    coachFeedbackData, // All coach feedback { date: { group: { player: val } } }
    onClose,
    onSaveFeedback
}) => {
    // Session context
    const isTennis = session.sport === 'tennis';

    // Existing Feedback
    // 1. Try session-specific feedback key (new logic)
    // 2. Fallback to date-based feedback (legacy)
    // Existing Feedback
    // 1. Try session-specific feedback key (new logic): feedbackData[date][sessionId][player]
    // 2. Fallback to date-based feedback (legacy): feedbackData[date][player]
    const existingPlayerFeedback =
        feedbackData[session.date]?.[session.id]?.[player] ||
        feedbackData[session.date]?.[player] ||
        {};

    // Session-based coach feedback lookup (fallback to date-search if session.id missing)
    const existingCoachRating = getCoachFeedback(coachFeedbackData, session.date, session.id || null, player);

    // Form State
    const [effort, setEffort] = useState(null);
    const [coachAttention, setCoachAttention] = useState(null);
    const [clarity, setClarity] = useState(null);

    // Sync state when props change (re-opening modal or data load)
    useEffect(() => {
        if (existingPlayerFeedback) {
            setEffort(existingPlayerFeedback.intensity || existingPlayerFeedback.effort || null);
            setCoachAttention(existingPlayerFeedback.coachAttention || null);
            setClarity(existingPlayerFeedback.objectiveClarity || null);
        } else {
            setEffort(null);
            setCoachAttention(null);
            setClarity(null);
        }
    }, [existingPlayerFeedback]);

    // Permission Logic
    const isPast = new Date(session.date) < new Date(new Date().setHours(0, 0, 0, 0));
    // Edit allowed if:
    // 1. Player View AND Session is within last 7 days
    // 2. Admin View (Always)
    // Parent View is ALWAYS read-only
    const daysSince = (new Date() - new Date(session.date)) / (1000 * 60 * 60 * 24);
    const canEdit = (!isParentView && daysSince <= 7) || isAdminView;

    // Trend Logic
    const trendData = getFeedbackTrend(feedbackData[player]);

    const handleSave = () => {
        onSaveFeedback(session.date, {
            intensity: effort,
            coachAttention,
            objectiveClarity: clarity
        });
        onClose();
    };

    // Clean up attendance cancellation
    const handleCancelAttendance = () => {
        if (window.confirm("Oled kindel, et soovid tühistada osalemise?")) {
            // We need to pass updatePlayerAttendance logic or have a prop for it.
            // For now, assuming parent component handles it or we import it.
            updatePlayerAttendance(session.date, player, null)
                .then(() => onClose())
                .catch(err => alert("Tühistamine ebaõnnestus"));
        }
    };


    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1200,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }} onClick={onClose}>
            <div style={{
                background: 'white', padding: 24, borderRadius: 12,
                maxWidth: 500, width: '90%', maxHeight: '90vh', overflowY: 'auto'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                        <h2 style={{ margin: 0 }}>{session.time} {isTennis ? '🎾 Tennis' : '⚽ Füss'}</h2>
                        <div style={{ color: '#666', marginTop: 4 }}>
                            {session.weekday}, {estonianDate(session.date)}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 24, cursor: 'pointer' }}>✕</button>
                </div>

                {/* Trend Summary */}
                {trendData && (
                    <div style={{
                        marginBottom: 24, padding: 12, borderRadius: 8,
                        background: '#f6ffed', border: '1px solid #b7eb8f',
                        display: 'flex', alignItems: 'center', gap: 12
                    }}>
                        <span style={{ fontSize: 24 }}>📈</span>
                        <div>
                            <div style={{ fontWeight: 'bold' }}>Viimased 7 trenni</div>
                            <div style={{ fontSize: 13, color: '#666' }}>
                                Keskmine pingutus: <b>{trendData.avg}/5</b>
                                {trendData.trend === 'up' && <span style={{ color: 'green', marginLeft: 6 }}>↗️ Tõusev</span>}
                                {trendData.trend === 'down' && <span style={{ color: 'red', marginLeft: 6 }}>↘️ Langev</span>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Coach Feedback (Read-Only) */}
                {existingCoachRating && (
                    <div style={{ marginBottom: 24, padding: 12, background: '#e6f7ff', borderRadius: 8, border: '1px solid #91d5ff' }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#0050b3' }}>📢 Treeneri hinnang sinu panusele</h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 28 }}>
                                {COACH_FEEDBACK_EMOJI.find(e => e.val === parseInt(existingCoachRating))?.icon || '❓'}
                            </span>
                            <span style={{ fontWeight: 'bold' }}>
                                {COACH_FEEDBACK_EMOJI.find(e => e.val === parseInt(existingCoachRating))?.label || '-'}
                            </span>
                        </div>
                    </div>
                )}

                {/* Player Feedback Form */}
                <div style={{ borderTop: '1px solid #eee', paddingTop: 16 }}>
                    <h3 style={{ marginTop: 0 }}>Sinu tagasiside</h3>

                    {/* Q1: Effort */}
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>1. Kui raske trenn oli?</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            {FEEDBACK_EMOJI_Q1.map(item => (
                                <EmojiOption
                                    key={item.val} item={item} selected={effort}
                                    onSelect={canEdit ? setEffort : () => { }}
                                    readOnly={!canEdit}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Q2: Coach Attention */}
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>2. Kas treener märkas sind?</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            {FEEDBACK_EMOJI_Q2.map(item => (
                                <EmojiOption
                                    key={item.val} item={item} selected={coachAttention}
                                    onSelect={canEdit ? setCoachAttention : () => { }}
                                    readOnly={!canEdit}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Q3: Clarity */}
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>3. Kas said harjutusest aru?</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            {FEEDBACK_EMOJI_Q3.map(item => (
                                <EmojiOption
                                    key={item.val} item={item} selected={clarity}
                                    onSelect={canEdit ? setClarity : () => { }}
                                    readOnly={!canEdit}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    {canEdit ? (
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                onClick={handleSave}
                                disabled={!effort} // Min requirement
                                style={{
                                    flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                                    background: effort ? '#28a745' : '#e0e0e0',
                                    color: effort ? 'white' : '#999',
                                    fontWeight: 'bold', cursor: effort ? 'pointer' : 'default'
                                }}
                            >
                                Salvesta
                            </button>
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '10px 20px', borderRadius: 8, border: '1px solid #ccc',
                                    background: 'white', cursor: 'pointer'
                                }}
                            >
                                Loobu
                            </button>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: '#999', fontStyle: 'italic' }}>
                            {isParentView ? "Lapsevanemana näed ainult vastuseid." : "Tagasiside andmise aeg on möödas."}
                        </div>
                    )}


                </div>

            </div>
        </div>
    );
};

const EmojiOption = ({ item, selected, onSelect, readOnly }) => {
    const isSelected = selected === item.val;
    const isInactive = selected !== null && !isSelected;

    return (
        <div
            onClick={() => onSelect(item.val)}
            style={{
                textAlign: 'center', cursor: readOnly ? 'default' : 'pointer',
                opacity: isInactive ? 0.3 : 1,
                transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.2s',
                flex: 1
            }}
        >
            <div style={{ fontSize: 24 }}>{item.icon}</div>
            <div style={{ fontSize: 10, fontWeight: 500, color: isSelected ? 'black' : '#888' }}>{item.label}</div>
        </div>
    );
};

export default SessionFeedbackModal;
