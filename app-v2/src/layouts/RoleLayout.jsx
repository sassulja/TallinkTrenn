import { Outlet, Link } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

export default function RoleLayout() {
    const { role } = useAuth()

    return (
        <div style={{ display: "flex" }}>
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

            <div style={{ flex: 1, padding: "20px" }}>
                <Outlet />
            </div>
        </div>
    )
}