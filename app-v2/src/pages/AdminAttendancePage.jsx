import React, { useState, useEffect, useMemo } from "react"
import { ref, get } from "firebase/database"
import { database } from "../services/firebase"
import { getTallinnNow, combineDateAndTime } from "../utils/dateUtils"
import { PRESTATUS_LABELS, REALSTATUS_LABELS } from "../utils/displayUtils"
import { LoadingSpinner, ErrorMessage } from "../components/UIHelpers"

const STATUS_ICONS = {
    kohal: "🟢",
    hilines: "🟡",
    puudus: "🔴",
    vabastatud: "⚪",
    null: "⬜",
    unrostered: "—",
    removed: "×"
}

// ─── Tooltip Modal Component ───────────────────────────────
function CellTooltip({ show, data, onClose }) {
    useEffect(() => {
        if (!show) return
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [show, onClose])

    if (!show || !data) return null
    return (
        <div 
            style={{
                position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
                background: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center"
            }}
            onClick={onClose}
        >
            <div 
                style={{
                    background: "white", padding: "16px", borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    fontSize: "14px", minWidth: "250px", maxWidth: "90vw"
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontWeight: "bold", fontSize: "15px" }}>
                    <span>{data.playerName}</span>
                    <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: "0 4px", fontSize: "16px" }}>✕</button>
                </div>
                <div style={{ color: "#4b5563", marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid #f3f4f6" }}>
                    {data.dateStr} kell {data.timeStr} • {data.sport}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <span style={{ color: "#6b7280" }}>Eelstaatus:</span>
                    <span style={{ fontWeight: "bold" }}>{data.preLabel}</span>
                    <span style={{ color: "#6b7280" }}>Kohalolek:</span>
                    <span style={{ fontWeight: "bold" }}>{data.realLabel}</span>
                </div>
                {data.lateCancel && (
                    <div style={{ marginTop: "12px", color: "orange", fontWeight: "bold", fontSize: "13px" }}>⚠️ Hiline tühistamine</div>
                )}
            </div>
        </div>
    )
}

// ─── Main Page ─────────────────────────────────────────────
export default function AdminAttendancePage() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    
    // Raw Data
    const [players, setPlayers] = useState({})
    const [instances, setInstances] = useState({})
    const [rosters, setRosters] = useState({})
    const [attendance, setAttendance] = useState({})
    const [uniqueSports, setUniqueSports] = useState([])

    // Filters
    const [dateRange, setDateRange] = useState("30") // "30", "90", "all"
    const [selectedSport, setSelectedSport] = useState("all")
    const [selectedPlayer, setSelectedPlayer] = useState("all")

    // Tooltip State
    const [tooltipData, setTooltipData] = useState(null)



    // ─── 1. Load Data ──────────────────────────────────────
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true)
                
                // We load the whole world once to avoid complex incremental loading
                // given RTDB's limit options. For a real large-scale app, we'd query by date.
                const [pSnap, instSnap, defSnap, rSnap, aSnap] = await Promise.all([
                    get(ref(database, "players")),
                    get(ref(database, "sessionInstances")),
                    get(ref(database, "sessionDefinitions")),
                    get(ref(database, "rosters")),
                    get(ref(database, "attendance"))
                ])

                const pData = pSnap.val() || {}
                const activePlayersOnly = {}
                Object.keys(pData).forEach(k => {
                    if (pData[k].active !== false) activePlayersOnly[k] = pData[k]
                })

                setPlayers(activePlayersOnly)
                setInstances(instSnap.val() || {})
                setRosters(rSnap.val() || {})
                setAttendance(aSnap.val() || {})

                const defs = defSnap.val() || {}
                const sports = new Set()
                Object.values(defs).forEach(d => { if (d.sport) sports.add(d.sport) })
                setUniqueSports(Array.from(sports).sort())

            } catch (err) {
                console.error("Failed to load attendance grid", err)
                setError("Andmete laadimine ebaõnnestus.")
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    // ─── 2. Filter & Process Grid ──────────────────────────
    const { filteredInstances, gridPlayers, stats, maxColsHit } = useMemo(() => {
        if (!Object.keys(instances).length) return { filteredInstances: [], gridPlayers: [], stats: {}, maxColsHit: false }

        const nowMs = getTallinnNow().getTime()
        const daysToMs = dateRange === "all" ? Infinity : parseInt(dateRange, 10) * 24 * 60 * 60 * 1000
        const cutoffMs = nowMs - daysToMs

        // Filter instances
        let processable = Object.entries(instances).map(([id, inst]) => {
            const startTime = inst.startTime || "00:00"
            const endTime = inst.endTime || "00:00"
            const startMs = new Date(combineDateAndTime(inst.date, startTime)).getTime()
            const endMs = new Date(combineDateAndTime(inst.date, endTime)).getTime()
            return { id, inst, startMs, endMs }
        }).filter(item => {
            if (item.endMs >= nowMs) return false
            
            if (item.startMs < cutoffMs) return false
            if (selectedSport !== "all" && item.inst.sport !== selectedSport) return false
            return true
        })

        processable.sort((a, b) => {
            const startDiff = a.startMs - b.startMs
            if (startDiff !== 0) return startDiff
            return a.id.localeCompare(b.id)
        })

        // Limit to max 60 columns (taking newest 60)
        let maxColsHit = false
        if (processable.length > 60) {
            processable = processable.slice(-60)
            maxColsHit = true
        }

        // Filter players
        let pList = Object.entries(players).map(([id, p]) => ({ id, name: `${p.firstName} ${p.lastName}` }))
        pList.sort((a, b) => {
            const nameCompare = a.name.localeCompare(b.name, "et")
            if (nameCompare !== 0) return nameCompare
            return a.id.localeCompare(b.id)
        })
        if (selectedPlayer !== "all") pList = pList.filter(p => p.id === selectedPlayer)

        // Compute Stats
        let tSessions = processable.length
        let tKohal = 0
        let tPuudus = 0
        let tUnmarked = 0

        processable.forEach(item => {
            const instRoster = rosters[item.id] || {}
            const instAtt = attendance[item.id] || {}

            pList.forEach(p => {
                const rData = instRoster[p.id]
                if (rData && !rData.removedByCoach) {
                    const real = instAtt[p.id]?.realStatus || null
                    if (real === "kohal" || real === "hilines") tKohal++
                    else if (real === "puudus") tPuudus++
                    else if (real === null) tUnmarked++
                }
            })
        })

        return { 
            filteredInstances: processable, 
            gridPlayers: pList, 
            stats: { tSessions, tKohal, tPuudus, tUnmarked },
            maxColsHit
        }

    }, [instances, rosters, attendance, players, dateRange, selectedSport, selectedPlayer])

    // ─── Cell Click Handler ────────────────────────────────
    const handleCellClick = (p, item, rData, att) => {
        if (!rData) return // don't show tooltips for completely unrostered
        
        const dateStr = item.inst.date.split("-").reverse().join(".")
        const timeStr = item.inst.startTime || ""
        const preStatus = att?.preStatus || null
        const realStatus = att?.realStatus || null
        
        setTooltipData({
            show: true,
            playerName: p.name,
            dateStr,
            timeStr,
            sport: item.inst.sport === "tennis" ? "Tennis🎾" : "Füss🏋️",
            preLabel: PRESTATUS_LABELS[preStatus] || PRESTATUS_LABELS.null,
            realLabel: REALSTATUS_LABELS[realStatus] || REALSTATUS_LABELS.null,
            lateCancel: att?.lateCancel === true
        })
    }

    if (loading) return <LoadingSpinner />
    if (error) return <ErrorMessage message={error} />

    return (
        <div style={{ padding: "20px" }}>
            <h1 style={{ marginTop: 0, marginBottom: "24px", fontSize: "24px" }}>Kohaloleku ülevaade</h1>

            {/* Filters */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "20px", background: "#f9fafb", padding: "16px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                <select value={dateRange} onChange={e => setDateRange(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db", minWidth: "150px" }}>
                    <option value="30">Viimased 30 päeva</option>
                    <option value="90">Viimased 90 päeva</option>
                    <option value="all">Kogu aeg</option>
                </select>

                <select value={selectedSport} onChange={e => setSelectedSport(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db", minWidth: "150px" }}>
                    <option value="all">Kõik spordialad</option>
                    {uniqueSports.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <select value={selectedPlayer} onChange={e => setSelectedPlayer(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db", minWidth: "200px" }}>
                    <option value="all">Kõik mängijad</option>
                    {Object.entries(players).sort((a, b) => {
                        const nameA = `${a[1].firstName} ${a[1].lastName}`
                        const nameB = `${b[1].firstName} ${b[1].lastName}`
                        const nameCompare = nameA.localeCompare(nameB, "et")
                        if (nameCompare !== 0) return nameCompare
                        return a[0].localeCompare(b[0])
                    }).map(([id, p]) => (
                        <option key={id} value={id}>{p.firstName} {p.lastName}</option>
                    ))}
                </select>
            </div>

            {/* Summary Bar */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", marginBottom: "24px", padding: "16px", background: "#eff6ff", borderRadius: "8px", border: "1px solid #bfdbfe", fontSize: "15px" }}>
                <div><span style={{ color: "#3b82f6", fontWeight: "bold" }}>Treeninguid:</span> {stats.tSessions}</div>
                <div><span style={{ color: "#22c55e", fontWeight: "bold" }}>Kohalolekuid:</span> {stats.tKohal}</div>
                <div><span style={{ color: "#ef4444", fontWeight: "bold" }}>Puudumisi:</span> {stats.tPuudus}</div>
                <div><span style={{ color: "#9ca3af", fontWeight: "bold" }}>Märkimata:</span> {stats.tUnmarked}</div>
            </div>

            {maxColsHit && (
                <div style={{ padding: "8px 12px", background: "#fffbeb", border: "1px solid #fde68a", color: "#d97706", borderRadius: "6px", marginBottom: "16px", fontSize: "13px", fontWeight: "bold" }}>
                    ⚠️ Näidatakse ainult viimast 60 treeningut veergude arvu piirangu tõttu. Lehe kiireks laadimiseks kasuta filtreid.
                </div>
            )}

            {/* Main Grid */}
            <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "65vh", border: "1px solid #e5e7eb", borderRadius: "8px", boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)" }}>
                <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "max-content", fontSize: "13px" }}>
                    <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "#f3f4f6" }}>
                        <tr>
                            <th style={{ position: "sticky", left: 0, top: 0, zIndex: 11, background: "#f3f4f6", padding: "10px", textAlign: "left", minWidth: "150px", borderBottom: "2px solid #d1d5db", borderRight: "2px solid #e5e7eb" }}>Mängija</th>
                            {filteredInstances.map(item => {
                                const dParts = item.inst.date.split("-")
                                const dayStr = `${dParts[2]}.${dParts[1]}`
                                const sp = item.inst.sport === "tennis" ? "TEN" : "FÜS"
                                return (
                                    <th key={item.id} style={{ padding: "10px 6px", textAlign: "center", borderBottom: "2px solid #d1d5db", borderRight: "1px solid #e5e7eb", minWidth: "50px", background: "#f3f4f6" }}>
                                        <div style={{ fontWeight: "bold" }}>{dayStr}</div>
                                        <div style={{ fontSize: "11px", color: "#6b7280" }}>{sp}</div>
                                    </th>
                                )
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {gridPlayers.map(p => (
                            <tr key={p.id}>
                                <td style={{ position: "sticky", left: 0, zIndex: 5, background: "white", padding: "10px", fontWeight: "bold", borderRight: "2px solid #e5e7eb", borderBottom: "1px solid #e5e7eb" }}>
                                    {p.name}
                                </td>
                                {filteredInstances.map(item => {
                                    const rData = rosters[item.id]?.[p.id]
                                    const att = attendance[item.id]?.[p.id]

                                    let icon = STATUS_ICONS.unrostered
                                    if (rData) {
                                        if (rData.removedByCoach) icon = STATUS_ICONS.removed
                                        else {
                                            const real = att?.realStatus || null
                                            icon = STATUS_ICONS[real] || STATUS_ICONS.null
                                        }
                                    }

                                    const isClickable = !!rData
                                    const hasLateCancel = att?.lateCancel === true

                                    return (
                                        <td 
                                            key={`${p.id}-${item.id}`} 
                                            onClick={() => isClickable ? handleCellClick(p, item, rData, att) : null}
                                            style={{ 
                                                padding: "10px 6px", textAlign: "center", 
                                                borderRight: "1px solid #e5e7eb", 
                                                borderBottom: "1px solid #e5e7eb",
                                                cursor: isClickable ? "pointer" : "default",
                                                background: hasLateCancel ? "linear-gradient(135deg, white 80%, #fef08a 100%)" : "white",
                                                color: icon === "—" || icon === "×" ? "#9ca3af" : "inherit"
                                            }}
                                            onMouseOver={e => { if (isClickable) e.currentTarget.style.backgroundColor = "#f3f4f6" }}
                                            onMouseOut={e => { if (isClickable) e.currentTarget.style.backgroundColor = hasLateCancel ? "linear-gradient(135deg, white 80%, #fef08a 100%)" : "white" }}
                                        >
                                            {icon}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <CellTooltip show={tooltipData?.show} data={tooltipData} onClose={() => setTooltipData(null)} />
        </div>
    )
}
