import React, { useState, useEffect, useMemo } from "react";
import { ref, get } from "firebase/database";
import { database } from "../services/firebase";
import { getTallinnNow, combineDateAndTime } from "../utils/dateUtils";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner, ErrorMessage, EmptyState } from "../components/UIHelpers";

// Helpers
const EFFORT_EMOJIS = { 1: "😴", 2: "😕", 3: "👍", 4: "💪", 5: "🔥" };
const ENGAGEMENT_EMOJIS = { 1: "😶", 2: "🙁", 3: "👍", 4: "😊", 5: "🤝" };
function getEmoji(val, map) {
    if (!val || isNaN(val)) return "";
    return map[Math.round(val)] || "";
}

// Components
function StatCard({ label, value, subtext, emojiMap }) {
    const valNum = parseFloat(value);
    const emoji = !isNaN(valNum) && emojiMap ? getEmoji(valNum, emojiMap) : "";
    return (
        <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px", flex: "1 1 calc(25% - 16px)", minWidth: "200px" }}>
            <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px", lineHeight: "1.3" }}>{label}</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#111827", display: "flex", alignItems: "baseline", gap: "8px" }}>
                {value} {emoji && <span style={{ fontSize: "20px" }}>{emoji}</span>}
            </div>
            {subtext && <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>{subtext}</div>}
        </div>
    );
}

function TrendChart({ data }) {
    if (!data || Object.keys(data).length === 0) return null; // Before load
    if (data.length < 3) {
        return <div style={{ padding: "40px", textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: "8px", border: "1px dashed #d1d5db", marginTop: "24px" }}>Liiga vähe andmeid graafiku jaoks</div>;
    }

    const maxVal = 5;
    return (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px", background: "white", marginTop: "24px" }}>
            <h3 style={{ marginTop: 0, fontSize: "16px", marginBottom: "16px" }}>Tagasiside trend (viimased {data.length} trenni)</h3>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "200px", paddingBottom: "24px", borderBottom: "1px solid #e5e7eb", position: "relative" }}>
                {data.map((d, i) => (
                    <div key={i} style={{ flex: 1, display: "flex", justifyContent: "space-around", alignItems: "flex-end", height: "100%", position: "relative" }}>
                        <div style={{ width: "40%", background: "#3b82f6", height: `${(d.effort / maxVal) * 100}%`, borderRadius: "4px 4px 0 0", minHeight: "2px" }} title={`Mängija pingutus: ${d.effort}`}></div>
                        <div style={{ width: "40%", background: "#f97316", height: `${(d.engagement / maxVal) * 100}%`, borderRadius: "4px 4px 0 0", minHeight: "2px" }} title={`Treeneri kaasatus: ${d.engagement}`}></div>
                        <div style={{ position: "absolute", bottom: "-24px", fontSize: "10px", color: "#6b7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%", textAlign: "center" }}>
                            {d.date.slice(5)}
                        </div>
                    </div>
                ))}
            </div>
            <div style={{ display: "flex", gap: "16px", marginTop: "16px", fontSize: "12px", color: "#4b5563", justifyContent: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><div style={{ width: "12px", height: "12px", background: "#3b82f6", borderRadius: "2px" }}></div>Mängija pingutus</div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><div style={{ width: "12px", height: "12px", background: "#f97316", borderRadius: "2px" }}></div>Treeneri kaasatus</div>
            </div>
        </div>
    );
}

function PlayerRow({ player, navigate }) {
    return (
        <tr style={{ borderBottom: "1px solid #e5e7eb", cursor: "pointer" }} onClick={() => navigate(`/admin/player/${player.id}/stats`)} className="hover-row">
            <td style={{ padding: "12px 16px" }}>{player.name}</td>
            <td style={{ padding: "12px 16px", textAlign: "center" }}>{player.attended}</td>
            <td style={{ padding: "12px 16px", textAlign: "center" }}>{player.submitted}</td>
            <td style={{ padding: "12px 16px", textAlign: "center" }}>{player.rate}%</td>
            <td style={{ padding: "12px 16px", textAlign: "center" }}>{player.avgEffort} {getEmoji(parseFloat(player.avgEffort), EFFORT_EMOJIS)}</td>
            <td style={{ padding: "12px 16px", textAlign: "center", fontSize: "16px" }}>
                {player.trend === 'up' && <span style={{ color: "#16a34a" }}>↑</span>}
                {player.trend === 'down' && <span style={{ color: "#dc2626" }}>↓</span>}
                {player.trend === 'stable' && <span style={{ color: "#9ca3af" }}>→</span>}
                {!player.trend && <span style={{ color: "#d1d5db" }}>—</span>}
            </td>
        </tr>
    );
}

// Main Page Component
export default function FeedbackAnalyticsPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState("all");
    const [sportFilter, setSportFilter] = useState("all");

    const [instances, setInstances] = useState({});
    const [feedback, setFeedback] = useState({});
    const [attendance, setAttendance] = useState({});
    const [players, setPlayers] = useState({});
    const [sportsMap, setSportsMap] = useState([]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [instSnap, fbSnap, attSnap, pSnap] = await Promise.all([
                    get(ref(database, "sessionInstances")),
                    get(ref(database, "feedback")),
                    get(ref(database, "attendance")),
                    get(ref(database, "players"))
                ]);
                const instData = instSnap.val() || {};
                setInstances(instData);
                setFeedback(fbSnap.val() || {});
                setAttendance(attSnap.val() || {});
                setPlayers(pSnap.val() || {});

                const sp = new Set();
                Object.values(instData).forEach(i => { if (i.sport) sp.add(i.sport); });
                setSportsMap(Array.from(sp));
            } catch (err) {
                console.error("Failed to load analytics data", err);
                setError("Andmete laadimine ebaõnnestus.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const analytics = useMemo(() => {
        if (!Object.keys(instances).length) return null;

        const now = getTallinnNow();
        const nowMs = now.getTime();
        const daysToMs = dateRange === "all" ? Infinity : parseInt(dateRange, 10) * 24 * 60 * 60 * 1000;
        const cutoffMs = dateRange === "all" ? 0 : nowMs - daysToMs;

        // Filter instances
        const validInsts = [];
        Object.entries(instances).forEach(([id, inst]) => {
            if (sportFilter !== "all" && inst.sport !== sportFilter) return;
            const instEndMs = new Date(combineDateAndTime(inst.date, inst.endTime || "23:59")).getTime();
            if (instEndMs >= cutoffMs) {
                const startMs = new Date(combineDateAndTime(inst.date, inst.startTime || "00:00")).getTime();
                validInsts.push({ id, ...inst, endMs: instEndMs, startMs });
            }
        });
        
        validInsts.sort((a, b) => {
            const startDiff = a.startMs - b.startMs;
            if (startDiff !== 0) return startDiff;
            return a.id.localeCompare(b.id);
        });

        let totalAttended = 0;
        let totalPlayerFb = 0;
        let sumPlayerEffort = 0, countPlayerEffort = 0;
        let sumCoachEng = 0, countCoachEng = 0;
        let sumCoachEffort = 0, countCoachEffort = 0;

        const playerStats = {};
        const sessionAverages = [];

        validInsts.forEach(inst => {
            const attData = attendance[inst.id] || {};
            const fbData = feedback[inst.id] || {};

            let sSumPEff = 0, sCntPEff = 0, sSumCEng = 0, sCntCEng = 0;

            Object.entries(attData).forEach(([pId, att]) => {
                if (att.realStatus === "kohal" || att.realStatus === "hilines") {
                    totalAttended++;
                    if (!playerStats[pId]) playerStats[pId] = { attended: 0, submitted: 0, fbList: [] };
                    playerStats[pId].attended++;

                    const pFbNode = fbData[pId] || {};
                    const pFb = pFbNode.player;
                    const cFb = pFbNode.coach;

                    // Player feedback
                    if (pFb && pFb.effort) {
                        totalPlayerFb++;
                        playerStats[pId].submitted++;
                        sumPlayerEffort += pFb.effort;
                        countPlayerEffort++;
                        sSumPEff += pFb.effort;
                        sCntPEff++;
                        playerStats[pId].fbList.push({ effort: pFb.effort, endMs: inst.endMs });

                        if (pFb.coachEngagement) {
                            sumCoachEng += pFb.coachEngagement;
                            countCoachEng++;
                            sSumCEng += pFb.coachEngagement;
                            sCntCEng++;
                        }
                    }

                    // Coach feedback
                    if (cFb && cFb.effort) {
                        sumCoachEffort += cFb.effort;
                        countCoachEffort++;
                    }
                }
            });

            if (sCntPEff > 0 || sCntCEng > 0) {
                sessionAverages.push({
                    date: inst.date,
                    effort: sCntPEff > 0 ? Number((sSumPEff / sCntPEff).toFixed(2)) : 0,
                    engagement: sCntCEng > 0 ? Number((sSumCEng / sCntCEng).toFixed(2)) : 0
                });
            }
        });

        const avgPEffort = countPlayerEffort > 0 ? (sumPlayerEffort / countPlayerEffort).toFixed(1) : "—";
        const avgCEng = countCoachEng > 0 ? (sumCoachEng / countCoachEng).toFixed(1) : "—";
        const avgCEffort = countCoachEffort > 0 ? (sumCoachEffort / countCoachEffort).toFixed(1) : "—";
        const responseRate = totalAttended > 0 ? Math.round((totalPlayerFb / totalAttended) * 100) : 0;

        const chartData = sessionAverages.slice(-10);

        const playerRows = [];
        Object.entries(playerStats).forEach(([pId, stats]) => {
            if (stats.attended === 0) return;
            const pInfo = players[pId];
            const name = pInfo ? `${pInfo.firstName} ${pInfo.lastName}` : "Tundmatu mängija";
            const rate = Math.round((stats.submitted / stats.attended) * 100);
            
            stats.fbList.sort((a,b) => a.endMs - b.endMs);
            let avgE = "—";
            let trend = null;
            if (stats.fbList.length > 0) {
                const sE = stats.fbList.reduce((acc, curr) => acc + curr.effort, 0);
                avgE = (sE / stats.fbList.length).toFixed(1);

                if (stats.fbList.length >= 6) {
                    const latest = stats.fbList.slice(-3);
                    const prev = stats.fbList.slice(-6, -3);
                    const lAvg = latest.reduce((a,c)=>a+c.effort,0) / 3;
                    const pAvg = prev.reduce((a,c)=>a+c.effort,0) / 3;
                    const diff = lAvg - pAvg;
                    if (diff > 0.2) trend = "up";
                    else if (diff < -0.2) trend = "down";
                    else trend = "stable";
                }
            }

            playerRows.push({
                id: pId,
                name,
                attended: stats.attended,
                submitted: stats.submitted,
                rate,
                avgEffort: avgE,
                trend
            });
        });

        playerRows.sort((a, b) => {
            const attendedDiff = b.attended - a.attended;
            if (attendedDiff !== 0) return attendedDiff;
            const nameCompare = a.name.localeCompare(b.name, "et");
            if (nameCompare !== 0) return nameCompare;
            return a.id.localeCompare(b.id);
        });

        return { avgPEffort, avgCEng, avgCEffort, responseRate, chartData, playerRows };

    }, [instances, feedback, attendance, players, dateRange, sportFilter]);

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={error} />;

    const stats = analytics || { avgPEffort: "—", avgCEng: "—", avgCEffort: "—", responseRate: 0, chartData: [], playerRows: [] };

    return (
        <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }}>
            <style>{`.hover-row:hover { background-color: #f9fafb; }`}</style>
            <h1 style={{ marginTop: 0, marginBottom: "24px", fontSize: "24px" }}>Tagasiside analüütika</h1>

            {/* Filters */}
            <div style={{ marginBottom: "24px", display: "flex", gap: "12px", background: "#f9fafb", padding: "16px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                <select value={dateRange} onChange={e => setDateRange(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db", minWidth: "180px" }}>
                    <option value="30">Viimased 30 päeva</option>
                    <option value="90">Viimased 90 päeva</option>
                    <option value="all">Kogu aeg</option>
                </select>
                <select value={sportFilter} onChange={e => setSportFilter(e.target.value)} style={{ padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db", minWidth: "150px" }}>
                    <option value="all">Kõik spordialad</option>
                    {sportsMap.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {/* Warning */}
            {stats.responseRate < 50 && stats.responseRate > 0 && (
                <div style={{ marginBottom: "24px", padding: "16px", background: "#fef3c7", borderRadius: "8px", border: "1px solid #fde68a", color: "#92400e", display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "20px" }}>⚠️</span>
                    Madal tagasiside vastamismäär. Kaaluge mängijatele meeldetuletuse saatmist.
                </div>
            )}

            {/* Section 1 */}
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                <StatCard label="Keskmine mängija pingutus" value={stats.avgPEffort} emojiMap={EFFORT_EMOJIS} />
                <StatCard label="Keskmine treeneri kaasatus" value={stats.avgCEng} emojiMap={ENGAGEMENT_EMOJIS} />
                <StatCard label="Keskmine treeneri hinnang mängijatele" value={stats.avgCEffort} emojiMap={EFFORT_EMOJIS} />
                <StatCard label="Tagasiside vastamismäär" value={`${stats.responseRate}%`} subtext="vastanuid / kohalolijaid" />
            </div>

            {/* Section 2 */}
            <TrendChart data={stats.chartData} />

            {/* Section 3 */}
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", background: "white", marginTop: "32px", overflow: "hidden" }}>
                <h3 style={{ margin: 0, padding: "16px", background: "#f3f4f6", borderBottom: "1px solid #e5e7eb", fontSize: "16px" }}>Mängijate kokkuvõte</h3>
                {stats.playerRows.length === 0 ? (
                    <EmptyState message="Mängijaid ei leitud." />
                ) : (
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid #e5e7eb", color: "#6b7280", textAlign: "left" }}>
                                    <th style={{ padding: "12px 16px", fontWeight: "600" }}>Mängija nimi</th>
                                    <th style={{ padding: "12px 16px", fontWeight: "600", textAlign: "center" }}>Treeninguid</th>
                                    <th style={{ padding: "12px 16px", fontWeight: "600", textAlign: "center" }}>Tagasiside</th>
                                    <th style={{ padding: "12px 16px", fontWeight: "600", textAlign: "center" }}>Vastamismäär (%)</th>
                                    <th style={{ padding: "12px 16px", fontWeight: "600", textAlign: "center" }}>Keskmine pingutus</th>
                                    <th style={{ padding: "12px 16px", fontWeight: "600", textAlign: "center" }}>Trend</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.playerRows.map(row => (
                                    <PlayerRow key={row.id} player={row} navigate={navigate} />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
