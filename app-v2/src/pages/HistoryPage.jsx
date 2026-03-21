import React, { useEffect, useState } from "react"
import { ref, get } from "firebase/database"
import { useAuth } from "../contexts/AuthContext"
import { database } from "../services/firebase"
import { getTallinnNow, combineDateAndTime } from "../utils/dateUtils"
import { REALSTATUS_LABELS, EFFORT_SCALE, PLAYER_EFFORT_SCALE, COACH_ENGAGEMENT_SCALE } from "../utils/displayUtils"
import { LoadingSpinner, ErrorMessage, EmptyState } from "../components/UIHelpers"

function formatEstonianDate(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    const dateObj = new Date(y, m - 1, d);
    const days = ["Pühapäev", "Esmaspäev", "Teisipäev", "Kolmapäev", "Neljapäev", "Reede", "Laupäev"];
    const weekDay = days[dateObj.getDay()];
    return `${d}.${m}.${y} (${weekDay})`;
}

const REAL_STATUS_DISPLAY = {
    kohal: { icon: "🟢", label: REALSTATUS_LABELS.kohal },
    puudus: { icon: "🔴", label: REALSTATUS_LABELS.puudus },
    hilines: { icon: "🟡", label: REALSTATUS_LABELS.hilines },
    vabastatud: { icon: "⚪", label: REALSTATUS_LABELS.vabastatud }
}

function HistoryRow({ instId, inst, def, attendance, feedbackData, playerId, nowMs, role }) {
    const startTime = inst.startTime || def?.startTime || ""
    const endTime = inst.endTime || def?.endTime || ""
    const timeDisplay = endTime ? `${startTime} - ${endTime}` : startTime
    const sport = inst.sport || def?.sport || ""

    let sessionEndMs = 0
    try {
        sessionEndMs = new Date(combineDateAndTime(inst.date, endTime)).getTime()
    } catch (e) {}

    const realStatus = attendance[instId]?.[playerId]?.realStatus || null
    const coachFb = feedbackData?.[instId]?.[playerId]?.coach
    const playerFb = feedbackData?.[instId]?.[playerId]?.player

    const coachFbVisible = nowMs >= (sessionEndMs + 24 * 60 * 60 * 1000)

    return (
        <div style={{
            border: "1px solid #ccc",
            borderRadius: "8px", padding: "16px", marginBottom: "12px",
            background: "white"
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <div style={{ fontWeight: "bold", fontSize: "16px" }}>{timeDisplay}</div>
            </div>
            <div style={{ color: "#555", fontSize: "14px", marginBottom: "4px" }}>{formatEstonianDate(inst.date)}</div>
            <div style={{ color: "#333", fontSize: "14px", textTransform: "capitalize", marginBottom: "8px" }}>{sport}</div>

            {/* Attendance Status */}
            <div style={{ marginBottom: "12px", fontSize: "14px" }}>
                Kohalolek: <span style={{ fontWeight: "bold" }}>
                    {realStatus ? (
                        <>{REAL_STATUS_DISPLAY[realStatus]?.icon} {REAL_STATUS_DISPLAY[realStatus]?.label}</>
                    ) : (
                        <span style={{ color: "#999", fontWeight: "normal" }}>{REALSTATUS_LABELS.null}</span>
                    )}
                </span>
            </div>

            {/* Feedback Section */}
            {(realStatus === "kohal" || realStatus === "hilines") && (
                <div style={{ borderTop: "1px solid #eee", paddingTop: "8px" }}>
                    <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>Tagasiside</div>

                    {/* Coach Feedback */}
                    <div style={{ marginBottom: "8px" }}>
                        <div style={{ fontSize: "13px", fontWeight: "bold", color: "#555", marginBottom: "2px" }}>Treener</div>
                        {!coachFb ? (
                            <div style={{ fontSize: "13px", color: "#999" }}>Tagasiside puudub</div>
                        ) : !coachFbVisible ? (
                            <div style={{ fontSize: "13px", color: "#f59e0b", fontStyle: "italic" }}>Treeneri tagasiside on varsti saadaval</div>
                        ) : (
                            <div style={{ fontSize: "13px" }}>
                                {(() => {
                                    const effortItem = EFFORT_SCALE.find(item => item.value === coachFb.effort)
                                    return effortItem ? `${effortItem.label} ${effortItem.emoji}` : coachFb.effort
                                })()}
                                {coachFb.note && <span style={{ marginLeft: "8px", fontStyle: "italic", color: "#666" }}>"{coachFb.note}"</span>}
                            </div>
                        )}
                    </div>

                    {/* Player Feedback */}
                    <div>
                        <div style={{ fontSize: "13px", fontWeight: "bold", color: "#555", marginBottom: "2px" }}>Mängija</div>
                        {!playerFb ? (
                            <div style={{ fontSize: "13px", color: "#999" }}>Puudub</div>
                        ) : (
                            <div style={{ fontSize: "13px" }}>
                                <div>Pingutus: <span style={{ marginLeft: "4px" }}>{(() => {
                                    const effortItem = PLAYER_EFFORT_SCALE.find(item => item.value === playerFb.effort)
                                    return effortItem ? `${effortItem.label} ${effortItem.emoji}` : playerFb.effort
                                })()}</span></div>
                                {role !== "parent" && (
                                    <div>Treener: <span style={{ marginLeft: "4px" }}>{(() => {
                                        const engagementItem = COACH_ENGAGEMENT_SCALE.find(item => item.value === playerFb.coachEngagement)
                                        return engagementItem ? `${engagementItem.label} ${engagementItem.emoji}` : playerFb.coachEngagement
                                    })()}</span></div>
                                )}
                                {playerFb.note && <div style={{ marginTop: "2px", fontStyle: "italic", color: "#666" }}>"{playerFb.note}"</div>}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default function HistoryPage() {
    const { user: currentUser, role, isLoading: authLoading } = useAuth()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Data 
    const [instances, setInstances] = useState({})
    const [definitions, setDefinitions] = useState({})
    const [attendance, setAttendance] = useState({})
    const [rosters, setRosters] = useState({})
    const [feedbackData, setFeedbackData] = useState({})
    const [players, setPlayers] = useState({})
    const [parentLinks, setParentLinks] = useState({})

    const [myPlayerId, setMyPlayerId] = useState(null)
    const [selectedChild, setSelectedChild] = useState(null)

    useEffect(() => {
        if (!currentUser) return
        if (role !== "player" && role !== "parent") return

        const fetchData = async () => {
            try {
                const [instSnap, defSnap, attSnap, rosterSnap, fbSnap] = await Promise.all([
                    get(ref(database, "sessionInstances")),
                    get(ref(database, "sessionDefinitions")),
                    get(ref(database, "attendance")),
                    get(ref(database, "rosters")),
                    get(ref(database, "feedback"))
                ])

                setInstances(instSnap.val() || {})
                setDefinitions(defSnap.val() || {})
                setAttendance(attSnap.val() || {})
                setRosters(rosterSnap.val() || {})
                setFeedbackData(fbSnap.val() || {})

                if (role === "player") {
                    const idSnap = await get(ref(database, `users/${currentUser.uid}/playerId`))
                    if (idSnap.exists()) setMyPlayerId(idSnap.val())
                }

                if (role === "parent") {
                    const [pSnap, plSnap] = await Promise.all([
                        get(ref(database, "players")),
                        get(ref(database, `parentLinks/${currentUser.uid}`))
                    ])
                    setPlayers(pSnap.val() || {})
                    const pl = plSnap.val() || {}
                    setParentLinks(pl)

                    const linkedIds = Object.keys(pl).filter(id => pl[id] === true)
                    if (linkedIds.length > 0) setSelectedChild(linkedIds[0])
                }
            } catch (err) {
                console.error("Failed to load history data", err)
                setError("Andmete laadimine ebaõnnestus.")
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [currentUser, role])

    if (authLoading || loading) return <LoadingSpinner />
    if (error) return <ErrorMessage message={error} />

    if (role !== "player" && role !== "parent") return <div style={{ padding: "20px" }}>Puudub õigus seda lehte vaadata.</div>

    let targetPlayerId = null
    if (role === "player") targetPlayerId = myPlayerId
    if (role === "parent") targetPlayerId = selectedChild

    if (role === "player" && !targetPlayerId) {
        return <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
            <h2 style={{ marginBottom: "16px" }}>Ajalugu</h2>
            <EmptyState message="Mängija andmed puuduvad." />
        </div>
    }

    const nowMs = getTallinnNow().getTime()

    // Build History
    const historySessions = []

    if (targetPlayerId) {
        Object.entries(instances)
            .forEach(([instId, inst]) => {
                const def = definitions[inst.definitionId]
                if (!def) return
                
                const currentRoster = rosters[instId] || {}
                if (!currentRoster[targetPlayerId]) return
                if (currentRoster[targetPlayerId].removedByCoach) return

                let sessionStartMs = 0
                try {
                    const startTime = inst.startTime || def.startTime || "00:00"
                    const endTime = inst.endTime || def.endTime || "00:00"
                    sessionStartMs = new Date(combineDateAndTime(inst.date, startTime)).getTime()
                    const sessionEndMs = new Date(combineDateAndTime(inst.date, endTime)).getTime()
                    if (sessionEndMs >= nowMs) return
                } catch (e) { return }

                historySessions.push({ instId, inst, def, sessionStartMs })
            })

        historySessions.sort((a, b) => {
            const startDiff = b.sessionStartMs - a.sessionStartMs
            if (startDiff !== 0) return startDiff
            return a.instId.localeCompare(b.instId)
        })
    }

    // Parent UI
    let parentSelector = null
    if (role === "parent") {
        const linkedPlayerIds = Object.keys(parentLinks).filter(id => parentLinks[id] === true)
        const childOptions = linkedPlayerIds.map(pId => {
            const p = players[pId]
            return { id: pId, name: p ? `${p.firstName} ${p.lastName}` : "Tundmatu mängija" }
        }).sort((a, b) => {
            const nameCompare = a.name.localeCompare(b.name, "et")
            if (nameCompare !== 0) return nameCompare
            return a.id.localeCompare(b.id)
        })

        if (childOptions.length === 0) {
            return <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
                <h2 style={{ marginBottom: "16px" }}>Ajalugu</h2>
                <EmptyState message="Ühtegi last ei leitud." />
            </div>
        }

        if (childOptions.length > 1) {
            parentSelector = (
                <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
                    {childOptions.map(c => (
                        <button key={c.id} onClick={() => setSelectedChild(c.id)}
                            style={{
                                padding: "6px 14px", borderRadius: "20px", border: "1px solid #ccc", cursor: "pointer",
                                background: selectedChild === c.id ? "#3b82f6" : "white",
                                color: selectedChild === c.id ? "white" : "#333",
                                fontWeight: selectedChild === c.id ? "bold" : "normal"
                            }}>
                            {c.name}
                        </button>
                    ))}
                </div>
            )
        }
    }

    return (
        <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
            <h2 style={{ marginBottom: "16px" }}>Ajalugu</h2>
            
            {parentSelector}

            {historySessions.length === 0 ? (
                <EmptyState message="Ajalugu tühi." />
            ) : (
                <div style={{ marginTop: "16px" }}>
                    {historySessions.map(s => (
                        <HistoryRow 
                            key={s.instId}
                            instId={s.instId}
                            inst={s.inst}
                            def={s.def}
                            attendance={attendance}
                            feedbackData={feedbackData}
                            playerId={targetPlayerId}
                            nowMs={nowMs}
                            role={role}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
