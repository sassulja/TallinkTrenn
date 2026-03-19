import React, { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ref, onValue, update, set, get, remove, push } from "firebase/database"
import { useAuth } from "../contexts/AuthContext"
import { database } from "../services/firebase"
import { getTallinnNow, combineDateAndTime } from "../utils/dateUtils"
import { PRESTATUS_LABELS, REALSTATUS_LABELS, EFFORT_SCALE, PLAYER_EFFORT_SCALE, COACH_ENGAGEMENT_SCALE } from "../utils/displayUtils"
import { LoadingSpinner, ErrorMessage, EmptyState } from "../components/UIHelpers"

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
function RosterRow({ playerId, rData, playerData, att, sessionStarted, onTapCycle, isMobile }) {
    const pName = playerData ? `${playerData.firstName} ${playerData.lastName}` : playerId
    const isRemoved = rData.removedByCoach === true
    const preStatus = att?.preStatus || null
    const realStatus = att?.realStatus || null
    const preLabel = PRESTATUS_LABELS[preStatus] || PRESTATUS_LABELS.null
    const realInfo = REAL_STATUS_DISPLAY[realStatus] || REAL_STATUS_DISPLAY[null]
    const showLateCancel = att?.lateCancel === true

    if (isRemoved) {
        if (isMobile) return (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #eee", color: "#999" }}>
                <div style={{ textDecoration: "line-through" }}>{pName}</div>
                <div style={{ fontSize: "13px", fontStyle: "italic" }}>Eemaldatud</div>
            </div>
        )
        return (
            <tr style={{ color: "#999" }}>
                <td style={{ textDecoration: "line-through", padding: "10px 8px" }}>{pName}</td>
                <td style={{ padding: "10px 8px" }}>—</td>
                <td style={{ padding: "10px 8px", fontStyle: "italic" }}>Eemaldatud</td>
            </tr>
        )
    }

    if (isMobile) return (
        <div onClick={() => onTapCycle(playerId)}
            style={{ padding: "10px 0", borderBottom: "1px solid #eee", cursor: "pointer", userSelect: "none", transition: "background 0.15s" }}
            onPointerDown={e => e.currentTarget.style.background = "#f3f4f6"}
            onPointerUp={e => e.currentTarget.style.background = ""}
            onPointerLeave={e => e.currentTarget.style.background = ""}>
            <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                {pName}
                {rData.walkIn && <span style={{ marginLeft: "8px", backgroundColor: "#e0f2f1", color: "#00796b", padding: "2px 6px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}>🚶</span>}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: sessionStarted ? "#999" : "#333", fontSize: "13px" }}>{preLabel}</span>
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
            <td style={{ padding: "10px 8px", color: sessionStarted ? "#999" : "#333", fontSize: sessionStarted ? "13px" : "14px" }}>{preLabel}</td>
            <td onClick={() => onTapCycle(playerId)}
                style={{ padding: "10px 8px", cursor: "pointer", userSelect: "none", fontWeight: "bold", transition: "background 0.15s", minHeight: "44px" }}
                onMouseDown={e => e.currentTarget.style.background = "#e5e7eb"}
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
    const [rosterAddPlayerId, setRosterAddPlayerId] = useState("")
    const [msg, setMsg] = useState("")
    const [error, setError] = useState(null)
    const [showExtraReqs, setShowExtraReqs] = useState(false)
    const [activeTab, setActiveTab] = useState(null) // set after data loads
    const [sessionMessages, setSessionMessages] = useState([])
    const [msgText, setMsgText] = useState("")
    const [myDisplayName, setMyDisplayName] = useState(null)
    const [feedbackData, setFeedbackData] = useState(null) // null = not loaded, {} = loaded
    const [feedbackLocal, setFeedbackLocal] = useState({}) // { playerId: { effort, note } }
    const [feedbackSaved, setFeedbackSaved] = useState({}) // { playerId: true } for "Salvestatud" flash
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
        if (!currentUser || !instanceId) return
        const handleErr = () => setError("Andmete laadimine ebaõnnestus.")
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
        return () => { unsubInst(); unsubRoster(); unsubAtt(); unsubPlayers(); unsubExtraReqs(); unsubMessages(); unsubCoachPerms() }
    }, [currentUser, instanceId, role])

    useEffect(() => {
        if (!inst?.definitionId) { setDef(null); return }
        const handleErr = () => setError("Andmete laadimine ebaõnnestus.")
        const unsub = onValue(ref(database, `sessionDefinitions/${inst.definitionId}`), snap => setDef(snap.val()), handleErr)
        return unsub
    }, [inst?.definitionId])

    // Read display name from RTDB
    useEffect(() => {
        if (!currentUser) return
        get(ref(database, `users/${currentUser.uid}/displayName`)).then(snap => {
            if (snap.exists()) setMyDisplayName(snap.val())
        }).catch(() => {})
    }, [currentUser])

    // ─── Compute default tab once def + inst available ──
    useEffect(() => {
        if (!inst || !def || activeTab !== null) return
        const nowMs = getTallinnNow().getTime()
        const startTime = inst.startTime || def.startTime || "00:00"
        const endTime = inst.endTime || def.endTime || "00:00"
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
        if (!hasPermission()) return
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
        if (!hasPermission()) return
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
                try { isPast = new Date(combineDateAndTime(inst.date, def.startTime)).getTime() <= Date.now() } catch (e) { console.error(e) }
            }
            const attUpdates = { preStatus: "kinnitatud" }
            if (isPast) { attUpdates.realStatus = "kohal"; attUpdates.markedBy = currentUser.uid; attUpdates.markedAt = new Date().toISOString() }
            if (attSnap.exists()) { await update(attRef, attUpdates) }
            else { attUpdates.lateCancel = false; if (!isPast) attUpdates.realStatus = null; await set(attRef, attUpdates) }
            
            setLocalAtt(prev => ({ ...prev, [playerId]: { ...(prev[playerId] || {}), ...attUpdates } }))
            
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
    const handleAddWalkIn = async () => {
        if (!walkInPlayerId || !hasPermission()) return
        setMsg("")
        const nowIso = new Date().toISOString()
        try {
            await update(ref(database), { [`rosters/${instanceId}/${walkInPlayerId}`]: { source: "walkIn", addedBy: currentUser.uid, addedAt: nowIso, walkIn: true, removedByCoach: false } })
            await set(ref(database, `attendance/${instanceId}/${walkInPlayerId}`), { preStatus: null, realStatus: "kohal", lateCancel: false, markedBy: currentUser.uid, markedAt: nowIso })
            
            setRoster(prev => ({ ...prev, [walkInPlayerId]: { source: "walkIn", addedBy: currentUser.uid, addedAt: nowIso, walkIn: true, removedByCoach: false } }))
            setLocalAtt(prev => ({ ...prev, [walkInPlayerId]: { preStatus: null, realStatus: "kohal", lateCancel: false, markedBy: currentUser.uid, markedAt: nowIso } }))
            
            setMsg("Walk-in lisatud.")
            setWalkInPlayerId("")
        } catch (err) { console.error("Walk-in add failed", err); setMsg(`Error: ${err.message}`) }
    }

    // ─── Roster add (Staatus) — NO attendance write ─
    const handleRosterAdd = async () => {
        if (!rosterAddPlayerId || !hasPermission()) return
        setMsg("")
        try {
            await update(ref(database), {
                [`rosters/${instanceId}/${rosterAddPlayerId}`]: { addedAt: new Date().toISOString(), addedBy: currentUser.uid, source: "manual_add", walkIn: false, removedByCoach: false }
            })
            setRoster(prev => ({
                ...prev,
                [rosterAddPlayerId]: { addedAt: new Date().toISOString(), addedBy: currentUser.uid, source: "manual_add", walkIn: false, removedByCoach: false }
            }))
            setMsg("Mängija lisatud nimekirja.")
            setRosterAddPlayerId("")
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
            const pName = p ? `${p.firstName} ${p.lastName}` : pId;
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
    if (!hasPermission()) {
        return (
            <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
                <button onClick={() => navigate("/sessions")} style={{ marginBottom: "16px", cursor: "pointer" }}>← Tagasi</button>
                <p style={{ color: "red" }}>Sul puudub õigus selle treeningu haldamiseks.</p>
            </div>
        )
    }

    // ─── Computed values ────────────────────────────
    const startTime = inst.startTime || def?.startTime || "00:00"
    const sessionStartMs = new Date(combineDateAndTime(inst.date, startTime)).getTime()
    const sessionStarted = sessionStartMs <= getTallinnNow().getTime()
    const sport = inst.sport || def?.sport || ""
    const endTime = inst.endTime || def?.endTime || ""
    const timeDisplay = endTime ? `${startTime} - ${endTime}` : startTime

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
        <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
            {/* Back button */}
            <button onClick={() => { clearTimeout(debounceTimer.current); flushWrites(); navigate("/sessions") }}
                style={{ marginBottom: "16px", cursor: "pointer", background: "none", border: "1px solid #ccc", borderRadius: "6px", padding: "6px 12px" }}>
                ← Tagasi
            </button>

            {/* Session Header */}
            <div style={{ marginBottom: "16px" }}>
                <h2 style={{ marginBottom: "4px" }}>{formatEstonianDate(inst.date)}</h2>
                <div style={{ fontSize: "18px", fontWeight: "bold" }}>{timeDisplay}</div>
                <div style={{ textTransform: "capitalize", color: "#555", marginTop: "4px" }}>{sport}</div>
                <div style={{ fontSize: "12px", color: "#999", marginTop: "4px" }}>{instanceId}</div>
            </div>

            {msg && <p style={{ color: msg.startsWith("Error") ? "red" : "green", fontWeight: "bold", marginBottom: "12px" }}>{msg}</p>}

            {/* Tab Bar */}
            <TabBar activeTab={activeTab || "staatus"} onTabChange={handleTabChange} />

            {/* ═══════════ STAATUS TAB ═══════════ */}
            {(activeTab === "staatus" || activeTab === null) && (<>
                {/* preStatus summary */}
                <div style={{ background: "#f8f9fa", padding: "12px 16px", borderRadius: "8px", marginBottom: "20px", fontSize: "14px", display: "flex", flexWrap: "wrap", gap: "16px" }}>
                    <span>{PRESTATUS_LABELS.kinnitatud}: <b>{preStatusCounts.kinnitatud}</b></span>
                    <span>{PRESTATUS_LABELS.null}: <b>{preStatusCounts.vastamata}</b></span>
                    <span>{PRESTATUS_LABELS.eiOsale}: <b>{preStatusCounts.eiOsale}</b></span>
                </div>

                {/* preStatus player list */}
                {rosterEntries.length === 0 ? <EmptyState message="Nimekiri tühi." /> : (
                    <div style={{ marginBottom: "20px" }}>
                        {rosterEntries.filter(([, rData]) => !rData.removedByCoach).map(([pId, rData]) => {
                            const p = players[pId]
                            const pName = p ? `${p.firstName} ${p.lastName}` : pId
                            const ps = localAtt[pId]?.preStatus || null
                            const psLabel = PRESTATUS_LABELS[ps] || PRESTATUS_LABELS.null
                            const psColor = PRE_STATUS_COLORS[ps] || "#999"
                            const hasAtt = localAtt[pId]?.realStatus != null
                            const canRemove = role === "admin" || !hasAtt
                            return (
                                <div key={pId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #eee" }}>
                                    <span>
                                        {pName}
                                        {rData.walkIn && <span style={{ marginLeft: "8px", backgroundColor: "#e0f2f1", color: "#00796b", padding: "2px 6px", borderRadius: "4px", fontSize: "12px" }}>🚶</span>}
                                    </span>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span style={{ color: psColor, fontWeight: "bold", fontSize: "13px" }}>{psLabel}</span>
                                        <button onClick={() => handleRemovePlayer(pId)} disabled={!canRemove}
                                            style={{ padding: "2px 8px", fontSize: "12px", background: canRemove ? "#fee2e2" : "#eee", color: canRemove ? "#dc2626" : "#999", border: "1px solid " + (canRemove ? "#fca5a5" : "#ddd"), borderRadius: "4px", cursor: canRemove ? "pointer" : "not-allowed" }}>
                                            Eemalda
                                        </button>
                                    </div>
                                </div>
                            )
                        })}

                        {/* Eemaldatud section */}
                        {rosterEntries.some(([, rData]) => rData.removedByCoach) && (
                            <div style={{ marginTop: "16px" }}>
                                <div style={{ fontSize: "13px", fontWeight: "bold", color: "#999", marginBottom: "8px" }}>Eemaldatud</div>
                                {rosterEntries.filter(([, rData]) => rData.removedByCoach).map(([pId]) => {
                                    const p = players[pId]
                                    const pName = p ? `${p.firstName} ${p.lastName}` : pId
                                    return (
                                        <div key={pId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f5f5f5", color: "#aaa" }}>
                                            <span style={{ textDecoration: "line-through" }}>{pName}</span>
                                            <button onClick={() => handleRestorePlayer(pId)}
                                                style={{ padding: "2px 8px", fontSize: "12px", background: "#f0fdf4", color: "#22c55e", border: "1px solid #86efac", borderRadius: "4px", cursor: "pointer" }}>
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
                    <div style={{ borderTop: "2px solid #ddd", paddingTop: "16px", marginBottom: "20px" }}>
                        <h3 onClick={() => setShowExtraReqs(!showExtraReqs)} style={{ cursor: "pointer", marginTop: 0 }}>
                            Lisatreeningu taotlused ({pendingReqs.length} ootel) {showExtraReqs ? "▼" : "▶"}
                        </h3>
                        {showExtraReqs && (<>
                            {pendingReqs.map(([pId, req]) => {
                                const p = players[pId]
                                const pName = p ? `${p.firstName} ${p.lastName}` : pId
                                return (
                                    <div key={pId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", borderBottom: "1px solid #eee" }}>
                                        <span>{pName}</span>
                                        <div style={{ display: "flex", gap: "8px" }}>
                                            <button onClick={() => handleApproveRequest(pId)} style={{ background: "#4caf50", color: "white", border: "none", borderRadius: "4px", padding: "4px 12px", cursor: "pointer" }}>Kinnita</button>
                                            <button onClick={() => handleRejectRequest(pId)} style={{ background: "#f44336", color: "white", border: "none", borderRadius: "4px", padding: "4px 12px", cursor: "pointer" }}>Lükka tagasi</button>
                                        </div>
                                    </div>
                                )
                            })}
                            {resolvedReqs.length > 0 && (
                                <details style={{ marginTop: "12px" }}>
                                    <summary style={{ cursor: "pointer", fontWeight: "bold" }}>Lahendatud ({resolvedReqs.length})</summary>
                                    {resolvedReqs.map(([pId, req]) => {
                                        const p = players[pId]
                                        const pName = p ? `${p.firstName} ${p.lastName}` : pId
                                        return (
                                            <div key={pId} style={{ display: "flex", justifyContent: "space-between", padding: "8px", borderBottom: "1px solid #eee" }}>
                                                <span>{pName}</span>
                                                <span style={{ color: req.status === "approved" ? "green" : "red", fontWeight: "bold" }}>
                                                    {req.status === "approved" ? "Kinnitatud" : "Tagasi lükatud"}
                                                    {req.status === "rejected" && (
                                                        <button onClick={() => handleApproveRequest(pId)} style={{ marginLeft: "8px", background: "#4caf50", color: "white", border: "none", borderRadius: "4px", padding: "2px 8px", fontSize: "12px", cursor: "pointer" }}>Kinnita</button>
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
                <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
                    <h3 style={{ marginTop: 0, marginBottom: "12px" }}>Lisa nimekirja</h3>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                        <select value={rosterAddPlayerId} onChange={e => setRosterAddPlayerId(e.target.value)} style={{ flex: 1, minWidth: "150px", padding: "8px" }}>
                            <option value="">-- Vali mängija --</option>
                            {availableForRosterAdd.map(([pId, p]) => (<option key={pId} value={pId}>{p.firstName} {p.lastName}</option>))}
                        </select>
                        <button onClick={handleRosterAdd} disabled={!rosterAddPlayerId}
                            style={{ padding: "8px 16px", background: rosterAddPlayerId ? "#3b82f6" : "#ccc", color: "white", border: "none", borderRadius: "6px", cursor: rosterAddPlayerId ? "pointer" : "not-allowed" }}>
                            Lisa nimekirja
                        </button>
                    </div>
                </div>

                {/* Session Messages */}
                <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "16px" }}>
                    <h3 style={{ marginTop: 0, marginBottom: "12px" }}>Sõnumid</h3>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                        <input
                            type="text"
                            value={msgText}
                            onChange={e => setMsgText(e.target.value.slice(0, 300))}
                            placeholder="Kirjuta teade..."
                            maxLength={300}
                            style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid #ccc" }}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
                        />
                        <button onClick={handleSendMessage} disabled={!msgText.trim()}
                            style={{ padding: "8px 16px", background: msgText.trim() ? "#3b82f6" : "#ccc", color: "white", border: "none", borderRadius: "6px", cursor: msgText.trim() ? "pointer" : "not-allowed" }}>
                            Saada
                        </button>
                    </div>
                    <div style={{ fontSize: "12px", color: "#999", textAlign: "right", marginBottom: "12px" }}>{msgText.length}/300</div>
                    {sessionMessages.length === 0 ? (
                        <p style={{ color: "#999", textAlign: "center", fontSize: "14px" }}>Teateid pole.</p>
                    ) : (
                        <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                            {sessionMessages.map(m => (
                                <div key={m.id} style={{ borderBottom: "1px solid #eee", padding: "8px 0" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#666", marginBottom: "4px" }}>
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
                    <button onClick={handleMarkAllPresent} disabled={allKohal}
                        style={{ width: "100%", padding: "12px", marginBottom: "16px", border: "none", borderRadius: "8px", cursor: allKohal ? "default" : "pointer", fontWeight: "bold", fontSize: "15px", background: allKohal ? "#d1d5db" : "#22c55e", color: "white", transition: "background 0.2s" }}>
                        {allKohal ? "Kõik märgitud kohal" : "Märgi kõik kohal"}
                    </button>
                )}

                {/* Roster Table / Mobile */}
                {rosterEntries.length === 0 ? <EmptyState message="Nimekiri tühi." /> : isMobile ? (
                    <div style={{ marginBottom: "20px" }}>
                        {rosterEntries.map(([pId, rData]) => (
                            <RosterRow key={pId} playerId={pId} rData={rData} playerData={players[pId]}
                                att={localAtt[pId]} sessionStarted={sessionStarted} onTapCycle={handleTapCycle} isMobile={true} />
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
                                    att={localAtt[pId]} sessionStarted={sessionStarted} onTapCycle={handleTapCycle} isMobile={false} />
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Walk-in Add */}
                <div style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "16px", marginBottom: "20px" }}>
                    <h3 style={{ marginTop: 0, marginBottom: "12px" }}>+ Lisa walk-in</h3>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                        <select value={walkInPlayerId} onChange={e => setWalkInPlayerId(e.target.value)} style={{ flex: 1, minWidth: "150px", padding: "8px" }}>
                            <option value="">-- Vali mängija --</option>
                            {availableForWalkIn.map(([pId, p]) => (<option key={pId} value={pId}>{p.firstName} {p.lastName}</option>))}
                        </select>
                        <button onClick={handleAddWalkIn} disabled={!walkInPlayerId}
                            style={{ padding: "8px 16px", background: walkInPlayerId ? "#22c55e" : "#ccc", color: "white", border: "none", borderRadius: "6px", cursor: walkInPlayerId ? "pointer" : "not-allowed" }}>
                            Lisa
                        </button>
                    </div>
                </div>
            </>)}

            {/* ═══════════ TAGASISIDE TAB ═══════════ */}
            {activeTab === "tagasiside" && (() => {
                const endTime = inst.endTime || def?.endTime || "00:00"
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
                            const pName = p ? `${p.firstName} ${p.lastName}` : pId
                            const local = feedbackLocal[pId] || { effort: 3, note: "" }
                            const saved = feedbackSaved[pId]

                            const pAtt = localAtt[pId] || {}
                            const rStatus = pAtt.realStatus
                            const canFeedback = rStatus === "kohal" || rStatus === "hilines"

                            return (
                                <div key={pId} style={{ border: "1px solid #eee", borderRadius: "8px", padding: "16px", marginBottom: "12px" }}>
                                    <div style={{ fontWeight: "bold", marginBottom: "10px", fontSize: "15px" }}>{pName}</div>

                                    {!canFeedback ? (
                                        <div style={{ fontSize: "14px", color: "#999", fontStyle: "italic" }}>Ei osalenud</div>
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
                                                            border: local.effort === e.value ? "2px solid #3b82f6" : "1px solid #ddd",
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
                                                        style={{ padding: "6px 16px", background: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
                                                        Salvesta
                                                    </button>
                                                    {saved && <span style={{ color: "#22c55e", fontWeight: "bold", fontSize: "13px" }}>Salvestatud ✓</span>}
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
                                                <div key={fb.pId} style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid #f5f5f5" }}>
                                                    <div style={{ fontWeight: "bold", fontSize: "14px", color: "#3b82f6", marginBottom: "4px" }}>{pName}</div>
                                                    <div style={{ fontSize: "13px" }}>Pingutus: {eff.emoji} {eff.label}</div>
                                                    <div style={{ fontSize: "13px" }}>Treener: {eng.emoji} {eng.label}</div>
                                                    {fb.note && <div style={{ fontSize: "13px", fontStyle: "italic", color: "#666", marginTop: "4px" }}>"{fb.note}"</div>}
                                                </div>
                                            )
                                        })}
                                        {noFbPlayers.map(pId => {
                                            const p = players[pId]
                                            const pName = p ? `${p.firstName} ${p.lastName}` : pId
                                            return (
                                                <div key={pId} style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid #f5f5f5" }}>
                                                    <div style={{ fontWeight: "bold", fontSize: "14px", color: "#999", marginBottom: "2px" }}>{pName}</div>
                                                    <div style={{ fontSize: "13px", color: "#999" }}>Tagasiside puudub</div>
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
