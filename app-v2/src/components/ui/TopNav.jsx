import React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"

export default function TopNav({ showBack = false, onBack }) {
    const [showUserMenu, setShowUserMenu] = React.useState(false)
    const [showNavMenu, setShowNavMenu] = React.useState(false)
    const dropdownRef = React.useRef(null)
    const location = useLocation()
    const navigate = useNavigate()
    const { isAuthed, logout, role, displayName } = useAuth()
    const isSessions = location.pathname.startsWith("/sessions")
    const isHistory = location.pathname.startsWith("/history")
    const isAdmin = location.pathname === "/admin"
    const isAdminAttendance = location.pathname.startsWith("/admin/attendance")
    const isAdminCoaches = location.pathname.startsWith("/admin/coaches")
    const isAdminFeedback = location.pathname.startsWith("/admin/feedback")
    const isAdminExport = location.pathname.startsWith("/admin/export")
    const currentLabel =
        isSessions ? "Treeningud" :
            isHistory ? "Ajalugu" :
                isAdminAttendance ? "Kohalolek" :
                    isAdminCoaches ? "Treenerid" :
                        isAdminFeedback ? "Tagasiside" :
                            isAdminExport ? "Eksport" :
                                isAdmin ? "Admin" :
                                    "Treeningud"

    const handleNavigate = (path) => {
        navigate(path)
        setShowNavMenu(false)
        setShowUserMenu(false)
    }

    const handleLogout = () => {
        logout()
        setShowUserMenu(false)
        setShowNavMenu(false)
    }

    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setShowUserMenu(false)
                setShowNavMenu(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    return (
        <div ref={dropdownRef} style={{
            height: "48px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 var(--spacing-md)",
            borderBottom: "1px solid var(--color-border)",
            background: "white",
            position: "sticky",
            top: 0,
            zIndex: 10
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {showBack && (
                    <button onClick={onBack} style={{ marginRight: "8px" }}>
                        ←
                    </button>
                )}
                {isAuthed && (
                    <div style={{ position: "relative" }}>
                        <button
                            onClick={() => {
                                setShowUserMenu(prev => !prev)
                                setShowNavMenu(false)
                            }}
                            style={{
                                background: "none",
                                border: "1px solid var(--color-border)",
                                borderRadius: "6px",
                                padding: "4px 8px",
                                cursor: "pointer"
                            }}
                        >
                            {displayName || role} ▼
                        </button>
                        {showUserMenu && (
                            <div style={{
                                position: "absolute",
                                top: "calc(100% + 8px)",
                                left: 0,
                                minWidth: "140px",
                                background: "white",
                                border: "1px solid var(--color-border)",
                                borderRadius: "8px",
                                padding: "8px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "4px",
                                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)"
                            }}>
                                <button
                                    onClick={handleLogout}
                                    style={{ background: "none", border: "none", textAlign: "left", cursor: "pointer", padding: "6px 8px" }}
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative" }}>
                {isAuthed && (
                    <>
                        <button
                            onClick={() => {
                                setShowNavMenu(prev => !prev)
                                setShowUserMenu(false)
                            }}
                            style={{
                                background: "none",
                                border: "1px solid var(--color-border)",
                                borderRadius: "6px",
                                padding: "4px 8px",
                                cursor: "pointer"
                            }}
                        >
                            {currentLabel} ▼
                        </button>
                        {showNavMenu && (
                            <div style={{
                                position: "absolute",
                                top: "calc(100% + 8px)",
                                right: 0,
                                minWidth: "180px",
                                background: "white",
                                border: "1px solid var(--color-border)",
                                borderRadius: "8px",
                                padding: "8px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "4px",
                                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)"
                            }}>
                                <button
                                    onClick={() => handleNavigate("/sessions")}
                                    style={{ background: "none", border: "none", textAlign: "left", cursor: "pointer", padding: "6px 8px", color: isSessions ? "var(--color-primary)" : "inherit" }}
                                >
                                    Treeningud
                                </button>
                                {(role === "parent" || role === "player") && (
                                    <button
                                        onClick={() => handleNavigate("/history")}
                                        style={{ background: "none", border: "none", textAlign: "left", cursor: "pointer", padding: "6px 8px", color: isHistory ? "var(--color-primary)" : "inherit" }}
                                    >
                                        Ajalugu
                                    </button>
                                )}
                                {role === "admin" && (
                                    <>
                                        <div style={{ height: "1px", background: "var(--color-border)", margin: "4px 0" }} />
                                        <button
                                            onClick={() => handleNavigate("/admin")}
                                            style={{ background: "none", border: "none", textAlign: "left", cursor: "pointer", padding: "6px 8px", color: isAdmin ? "var(--color-primary)" : "inherit" }}
                                        >
                                            Admin
                                        </button>
                                        <button
                                            onClick={() => handleNavigate("/admin/attendance")}
                                            style={{ background: "none", border: "none", textAlign: "left", cursor: "pointer", padding: "6px 8px", color: isAdminAttendance ? "var(--color-primary)" : "inherit" }}
                                        >
                                            Kohalolek
                                        </button>
                                        <button
                                            onClick={() => handleNavigate("/admin/coaches")}
                                            style={{ background: "none", border: "none", textAlign: "left", cursor: "pointer", padding: "6px 8px", color: isAdminCoaches ? "var(--color-primary)" : "inherit" }}
                                        >
                                            Treenerid
                                        </button>
                                        <button
                                            onClick={() => handleNavigate("/admin/feedback")}
                                            style={{ background: "none", border: "none", textAlign: "left", cursor: "pointer", padding: "6px 8px", color: isAdminFeedback ? "var(--color-primary)" : "inherit" }}
                                        >
                                            Tagasiside
                                        </button>
                                        <button
                                            onClick={() => handleNavigate("/admin/export")}
                                            style={{ background: "none", border: "none", textAlign: "left", cursor: "pointer", padding: "6px 8px", color: isAdminExport ? "var(--color-primary)" : "inherit" }}
                                        >
                                            Eksport
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
