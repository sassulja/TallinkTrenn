import React, { useState, useEffect } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth"
import { ref, get, update } from "firebase/database"
import { database } from "../services/firebase"
import { useAuth } from "../contexts/AuthContext"
import { LoadingSpinner } from "../components/UIHelpers"

export default function AcceptInvitePage() {
    const { user: currentUser, isLoading: isAuthLoading } = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const inviteId = searchParams.get("id")
    const inviteToken = searchParams.get("token")

    const [status, setStatus] = useState((!inviteId || !inviteToken) ? "invalid" : "loading") // loading | invalid | ready | processing | success
    const [invitation, setInvitation] = useState(null)
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [parentName, setParentName] = useState("")
    const [coachName, setCoachName] = useState("")
    const [playerName, setPlayerName] = useState("")
    const [errors, setErrors] = useState({})
    const [errorMsg, setErrorMsg] = useState("")

    // Redirect if already logged in
    useEffect(() => {
        if (!isAuthLoading && currentUser) {
            navigate("/")
        }
    }, [currentUser, isAuthLoading, navigate])

    // Load and validate invitation
    useEffect(() => {
        if (!inviteId || !inviteToken) return; // Already invalid due to missing params

        const fetchInvite = async () => {
            try {
                const snap = await get(ref(database, `invitations/${inviteId}`))
                if (!snap.exists()) {
                    setStatus("invalid")
                    return
                }
                const data = snap.val()

                if (data.token !== inviteToken) {
                    setStatus("invalid")
                    return
                }

                if (data.status !== "pending") {
                    setStatus("invalid")
                    return
                }

                const expiresAt = new Date(data.expiresAt)
                if (expiresAt < new Date()) {
                    setStatus("invalid")
                    return
                }

                if (data.type === "player" && data.playerName) {
                    setPlayerName(data.playerName)
                }

                setInvitation(data)
                setStatus("ready")

            } catch (err) {
                console.error("Failed to load invitation", err)
                setStatus("invalid")
            }
        }

        fetchInvite()
    }, [inviteId, inviteToken])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setErrorMsg("")

        const newErrors = {}
        if (!invitation.email) {
            newErrors.email = "E-post on kohustuslik"
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitation.email)) {
            newErrors.email = "Vigane e-posti aadress"
        }

        if (!password) {
            newErrors.password = "Parool on kohustuslik"
        } else if (password.length < 6) {
            newErrors.password = "Parool peab olema vähemalt 6 tähemärki"
        }

        if (invitation.type === "parent" && !parentName.trim()) {
            newErrors.parentName = "Nimi on kohustuslik"
        }
        if (invitation.type === "coach" && !coachName.trim()) {
            newErrors.coachName = "Nimi on kohustuslik"
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        if (password !== confirmPassword) {
            setErrors({ confirmPassword: "Paroolid ei kattu" })
            return
        }

        setStatus("processing")

        try {
            const auth = getAuth()

            let uid;
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, invitation.email, password)
                uid = userCredential.user.uid
            } catch (authErr) {
                if (authErr.code === "auth/email-already-in-use") {
                    setErrors({ email: "See e-posti aadress on juba kasutusel" })
                    setStatus("ready")
                    return
                }
                throw authErr
            }

            const nowIso = new Date().toISOString()
            const updates = {}

            // 2. Prepare payload for users/{uid} and parentLinks
            if (invitation.type === "player") {
                updates[`users/${uid}`] = {
                    role: "player",
                    email: invitation.email,
                    displayName: playerName,
                    playerId: invitation.playerId,
                    createdAt: nowIso
                }
            } else if (invitation.type === "parent") {
                updates[`users/${uid}`] = {
                    role: "parent",
                    email: invitation.email,
                    displayName: parentName.trim(),
                    createdAt: nowIso
                }

                if (invitation.playerIds) {
                    Object.keys(invitation.playerIds).forEach(pId => {
                        updates[`parentLinks/${uid}/${pId}`] = true
                    })
                }
            } else if (invitation.type === "coach") {
                updates[`users/${uid}`] = {
                    role: "coach",
                    email: invitation.email,
                    displayName: coachName.trim(),
                    createdAt: nowIso
                }
            }

            // Execute user/parentLinks updates first
            await update(ref(database), updates)

            // 3. Mark invite accepted
            await update(ref(database, `invitations/${inviteId}`), {
                status: "accepted",
                acceptedAt: nowIso,
                acceptedByUid: auth.currentUser.uid
            })

            setStatus("success")
            setTimeout(async () => {
                await signOut(auth)
                navigate("/login", { replace: true })
            }, 2000)

        } catch (err) {
            console.error("Failed to create account", err)
            setErrorMsg(err.message || "An error occurred creating the account.")
            setStatus("ready")
        }
    }

    if (isAuthLoading || status === "loading") {
        return <LoadingSpinner />
    }

    if (status === "invalid") {
        return (
            <div style={{ padding: "40px", maxWidth: "400px", margin: "0 auto", textAlign: "center" }}>
                <h2>Viga</h2>
                <p>Kutse on aegunud või kehtetu.</p>
                <button
                    onClick={() => navigate("/")}
                    style={{ padding: "8px 16px", marginTop: "20px", cursor: "pointer" }}
                >
                    Avalehele
                </button>
            </div>
        )
    }

    if (status === "success") {
        return (
            <div style={{ padding: "40px", maxWidth: "400px", margin: "0 auto", textAlign: "center", background: "#d4edda", borderRadius: "8px", color: "#155724" }}>
                <h2>Konto on loodud!</h2>
                <p>Suuname sisselogimise lehele...</p>
            </div>
        )
    }

    return (
        <div style={{ padding: "40px", maxWidth: "400px", margin: "0 auto", border: "1px solid #ddd", borderRadius: "8px", background: "#fdfdfd" }}>
            <h2>Loo konto</h2>
            <p style={{ color: "#555", marginBottom: "20px" }}>
                {invitation.type === "player" ? "Mängija konto loomine" : invitation.type === "coach" ? "Treeneri konto loomine" : "Lapsevanema konto loomine"}
            </p>

            {errorMsg && (
                <div style={{ background: "#ffebee", color: "#c62828", padding: "10px", marginBottom: "20px", borderRadius: "4px" }}>
                    {errorMsg}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                {invitation.type === "parent" && (
                    <div>
                        <label style={{ display: "block", marginBottom: "5px" }}>Nimi (Ees- ja perekonnanimi)</label>
                        <input
                            type="text"
                            value={parentName}
                            onChange={e => {
                                setParentName(e.target.value)
                                if (errors.parentName) setErrors({ ...errors, parentName: null })
                            }}
                            style={{ width: "100%", padding: "8px" }}
                            autoFocus
                        />
                        {errors.parentName && (
                            <div style={{ color: "#ef4444", fontSize: "13px", marginTop: "4px" }}>
                                {errors.parentName}
                            </div>
                        )}
                    </div>
                )}

                {invitation.type === "coach" && (
                    <div>
                        <label style={{ display: "block", marginBottom: "5px" }}>Nimi (Ees- ja perekonnanimi)</label>
                        <input
                            type="text"
                            value={coachName}
                            onChange={e => {
                                setCoachName(e.target.value)
                                if (errors.coachName) setErrors({ ...errors, coachName: null })
                            }}
                            style={{ width: "100%", padding: "8px" }}
                            autoFocus
                        />
                        {errors.coachName && (
                            <div style={{ color: "#ef4444", fontSize: "13px", marginTop: "4px" }}>
                                {errors.coachName}
                            </div>
                        )}
                    </div>
                )}

                {invitation.type === "player" && playerName && (
                    <div>
                        <label style={{ display: "block", marginBottom: "5px" }}>Nimi</label>
                        <input
                            type="text"
                            value={playerName}
                            readOnly
                            style={{ width: "100%", padding: "8px", background: "#e9ecef", color: "#495057", cursor: "not-allowed" }}
                        />
                    </div>
                )}

                <div>
                    <label style={{ display: "block", marginBottom: "5px" }}>Email</label>
                    <input
                        type="email"
                        value={invitation.email}
                        readOnly
                        style={{ width: "100%", padding: "8px", background: "#e9ecef", color: "#495057", cursor: "not-allowed" }}
                    />
                    {errors.email && (
                        <div style={{ color: "#ef4444", fontSize: "13px", marginTop: "4px" }}>
                            {errors.email}
                        </div>
                    )}
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "5px" }}>Parool (min 6 tähemärki)</label>
                    <input
                        type="password"
                        value={password}
                        onChange={e => {
                            setPassword(e.target.value)
                            if (errors.password) setErrors({ ...errors, password: null })
                        }}
                        style={{ width: "100%", padding: "8px" }}
                        autoFocus={invitation.type === "player"}
                    />
                    {errors.password && (
                        <div style={{ color: "#ef4444", fontSize: "13px", marginTop: "4px" }}>
                            {errors.password}
                        </div>
                    )}
                </div>

                <div>
                    <label style={{ display: "block", marginBottom: "5px" }}>Korda parooli</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={e => {
                            setConfirmPassword(e.target.value)
                            if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: null })
                        }}
                        style={{ width: "100%", padding: "8px" }}
                    />
                    {errors.confirmPassword && (
                        <div style={{ color: "#ef4444", fontSize: "13px", marginTop: "4px" }}>
                            {errors.confirmPassword}
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={status === "processing"}
                    style={{
                        padding: "10px",
                        background: status === "processing" ? "#aaa" : "#007bff",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: status === "processing" ? "not-allowed" : "pointer",
                        fontWeight: "bold",
                        marginTop: "10px"
                    }}
                >
                    {status === "processing" ? "Loon kontot..." : "Loo konto"}
                </button>
            </form>
        </div>
    )
}
