import React, { useEffect, useState } from "react"
import { ref, onValue, update, set, get } from "firebase/database"
import { useAuth } from "../contexts/AuthContext"
import { database } from "../services/firebase"
import { combineDateAndTime } from "../utils/dateUtils"
import { LoadingSpinner, ErrorMessage, EmptyState } from "../components/UIHelpers"

export default function AttendancePage() {
    const { user: currentUser, role, isLoading } = useAuth()

    const [instances, setInstances] = useState({})
    const [definitions, setDefinitions] = useState({})
    const [rosters, setRosters] = useState({})
    const [attendance, setAttendance] = useState({})
    const [players, setPlayers] = useState({})
    const [extraRequests, setExtraRequests] = useState({})
    const [coachPerms, setCoachPerms] = useState({})

    const [selectedInstanceId, setSelectedInstanceId] = useState("")
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
        const unsubExtraReqs = onValue(ref(database, "extraRequests"), (snap) => {
            setExtraRequests(snap.val() || {})
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
            unsubExtraReqs()
            unsubCoachPerms()
        }
    }, [currentUser, role])

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

    const handleSetRealStatus = async (instId, playerId, newRealStatus) => {
        setMsg("")
        if (!hasPermissionForInstance(instId)) {
            setMsg("Error: You do not have permission to modify this instance.")
            return
        }

        const attRef = ref(database, `attendance/${instId}/${playerId}`)

        try {
            const snap = await get(attRef)
            const currentRecord = snap.val() || {}
            const currentPreStatus = currentRecord.preStatus || null

            let lateCancel = false
            if (newRealStatus === "puudus" && currentPreStatus === "kinnitatud") {
                lateCancel = true
            }

            if (snap.exists()) {
                await update(attRef, {
                    realStatus: newRealStatus,
                    lateCancel: lateCancel,
                    markedBy: currentUser.uid,
                    markedAt: new Date().toISOString()
                })
            } else {
                await set(attRef, {
                    preStatus: null,
                    realStatus: newRealStatus,
                    lateCancel: lateCancel,
                    markedBy: currentUser.uid,
                    markedAt: new Date().toISOString()
                })
            }
            // Clear message if successful, to not clutter UI. Or set a brief success msg.
        } catch (err) {
            console.error("Set realStatus failed", err)
            setMsg(`Error: ${err.message}`)
        }
    }

    const handleApproveRequest = async (instId, playerId) => {
        if (!hasPermissionForInstance(instId)) return
        setMsg("")
        try {
            const updates = {}
            updates[`extraRequests/${instId}/${playerId}/status`] = "approved"
            updates[`rosters/${instId}/${playerId}`] = {
                addedAt: new Date().toISOString(),
                addedBy: currentUser.uid,
                source: "extraRequest",
                walkIn: false,
                removedByCoach: false
            }
            await update(ref(database), updates)

            const attRef = ref(database, `attendance/${instId}/${playerId}`)
            const attSnap = await get(attRef)

            const inst = instances[instId]
            const def = definitions[inst?.definitionId || ""]
            let isPast = false
            if (inst && def) {
                try {
                    const combinedIso = combineDateAndTime(inst.date, def.startTime)
                    if (new Date(combinedIso).getTime() <= Date.now()) {
                        isPast = true
                    }
                } catch (e) {
                    console.error("Error checking session start time", e)
                }
            }

            const attUpdates = { preStatus: "kinnitatud" }
            if (isPast) {
                attUpdates.realStatus = "kohal"
                attUpdates.markedBy = currentUser.uid
                attUpdates.markedAt = new Date().toISOString()
            }

            if (attSnap.exists()) {
                await update(attRef, attUpdates)
            } else {
                attUpdates.lateCancel = false
                if (!isPast) {
                    attUpdates.realStatus = null
                }
                await set(attRef, attUpdates)
            }

            setMsg("Taotlus kinnitatud ja mängija lisatud nimekirja.")
        } catch (err) {
            console.error("Approve failed", err)
            setMsg(`Error: ${err.message}`)
        }
    }

    const handleRejectRequest = async (instId, playerId) => {
        if (!hasPermissionForInstance(instId)) return
        setMsg("")
        try {
            await update(ref(database, `extraRequests/${instId}/${playerId}`), { status: "rejected" })
            setMsg("Taotlus tagasi lükatud.")
        } catch (err) {
            console.error("Reject failed", err)
            setMsg(`Error: ${err.message}`)
        }
    }

    const instanceEntries = Object.entries(instances).sort((a, b) => a[0].localeCompare(b[0]))
    const currentRoster = rosters[selectedInstanceId] || {}
    const hasPermForSelected = selectedInstanceId ? hasPermissionForInstance(selectedInstanceId) : false

    const renderExtraRequests = () => {
        if (!selectedInstanceId) return null
        if (role !== "admin" && role !== "coach") return null

        const requestsForInst = extraRequests[selectedInstanceId] || {}
        const reqIds = Object.keys(requestsForInst)

        if (reqIds.length === 0) return null

        const pending = []
        const resolved = []

        reqIds.forEach(pId => {
            const req = requestsForInst[pId]
            if (req.status === "pending") pending.push({ pId, ...req })
            else resolved.push({ pId, ...req })
        })

        if (pending.length === 0 && resolved.length === 0) return null

        return (
            <div style={{ marginTop: "40px", borderTop: "2px solid #ddd", paddingTop: "20px" }}>
                <h3>Lisatreeningu taotlused</h3>

                {pending.length > 0 && (
                    <div style={{ marginBottom: "20px" }}>
                        <h4>Ootel</h4>
                        <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
                            <thead>
                                <tr style={{ backgroundColor: "#fff3cd" }}>
                                    <th>Mängija</th>
                                    <th>Taotletud</th>
                                    <th>Tegevused</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pending.map(req => {
                                    const pData = players[req.pId]
                                    const pName = pData ? `${pData.firstName} ${pData.lastName}` : req.pId
                                    const reqTime = new Date(req.requestedAt).toLocaleString("et-EE")
                                    return (
                                        <tr key={req.pId}>
                                            <td>{pName}</td>
                                            <td>{reqTime}</td>
                                            <td>
                                                <button
                                                    disabled={!hasPermForSelected}
                                                    onClick={() => handleApproveRequest(selectedInstanceId, req.pId)}
                                                    style={{ backgroundColor: "#4caf50", color: "white", marginRight: "10px", padding: "4px 8px", border: "none", borderRadius: "4px", cursor: hasPermForSelected ? "pointer" : "not-allowed" }}
                                                >Kinnita</button>
                                                <button
                                                    disabled={!hasPermForSelected}
                                                    onClick={() => handleRejectRequest(selectedInstanceId, req.pId)}
                                                    style={{ backgroundColor: "#f44336", color: "white", padding: "4px 8px", border: "none", borderRadius: "4px", cursor: hasPermForSelected ? "pointer" : "not-allowed" }}
                                                >Lükka tagasi</button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {resolved.length > 0 && (
                    <details>
                        <summary style={{ cursor: "pointer", fontWeight: "bold" }}>Näita lahendatud taotlusi ({resolved.length})</summary>
                        <div style={{ marginTop: "10px" }}>
                            <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%" }}>
                                <thead>
                                    <tr style={{ backgroundColor: "#f5f5f5" }}>
                                        <th>Mängija</th>
                                        <th>Taotletud</th>
                                        <th>Staatus</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {resolved.map(req => {
                                        const pData = players[req.pId]
                                        const pName = pData ? `${pData.firstName} ${pData.lastName}` : req.pId
                                        const reqTime = new Date(req.requestedAt).toLocaleString("et-EE")
                                        return (
                                            <tr key={req.pId}>
                                                <td>{pName}</td>
                                                <td>{reqTime}</td>
                                                <td style={{ fontWeight: "bold", color: req.status === "approved" ? "green" : "red" }}>
                                                    {req.status === "approved" ? "Kinnitatud" : (
                                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                            <span>Tagasi lükatud</span>
                                                            <button
                                                                disabled={!hasPermForSelected}
                                                                onClick={() => handleApproveRequest(selectedInstanceId, req.pId)}
                                                                style={{ backgroundColor: "#4caf50", color: "white", padding: "2px 6px", border: "none", borderRadius: "4px", fontSize: "12px", cursor: hasPermForSelected ? "pointer" : "not-allowed" }}
                                                            >Kinnita</button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </details>
                )}
            </div>
        )
    }

    if (isLoading) return <LoadingSpinner />
    if (error) return <ErrorMessage message={error} />

    return (
        <div>
            <h2>Real Attendance Marking</h2>
            {msg && <p style={{ color: msg.startsWith("Error") ? "red" : "green", fontWeight: "bold" }}>{msg}</p>}

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
                        return (
                            <option key={instId} value={instId}>
                                {inst.date} : {defLabel} ({instId})
                            </option>
                        )
                    })}
                </select>
            </div>

            {selectedInstanceId && (
                <div style={{ marginTop: "20px" }}>
                    {!hasPermForSelected && (
                        <p style={{ color: "red" }}>You do not have permission to modify this instance's attendance.</p>
                    )}

                    <h3>Kohalolek</h3>
                    {(() => {
                        let lateCancelCount = 0
                        Object.keys(currentRoster).forEach(pId => {
                            if (attendance[selectedInstanceId]?.[pId]?.lateCancel) {
                                lateCancelCount++
                            }
                        })
                        return (
                            <p style={{
                                color: lateCancelCount > 0 ? "orange" : "gray",
                                fontWeight: "bold",
                                marginBottom: "15px"
                            }}>
                                {lateCancelCount > 0 && "⚠️ "}Hilinenud tühistamised: {lateCancelCount}
                            </p>
                        )
                    })()}

                    {Object.keys(currentRoster).length === 0 ? (
                        <EmptyState message="Nimekiri tühi." />
                    ) : (
                        <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%", marginTop: "10px" }}>
                            <thead>
                                <tr style={{ backgroundColor: "#f5f5f5" }}>
                                    <th>Mängija</th>
                                    <th>Eelstaatus</th>
                                    <th>Pärisstaatus</th>
                                    <th>Märgi Kohalolek</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(currentRoster)
                                    .sort(([pIdA, rDataA], [pIdB, rDataB]) => {
                                        // 1. Sort by preStatus: kinnitatud -> eiOsale -> null -> removedByCoach
                                        const isRemovedA = rDataA.removedByCoach === true
                                        const isRemovedB = rDataB.removedByCoach === true
                                        // Removed go to bottom always
                                        if (isRemovedA && !isRemovedB) return 1
                                        if (!isRemovedA && isRemovedB) return -1
                                        // Both removed or both not removed -> sort by preStatus group
                                        if (!isRemovedA && !isRemovedB) {
                                            const preStatA = attendance[selectedInstanceId]?.[pIdA]?.preStatus || "null"
                                            const preStatB = attendance[selectedInstanceId]?.[pIdB]?.preStatus || "null"
                                            const preStatusOrder = { "kinnitatud": 1, "eiOsale": 2, "null": 3 }
                                            const orderA = preStatusOrder[preStatA] || 4
                                            const orderB = preStatusOrder[preStatB] || 4
                                            if (orderA !== orderB) return orderA - orderB
                                        }

                                        // 2. Sort by name
                                        const pA = players[pIdA]
                                        const pB = players[pIdB]
                                        const nameA = pA ? `${pA.firstName} ${pA.lastName}` : pIdA
                                        const nameB = pB ? `${pB.firstName} ${pB.lastName}` : pIdB
                                        return nameA.localeCompare(nameB)
                                    })
                                    .map(([pId, rData]) => {
                                        const p = players[pId]
                                        const pName = p ? `${p.firstName} ${p.lastName}` : pId
                                        const isRemoved = rData.removedByCoach === true
                                        const attRecord = attendance[selectedInstanceId]?.[pId] || {}

                                        // Attendance nodes are created lazily on first interaction.
                                        // A missing node means preStatus is effectively "Vastamata"
                                        // and realStatus is "Märkimata".
                                        const preStat = attRecord.preStatus
                                        let preStatDisplay = "Vastamata"
                                        if (preStat === "kinnitatud") preStatDisplay = "Kinnitatud"
                                        if (preStat === "eiOsale") preStatDisplay = "Ei osale"

                                        const realStat = attRecord.realStatus
                                        let realStatDisplay = "Märkimata"
                                        if (realStat === "kohal") realStatDisplay = "Kohal"
                                        if (realStat === "hilines") realStatDisplay = "Hilines"
                                        if (realStat === "puudus") realStatDisplay = "Puudus"
                                        if (realStat === "vabastatud") realStatDisplay = "Vabastatud"

                                        const showLateCancel = attRecord.lateCancel === true

                                        return (
                                            <tr key={pId} style={{ color: isRemoved ? "gray" : "inherit" }}>
                                                <td style={{ textDecoration: isRemoved ? "line-through" : "none" }}>
                                                    {pName}
                                                    {rData.walkIn && !isRemoved && (
                                                        <span style={{
                                                            marginLeft: "8px",
                                                            backgroundColor: "#e0f2f1",
                                                            color: "#00796b",
                                                            padding: "2px 6px",
                                                            borderRadius: "4px",
                                                            fontSize: "12px",
                                                            fontWeight: "bold"
                                                        }}>
                                                            🚶 Walk-in
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span style={{ fontWeight: preStat === 'kinnitatud' ? 'bold' : 'normal' }}>
                                                        {preStatDisplay}
                                                    </span>
                                                </td>
                                                <td style={{ fontWeight: "bold" }}>
                                                    {realStatDisplay}
                                                    {showLateCancel && (
                                                        <span style={{ color: "orange", display: "block", fontSize: "12px", marginTop: "4px" }}>
                                                            ⚠️ Hiline tühistamine
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    {isRemoved ? (
                                                        <span style={{ color: "#888", fontStyle: "italic" }}>Eemaldatud</span>
                                                    ) : (
                                                        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", opacity: hasPermForSelected ? 1 : 0.5 }}>
                                                            <button
                                                                disabled={!hasPermForSelected}
                                                                onClick={() => handleSetRealStatus(selectedInstanceId, pId, "kohal")}
                                                                style={{ backgroundColor: realStat === 'kohal' ? '#4caf50' : '', color: realStat === 'kohal' ? 'white' : '' }}
                                                            >
                                                                Kohal
                                                            </button>
                                                            <button
                                                                disabled={!hasPermForSelected}
                                                                onClick={() => handleSetRealStatus(selectedInstanceId, pId, "hilines")}
                                                                style={{ backgroundColor: realStat === 'hilines' ? '#ff9800' : '', color: realStat === 'hilines' ? 'white' : '' }}
                                                            >
                                                                Hilines
                                                            </button>
                                                            <button
                                                                disabled={!hasPermForSelected}
                                                                onClick={() => handleSetRealStatus(selectedInstanceId, pId, "puudus")}
                                                                style={{ backgroundColor: realStat === 'puudus' ? '#f44336' : '', color: realStat === 'puudus' ? 'white' : '' }}
                                                            >
                                                                Puudus
                                                            </button>
                                                            <button
                                                                disabled={!hasPermForSelected}
                                                                onClick={() => handleSetRealStatus(selectedInstanceId, pId, "vabastatud")}
                                                                style={{ backgroundColor: realStat === 'vabastatud' ? '#2196f3' : '', color: realStat === 'vabastatud' ? 'white' : '' }}
                                                            >
                                                                Vabastatud
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                            </tbody>
                        </table>
                    )}

                    {renderExtraRequests()}
                </div>
            )}
        </div>
    )
}
