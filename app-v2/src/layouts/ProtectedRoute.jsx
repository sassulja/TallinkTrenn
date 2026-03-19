import { Navigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

export default function ProtectedRoute({ children, allowedRoles }) {
    const { isLoading, isAuthed, role } = useAuth()

    if (isLoading) {
        return <div>Loading...</div>
    }

    if (!isAuthed) {
        return <Navigate to="/" replace />
    }

    if (allowedRoles && !allowedRoles.includes(role)) {
        return <Navigate to="/" replace />
    }

    return children
}