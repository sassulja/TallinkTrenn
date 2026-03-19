import React, { useState, useEffect, useMemo } from "react";
import { ref, get } from "firebase/database";
import { database } from "../services/firebase";
import { getTallinnNow } from "../utils/dateUtils";
import { LoadingSpinner, ErrorMessage } from "../components/UIHelpers";

function generateCSV(headers, rows) {
    const escape = val => {
        if (val === null || val === undefined) return "";
        const str = String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    const lines = [
        headers.map(escape).join(","),
        ...rows.map(row => row.map(escape).join(","))
    ];
    return lines.join("\n");
}

function downloadCSV(csv, filename) {
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

const PRE_STATUS_MAP = {
    kinnitatud: "Kinnitatud",
    eiOsale: "Ei osale"
};

const REAL_STATUS_MAP = {
    kohal: "Kohal",
    hilines: "Hilines",
    puudus: "Puudus",
    vabastatud: "Vabastatud"
};

export default function ExportPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [generating, setGenerating] = useState(false);
    
    // Inputs
    const now = getTallinnNow();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const defaultFrom = thirtyDaysAgo.toISOString().split("T")[0];
    const defaultTo = now.toISOString().split("T")[0];

    const [dateFrom, setDateFrom] = useState(defaultFrom);
    const [dateTo, setDateTo] = useState(defaultTo);
    const [sportFilter, setSportFilter] = useState("all");

    // Data loaded once
    const [instances, setInstances] = useState({});
    const [allRosters, setAllRosters] = useState({});
    const [sportsMap, setSportsMap] = useState([]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [instSnap, rostSnap] = await Promise.all([
                    get(ref(database, "sessionInstances")),
                    get(ref(database, "rosters"))
                ]);
                const instData = instSnap.val() || {};
                setInstances(instData);
                setAllRosters(rostSnap.val() || {});

                const sp = new Set();
                Object.values(instData).forEach(i => { if (i.sport) sp.add(i.sport); });
                setSportsMap(Array.from(sp));
            } catch (err) {
                console.error("Failed to load instances for export", err);
                setError("Andmete laadimine ebaõnnestus.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const matchingData = useMemo(() => {
        const result = [];
        let pCount = 0;
        const fromMs = new Date(`${dateFrom}T00:00:00+02:00`).getTime();
        const toMs = new Date(`${dateTo}T23:59:59+02:00`).getTime();

        Object.entries(instances).forEach(([id, inst]) => {
            if (sportFilter !== "all" && inst.sport !== sportFilter) return;
            const dMs = new Date(`${inst.date}T00:00:00+02:00`).getTime();
            if (dMs >= fromMs && dMs <= toMs) {
                result.push({ id, ...inst });
                const rData = allRosters[id] || {};
                pCount += Object.keys(rData).filter(pId => !rData[pId].removedByCoach).length;
            }
        });
        
        result.sort((a,b) => new Date(`${a.date}T${a.startTime || "00:00"}`).getTime() - new Date(`${b.date}T${b.startTime || "00:00"}`).getTime());
        return { instances: result, playersCount: pCount };
    }, [instances, allRosters, dateFrom, dateTo, sportFilter]);

    const handleExport = async () => {
        if (matchingData.instances.length === 0) return;
        setGenerating(true);
        try {
            const matchingInstances = matchingData.instances;
            // Load required data on demand to reduce memory usage during idle
            const [rostersSnap, attendanceSnap, feedbackSnap, playersSnap] = await Promise.all([
                get(ref(database, "rosters")),
                get(ref(database, "attendance")),
                get(ref(database, "feedback")),
                get(ref(database, "players"))
            ]);

            const rosters = rostersSnap.val() || {};
            const attendance = attendanceSnap.val() || {};
            const feedback = feedbackSnap.val() || {};
            const players = playersSnap.val() || {};

            const headers = [
                "Kuupäev",
                "Spordiala",
                "Mängija nimi",
                "Eelstaatus",
                "Kohalolek",
                "Hiline tühistamine",
                "Treeneri hinnang",
                "Mängija pingutus",
                "Treeneri kaasatus",
                "Treeneri märkus"
            ];

            const rows = [];
            let totalPlayers = 0;

            matchingInstances.forEach(inst => {
                const rData = rosters[inst.id] || {};
                const attData = attendance[inst.id] || {};
                const fbData = feedback[inst.id] || {};

                const playersInRoster = Object.keys(rData).filter(pId => !rData[pId].removedByCoach);

                // Sort by name inside session
                playersInRoster.sort((pIdA, pIdB) => {
                    const nA = players[pIdA] ? `${players[pIdA].firstName} ${players[pIdA].lastName}` : pIdA;
                    const nB = players[pIdB] ? `${players[pIdB].firstName} ${players[pIdB].lastName}` : pIdB;
                    return nA.localeCompare(nB, "et-EE");
                });

                playersInRoster.forEach(pId => {
                    const p = players[pId];
                    const pName = p ? `${p.firstName} ${p.lastName}` : pId;
                    
                    const att = attData[pId] || {};
                    const psMatch = PRE_STATUS_MAP[att.preStatus];
                    const preStatus = psMatch ? psMatch : "Vastamata";
                    const realStatus = REAL_STATUS_MAP[att.realStatus] || "";
                    const lateCancel = att.lateCancel === true ? "Jah" : "—";
                    
                    const fbNode = fbData[pId] || {};
                    const pf = fbNode.player || {};
                    const cf = fbNode.coach || {};

                    const cEffort = cf.effort || "";
                    const pEffort = pf.effort || "";
                    const cEngage = pf.coachEngagement || "";
                    const cNote = cf.note || "";

                    totalPlayers++;
                    
                    rows.push([
                        inst.date,
                        inst.sport || "",
                        pName,
                        preStatus,
                        realStatus,
                        lateCancel,
                        cEffort,
                        pEffort,
                        cEngage,
                        cNote
                    ]);
                });
            });

            if (rows.length === 0) {
                alert("Ühtegi mängija kirjet ei leitud antud otsinguga.");
                setGenerating(false);
                return;
            }

            const csvStr = generateCSV(headers, rows);
            const filename = `${dateFrom}_${dateTo}_export.csv`;
            downloadCSV(csvStr, filename);

        } catch (err) {
            console.error("Export failed", err);
            alert("Eksport ebaõnnestus: " + err.message);
        } finally {
            setGenerating(false);
        }
    };

    if (loading) return <LoadingSpinner />;
    if (error) return <ErrorMessage message={error} />;

    return (
        <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
            <h1 style={{ marginTop: 0, marginBottom: "24px", fontSize: "24px" }}>Andmete eksport</h1>

            <div style={{ background: "#f9fafb", padding: "24px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
                    <div>
                        <div style={{ fontSize: "13px", color: "#4b5563", marginBottom: "4px" }}>Alates</div>
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db" }} />
                    </div>
                    <div>
                        <div style={{ fontSize: "13px", color: "#4b5563", marginBottom: "4px" }}>Kuni</div>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db" }} />
                    </div>
                    <div>
                        <div style={{ fontSize: "13px", color: "#4b5563", marginBottom: "4px" }}>Spordiala</div>
                        <select value={sportFilter} onChange={e => setSportFilter(e.target.value)}
                            style={{ padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db", minWidth: "150px" }}>
                            <option value="all">Kõik</option>
                            {sportsMap.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div style={{ padding: "16px", background: "white", borderRadius: "6px", border: "1px solid #e5e7eb", marginBottom: "24px" }}>
                    <div style={{ fontWeight: "bold", fontSize: "16px", marginBottom: "4px" }}>Eelvaade</div>
                    <div style={{ color: "#6b7280" }}>{matchingData.instances.length} treeningut, {matchingData.playersCount} mängija kirjet</div>
                </div>

                <button onClick={handleExport} disabled={generating || matchingData.instances.length === 0}
                    style={{ padding: "10px 20px", background: matchingData.instances.length === 0 ? "#d1d5db" : "#22c55e", color: "white", border: "none", borderRadius: "6px", cursor: matchingData.instances.length === 0 || generating ? "not-allowed" : "pointer", fontWeight: "bold", fontSize: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                    {generating ? "Kogun andmeid..." : "Ekspordi CSV"}
                </button>
            </div>
        </div>
    );
}
