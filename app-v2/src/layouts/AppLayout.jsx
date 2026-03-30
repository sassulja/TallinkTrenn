import { Outlet } from "react-router-dom"

export default function AppLayout() {
    return (
        <div>
            <main style={{ padding: "20px" }}>
                <Outlet />
            </main>
        </div>
    )
}
