import { Outlet } from "react-router-dom"
import TopNav from "../components/ui/TopNav"

export default function RoleLayout() {
    return (
        <div style={{ backgroundColor: "var(--color-bg)" }}>
            <TopNav />
            <div style={{ padding: "20px" }}>
                <Outlet />
            </div>
        </div>
    )
}
