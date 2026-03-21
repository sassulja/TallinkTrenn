import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { ref, get } from "firebase/database"
import { auth, database } from "../services/firebase"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [role, setRole] = useState(null)
    const [displayName, setDisplayName] = useState(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser)

                // 🔥 Load role and display name from database
                const [roleSnapshot, displayNameSnapshot] = await Promise.all([
                    get(ref(database, `users/${firebaseUser.uid}/role`)),
                    get(ref(database, `users/${firebaseUser.uid}/displayName`))
                ])

                if (roleSnapshot.exists()) {
                    setRole(roleSnapshot.val())
                } else {
                    setRole(null)
                }

                if (displayNameSnapshot.exists()) {
                    setDisplayName(displayNameSnapshot.val())
                } else {
                    setDisplayName(null)
                }
            } else {
                setUser(null)
                setRole(null)
                setDisplayName(null)
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
            displayName,
            isLoading,
            isAuthed: !!user,
            logout,
        }),
        [user, role, displayName, isLoading]
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
