import React, { useState, useEffect, useMemo } from "react"
import { ref, get } from "firebase/database"
import { database } from "../services/firebase"
import { getTallinnNow } from "../utils/dateUtils"
import { LoadingSpinner, ErrorMessage, EmptyState } from "../components/UIHelpers"

const EFFORT_EMOJIS = {
    1: "😴",
    2: "😕",
    3: "👍",
    4: "💪",
    5: "🔥"
}

const ENGAGEMENT_EMOJIS = {
    1: "😶",
    2: "🙁",
    3: "👍",
    4: "😊",
    5: "🤝"
}

function getEmoji(val, map) {
    if (!val || isNaN(val)) return ""
    const rounded = Math.round(val)
    return map[rounded] || ""
}

// ─── Stat Box Component ──────────────────────────────────
function StatBox({ label, value, emoji, trend }) {
    return (
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px", flex: 1, minWidth: "120px" }}>
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>{label}</div>
            <div style={{ fontSize: "20px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>{value} {emoji}</span>
                {trend === 'up' && <span style={{ color: "#16a34a", fontSize: "16px" }} title="Paraneb (vs eelmine 60 päeva)">↑</span>}
                {trend === 'down' && <span style={{ color: "#dc2626", fontSize: "16px" }} title="Langeb (vs eelmine 60 päeva)">↓</span>}
                {trend === 'stable' && <span style={{ color: "#9ca3af", fontSize: "16px" }} title="Stabiilne (vs eelmine 60 päeva)">→</span>}
            </div>
        </div>
    )
}

// ─── Main Page ───────────────────────────────────────────
export default function CoachOverviewPage() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    
    // Raw Data
    const [coaches, setCoaches] = useState([])
    const [permissions, setPermissions] = useState({})
    const [instances, setInstances] = useState({})
    const [definitions, setDefinitions] = useState({})
    const [feedback, setFeedback] = useState({})

    const [dateRange, setDateRange] = useState("all") // "30", "90", "all"

    // ─── 1. Load Data ──────────────────────────────────────
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true)
                const [uSnap, pSnap, instSnap, defSnap, fbSnap] = await Promise.all([
                    get(ref(database, "users")),
                    get(ref(database, "coachPermissions")),
                    get(ref(database, "sessionInstances")),
                    get(ref(database, "sessionDefinitions")),
                    get(ref(database, "feedback"))
                ])

                const usersData = uSnap.val() || {}
                const coachList = Object.keys(usersData)
                    .filter(uid => usersData[uid].role === "coach")
                    .map(uid => ({ id: uid, name: usersData[uid].displayName || "Teadmata Treener" }))
                
                // Sort A-Z
                coachList.sort((a,b) => a.name.localeCompare(b.name, "et-EE"))

                setCoaches(coachList)
                setPermissions(pSnap.val() || {})
                setInstances(instSnap.val() || {})
                setDefinitions(defSnap.val() || {})
                setFeedback(fbSnap.val() || {})
            } catch (err) {
                console.error("Failed to load coach overview", err)
                setError("Andmete laadimine ebaõnnestus.")
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    // ─── 2. Compute Averages ───────────────────────────────
    const coachStats = useMemo(() => {
        if (!coaches.length || !Object.keys(instances).length) return []

        const nowMs = getTallinnNow().getTime()
        const daysToMs = dateRange === "all" ? Infinity : parseInt(dateRange, 10) * 24 * 60 * 60 * 1000
        const cutoffMs = dateRange === "all" ? 0 : nowMs - daysToMs

        // For 90 day trend: Period 1 (last 30 days) vs Period 2 (days 31-90)
        const trendCutoff30Ms = nowMs - (30 * 24 * 60 * 60 * 1000)

        // 1. Filter instances by date range
        const filteredInstances = []
        Object.entries(instances).forEach(([instId, inst]) => {
            const defId = instId.includes("__") ? instId.split("__")[1] : null
            const def = defId && definitions[defId] ? definitions[defId] : null
            const endTime = def?.endTime || "23:59"
            const endMs = new Date(`${inst.date}T${endTime}:00+02:00`).getTime()
            
            // Allow all sessions that match the date range (no future filtering)
            if (endMs >= cutoffMs) {
                filteredInstances.push({ instId, inst, endMs })
            }
        })

        // 2. Process per coach
        return coaches.map(coach => {
            let sessionCount = 0
            let fbCount = 0
            let totalEffort = 0
            let totalEngagement = 0

            // Trend vars (only used if dateRange === "90")
            let p1FbCount = 0, p1Effort = 0, p1Engagement = 0
            let p2FbCount = 0, p2Effort = 0, p2Engagement = 0

            filteredInstances.forEach(meta => {
                const { instId, inst, endMs } = meta
                
                // Determine attribution for this coach
                let isAttributed = false
                const assigned = inst.assignedCoachIds || {}
                const assignedIds = Object.keys(assigned)

                // Does this instance have at least one assigned coach that is currently an active coach?
                const hasValidAssignment = assignedIds.some(aId => coaches.some(c => c.id === aId))
                
                if (hasValidAssignment) {
                    if (assigned[coach.id]) isAttributed = true
                } else {
                    const cPerms = permissions[coach.id] || {}
                    const defId = instId.includes("__") ? instId.split("__")[1] : instId
                    if (cPerms.global === true || (cPerms.sessionDefinitions && cPerms.sessionDefinitions[defId] === true)) {
                        isAttributed = true
                    }
                }

                if (!isAttributed) return // not their session

                sessionCount++

                const fbData = feedback[instId] || {}
                
                // Feedback is stored under feedback/{instId}/{playerId}
                Object.values(fbData).forEach(playerNode => {
                    const pf = playerNode.player
                    if (!pf || !pf.effort || !pf.coachEngagement) return
                    totalEffort += pf.effort
                    totalEngagement += pf.coachEngagement
                    fbCount++
                    
                    // Bucket for trends
                    if (dateRange === "90") {
                        if (endMs >= trendCutoff30Ms) {
                            p1Effort += pf.effort; p1Engagement += pf.coachEngagement; p1FbCount++
                        } else {
                            p2Effort += pf.effort; p2Engagement += pf.coachEngagement; p2FbCount++
                        }
                    }
                })
            })

            const avgEffort = fbCount > 0 ? (totalEffort / fbCount).toFixed(1) : "—"
            const avgEng = fbCount > 0 ? (totalEngagement / fbCount).toFixed(1) : "—"

            let trendEng = null
            let trendEffort = null
            if (dateRange === "90" && p1FbCount > 0 && p2FbCount > 0) {
                const p1AvgEng = p1Engagement / p1FbCount
                const p2AvgEng = p2Engagement / p2FbCount
                const diffEng = p1AvgEng - p2AvgEng
                if (diffEng > 0.2) trendEng = "up"
                else if (diffEng < -0.2) trendEng = "down"
                else trendEng = "stable"

                const p1AvgEff = p1Effort / p1FbCount
                const p2AvgEff = p2Effort / p2FbCount
                const diffEff = p1AvgEff - p2AvgEff
                if (diffEff > 0.2) trendEffort = "up"
                else if (diffEff < -0.2) trendEffort = "down"
                else trendEffort = "stable"
            }

            return {
                ...coach,
                sessionCount,
                fbCount,
                avgEffort,
                avgEng,
                trendEng,
                trendEffort
            }
        })

    }, [coaches, instances, definitions, permissions, feedback, dateRange])


    if (loading) return <LoadingSpinner />
    if (error) return <ErrorMessage message={error} />

    return (
        <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
            <h1 style={{ marginTop: 0, marginBottom: "24px", fontSize: "24px" }}>Treenerite ülevaade</h1>

            {/* Filters */}
            <div style={{ marginBottom: "24px", display: "flex", gap: "12px", background: "#f9fafb", padding: "16px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                <select value={dateRange} onChange={e => setDateRange(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db", minWidth: "180px" }}>
                    <option value="30">Viimased 30 päeva</option>
                    <option value="90">Viimased 90 päeva</option>
                    <option value="all">Kogu aeg</option>
                </select>
                {dateRange === "90" && <span style={{ padding: "8px", color: "#6b7280", fontSize: "13px" }}>90 päeva vaates näidatakse trendi (viimased 30p vs eelnevad 60p).</span>}
            </div>

            {/* Coach Cards */}
            {coachStats.length === 0 ? (
                <EmptyState message="Treenereid ei leitud." />
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {coachStats.map(c => (
                        <div key={c.id} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)", background: "white" }}>
                            <div style={{ background: "#f3f4f6", padding: "12px 16px", borderBottom: "1px solid #e5e7eb", fontWeight: "bold", fontSize: "16px" }}>
                                {c.name}
                            </div>
                            
                            <div style={{ padding: "16px" }}>
                                <div style={{ display: "flex", gap: "16px", marginBottom: "16px", fontSize: "14px", color: "#4b5563" }}>
                                    <div>Trennide arv: <strong>{c.sessionCount}</strong></div>
                                    <div>•</div>
                                    <div>Tagasisidestatud: <strong>{c.fbCount}</strong> korda</div>
                                </div>

                                {c.fbCount === 0 ? (
                                    <div style={{ padding: "12px", background: "#f9fafb", border: "1px dashed #d1d5db", borderRadius: "6px", color: "#6b7280", fontSize: "13px" }}>
                                        Tagasiside puudub valitud perioodil
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                                        <StatBox 
                                            label="Treeneri kaasatus (Mängijate hinnang)" 
                                            value={c.avgEng} 
                                            emoji={getEmoji(c.avgEng, ENGAGEMENT_EMOJIS)}
                                            trend={c.trendEng}
                                        />
                                        <StatBox 
                                            label="Pingutus (Mängijate keskmine)" 
                                            value={c.avgEffort} 
                                            emoji={getEmoji(c.avgEffort, EFFORT_EMOJIS)}
                                            trend={c.trendEffort}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
