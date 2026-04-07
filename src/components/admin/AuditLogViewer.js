import React, { useState, useEffect } from 'react';
import { subscribeToRecentLogs, getActionLabel, AUDIT_ACTIONS } from '../../data/auditLog';

const AuditLogViewer = () => {
    const [logs, setLogs] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
    const [limit, setLimit] = useState(50);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = subscribeToRecentLogs(limit, (data) => {
            setLogs(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [limit]);

    const formatTime = (ts) => {
        if (!ts) return '-';
        const d = new Date(ts);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    };

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const renderDetails = (log) => {
        // Custom rendering based on action type
        switch (log.action) {
            case AUDIT_ACTIONS.SCHEDULE_TEMPLATE_CHANGE:
                return (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div>
                                <strong>Vana:</strong>
                                <pre style={{ background: '#f5f5f5', padding: 5, fontSize: 11 }}>
                                    {JSON.stringify(log.oldValue, null, 2)}
                                </pre>
                            </div>
                            <div>
                                <strong>Uus:</strong>
                                <pre style={{ background: '#f5f5f5', padding: 5, fontSize: 11 }}>
                                    {JSON.stringify(log.newValue, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </div>
                );
            case AUDIT_ACTIONS.SCHEDULE_OVERRIDE:
                return (
                    <div>
                        <div>Kuupäev: {log.date ? log.date.split('-').reverse().join('/') : '-'}</div>
                        <div>Muutus: {JSON.stringify(log.oldValue)} ➔ {JSON.stringify(log.newValue)}</div>
                        {log.reason && <div>Põhjus: {log.reason}</div>}
                    </div>
                );
            default:
                // Generic fallback
                return (
                    <pre style={{ background: '#f5f5f5', padding: 5, fontSize: 11, overflowX: 'auto' }}>
                        {JSON.stringify(log, null, 2)}
                    </pre>
                );
        }
    };

    return (
        <div style={{ marginTop: 24, padding: 16, background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2>Tegevuste ajalugu (Audit Log)</h2>
                <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                    <option value={20}>Viimased 20</option>
                    <option value={50}>Viimased 50</option>
                    <option value={100}>Viimased 100</option>
                </select>
            </div>

            {loading ? (
                <div>Laen andmeid...</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid #eee', borderRadius: 4 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '140px 180px 150px 1fr 20px', padding: '10px', background: '#f9f9f9', fontWeight: 'bold', borderBottom: '1px solid #eee' }}>
                        <div>Aeg</div>
                        <div>Tegevus</div>
                        <div>Mängija</div>
                        <div>Muutja</div>
                        <div></div>
                    </div>

                    {logs.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>Kirjeid pole.</div>}

                    {logs.map((log) => (
                        <div key={log.id} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid #eee' }}>
                            <div
                                onClick={() => toggleExpand(log.id)}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '140px 180px 150px 1fr 20px',
                                    padding: '10px',
                                    cursor: 'pointer',
                                    background: expandedId === log.id ? '#f0f7ff' : 'white'
                                }}
                            >
                                <div style={{ fontSize: 12, color: '#666' }}>{formatTime(log.timestamp)}</div>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>{getActionLabel(log.action)}</div>
                                <div style={{ fontSize: 13 }}>{log.player || '-'}</div>
                                <div style={{ fontSize: 13, color: '#666' }}>{log.changedBy || 'Süsteem'}</div>
                                <div style={{ fontSize: 10, color: '#999' }}>{expandedId === log.id ? '▲' : '▼'}</div>
                            </div>

                            {expandedId === log.id && (
                                <div style={{ padding: '10px 20px', background: '#f8f9fa', borderTop: '1px dashed #eee' }}>
                                    {renderDetails(log)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AuditLogViewer;
