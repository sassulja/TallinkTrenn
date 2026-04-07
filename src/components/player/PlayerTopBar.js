import React, { useState } from 'react';

const PlayerTopBar = ({ playerName, onLogout, onChangePassword }) => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'white',
            borderBottom: '1px solid #eee',
            marginBottom: 20
        }}>
            {/* Left: Logo/Brand & Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: '#1890ff',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', fontSize: 14
                }}>
                    VP
                </div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{playerName}</div>
            </div>

            {/* Right: Overflow Menu */}
            <div style={{ position: 'relative' }}>
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    style={{
                        background: 'none', border: 'none', fontSize: 24, cursor: 'pointer',
                        padding: 4, display: 'flex', alignItems: 'center'
                    }}
                >
                    ☰
                </button>

                {menuOpen && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: 4,
                        background: 'white',
                        border: '1px solid #eee',
                        borderRadius: 8,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        width: 180,
                        zIndex: 100
                    }}>
                        {/* Overlay to close on outside click */}
                        <div
                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 }}
                            onClick={() => setMenuOpen(false)}
                        />

                        <div style={{ display: 'flex', flexDirection: 'column', padding: 4, zIndex: 101, position: 'relative' }}>
                            <button
                                onClick={() => {
                                    setMenuOpen(false);
                                    onChangePassword();
                                }}
                                style={{
                                    background: 'none', border: 'none', textAlign: 'left',
                                    padding: '12px 16px', fontSize: 14, cursor: 'pointer',
                                    borderBottom: '1px solid #f5f5f5'
                                }}
                            >
                                🔑 Muuda parooli
                            </button>
                            <button
                                onClick={() => {
                                    setMenuOpen(false);
                                    onLogout();
                                }}
                                style={{
                                    background: 'none', border: 'none', textAlign: 'left',
                                    padding: '12px 16px', fontSize: 14, cursor: 'pointer',
                                    color: '#ff4d4f'
                                }}
                            >
                                🚪 Logi välja
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlayerTopBar;
