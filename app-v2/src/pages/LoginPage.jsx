import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "../services/firebase"
import { useAuth } from "../contexts/AuthContext"
import { seedAdminUser, seedCoachUser, seedPlayerUser } from "../utils/seedEmulator"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [isSeedingAdmin, setIsSeedingAdmin] = useState(false)
    const [seedMsg, setSeedMsg] = useState("")

    const [isSeedingCoach, setIsSeedingCoach] = useState(false)
    const [seedCoachMsg, setSeedCoachMsg] = useState("")

    const [isSeedingPlayer, setIsSeedingPlayer] = useState(false)
    const [seedPlayerMsg, setSeedPlayerMsg] = useState("")

    const { role, isAuthed, isLoading } = useAuth()
    const navigate = useNavigate()

    async function handleLogin(e) {
        e.preventDefault()
        setError("")

        try {
            await signInWithEmailAndPassword(auth, email, password)
            // DO NOT navigate here anymore
        } catch {
            setError("Invalid email or password")
        }
    }

    // 🔥 Auto-redirect based on role
    useEffect(() => {
        if (!isLoading && isAuthed && role) {
            if (role === "coach" || role === "player" || role === "parent") {
                navigate("/sessions")
            } else {
                navigate(`/${role}`)
            }
        }
    }, [isAuthed, role, isLoading, navigate])

    const handleSeedEmulatorAdmin = async () => {
        setSeedMsg("")
        setIsSeedingAdmin(true)
        try {
            await seedAdminUser()
            setSeedMsg("Success: Emulator Admin User seeded.")
        } catch (err) {
            console.error("❌ Seed emulator admin failed", err)
            setSeedMsg(`Error: ${err?.message || "Seed failed"}`)
        } finally {
            setIsSeedingAdmin(false)
        }
    }

    const handleSeedEmulatorCoach = async () => {
        setSeedCoachMsg("")
        setIsSeedingCoach(true)
        try {
            await seedCoachUser()
            setSeedCoachMsg("Success: Emulator Coach User seeded.")
        } catch (err) {
            console.error("❌ Seed emulator coach failed", err)
            setSeedCoachMsg(`Error: ${err?.message || "Seed failed"}`)
        } finally {
            setIsSeedingCoach(false)
        }
    }

    const handleSeedEmulatorPlayer = async () => {
        setSeedPlayerMsg("")
        setIsSeedingPlayer(true)
        try {
            await seedPlayerUser()
            setSeedPlayerMsg("Success: Emulator Player User seeded.")
        } catch (err) {
            console.error("❌ Seed emulator player failed", err)
            setSeedPlayerMsg(`Error: ${err?.message || "Seed failed"}`)
        } finally {
            setIsSeedingPlayer(false)
        }
    }

    return (
        <div style={{ maxWidth: "400px", margin: "60px auto" }}>
            <h2>Login</h2>

            <form
                onSubmit={handleLogin}
                style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                <button type="submit">Login</button>

                {error && (
                    <div style={{ color: "red", fontSize: "14px" }}>
                        {error}
                    </div>
                )}
            </form>

            {import.meta.env.VITE_USE_EMULATOR === 'true' && (
                <div style={{ marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #ddd", textAlign: "center", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div>
                        <button
                            onClick={handleSeedEmulatorAdmin}
                            disabled={isSeedingAdmin || isSeedingCoach || isSeedingPlayer}
                            style={{ padding: "10px", width: "100%", cursor: (isSeedingAdmin || isSeedingCoach || isSeedingPlayer) ? "not-allowed" : "pointer", background: isSeedingAdmin ? "#a0c4ff" : "#ffc107", color: "black", border: "none", borderRadius: "4px" }}
                        >
                            {isSeedingAdmin ? "Seeding..." : "Seed Emulator Admin"}
                        </button>
                        {seedMsg && (
                            <div style={{ marginTop: "5px", fontSize: "14px", color: seedMsg.startsWith("Error") ? "red" : "green" }}>
                                {seedMsg}
                            </div>
                        )}
                    </div>

                    <div>
                        <button
                            onClick={handleSeedEmulatorCoach}
                            disabled={isSeedingAdmin || isSeedingCoach || isSeedingPlayer}
                            style={{ padding: "10px", width: "100%", cursor: (isSeedingAdmin || isSeedingCoach || isSeedingPlayer) ? "not-allowed" : "pointer", background: isSeedingCoach ? "#a0c4ff" : "#28a745", color: "white", border: "none", borderRadius: "4px" }}
                        >
                            {isSeedingCoach ? "Seeding..." : "Seed Emulator Coach"}
                        </button>
                        {seedCoachMsg && (
                            <div style={{ marginTop: "5px", fontSize: "14px", color: seedCoachMsg.startsWith("Error") ? "red" : "green" }}>
                                {seedCoachMsg}
                            </div>
                        )}
                    </div>

                    <div>
                        <button
                            onClick={handleSeedEmulatorPlayer}
                            disabled={isSeedingAdmin || isSeedingCoach || isSeedingPlayer}
                            style={{ padding: "10px", width: "100%", cursor: (isSeedingAdmin || isSeedingCoach || isSeedingPlayer) ? "not-allowed" : "pointer", background: isSeedingPlayer ? "#a0c4ff" : "#17a2b8", color: "white", border: "none", borderRadius: "4px" }}
                        >
                            {isSeedingPlayer ? "Seeding..." : "Seed Emulator Player"}
                        </button>
                        {seedPlayerMsg && (
                            <div style={{ marginTop: "5px", fontSize: "14px", color: seedPlayerMsg.startsWith("Error") ? "red" : "green" }}>
                                {seedPlayerMsg}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}