import React, { useState, useEffect } from 'react';
import {
    getCoaches,
    createCoach,
    updateCoach,
    deleteCoach,
    getParents,
    createParent,
    updateParent,
    deleteParent,
    subscribeToCoachRequests,
    approveAccessRequest,
    denyAccessRequest,
    deleteRequest
} from '../../data';

const UserManagement = ({ allPlayers }) => {
    const [activeTab, setActiveTab] = useState('coaches'); // 'coaches', 'parents', 'requests'

    // Data State
    const [coaches, setCoaches] = useState({});
    const [parents, setParents] = useState({});
    const [requests, setRequests] = useState({});

    // Form State
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null); // username for coach/parent
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    // Coach Form
    const [coachForm, setCoachForm] = useState({
        username: '',
        password: '',
        name: '',
        sports: [], // ['tennis', 'fuss']
        type: 'global' // 'global' | 'specific'
    });

    // Parent Form
    const [parentForm, setParentForm] = useState({
        username: '',
        password: '',
        name: '',
        linkedPlayers: [] // names of players
    });

    // Load Data
    useEffect(() => {
        loadData();
    }, [activeTab]);

    // Live subscription for requests
    useEffect(() => {
        if (activeTab === 'requests') {
            console.log("Subscribing to coach requests...");
            const unsub = subscribeToCoachRequests((data) => {
                console.log("Received coach requests:", data);
                setRequests(data);
            });
            return () => unsub();
        }
    }, [activeTab]);

    const loadData = async () => {
        setError(null);
        try {
            if (activeTab === 'coaches') {
                const data = await getCoaches();
                setCoaches(data);
            } else if (activeTab === 'parents') {
                const data = await getParents();
                setParents(data);
            }
        } catch (e) {
            setError("Viga andmete laadimisel: " + e.message);
        }
    };

    // --- Helpers ---

    const resetForms = () => {
        setIsEditing(false);
        setEditingId(null);
        setCoachForm({ username: '', password: '', name: '', sports: [], type: 'global' });
        setParentForm({ username: '', password: '', name: '', linkedPlayers: [] });
        setError(null);
        setSuccessMsg(null);
    };

    const handleEdit = (user, type) => {
        setIsEditing(true);
        setEditingId(user.username);
        setError(null);
        if (type === 'coach') {
            setCoachForm({
                username: user.username,
                password: user.password,
                name: user.name,
                sports: user.sports || [],
                type: user.type || 'global'
            });
        } else {
            setParentForm({
                username: user.username,
                password: user.password,
                name: user.name,
                linkedPlayers: user.linkedPlayers || []
            });
        }
    };

    // --- Actions: Coach ---

    const saveCoach = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            if (isEditing) {
                await updateCoach(editingId, coachForm);
                setSuccessMsg("Treener muudetud!");
            } else {
                await createCoach(coachForm.username, coachForm);
                setSuccessMsg("Treener lisatud!");
            }
            resetForms();
            loadData();
        } catch (e) {
            setError(e.message);
        }
    };

    const removeCoach = async (username) => {
        if (!window.confirm(`Kustuta treener ${username}?`)) return;
        try {
            await deleteCoach(username);
            loadData();
        } catch (e) { setError(e.message); }
    };

    const toggleCoachSport = (sport) => {
        setCoachForm(prev => ({
            ...prev,
            sports: prev.sports.includes(sport)
                ? prev.sports.filter(s => s !== sport)
                : [...prev.sports, sport]
        }));
    };

    // --- Actions: Parent ---

    const saveParent = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            if (isEditing) {
                await updateParent(editingId, parentForm);
                setSuccessMsg("Lapsevanem muudetud!");
            } else {
                await createParent(parentForm.username, parentForm);
                setSuccessMsg("Lapsevanem lisatud!");
            }
            resetForms();
            loadData();
        } catch (e) {
            setError(e.message);
        }
    };

    const removeParent = async (username) => {
        if (!window.confirm(`Kustuta lapsevanem ${username}?`)) return;
        try {
            await deleteParent(username);
            loadData();
        } catch (e) { setError(e.message); }
    };

    const toggleLinkedPlayer = (playerName) => {
        setParentForm(prev => ({
            ...prev,
            linkedPlayers: prev.linkedPlayers.includes(playerName)
                ? prev.linkedPlayers.filter(p => p !== playerName)
                : [...prev.linkedPlayers, playerName]
        }));
    };

    // --- Actions: Requests ---

    const handleReq = async (id, action, coach, type, sessionId, sport) => {
        try {
            if (action === 'approve') {
                await approveAccessRequest(id, coach, type, sessionId, sport);
            } else if (action === 'deny') {
                await denyAccessRequest(id);
            } else if (action === 'delete') {
                if (!window.confirm("Kustuta see taotlus?")) return;
                await deleteRequest(id);
            }
        } catch (e) {
            alert("Viga: " + e.message);
        }
    };

    // --- RENDER ---

    return (
        <div style={{ background: '#f8f9fa', padding: 20, borderRadius: 8, marginTop: 20 }}>
            <h3 style={{ marginBottom: 20 }}>Kasutajate haldus</h3>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid #ddd', paddingBottom: 10 }}>
                <button
                    onClick={() => { setActiveTab('coaches'); resetForms(); }}
                    style={activeTab === 'coaches' ? styles.activeTab : styles.tab}
                >
                    Treenerid
                </button>
                <button
                    onClick={() => { setActiveTab('parents'); resetForms(); }}
                    style={activeTab === 'parents' ? styles.activeTab : styles.tab}
                >
                    Lapsevanemad
                </button>
                <button
                    onClick={() => { setActiveTab('requests'); resetForms(); }}
                    style={activeTab === 'requests' ? styles.activeTab : styles.tab}
                >
                    Taotlused {Object.values(requests).filter(r => r.status === 'pending').length > 0 && `(${Object.values(requests).filter(r => r.status === 'pending').length})`}
                </button>
            </div>

            {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}
            {successMsg && <div style={{ color: 'green', marginBottom: 10 }}>{successMsg}</div>}

            {/* --- COACHES VIEW --- */}
            {activeTab === 'coaches' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    {/* List */}
                    <div>
                        <h4>Nimekiri</h4>
                        {Object.values(coaches).map(c => (
                            <div key={c.username} style={styles.card}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <strong>{c.name} ({c.username})</strong>
                                    <div>
                                        <button onClick={() => handleEdit(c, 'coach')} style={styles.smBtn}>Muuda</button>
                                        <button onClick={() => removeCoach(c.username)} style={{ ...styles.smBtn, color: 'red' }}>Kustuta</button>
                                    </div>
                                </div>
                                <div style={{ fontSize: 13, color: '#666' }}>
                                    Tüüp: {c.type === 'global' ? '🌍 Globaalne' : '🎯 Määratud'}
                                    {c.type === 'global' && ` (${c.sports?.join(', ') || 'puudub'})`}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Form */}
                    <div style={styles.formCard}>
                        <h4>{isEditing ? 'Muuda treenerit' : 'Lisa uus treener'}</h4>
                        <form onSubmit={saveCoach}>
                            <div style={styles.inputGroup}>
                                <label>Kasutajanimi</label>
                                <input
                                    required
                                    disabled={isEditing}
                                    value={coachForm.username}
                                    onChange={e => setCoachForm({ ...coachForm, username: e.target.value })}
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label>Nimi</label>
                                <input
                                    required
                                    value={coachForm.name}
                                    onChange={e => setCoachForm({ ...coachForm, name: e.target.value })}
                                    style={styles.input}
                                />
                            </div>
                            <div style={styles.inputGroup}>
                                <label>Parool</label>
                                <input
                                    required
                                    value={coachForm.password}
                                    onChange={e => setCoachForm({ ...coachForm, password: e.target.value })}
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label>Ligipääsu tüüp</label>
                                <select
                                    value={coachForm.type}
                                    onChange={e => setCoachForm({ ...coachForm, type: e.target.value })}
                                    style={styles.select}
                                >
                                    <option value="global">Globaalne (kõik trennid)</option>
                                    <option value="specific">Määratud (ainult määratud trennid)</option>
                                </select>
                            </div>

                            {coachForm.type === 'global' && (
                                <div style={styles.inputGroup}>
                                    <label>Spordialad (Globaalne)</label>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={coachForm.sports.includes('tennis')}
                                                onChange={() => toggleCoachSport('tennis')}
                                            /> Tennis
                                        </label>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={coachForm.sports.includes('fuss')}
                                                onChange={() => toggleCoachSport('fuss')}
                                            /> Füss
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
                                <button type="submit" style={styles.primaryBtn}>{isEditing ? 'Salvesta' : 'Lisa'}</button>
                                {isEditing && <button type="button" onClick={resetForms} style={styles.secondaryBtn}>Tühista</button>}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- PARENTS VIEW --- */}
            {activeTab === 'parents' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    {/* List */}
                    <div>
                        <h4>Nimekiri</h4>
                        {Object.values(parents).map(p => (
                            <div key={p.username} style={styles.card}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <strong>{p.name} ({p.username})</strong>
                                    <div>
                                        <button onClick={() => handleEdit(p, 'parent')} style={styles.smBtn}>Muuda</button>
                                        <button onClick={() => removeParent(p.username)} style={{ ...styles.smBtn, color: 'red' }}>Kustuta</button>
                                    </div>
                                </div>
                                <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                                    Lapsed: {p.linkedPlayers?.join(', ') || 'puuduvad'}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Form */}
                    <div style={styles.formCard}>
                        <h4>{isEditing ? 'Muuda lapsevanemat' : 'Lisa lapsevanem'}</h4>
                        <form onSubmit={saveParent}>
                            {['username', 'name', 'password'].map(field => (
                                <div key={field} style={styles.inputGroup}>
                                    <label style={{ textTransform: 'capitalize' }}>
                                        {field === 'username' ? 'Kasutajanimi' : field === 'name' ? 'Nimi' : 'Parool'}
                                    </label>
                                    <input
                                        required
                                        disabled={field === 'username' && isEditing}
                                        value={parentForm[field]}
                                        onChange={e => setParentForm({ ...parentForm, [field]: e.target.value })}
                                        style={styles.input}
                                    />
                                </div>
                            ))}

                            <div style={styles.inputGroup}>
                                <label>Seotud lapsed</label>
                                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #ddd', padding: 5 }}>
                                    {allPlayers.map(player => (
                                        <div key={player.name}>
                                            <label style={{ display: 'flex', alignItems: 'center', fontSize: 13 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={parentForm.linkedPlayers.includes(player.name)}
                                                    onChange={() => toggleLinkedPlayer(player.name)}
                                                    style={{ marginRight: 6 }}
                                                />
                                                {player.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
                                <button type="submit" style={styles.primaryBtn}>{isEditing ? 'Salvesta' : 'Lisa'}</button>
                                {isEditing && <button type="button" onClick={resetForms} style={styles.secondaryBtn}>Tühista</button>}
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- REQUESTS VIEW --- */}
            {activeTab === 'requests' && (
                <div>
                    <h4>Ootel taotlused</h4>
                    {Object.entries(requests).length === 0 && <div style={{ color: '#666' }}>Taotlusi pole.</div>}
                    {Object.entries(requests).map(([id, r]) => (
                        <div key={id} style={{ ...styles.card, background: r.status === 'pending' ? 'white' : '#f9f9f9', opacity: r.status !== 'pending' ? 0.8 : 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <strong>{r.coach}</strong> soovib ligipääsu: <strong>{r.sessionLabel || 'Tundmatu sessioon'}</strong>
                                    <div style={{ fontSize: 12, color: '#666' }}>
                                        Status: <span style={{
                                            fontWeight: 'bold',
                                            color: r.status === 'approved' ? '#28a745' : r.status === 'denied' ? '#dc3545' : '#ffc107'
                                        }}>
                                            {r.status === 'approved' ? 'KINNITATUD' : r.status === 'denied' ? 'KEELATUD' : 'OOTEL'}
                                        </span> • {new Date(r.requestedAt).toLocaleString()}
                                    </div>
                                </div>
                                {r.status === 'pending' ? (
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <button onClick={() => handleReq(id, 'approve', r.coach, r.sessionType, r.sessionId, r.sport)} style={{ ...styles.smBtn, background: '#28a745', color: 'white', border: 'none' }}>Kinnita</button>
                                        <button onClick={() => handleReq(id, 'deny')} style={{ ...styles.smBtn, background: '#dc3545', color: 'white', border: 'none' }}>Keeldu</button>
                                    </div>
                                ) : (
                                    <div>
                                        <button onClick={() => handleReq(id, 'delete')} style={{ ...styles.smBtn, color: '#dc3545', border: '1px solid #dc3545' }}>Kustuta</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const styles = {
    tab: { padding: '8px 16px', cursor: 'pointer', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', color: '#666' },
    activeTab: { padding: '8px 16px', cursor: 'pointer', background: 'transparent', border: 'none', borderBottom: '2px solid #007bff', color: '#007bff', fontWeight: 'bold' },
    card: { background: 'white', padding: 12, borderRadius: 4, border: '1px solid #ddd', marginBottom: 8 },
    formCard: { background: 'white', padding: 16, borderRadius: 4, border: '1px solid #ddd' },
    inputGroup: { marginBottom: 10 },
    input: { width: '100%', padding: 6, boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: 4 },
    select: { width: '100%', padding: 6 },
    primaryBtn: { padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' },
    secondaryBtn: { padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' },
    smBtn: { padding: '4px 8px', fontSize: 12, background: 'transparent', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', marginLeft: 8 }
};

export default UserManagement;
