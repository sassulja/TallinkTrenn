import React, { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ref, onValue, update, set, get, remove, push } from "firebase/database"
import { useAuth } from "../contexts/AuthContext"
import { database } from "../services/firebase"
import { getTallinnNow, combineDateAndTime } from "../utils/dateUtils"
import { PRESTATUS_LABELS, REALSTATUS_LABELS, EFFORT_SCALE, PLAYER_EFFORT_SCALE, COACH_ENGAGEMENT_SCALE } from "../utils/displayUtils"
import { LoadingSpinner, ErrorMessage, EmptyState } from "../components/UIHelpers"
import PrimaryButton from "../components/ui/PrimaryButton"
import SecondaryButton from "../components/ui/SecondaryButton"
import StatusText from "../components/ui/StatusText"
import ActionBlock from "../components/ui/ActionBlock"

const REAL_STATUS_CYCLE = [null, "kohal", "puudus", "hilines", "vabastatud"]
const REAL_STATUS_DISPLAY = {
    null: { icon: "⬜", label: REALSTATUS_LABELS.null },
    kohal: { icon: "🟢", label: REALSTATUS_LABELS.kohal },
    puudus: { icon: "🔴", label: REALSTATUS_LABELS.puudus },
    hilines: { icon: "🟡", label: REALSTATUS_LABELS.hilines },
    vabastatud: { icon: "⚪", label: REALSTATUS_LABELS.vabastatud }
}
const PRE_STATUS_COLORS = { kinnitatud: "#22c55e", eiOsale: "#ef4444" }

function formatEstonianDate(dateStr) {
    if (!dateStr) return ""
    const [y, m, d] = dateStr.split("-")
    const dateObj = new Date(y, m - 1, d)
    const days = ["Pühapäev", "Esmaspäev", "Teisipäev", "Kolmapäev", "Neljapäev", "Reede", "Laupäev"]
    return `${d}.${m}.${y} (${days[dateObj.getDay()]})`
}

function compareRosterNames(nameA, idA, nameB, idB) {
    const nameCompare = nameA.localeCompare(nameB, "et")
    if (nameCompare !== 0) return nameCompare
    return idA.localeCompare(idB)
}

// ─── Tab Bar ────────────────────────────────────────────
function TabBar({ activeTab, onTabChange }) {
    const tabs = [
        { key: "staatus", label: "Staatus" },
        { key: "kohalolek", label: "Kohalolek" },
        { key: "tagasiside", label: "Tagasiside" }
    ]
    return (
        <div style={{ display: "flex", borderBottom: "2px solid #e5e7eb", marginBottom: "20px" }}>
            {tabs.map(t => (
                <button key={t.key} onClick={() => onTabChange(t.key)}
                    style={{
                        flex: 1, padding: "10px 0", background: "none", border: "none", cursor: "pointer",
                        fontWeight: activeTab === t.key ? "bold" : "normal", fontSize: "15px",
                        borderBottom: activeTab === t.key ? "3px solid #3b82f6" : "3px solid transparent",
                        color: activeTab === t.key ? "#3b82f6" : "#666", transition: "all 0.15s"
                    }}>
                    {t.label}
                </button>
            ))}
        </div>
    )
}

// ─── Kohalolek: RosterRow ───────────────────────────────
function RosterRow({ playerId, rData, playerData, att, sessionStarted, onTapCycle, isMobile, attendanceDisabled }) {
    const pName = playerData ? `${playerData.firstName} ${playerData.lastName}` : "Tundmatu mängija"
    const isRemoved = rData.removedByCoach === true
    const preStatus = att?.preStatus || null
    const realStatus = att?.realStatus || null
    const preLabel = PRESTATUS_LABELS[preStatus] || PRESTATUS_LABELS.null
    const realInfo = REAL_STATUS_DISPLAY[realStatus] || REAL_STATUS_DISPLAY[null]
    const showLateCancel = att?.lateCancel === true

    if (isRemoved) {
        if (isMobile) return (
            <div style={{ padding: "10px 0", borderBottom: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
                <div style={{ textDecoration: "line-through" }}>{pName}</div>
                <div style={{ fontSize: "13px", fontStyle: "italic" }}>Eemaldatud</div>
            </div>
        )
        return (
            <tr style={{ color: "var(--color-text-muted)" }}>
                <td style={{ textDecoration: "line-through", padding: "10px 8px" }}>{pName}</td>
                <td style={{ padding: "10px 8px" }}>—</td>
                <td style={{ padding: "10px 8px", fontStyle: "italic" }}>Eemaldatud</td>
            </tr>
        )
    }

    if (isMobile) return (
        <div onClick={() => !attendanceDisabled && onTapCycle(playerId)}
            style={{ padding: "10px 0", borderBottom: "1px solid #eee", cursor: attendanceDisabled ? "default" : "pointer", userSelect: "none", transition: "background 0.15s", opacity: attendanceDisabled ? 0.7 : 1 }}
            onPointerDown={e => { if (!attendanceDisabled) e.currentTarget.style.background = "#f3f4f6" }}
            onPointerUp={e => e.currentTarget.style.background = ""}
            onPointerLeave={e => e.currentTarget.style.background = ""}>
            <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                {pName}
                {rData.walkIn && <span style={{ marginLeft: "8px", backgroundColor: "#e0f2f1", color: "#00796b", padding: "2px 6px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}>🚶</span>}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: sessionStarted ? "var(--color-text-muted)" : "var(--color-text)", fontSize: "13px" }}>{preLabel}</span>
                <div style={{ minHeight: "44px", display: "flex", alignItems: "center", padding: "8px 16px", fontWeight: "bold", borderRadius: "8px", background: "#f3f4f6" }}>
                    {realInfo.icon} {realInfo.label}
                </div>
            </div>
            {showLateCancel && <span style={{ color: "orange", fontSize: "12px" }}>⚠️ Hiline tühistamine</span>}
        </div>
    )

    return (
        <tr>
            <td style={{ padding: "10px 8px" }}>
                {pName}
                {rData.walkIn && <span style={{ marginLeft: "8px", backgroundColor: "#e0f2f1", color: "#00796b", padding: "2px 6px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}>🚶</span>}
            </td>
            <td style={{ padding: "10px 8px", color: sessionStarted ? "var(--color-text-muted)" : "var(--color-text)", fontSize: sessionStarted ? "13px" : "14px" }}>{preLabel}</td>
            <td onClick={() => !attendanceDisabled && onTapCycle(playerId)}
                style={{ padding: "10px 8px", cursor: attendanceDisabled ? "default" : "pointer", userSelect: "none", fontWeight: "bold", transition: "background 0.15s", minHeight: "44px", opacity: attendanceDisabled ? 0.7 : 1 }}
                onMouseDown={e => { if (!attendanceDisabled) e.currentTarget.style.background = "#e5e7eb" }}
                onMouseUp={e => e.currentTarget.style.background = ""}
                onMouseLeave={e => e.currentTarget.style.background = ""}>
                {realInfo.icon} {realInfo.label}
                {showLateCancel && <span style={{ color: "orange", display: "block", fontSize: "12px" }}>⚠️ Hiline tühistamine</span>}
            </td>
        </tr>
    )
}

// ─── Main Component ─────────────────────────────────────
export default function SessionPage() {
    const { instanceId } = useParams()
    const navigate = useNavigate()
    const { user: currentUser, role, isLoading } = useAuth()

    const [inst, setInst] = useState(null)
    const [def, setDef] = useState(null)
    const [roster, setRoster] = useState({})
    const [remoteAtt, setRemoteAtt] = useState({})
    const [localAtt, setLocalAtt] = useState({})
    const [players, setPlayers] = useState({})
    const [coachPerms, setCoachPerms] = useState({})
    const [extraRequests, setExtraRequests] = useState({})
    const [allPlayers, setAllPlayers] = useState({})
    const [walkInPlayerId, setWalkInPlayerId] = useState("")
    const [walkInSearch, setWalkInSearch] = useState("")
    const [rosterAddPlayerId, setRosterAddPlayerId] = useState("")
    const [playerSearch, setPlayerSearch] = useState("")
    const [msg, setMsg] = useState("")
    const [error, setError] = useState(null)
    const [showExtraReqs, setShowExtraReqs] = useState(false)
    const [activeTab, setActiveTab] = useState(null) // set after data loads
    const [sessionMessages, setSessionMessages] = useState([])
    const [msgText, setMsgText] = useState("")
    const [myDisplayName, setMyDisplayName] = useState(null)
    const [myPlayerId, setMyPlayerId] = useState(null)
    const [allInstances, setAllInstances] = useState({})
    const [allAttendance, setAllAttendance] = useState({})
    const [allExtraRequests, setAllExtraRequests] = useState({})
    const [feedbackData, setFeedbackData] = useState(null) // null = not loaded, {} = loaded
    const [feedbackLocal, setFeedbackLocal] = useState({}) // { playerId: { effort, note } }
    const [feedbackSaved, setFeedbackSaved] = useState({}) // { playerId: true } for "Salvestatud" flash
    const [isEditingSessionTime, setIsEditingSessionTime] = useState(false)
    const [editStartTime, setEditStartTime] = useState("")
    const [editEndTime, setEditEndTime] = useState("")
    const [isSavingSession, setIsSavingSession] = useState(false)
    const feedbackLoaded = useRef(false)

    const debounceTimer = useRef(null)
    const pendingWrites = useRef({})

    // ─── Flush writes ───────────────────────────────
    const flushWrites = useCallback(async () => {
        const writes = { ...pendingWrites.current }
        pendingWrites.current = {}
        const normalUpdates = {}
        const nullPlayers = []

        Object.entries(writes).forEach(([playerId, attState]) => {
            if (attState.realStatus === null) {
                nullPlayers.push(playerId)
            } else {
                Object.entries(attState).forEach(([field, value]) => {
                    normalUpdates[`attendance/${instanceId}/${playerId}/${field}`] = value
                })
            }
        })

        if (Object.keys(normalUpdates).length > 0) {
            try { await update(ref(database), normalUpdates) }
            catch (err) { console.error("Flush write failed", err) }
        }

        for (const playerId of nullPlayers) {
            try {
                const attRef = ref(database, `attendance/${instanceId}/${playerId}`)
                const snap = await get(attRef)
                const existing = snap.val()
                if (!existing || !existing.preStatus) {
                    await remove(attRef)
                } else {
                    await remove(ref(database, `attendance/${instanceId}/${playerId}/realStatus`))
                    await remove(ref(database, `attendance/${instanceId}/${playerId}/markedBy`))
                    await remove(ref(database, `attendance/${instanceId}/${playerId}/markedAt`))
                    await remove(ref(database, `attendance/${instanceId}/${playerId}/lateCancel`))
                }
            } catch (err) { console.error("Null cleanup failed for", playerId, err) }
        }
    }, [instanceId])

    // Flush on unmount
    useEffect(() => {
        return () => {
            clearTimeout(debounceTimer.current)
            const writes = { ...pendingWrites.current }
            pendingWrites.current = {}
            const normalUpdates = {}
            Object.entries(writes).forEach(([playerId, attState]) => {
                if (attState.realStatus === null) {
                    remove(ref(database, `attendance/${instanceId}/${playerId}/realStatus`)).catch(e => console.error(e))
                    remove(ref(database, `attendance/${instanceId}/${playerId}/markedBy`)).catch(e => console.error(e))
                    remove(ref(database, `attendance/${instanceId}/${playerId}/markedAt`)).catch(e => console.error(e))
                    remove(ref(database, `attendance/${instanceId}/${playerId}/lateCancel`)).catch(e => console.error(e))
                } else {
                    Object.entries(attState).forEach(([field, value]) => {
                        normalUpdates[`attendance/${instanceId}/${playerId}/${field}`] = value
                    })
                }
            })
            if (Object.keys(normalUpdates).length > 0) {
                update(ref(database), normalUpdates).catch(e => console.error(e))
            }
        }
    }, [instanceId])

    // ─── Data subscriptions ─────────────────────────
    useEffect(() => {
        if (!currentUser) return
        const handleErr = () => setError("Andmete laadimine ebaõnnestus.")
        const unsubAllInstances = onValue(ref(database, "sessionInstances"), snap => {
            setAllInstances(snap.val() || {})
        }, handleErr)
        const unsubAllAttendance = onValue(ref(database, "attendance"), snap => {
            setAllAttendance(snap.val() || {})
        }, handleErr)
        const unsubAllExtraReqs = onValue(ref(database, "extraRequests"), snap => {
            setAllExtraRequests(snap.val() || {})
        }, handleErr)
        if (!instanceId) return () => { unsubAllInstances(); unsubAllAttendance(); unsubAllExtraReqs() }
        const unsubInst = onValue(ref(database, `sessionInstances/${instanceId}`), snap => setInst(snap.val()), handleErr)
        const unsubRoster = onValue(ref(database, `rosters/${instanceId}`), snap => setRoster(snap.val() || {}), handleErr)
        const unsubAtt = onValue(ref(database, `attendance/${instanceId}`), snap => {
            const data = snap.val() || {}
            setRemoteAtt(data)
            setLocalAtt(prev => {
                const merged = { ...data }
                Object.entries(pendingWrites.current).forEach(([pId, fields]) => {
                    merged[pId] = { ...(merged[pId] || {}), ...fields }
                })
                return merged
            })
        }, handleErr)
        const unsubPlayers = onValue(ref(database, "players"), snap => {
            setPlayers(snap.val() || {})
            setAllPlayers(snap.val() || {})
        }, handleErr)
        const unsubExtraReqs = onValue(ref(database, `extraRequests/${instanceId}`), snap => setExtraRequests(snap.val() || {}), handleErr)
        const unsubMessages = onValue(ref(database, `sessionMessages/${instanceId}`), snap => {
            const data = snap.val() || {}
            const arr = Object.entries(data).map(([id, m]) => ({ id, ...m })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            setSessionMessages(arr)
        }, handleErr)
        let unsubCoachPerms = () => {}
        if (role === "coach") {
            unsubCoachPerms = onValue(ref(database, `coachPermissions/${currentUser.uid}`), snap => setCoachPerms(snap.val() || {}), handleErr)
        }
        return () => { unsubAllInstances(); unsubAllAttendance(); unsubAllExtraReqs(); unsubInst(); unsubRoster(); unsubAtt(); unsubPlayers(); unsubExtraReqs(); unsubMessages(); unsubCoachPerms() }
    }, [currentUser, instanceId, role])

    useEffect(() => {
        if (!inst?.definitionId) { setDef(null); return }
        const handleErr = () => setError("Andmete laadimine ebaõnnestus.")
        const unsub = onValue(ref(database, `sessionDefinitions/${inst.definitionId}`), snap => setDef(snap.val()), handleErr)
        return unsub
    }, [inst?.definitionId])

    useEffect(() => {
        setEditStartTime(inst?.startTime || "")
        setEditEndTime(inst?.endTime || "")
    }, [inst?.startTime, inst?.endTime])

    // Read display name from RTDB
    useEffect(() => {
        if (!currentUser) return
        get(ref(database, `users/${currentUser.uid}/displayName`)).then(snap => {
            if (snap.exists()) setMyDisplayName(snap.val())
        }).catch(() => {})
    }, [currentUser])

    useEffect(() => {
        if (!currentUser || role !== "player") return
        get(ref(database, `users/${currentUser.uid}/playerId`)).then(snap => {
            if (snap.exists()) setMyPlayerId(snap.val())
        }).catch(() => {})
    }, [currentUser, role])

    // ─── Compute default tab once def + inst available ──
    useEffect(() => {
        if (!inst || !def || activeTab !== null) return
        const nowMs = getTallinnNow().getTime()
        const startTime = inst.startTime || "00:00"
        const endTime = inst.endTime || "00:00"
        const sessionStartMs = new Date(combineDateAndTime(inst.date, startTime)).getTime()
        const sessionEndMs = new Date(combineDateAndTime(inst.date, endTime)).getTime()
        const oneHourAfterEnd = sessionEndMs + 60 * 60 * 1000

        if (nowMs < sessionStartMs - 60 * 60 * 1000) setActiveTab("staatus")
        else if (nowMs <= oneHourAfterEnd) setActiveTab("kohalolek")
        else setActiveTab("tagasiside")
    }, [inst, def, activeTab])

    // ─── Permission ─────────────────────────────────
    const hasPermission = () => {
        if (role === "admin") return true
        if (role !== "coach") return false
        if (coachPerms.global === true) return true
        if (inst?.definitionId && coachPerms.sessionDefinitions?.[inst.definitionId] === true) return true
        if (inst?.assignedCoachIds?.[currentUser.uid] === true) return true
        return false
    }

    // ─── Tap cycle ──────────────────────────────────
    const handleTapCycle = (playerId) => {
        if (!hasPermission() || inst?.status === "cancelled") return
        const currentAtt = localAtt[playerId] || {}
        const currentReal = currentAtt.realStatus || null
        const idx = REAL_STATUS_CYCLE.indexOf(currentReal)
        const newReal = REAL_STATUS_CYCLE[(idx + 1) % REAL_STATUS_CYCLE.length]
        const preStatus = currentAtt.preStatus || null
        let lateCancel = false
        if (newReal === "puudus" && preStatus === "kinnitatud") lateCancel = true
        const writeData = { realStatus: newReal, lateCancel, markedBy: currentUser.uid, markedAt: new Date().toISOString() }
        setLocalAtt(prev => ({ ...prev, [playerId]: { ...(prev[playerId] || {}), ...writeData } }))
        pendingWrites.current[playerId] = writeData
        clearTimeout(debounceTimer.current)
        debounceTimer.current = setTimeout(flushWrites, 5000)
    }

    // ─── Mark All Present ───────────────────────────
    const handleMarkAllPresent = () => {
        if (!hasPermission() || inst?.status === "cancelled") return
        const nowIso = new Date().toISOString()
        Object.entries(roster).forEach(([playerId, rData]) => {
            if (rData.removedByCoach) return
            const writeData = { realStatus: "kohal", lateCancel: false, markedBy: currentUser.uid, markedAt: nowIso }
            setLocalAtt(prev => ({ ...prev, [playerId]: { ...(prev[playerId] || {}), ...writeData } }))
            pendingWrites.current[playerId] = writeData
        })
        clearTimeout(debounceTimer.current)
        debounceTimer.current = setTimeout(flushWrites, 5000)
    }

    // ─── Extra request handlers ─────────────────────
    const handleApproveRequest = async (playerId) => {
        if (!hasPermission()) return
        setMsg("")
        try {
            const updates = {}
            updates[`extraRequests/${instanceId}/${playerId}/status`] = "approved"
            updates[`rosters/${instanceId}/${playerId}`] = { addedAt: new Date().toISOString(), addedBy: currentUser.uid, source: "extraRequest", walkIn: false, removedByCoach: false }
            await update(ref(database), updates)
            
            setExtraRequests(prev => ({ ...prev, [playerId]: { ...(prev[playerId] || {}), status: "approved" } }))
            setRoster(prev => ({ ...prev, [playerId]: { addedAt: new Date().toISOString(), addedBy: currentUser.uid, source: "extraRequest", walkIn: false, removedByCoach: false } }))
            
            const attRef = ref(database, `attendance/${instanceId}/${playerId}`)
            const attSnap = await get(attRef)
            let isPast = false
            if (inst && def) {
                try { isPast = new Date(combineDateAndTime(inst.date, inst.startTime || "00:00")).getTime() <= Date.now() } catch (e) { console.error(e) }
            }
            const attUpdates = { preStatus: "kinnitatud" }
            if (isPast) { attUpdates.realStatus = "kohal"; attUpdates.markedBy = currentUser.uid; attUpdates.markedAt = new Date().toISOString() }
            if (attSnap.exists()) { await update(attRef, attUpdates) }
            else { attUpdates.lateCancel = false; if (!isPast) attUpdates.realStatus = null; await set(attRef, attUpdates) }
            
            setLocalAtt(prev => ({ ...prev, [playerId]: { ...(prev[playerId] || {}), ...attUpdates } }))

            const rejectUpdates = {}
            for (const otherInstId in allExtraRequests) {
                if (otherInstId === instanceId) continue
                const req = allExtraRequests[otherInstId]?.[playerId]
                if (req?.status === "pending") {
                    rejectUpdates[`extraRequests/${otherInstId}/${playerId}/status`] = "rejected"
                }
            }
            if (Object.keys(rejectUpdates).length > 0) {
                await update(ref(database), rejectUpdates)
            }
            
            setMsg("Taotlus kinnitatud.")
        } catch (err) { console.error("Approve failed", err); setMsg(`Error: ${err.message}`) }
    }

    const handleRejectRequest = async (playerId) => {
        if (!hasPermission()) return
        try { 
            await update(ref(database, `extraRequests/${instanceId}/${playerId}`), { status: "rejected" }); 
            setExtraRequests(prev => ({ ...prev, [playerId]: { ...(prev[playerId] || {}), status: "rejected" } }))
            setMsg("Taotlus tagasi lükatud.") 
        }
        catch (err) { console.error("Reject failed", err); setMsg(`Error: ${err.message}`) }
    }

    // ─── Walk-in add (Kohalolek) ────────────────────
    const handleAddWalkIn = async (playerId = null) => {
        const selectedPlayerId = playerId || walkInPlayerId
        if (!selectedPlayerId || !hasPermission() || inst?.status === "cancelled") return
        setMsg("")
        const nowIso = new Date().toISOString()
        try {
            const extraReqSnap = await get(ref(database, `extraRequests/${instanceId}/${selectedPlayerId}`))
            const updates = {
                [`rosters/${instanceId}/${selectedPlayerId}`]: { source: "walkIn", addedBy: currentUser.uid, addedAt: nowIso, walkIn: true, removedByCoach: false }
            }
            if (extraReqSnap.exists()) {
                updates[`extraRequests/${instanceId}/${selectedPlayerId}/status`] = "approved"
            }
            await update(ref(database), updates)
            await set(ref(database, `attendance/${instanceId}/${selectedPlayerId}`), { preStatus: null, realStatus: "kohal", lateCancel: false, markedBy: currentUser.uid, markedAt: nowIso })
            
            setRoster(prev => ({ ...prev, [selectedPlayerId]: { source: "walkIn", addedBy: currentUser.uid, addedAt: nowIso, walkIn: true, removedByCoach: false } }))
            if (extraReqSnap.exists()) {
                setExtraRequests(prev => ({ ...prev, [selectedPlayerId]: { ...(prev[selectedPlayerId] || {}), status: "approved" } }))
            }
            setLocalAtt(prev => ({ ...prev, [selectedPlayerId]: { preStatus: null, realStatus: "kohal", lateCancel: false, markedBy: currentUser.uid, markedAt: nowIso } }))
            
            setMsg("Walk-in lisatud.")
            setWalkInPlayerId("")
            setWalkInSearch("")
        } catch (err) { console.error("Walk-in add failed", err); setMsg(`Error: ${err.message}`) }
    }

    // ─── Roster add (Staatus) — NO attendance write ─
    const handleRosterAdd = async (playerId = null) => {
        const selectedPlayerId = playerId || rosterAddPlayerId
        if (!selectedPlayerId || !hasPermission()) return
        setMsg("")
        try {
            const nowIso = new Date().toISOString()
            const extraReqSnap = await get(ref(database, `extraRequests/${instanceId}/${selectedPlayerId}`))
            const updates = {
                [`rosters/${instanceId}/${selectedPlayerId}`]: { addedAt: nowIso, addedBy: currentUser.uid, source: "manual_add", walkIn: false, removedByCoach: false }
            }
            if (extraReqSnap.exists()) {
                updates[`extraRequests/${instanceId}/${selectedPlayerId}/status`] = "approved"
            }
            await update(ref(database), updates)
            setRoster(prev => ({
                ...prev,
                [selectedPlayerId]: { addedAt: nowIso, addedBy: currentUser.uid, source: "manual_add", walkIn: false, removedByCoach: false }
            }))
            if (extraReqSnap.exists()) {
                setExtraRequests(prev => ({ ...prev, [selectedPlayerId]: { ...(prev[selectedPlayerId] || {}), status: "approved" } }))
            }
            setMsg("Mängija lisatud nimekirja.")
            setRosterAddPlayerId("")
            setPlayerSearch("")
        } catch (err) { console.error("Roster add failed", err); setMsg(`Error: ${err.message}`) }
    }

    // ─── Send session message ───────────────────────
    const handleSendMessage = async () => {
        if (!msgText.trim() || !hasPermission()) return
        try {
            const userName = myDisplayName || currentUser.email || "Treener"
            await push(ref(database, `sessionMessages/${instanceId}`), {
                text: msgText.trim(),
                createdBy: currentUser.uid,
                createdByName: userName,
                createdAt: new Date().toISOString()
            })
            setMsgText("")
        } catch (err) { console.error("Send message failed", err); setMsg(`Error: ${err.message}`) }
    }

    const handleRequestExtraSession = async () => {
        if (role !== "player" || !myPlayerId || inst?.status === "cancelled") return
        if (roster[myPlayerId] && roster[myPlayerId].removedByCoach !== true) return

        try {
            const requestRef = ref(database, `extraRequests/${instanceId}/${myPlayerId}`)
            const snap = await get(requestRef)
            const existing = snap.val()

            if (existing?.status === "pending") {
                setMsg("Taotlus juba saadetud")
                return
            }

            let overlapWarning = null
            const newStart = combineDateAndTime(inst.date, inst.startTime)
            const newEnd = combineDateAndTime(inst.date, inst.endTime)

            for (const otherInstId in allInstances) {
                if (otherInstId === instanceId) continue
                const otherInst = allInstances[otherInstId]
                if (!otherInst) continue
                const playerAtt = allAttendance[otherInstId]?.[myPlayerId]
                if (playerAtt?.preStatus !== "kinnitatud") continue

                const existingStart = combineDateAndTime(otherInst.date, otherInst.startTime)
                const existingEnd = combineDateAndTime(otherInst.date, otherInst.endTime)
                if (existingStart < newEnd && existingEnd > newStart) {
                    overlapWarning = `Sa oled juba samal ajal kinnitanud osalemise trennis ${otherInst.sport} ${otherInst.date} ${otherInst.startTime}–${otherInst.endTime}`
                    break
                }
            }

            await set(requestRef, {
                requestedAt: new Date().toISOString(),
                requestedBy: currentUser.uid,
                status: "pending",
                note: null
            })
            setMsg(overlapWarning ? `Taotlus saadetud. ${overlapWarning}` : "Taotlus saadetud")
        } catch (err) {
            console.error("Extra request failed", err)
            setMsg(`Error: ${err.message}`)
        }
    }

    const handleCancelExtraRequest = async () => {
        if (!myPlayerId) return

        const prevStatus = extraRequests?.[myPlayerId]?.status || null

        setExtraRequests(prev => ({
            ...prev,
            [myPlayerId]: {
                ...(prev[myPlayerId] || {}),
                status: "cancelled"
            }
        }))

        try {
            await update(ref(database, `extraRequests/${instanceId}/${myPlayerId}`), {
                status: "cancelled"
            })
        } catch (err) {
            console.error("Cancel failed", err)

            setExtraRequests(prev => ({
                ...prev,
                [myPlayerId]: {
                    ...(prev[myPlayerId] || {}),
                    status: prevStatus
                }
            }))
        }
    }

    const handleSaveSessionTime = async () => {
        if (!hasPermission() || !editStartTime || !editEndTime) return
        setMsg("")
        setIsSavingSession(true)
        try {
            await update(ref(database, `sessionInstances/${instanceId}`), {
                startTime: editStartTime,
                endTime: editEndTime
            })
            setIsEditingSessionTime(false)
            setMsg("Treeningu aeg uuendatud.")
        } catch (err) {
            console.error("Session time save failed", err)
            setMsg(`Error: ${err.message}`)
        } finally {
            setIsSavingSession(false)
        }
    }

    const handleCancelSession = async () => {
        if (!hasPermission() || inst?.status === "cancelled") return
        if (!window.confirm("Kas tühistada see treening?")) return
        setMsg("")
        setIsSavingSession(true)
        try {
            await update(ref(database, `sessionInstances/${instanceId}`), {
                status: "cancelled"
            })
            setMsg("Treening tühistatud.")
        } catch (err) {
            console.error("Session cancel failed", err)
            setMsg(`Error: ${err.message}`)
        } finally {
            setIsSavingSession(false)
        }
    }

    // ─── Feedback: lazy load via useEffect ────────────
    useEffect(() => {
        if (activeTab !== "tagasiside" || feedbackLoaded.current || !instanceId) return
        feedbackLoaded.current = true
        const doLoad = async () => {
            try {
                const snap = await get(ref(database, `feedback/${instanceId}`))
                const data = snap.val() || {}
                setFeedbackData(data)
                const local = {}
                Object.entries(roster).forEach(([pId, rData]) => {
                    if (rData.removedByCoach) return
                    const coachFb = data[pId]?.coach
                    local[pId] = {
                        effort: coachFb?.effort ?? 3,
                        note: coachFb?.note ?? ""
                    }
                })
                setFeedbackLocal(local)
            } catch (err) {
                console.error("Load feedback failed", err)
                setFeedbackData({})
            }
        }
        doLoad()
    }, [activeTab, instanceId, roster])

    const handleTabChange = (tab) => {
        if (tab === "tagasiside") {
            feedbackLoaded.current = false
        }
        setActiveTab(tab)
    }

    // ─── Roster: remove / restore ────────────────────
    const handleRemovePlayer = async (playerId) => {
        try {
            await update(ref(database, `rosters/${instanceId}/${playerId}`), { removedByCoach: true })
            setRoster(prev => ({ ...prev, [playerId]: { ...prev[playerId], removedByCoach: true } }))
        } catch (err) { console.error("Remove player failed", err); setMsg(`Error: ${err.message}`) }
    }
    const handleRestorePlayer = async (playerId) => {
        try {
            await update(ref(database, `rosters/${instanceId}/${playerId}`), { removedByCoach: false })
            setRoster(prev => ({ ...prev, [playerId]: { ...prev[playerId], removedByCoach: false } }))
        } catch (err) { console.error("Restore player failed", err); setMsg(`Error: ${err.message}`) }
    }

    // ─── Feedback: save ─────────────────────────────
    const handleSaveFeedback = async (playerId) => {
        if (!hasPermission()) return
        const local = feedbackLocal[playerId]
        if (!local) return
        const existing = feedbackData?.[playerId]?.coach
        const nowIso = new Date().toISOString()
        const writeData = {
            effort: local.effort,
            note: local.note || null,
            createdAt: existing?.createdAt || nowIso,
            createdBy: existing?.createdBy || currentUser.uid,
            updatedAt: nowIso
        }
        try {
            await set(ref(database, `feedback/${instanceId}/${playerId}/coach`), writeData)
            setFeedbackData(prev => ({
                ...prev,
                [playerId]: { ...(prev?.[playerId] || {}), coach: writeData }
            }))
            setFeedbackSaved(prev => ({ ...prev, [playerId]: true }))
            setTimeout(() => setFeedbackSaved(prev => ({ ...prev, [playerId]: false })), 2000)
        } catch (err) { console.error("Save feedback failed", err); setMsg(`Error: ${err.message}`) }
    }

    // ─── Export CSV ─────────────────────────────────
    const handleExportSessionCSV = () => {
        const headers = [
            "Mängija nimi", "Eelstaatus", "Kohalolek", "Hiline tühistamine", 
            "Treeneri hinnang", "Mängija pingutus", "Treeneri kaasatus", "Treeneri märkus"
        ];
        const PRE_STATUS_MAP = { kinnitatud: PRESTATUS_LABELS.kinnitatud, eiOsale: PRESTATUS_LABELS.eiOsale };
        const REAL_STATUS_MAP = { kohal: REALSTATUS_LABELS.kohal, hilines: REALSTATUS_LABELS.hilines, puudus: REALSTATUS_LABELS.puudus, vabastatud: REALSTATUS_LABELS.vabastatud };

        const rows = [];
        rosterEntries.forEach(([pId, rData]) => {
            if (rData.removedByCoach) return;
            const p = players[pId];
            const pName = p ? `${p.firstName} ${p.lastName}` : "Tundmatu mängija";
            const att = localAtt[pId] || {};
            const psMatch = PRE_STATUS_MAP[att.preStatus];
            const preStatusLabel = psMatch ? psMatch : PRESTATUS_LABELS.null;
            const realStatus = REAL_STATUS_MAP[att.realStatus] || "";
            const lateCancel = att.lateCancel === true ? "Jah" : "—";

            const fbNode = feedbackData?.[pId] || {};
            const pf = fbNode.player || {};
            const cf = fbNode.coach || {};

            rows.push([
                pName, preStatusLabel, realStatus, lateCancel,
                cf.effort || "", pf.effort || "", pf.coachEngagement || "", cf.note || ""
            ]);
        });

        const escape = val => {
            if (val === null || val === undefined) return "";
            const str = String(val);
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };
        const csv = [headers.map(escape).join(","), ...rows.map(row => row.map(escape).join(","))].join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const sportName = inst.sport ? `_${inst.sport}` : "";
        a.download = `${inst.date}${sportName}_attendance.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (isLoading) return <LoadingSpinner />
    if (error) return <ErrorMessage message={error} />
    if (!inst) return <EmptyState message="Treeningut ei leitud." />

    const startTime = inst.startTime || "00:00"
    const nowMs = getTallinnNow().getTime()
    const sessionStartMs = new Date(combineDateAndTime(inst.date, startTime)).getTime()
    const sessionStarted = sessionStartMs <= nowMs
    const isLocked = (sessionStartMs - nowMs) < 60 * 60 * 1000
    const sport = inst.sport || ""
    const endTime = inst.endTime || ""
    const timeDisplay = endTime ? `${startTime} - ${endTime}` : startTime
    const isCancelled = inst.status === "cancelled"
    const playerRosterEntry = myPlayerId ? roster[myPlayerId] : null
    const playerOnRoster = !!playerRosterEntry && playerRosterEntry.removedByCoach !== true
    const myRequest = extraRequests?.[myPlayerId] || null
    const status = myRequest?.status || null

    if (role !== "player" && !hasPermission()) {
        return (
            <div style={{ maxWidth: "800px", margin: "0 auto", padding: "16px" }}>
                <button onClick={() => navigate("/sessions")} style={{ marginBottom: "16px", cursor: "pointer" }}>← Tagasi</button>
                <p style={{ color: "var(--color-danger)" }}>Sul puudub õigus selle treeningu haldamiseks.</p>
            </div>
        )
    }

    if (role === "player") {
        return (
            <div style={{ maxWidth: "800px", margin: "0 auto", padding: "16px" }}>
                <button onClick={() => navigate("/sessions")}
                    style={{ marginBottom: "16px", cursor: "pointer", background: "none", border: "1px solid #ccc", borderRadius: "8px", padding: "8px 12px" }}>
                    ← Tagasi
                </button>

                <div style={{ marginBottom: "16px" }}>
                    <h2 style={{ marginBottom: "8px" }}>{formatEstonianDate(inst.date)}</h2>
                    <div style={{ fontSize: "18px", fontWeight: "bold" }}>{timeDisplay}</div>
                    {isCancelled && (
                        <div style={{ display: "inline-block", marginTop: "8px", padding: "4px 8px", borderRadius: "999px", background: "#fee2e2", color: "#b91c1c", fontSize: "12px", fontWeight: "bold" }}>
                            Tühistatud
                        </div>
                    )}
                    <div style={{ textTransform: "capitalize", color: "var(--color-text-secondary)", marginTop: "8px" }}>{sport}</div>
                    <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "8px" }}>{instanceId}</div>
                </div>

                {msg && <p style={{ color: msg.startsWith("Error") ? "var(--color-danger)" : "var(--color-success)", fontWeight: "bold", marginBottom: "12px" }}>{msg}</p>}

                {!isCancelled && !playerOnRoster && (() => {
                    if (isLocked) return null

                    if (status === "pending") {
                        return (
                            <ActionBlock>
                                <StatusText type="warning">
                                    Taotlus on ootel
                                </StatusText>
                                <SecondaryButton onClick={e => {
                                    e.stopPropagation()
                                    handleCancelExtraRequest()
                                }}>
                                    Tühista taotlus
                                </SecondaryButton>
                            </ActionBlock>
                        )
                    }

                    if (status === "rejected") {
                        return (
                            <ActionBlock>
                                <StatusText type="error">
                                    Taotlus tagasi lükatud
                                </StatusText>
                            </ActionBlock>
                        )
                    }

                    if (status === "cancelled") {
                        return (
                            <ActionBlock>
                                <StatusText type="muted">
                                    Taotlus tühistatud
                                </StatusText>
                                <PrimaryButton onClick={e => {
                                    e.stopPropagation()
                                    handleRequestExtraSession()
                                }}>
                                    Soovin osaleda
                                </PrimaryButton>
                            </ActionBlock>
                        )
                    }

                    return (
                        <ActionBlock>
                            <PrimaryButton onClick={e => {
                                e.stopPropagation()
                                handleRequestExtraSession()
                            }}>
                                Soovin osaleda
                            </PrimaryButton>
                        </ActionBlock>
                    )
                })()}
            </div>
        )
    }

    const rosterEntries = Object.entries(roster).sort(([pIdA, rA], [pIdB, rB]) => {
        const removedA = rA.removedByCoach === true
        const removedB = rB.removedByCoach === true
        if (removedA && !removedB) return 1
        if (!removedA && removedB) return -1
        const nA = players[pIdA] ? `${players[pIdA].firstName} ${players[pIdA].lastName}` : pIdA
        const nB = players[pIdB] ? `${players[pIdB].firstName} ${players[pIdB].lastName}` : pIdB
        return compareRosterNames(nA, pIdA, nB, pIdB)
    })

    const availableForWalkIn = Object.entries(allPlayers).filter(([pId, p]) => p.active && !roster[pId])
        .sort((a, b) => compareRosterNames(`${a[1].firstName} ${a[1].lastName}`, a[0], `${b[1].firstName} ${b[1].lastName}`, b[0]))
    const availableForRosterAdd = availableForWalkIn // same list
    const currentRoster = roster || {}
    const availablePlayers = Object.entries(allPlayers || {})
        .filter(([pid, p]) => {
            if (!p) return false
            if (currentRoster[pid] && currentRoster[pid].removedByCoach !== true) return false
            if (!playerSearch.trim()) return false
            const fullName = `${p.firstName || ""} ${p.lastName || ""}`.toLowerCase()
            return fullName.includes(playerSearch.toLowerCase())
        })
        .sort(([, a], [, b]) => {
            const nameA = `${a.firstName || ""} ${a.lastName || ""}`.trim()
            const nameB = `${b.firstName || ""} ${b.lastName || ""}`.trim()
            return nameA.localeCompare(nameB)
        })
        .slice(0, 8)
    const availableWalkInPlayers = Object.entries(allPlayers || {})
        .filter(([pid, p]) => {
            if (!p) return false
            if (roster[pid] && roster[pid].removedByCoach !== true) return false
            if (!walkInSearch.trim()) return false

            const fullName = `${p.firstName || ""} ${p.lastName || ""}`.toLowerCase()
            return fullName.includes(walkInSearch.toLowerCase())
        })
        .sort(([, a], [, b]) => {
            const nameA = `${a.firstName || ""} ${a.lastName || ""}`.trim()
            const nameB = `${b.firstName || ""} ${b.lastName || ""}`.trim()
            return nameA.localeCompare(nameB)
        })
        .slice(0, 8)

    const pendingReqs = Object.entries(extraRequests).filter(([, r]) => r.status === "pending")
    const resolvedReqs = Object.entries(extraRequests).filter(([, r]) => r.status !== "pending")

    const allKohal = rosterEntries.every(([pId, rData]) => {
        if (rData.removedByCoach) return true
        return (localAtt[pId]?.realStatus || null) === "kohal"
    })

    const isMobile = typeof window !== "undefined" && window.innerWidth < 600

    // preStatus counts for Staatus tab
    const preStatusCounts = { kinnitatud: 0, eiOsale: 0, vastamata: 0 }
    rosterEntries.forEach(([pId, rData]) => {
        if (rData.removedByCoach) return
        const ps = localAtt[pId]?.preStatus || null
        if (ps === "kinnitatud") preStatusCounts.kinnitatud++
        else if (ps === "eiOsale") preStatusCounts.eiOsale++
        else preStatusCounts.vastamata++
    })

    // ─── RENDER ─────────────────────────────────────
    return (
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "16px" }}>
            {/* Back button */}
            <button onClick={() => { clearTimeout(debounceTimer.current); flushWrites(); navigate("/sessions") }}
                style={{ marginBottom: "16px", cursor: "pointer", background: "none", border: "1px solid #ccc", borderRadius: "8px", padding: "8px 12px" }}>
                ← Tagasi
            </button>

            {/* Session Header */}
            <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "var(--spacing-xs)" }}>
                    {formatEstonianDate(inst.date)} · {timeDisplay}
                </div>
                {isCancelled && (
                    <div style={{ display: "inline-block", marginTop: "8px", padding: "4px 8px", borderRadius: "999px", background: "#fee2e2", color: "#b91c1c", fontSize: "12px", fontWeight: "bold" }}>
                        Tühistatud
                    </div>
                )}
                <div style={{ textTransform: "capitalize", color: "var(--color-text-secondary)", marginTop: "var(--spacing-xs)" }}>{sport}</div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginTop: "12px" }}>
                    {!isEditingSessionTime ? (
                        <SecondaryButton onClick={() => setIsEditingSessionTime(true)}>
                            Muuda aega
                        </SecondaryButton>
                    ) : (
                        <>
                            <input
                                type="time"
                                value={editStartTime}
                                onChange={e => setEditStartTime(e.target.value)}
                                style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}
                            />
                            <input
                                type="time"
                                value={editEndTime}
                                onChange={e => setEditEndTime(e.target.value)}
                                style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}
                            />
                            <PrimaryButton onClick={handleSaveSessionTime} disabled={!editStartTime || !editEndTime || isSavingSession}>
                                Salvesta
                            </PrimaryButton>
                            <SecondaryButton onClick={() => { setIsEditingSessionTime(false); setEditStartTime(inst.startTime || ""); setEditEndTime(inst.endTime || "") }}>
                                Loobu
                            </SecondaryButton>
                        </>
                    )}
                    <SecondaryButton onClick={handleCancelSession} disabled={isCancelled || isSavingSession}>
                        Tühista treening
                    </SecondaryButton>
                </div>
            </div>

            {msg && <p style={{ color: msg.startsWith("Error") ? "var(--color-danger)" : "var(--color-success)", fontWeight: "bold", marginBottom: "12px" }}>{msg}</p>}

            {/* Tab Bar */}
            <TabBar activeTab={activeTab || "staatus"} onTabChange={handleTabChange} />

            {/* ═══════════ STAATUS TAB ═══════════ */}
            {(activeTab === "staatus" || activeTab === null) && (<>
                {/* preStatus summary */}
                <div style={{ background: "var(--color-background-secondary)", padding: "12px", borderRadius: "8px", marginBottom: "16px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    <StatusText type="muted">{PRESTATUS_LABELS.null} {preStatusCounts.vastamata}</StatusText>
                    <StatusText type="success">{PRESTATUS_LABELS.kinnitatud} {preStatusCounts.kinnitatud}</StatusText>
                    <StatusText type="error">{PRESTATUS_LABELS.eiOsale} {preStatusCounts.eiOsale}</StatusText>
                </div>

                {/* preStatus player list */}
                {rosterEntries.length === 0 ? <EmptyState message="Nimekiri tühi." /> : (
                    <div style={{ marginBottom: "16px" }}>
                        {rosterEntries.filter(([, rData]) => !rData.removedByCoach).map(([pId, rData]) => {
                            const p = players[pId]
                            const pName = p ? `${p.firstName} ${p.lastName}` : "Tundmatu mängija"
                            const ps = localAtt[pId]?.preStatus || null
                            const hasAtt = localAtt[pId]?.realStatus != null
                            const canRemove = role === "admin" || !hasAtt
                            return (
                                <div key={pId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderBottom: "1px solid var(--color-border)" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span style={{ fontWeight: "var(--font-weight-medium)" }}>
                                            {pName}
                                            {rData.walkIn && <span style={{ marginLeft: "8px", backgroundColor: "#e0f2f1", color: "#00796b", padding: "2px 6px", borderRadius: "4px", fontSize: "12px" }}>🚶</span>}
                                        </span>
                                        <StatusText type={ps === "kinnitatud" ? "success" : ps === "eiOsale" ? "error" : "muted"}>
                                            {PRESTATUS_LABELS[ps] || PRESTATUS_LABELS.null}
                                        </StatusText>
                                    </div>
                                    <SecondaryButton onClick={() => handleRemovePlayer(pId)} disabled={!canRemove}>
                                            Eemalda
                                    </SecondaryButton>
                                </div>
                            )
                        })}

                        {/* Eemaldatud section */}
                        {rosterEntries.some(([, rData]) => rData.removedByCoach) && (
                            <div style={{ marginTop: "12px" }}>
                                <div style={{ fontSize: "13px", fontWeight: "bold", color: "var(--color-text-muted)", marginBottom: "8px" }}>Eemaldatud</div>
                                {rosterEntries.filter(([, rData]) => rData.removedByCoach).map(([pId]) => {
                                    const p = players[pId]
                                    const pName = p ? `${p.firstName} ${p.lastName}` : "Tundmatu mängija"
                                    return (
                                        <div key={pId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
                                            <span style={{ textDecoration: "line-through" }}>{pName}</span>
                                            <button onClick={() => handleRestorePlayer(pId)}
                                                style={{ padding: "2px 8px", fontSize: "12px", background: "#f0fdf4", color: "var(--color-success)", border: "1px solid var(--color-success)", borderRadius: "4px", cursor: "pointer" }}>
                                                Taasta
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Extra Requests */}
                {(pendingReqs.length > 0 || resolvedReqs.length > 0) && (
                    <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "12px", marginBottom: "16px" }}>
                        <h3 onClick={() => setShowExtraReqs(!showExtraReqs)} style={{ cursor: "pointer", margin: "0 0 8px" }}>
                            Lisatreeningu taotlused ({pendingReqs.length} ootel) {showExtraReqs ? "▼" : "▶"}
                        </h3>
                        {showExtraReqs && (<>
                            {pendingReqs.map(([pId, req]) => {
                                const p = players[pId]
                                const pName = p ? `${p.firstName} ${p.lastName}` : "Tundmatu mängija"
                                return (
                                    <div key={pId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", borderBottom: "1px solid var(--color-border)" }}>
                                        <span>{pName}</span>
                                        <div style={{ display: "flex", gap: "8px" }}>
                                            <PrimaryButton onClick={() => handleApproveRequest(pId)} style={{ padding: "4px 12px", borderRadius: "4px" }}>Kinnita</PrimaryButton>
                                            <SecondaryButton onClick={() => handleRejectRequest(pId)} style={{ padding: "4px 12px", borderRadius: "4px" }}>Lükka tagasi</SecondaryButton>
                                        </div>
                                    </div>
                                )
                            })}
                            {resolvedReqs.length > 0 && (
                                <details style={{ marginTop: "12px" }}>
                                    <summary style={{ cursor: "pointer", fontWeight: "bold" }}>Lahendatud ({resolvedReqs.length})</summary>
                                    {resolvedReqs.map(([pId, req]) => {
                                        const p = players[pId]
                                        const pName = p ? `${p.firstName} ${p.lastName}` : "Tundmatu mängija"
                                        return (
                                            <div key={pId} style={{ display: "flex", justifyContent: "space-between", padding: "8px", borderBottom: "1px solid var(--color-border)" }}>
                                                <span>{pName}</span>
                                                <span style={{ color: req.status === "approved" ? "var(--color-success)" : "var(--color-danger)", fontWeight: "bold" }}>
                                                    {req.status === "approved" ? "Kinnitatud" : "Tagasi lükatud"}
                                                    {req.status === "rejected" && (
                                                        <PrimaryButton onClick={() => handleApproveRequest(pId)} style={{ marginLeft: "8px", padding: "2px 8px", fontSize: "12px", borderRadius: "4px" }}>Kinnita</PrimaryButton>
                                                    )}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </details>
                            )}
                        </>)}
                    </div>
                )}

                {/* Roster Tools — add player to roster (no attendance write) */}
                <div style={{ border: "1px solid var(--color-border)", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>
                    <h3 style={{ margin: "0 0 8px" }}>Lisa nimekirja</h3>
                    <input
                        type="text"
                        placeholder="Otsi mängijat..."
                        value={playerSearch}
                        onChange={e => setPlayerSearch(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "8px",
                            borderRadius: "6px",
                            border: "1px solid var(--color-border)",
                            marginBottom: "6px"
                        }}
                    />

                    {playerSearch && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {availablePlayers.length === 0 ? (
                                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                                    Mängijat ei leitud
                                </div>
                            ) : (
                                availablePlayers.map(([pid, p]) => {
                                    const name = `${p.firstName || ""} ${p.lastName || ""}`.trim()
                                    return (
                                        <div
                                            key={pid}
                                            onClick={() => {
                                                handleRosterAdd(pid)
                                                setPlayerSearch("")
                                            }}
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: "6px 8px",
                                                borderRadius: "6px",
                                                background: "var(--color-background-secondary)",
                                                border: "1px solid var(--color-border)",
                                                cursor: "pointer"
                                            }}
                                        >
                                            <span>{name}</span>
                                            <button
                                                onClick={e => {
                                                    e.stopPropagation()
                                                    handleRosterAdd(pid)
                                                    setPlayerSearch("")
                                                }}
                                                style={{
                                                    padding: "4px 8px",
                                                    fontSize: "12px",
                                                    borderRadius: "6px",
                                                    border: "1px solid var(--color-border)",
                                                    background: "white",
                                                    cursor: "pointer"
                                                }}
                                            >
                                                Lisa
                                            </button>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    )}
                </div>

                {/* Session Messages */}
                <div style={{ border: "1px solid var(--color-border)", borderRadius: "8px", padding: "12px" }}>
                    <h3 style={{ margin: "0 0 8px" }}>Sõnumid</h3>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                        <input
                            type="text"
                            value={msgText}
                            onChange={e => setMsgText(e.target.value.slice(0, 300))}
                            placeholder="Kirjuta teade..."
                            maxLength={300}
                            style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid var(--color-border)" }}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
                        />
                        <PrimaryButton onClick={handleSendMessage} disabled={!msgText.trim()}
                            style={{ borderRadius: "6px" }}>
                            Saada
                        </PrimaryButton>
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--color-text-muted)", textAlign: "right", marginBottom: "12px" }}>{msgText.length}/300</div>
                    {sessionMessages.length === 0 ? (
                        <p style={{ color: "var(--color-text-muted)", textAlign: "center", fontSize: "14px" }}>Teateid pole.</p>
                    ) : (
                        <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                            {sessionMessages.map(m => (
                                <div key={m.id} style={{ borderBottom: "1px solid var(--color-border)", padding: "8px 0" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "4px" }}>
                                        <span style={{ fontWeight: "bold" }}>{m.createdByName}</span>
                                        <span>{new Date(m.createdAt).toLocaleString("et-EE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                                    </div>
                                    <div style={{ fontSize: "14px" }}>{m.text}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </>)}

            {/* ═══════════ KOHALOLEK TAB ═══════════ */}
            {activeTab === "kohalolek" && (<>
                {isCancelled && (
                    <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px", fontSize: "13px", fontWeight: "bold" }}>
                        Treening on tühistatud. Kohaloleku tegevused on keelatud.
                    </div>
                )}

                {/* realStatus summary */}
                <div style={{ background: "#f8f9fa", padding: "12px 16px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px", display: "flex", flexWrap: "wrap", gap: "16px" }}>
                    <span>🟢 Kohal: <b>{rosterEntries.filter(([pId, r]) => !r.removedByCoach && (localAtt[pId]?.realStatus || null) === "kohal").length}</b></span>
                    <span>🟡 Hilines: <b>{rosterEntries.filter(([pId, r]) => !r.removedByCoach && localAtt[pId]?.realStatus === "hilines").length}</b></span>
                    <span>🔴 Puudus: <b>{rosterEntries.filter(([pId, r]) => !r.removedByCoach && localAtt[pId]?.realStatus === "puudus").length}</b></span>
                    <span>⚪ Vabastatud: <b>{rosterEntries.filter(([pId, r]) => !r.removedByCoach && localAtt[pId]?.realStatus === "vabastatud").length}</b></span>
                    <span>⬜ Märkimata: <b>{rosterEntries.filter(([pId, r]) => !r.removedByCoach && !(localAtt[pId]?.realStatus)).length}</b></span>
                </div>

                {/* Mark All Present */}
                {rosterEntries.length > 0 && (
                    <button onClick={handleMarkAllPresent} disabled={allKohal || isCancelled}
                        style={{ width: "100%", padding: "12px", marginBottom: "16px", border: "none", borderRadius: "8px", cursor: allKohal || isCancelled ? "default" : "pointer", fontWeight: "bold", fontSize: "15px", background: allKohal || isCancelled ? "#d1d5db" : "#22c55e", color: "white", transition: "background 0.2s" }}>
                        {allKohal ? "Kõik märgitud kohal" : "Märgi kõik kohal"}
                    </button>
                )}

                {/* Roster Table / Mobile */}
                {rosterEntries.length === 0 ? <EmptyState message="Nimekiri tühi." /> : isMobile ? (
                    <div style={{ marginBottom: "20px" }}>
                        {rosterEntries.map(([pId, rData]) => (
                            <RosterRow key={pId} playerId={pId} rData={rData} playerData={players[pId]}
                                att={localAtt[pId]} sessionStarted={sessionStarted} onTapCycle={handleTapCycle} isMobile={true} attendanceDisabled={isCancelled} />
                        ))}
                    </div>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
                        <thead><tr style={{ borderBottom: "2px solid #ddd", textAlign: "left" }}>
                            <th style={{ padding: "8px" }}>Mängija</th>
                            <th style={{ padding: "8px" }}>Eelstaatus</th>
                            <th style={{ padding: "8px" }}>Kohalolek</th>
                        </tr></thead>
                        <tbody>
                            {rosterEntries.map(([pId, rData]) => (
                                <RosterRow key={pId} playerId={pId} rData={rData} playerData={players[pId]}
                                    att={localAtt[pId]} sessionStarted={sessionStarted} onTapCycle={handleTapCycle} isMobile={false} attendanceDisabled={isCancelled} />
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Walk-in Add */}
                <div style={{ border: "1px solid var(--color-border)", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
                    <h3 style={{ marginTop: 0, marginBottom: "12px" }}>+ Lisa walk-in</h3>
                    <input
                        type="text"
                        placeholder="Otsi mängijat..."
                        value={walkInSearch}
                        onChange={e => setWalkInSearch(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "8px",
                            borderRadius: "6px",
                            border: "1px solid #ccc",
                            marginBottom: "6px"
                        }}
                    />
                    {walkInSearch && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {availableWalkInPlayers.length === 0 ? (
                                <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                                    Mängijat ei leitud
                                </div>
                            ) : (
                                availableWalkInPlayers.map(([pid, p]) => {
                                    const name = `${p.firstName || ""} ${p.lastName || ""}`.trim()
                                    return (
                                        <div
                                            key={pid}
                                            onClick={() => {
                                                handleAddWalkIn(pid)
                                                setWalkInSearch("")
                                            }}
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: "6px 8px",
                                                borderRadius: "6px",
                                                background: "#f9fafb",
                                                border: "1px solid var(--color-border)",
                                                cursor: "pointer"
                                            }}
                                        >
                                            <span>{name}</span>
                                            <button
                                                onClick={e => {
                                                    e.stopPropagation()
                                                    handleAddWalkIn(pid)
                                                    setWalkInSearch("")
                                                }}
                                                style={{
                                                    padding: "4px 8px",
                                                    fontSize: "12px",
                                                    borderRadius: "6px",
                                                    border: "1px solid #ccc",
                                                    background: "white",
                                                    cursor: "pointer"
                                                }}
                                            >
                                                Lisa
                                            </button>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    )}
                </div>
            </>)}

            {/* ═══════════ TAGASISIDE TAB ═══════════ */}
            {activeTab === "tagasiside" && (() => {
                const endTime = inst.endTime || "00:00"
                const sessionEndMs = new Date(combineDateAndTime(inst.date, endTime)).getTime()
                const editDeadlineMs = sessionEndMs + 7 * 24 * 60 * 60 * 1000
                const nowMsFb = getTallinnNow().getTime()
                const isExpired = role !== "admin" && nowMsFb > editDeadlineMs

                if (feedbackData === null) return <LoadingSpinner />

                const feedbackPlayers = rosterEntries.filter(([, rData]) => !rData.removedByCoach)

                return (
                    <div>
                        {isExpired && (
                            <div style={{ background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: "8px", padding: "10px 16px", marginBottom: "16px", fontSize: "13px", color: "#92400e", fontWeight: "bold" }}>
                                Muutmisaeg lõppenud
                            </div>
                        )}

                        {feedbackPlayers.length === 0 ? <EmptyState message="Nimekiri tühi." /> : feedbackPlayers.map(([pId]) => {
                            const p = players[pId]
                            const pName = p ? `${p.firstName} ${p.lastName}` : "Tundmatu mängija"
                            const local = feedbackLocal[pId] || { effort: 3, note: "" }
                            const saved = feedbackSaved[pId]

                            const pAtt = localAtt[pId] || {}
                            const rStatus = pAtt.realStatus
                            const canFeedback = rStatus === "kohal" || rStatus === "hilines"

                            return (
                                <div key={pId} style={{ border: "1px solid var(--color-border)", borderRadius: "8px", padding: "16px", marginBottom: "12px" }}>
                                    <div style={{ fontWeight: "bold", marginBottom: "10px", fontSize: "15px" }}>{pName}</div>

                                    {!canFeedback ? (
                                        <div style={{ fontSize: "14px", color: "var(--color-text-muted)", fontStyle: "italic" }}>Ei osalenud</div>
                                    ) : (
                                        <>
                                            {/* Effort picker */}
                                            <div style={{ display: "flex", gap: "4px", marginBottom: "10px", flexWrap: "wrap" }}>
                                                {EFFORT_SCALE.map(e => (
                                                    <button key={e.value}
                                                        onClick={() => !isExpired && setFeedbackLocal(prev => ({ ...prev, [pId]: { ...prev[pId], effort: e.value } }))}
                                                        disabled={isExpired}
                                                        style={{
                                                            padding: "6px 10px", borderRadius: "8px", cursor: isExpired ? "default" : "pointer",
                                                            border: local.effort === e.value ? "2px solid var(--color-primary)" : "1px solid #ddd",
                                                            background: local.effort === e.value ? "#eff6ff" : "white",
                                                            fontSize: "13px", transition: "all 0.1s"
                                                        }}>
                                                        {e.emoji} {e.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Note */}
                                            {isExpired ? (
                                                local.note && <div style={{ fontSize: "13px", color: "#555", fontStyle: "italic", marginBottom: "8px" }}>{local.note}</div>
                                            ) : (
                                                <input type="text" value={local.note}
                                                    onChange={e => setFeedbackLocal(prev => ({ ...prev, [pId]: { ...prev[pId], note: e.target.value.slice(0, 200) } }))}
                                                    placeholder="Märkus (vabatahtlik)"
                                                    maxLength={200}
                                                    style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc", marginBottom: "8px", boxSizing: "border-box" }}
                                                />
                                            )}

                                            {/* Save */}
                                            {!isExpired && (
                                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                                    <button onClick={() => handleSaveFeedback(pId)}
                                                        style={{ padding: "6px 16px", background: "var(--color-primary)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
                                                        Salvesta
                                                    </button>
                                                    {saved && <span style={{ color: "var(--color-success)", fontWeight: "bold", fontSize: "13px" }}>Salvestatud ✓</span>}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )
                        })}

                        {/* Player Feedback Summary Section */}
                        {(() => {
                            const allPlayerFb = []
                            const noFbPlayers = []
                            feedbackPlayers.forEach(([pId]) => {
                                const pf = feedbackData?.[pId]?.player
                                if (pf) allPlayerFb.push({ pId, ...pf })
                                else noFbPlayers.push(pId)
                            })

                            if (role !== "admin" && allPlayerFb.length === 0) return null

                            if (role === "admin") {
                                return (
                                    <div style={{ marginTop: "24px", borderTop: "2px solid #eee", paddingTop: "16px" }}>
                                        <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Mängijate tagasiside</h3>
                                        {allPlayerFb.map(fb => {
                                            const p = players[fb.pId]
                                            const pName = p ? `${p.firstName} ${p.lastName}` : fb.pId
                                            const eff = PLAYER_EFFORT_SCALE.find(e => e.value === fb.effort) || {}
                                            const eng = COACH_ENGAGEMENT_SCALE.find(e => e.value === fb.coachEngagement) || {}
                                            return (
                                                <div key={fb.pId} style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid var(--color-border)" }}>
                                                    <div style={{ fontWeight: "bold", fontSize: "14px", color: "var(--color-primary)", marginBottom: "4px" }}>{pName}</div>
                                                    <div style={{ fontSize: "13px" }}>Pingutus: {eff.emoji} {eff.label}</div>
                                                    <div style={{ fontSize: "13px" }}>Treener: {eng.emoji} {eng.label}</div>
                                                    {fb.note && <div style={{ fontSize: "13px", fontStyle: "italic", color: "var(--color-text-muted)", marginTop: "4px" }}>"{fb.note}"</div>}
                                                </div>
                                            )
                                        })}
                                        {noFbPlayers.map(pId => {
                                            const p = players[pId]
                                            const pName = p ? `${p.firstName} ${p.lastName}` : "Tundmatu mängija"
                                            return (
                                                <div key={pId} style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid var(--color-border)" }}>
                                                    <div style={{ fontWeight: "bold", fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "2px" }}>{pName}</div>
                                                    <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Tagasiside puudub</div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )
                            }

                            // Coach view: averages
                            const avgEffort = (allPlayerFb.reduce((sum, fb) => sum + fb.effort, 0) / allPlayerFb.length).toFixed(1)
                            const avgEngage = (allPlayerFb.reduce((sum, fb) => sum + fb.coachEngagement, 0) / allPlayerFb.length).toFixed(1)

                            const avgEffortEmoji = EFFORT_SCALE.find(e => e.value === Math.round(Number(avgEffort)))?.emoji || ""
                            const avgEngageEmoji = COACH_ENGAGEMENT_SCALE.find(e => e.value === Math.round(Number(avgEngage)))?.emoji || ""

                            return (
                                <div style={{ marginTop: "24px", borderTop: "2px solid #eee", paddingTop: "16px" }}>
                                    <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Mängijate tagasiside</h3>
                                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "16px", borderRadius: "8px" }}>
                                        <div style={{ fontSize: "15px", marginBottom: "8px" }}>
                                            <span style={{ fontWeight: "bold" }}>Keskmine pingutus: </span>
                                            {avgEffort} {avgEffortEmoji}
                                        </div>
                                        <div style={{ fontSize: "15px" }}>
                                            <span style={{ fontWeight: "bold" }}>Treeneri kaasatus: </span>
                                            {avgEngage} {avgEngageEmoji}
                                        </div>
                                    </div>
                                </div>
                            )
                        })()}

                        {/* Export Button */}
                        <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px dashed #ddd" }}>
                            <button onClick={handleExportSessionCSV}
                                style={{ padding: "8px 16px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}>
                                Ekspordi CSV
                            </button>
                        </div>
                    </div>
                )
            })()}
        </div>
    )
}
