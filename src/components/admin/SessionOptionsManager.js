// src/components/admin/SessionOptionsManager.js
import React, { useState } from 'react';
import {
    addSessionOption,
    updateSessionOption,
    deleteSessionOption,
    formatSessionTime,
    writeAuditLog,
    AUDIT_ACTIONS,
    getCoaches
} from '../../data';

const DAYS_OF_WEEK = [
    { key: 'Monday', label: 'Esmaspäev' },
    { key: 'Tuesday', label: 'Teisipäev' },
    { key: 'Wednesday', label: 'Kolmapäev' },
    { key: 'Thursday', label: 'Neljapäev' },
    { key: 'Friday', label: 'Reede' }
];

const SessionOptionsManager = ({ sessionOptions }) => {
    const [activeSport, setActiveSport] = useState('tennis');
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        startTime: '',
        endTime: '',
        maxCapacity: 8,
        days: [],
        assignedCoaches: []
    });
    const [error, setError] = useState(null);

    const [coaches, setCoaches] = useState({});

    // Load coaches
    React.useEffect(() => {
        getCoaches().then(setCoaches).catch(console.error);
    }, []);

    const resetForm = () => {
        setEditingId(null);
        setFormData({
            startTime: '',
            endTime: '',
            maxCapacity: activeSport === 'tennis' ? 8 : 12,
            days: [],
            assignedCoaches: []
        });
        setError(null);
    };

    const handleEdit = (id, option) => {
        setEditingId(id);
        setFormData({
            startTime: option.startTime,
            endTime: option.endTime,
            maxCapacity: option.maxCapacity,
            days: option.days || [],
            assignedCoaches: option.assignedCoaches || []
        });
    };

    const handleDelete = async (id, option) => {
        if (window.confirm('Oled kindel, et soovid selle treeninguaja kustutada?')) {
            try {
                await deleteSessionOption(activeSport, id);
                await writeAuditLog({
                    action: AUDIT_ACTIONS.SESSION_OPTION_DELETED,
                    sport: activeSport,
                    oldValue: option,
                    changedBy: 'admin'
                });
            } catch (err) {
                setError(err.message);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!formData.startTime || !formData.endTime) {
            setError('Palun sisesta algus- ja lõppaeg');
            return;
        }
        if (formData.days.length === 0) {
            setError('Palun vali vähemalt üks päev');
            return;
        }

        try {
            if (editingId) {
                await updateSessionOption(activeSport, editingId, formData);
                await writeAuditLog({
                    action: AUDIT_ACTIONS.SESSION_OPTION_UPDATED,
                    sport: activeSport,
                    id: editingId,
                    newValue: formData,
                    changedBy: 'admin'
                });
            } else {
                await addSessionOption(activeSport, formData);
                await writeAuditLog({
                    action: AUDIT_ACTIONS.SESSION_OPTION_ADDED,
                    sport: activeSport,
                    newValue: formData,
                    changedBy: 'admin'
                });
            }
            resetForm();
        } catch (err) {
            setError(err.message);
        }
    };

    const toggleDay = (dayKey) => {
        setFormData(prev => {
            const days = prev.days.includes(dayKey)
                ? prev.days.filter(d => d !== dayKey)
                : [...prev.days, dayKey];
            return { ...prev, days };
        });
    };

    const currentOptions = sessionOptions[activeSport] || {};

    return (
        <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 8, marginBottom: 32 }}>
            <h3>Treeningute ajad ja mahutavus</h3>

            {/* Sport Selector */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <button
                    onClick={() => { setActiveSport('tennis'); resetForm(); }}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: activeSport === 'tennis' ? '#007bff' : 'white',
                        color: activeSport === 'tennis' ? 'white' : '#333',
                        border: '1px solid #ccc',
                        borderRadius: 4,
                        cursor: 'pointer'
                    }}
                >
                    🎾 Tennis
                </button>
                <button
                    onClick={() => { setActiveSport('fuss'); resetForm(); }}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: activeSport === 'fuss' ? '#007bff' : 'white',
                        color: activeSport === 'fuss' ? 'white' : '#333',
                        border: '1px solid #ccc',
                        borderRadius: 4,
                        cursor: 'pointer'
                    }}
                >
                    ⚽ Füss
                </button>
            </div>


            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* List of Existing Options */}
                <div>
                    <h4 style={{ marginBottom: 12 }}>Olemasolevad ajad</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {Object.entries(currentOptions).length === 0 ? (
                            <div style={{ color: '#666', fontStyle: 'italic' }}>Ühtegi aega pole lisatud</div>
                        ) : (
                            Object.entries(currentOptions).map(([id, option]) => (
                                <div key={id} style={{
                                    background: 'white',
                                    padding: 12,
                                    borderRadius: 4,
                                    border: '1px solid #ddd',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>
                                            {formatSessionTime(option.startTime, option.endTime)}
                                        </div>
                                        <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                                            <span title={option.days.join(', ')}>
                                                {option.days.length} päeva
                                            </span>
                                            {' • '}
                                            <span>Max {option.maxCapacity}</span>
                                            {option.assignedCoaches && option.assignedCoaches.length > 0 && (
                                                <div style={{ marginTop: 2, color: '#007bff' }}>
                                                    Treenerid: {option.assignedCoaches.map(c => coaches[c]?.name || c).join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            onClick={() => handleEdit(id, option)}
                                            style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #ccc', background: 'white' }}
                                        >
                                            Muuda
                                        </button>
                                        <button
                                            onClick={() => handleDelete(id, option)}
                                            style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #dc3545', color: '#dc3545', background: 'white' }}
                                        >
                                            X
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Add/Edit Form */}
                <div style={{ background: 'white', padding: 16, borderRadius: 4, border: '1px solid #ddd' }}>
                    <h4 style={{ marginBottom: 12 }}>
                        {editingId ? 'Muuda aega' : 'Lisa uus aeg'}
                    </h4>

                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Algus</label>
                                <input
                                    type="time"
                                    value={formData.startTime}
                                    onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                    style={{ width: '100%', padding: 6 }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Lõpp</label>
                                <input
                                    type="time"
                                    value={formData.endTime}
                                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                    style={{ width: '100%', padding: 6 }}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>Mahutavus</label>
                            <input
                                type="number"
                                min="1"
                                max="50"
                                value={formData.maxCapacity}
                                onChange={e => setFormData({ ...formData, maxCapacity: parseInt(e.target.value) })}
                                style={{ width: '100%', padding: 6 }}
                            />
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>Päevad</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {DAYS_OF_WEEK.map(day => (
                                    <button
                                        key={day.key}
                                        type="button"
                                        onClick={() => toggleDay(day.key)}
                                        style={{
                                            padding: '4px 8px',
                                            fontSize: 12,
                                            borderRadius: 12,
                                            border: '1px solid',
                                            borderColor: formData.days.includes(day.key) ? '#28a745' : '#ccc',
                                            backgroundColor: formData.days.includes(day.key) ? '#e6f4ea' : 'white',
                                            color: formData.days.includes(day.key) ? '#155724' : '#666',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>Määra treenerid (valikuline)</label>
                            <div style={{ border: '1px solid #ddd', padding: 8, maxHeight: 150, overflowY: 'auto' }}>
                                {Object.values(coaches).map(coach => (
                                    <div key={coach.username} style={{ marginBottom: 6 }}>
                                        <label style={{ display: 'flex', alignItems: 'center', fontSize: 13, cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={formData.assignedCoaches.includes(coach.username)}
                                                onChange={() => {
                                                    const newAssigned = formData.assignedCoaches.includes(coach.username)
                                                        ? formData.assignedCoaches.filter(c => c !== coach.username)
                                                        : [...formData.assignedCoaches, coach.username];
                                                    setFormData({ ...formData, assignedCoaches: newAssigned });
                                                }}
                                                style={{ marginRight: 8 }}
                                            />
                                            {coach.name} <span style={{ color: '#999', fontSize: 11, marginLeft: 4 }}>({coach.type === 'global' ? 'Globaalne' : 'Määratud'})</span>
                                        </label>
                                    </div>
                                ))}
                                {Object.keys(coaches).length === 0 && <div style={{ color: '#999', fontSize: 12 }}>Treenereid pole lisatud</div>}
                            </div>
                        </div>

                        {error && (
                            <div style={{ color: '#dc3545', marginBottom: 12, fontSize: 13 }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                type="submit"
                                style={{
                                    flex: 1,
                                    padding: 8,
                                    background: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: 4,
                                    cursor: 'pointer'
                                }}
                            >
                                {editingId ? 'Salvesta muudatused' : 'Lisa aeg'}
                            </button>
                            {editingId && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    style={{
                                        padding: '8px 12px',
                                        background: '#6c757d',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 4,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Tühista
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default SessionOptionsManager;
