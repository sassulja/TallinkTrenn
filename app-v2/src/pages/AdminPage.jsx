import { useState, useEffect } from "react"
import { getAuth } from "firebase/auth"
import { ref, push, set, onValue, update } from "firebase/database"
import { database } from "../services/firebase"
import { generateInstancesForNext30Days } from "../services/instanceGenerator"
import { syncRostersForNext30Days } from "../services/rosterSync"
import { useAuth } from "../contexts/AuthContext"
import { ErrorMessage } from "../components/UIHelpers"

export default function AdminPage() {
    const { user: currentUser } = useAuth()
    // --- Player State ---
    const [firstName, setFirstName] = useState("")
    const [lastName, setLastName] = useState("")
    const [birthYear, setBirthYear] = useState("")
    const [fitnessGroup, setFitnessGroup] = useState("")
    const [wtn, setWtn] = useState("")
    const [players, setPlayers] = useState([])
    const [isSavingPlayer, setIsSavingPlayer] = useState(false)
    const [editingPlayerId, setEditingPlayerId] = useState(null)
    const [processingPlayerId, setProcessingPlayerId] = useState(null)

    // --- Parent Links State ---
    const [parentLinks, setParentLinks] = useState({})
    const [isAssigningParent, setIsAssigningParent] = useState(false)

    // --- Coach Permissions State ---
    const [coachPermissions, setCoachPermissions] = useState({})
    const [sessionDefinitions, setSessionDefinitions] = useState([])
    const [isUpdatingPermission, setIsUpdatingPermission] = useState(false)

    // --- Recurring Enrollments State ---
    const [recurringEnrollments, setRecurringEnrollments] = useState({})
    const [selectedDefId, setSelectedDefId] = useState("")
    const [enrollPlayerId, setEnrollPlayerId] = useState("")
    // Defaults to today for effectiveFrom
    const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split("T")[0])
    const [effectiveTo, setEffectiveTo] = useState("")
    const [isUpdatingEnrollment, setIsUpdatingEnrollment] = useState(false)

    // --- Recurring Changes State ---
    const [recurringChanges, setRecurringChanges] = useState({})
    const [changePlayerId, setChangePlayerId] = useState("")
    const [changeAction, setChangeAction] = useState("add") // "add" | "remove"
    const [changeEffectiveFrom, setChangeEffectiveFrom] = useState(new Date().toISOString().split("T")[0])
    const [changeEffectiveTo, setChangeEffectiveTo] = useState("")
    const [isUpdatingChange, setIsUpdatingChange] = useState(false)

    // --- Users State ---
    const [users, setUsers] = useState([])
    const [isUpdatingRole, setIsUpdatingRole] = useState(false)

    // --- Invitations State ---
    const [invitations, setInvitations] = useState({})
    const [inviteEmail, setInviteEmail] = useState("")
    const [inviteType, setInviteType] = useState("player") // "player" | "parent"
    const [invitePlayerId, setInvitePlayerId] = useState("")
    const [inviteParentPlayers, setInviteParentPlayers] = useState({})
    const [isCreatingInvite, setIsCreatingInvite] = useState(false)
    const [generatedInviteLink, setGeneratedInviteLink] = useState("")

    // --- Generator State ---
    const [isGenerating, setIsGenerating] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)

    // --- Message State ---
    const [msg, setMsg] = useState("")
    const [error, setError] = useState(null)
    const [errors, setErrors] = useState({})

    // --- Session Definition Form State ---
    const [defSport, setDefSport] = useState("tennis")
    const [defWeekday, setDefWeekday] = useState(1)
    const [defStartTime, setDefStartTime] = useState("")
    const [defEndTime, setDefEndTime] = useState("")
    const [defCapacity, setDefCapacity] = useState("")
    const [isSavingDef, setIsSavingDef] = useState(false)

    useEffect(() => {
        const handleErr = () => setError("Andmete laadimine ebaõnnestus.")

        // Subscribe to Players
        const playersRef = ref(database, "players")
        const unsubscribePlayers = onValue(playersRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val()
                const playerList = Object.keys(data).map(key => ({
                    playerId: key,
                    ...data[key]
                }))
                // Sort by createdAt descending
                playerList.sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
                    return dateB - dateA
                })
                setPlayers(playerList)
            } else {
                setPlayers([])
            }
        }, handleErr)

        // Subscribe to Users
        const usersRef = ref(database, "users")
        const unsubscribeUsers = onValue(usersRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val()
                const userList = Object.keys(data).map(key => ({
                    uid: key,
                    ...data[key]
                }))
                setUsers(userList)
            } else {
                setUsers([])
            }
        }, handleErr)

        // Subscribe to Parent Links
        const parentLinksRef = ref(database, "parentLinks")
        const unsubscribeParentLinks = onValue(parentLinksRef, (snapshot) => {
            if (snapshot.exists()) {
                setParentLinks(snapshot.val())
            } else {
                setParentLinks({})
            }
        }, handleErr)

        // Subscribe to Coach Permissions
        const coachPermissionsRef = ref(database, "coachPermissions")
        const unsubscribeCoachPermissions = onValue(coachPermissionsRef, (snapshot) => {
            if (snapshot.exists()) {
                setCoachPermissions(snapshot.val())
            } else {
                setCoachPermissions({})
            }
        }, handleErr)

        // Subscribe to Session Definitions
        const sessionDefsRef = ref(database, "sessionDefinitions")
        const unsubscribeSessionDefs = onValue(sessionDefsRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val()
                const list = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }))
                setSessionDefinitions(list)
            } else {
                setSessionDefinitions([])
            }
        }, handleErr)

        // Subscribe to Recurring Enrollments
        const enrollmentsRef = ref(database, "recurringEnrollments")
        const unsubscribeEnrollments = onValue(enrollmentsRef, (snapshot) => {
            if (snapshot.exists()) {
                setRecurringEnrollments(snapshot.val())
            } else {
                setRecurringEnrollments({})
            }
        }, handleErr)

        // Subscribe to Recurring Changes
        const changesRef = ref(database, "recurringChanges")
        const unsubscribeChanges = onValue(changesRef, (snapshot) => {
            if (snapshot.exists()) {
                setRecurringChanges(snapshot.val())
            } else {
                setRecurringChanges({})
            }
        }, handleErr)

        // Subscribe to Invitations
        const invitationsRef = ref(database, "invitations")
        const unsubscribeInvitations = onValue(invitationsRef, (snapshot) => {
            if (snapshot.exists()) {
                setInvitations(snapshot.val())
            } else {
                setInvitations({})
            }
        }, handleErr)

        return () => {
            unsubscribePlayers()
            unsubscribeUsers()
            unsubscribeParentLinks()
            unsubscribeCoachPermissions()
            unsubscribeSessionDefs()
            unsubscribeEnrollments()
            unsubscribeChanges()
            unsubscribeInvitations()
        }
    }, [])
    // --- Recurring Changes Handlers ---
    const handleCreateRecurringChange = async () => {
        setMsg("")
        if (!selectedDefId || !changePlayerId || !changeAction || !changeEffectiveFrom) {
            setMsg("Error: Definition, Player, Action, and Effective From date are required.")
            return
        }

        setIsUpdatingChange(true)
        try {
            const changesRef = ref(database, `recurringChanges/${selectedDefId}`)
            const newChangeRef = push(changesRef)

            const payload = {
                playerId: changePlayerId,
                action: changeAction,
                effectiveFrom: changeEffectiveFrom,
                effectiveTo: changeEffectiveTo || null,
                createdBy: currentUser.uid,
                createdAt: new Date().toISOString()
            }

            await set(newChangeRef, payload)
            setMsg(`Success: Player change (${changeAction}) created.`)

            // Partial reset
            setChangePlayerId("")
            setChangeEffectiveTo("")
        } catch (err) {
            console.error("❌ Creating change failed", err)
            setMsg(`Error: ${err?.message || "Creating change failed"}`)
        } finally {
            setIsUpdatingChange(false)
        }
    }

    // --- Recurring Enrollments Handlers ---
    const handleEnrollPlayer = async () => {
        setMsg("")
        if (!selectedDefId || !enrollPlayerId || !effectiveFrom) {
            setMsg("Error: Definition, Player, and Effective From date are required.")
            return
        }

        setIsUpdatingEnrollment(true)
        try {
            const updates = {}
            const path = `recurringEnrollments/${selectedDefId}/${enrollPlayerId}`
            updates[path] = {
                active: true,
                effectiveFrom: effectiveFrom,
                effectiveTo: effectiveTo || null
            }

            await update(ref(database), updates)
            setMsg("Success: Player enrolled.")

            // Reset form partly
            setEnrollPlayerId("")
            setEffectiveTo("")
        } catch (err) {
            console.error("❌ Enrollment failed", err)
            setMsg(`Error: ${err?.message || "Enrollment failed"}`)
        } finally {
            setIsUpdatingEnrollment(false)
        }
    }

    const handleDeactivateEnrollment = async (defId, playerId) => {
        setMsg("")
        setIsUpdatingEnrollment(true)
        try {
            const path = `recurringEnrollments/${defId}/${playerId}`
            const todayStr = new Date().toISOString().split("T")[0]

            // Atomic update dict dictating exact shape required for deactivation
            await update(ref(database), {
                [`${path}/active`]: false,
                [`${path}/effectiveTo`]: todayStr
            })
            setMsg("Success: Enrollment deactivated.")
        } catch (err) {
            console.error("❌ Deactivation failed", err)
            setMsg(`Error: ${err?.message || "Deactivation failed"}`)
        } finally {
            setIsUpdatingEnrollment(false)
        }
    }

    // --- Player Handlers ---
    const handleToggleGlobalCoachAccess = async (coachUid, currentGlobalStatus) => {
        setMsg("")
        setIsUpdatingPermission(true)
        try {
            await update(ref(database, `coachPermissions/${coachUid}`), {
                global: !currentGlobalStatus
            })
            setMsg(`Success: Global access ${!currentGlobalStatus ? "granted" : "revoked"} for coach.`)
        } catch (err) {
            console.error("❌ Global permission toggle failed", err)
            setMsg(`Error: ${err?.message || "Permission update failed"}`)
        } finally {
            setIsUpdatingPermission(false)
        }
    }

    const handleToggleCoachSessionDef = async (coachUid, defId, currentStatus) => {
        setMsg("")
        setIsUpdatingPermission(true)
        try {
            const path = `coachPermissions/${coachUid}/sessionDefinitions/${defId}`
            const value = currentStatus ? null : true

            const coachNode = coachPermissions[coachUid]
            const updates = {}
            updates[path] = value

            if (!coachNode || coachNode.global === undefined) {
                updates[`coachPermissions/${coachUid}/global`] = false
            }

            await update(ref(database), updates)
            setMsg(`Success: Session definition access ${!currentStatus ? "granted" : "revoked"}.`)
        } catch (err) {
            console.error("❌ Session def permission toggle failed", err)
            setMsg(`Error: ${err?.message || "Permission update failed"}`)
        } finally {
            setIsUpdatingPermission(false)
        }
    }

    // --- Player Handlers ---
    const handleCreateOrUpdatePlayer = async () => {
        setMsg("")
        setErrors({})
        const trimmedFirst = firstName.trim()
        const trimmedLast = lastName.trim()

        const newErrors = {}
        if (!trimmedFirst) newErrors.firstName = "Eesnimi on kohustuslik"
        if (!trimmedLast) newErrors.lastName = "Perenimi on kohustuslik"

        let parsedYear = null
        if (birthYear && String(birthYear).trim()) {
            parsedYear = parseInt(String(birthYear).trim(), 10)
            const currentYear = new Date().getFullYear()
            if (isNaN(parsedYear) || parsedYear < 1990 || parsedYear > 2100) {
                newErrors.birthYear = "Sünniaasta peab olema aastaarv (nt 2010)"
            } else if (parsedYear > currentYear) {
                newErrors.birthYear = "Sünniaasta ei saa olla tulevikus"
            }
        }

        let parsedWtn = null
        if (wtn && String(wtn).trim()) {
            let normalizedWtnStr = String(wtn).trim().replace(',', '.')
            if (!/^[0-9]+(\.[0-9]{1,2})?$/.test(normalizedWtnStr) || isNaN(parseFloat(normalizedWtnStr))) {
                newErrors.wtn = "WTN peab olema number"
            } else {
                parsedWtn = parseFloat(normalizedWtnStr).toFixed(2)
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        setIsSavingPlayer(true)
        try {
            const auth = getAuth()
            const uid = auth.currentUser?.uid
            if (!uid) {
                setMsg("Error: Not logged in (admin required).")
                setIsSavingPlayer(false)
                return
            }

            // 1) Target ID
            const targetId = editingPlayerId || push(ref(database, "players")).key

            // 4) Validate Fitness Group (already validated above with newErrors)

            // 4) Validate Fitness Group
            let finalFitGroup = null
            if (fitnessGroup) {
                if (!["A", "B", "C", "D"].includes(fitnessGroup)) {
                    throw new Error("Fitness group must be A, B, C, or D.")
                }
                finalFitGroup = fitnessGroup
            }

            // Build payload exactly to schema
            const playerData = {
                firstName: trimmedFirst,
                lastName: trimmedLast,
                birthYear: parsedYear,
                wtn: parsedWtn,
                fitnessGroup: finalFitGroup
            }

            if (editingPlayerId) {
                // Update existing
                await update(ref(database, `players/${targetId}`), playerData)
                setMsg(`Success: Player updated: ${trimmedFirst} ${trimmedLast}`)
            } else {
                // Create new
                playerData.active = true
                playerData.createdAt = new Date().toISOString()
                await set(ref(database, `players/${targetId}`), playerData)
                setMsg(`Success: Player created: ${trimmedFirst} ${trimmedLast}`)
            }

            resetPlayerForm()

        } catch (err) {
            console.error("❌ Player save failed", err)
            setMsg(`Error: ${err?.code || err?.message || "Unknown error"}`)
        } finally {
            setIsSavingPlayer(false)
        }
    }

    const handleEditPlayerClick = (p) => {
        setEditingPlayerId(p.playerId)
        setFirstName(p.firstName || "")
        setLastName(p.lastName || "")
        setBirthYear(p.birthYear || "")
        setFitnessGroup(p.fitnessGroup || "")
        setWtn(p.wtn || "")
        setMsg("")
    }

    const resetPlayerForm = () => {
        setEditingPlayerId(null)
        setFirstName("")
        setLastName("")
        setBirthYear("")
        setFitnessGroup("")
        setWtn("")
        setErrors({})
    }

    const handleTogglePlayerActive = async (playerId, currentActiveStatus) => {
        setMsg("")
        setProcessingPlayerId(playerId)
        try {
            await update(ref(database, `players/${playerId}`), { active: !currentActiveStatus })
            setMsg(`Success: Player ${!currentActiveStatus ? "reactivated" : "deactivated"}.`)
        } catch (err) {
            console.error(`❌ ${!currentActiveStatus ? "Reactivation" : "Deactivation"} failed`, err)
            setMsg(`Error: ${err?.message || "Action failed"}`)
        } finally {
            setProcessingPlayerId(null)
        }
    }

    const handleAssignParent = async (playerId, parentUid) => {
        if (!parentUid) return
        setMsg("")
        setIsAssigningParent(true)
        try {
            await set(ref(database, `parentLinks/${parentUid}/${playerId}`), true)
            setMsg("Success: Parent assigned to player.")
        } catch (err) {
            console.error("❌ Array link failed", err)
            setMsg(`Error: ${err?.message || "Failed to link parent"}`)
        } finally {
            setIsAssigningParent(false)
        }
    }

    const handleRemoveParent = async (playerId, parentUid) => {
        setMsg("")
        try {
            await set(ref(database, `parentLinks/${parentUid}/${playerId}`), null)
            setMsg("Success: Parent link removed.")
        } catch (err) {
            console.error("❌ Remove link failed", err)
            setMsg(`Error: ${err?.message || "Failed to remove link"}`)
        }
    }

    const handleSeedPlayers = async () => {
        try {
            const updates = {}
            for (let i = 1; i <= 3; i++) {
                const testId = push(ref(database, "players")).key
                updates[`players/${testId}`] = {
                    firstName: `Player`,
                    lastName: `${i}`,
                    active: true,
                    createdAt: new Date().toISOString()
                }
            }
            await update(ref(database), updates)
            setMsg("Success: Seeded 3 test players.")
        } catch (err) {
            console.error("❌ Seeding failed", err)
            setMsg(`Error: ${err?.code || err?.message || "Unknown error"}`)
        }
    }

    // --- User Handlers ---
    const handleUpdateUserRole = async (uid, newRole) => {
        setMsg("")
        setIsUpdatingRole(true)
        try {
            const auth = getAuth()
            const adminUid = auth.currentUser?.uid
            if (!adminUid) {
                setMsg("Error: Not logged in.")
                return
            }

            if (uid === currentUser?.uid) {
                setMsg("Error: You cannot change your own role.")
                return
            }

            const updates = {}
            updates[`users/${uid}/role`] = newRole

            if (newRole !== "coach") {
                updates[`coachPermissions/${uid}`] = null
            }

            await update(ref(database), updates)

            setMsg(`Success: Updated role for user to ${newRole}`)
        } catch (err) {
            console.error("❌ Role update failed", err)
            setMsg(`Error: ${err?.message || "Role update failed"}`)
        } finally {
            setIsUpdatingRole(false)
        }
    }

    // --- Generator Handlers ---
    const handleGenerateInstances = async () => {
        setMsg("")
        setIsGenerating(true)
        try {
            const { newCount, skippedCount } = await generateInstancesForNext30Days()
            setMsg(`Success: Generated ${newCount} new instances, skipped ${skippedCount} existing instances.`)
        } catch (err) {
            console.error("❌ Generator failed", err)
            setMsg(`Error: ${err?.message || "Generator failed"}`)
        } finally {
            setIsGenerating(false)
        }
    }

    const handleSyncRosters = async () => {
        setMsg("")
        setIsSyncing(true)
        try {
            const auth = getAuth()
            const uid = auth.currentUser?.uid
            if (!uid) {
                setMsg("Error: Not logged in. Cannot run sync.")
                return
            }

            const result = await syncRostersForNext30Days(uid)
            setMsg(`Success: Roster Sync complete. Added: ${result.added}, Removed: ${result.removed}, Skipped Protected: ${result.skippedProtected}, Instances Processed: ${result.instancesProcessed}`)
        } catch (err) {
            console.error("❌ Roster Sync failed", err)
            setMsg(`Error: ${err?.message || "Roster Sync failed"}`)
        } finally {
            setIsSyncing(false)
        }
    }

    const handleCreateSessionDef = async () => {
        setMsg("")
        setErrors({})

        const newErrors = {}
        if (!defSport) {
            newErrors.defSport = "Spordiala on kohustuslik"
        }
        if (!defStartTime || !defEndTime) {
            newErrors.defTime = "Kellaaeg on kohustuslik"
        } else if (defEndTime <= defStartTime) {
            newErrors.defTime = "Lõpuaeg peab olema pärast algusaega"
        }

        const capNum = parseInt(defCapacity, 10)
        if (!defCapacity || isNaN(capNum) || capNum <= 0) {
            newErrors.defCapacity = "Mahtuvus peab olema positiivne arv"
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        setIsSavingDef(true)
        try {
            const defsRef = ref(database, "sessionDefinitions")
            const newDefRef = push(defsRef)

            // Get tomorrow's weekday so it's guaranteed in the next 30 days
            const tomorrow = new Date(Date.now() + 86400000)
            let defaultWeekday = tomorrow.getDay() // 0=Sun, 1=Mon...
            if (defaultWeekday === 0) defaultWeekday = 7

            await set(newDefRef, {
                sport: defSport,
                weekday: defWeekday ? Number(defWeekday) : defaultWeekday,
                startTime: defStartTime,
                endTime: defEndTime,
                capacity: capNum,
                assignedCoachIds: {
                    // Usually assigned via coach permissions, so leave empty
                },
                active: true,
                createdAt: new Date().toISOString(),
                createdBy: currentUser?.uid || "admin_test"
            })
            setMsg(`Success: Session definition created.`)
            
            setDefStartTime("")
            setDefEndTime("")
            setDefCapacity("")
        } catch (err) {
            console.error("❌ Create session definition failed", err)
            setMsg(`Error: ${err?.message || "Create session definition failed"}`)
        } finally {
            setIsSavingDef(false)
        }
    }

    // --- Invitation Handlers ---
    const handleCreateInvitation = async () => {
        setMsg("")
        setGeneratedInviteLink("")
        setErrors({})
        const email = inviteEmail.trim()
        
        const newErrors = {}

        if (!email) {
            setMsg("Error: Email is required.")
            return
        }

        let payloadPlayerId = null
        let payloadPlayerIds = null
        let payloadPlayerName = null

        if (inviteType === "player") {
            if (!invitePlayerId) {
                newErrors.invitePlayerId = "Vali mängija"
            } else {
                const hasPending = Object.values(invitations).find(inv => inv.playerId === invitePlayerId && inv.status === "pending" && inv.type === "player")
                if (hasPending) {
                    newErrors.invitePlayerId = "Sellel mängijal on juba aktiivne kutse"
                }
            }
            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors)
                return
            }

            payloadPlayerId = invitePlayerId
            const selectedPlayer = players.find(p => p.playerId === invitePlayerId)
            if (selectedPlayer) {
                payloadPlayerName = `${selectedPlayer.firstName} ${selectedPlayer.lastName}`
            }
        } else if (inviteType === "parent") {
            const selectedCount = Object.keys(inviteParentPlayers).filter(id => inviteParentPlayers[id]).length
            if (selectedCount === 0) {
                newErrors.inviteParentPlayers = "Vali vähemalt üks mängija"
            }
            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors)
                return
            }
            payloadPlayerIds = inviteParentPlayers
        }

        setIsCreatingInvite(true)
        try {
            const token = crypto.randomUUID()
            const now = Date.now()
            const expiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()

            const payload = {
                type: inviteType,
                role: inviteType,
                email: email,
                playerId: payloadPlayerId,
                playerName: payloadPlayerName,
                playerIds: payloadPlayerIds,
                status: "pending",
                token: token,
                createdAt: new Date(now).toISOString(),
                expiresAt: expiresAt,
                acceptedAt: null,
                acceptedByUid: null
            }

            const newInviteRef = push(ref(database, "invitations"))
            await set(newInviteRef, payload)

            const link = `${window.location.origin}/accept-invite?id=${newInviteRef.key}&token=${token}`
            setGeneratedInviteLink(link)
            setMsg("Success: Invitation created.")

            // Partial reset
            setInviteEmail("")
            setInvitePlayerId("")
            setInviteParentPlayers({})

        } catch (err) {
            console.error("❌ Invitation creation failed", err)
            setMsg(`Error: ${err?.message || "Creation failed"}`)
        } finally {
            setIsCreatingInvite(false)
        }
    }

    const handleExpireInvitation = async (inviteId) => {
        setMsg("")
        try {
            await update(ref(database, `invitations/${inviteId}`), { status: "expired" })
            setMsg("Success: Invitation marked as expired.")
        } catch (err) {
            console.error("❌ Invitation expiration failed", err)
            setMsg(`Error: ${err?.message || "Expiration failed"}`)
        }
    }

    return (
        <div style={{ padding: "20px" }}>
            <h2>Admin Page</h2>

            {error && <ErrorMessage message={error} />}

            {msg && (
                <div style={{
                    marginBottom: "20px",
                    padding: "10px",
                    background: msg.startsWith("Error") ? "#ffebee" : "#e8f5e9",
                    color: msg.startsWith("Error") ? "#c62828" : "#2e7d32",
                    borderRadius: "4px"
                }}>
                    {msg}
                </div>
            )}

            <div style={{ display: "flex", gap: "12px", marginBottom: "30px", paddingBottom: "20px", borderBottom: "1px solid #ddd" }}>
                <button
                    onClick={handleGenerateInstances}
                    disabled={isGenerating || isSyncing}
                    style={{ padding: "10px", cursor: (isGenerating || isSyncing) ? "not-allowed" : "pointer", background: isGenerating ? "#a0c4ff" : "#007bff", color: "white", border: "none", borderRadius: "4px" }}
                >
                    {isGenerating ? "Generating..." : "Generate Instances (Next 30 Days)"}
                </button>
                <button
                    onClick={handleSyncRosters}
                    disabled={isGenerating || isSyncing}
                    style={{ padding: "10px", cursor: (isGenerating || isSyncing) ? "not-allowed" : "pointer", background: isSyncing ? "#a0c4ff" : "#17a2b8", color: "white", border: "none", borderRadius: "4px" }}
                >
                    {isSyncing ? "Syncing..." : "Sync Rosters (Next 30 Days)"}
                </button>
            </div>

            <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>

                {/* ---------- PLAYERS ---------- */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: "350px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ margin: 0 }}>{editingPlayerId ? "Edit Player" : "Create Player"}</h3>
                        <div style={{ display: "flex", gap: "8px" }}>
                            {editingPlayerId && (
                                <button
                                    onClick={resetPlayerForm}
                                    style={{ padding: "4px 8px", fontSize: "12px", background: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                                >
                                    Cancel Edit
                                </button>
                            )}
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: "12px" }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: "block", marginBottom: "4px" }}>First Name *</label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={e => {
                                    setFirstName(e.target.value)
                                    if (errors.firstName) setErrors({ ...errors, firstName: null })
                                }}
                                placeholder="e.g. John"
                                style={{ width: "100%", padding: "8px" }}
                            />
                            {errors.firstName && (
                                <div style={{ color: "#ef4444", fontSize: "13px", marginTop: "4px" }}>
                                    {errors.firstName}
                                </div>
                            )}
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: "block", marginBottom: "4px" }}>Last Name *</label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={e => {
                                    setLastName(e.target.value)
                                    if (errors.lastName) setErrors({ ...errors, lastName: null })
                                }}
                                placeholder="e.g. Doe"
                                style={{ width: "100%", padding: "8px" }}
                            />
                            {errors.lastName && (
                                <div style={{ color: "#ef4444", fontSize: "13px", marginTop: "4px" }}>
                                    {errors.lastName}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: "block", marginBottom: "4px" }}>Birth Year</label>
                        <input
                            type="number"
                            value={birthYear}
                            onChange={e => {
                                setBirthYear(e.target.value)
                                if (errors.birthYear) setErrors({ ...errors, birthYear: null })
                            }}
                            placeholder="e.g. 2012"
                            style={{ width: "100%", padding: "8px" }}
                        />
                        {errors.birthYear && (
                            <div style={{ color: "#ef4444", fontSize: "13px", marginTop: "4px" }}>
                                {errors.birthYear}
                            </div>
                        )}
                    </div>

                    <div>
                        <label style={{ display: "block", marginBottom: "4px" }}>Fitness Group</label>
                        <select
                            value={fitnessGroup}
                            onChange={e => setFitnessGroup(e.target.value)}
                            style={{ width: "100%", padding: "8px" }}
                        >
                            <option value="">(None)</option>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: "block", marginBottom: "4px" }}>WTN</label>
                        <input
                            type="text"
                            value={wtn}
                            onChange={e => {
                                const val = e.target.value;
                                if (val === "" || /^[0-9]*[.,]?[0-9]{0,2}$/.test(val)) {
                                    setWtn(val);
                                }
                                if (errors.wtn) setErrors({ ...errors, wtn: null })
                            }}
                            placeholder="e.g. 32.10"
                            style={{ width: "100%", padding: "8px" }}
                        />
                        {errors.wtn && (
                            <div style={{ color: "#ef4444", fontSize: "13px", marginTop: "4px" }}>
                                {errors.wtn}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleCreateOrUpdatePlayer}
                        disabled={isSavingPlayer}
                        style={{
                            padding: "10px",
                            marginTop: "8px",
                            cursor: isSavingPlayer ? "not-allowed" : "pointer",
                            background: isSavingPlayer ? "#a0c4ff" : (editingPlayerId ? "#28a745" : "#007bff"),
                            color: "white",
                            border: "none",
                            borderRadius: "4px"
                        }}
                    >
                        {isSavingPlayer ? "Saving..." : (editingPlayerId ? "Update Player" : "Create Player")}
                    </button>

                    <h3 style={{ marginTop: "20px" }}>Players List</h3>
                    <div style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #ccc", borderRadius: "4px" }}>
                        {players.length === 0 ? (
                            <div style={{ padding: "10px", color: "#666" }}>No players found.</div>
                        ) : (
                            players.map(p => {
                                // Find parents for this player
                                const playerParents = Object.keys(parentLinks).filter(parentUid => parentLinks[parentUid][p.playerId] === true)
                                // Parent users list for dropdown
                                const parentUsers = users.filter(u => u.role === "parent")

                                return (
                                    <div key={p.playerId} style={{ padding: "10px", borderBottom: "1px solid #eee", fontSize: "14px", opacity: p.active ? 1 : 0.5 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                            <div>
                                                <div style={{ fontWeight: "bold" }}>
                                                    {p.firstName} {p.lastName} {(!p.active) && <span style={{ color: "#dc3545", marginLeft: "8px" }}>(Deactivated)</span>}
                                                </div>
                                                <div style={{ color: "#555", marginTop: "4px", fontSize: "12px" }}>
                                                    {p.birthYear && `Born: ${p.birthYear} `}
                                                    {p.fitnessGroup && `| Füss: ${p.fitnessGroup} `}
                                                    | WTN: {p.wtn != null ? Number(p.wtn).toFixed(2) : "—"}
                                                </div>
                                                <div style={{ color: "#999", fontSize: "10px", marginTop: "2px", fontFamily: "monospace" }}>
                                                    ID: {p.playerId}
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", gap: "8px" }}>
                                                {p.active && (
                                                    <button onClick={() => window.location.href = `/admin/player/${p.playerId}/stats`} style={{ cursor: "pointer", background: "transparent", border: "1px solid #17a2b8", color: "#17a2b8", borderRadius: "4px", padding: "4px 8px", fontSize: "12px", textDecoration: "none" }}>Statistika</button>
                                                )}
                                                {p.active && (
                                                    <button onClick={() => handleEditPlayerClick(p)} style={{ cursor: "pointer", background: "transparent", border: "1px solid #007bff", color: "#007bff", borderRadius: "4px", padding: "4px 8px", fontSize: "12px" }}>Edit</button>
                                                )}
                                                <button
                                                    onClick={() => handleTogglePlayerActive(p.playerId, p.active)}
                                                    disabled={processingPlayerId === p.playerId}
                                                    style={{
                                                        cursor: processingPlayerId === p.playerId ? "not-allowed" : "pointer",
                                                        background: "transparent",
                                                        border: `1px solid ${p.active ? "#dc3545" : "#28a745"}`,
                                                        color: p.active ? "#dc3545" : "#28a745",
                                                        borderRadius: "4px",
                                                        padding: "4px 8px",
                                                        fontSize: "12px",
                                                        opacity: processingPlayerId === p.playerId ? 0.5 : 1
                                                    }}
                                                >
                                                    {processingPlayerId === p.playerId ? (p.active ? "Deactivating..." : "Reactivating...") : (p.active ? "Deactivate" : "Reactivate")}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Parents Section */}
                                        <div style={{ marginTop: "12px", padding: "8px", background: "#f8f9fa", borderRadius: "4px" }}>
                                            <div style={{ fontWeight: "bold", fontSize: "12px", marginBottom: "8px", color: "#666" }}>Parents / Guardians</div>

                                            {playerParents.length > 0 ? (
                                                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "8px" }}>
                                                    {playerParents.map(parentUid => {
                                                        const userObj = users.find(u => u.uid === parentUid)
                                                        const label = userObj ? `${userObj.displayName} (${userObj.email})` : `Unknown User: ${parentUid}`
                                                        return (
                                                            <div key={parentUid} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", background: "white", padding: "4px 8px", border: "1px solid #ddd", borderRadius: "4px" }}>
                                                                <span>{label}</span>
                                                                <button onClick={() => handleRemoveParent(p.playerId, parentUid)} style={{ border: "none", background: "transparent", color: "#dc3545", cursor: "pointer", fontSize: "16px", lineHeight: "12px", padding: "0 4px" }}>&times;</button>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: "12px", color: "#999", marginBottom: "8px" }}>No parents linked.</div>
                                            )}

                                            <div style={{ display: "flex", gap: "8px" }}>
                                                <select id={`parent-select-${p.playerId}`} style={{ flex: 1, padding: "4px", fontSize: "12px" }} defaultValue="">
                                                    <option value="" disabled>Assign new parent...</option>
                                                    {parentUsers.map(u => (
                                                        <option key={u.uid} value={u.uid} disabled={playerParents.includes(u.uid)}>{u.displayName} ({u.email})</option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => {
                                                        const selectEl = document.getElementById(`parent-select-${p.playerId}`);
                                                        if (selectEl && selectEl.value) {
                                                            handleAssignParent(p.playerId, selectEl.value);
                                                            selectEl.value = "";
                                                        }
                                                    }}
                                                    disabled={isAssigningParent}
                                                    style={{ padding: "4px 8px", fontSize: "12px", background: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: isAssigningParent ? "not-allowed" : "pointer" }}
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* ---------- USERS ---------- */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: "350px", borderLeft: "1px solid #ddd", paddingLeft: "40px" }}>
                    <h3 style={{ margin: 0 }}>Role Manager</h3>
                    <div style={{ maxHeight: "600px", overflowY: "auto", border: "1px solid #ccc", borderRadius: "4px" }}>
                        {users.length === 0 ? (
                            <div style={{ padding: "10px", color: "#666" }}>No users found.</div>
                        ) : (
                            users.map(u => (
                                <div key={u.uid} style={{ padding: "10px", borderBottom: "1px solid #eee", fontSize: "14px" }}>
                                    <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                                        {u.displayName || "Unknown Name"}
                                    </div>
                                    <div style={{ color: "#555", fontSize: "12px", marginBottom: "8px" }}>
                                        {u.email || "No Email"}
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <label style={{ fontSize: "12px" }}>Role:</label>
                                        <select
                                            value={u.role || "player"}
                                            onChange={(e) => handleUpdateUserRole(u.uid, e.target.value)}
                                            disabled={isUpdatingRole || u.uid === currentUser?.uid}
                                            style={{ padding: "4px", fontSize: "12px", borderRadius: "4px", border: "1px solid #ccc", cursor: (isUpdatingRole || u.uid === currentUser?.uid) ? "not-allowed" : "pointer", opacity: u.uid === currentUser?.uid ? 0.6 : 1 }}
                                        >
                                            <option value="player">player</option>
                                            <option value="parent">parent</option>
                                            <option value="coach">coach</option>
                                            <option value="admin">admin</option>
                                        </select>

                                        {u.uid === currentUser?.uid && (
                                            <div style={{ color: "red", fontSize: "10px", marginTop: "4px" }}>
                                                You cannot change your own role
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ---------- COACH PERMISSIONS ---------- */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: "350px", borderLeft: "1px solid #ddd", paddingLeft: "40px" }}>
                    <h3 style={{ margin: 0 }}>Coach Permissions</h3>
                    <div style={{ maxHeight: "600px", overflowY: "auto", border: "1px solid #ccc", borderRadius: "4px", padding: "10px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {users.filter(u => u.role === "coach").length === 0 ? (
                            <div style={{ color: "#666" }}>No active coaches found.</div>
                        ) : (
                            users.filter(u => u.role === "coach").map(u => {
                                const perms = coachPermissions[u.uid] || { global: false, sessionDefinitions: {} }
                                const globalAccess = !!perms.global
                                const allowedDefs = perms.sessionDefinitions || {}

                                return (
                                    <div key={u.uid} style={{ border: "1px solid #eee", padding: "10px", borderRadius: "4px" }}>
                                        <div style={{ fontWeight: "bold" }}>{u.displayName || "Unknown Name"}</div>
                                        <div style={{ fontSize: "12px", color: "#555" }}>({u.email})</div>
                                        <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                                            <input
                                                type="checkbox"
                                                checked={globalAccess}
                                                onChange={() => handleToggleGlobalCoachAccess(u.uid, globalAccess)}
                                                disabled={isUpdatingPermission}
                                            />
                                            <label style={{ fontSize: "14px", fontWeight: "bold" }}>Global Access (All Sessions)</label>
                                        </div>
                                        <div style={{ marginTop: "8px", fontSize: "12px", color: "#555" }}>
                                            <strong>Specific Session Definitions:</strong>
                                            {sessionDefinitions.filter(d => d.active).length === 0 ? (
                                                <div style={{ marginTop: "4px", fontStyle: "italic" }}>No active session definitions exist yet.</div>
                                            ) : (
                                                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                                                    {sessionDefinitions.filter(d => d.active).map(def => {
                                                        const isAllowed = !!allowedDefs[def.id]
                                                        return (
                                                            <label key={def.id} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isAllowed}
                                                                    onChange={() => handleToggleCoachSessionDef(u.uid, def.id, isAllowed)}
                                                                    disabled={isUpdatingPermission || globalAccess}
                                                                />
                                                                <span style={{ opacity: globalAccess ? 0.5 : 1 }}>
                                                                    {def.sport} | Day {def.weekday} | {def.startTime}-{def.endTime}
                                                                </span>
                                                            </label>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* ---------- RECURRING ENROLLMENTS ---------- */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: "350px", borderLeft: "1px solid #ddd", paddingLeft: "40px" }}>
                    <h3 style={{ margin: 0 }}>Recurring Enrollments</h3>

                    <div>
                        <label style={{ display: "block", marginBottom: "4px", fontSize: "14px", fontWeight: "bold" }}>Select Session Definition</label>
                        <select
                            value={selectedDefId}
                            onChange={(e) => setSelectedDefId(e.target.value)}
                            style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc" }}
                        >
                            <option value="">-- Select a Definition --</option>
                            {sessionDefinitions.filter(d => d.active).map(def => (
                                <option key={def.id} value={def.id}>
                                    {def.sport} | Day {def.weekday} | {def.startTime}-{def.endTime}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedDefId && (
                        <>
                            <div style={{ marginTop: "12px" }}>
                                <h4 style={{ margin: "0 0 8px 0" }}>Currently Enrolled</h4>
                                <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #ccc", borderRadius: "4px", padding: "8px" }}>
                                    {!recurringEnrollments[selectedDefId] || Object.keys(recurringEnrollments[selectedDefId]).length === 0 ? (
                                        <span style={{ color: "#666", fontSize: "14px" }}>No players enrolled.</span>
                                    ) : (
                                        Object.entries(recurringEnrollments[selectedDefId]).map(([pId, record]) => {
                                            const pData = players.find(p => p.playerId === pId)
                                            const name = pData ? `${pData.firstName} ${pData.lastName}` : `Unknown (${pId})`
                                            return (
                                                <div key={pId} style={{
                                                    padding: "8px",
                                                    borderBottom: "1px solid #eee",
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    gap: "4px",
                                                    opacity: record.active ? 1 : 0.5,
                                                    background: record.active ? "white" : "#f8f9fa"
                                                }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                        <strong style={{ fontSize: "14px" }}>
                                                            {name} {!record.active && "(Deactivated)"}
                                                        </strong>
                                                        {record.active && (
                                                            <button
                                                                onClick={() => handleDeactivateEnrollment(selectedDefId, pId)}
                                                                disabled={isUpdatingEnrollment}
                                                                style={{ padding: "4px 8px", fontSize: "10px", cursor: isUpdatingEnrollment ? "not-allowed" : "pointer", background: "#dc3545", color: "white", border: "none", borderRadius: "4px" }}
                                                            >
                                                                End
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: "11px", color: "#555" }}>
                                                        From: {record.effectiveFrom || "N/A"} | To: {record.effectiveTo || "none"}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>

                            <div style={{ marginTop: "16px", padding: "12px", background: "#f8f9fa", border: "1px solid #ddd", borderRadius: "4px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                <h4 style={{ margin: 0 }}>Enroll Player</h4>

                                <div>
                                    <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>Player (Active Only)</label>
                                    <select
                                        value={enrollPlayerId}
                                        onChange={e => setEnrollPlayerId(e.target.value)}
                                        style={{ width: "100%", padding: "6px", fontSize: "12px" }}
                                    >
                                        <option value="">-- Select Player --</option>
                                        {players.filter(p => p.active).map(p => (
                                            <option key={p.playerId} value={p.playerId}>
                                                {p.firstName} {p.lastName}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: "flex", gap: "8px" }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>Effective From *</label>
                                        <input
                                            type="date"
                                            value={effectiveFrom}
                                            onChange={e => setEffectiveFrom(e.target.value)}
                                            style={{ width: "100%", padding: "6px", fontSize: "12px" }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>Effective To</label>
                                        <input
                                            type="date"
                                            value={effectiveTo}
                                            onChange={e => setEffectiveTo(e.target.value)}
                                            style={{ width: "100%", padding: "6px", fontSize: "12px" }}
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleEnrollPlayer}
                                    disabled={!enrollPlayerId || !effectiveFrom || isUpdatingEnrollment}
                                    style={{
                                        padding: "8px",
                                        marginTop: "4px",
                                        background: (!enrollPlayerId || !effectiveFrom || isUpdatingEnrollment) ? "#a0c4ff" : "#28a745",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: (!enrollPlayerId || !effectiveFrom || isUpdatingEnrollment) ? "not-allowed" : "pointer"
                                    }}
                                >
                                    Confirm Enrollment
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* ---------- RECURRING CHANGES ---------- */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: "350px", borderLeft: "1px solid #ddd", paddingLeft: "40px" }}>
                    <h3 style={{ margin: 0 }}>Recurring Changes</h3>
                    {!selectedDefId ? (
                        <div style={{ color: "#666", fontSize: "14px", marginTop: "4px" }}>Select a Session Definition in the Enrollments column first.</div>
                    ) : (
                        <>
                            <div style={{ marginTop: "12px" }}>
                                <h4 style={{ margin: "0 0 8px 0" }}>Change History</h4>
                                <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #ccc", borderRadius: "4px", padding: "8px" }}>
                                    {!recurringChanges[selectedDefId] || Object.keys(recurringChanges[selectedDefId]).length === 0 ? (
                                        <span style={{ color: "#666", fontSize: "14px" }}>No changes recorded.</span>
                                    ) : (
                                        Object.entries(recurringChanges[selectedDefId])
                                            .sort(([, a], [, b]) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                            .map(([changeId, record]) => {
                                                const pData = players.find(p => p.playerId === record.playerId)
                                                const name = pData ? `${pData.firstName} ${pData.lastName}` : `Unknown (${record.playerId})`
                                                const isAdd = record.action === "add"

                                                return (
                                                    <div key={changeId} style={{
                                                        padding: "8px",
                                                        marginBottom: "4px",
                                                        borderTop: "3px solid",
                                                        borderTopColor: isAdd ? "#28a745" : "#dc3545",
                                                        background: "#fdfdfd",
                                                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                                                    }}>
                                                        <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                                                            {name}
                                                        </div>
                                                        <div style={{ fontSize: "12px", fontWeight: "bold", color: isAdd ? "#28a745" : "#dc3545", marginTop: "2px" }}>
                                                            {record.action.toUpperCase()}
                                                        </div>
                                                        <div style={{ fontSize: "11px", color: "#555", marginTop: "4px" }}>
                                                            From: {record.effectiveFrom} | To: {record.effectiveTo || "none"}
                                                        </div>
                                                        <div style={{ fontSize: "9px", color: "#999", marginTop: "4px" }}>
                                                            Logged: {new Date(record.createdAt).toLocaleString("et-EE")}
                                                        </div>
                                                    </div>
                                                )
                                            })
                                    )}
                                </div>
                            </div>

                            <div style={{ marginTop: "16px", padding: "12px", background: "#f8f9fa", border: "1px solid #ddd", borderRadius: "4px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                <h4 style={{ margin: 0 }}>Add Change</h4>

                                <div>
                                    <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>Player (Active Only)</label>
                                    <select
                                        value={changePlayerId}
                                        onChange={e => setChangePlayerId(e.target.value)}
                                        style={{ width: "100%", padding: "6px", fontSize: "12px" }}
                                    >
                                        <option value="">-- Select Player --</option>
                                        {players.filter(p => p.active).map(p => (
                                            <option key={p.playerId} value={p.playerId}>
                                                {p.firstName} {p.lastName}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>Action *</label>
                                    <select
                                        value={changeAction}
                                        onChange={e => setChangeAction(e.target.value)}
                                        style={{ width: "100%", padding: "6px", fontSize: "12px" }}
                                    >
                                        <option value="add">Add</option>
                                        <option value="remove">Remove</option>
                                    </select>
                                </div>

                                <div style={{ display: "flex", gap: "8px" }}>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>Effective From *</label>
                                        <input
                                            type="date"
                                            value={changeEffectiveFrom}
                                            onChange={e => setChangeEffectiveFrom(e.target.value)}
                                            style={{ width: "100%", padding: "6px", fontSize: "12px" }}
                                        />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>Effective To</label>
                                        <input
                                            type="date"
                                            value={changeEffectiveTo}
                                            onChange={e => setChangeEffectiveTo(e.target.value)}
                                            style={{ width: "100%", padding: "6px", fontSize: "12px" }}
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleCreateRecurringChange}
                                    disabled={!changePlayerId || !changeAction || !changeEffectiveFrom || isUpdatingChange}
                                    style={{
                                        padding: "8px",
                                        marginTop: "4px",
                                        background: (!changePlayerId || !changeAction || !changeEffectiveFrom || isUpdatingChange) ? "#a0c4ff" : "#0d6efd",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "4px",
                                        cursor: (!changePlayerId || !changeAction || !changeEffectiveFrom || isUpdatingChange) ? "not-allowed" : "pointer"
                                    }}
                                >
                                    Log Change
                                </button>
                            </div>
                        </>
                    )}
                </div>
                {/* ---------- INVITATIONS ---------- */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: "350px", borderLeft: "1px solid #ddd", paddingLeft: "40px", paddingBottom: "40px" }}>
                    <h3 style={{ margin: 0 }}>Invitations</h3>

                    <div style={{ padding: "12px", background: "#f8f9fa", border: "1px solid #ddd", borderRadius: "4px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        <h4 style={{ margin: 0 }}>Create Invitation</h4>
                        <div>
                            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>Type</label>
                            <select
                                value={inviteType}
                                onChange={e => {
                                    setInviteType(e.target.value)
                                    setInvitePlayerId("")
                                    setInviteParentPlayers({})
                                    setGeneratedInviteLink("")
                                }}
                                style={{ width: "100%", padding: "6px", fontSize: "12px" }}
                            >
                                <option value="player">Player</option>
                                <option value="parent">Parent</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>Email</label>
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={e => setInviteEmail(e.target.value)}
                                style={{ width: "100%", padding: "6px", fontSize: "12px" }}
                                placeholder="name@example.com"
                            />
                        </div>

                        {inviteType === "player" && (
                            <div>
                                <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>Select Player</label>
                                <select
                                    value={invitePlayerId}
                                    onChange={e => {
                                        setInvitePlayerId(e.target.value)
                                        if (errors.invitePlayerId) setErrors({ ...errors, invitePlayerId: null })
                                    }}
                                    style={{ width: "100%", padding: "6px", fontSize: "12px" }}
                                >
                                    <option value="">-- Select Player --</option>
                                    {players.filter(p => p.active).map(p => (
                                        <option key={p.playerId} value={p.playerId}>
                                            {p.firstName} {p.lastName}
                                        </option>
                                    ))}
                                </select>
                                {errors.invitePlayerId && (
                                    <div style={{ color: "#ef4444", fontSize: "13px", marginTop: "4px" }}>
                                        {errors.invitePlayerId}
                                    </div>
                                )}
                            </div>
                        )}

                        {inviteType === "parent" && (
                            <div>
                                <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>Select Children (Players)</label>
                                <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #ccc", background: "white", padding: "4px", display: "flex", flexDirection: "column", gap: "4px" }}>
                                    {players.filter(p => p.active).map(p => (
                                        <label key={p.playerId} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", padding: "4px" }}>
                                            <input
                                                type="checkbox"
                                                checked={!!inviteParentPlayers[p.playerId]}
                                                onChange={e => {
                                                    setInviteParentPlayers(prev => {
                                                        const next = { ...prev }
                                                        if (e.target.checked) next[p.playerId] = true
                                                        else delete next[p.playerId]
                                                        return next
                                                    })
                                                    if (errors.inviteParentPlayers) setErrors({ ...errors, inviteParentPlayers: null })
                                                }}
                                            />
                                            {p.firstName} {p.lastName}
                                        </label>
                                    ))}
                                </div>
                                {errors.inviteParentPlayers && (
                                    <div style={{ color: "#ef4444", fontSize: "13px", marginTop: "4px" }}>
                                        {errors.inviteParentPlayers}
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={handleCreateInvitation}
                            disabled={isCreatingInvite}
                            style={{
                                padding: "8px",
                                marginTop: "4px",
                                background: isCreatingInvite ? "#a0c4ff" : "#0d6efd",
                                color: "white",
                                border: "none",
                                borderRadius: "4px",
                                cursor: isCreatingInvite ? "not-allowed" : "pointer"
                            }}
                        >
                            {inviteType === "player" ? (isCreatingInvite ? "Creating..." : "Loo kutse") : (isCreatingInvite ? "Creating..." : "Loo lapsevanema kutse")}
                        </button>

                        {generatedInviteLink && (
                            <div style={{ marginTop: "12px", padding: "8px", background: "#e8f5e9", border: "1px solid #2e7d32", borderRadius: "4px" }}>
                                <div style={{ fontSize: "12px", fontWeight: "bold", color: "#2e7d32", marginBottom: "4px" }}>Copy Invite Link:</div>
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <input
                                        type="text"
                                        readOnly
                                        value={generatedInviteLink}
                                        style={{ flex: 1, padding: "4px", fontSize: "11px" }}
                                        onClick={e => e.target.select()}
                                    />
                                    <button
                                        onClick={() => navigator.clipboard.writeText(generatedInviteLink)}
                                        style={{ padding: "4px 8px", background: "#28a745", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ marginTop: "12px", flex: 1 }}>
                        <h4 style={{ margin: "0 0 8px 0" }}>Existing Invitations</h4>
                        <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #ccc", borderRadius: "4px", padding: "8px" }}>
                            {!invitations || Object.keys(invitations).length === 0 ? (
                                <span style={{ color: "#666", fontSize: "14px" }}>No active invitations.</span>
                            ) : (
                                Object.entries(invitations)
                                    .sort(([, a], [, b]) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                    .map(([inviteId, inv]) => {
                                        return (
                                            <div key={inviteId} style={{
                                                padding: "8px",
                                                marginBottom: "4px",
                                                borderTop: "3px solid",
                                                borderTopColor: inv.status === "pending" ? "#ffc107" : inv.status === "accepted" ? "#28a745" : "#6c757d",
                                                background: "#fdfdfd",
                                                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                                                fontSize: "12px"
                                            }}>
                                                <div style={{ fontWeight: "bold" }}>{inv.email}</div>
                                                <div style={{ color: "#555" }}>
                                                    Type: {inv.type} | Status: <span style={{ fontWeight: "bold", color: inv.status === "pending" ? "#d39e00" : inv.status === "accepted" ? "#28a745" : "#6c757d" }}>{inv.status}</span>
                                                </div>
                                                <div style={{ color: "#777", fontSize: "10px", marginTop: "2px" }}>
                                                    Expires: {new Date(inv.expiresAt).toLocaleString("et-EE")}
                                                </div>
                                                {inv.status === "pending" && (
                                                    <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                                                        <button
                                                            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/accept-invite?id=${inviteId}&token=${inv.token}`)}
                                                            style={{ padding: "4px 8px", background: "#17a2b8", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "10px", flex: 1 }}
                                                        >
                                                            Copy Link
                                                        </button>
                                                        <button
                                                            onClick={() => handleExpireInvitation(inviteId)}
                                                            style={{ padding: "4px 8px", background: "#dc3545", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "10px", flex: 1 }}
                                                        >
                                                            Mark Expired
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                            )}
                        </div>
                    </div>
                </div>

                {/* ---------- SESSION DEFINITIONS ---------- */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: "350px", borderLeft: "1px solid #ddd", paddingLeft: "40px", paddingBottom: "40px" }}>
                    <h3 style={{ margin: 0 }}>Session Definitions</h3>
                    <div style={{ padding: "12px", background: "#f8f9fa", border: "1px solid #ddd", borderRadius: "4px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        <h4 style={{ margin: 0 }}>Create Session Definition</h4>

                        <div>
                            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>Spordiala *</label>
                            <select
                                value={defSport}
                                onChange={e => {
                                    setDefSport(e.target.value)
                                    if (errors.defSport) setErrors({ ...errors, defSport: null })
                                }}
                                style={{ width: "100%", padding: "6px", fontSize: "12px" }}
                            >
                                <option value="">-- Vali --</option>
                                <option value="tennis">Tennis</option>
                                <option value="fitness">ÜKE</option>
                            </select>
                            {errors.defSport && <div style={{ color: "#ef4444", fontSize: "13px", marginTop: "4px" }}>{errors.defSport}</div>}
                        </div>

                        <div>
                            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>Nädalapäev *</label>
                            <select value={defWeekday} onChange={e => setDefWeekday(e.target.value)} style={{ width: "100%", padding: "6px", fontSize: "12px" }}>
                                <option value="1">Esmaspäev (1)</option>
                                <option value="2">Teisipäev (2)</option>
                                <option value="3">Kolmapäev (3)</option>
                                <option value="4">Neljapäev (4)</option>
                                <option value="5">Reede (5)</option>
                                <option value="6">Laupäev (6)</option>
                                <option value="7">Pühapäev (7)</option>
                            </select>
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>Algus (HH:MM) *</label>
                                <input type="time" value={defStartTime} onChange={e => { setDefStartTime(e.target.value); if (errors.defTime) setErrors({ ...errors, defTime: null }) }} style={{ width: "100%", padding: "6px", fontSize: "12px" }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>Lõpp (HH:MM) *</label>
                                <input type="time" value={defEndTime} onChange={e => { setDefEndTime(e.target.value); if (errors.defTime) setErrors({ ...errors, defTime: null }) }} style={{ width: "100%", padding: "6px", fontSize: "12px" }} />
                            </div>
                        </div>
                        {errors.defTime && <div style={{ color: "#ef4444", fontSize: "13px", marginTop: "4px" }}>{errors.defTime}</div>}

                        <div>
                            <label style={{ display: "block", fontSize: "12px", marginBottom: "4px" }}>Mahtuvus (mängijate arv) *</label>
                            <input type="number" value={defCapacity} onChange={e => { setDefCapacity(e.target.value); if (errors.defCapacity) setErrors({ ...errors, defCapacity: null }) }} placeholder="e.g. 8" style={{ width: "100%", padding: "6px", fontSize: "12px" }} />
                            {errors.defCapacity && <div style={{ color: "#ef4444", fontSize: "13px", marginTop: "4px" }}>{errors.defCapacity}</div>}
                        </div>

                        <button onClick={handleCreateSessionDef} disabled={isSavingDef} style={{ padding: "8px", marginTop: "4px", background: isSavingDef ? "#a0c4ff" : "#0d6efd", color: "white", border: "none", borderRadius: "4px", cursor: isSavingDef ? "not-allowed" : "pointer" }}>
                            {isSavingDef ? "Creating..." : "Loo definitsioon"}
                        </button>
                    </div>
                    <div style={{ marginTop: "12px", flex: 1 }}>
                        <h4 style={{ margin: "0 0 8px 0" }}>Existing Definitions</h4>
                        <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #ccc", borderRadius: "4px", padding: "8px" }}>
                            {sessionDefinitions.filter(d => d.active).map(def => (
                                <div key={def.id} style={{ padding: "4px 8px", borderBottom: "1px solid #eee", fontSize: "12px" }}>
                                    {def.sport} | Day {def.weekday} | {def.startTime}-{def.endTime} | Cap: {def.capacity}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
