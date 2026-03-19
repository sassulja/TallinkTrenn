import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { ref, get } from "firebase/database"
import { auth, database } from "../services/firebase"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [role, setRole] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser)

                // 🔥 Load role from database
                const roleRef = ref(database, `users/${firebaseUser.uid}/role`)
                const snapshot = await get(roleRef)

                if (snapshot.exists()) {
                    setRole(snapshot.val())
                } else {
                    setRole(null)
                }
            } else {
                setUser(null)
                setRole(null)
            }

            setIsLoading(false)
        })

        return unsubscribe
    }, [])

    async function logout() {
        await signOut(auth)
    }

    const value = useMemo(
        () => ({
            user,
            role,
            isLoading,
            isAuthed: !!user,
            logout,
        }),
        [user, role, isLoading]
    )

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error("useAuth must be used within AuthProvider")
    return ctx
}