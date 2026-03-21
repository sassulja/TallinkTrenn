import React, { useEffect, useState, useRef } from 'react'
import { ref, onValue, update, set, get } from 'firebase/database'
import { database } from '../services/firebase'
import { useAuth } from '../contexts/AuthContext'
import { getTallinnNow, combineDateAndTime } from '../utils/dateUtils'
import { LoadingSpinner, ErrorMessage, EmptyState } from '../components/UIHelpers'

export default function PreStatusPage() {
    const { user: currentUser, role, isLoading: isAuthLoading } = useAuth()
    const [myPlayerId, setMyPlayerId] = useState(null)
    const [instances, setInstances] = useState([])
    const [definitions, setDefinitions] = useState({})
    const [attendance, setAttendance] = useState({})
    const [rosters, setRosters] = useState({})
    const [players, setPlayers] = useState({})
    const [parentLinks, setParentLinks] = useState({})
    const [extraRequests, setExtraRequests] = useState({})
    const [sessionMessages, setSessionMessages] = useState({})
    const [msg, setMsg] = useState("")
    const [error, setError] = useState(null)

    const [showPast, setShowPast] = useState(false)
    const [feedbackData, setFeedbackData] = useState({}) // { instanceId: { playerId: { player: {...} } } }
    const [feedbackLocal, setFeedbackLocal] = useState({}) // { instanceId__playerId: { effort, coachEngagement, note } }
    const [feedbackSaved, setFeedbackSaved] = useState({}) // { instanceId__playerId: true } flash
    const [feedbackEditing, setFeedbackEditing] = useState({}) // { instanceId__playerId: true } for edit mode
    const feedbackLoadedRef = useRef(false)

    useEffect(() => {
        if (role === "player" && currentUser?.uid) {
            const pidRef = ref(database, `users/${currentUser.uid}/playerId`)
            get(pidRef).then(snap => {
                if (snap.exists()) {
                    setMyPlayerId(snap.val())
                } else {
                    setMyPlayerId(null)
                }
            }).catch(err => {
                console.error("Error fetching myPlayerId:", err)
                setMyPlayerId(null)
            })
        }
    }, [currentUser, role])

    useEffect(() => {
        const instRef = ref(database, 'sessionInstances')
        const defRef = ref(database, 'sessionDefinitions')
        const attRef = ref(database, 'attendance')
        const rostRef = ref(database, 'rosters')
        const playersRef = ref(database, 'players')
        const reqRef = ref(database, 'extraRequests')

        const unsubs = []
        const handleErr = () => setError("Andmete laadimine ebaõnnestus.")

        unsubs.push(onValue(instRef, snapshot => {
            const data = snapshot.val() || {}
            const arr = Object.keys(data).map(key => ({ id: key, ...data[key] }))
            setInstances(arr)
        }, handleErr))

        unsubs.push(onValue(defRef, snapshot => {
            setDefinitions(snapshot.val() || {})
        }, handleErr))

        unsubs.push(onValue(attRef, snapshot => {
            setAttendance(snapshot.val() || {})
        }, handleErr))

        unsubs.push(onValue(rostRef, snapshot => {
            setRosters(snapshot.val() || {})
        }, handleErr))

        unsubs.push(onValue(playersRef, snapshot => {
            setPlayers(snapshot.val() || {})
        }, handleErr))

        unsubs.push(onValue(reqRef, snapshot => {
            setExtraRequests(snapshot.val() || {})
        }, handleErr))

        const msgRef = ref(database, 'sessionMessages')
        unsubs.push(onValue(msgRef, snapshot => {
            setSessionMessages(snapshot.val() || {})
        }, handleErr))

        if (role === "parent" && currentUser) {
            const linksRef = ref(database, `parentLinks/${currentUser.uid}`)
            unsubs.push(onValue(linksRef, snap => {
                setParentLinks(snap.val() || {})
            }, handleErr))
        }

        return () => {
            unsubs.forEach(u => u())
        }
    }, [role, currentUser])

    const nowMs = getTallinnNow().getTime()

    const visibleInstances = instances
        .map(inst => {
            const def = definitions[inst.definitionId]
            if (!def) return { instId: inst.id, inst, def }

            // Prefer instance time, fallback to definition time
            const startTime = inst.startTime ?? def.startTime
            const endTime = inst.endTime ?? def.endTime

            return {
                instId: inst.id,
                inst,
                def,
                startTime,
                endTime
            }
        })
        .filter(item => item.def)
        .sort((a, b) => {
            const tA = new Date(combineDateAndTime(a.inst.date, a.startTime)).getTime()
            const tB = new Date(combineDateAndTime(b.inst.date, b.startTime)).getTime()
            return tA - tB
        })

    const upcomingSessions = []
    const activeSessions = []
    const pastSessions = []

    visibleInstances.forEach(item => {
        const sessionStartIso = combineDateAndTime(item.inst.date, item.startTime)
        const sessionStartMs = new Date(sessionStartIso).getTime()

        // Same grouping logic as RosterPage instance selector (assuming that is the source of truth)
        // Adjust these categorizations if required:
        if (nowMs < sessionStartMs - 60 * 60 * 1000) upcomingSessions.push(item) // Tulevased
        else if (nowMs >= sessionStartMs - 60 * 60 * 1000 && nowMs <= sessionStartMs + 2 * 60 * 60 * 1000) activeSessions.push(item) // Aktiivsed/Override
        else pastSessions.unshift(item) // Möödunud - unshift to reverse sort
    })

    const handleSetPreStatus = async (instId, playerId, newStatus) => {
        setMsg("")

        const currentInst = instances.find(i => i.id === instId)
        const def = definitions[currentInst?.definitionId]
        if (!currentInst || !def) return

        const startTime = currentInst.startTime ?? def.startTime
        const sessionStartIso = combineDateAndTime(currentInst.date, startTime)
        const sessionStartMs = new Date(sessionStartIso).getTime()

        let isLocked = nowMs >= (sessionStartMs - 60 * 60 * 1000)

        // Compute capacities
        const capacity = currentInst.capacity || 0
        const currentAttendance = attendance[instId] || {}
        const currentRoster = rosters[instId] || {}
        let kinnitatudCount = 0
        Object.keys(currentAttendance).forEach(pid => {
            const rosterData = currentRoster[pid] || {}
            if (rosterData.removedByCoach || rosterData.walkIn) return
            if (currentAttendance[pid].preStatus === "kinnitatud" && pid !== playerId) {
                // EXCLUDE the player we're setting right now, unless they were already kinnitatud, in which case their state flips.
                // Wait – simplest is simply count kinnitatud NOT counting the current player being acted upon.
                kinnitatudCount++
            }
        })
        const isFull = kinnitatudCount >= capacity

        if ((role === "player" || role === "parent") && isLocked) {
            setMsg("Error: Selle treeningu eelstaatus on juba lukustatud.")
            return
        }

        if (newStatus === "kinnitatud" && isFull) {
            if (role === "player" || role === "parent") {
                setMsg("Treening on täis. Kinnitamine ei ole võimalik.")
                return
            } else if (role === "coach" || role === "admin") {
                if (!window.confirm("Hoiatus: Treening on täis. Kinnitad üle limiidi. Kas soovid jätkata?")) {
                    return
                }
            }
        }

        const attRef = ref(database, `attendance/${instId}/${playerId}`)
        try {
            const snap = await get(attRef)

            if (snap.exists()) {
                await update(attRef, { preStatus: newStatus })
            } else {
                await set(attRef, {
                    preStatus: newStatus,
                    realStatus: null,
                    lateCancel: false
                })
            }
            
            // Update local state instantly
            setAttendance(prev => {
                const updatedAtt = { ...prev }
                if (!updatedAtt[instId]) updatedAtt[instId] = {}
                updatedAtt[instId] = {
                    ...updatedAtt[instId],
                    [playerId]: {
                        ...(updatedAtt[instId][playerId] || { realStatus: null, lateCancel: false }),
                        preStatus: newStatus
                    }
                }
                return updatedAtt
            })

            if (newStatus === "kinnitatud") {
                const latestAttendanceSnap = await get(ref(database, `attendance/${instId}`))
                const latestAttendance = latestAttendanceSnap.val() || {}
                let latestKinnitatudCount = 0
                Object.keys(latestAttendance).forEach(pid => {
                    const rosterData = currentRoster[pid] || {}
                    if (rosterData.removedByCoach || rosterData.walkIn) return
                    if (latestAttendance[pid]?.preStatus === "kinnitatud") latestKinnitatudCount++
                })
                if (latestKinnitatudCount > capacity) {
                    setMsg("Treening on täis. Palun kontrollige oma kinnitust.")
                } else {
                    setMsg("Eelstaatus salvestatud.")
                }
            } else {
                setMsg("Eelstaatus salvestatud.")
            }
        } catch (err) {
            console.error(err)
            setMsg(`Error: ${err.message}`)
        }
    }

    const handleRequestExtra = async (instId, playerId) => {
        if (!currentUser) return
        setMsg("")
        try {
            await set(ref(database, `extraRequests/${instId}/${playerId}`), {
                requestedAt: new Date().toISOString(),
                requestedBy: currentUser.uid,
                status: "pending",
                note: null
            })
            
            setExtraRequests(prev => ({
                ...prev,
                [instId]: {
                    ...(prev[instId] || {}),
                    [playerId]: { status: "pending", requestedAt: new Date().toISOString() }
                }
            }))
            
            setMsg("Success: Taotlus saadetud.")
        } catch (err) {
            console.error("Request failed", err)
            setMsg(`Error: ${err.message}`)
        }
    }

    const EFFORT_SCALE_PLAYER = [
        { value: 1, emoji: "😴", label: "Ei pingutanud" },
        { value: 2, emoji: "😕", label: "Oleks saanud rohkem" },
        { value: 3, emoji: "👍", label: "Normaalne" },
        { value: 4, emoji: "💪", label: "Väga tubli" },
        { value: 5, emoji: "🔥", label: "Andsin kõik" }
    ]
    const COACH_ENGAGEMENT_SCALE = [
        { value: 1, emoji: "😶", label: "Ei märganud mind" },
        { value: 2, emoji: "🙁", label: "Vähe tähelepanu" },
        { value: 3, emoji: "👍", label: "Piisavalt" },
        { value: 4, emoji: "😊", label: "Väga toetav" },
        { value: 5, emoji: "🤝", label: "Suurepärane tugi" }
    ]

    // Load feedback for all past sessions
    const loadFeedbackData = async () => {
        if (feedbackLoadedRef.current) return
        feedbackLoadedRef.current = true
        try {
            const snap = await get(ref(database, 'feedback'))
            const data = snap.val() || {}
            setFeedbackData(data)
            // Initialize local state for player's own feedback
            if (role === "player" && myPlayerId) {
                const local = {}
                Object.entries(data).forEach(([instId, players]) => {
                    const pFb = players[myPlayerId]?.player
                    if (pFb) {
                        local[`${instId}__${myPlayerId}`] = {
                            effort: pFb.effort ?? 3,
                            coachEngagement: pFb.coachEngagement ?? 3,
                            note: pFb.note ?? ""
                        }
                    }
                })
                setFeedbackLocal(prev => ({ ...prev, ...local }))
            }
        } catch (err) {
            console.error("Load feedback failed", err)
            setError(err.message)
        }
    }

    // Trigger feedback load when past sessions are shown
    useEffect(() => {
        if (showPast && role === "player" && myPlayerId) {
            loadFeedbackData()
        }
    }, [showPast, role, myPlayerId])

    const handleSavePlayerFeedback = async (instId, playerId) => {
        const key = `${instId}__${playerId}`
        const local = feedbackLocal[key]
        if (!local || !local.effort || !local.coachEngagement) {
            setMsg("Error: Palun vali nii pingutuse kui treeneri hinnang.")
            return
        }
        const existing = feedbackData?.[instId]?.[playerId]?.player
        const nowIso = new Date().toISOString()
        const writeData = {
            effort: local.effort,
            coachEngagement: local.coachEngagement,
            note: local.note || null,
            createdAt: existing?.createdAt || nowIso,
            updatedAt: nowIso
        }
        try {
            await set(ref(database, `feedback/${instId}/${playerId}/player`), writeData)
            setFeedbackData(prev => ({
                ...prev,
                [instId]: { ...(prev[instId] || {}), [playerId]: { ...(prev[instId]?.[playerId] || {}), player: writeData } }
            }))
            setFeedbackSaved(prev => ({ ...prev, [key]: true }))
            setFeedbackEditing(prev => ({ ...prev, [key]: false }))
            setMsg("")
            setTimeout(() => setFeedbackSaved(prev => ({ ...prev, [key]: false })), 2000)
        } catch (err) {
            console.error("Save player feedback failed", err)
            setMsg(`Error: ${err.message}`)
        }
    }

    const getDayOfWeek = (dateString) => {
        const d = new Date(dateString)
        const days = ["Pühapäev", "Esmaspäev", "Teisipäev", "Kolmapäev", "Neljapäev", "Reede", "Laupäev"]
        return days[d.getDay()]
    }

    const formatDate = (dateString) => {
        const [y, m, d] = dateString.split("-")
        return `${d}.${m}.${y}`
    }

    const renderSessionGroup = (group, groupTitle) => {
        if (group.length === 0) return null

        return (
            <div style={{ marginBottom: "30px" }}>
                <h3 style={{ borderBottom: "2px solid #ddd", paddingBottom: "5px" }}>{groupTitle}</h3>
                {group.map(({ instId, inst, def, startTime, endTime }) => {
                    const sessionStartIso = combineDateAndTime(inst.date, startTime)
                    const sessionStartMs = new Date(sessionStartIso).getTime()
                    const isLockedTime = nowMs >= (sessionStartMs - 60 * 60 * 1000)

                    const appliesLock = (role === "player" || role === "parent") && isLockedTime
                    const isOverrideZone = (role === "admin" || role === "coach") && isLockedTime

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

                    let capColor = "green"
                    if (kinnitatudCount === capacity) capColor = "orange"
                    if (kinnitatudCount > capacity) capColor = "red"

                    let playersToShow = []
                    if (role === "admin" || role === "coach") {
                        playersToShow = Object.keys(currentRoster)
                    } else if (role === "parent") {
                        const linkedIds = Object.keys(parentLinks || {}).filter(id => parentLinks[id] === true)
                        playersToShow = linkedIds.filter(pid => currentRoster[pid])
                    } else if (role === "player") {
                        if (myPlayerId && currentRoster[myPlayerId]) {
                            playersToShow = [myPlayerId]
                        }
                    }

                    return (
                        <div key={instId} style={{ border: "1px solid #ccc", padding: "15px", marginBottom: "15px", borderRadius: "5px" }}>
                            <h3>{formatDate(inst.date)} ({getDayOfWeek(inst.date)}) | {startTime} - {endTime}</h3>
                            <p><strong>Spordiala:</strong> {def.sport}{(role === "admin" || role === "coach") && <> | <strong>Instance ID:</strong> {instId}</>}</p>

                            <p style={{ fontWeight: "bold", color: capColor }}>
                                Kinnitatud: {kinnitatudCount} / {capacity}
                            </p>

                            {appliesLock && (
                                <p style={{ color: "orange", fontWeight: "bold" }}>
                                    🔒 Lukustatud mängijatele
                                </p>
                            )}

                            {isOverrideZone && (
                                <p style={{ color: "orange", fontWeight: "bold" }}>
                                    ⚠️ Ülekirjutus võimalik
                                </p>
                            )}

                            {playersToShow.length === 0 ? (
                                <div style={{ marginTop: "10px", color: "#666" }}>Nimekiri on tühi.</div>
                            ) : (
                                <table border="1" cellPadding="6" style={{ borderCollapse: "collapse", width: "100%", marginTop: "10px" }}>
                                    <thead>
                                        <tr style={{ backgroundColor: "#f5f5f5" }}>
                                            <th>Mängija</th>
                                            <th>Eelstaatus</th>
                                            <th>Tegevused</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {playersToShow.map(pId => {
                                            const p = players[pId]
                                            const pName = p ? `${p.firstName} ${p.lastName}` : "Tundmatu mängija"
                                        const attRecord = attendance[instId]?.[pId] || { lateCancel: false }
                                            const preStat = attRecord.preStatus

                                            let preStatDisplay = "Vastamata"
                                            if (preStat === "kinnitatud") preStatDisplay = "Kinnitatud"
                                            if (preStat === "eiOsale") preStatDisplay = "Ei osale"

                                            return (
                                                <tr key={pId}>
                                                    <td>{pName}</td>
                                                    <td style={{ fontWeight: "bold" }}>{preStatDisplay}</td>
                                                    <td>
                                                        <button
                                                            disabled={appliesLock}
                                                            onClick={() => handleSetPreStatus(instId, pId, "kinnitatud")}
                                                            style={{ backgroundColor: preStat === 'kinnitatud' ? '#4caf50' : '', color: preStat === 'kinnitatud' ? 'white' : '' }}
                                                        >
                                                            Kinnitatud
                                                        </button>
                                                        {' '}
                                                        <button
                                                            disabled={appliesLock}
                                                            onClick={() => handleSetPreStatus(instId, pId, "eiOsale")}
                                                            style={{ backgroundColor: preStat === 'eiOsale' ? '#f44336' : '', color: preStat === 'eiOsale' ? 'white' : '' }}
                                                        >
                                                            Ei osale
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            )}

                            {/* Session Messages */}
                            {(() => {
                                const msgs = sessionMessages[instId]
                                if (!msgs) return null
                                const msgArr = Object.entries(msgs).map(([id, m]) => ({ id, ...m })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                if (msgArr.length === 0) return null
                                return (
                                    <div style={{ marginTop: "12px", borderTop: "1px solid #eee", paddingTop: "10px" }}>
                                        <h4 style={{ margin: "0 0 8px 0", fontSize: "14px" }}>Teated</h4>
                                        {msgArr.map(m => (
                                            <div key={m.id} style={{ marginBottom: "8px", fontSize: "13px" }}>
                                                <span style={{ fontWeight: "bold", color: "#333" }}>{m.createdByName}</span>
                                                <span style={{ color: "#999", marginLeft: "8px", fontSize: "12px" }}>
                                                    {new Date(m.createdAt).toLocaleString("et-EE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                                </span>
                                                <div style={{ color: "#555", marginTop: "2px" }}>{m.text}</div>
                                            </div>
                                        ))}
                                    </div>
                                )
                            })()}

                            {/* Player Feedback — past sessions only */}
                            {role === "player" && myPlayerId && (() => {
                                const sessionEndTime = endTime || "00:00"
                                const sessionEndMs = new Date(combineDateAndTime(inst.date, sessionEndTime)).getTime()
                                const sessionEnded = nowMs > sessionEndMs
                                if (!sessionEnded) return null

                                const realStatus = attendance[instId]?.[myPlayerId]?.realStatus
                                if (realStatus !== "kohal" && realStatus !== "hilines") return null

                                const editDeadlineMs = sessionEndMs + 7 * 24 * 60 * 60 * 1000
                                const isExpired = nowMs > editDeadlineMs
                                const key = `${instId}__${myPlayerId}`
                                const existingFb = feedbackData?.[instId]?.[myPlayerId]?.player
                                const hasFeedback = !!existingFb
                                const isEditing = feedbackEditing[key]

                                // Reminder indicator
                                if (!hasFeedback && !isExpired && !showPast) return null

                                // If expired and no feedback
                                if (isExpired && !hasFeedback) {
                                    return (
                                        <div style={{ marginTop: "12px", borderTop: "1px solid #eee", paddingTop: "10px", fontSize: "13px", color: "#999" }}>
                                            Tagasiside aeg lõppenud
                                        </div>
                                    )
                                }

                                // Read-only view (expired or saved and not editing)
                                if ((isExpired && hasFeedback) || (hasFeedback && !isEditing)) {
                                    const effortItem = EFFORT_SCALE_PLAYER.find(e => e.value === existingFb.effort)
                                    const engItem = COACH_ENGAGEMENT_SCALE.find(e => e.value === existingFb.coachEngagement)
                                    return (
                                        <div style={{ marginTop: "12px", borderTop: "1px solid #eee", paddingTop: "10px" }}>
                                            <h4 style={{ margin: "0 0 8px 0", fontSize: "14px" }}>Minu tagasiside</h4>
                                            <div style={{ fontSize: "13px", marginBottom: "4px" }}>Pingutus: {effortItem?.emoji} {effortItem?.label}</div>
                                            <div style={{ fontSize: "13px", marginBottom: "4px" }}>Treener: {engItem?.emoji} {engItem?.label}</div>
                                            {existingFb.note && <div style={{ fontSize: "13px", color: "#555", fontStyle: "italic", marginBottom: "4px" }}>{existingFb.note}</div>}
                                            {!isExpired && (
                                                <button onClick={() => {
                                                    setFeedbackEditing(prev => ({ ...prev, [key]: true }))
                                                    setFeedbackLocal(prev => ({ ...prev, [key]: {
                                                        effort: existingFb.effort,
                                                        coachEngagement: existingFb.coachEngagement,
                                                        note: existingFb.note || ""
                                                    }}))
                                                }}
                                                    style={{ marginTop: "6px", padding: "4px 12px", background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: "6px", cursor: "pointer", fontSize: "13px", color: "#3b82f6" }}>
                                                    Muuda
                                                </button>
                                            )}
                                            {feedbackSaved[key] && <span style={{ marginLeft: "8px", color: "#22c55e", fontWeight: "bold", fontSize: "13px" }}>Salvestatud ✓</span>}
                                        </div>
                                    )
                                }

                                // Edit mode (new or editing existing)
                                const local = feedbackLocal[key] || { effort: null, coachEngagement: null, note: "" }
                                const canSave = local.effort && local.coachEngagement
                                return (
                                    <div style={{ marginTop: "12px", borderTop: "1px solid #eee", paddingTop: "10px" }}>
                                        <h4 style={{ margin: "0 0 8px 0", fontSize: "14px" }}>📝 Anna tagasiside</h4>

                                        <div style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>Minu pingutus</div>
                                        <div style={{ display: "flex", gap: "4px", marginBottom: "12px", flexWrap: "wrap" }}>
                                            {EFFORT_SCALE_PLAYER.map(e => (
                                                <button key={e.value}
                                                    onClick={() => setFeedbackLocal(prev => ({ ...prev, [key]: { ...(prev[key] || { effort: null, coachEngagement: null, note: "" }), effort: e.value } }))}
                                                    style={{
                                                        padding: "5px 8px", borderRadius: "8px", cursor: "pointer",
                                                        border: local.effort === e.value ? "2px solid #3b82f6" : "1px solid #ddd",
                                                        background: local.effort === e.value ? "#eff6ff" : "white",
                                                        fontSize: "12px", transition: "all 0.1s"
                                                    }}>
                                                    {e.emoji} {e.label}
                                                </button>
                                            ))}
                                        </div>

                                        <div style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>Treeneri toetus</div>
                                        <div style={{ display: "flex", gap: "4px", marginBottom: "12px", flexWrap: "wrap" }}>
                                            {COACH_ENGAGEMENT_SCALE.map(e => (
                                                <button key={e.value}
                                                    onClick={() => setFeedbackLocal(prev => ({ ...prev, [key]: { ...(prev[key] || { effort: null, coachEngagement: null, note: "" }), coachEngagement: e.value } }))}
                                                    style={{
                                                        padding: "5px 8px", borderRadius: "8px", cursor: "pointer",
                                                        border: local.coachEngagement === e.value ? "2px solid #3b82f6" : "1px solid #ddd",
                                                        background: local.coachEngagement === e.value ? "#eff6ff" : "white",
                                                        fontSize: "12px", transition: "all 0.1s"
                                                    }}>
                                                    {e.emoji} {e.label}
                                                </button>
                                            ))}
                                        </div>

                                        <input type="text" value={local.note}
                                            onChange={e => setFeedbackLocal(prev => ({ ...prev, [key]: { ...(prev[key] || {}), note: e.target.value.slice(0, 200) } }))}
                                            placeholder="Märkus (vabatahtlik)" maxLength={200}
                                            style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc", marginBottom: "8px", boxSizing: "border-box", fontSize: "13px" }}
                                        />

                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                            <button onClick={() => handleSavePlayerFeedback(instId, myPlayerId)} disabled={!canSave}
                                                style={{ padding: "6px 16px", background: canSave ? "#3b82f6" : "#ccc", color: "white", border: "none", borderRadius: "6px", cursor: canSave ? "pointer" : "not-allowed", fontWeight: "bold", fontSize: "13px" }}>
                                                Salvesta
                                            </button>
                                            {feedbackSaved[key] && <span style={{ color: "#22c55e", fontWeight: "bold", fontSize: "13px" }}>Salvestatud ✓</span>}
                                        </div>
                                    </div>
                                )
                            })()}
                        </div>
                    )
                })}
            </div>
        )
    }

    const renderExtraRequestsSection = () => {
        if (role !== "player" && role !== "parent") return null

        let eligiblePlayerIds = []
        if (role === "player" && myPlayerId) {
            eligiblePlayerIds = [myPlayerId]
        } else if (role === "parent") {
            eligiblePlayerIds = Object.keys(parentLinks).filter(id => parentLinks[id] === true)
        }

        if (eligiblePlayerIds.length === 0) return null

        const applicableItems = []

        visibleInstances.forEach(item => {
            const { instId, inst, def, startTime, endTime } = item
            const sessionStartIso = combineDateAndTime(inst.date, startTime)
            const sessionStartMs = new Date(sessionStartIso).getTime()

            if (nowMs >= sessionStartMs) return // Only future sessions

            const currentRoster = rosters[instId] || {}

            eligiblePlayerIds.forEach(pId => {
                const isOnRoster = currentRoster[pId] && currentRoster[pId].removedByCoach !== true
                if (!isOnRoster) {
                    applicableItems.push({
                        instId,
                        inst,
                        def,
                        startTime,
                        endTime,
                        pId
                    })
                }
            })
        })

        if (applicableItems.length === 0) return null

        return (
            <div style={{ marginTop: "40px", borderTop: "2px solid #ddd", paddingTop: "20px" }}>
                <h2>Taotle lisatreeningut</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                    {applicableItems.map(item => {
                        const { instId, inst, def, startTime, endTime, pId } = item
                        const pData = players[pId]
                        const pName = pData ? `${pData.firstName} ${pData.lastName}` : "Tundmatu mängija"

                        const existingReq = extraRequests[instId]?.[pId]

                        let statusDisplay = ""
                        if (existingReq) {
                            if (existingReq.status === "pending") statusDisplay = "Ootel"
                            if (existingReq.status === "approved") statusDisplay = "Kinnitatud"
                            if (existingReq.status === "rejected") statusDisplay = "Tagasi lükatud"
                        }

                        return (
                            <div key={`${instId}_${pId}`} style={{ border: "1px solid #ccc", padding: "15px", borderRadius: "5px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div>
                                    <p style={{ margin: "0 0 5px 0", fontWeight: "bold" }}>{formatDate(inst.date)} ({getDayOfWeek(inst.date)}) | {startTime} - {endTime}</p>
                                    <p style={{ margin: 0, fontSize: "14px" }}>Spordiala: {def.sport} {role === "parent" ? `| Mängija: ${pName}` : ""}</p>
                                </div>
                                <div>
                                    {existingReq ? (
                                        <span style={{ fontWeight: "bold", color: existingReq.status === "approved" ? "green" : existingReq.status === "rejected" ? "red" : "orange" }}>
                                            {statusDisplay}
                                        </span>
                                    ) : (
                                        <button onClick={() => handleRequestExtra(instId, pId)}>Taotle</button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    if (isAuthLoading) {
        return <LoadingSpinner />
    }

    if (error) {
        return <ErrorMessage message={error} />
    }

    return (
        <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
            <h2 style={{ marginBottom: "20px" }}>Eelstaatused</h2>
            {msg && <p style={{ color: msg.startsWith("Error") ? "red" : "green", fontWeight: "bold" }}>{msg}</p>}

            {role === "player" && myPlayerId === null ? (
                <EmptyState message="Mängija andmed puuduvad." />
            ) : role === "parent" && Object.keys(parentLinks || {}).filter(id => parentLinks[id] === true).length === 0 ? (
                <EmptyState message="Ühtegi last ei leitud." />
            ) : visibleInstances.length === 0 ? (
                <EmptyState message="Eelstaatused puuduvad." />
            ) : (
                <>
                    {renderSessionGroup(upcomingSessions, "Tulevased treeningud")}
                    {renderSessionGroup(activeSessions, "Aktiivsed treeningud")}

                    {pastSessions.length > 0 && (
                        <div style={{ marginTop: "40px" }}>
                            <button onClick={() => { setShowPast(!showPast) }} style={{ marginBottom: "15px" }}>
                                {showPast ? "Peida möödunud treeningud" : "Näita möödunud treeninguid"}
                            </button>
                            {showPast && renderSessionGroup(pastSessions, "Möödunud treeningud")}
                        </div>
                    )}

                    {renderExtraRequestsSection()}
                </>
            )}
        </div>
    )
}
