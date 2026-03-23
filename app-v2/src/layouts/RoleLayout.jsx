import { Outlet, Link, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

export default function RoleLayout() {
    const { role } = useAuth()
    const location = useLocation()
    const isPlayerParent = role === "player" || role === "parent"

    return (
        <div style={{ display: isPlayerParent ? "block" : "flex", backgroundColor: "var(--color-bg)" }}>
            {!isPlayerParent && (
                <nav
                    style={{
                        width: "200px",
                        padding: "20px",
                        borderRight: "1px solid #ddd"
                    }}
                >
                    {role === "admin" && (
                        <div><Link to="/admin">Admin</Link></div>
                    )}

                    {(role === "admin" || role === "coach" || role === "parent" || role === "player") && (
                        <div><Link to="/sessions">Treeningud</Link></div>
                    )}

                    {(role === "parent" || role === "player") && (
                        <div><Link to="/history">Ajalugu</Link></div>
                    )}

                    {role === "admin" && (
                        <>
                            <div><Link to="/admin/attendance">Kohaloleku ülevaade</Link></div>
                            <div><Link to="/admin/coaches">Treenerite ülevaade</Link></div>
                            <div><Link to="/admin/feedback">Tagasiside analüütika</Link></div>
                            <div><Link to="/admin/export">Eksport</Link></div>
                        </>
                    )}
                </nav>
            )}

            {isPlayerParent && (
                <div style={{ display: "flex", gap: "8px", padding: "16px 20px 0", justifyContent: "center" }}>
                    <Link
                        to="/sessions"
                        style={{
                            padding: "8px 14px",
                            borderRadius: "999px",
                            border: "1px solid var(--color-border)",
                            background: location.pathname === "/sessions" ? "var(--color-primary-light)" : "var(--color-surface)",
                            color: "var(--color-text)",
                            fontWeight: location.pathname === "/sessions" ? "var(--font-weight-bold)" : "var(--font-weight-medium)"
                        }}
                    >
                        Treeningud
                    </Link>
                    <Link
                        to="/history"
                        style={{
                            padding: "8px 14px",
                            borderRadius: "999px",
                            border: "1px solid var(--color-border)",
                            background: location.pathname === "/history" ? "var(--color-primary-light)" : "var(--color-surface)",
                            color: "var(--color-text)",
                            fontWeight: location.pathname === "/history" ? "var(--font-weight-bold)" : "var(--font-weight-medium)"
                        }}
                    >
                        Ajalugu
                    </Link>
                </div>
            )}

            <div style={{ flex: 1, padding: "20px" }}>
                <Outlet />
            </div>
        </div>
    )
}
