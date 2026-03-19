import { Outlet } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

export default function AppLayout() {
    const { isAuthed, logout, role } = useAuth()

    return (
        <div>
            <header
                style={{
                    background: "black",
                    color: "white",
                    padding: "15px 20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                }}
            >
                <strong>Tallink Trenn v2</strong>

                {isAuthed && (
                    <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                        <span style={{ fontSize: "14px", opacity: 0.7 }}>
                            {role}
                        </span>
                        <button
                            onClick={logout}
                            style={{
                                background: "white",
                                border: "none",
                                padding: "6px 10px",
                                cursor: "pointer"
                            }}
                        >
                            Logout
                        </button>
                    </div>
                )}
            </header>

            <main style={{ padding: "20px" }}>
                <Outlet />
            </main>
        </div>
    )
}