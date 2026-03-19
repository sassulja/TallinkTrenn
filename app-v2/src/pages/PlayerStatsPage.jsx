import React, { useState, useEffect, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ref, get } from "firebase/database"
import { database } from "../services/firebase"
import { getTallinnNow } from "../utils/dateUtils"
import { LoadingSpinner, ErrorMessage, EmptyState } from "../components/UIHelpers"

function formatEstonianDate(dateStr) {
    if (!dateStr) return ""
    const [y, m, d] = dateStr.split("-")
    const dateObj = new Date(y, m - 1, d)
    const days = ["Pühapäev", "Esmaspäev", "Teisipäev", "Kolmapäev", "Neljapäev", "Reede", "Laupäev"]
    return `${d}.${m}.${y} (${days[dateObj.getDay()]})`
}

// ─── Stat Card Component ──────────────────────────────────
function StatCard({ title, value, subtext }) {
    return (
        <div style={{ flex: 1, minWidth: "150px", background: "#f8f9fa", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px", textAlign: "center" }}>
            <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px", fontWeight: "bold" }}>{title}</div>
            <div style={{ fontSize: "24px", color: "#111827", fontWeight: "bold" }}>{value}</div>
            {subtext && <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>{subtext}</div>}
        </div>
    )
}

// ─── Session Row Component ────────────────────────────────
function SessionRow({ inst, rData, att }) {
    const isMobile = window.innerWidth <= 768
    const dateStr = formatEstonianDate(inst.date)
    const timeStr = `${inst.startTime || ""} - ${inst.endTime || ""}`
    const sportBadge = inst.sport === "tennis" ? "🎾 Tennis" : "🏋️ Füss"
    
    const preStatus = att?.preStatus || null
    const realStatus = att?.realStatus || null
    const preLabel = preStatus === "kinnitatud" ? "Kinnitatud" : preStatus === "eiOsale" ? "Ei osale" : "Vastamata"
    
    let realLabel = "Märkimata"
    let realIcon = "⬜"
    let rowColor = "#fefce8" // light yellow for unmarked

    if (realStatus === "kohal") { realLabel = "Kohal"; realIcon = "🟢"; rowColor = "#f0fdf4" }
    else if (realStatus === "hilines") { realLabel = "Hilines"; realIcon = "🟡"; rowColor = "#f0fdf4" }
    else if (realStatus === "puudus") { realLabel = "Puudus"; realIcon = "🔴"; rowColor = "#fef2f2" }
    else if (realStatus === "vabastatud") { realLabel = "Vabastatud"; realIcon = "⚪"; rowColor = "#f9fafb" }

    const showLateCancel = att?.lateCancel === true

    if (isMobile) {
        return (
            <div style={{ background: rowColor, border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px", marginBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div style={{ fontWeight: "bold", fontSize: "14px" }}>{dateStr}</div>
                    <div style={{ fontSize: "12px", background: "#eee", padding: "2px 6px", borderRadius: "4px" }}>{sportBadge}</div>
                </div>
                <div style={{ fontSize: "13px", color: "#555", marginBottom: "8px" }}>Kell: {timeStr}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e5e7eb", paddingTop: "8px" }}>
                    <span style={{ fontSize: "13px", color: "#666" }}>Eel: {preLabel}</span>
                    <span style={{ fontWeight: "bold", fontSize: "14px" }}>{realIcon} {realLabel}</span>
                </div>
                {showLateCancel && <div style={{ color: "orange", fontSize: "12px", marginTop: "4px", textAlign: "right" }}>⚠️ Hiline tühistamine</div>}
            </div>
        )
    }

    return (
        <tr style={{ background: rowColor, borderBottom: "1px solid #e5e7eb" }}>
            <td style={{ padding: "12px 8px" }}>
                <div style={{ fontWeight: "bold" }}>{dateStr}</div>
                <div style={{ fontSize: "13px", color: "#666" }}>{timeStr}</div>
            </td>
            <td style={{ padding: "12px 8px", fontSize: "14px" }}>{sportBadge}</td>
            <td style={{ padding: "12px 8px", fontSize: "14px" }}>{preLabel}</td>
            <td style={{ padding: "12px 8px", fontWeight: "bold" }}>
                {realIcon} {realLabel}
                {showLateCancel && <span style={{ color: "orange", display: "block", fontSize: "12px", fontWeight: "normal" }}>⚠️ Hiline tühistamine</span>}
            </td>
        </tr>
    )
}

// ─── Main Component ───────────────────────────────────────
export default function PlayerStatsPage() {
    const { playerId } = useParams()
    const navigate = useNavigate()
    
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [playerName, setPlayerName] = useState("")
    const [allPastSessions, setAllPastSessions] = useState([])
    const [dateRange, setDateRange] = useState("all") // "30", "90", "all"

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true)
                
                // 1. Get player name
                const pSnap = await get(ref(database, `players/${playerId}`))
                if (pSnap.exists()) {
                    const p = pSnap.val()
                    setPlayerName(`${p.firstName} ${p.lastName}`)
                } else {
                    setPlayerName(playerId)
                }

                // 2. Load instances and rosters
                const [instSnap, rostSnap] = await Promise.all([
                    get(ref(database, "sessionInstances")),
                    get(ref(database, "rosters"))
                ])

                const instances = instSnap.val() || {}
                const allRosters = rostSnap.val() || {}
                const nowMs = getTallinnNow().getTime()

                // 3. Find relevant past sessions
                const relevantInstanceIds = Object.keys(instances).filter(id => {
                    const inst = instances[id]
                    const instRoster = allRosters[id] || {}
                    const playerRosterData = instRoster[playerId]
                    
                    if (!playerRosterData) return false
                    if (playerRosterData.removedByCoach) return false
                    
                    const endTime = inst.endTime || "00:00"
                    const sessionEndMs = new Date(`${inst.date}T${endTime}:00+02:00`).getTime() // Approximate TZ
                    
                    return sessionEndMs < nowMs
                })

                // 4. Load attendance for those instances
                // To keep it light, we could load just the player's attendance per instance
                const attendancePromises = relevantInstanceIds.map(id => get(ref(database, `attendance/${id}/${playerId}`)))
                const attSnaps = await Promise.all(attendancePromises)

                const parsedSessions = relevantInstanceIds.map((id, index) => {
                    const inst = instances[id]
                    const rData = allRosters[id][playerId]
                    const att = attSnaps[index].val() || null
                    const startTime = inst.startTime || "00:00"
                    const startMs = new Date(`${inst.date}T${startTime}:00+02:00`).getTime()

                    return { id, inst, rData, att, startMs }
                })

                // Sort newest first
                parsedSessions.sort((a, b) => b.startMs - a.startMs)
                setAllPastSessions(parsedSessions)

            } catch (err) {
                console.error("Failed to load player stats", err)
                setError("Andmete laadimine ebaõnnestus.")
            } finally {
                setLoading(false)
            }
        }
        
        loadData()
    }, [playerId])

    const filteredSessions = useMemo(() => {
        if (dateRange === "all") return allPastSessions
        
        const nowMs = getTallinnNow().getTime()
        const daysToMs = parseInt(dateRange, 10) * 24 * 60 * 60 * 1000
        const cutoffMs = nowMs - daysToMs
        
        return allPastSessions.filter(s => s.startMs >= cutoffMs)
    }, [allPastSessions, dateRange])

    const stats = useMemo(() => {
        let attended = 0
        let absent = 0
        let excused = 0
        let unmarked = 0
        let lateCancels = 0

        filteredSessions.forEach(s => {
            const att = s.att || {}
            const realStatus = att.realStatus || null
            
            if (realStatus === "kohal" || realStatus === "hilines") attended++
            else if (realStatus === "puudus") absent++
            else if (realStatus === "vabastatud") excused++
            else unmarked++

            if (att.lateCancel) lateCancels++
        })

        const total = filteredSessions.length
        const rate = total > 0 ? ((attended / total) * 100).toFixed(1) : "0.0"

        return { total, attended, absent, excused, unmarked, lateCancels, rate }
    }, [filteredSessions])

    if (loading) return <LoadingSpinner />
    if (error) return <ErrorMessage message={error} />

    const isMobile = window.innerWidth <= 768

    return (
        <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
                <button onClick={() => navigate("/admin")} style={{ padding: "8px 16px", background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", color: "#374151" }}>← Tagasi</button>
                <h1 style={{ margin: 0, fontSize: "24px", color: "#111827" }}>{playerName} <span style={{ color: "#9ca3af", fontWeight: "normal" }}>| Statistika</span></h1>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "24px", overflowX: "auto", paddingBottom: "4px" }}>
                <button onClick={() => setDateRange("30")} style={{ padding: "8px 16px", borderRadius: "20px", border: "1px solid #d1d5db", background: dateRange === "30" ? "#3b82f6" : "white", color: dateRange === "30" ? "white" : "#374151", cursor: "pointer", fontWeight: "bold", whiteSpace: "nowrap" }}>Viimased 30 päeva</button>
                <button onClick={() => setDateRange("90")} style={{ padding: "8px 16px", borderRadius: "20px", border: "1px solid #d1d5db", background: dateRange === "90" ? "#3b82f6" : "white", color: dateRange === "90" ? "white" : "#374151", cursor: "pointer", fontWeight: "bold", whiteSpace: "nowrap" }}>Viimased 90 päeva</button>
                <button onClick={() => setDateRange("all")} style={{ padding: "8px 16px", borderRadius: "20px", border: "1px solid #d1d5db", background: dateRange === "all" ? "#3b82f6" : "white", color: dateRange === "all" ? "white" : "#374151", cursor: "pointer", fontWeight: "bold", whiteSpace: "nowrap" }}>Kogu aeg</button>
            </div>

            {/* Top Cards */}
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "32px" }}>
                <StatCard title="Osalemine" value={`${stats.attended} / ${stats.total}`} subtext={`${stats.rate}% trennidest`} />
                <StatCard title="Puudumised" value={stats.absent} subtext={`Vabastatud: ${stats.excused}`} />
                <StatCard title="Hilinenud tühistamised" value={stats.lateCancels} subtext="Alla 1h enne algust" />
                <StatCard title="Märkimata" value={stats.unmarked} subtext="Treener ei ole märkinud" />
            </div>

            {/* History Table */}
            <h2 style={{ fontSize: "18px", marginBottom: "16px" }}>Möödunud trennid ({stats.total})</h2>
            {filteredSessions.length === 0 ? (
                <EmptyState message="Selles ajavahemikus trenne ei leitud." />
            ) : (
                isMobile ? (
                    <div>{filteredSessions.map(s => <SessionRow key={s.id} {...s} />)}</div>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                            <tr style={{ background: "#f3f4f6", borderBottom: "2px solid #d1d5db" }}>
                                <th style={{ padding: "12px 8px", color: "#374151" }}>Kuupäev</th>
                                <th style={{ padding: "12px 8px", color: "#374151" }}>Spordiala</th>
                                <th style={{ padding: "12px 8px", color: "#374151" }}>Eelstaatus</th>
                                <th style={{ padding: "12px 8px", color: "#374151" }}>Kohalolek</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSessions.map(s => <SessionRow key={s.id} {...s} />)}
                        </tbody>
                    </table>
                )
            )}
        </div>
    )
}
