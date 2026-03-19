import React, { useEffect, useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { ref, onValue, update, set, get } from "firebase/database"
import { useAuth } from "../contexts/AuthContext"
import { database } from "../services/firebase"
import { getTallinnNow, combineDateAndTime } from "../utils/dateUtils"
import { PRESTATUS_LABELS, REALSTATUS_LABELS, EFFORT_SCALE, PLAYER_EFFORT_SCALE, COACH_ENGAGEMENT_SCALE } from "../utils/displayUtils"
import { LoadingSpinner, ErrorMessage, EmptyState } from "../components/UIHelpers"

function formatEstonianDate(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    const dateObj = new Date(y, m - 1, d);
    const days = ["Pühapäev", "Esmaspäev", "Teisipäev", "Kolmapäev", "Neljapäev", "Reede", "Laupäev"];
    const weekDay = days[dateObj.getDay()];
    return `${d}.${m}.${y} (${weekDay})`;
}

function compareDisplayNames(nameA, idA, nameB, idB) {
    const nameCompare = nameA.localeCompare(nameB, "et")
    if (nameCompare !== 0) return nameCompare
    return idA.localeCompare(idB)
}

function getSessionBounds(inst, def) {
    const startTime = inst.startTime || def?.startTime || "00:00"
    const endTime = inst.endTime || def?.endTime || "00:00"
    return {
        startMs: new Date(combineDateAndTime(inst.date, startTime)).getTime(),
        endMs: new Date(combineDateAndTime(inst.date, endTime)).getTime()
    }
}

function compareSessionItems(a, b) {
    const startDiff = a.sessionStartMs - b.sessionStartMs
    if (startDiff !== 0) return startDiff
    return a.instId.localeCompare(b.instId)
}

const REAL_STATUS_DISPLAY = {
    kohal: { icon: "🟢", label: REALSTATUS_LABELS.kohal },
    puudus: { icon: "🔴", label: REALSTATUS_LABELS.puudus },
    hilines: { icon: "🟡", label: REALSTATUS_LABELS.hilines },
    vabastatud: { icon: "⚪", label: REALSTATUS_LABELS.vabastatud }
}

// ─── Coach/Admin Session Card ───────────────────────────
function SessionCardCoach({ instId, inst, def, attendance, rosters, isActive, onClick }) {
    const startTime = inst.startTime || def?.startTime || ""
    const endTime = inst.endTime || def?.endTime || ""
    const timeDisplay = endTime ? `${startTime} - ${endTime}` : startTime
    const sport = inst.sport || def?.sport || ""

    const currentRoster = rosters[instId] || {}
    const currentAtt = attendance[instId] || {}
    const capacity = inst.capacity || def?.capacity || 0

    let totalPlayers = 0
    let kinnitatudCount = 0

    Object.keys(currentRoster).forEach(pId => {
        if (!currentRoster[pId].removedByCoach) {
            totalPlayers++
            if (currentAtt[pId]?.preStatus === "kinnitatud") {
                kinnitatudCount++
            }
        }
    })

    const defaultBg = isActive ? "#f0fdf4" : "white"
    return (
        <div
            onClick={onClick}
            style={{
                border: "1px solid " + (isActive ? "#22c55e" : "#ccc"),
                borderRadius: "8px", padding: "16px", marginBottom: "12px",
                cursor: "pointer", background: defaultBg, position: "relative",
                transition: "background 0.15s, transform 0.1s",
                WebkitTapHighlightColor: "transparent"
            }}
            onPointerDown={e => { e.currentTarget.style.background = "#d1d5db"; e.currentTarget.style.transform = "scale(0.98)" }}
            onPointerUp={e => { e.currentTarget.style.background = defaultBg; e.currentTarget.style.transform = "scale(1)" }}
            onPointerLeave={e => { e.currentTarget.style.background = defaultBg; e.currentTarget.style.transform = "scale(1)" }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <div style={{ fontWeight: "bold", fontSize: "16px" }}>{timeDisplay}</div>
                {isActive && (
                    <div style={{ background: "#22c55e", color: "white", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>
                        AKTIIVNE
                    </div>
                )}
            </div>
            <div style={{ color: "#555", marginBottom: "4px" }}>{formatEstonianDate(inst.date)}</div>
            <div style={{ color: "#333", marginBottom: "12px", textTransform: "capitalize" }}>{sport}</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "#666" }}>
                <div>Kohti: <span style={{ fontWeight: "bold", color: "#000" }}>{kinnitatudCount} / {capacity}</span></div>
                <div>Nimekirjas: <span style={{ fontWeight: "bold", color: "#000" }}>{totalPlayers}</span></div>
            </div>
        </div>
    )
}

// ─── Parent Session Card ────────────────────────────────
function SessionCardParent({ instId, inst, def, attendance, rosters, players, sessionMessages, sessionFeedback, childName, playerId, nowMs, onPreStatus, msg }) {
    const startTime = inst.startTime || def?.startTime || ""
    const endTime = inst.endTime || def?.endTime || ""
    const timeDisplay = endTime ? `${startTime} - ${endTime}` : startTime
    const sport = inst.sport || def?.sport || ""

    let sessionStartMs = 0
    let sessionEndMs = 0
    try {
        sessionStartMs = new Date(combineDateAndTime(inst.date, startTime)).getTime()
        sessionEndMs = new Date(combineDateAndTime(inst.date, endTime)).getTime()
    } catch (e) {}

    const isLocked = nowMs >= (sessionStartMs - 60 * 60 * 1000)
    const sessionStarted = nowMs >= sessionStartMs
    const sessionEnded = nowMs > sessionEndMs
    const feedbackVisible = sessionEnded && (nowMs > sessionEndMs + 24 * 60 * 60 * 1000)
    const feedbackWindowOpen = sessionEnded && (nowMs <= sessionEndMs + 7 * 24 * 60 * 60 * 1000)
    const isEditingFb = false // Placholder for Parent
    
    // Check feedbacks
    const coachFb = sessionFeedback?.[instId]?.[playerId]?.coach
    const playerFb = sessionFeedback?.[instId]?.[playerId]?.player

    const attRecord = attendance[instId]?.[playerId] || {}
    const preStatus = attRecord.preStatus || null
    const realStatus = attRecord.realStatus || null

    // Capacity check
    const currentAtt = attendance[instId] || {}
    const currentRoster = rosters[instId] || {}
    const capacity = inst.capacity || def?.capacity || 0
    let kinnitatudCount = 0
    Object.keys(currentAtt).forEach(pid => {
        const rd = currentRoster[pid] || {}
        if (rd.removedByCoach || rd.walkIn) return
        if (currentAtt[pid].preStatus === "kinnitatud" && pid !== playerId) kinnitatudCount++
    })
    const isFull = kinnitatudCount >= capacity

    const isActive = sessionStartMs <= nowMs && sessionEndMs >= nowMs

    // Messages for this instance
    const msgs = sessionMessages[instId]
    let msgArr = []
    if (msgs) {
        msgArr = Object.entries(msgs).map(([id, m]) => ({ id, ...m })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }

    return (
        <div style={{
            border: "1px solid " + (isActive ? "#22c55e" : "#ccc"),
            borderRadius: "8px", padding: "16px", marginBottom: "12px",
            background: isActive ? "#f0fdf4" : "white"
        }}>
            {/* Child name */}
            <div style={{ fontWeight: "bold", fontSize: "15px", color: "#3b82f6", marginBottom: "8px" }}>{childName}</div>

            {/* Session info */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <div style={{ fontWeight: "bold", fontSize: "16px" }}>{timeDisplay}</div>
                {isActive && (
                    <div style={{ background: "#22c55e", color: "white", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>AKTIIVNE</div>
                )}
            </div>
            <div style={{ color: "#555", marginBottom: "4px" }}>{formatEstonianDate(inst.date)}</div>
            <div style={{ color: "#333", marginBottom: "12px", textTransform: "capitalize" }}>{sport}</div>

            {/* Capacity */}
            <div style={{ fontSize: "13px", color: "#666", marginBottom: "12px" }}>
                Kinnitatud: <span style={{ fontWeight: "bold", color: kinnitatudCount + (preStatus === "kinnitatud" ? 1 : 0) >= capacity ? "orange" : "green" }}>
                    {kinnitatudCount + (preStatus === "kinnitatud" ? 1 : 0)} / {capacity}
                </span>
            </div>

            {/* preStatus section */}
            {!sessionStarted ? (
                <div style={{ marginBottom: "12px" }}>
                    {isLocked ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontWeight: "bold", color: preStatus === "kinnitatud" ? "#22c55e" : preStatus === "eiOsale" ? "#ef4444" : "#999" }}>
                                {PRESTATUS_LABELS[preStatus] || PRESTATUS_LABELS.null}
                            </span>
                            <span style={{ background: "#fbbf24", color: "#000", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold" }}>🔒 Lukustatud</span>
                        </div>
                    ) : preStatus === "kinnitatud" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontWeight: "bold", color: "#22c55e" }}>✅ {PRESTATUS_LABELS.kinnitatud}</span>
                            <button onClick={() => onPreStatus(instId, playerId, null)}
                                style={{ padding: "4px 12px", background: "#eee", border: "1px solid #ccc", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>
                                Tühista
                            </button>
                        </div>
                    ) : preStatus === "eiOsale" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontWeight: "bold", color: "#ef4444" }}>❌ {PRESTATUS_LABELS.eiOsale}</span>
                            <button onClick={() => onPreStatus(instId, playerId, "kinnitatud")}
                                disabled={isFull}
                                style={{ padding: "4px 12px", background: isFull ? "#eee" : "#e0f2f1", border: "1px solid #ccc", borderRadius: "6px", cursor: isFull ? "not-allowed" : "pointer", fontSize: "13px" }}>
                                Muuda
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button onClick={() => onPreStatus(instId, playerId, "kinnitatud")}
                                disabled={isFull}
                                style={{ padding: "6px 16px", background: isFull ? "#ccc" : "#22c55e", color: "white", border: "none", borderRadius: "6px", cursor: isFull ? "not-allowed" : "pointer", fontWeight: "bold" }}>
                                {isFull ? "Treening on täis" : "Kinnitan"}
                            </button>
                            <button onClick={() => onPreStatus(instId, playerId, "eiOsale")}
                                style={{ padding: "6px 16px", background: "#ef4444", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
                                Ei osale
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ marginBottom: "12px" }}>
                    <span style={{ fontWeight: "bold", color: preStatus === "kinnitatud" ? "#22c55e" : preStatus === "eiOsale" ? "#ef4444" : "#999", fontSize: "13px" }}>
                        {PRESTATUS_LABELS[preStatus] || PRESTATUS_LABELS.null}
                    </span>
                </div>
            )}

            {/* realStatus after session start */}
            {sessionStarted && realStatus && (
                <div style={{ marginBottom: "12px", fontSize: "14px" }}>
                    Kohalolek: <span style={{ fontWeight: "bold" }}>
                        {REAL_STATUS_DISPLAY[realStatus]?.icon} {REAL_STATUS_DISPLAY[realStatus]?.label || REALSTATUS_LABELS.null}
                    </span>
                </div>
            )}
            {sessionStarted && !realStatus && (
                <div style={{ marginBottom: "12px", fontSize: "13px", color: "#999" }}>
                    Kohalolek: {REALSTATUS_LABELS.null}
                </div>
            )}

            {/* Feedback section */}
            {sessionEnded && (realStatus === "kohal" || realStatus === "hilines") && (
                <div style={{ borderTop: "1px solid #eee", marginTop: "12px", paddingTop: "8px" }}>
                    <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "6px" }}>Tagasiside</div>
                    
                    {/* Coach Feedback */}
                    <div style={{ marginBottom: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "bold", color: "#555" }}>Treener: </span>
                        {!coachFb ? (
                            <span style={{ fontSize: "13px", color: "#999" }}>Puudub</span>
                        ) : feedbackVisible ? (
                            <span style={{ fontSize: "13px" }}>
                                {(() => {
                                    const effortItem = EFFORT_SCALE.find(item => item.value === coachFb.effort)
                                    return effortItem ? `${effortItem.label} ${effortItem.emoji}` : coachFb.effort
                                })()}
                                {coachFb.note && <span style={{ marginLeft: "8px", fontStyle: "italic", color: "#666" }}>"{coachFb.note}"</span>}
                            </span>
                        ) : (
                            <span style={{ fontSize: "13px", color: "#f59e0b", fontStyle: "italic" }}>Treeneri tagasiside on varsti saadaval</span>
                        )}
                    </div>

                    {/* Player Feedback / Reminder */}
                    <div>
                        <span style={{ fontSize: "13px", fontWeight: "bold", color: "#555" }}>Mängija: </span>
                        {playerFb ? (
                            <span style={{ fontSize: "13px" }}>
                                {(() => {
                                    const effortItem = PLAYER_EFFORT_SCALE.find(item => item.value === playerFb.effort)
                                    return effortItem ? `Pingutus: ${effortItem.label} ${effortItem.emoji}` : `Pingutus: ${playerFb.effort}`
                                })()}
                            </span>
                        ) : feedbackWindowOpen && (realStatus === "kohal" || realStatus === "hilines") ? (
                            <span style={{ fontSize: "13px", color: "#f59e0b", fontWeight: "bold" }}>📝 Anna tagasiside</span>
                        ) : (
                            <span style={{ fontSize: "13px", color: "#999" }}>Puudub</span>
                        )}
                    </div>
                </div>
            )}

            {/* Session messages */}
            {msgArr.length > 0 && (
                <div style={{ borderTop: "1px solid #eee", marginTop: "8px", paddingTop: "8px" }}>
                    <div style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>Teated</div>
                    {msgArr.map(m => (
                        <div key={m.id} style={{ marginBottom: "6px", fontSize: "12px" }}>
                            <span style={{ fontWeight: "bold", color: "#333" }}>{m.createdByName}</span>
                            <span style={{ color: "#999", marginLeft: "6px" }}>
                                {new Date(m.createdAt).toLocaleString("et-EE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <div style={{ color: "#555", marginTop: "2px" }}>{m.text}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Player Session Card ─────────────────────────────────
function SessionCardPlayer({ instId, inst, def, attendance, rosters, sessionMessages, playerId, nowMs, onPreStatus, feedbackData, feedbackLocal, feedbackSaved, feedbackEditing, onFeedbackLocalChange, onFeedbackSave, onFeedbackEdit, msg }) {
    const startTime = inst.startTime || def?.startTime || ""
    const endTime = inst.endTime || def?.endTime || ""
    const timeDisplay = endTime ? `${startTime} - ${endTime}` : startTime
    const sport = inst.sport || def?.sport || ""

    let sessionStartMs = 0
    let sessionEndMs = 0
    try {
        sessionStartMs = new Date(combineDateAndTime(inst.date, startTime)).getTime()
        sessionEndMs = new Date(combineDateAndTime(inst.date, endTime)).getTime()
    } catch (e) {}

    const isLocked = nowMs >= (sessionStartMs - 60 * 60 * 1000)
    const sessionStarted = nowMs >= sessionStartMs
    const sessionEnded = nowMs > sessionEndMs
    const isActive = sessionStartMs <= nowMs && sessionEndMs >= nowMs

    const attRecord = attendance[instId]?.[playerId] || {}
    const preStatus = attRecord.preStatus || null
    const realStatus = attRecord.realStatus || null

    // Capacity check
    const currentAtt = attendance[instId] || {}
    const currentRoster = rosters[instId] || {}
    const capacity = inst.capacity || def?.capacity || 0
    let kinnitatudCount = 0
    Object.keys(currentAtt).forEach(pid => {
        const rd = currentRoster[pid] || {}
        if (rd.removedByCoach || rd.walkIn) return
        if (currentAtt[pid].preStatus === "kinnitatud" && pid !== playerId) kinnitatudCount++
    })
    const isFull = kinnitatudCount >= capacity

    // Messages
    const msgs = sessionMessages[instId]
    let msgArr = []
    if (msgs) {
        msgArr = Object.entries(msgs).map(([id, m]) => ({ id, ...m })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }

    // Feedback
    const editDeadlineMs = sessionEndMs + 7 * 24 * 60 * 60 * 1000
    const isExpired = nowMs > editDeadlineMs
    const feedbackVisible = sessionEnded && (nowMs > sessionEndMs + 24 * 60 * 60 * 1000)
    const canFeedback = sessionEnded && (realStatus === "kohal" || realStatus === "hilines")
    const key = `${instId}__${playerId}`
    const existingFb = feedbackData?.[instId]?.[playerId]?.player
    const coachFb = feedbackData?.[instId]?.[playerId]?.coach
    const hasFeedback = !!existingFb
    const isEditingFb = feedbackEditing[key]

    return (
        <div style={{
            border: "1px solid " + (isActive ? "#22c55e" : "#ccc"),
            borderRadius: "8px", padding: "16px", marginBottom: "12px",
            background: isActive ? "#f0fdf4" : "white"
        }}>
            {/* Session info */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <div style={{ fontWeight: "bold", fontSize: "16px" }}>{timeDisplay}</div>
                {isActive && (
                    <div style={{ background: "#22c55e", color: "white", padding: "2px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold" }}>AKTIIVNE</div>
                )}
            </div>
            <div style={{ color: "#555", marginBottom: "4px" }}>{formatEstonianDate(inst.date)}</div>
            <div style={{ color: "#333", marginBottom: "12px", textTransform: "capitalize" }}>{sport}</div>

            {/* Capacity */}
            <div style={{ fontSize: "13px", color: "#666", marginBottom: "12px" }}>
                Kinnitatud: <span style={{ fontWeight: "bold", color: kinnitatudCount + (preStatus === "kinnitatud" ? 1 : 0) >= capacity ? "orange" : "green" }}>
                    {kinnitatudCount + (preStatus === "kinnitatud" ? 1 : 0)} / {capacity}
                </span>
            </div>

            {/* preStatus section */}
            {!sessionStarted ? (
                <div style={{ marginBottom: "12px" }}>
                    {isLocked ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontWeight: "bold", color: preStatus === "kinnitatud" ? "#22c55e" : preStatus === "eiOsale" ? "#ef4444" : "#999" }}>
                                {PRESTATUS_LABELS[preStatus] || PRESTATUS_LABELS.null}
                            </span>
                            <span style={{ background: "#fbbf24", color: "#000", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold" }}>🔒 Lukustatud</span>
                        </div>
                    ) : preStatus === "kinnitatud" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontWeight: "bold", color: "#22c55e" }}>✅ {PRESTATUS_LABELS.kinnitatud}</span>
                            <button onClick={() => onPreStatus(instId, playerId, null)}
                                style={{ padding: "4px 12px", background: "#eee", border: "1px solid #ccc", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>
                                Tühista
                            </button>
                        </div>
                    ) : preStatus === "eiOsale" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontWeight: "bold", color: "#ef4444" }}>❌ {PRESTATUS_LABELS.eiOsale}</span>
                            <button onClick={() => onPreStatus(instId, playerId, "kinnitatud")}
                                disabled={isFull}
                                style={{ padding: "4px 12px", background: isFull ? "#eee" : "#e0f2f1", border: "1px solid #ccc", borderRadius: "6px", cursor: isFull ? "not-allowed" : "pointer", fontSize: "13px" }}>
                                Muuda
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button onClick={() => onPreStatus(instId, playerId, "kinnitatud")}
                                disabled={isFull}
                                style={{ padding: "6px 16px", background: isFull ? "#ccc" : "#22c55e", color: "white", border: "none", borderRadius: "6px", cursor: isFull ? "not-allowed" : "pointer", fontWeight: "bold" }}>
                                {isFull ? "Treening on täis" : "Kinnitan"}
                            </button>
                            <button onClick={() => onPreStatus(instId, playerId, "eiOsale")}
                                style={{ padding: "6px 16px", background: "#ef4444", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
                                Ei osale
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div style={{ marginBottom: "12px" }}>
                    <span style={{ fontWeight: "bold", color: preStatus === "kinnitatud" ? "#22c55e" : preStatus === "eiOsale" ? "#ef4444" : "#999", fontSize: "13px" }}>
                        {PRESTATUS_LABELS[preStatus] || PRESTATUS_LABELS.null}
                    </span>
                </div>
            )}

            {/* realStatus after session start */}
            {sessionStarted && realStatus && (
                <div style={{ marginBottom: "12px", fontSize: "14px" }}>
                    Kohalolek: <span style={{ fontWeight: "bold" }}>
                        {REAL_STATUS_DISPLAY[realStatus]?.icon} {REAL_STATUS_DISPLAY[realStatus]?.label || REALSTATUS_LABELS.null}
                    </span>
                </div>
            )}
            {sessionStarted && !realStatus && (
                <div style={{ marginBottom: "12px", fontSize: "13px", color: "#999" }}>
                    Kohalolek: {REALSTATUS_LABELS.null}
                </div>
            )}

            {/* Coach Feedback Display */}
            {canFeedback && (
                <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "4px" }}>Treeneri tagasiside</div>
                    {!coachFb ? (
                        <div style={{ fontSize: "13px", color: "#999" }}>Puudub</div>
                    ) : feedbackVisible ? (
                        <div style={{ fontSize: "13px" }}>
                            {(() => {
                                const effortItem = EFFORT_SCALE.find(item => item.value === coachFb.effort)
                                return effortItem ? `${effortItem.label} ${effortItem.emoji}` : coachFb.effort
                            })()}
                            {coachFb.note && <div style={{ marginTop: "4px", fontStyle: "italic", color: "#666" }}>"{coachFb.note}"</div>}
                        </div>
                    ) : (
                        <div style={{ fontSize: "13px", color: "#f59e0b", fontStyle: "italic" }}>Treeneri tagasiside on varsti saadaval</div>
                    )}
                </div>
            )}

            {/* Player Feedback */}
            {canFeedback && (() => {
                if (isExpired && !hasFeedback) {
                    return <div style={{ fontSize: "13px", color: "#999", marginBottom: "8px" }}>Tagasiside aeg lõppenud</div>
                }
                if ((isExpired && hasFeedback) || (hasFeedback && !isEditingFb)) {
                    const effortItem = PLAYER_EFFORT_SCALE.find(e => e.value === existingFb.effort)
                    const engItem = COACH_ENGAGEMENT_SCALE.find(e => e.value === existingFb.coachEngagement)
                    return (
                        <div style={{ borderTop: "1px solid #eee", marginTop: "8px", paddingTop: "8px" }}>
                            <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "6px" }}>Minu tagasiside</div>
                            <div style={{ fontSize: "13px", marginBottom: "4px" }}>Pingutus: {effortItem?.emoji} {effortItem?.label}</div>
                            <div style={{ fontSize: "13px", marginBottom: "4px" }}>Treener: {engItem?.emoji} {engItem?.label}</div>
                            {existingFb.note && <div style={{ fontSize: "13px", color: "#555", fontStyle: "italic", marginBottom: "4px" }}>{existingFb.note}</div>}
                            {!isExpired && (
                                <button onClick={() => onFeedbackEdit(key, existingFb)}
                                    style={{ marginTop: "4px", padding: "4px 12px", background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: "6px", cursor: "pointer", fontSize: "13px", color: "#3b82f6" }}>
                                    Muuda
                                </button>
                            )}
                            {feedbackSaved[key] && <span style={{ marginLeft: "8px", color: "#22c55e", fontWeight: "bold", fontSize: "13px" }}>Salvestatud ✓</span>}
                        </div>
                    )
                }
                const local = feedbackLocal[key] || { effort: null, coachEngagement: null, note: "" }
                const canSave = local.effort && local.coachEngagement
                return (
                    <div style={{ borderTop: "1px solid #eee", marginTop: "8px", paddingTop: "8px" }}>
                        <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>📝 Anna tagasiside</div>
                        <div style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>Minu pingutus</div>
                        <div style={{ display: "flex", gap: "4px", marginBottom: "12px", flexWrap: "wrap" }}>
                            {PLAYER_EFFORT_SCALE.map(e => (
                                <button key={e.value}
                                    onClick={() => onFeedbackLocalChange(key, { ...(feedbackLocal[key] || { effort: null, coachEngagement: null, note: "" }), effort: e.value })}
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
                                    onClick={() => onFeedbackLocalChange(key, { ...(feedbackLocal[key] || { effort: null, coachEngagement: null, note: "" }), coachEngagement: e.value })}
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
                            onChange={e => onFeedbackLocalChange(key, { ...(feedbackLocal[key] || {}), note: e.target.value.slice(0, 200) })}
                            placeholder="Märkus (vabatahtlik)" maxLength={200}
                            style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #ccc", marginBottom: "8px", boxSizing: "border-box", fontSize: "13px" }}
                        />
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <button onClick={() => onFeedbackSave(instId, playerId)} disabled={!canSave}
                                style={{ padding: "6px 16px", background: canSave ? "#3b82f6" : "#ccc", color: "white", border: "none", borderRadius: "6px", cursor: canSave ? "pointer" : "not-allowed", fontWeight: "bold", fontSize: "13px" }}>
                                Salvesta
                            </button>
                            {feedbackSaved[key] && <span style={{ color: "#22c55e", fontWeight: "bold", fontSize: "13px" }}>Salvestatud ✓</span>}
                        </div>
                    </div>
                )
            })()}

            {/* Feedback reminder */}
            {canFeedback && !hasFeedback && !isExpired && !(feedbackLocal[key]?.effort) && (
                <div style={{ fontSize: "13px", color: "#f59e0b", fontWeight: "bold", marginBottom: "8px" }}>
                    📝 Anna tagasiside
                </div>
            )}

            {/* Session messages */}
            {msgArr.length > 0 && (
                <div style={{ borderTop: "1px solid #eee", marginTop: "8px", paddingTop: "8px" }}>
                    <div style={{ fontSize: "13px", fontWeight: "bold", marginBottom: "6px" }}>Teated</div>
                    {msgArr.map(m => (
                        <div key={m.id} style={{ marginBottom: "6px", fontSize: "12px" }}>
                            <span style={{ fontWeight: "bold", color: "#333" }}>{m.createdByName}</span>
                            <span style={{ color: "#999", marginLeft: "6px" }}>
                                {new Date(m.createdAt).toLocaleString("et-EE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <div style={{ color: "#555", marginTop: "2px" }}>{m.text}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Session Group ──────────────────────────────────────
function SessionGroup({ title, sessions, defaultOpen = true }) {
    const [isOpen, setIsOpen] = useState(defaultOpen)
    if (!sessions || sessions.length === 0) return null
    return (
        <div style={{ marginBottom: "24px" }}>
            <h3 onClick={() => setIsOpen(!isOpen)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", borderBottom: "1px solid #eee", paddingBottom: "8px", color: "#333" }}>
                <span>{title} <span style={{ color: "#888", fontSize: "14px" }}>({sessions.length})</span></span>
                <span>{isOpen ? "▼" : "▶"}</span>
            </h3>
            {isOpen && <div style={{ marginTop: "12px" }}>{sessions.map(s => s.renderCard)}</div>}
        </div>
    )
}

// ─── Main Component ─────────────────────────────────────
export default function SessionListPage() {
    const { user: currentUser, role, isLoading } = useAuth()
    const navigate = useNavigate()

    const [instances, setInstances] = useState({})
    const [definitions, setDefinitions] = useState({})
    const [coachPerms, setCoachPerms] = useState({})
    const [attendance, setAttendance] = useState({})
    const [rosters, setRosters] = useState({})
    const [players, setPlayers] = useState({})
    const [parentLinks, setParentLinks] = useState({})
    const [sessionMessages, setSessionMessages] = useState({})
    const [selectedChild, setSelectedChild] = useState("all")
    const [parentMsg, setParentMsg] = useState("")
    const [myPlayerId, setMyPlayerId] = useState(null)
    const [feedbackData, setFeedbackData] = useState({})
    const [feedbackLocal, setFeedbackLocal] = useState({})
    const [feedbackSaved, setFeedbackSaved] = useState({})
    const [feedbackEditing, setFeedbackEditing] = useState({})
    const [error, setError] = useState(null)
    const feedbackLoadedRef = useRef(false)

    useEffect(() => {
        if (!currentUser) return
        const unsubs = []
        const handleErr = () => setError("Andmete laadimine ebaõnnestus.")

        unsubs.push(onValue(ref(database, "sessionInstances"), (snap) => setInstances(snap.val() || {}), handleErr))
        unsubs.push(onValue(ref(database, "sessionDefinitions"), (snap) => setDefinitions(snap.val() || {}), handleErr))
        unsubs.push(onValue(ref(database, "attendance"), (snap) => setAttendance(snap.val() || {}), handleErr))
        unsubs.push(onValue(ref(database, "rosters"), (snap) => setRosters(snap.val() || {}), handleErr))

        if (role === "coach") {
            unsubs.push(onValue(ref(database, `coachPermissions/${currentUser.uid}`), (snap) => setCoachPerms(snap.val() || {}), handleErr))
        }

        if (role === "parent") {
            unsubs.push(onValue(ref(database, "players"), (snap) => setPlayers(snap.val() || {}), handleErr))
            unsubs.push(onValue(ref(database, `parentLinks/${currentUser.uid}`), (snap) => setParentLinks(snap.val() || {}), handleErr))
            unsubs.push(onValue(ref(database, "sessionMessages"), (snap) => setSessionMessages(snap.val() || {}), handleErr))
        }

        if (role === "player") {
            unsubs.push(onValue(ref(database, "sessionMessages"), (snap) => setSessionMessages(snap.val() || {}), handleErr))
            get(ref(database, `users/${currentUser.uid}/playerId`)).then(snap => {
                if (snap.exists()) setMyPlayerId(snap.val())
            }).catch(handleErr)
        }

        return () => unsubs.forEach(u => u())
    }, [currentUser, role])

    const hasPermissionForInstance = (inst) => {
        if (role === "admin") return true
        if (role !== "coach") return false
        if (coachPerms.global === true) return true
        const defId = inst.definitionId
        if (defId && coachPerms.sessionDefinitions?.[defId] === true) return true
        if (inst.assignedCoachIds?.[currentUser.uid] === true) return true
        return false
    }

    // ─── Parent preStatus handler ───────────────────
    const handleParentPreStatus = async (instId, playerId, newStatus) => {
        setParentMsg("")
        const currentInst = instances[instId]
        const def = definitions[currentInst?.definitionId]
        if (!currentInst || !def) return

        const nowMs = getTallinnNow().getTime()
        const startTime = currentInst.startTime ?? def.startTime
        const sessionStartIso = combineDateAndTime(currentInst.date, startTime)
        const sessionStartMs = new Date(sessionStartIso).getTime()

        if (nowMs >= sessionStartMs - 60 * 60 * 1000) {
            setParentMsg("Lukustatud — eelstaatust ei saa enam muuta.")
            return
        }

        // Capacity check for kinnitatud
        if (newStatus === "kinnitatud") {
            const capacity = currentInst.capacity || 0
            const currentAttendance = attendance[instId] || {}
            const currentRoster = rosters[instId] || {}
            let kinnitatudCount = 0
            Object.keys(currentAttendance).forEach(pid => {
                const rd = currentRoster[pid] || {}
                if (rd.removedByCoach || rd.walkIn) return
                if (currentAttendance[pid].preStatus === "kinnitatud" && pid !== playerId) kinnitatudCount++
            })
            if (kinnitatudCount >= capacity) {
                setParentMsg("Treening on täis. Kinnitamine ei ole võimalik.")
                return
            }
        }

        const attRef = ref(database, `attendance/${instId}/${playerId}`)
        try {
            if (newStatus === null) {
                // Tühista — set preStatus to null
                const snap = await get(attRef)
                if (snap.exists()) {
                    await update(attRef, { preStatus: null })
                }
            } else {
                const snap = await get(attRef)
                if (snap.exists()) {
                    await update(attRef, { preStatus: newStatus })
                } else {
                    await set(attRef, { preStatus: newStatus, realStatus: null, lateCancel: false })
                }
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
            
            setParentMsg("Eelstaatus salvestatud.")
        } catch (err) {
            console.error("Parent preStatus write failed", err)
            setParentMsg(`Viga: ${err.message}`)
        }
    }

    // ─── Player preStatus handler ───────────────────
    const handlePlayerPreStatus = async (instId, playerId, newStatus) => {
        setParentMsg("")
        const currentInst = instances[instId]
        const def = definitions[currentInst?.definitionId]
        if (!currentInst || !def) return

        const nowMsLocal = getTallinnNow().getTime()
        const startTime = currentInst.startTime ?? def.startTime
        const sessionStartIso = combineDateAndTime(currentInst.date, startTime)
        const sessionStartMs = new Date(sessionStartIso).getTime()

        if (nowMsLocal >= sessionStartMs - 60 * 60 * 1000) {
            setParentMsg("Lukustatud — eelstaatust ei saa enam muuta.")
            return
        }

        if (newStatus === "kinnitatud") {
            const capacity = currentInst.capacity || 0
            const currentAttendance = attendance[instId] || {}
            const currentRoster = rosters[instId] || {}
            let kCount = 0
            Object.keys(currentAttendance).forEach(pid => {
                const rd = currentRoster[pid] || {}
                if (rd.removedByCoach || rd.walkIn) return
                if (currentAttendance[pid].preStatus === "kinnitatud" && pid !== playerId) kCount++
            })
            if (kCount >= capacity) {
                setParentMsg("Treening on täis. Kinnitamine ei ole võimalik.")
                return
            }
        }

        const attRef = ref(database, `attendance/${instId}/${playerId}`)
        try {
            if (newStatus === null) {
                const snap = await get(attRef)
                if (snap.exists()) await update(attRef, { preStatus: null })
            } else {
                const snap = await get(attRef)
                if (snap.exists()) {
                    await update(attRef, { preStatus: newStatus })
                } else {
                    await set(attRef, { preStatus: newStatus, realStatus: null, lateCancel: false })
                }
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
            
            setParentMsg("Eelstaatus salvestatud.")
        } catch (err) {
            console.error("Player preStatus write failed", err)
            setParentMsg(`Viga: ${err.message}`)
        }
    }

    // ─── Player feedback handlers ──────────────────
    const loadPlayerFeedback = async () => {
        if (feedbackLoadedRef.current) return
        feedbackLoadedRef.current = true
        try {
            const snap = await get(ref(database, 'feedback'))
            const data = snap.val() || {}
            setFeedbackData(data)
            if (myPlayerId) {
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
        } catch (err) { console.error("Load feedback failed", err); setError(err.message) }
    }

    useEffect(() => {
        if (role === "player" || role === "parent") loadPlayerFeedback()
    }, [role, myPlayerId])

    const handlePlayerFeedbackSave = async (instId, playerId) => {
        const key = `${instId}__${playerId}`
        const local = feedbackLocal[key]
        if (!local || !local.effort || !local.coachEngagement) {
            setParentMsg("Palun vali nii pingutuse kui treeneri hinnang.")
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
            setParentMsg("")
            setTimeout(() => setFeedbackSaved(prev => ({ ...prev, [key]: false })), 2000)
        } catch (err) {
            console.error("Save player feedback failed", err)
            setParentMsg(`Viga: ${err.message}`)
        }
    }

    const handleFeedbackEdit = (key, existingFb) => {
        setFeedbackEditing(prev => ({ ...prev, [key]: true }))
        setFeedbackLocal(prev => ({ ...prev, [key]: {
            effort: existingFb.effort,
            coachEngagement: existingFb.coachEngagement,
            note: existingFb.note || ""
        }}))
    }

    const handleFeedbackLocalChange = (key, data) => {
        setFeedbackLocal(prev => ({ ...prev, [key]: data }))
    }

    if (isLoading) return <LoadingSpinner />
    if (error) return <ErrorMessage message={error} />

    const nowTallinn = getTallinnNow()
    const nowMs = nowTallinn.getTime()
    const localToday = nowTallinn.toLocaleDateString("en-CA", { timeZone: "Europe/Tallinn" })

    // ─── PLAYER VIEW ───────────────────────────
    if (role === "player") {
        if (!myPlayerId) return <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}><h2>Treeningud</h2><EmptyState message="Treeninguid ei leitud." /></div>

        const activeSessions = []
        const todaySessions = []
        const upcomingSessions = []
        const pastSessions = []

        Object.entries(instances)
            .forEach(([instId, inst]) => {
                const def = definitions[inst.definitionId] || null
                if (!def) return
                const currentRoster = rosters[instId] || {}
                if (!currentRoster[myPlayerId]) return
                if (currentRoster[myPlayerId].removedByCoach) return

                try {
                    const { startMs: sessionStartMs, endMs: sessionEndMs } = getSessionBounds(inst, def)
                    const renderCard = (
                        <SessionCardPlayer
                            key={instId}
                            instId={instId} inst={inst} def={def}
                            attendance={attendance} rosters={rosters}
                            sessionMessages={sessionMessages}
                            playerId={myPlayerId}
                            nowMs={nowMs} onPreStatus={handlePlayerPreStatus}
                            feedbackData={feedbackData}
                            feedbackLocal={feedbackLocal}
                            feedbackSaved={feedbackSaved}
                            feedbackEditing={feedbackEditing}
                            onFeedbackLocalChange={handleFeedbackLocalChange}
                            onFeedbackSave={handlePlayerFeedbackSave}
                            onFeedbackEdit={handleFeedbackEdit}
                        />
                    )

                    const sessionObj = { instId, inst, def, renderCard, sessionStartMs }

                    if (sessionStartMs <= nowMs && sessionEndMs >= nowMs) activeSessions.push(sessionObj)
                    else if (sessionStartMs > nowMs && inst.date === localToday) todaySessions.push(sessionObj)
                    else if (sessionStartMs > nowMs) upcomingSessions.push(sessionObj)
                    else pastSessions.push(sessionObj)
                } catch (e) { return }
            })

        activeSessions.sort(compareSessionItems)
        todaySessions.sort(compareSessionItems)
        upcomingSessions.sort(compareSessionItems)
        pastSessions.sort((a, b) => compareSessionItems(b, a))

        const totalVisible = activeSessions.length + todaySessions.length + upcomingSessions.length + pastSessions.length

        return (
            <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
                <h2 style={{ marginBottom: "16px" }}>Treeningud</h2>

                {parentMsg && <p style={{ color: parentMsg.startsWith("Viga") ? "red" : "green", fontWeight: "bold", marginBottom: "12px" }}>{parentMsg}</p>}

                {totalVisible === 0 ? (
                    <p>Ühtegi treeningut ei leitud.</p>
                ) : (
                    <>
                        <SessionGroup title="Aktiivne" sessions={activeSessions} defaultOpen={true} />
                        <SessionGroup title="Täna" sessions={todaySessions} defaultOpen={true} />
                        <SessionGroup title="Tulevased" sessions={upcomingSessions} defaultOpen={true} />
                        <SessionGroup title="Möödunud" sessions={pastSessions} defaultOpen={false} />
                    </>
                )}
            </div>
        )
    }

    // ─── PARENT VIEW ────────────────────────────────
    if (role === "parent") {
        const linkedPlayerIds = Object.keys(parentLinks).filter(id => parentLinks[id] === true)

        if (linkedPlayerIds.length === 0) {
            return (
                <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
                    <h2 style={{ marginBottom: "16px" }}>Treeningud</h2>
                    <EmptyState message="Ühtegi last ei leitud." />
                </div>
            )
        }

        // Build child list for filter
        const childOptions = linkedPlayerIds.map(pId => {
            const p = players[pId]
            return { id: pId, name: p ? `${p.firstName} ${p.lastName}` : pId }
        }).sort((a, b) => compareDisplayNames(a.name, a.id, b.name, b.id))

        // Build session cards
        const activeSessions = []
        const todaySessions = []
        const upcomingSessions = []
        const pastSessions = []

        const filteredPlayerIds = selectedChild === "all" ? linkedPlayerIds : [selectedChild]

        Object.entries(instances)
            .forEach(([instId, inst]) => {
                const def = definitions[inst.definitionId] || null
                if (!def) return
                const currentRoster = rosters[instId] || {}

                filteredPlayerIds.forEach(playerId => {
                    if (!currentRoster[playerId]) return
                    if (currentRoster[playerId].removedByCoach) return

                    try {
                        const { startMs: sessionStartMs, endMs: sessionEndMs } = getSessionBounds(inst, def)
                        const childName = childOptions.find(c => c.id === playerId)?.name || playerId

                        const renderCard = (
                            <SessionCardParent
                                key={`${instId}_${playerId}`}
                                instId={instId} inst={inst} def={def}
                                attendance={attendance} rosters={rosters} players={players}
                                sessionMessages={sessionMessages}
                                sessionFeedback={feedbackData}
                                childName={childName} playerId={playerId}
                                nowMs={nowMs} onPreStatus={handleParentPreStatus}
                            />
                        )

                        const sessionObj = { instId, inst, def, renderCard, sessionStartMs }

                        if (sessionStartMs <= nowMs && sessionEndMs >= nowMs) activeSessions.push(sessionObj)
                        else if (sessionStartMs > nowMs && inst.date === localToday) todaySessions.push(sessionObj)
                        else if (sessionStartMs > nowMs) upcomingSessions.push(sessionObj)
                        else pastSessions.push(sessionObj)
                    } catch (e) { return }
                })
            })

        activeSessions.sort(compareSessionItems)
        todaySessions.sort(compareSessionItems)
        upcomingSessions.sort(compareSessionItems)
        pastSessions.sort((a, b) => compareSessionItems(b, a))

        const totalVisible = activeSessions.length + todaySessions.length + upcomingSessions.length + pastSessions.length

        return (
            <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
                <h2 style={{ marginBottom: "16px" }}>Treeningud</h2>

                {/* Child filter */}
                {childOptions.length > 1 && (
                    <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
                        <button onClick={() => setSelectedChild("all")}
                            style={{
                                padding: "6px 14px", borderRadius: "20px", border: "1px solid #ccc", cursor: "pointer",
                                background: selectedChild === "all" ? "#3b82f6" : "white",
                                color: selectedChild === "all" ? "white" : "#333",
                                fontWeight: selectedChild === "all" ? "bold" : "normal"
                            }}>
                            Kõik lapsed
                        </button>
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
                )}

                {parentMsg && <p style={{ color: parentMsg.startsWith("Viga") ? "red" : "green", fontWeight: "bold", marginBottom: "12px" }}>{parentMsg}</p>}

                {totalVisible === 0 ? (
                    <p>Ühtegi treeningut ei leitud.</p>
                ) : (
                    <>
                        <SessionGroup title="Aktiivne" sessions={activeSessions} defaultOpen={true} />
                        <SessionGroup title="Täna" sessions={todaySessions} defaultOpen={true} />
                        <SessionGroup title="Tulevased" sessions={upcomingSessions} defaultOpen={true} />
                        <SessionGroup title="Möödunud" sessions={pastSessions} defaultOpen={false} />
                    </>
                )}
            </div>
        )
    }

    // ─── COACH / ADMIN VIEW ─────────────────────────
    const activeSessions = []
    const todaySessions = []
    const upcomingSessions = []
    const pastSessions = []

    Object.entries(instances)
        .filter(([_, inst]) => hasPermissionForInstance(inst))
        .forEach(([instId, inst]) => {
            const def = definitions[inst.definitionId] || null
            try {
                const { startMs: sessionStartMs, endMs: sessionEndMs } = getSessionBounds(inst, def)
                let bucket = "upcoming"
                let isActive = false

                if (sessionStartMs <= nowMs && sessionEndMs >= nowMs) {
                    bucket = "active"
                    isActive = true
                } else if (sessionStartMs > nowMs && inst.date === localToday) {
                    bucket = "today"
                } else if (sessionStartMs > nowMs && inst.date > localToday) {
                    bucket = "upcoming"
                } else {
                    bucket = "past"
                }

                const renderCard = (
                    <SessionCardCoach
                        key={instId}
                        instId={instId} inst={inst} def={def}
                        attendance={attendance} rosters={rosters}
                        isActive={isActive}
                        onClick={() => {
                            try { localStorage.setItem("lastSessionId", instId) } catch (e) {}
                            navigate(`/session/${instId}`)
                        }}
                    />
                )

                const sessionObj = { instId, inst, def, renderCard, sessionStartMs }
                if (bucket === "active") activeSessions.push(sessionObj)
                else if (bucket === "today") todaySessions.push(sessionObj)
                else if (bucket === "upcoming") upcomingSessions.push(sessionObj)
                else if (bucket === "past") pastSessions.push(sessionObj)
            } catch (e) { return }
        })

    activeSessions.sort(compareSessionItems)
    todaySessions.sort(compareSessionItems)
    upcomingSessions.sort(compareSessionItems)
    pastSessions.sort((a, b) => compareSessionItems(b, a))

    const totalVisible = activeSessions.length + todaySessions.length + upcomingSessions.length + pastSessions.length

    // Last session banner (coach/admin only)
    const allSessionObjs = [...activeSessions, ...todaySessions, ...upcomingSessions, ...pastSessions]
    let lastSessionBanner = null
    try {
        const lastId = localStorage.getItem("lastSessionId")
        if (lastId) {
            const match = allSessionObjs.find(s => s.instId === lastId)
            if (match) {
                const lDef = match.def
                const lInst = match.inst
                const lTime = (lInst.startTime || lDef?.startTime || "")
                const lSport = lInst.sport || lDef?.sport || ""
                lastSessionBanner = (
                    <div
                        onClick={() => {
                            try { localStorage.setItem("lastSessionId", lastId) } catch (e) {}
                            navigate(`/session/${lastId}`)
                        }}
                        style={{
                            border: "1px solid #3b82f6", borderRadius: "8px", padding: "12px 16px",
                            marginBottom: "20px", cursor: "pointer", background: "#eff6ff",
                            transition: "background 0.15s"
                        }}
                        onPointerDown={e => e.currentTarget.style.background = "#dbeafe"}
                        onPointerUp={e => e.currentTarget.style.background = "#eff6ff"}
                        onPointerLeave={e => e.currentTarget.style.background = "#eff6ff"}
                    >
                        <div style={{ fontSize: "13px", color: "#3b82f6", fontWeight: "bold", marginBottom: "4px" }}>Jätka viimast treeningut</div>
                        <div style={{ fontSize: "15px", fontWeight: "bold" }}>{formatEstonianDate(lInst.date)} — {lTime}</div>
                        <div style={{ fontSize: "13px", color: "#555", textTransform: "capitalize" }}>{lSport}</div>
                    </div>
                )
            }
        }
    } catch (e) {}

    return (
        <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
            <h2 style={{ marginBottom: "24px" }}>Treeningud</h2>

            {lastSessionBanner}

            {totalVisible === 0 ? (
                <EmptyState message="Treeninguid ei leitud." />
            ) : (
                <>
                    <SessionGroup title="Aktiivne" sessions={activeSessions} defaultOpen={true} />
                    <SessionGroup title="Täna" sessions={todaySessions} defaultOpen={true} />
                    <SessionGroup title="Tulevased" sessions={upcomingSessions} defaultOpen={true} />
                    <SessionGroup title="Möödunud" sessions={pastSessions} defaultOpen={false} />
                </>
            )}
        </div>
    )
}
