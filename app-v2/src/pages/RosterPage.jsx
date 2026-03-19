import { useEffect, useState } from "react"
import { ref, onValue, remove, update, set } from "firebase/database"
import { useAuth } from "../contexts/AuthContext"
import { database } from "../services/firebase"
import { LoadingSpinner, ErrorMessage, EmptyState } from "../components/UIHelpers"

export default function RosterPage() {
    const { user: currentUser, role, isLoading } = useAuth()

    const [instances, setInstances] = useState({})
    const [definitions, setDefinitions] = useState({})
    const [rosters, setRosters] = useState({})
    const [attendance, setAttendance] = useState({})
    const [players, setPlayers] = useState({})
    const [coachPerms, setCoachPerms] = useState({})

    const [selectedInstanceId, setSelectedInstanceId] = useState("")
    const [newPlayerId, setNewPlayerId] = useState("")
    const [isWalkIn, setIsWalkIn] = useState(false)
    const [msg, setMsg] = useState("")
    const [error, setError] = useState(null)

    useEffect(() => {
        if (!currentUser) return
        
        const handleErr = () => setError("Andmete laadimine ebaõnnestus.")

        const unsubInstances = onValue(ref(database, "sessionInstances"), (snap) => {
            setInstances(snap.val() || {})
        }, handleErr)
        const unsubDefs = onValue(ref(database, "sessionDefinitions"), (snap) => {
            setDefinitions(snap.val() || {})
        }, handleErr)
        const unsubRosters = onValue(ref(database, "rosters"), (snap) => {
            setRosters(snap.val() || {})
        }, handleErr)
        const unsubPlayers = onValue(ref(database, "players"), (snap) => {
            setPlayers(snap.val() || {})
        }, handleErr)
        const unsubAttendance = onValue(ref(database, "attendance"), (snap) => {
            setAttendance(snap.val() || {})
        }, handleErr)

        let unsubCoachPerms = () => { }
        if (role === "coach") {
            unsubCoachPerms = onValue(ref(database, `coachPermissions/${currentUser.uid}`), (snap) => {
                setCoachPerms(snap.val() || {})
            }, handleErr)
        }

        return () => {
            unsubInstances()
            unsubDefs()
            unsubRosters()
            unsubPlayers()
            unsubAttendance()
            unsubCoachPerms()
        }
    }, [currentUser, role])

    // Permissions check
    const hasPermissionForInstance = (instId) => {
        if (role === "admin") return true
        if (role !== "coach") return false

        if (coachPerms.global === true) return true

        const inst = instances[instId]
        if (!inst) return false

        const defId = inst.definitionId
        if (defId && coachPerms.sessionDefinitions?.[defId] === true) return true

        if (inst.assignedCoachIds?.[currentUser.uid] === true) return true

        return false
    }

    const handleAddPlayer = async () => {
        setMsg("")
        if (!selectedInstanceId) {
            setMsg("Error: Please select an instance.")
            return
        }
        if (!newPlayerId) {
            setMsg("Error: Please select a player.")
            return
        }
        if (!hasPermissionForInstance(selectedInstanceId)) {
            setMsg("Error: You do not have permission to modify this instance.")
            return
        }

        const updates = {}
        const nowIso = new Date().toISOString()
        updates[`rosters/${selectedInstanceId}/${newPlayerId}`] = {
            source: "manual_add",
            addedBy: currentUser.uid,
            addedAt: nowIso,
            walkIn: isWalkIn
        }

        try {
            await update(ref(database), updates)

            if (isWalkIn) {
                const attRef = ref(database, `attendance/${selectedInstanceId}/${newPlayerId}`)
                await set(attRef, {
                    preStatus: null,
                    realStatus: "kohal",
                    lateCancel: false,
                    markedBy: currentUser.uid,
                    markedAt: nowIso
                })
            }

            setMsg(`Success: Player added.`)
            setNewPlayerId("")
            setIsWalkIn(false)
        } catch (err) {
            console.error("Add failed", err)
            setMsg(`Error: ${err.message}`)
        }
    }

    const handleRemovePlayer = async (playerId, source) => {
        setMsg("")
        if (!hasPermissionForInstance(selectedInstanceId)) {
            setMsg("Error: You do not have permission to modify this instance.")
            return
        }
        if (role === "coach" && source !== "manual_add" && source !== "recurring") {
            setMsg("Error: Coaches can only remove manually added or recurring players.")
            return
        }

        try {
            if (role === "coach" && source === "recurring") {
                await update(ref(database, `rosters/${selectedInstanceId}/${playerId}`), {
                    removedByCoach: true
                })
                setMsg(`Success: Player flagged as removed by coach.`)
            } else {
                await remove(ref(database, `rosters/${selectedInstanceId}/${playerId}`))
                setMsg(`Success: Player removed.`)
            }
        } catch (err) {
            console.error("Remove failed", err)
            setMsg(`Error: ${err.message}`)
        }
    }

    // Selectable instances
    const instanceEntries = Object.entries(instances).sort((a, b) => a[0].localeCompare(b[0]))

    // Active players not on the selected instance roster
    const currentRoster = rosters[selectedInstanceId] || {}
    const availablePlayers = Object.entries(players).filter(([pId, p]) => {
        if (!p.active) return false
        if (currentRoster[pId]) return false
        return true
    }).sort((a, b) => {
        const nameA = `${a[1].firstName} ${a[1].lastName}`
        const nameB = `${b[1].firstName} ${b[1].lastName}`
        return nameA.localeCompare(nameB)
    })

    const hasPermForSelected = selectedInstanceId ? hasPermissionForInstance(selectedInstanceId) : false

    if (isLoading) return <LoadingSpinner />
    if (error) return <ErrorMessage message={error} />

    return (
        <div>
            <h2>Manual Roster Management</h2>
            {msg && <p style={{ color: msg.startsWith("Error") ? "red" : "green" }}>{msg}</p>}

            <div>
                <label>Select Instance: </label>
                <select value={selectedInstanceId} onChange={e => {
                    setSelectedInstanceId(e.target.value)
                    setMsg("")
                }}>
                    <option value="">-- Select Instance --</option>
                    {instanceEntries.map(([instId, inst]) => {
                        const def = definitions[inst.definitionId]
                        const defLabel = def ? `${def.sport} - ${def.startTime}` : inst.definitionId
                        const capacity = inst.capacity || 0
                        const currentAttendance = attendance[instId] || {}
                        const currentRoster = rosters[instId] || {}
                        let kinnitatudCount = 0
                        Object.keys(currentAttendance).forEach(pid => {
                            const rosterData = currentRoster[pid] || {}
                            if (rosterData.removedByCoach || rosterData.walkIn) return
                            if (currentAttendance[pid].preStatus === "kinnitatud") {
                                kinnitatudCount++
                            }
                        })
                        return (
                            <option key={instId} value={instId}>
                                {inst.date} : {defLabel} ({kinnitatudCount} / {capacity} kinnitatud) ({instId})
                            </option>
                        )
                    })}
                </select>
            </div>

            {selectedInstanceId && (
                <div style={{ marginTop: "20px" }}>
                    {!hasPermForSelected && (
                        <p style={{ color: "red" }}>You do not have permission to modify this instance's roster.</p>
                    )}

                    <h3>Current Roster</h3>
                    {Object.keys(currentRoster).length === 0 ? (
                        <EmptyState message="Nimekiri tühi." />
                    ) : (
                        <table border="1" cellPadding="4" style={{ borderCollapse: "collapse", marginBottom: "20px" }}>
                            <thead>
                                <tr>
                                    <th>Player Name</th>
                                    <th>Source</th>
                                    <th>Added By</th>
                                    <th>Walk-In</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(currentRoster).map(([pId, rData]) => {
                                    const p = players[pId]
                                    const pName = p ? `${p.firstName} ${p.lastName}` : pId
                                    const isRemoved = rData.removedByCoach === true
                                    const canRemove = hasPermForSelected && (
                                        role === "admin" ||
                                        (!isRemoved && (rData.source === "manual_add" || rData.source === "recurring"))
                                    )

                                    return (
                                        <tr key={pId} style={{ color: isRemoved ? "gray" : "inherit" }}>
                                            <td style={{ textDecoration: isRemoved ? "line-through" : "none" }}>
                                                {pName} {isRemoved && <span style={{ fontSize: "12px", marginLeft: "8px" }}>(Removed by coach)</span>}
                                            </td>
                                            <td>{rData.source}</td>
                                            <td>{rData.addedBy}</td>
                                            <td>
                                                {rData.walkIn ? (
                                                    <span style={{ color: "#00796b", fontWeight: "bold" }}>🚶 Walk-in</span>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                            <td>
                                                {canRemove ? (
                                                    <button onClick={() => handleRemovePlayer(pId, rData.source)}>
                                                        Remove
                                                    </button>
                                                ) : isRemoved ? (
                                                    <span style={{ color: "#888", fontSize: "12px" }}>Removed</span>
                                                ) : (
                                                    <span style={{ color: "#888", fontSize: "12px" }}>Cannot remove</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}

                    {hasPermForSelected && (
                        <div style={{ padding: "10px", border: "1px solid #ddd" }}>
                            <h4>Add Player Manually</h4>
                            <select value={newPlayerId} onChange={e => setNewPlayerId(e.target.value)}>
                                <option value="">-- Select Active Player --</option>
                                {availablePlayers.map(([pId, p]) => (
                                    <option key={pId} value={pId}>
                                        {p.firstName} {p.lastName}
                                    </option>
                                ))}
                            </select>
                            <label style={{ marginLeft: "10px", marginRight: "10px" }}>
                                <input
                                    type="checkbox"
                                    checked={isWalkIn}
                                    onChange={e => setIsWalkIn(e.target.checked)}
                                    style={{ marginRight: "4px" }}
                                />
                                Walk-In
                            </label>
                            <button onClick={handleAddPlayer}>
                                Add
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
