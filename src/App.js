import React, { useState } from 'react';
import { set, ref } from "firebase/database";
import logo from './Logo.png';
import parentPasswordsData from './parent_passwords.json';
import playerPasswordsData from './player_passwords.json';
function estonianDate(dateStr) {
  // dateStr is "YYYY-MM-DD"
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
}

function App() {
  // --- State hooks for variables referenced but not defined ---
  const [selectedPlayer, setSelectedPlayer] = React.useState(null);
  const [playerPasswords, setPlayerPasswords] = React.useState(
  Array.isArray(playerPasswordsData) ? playerPasswordsData : Object.values(playerPasswordsData)
);
  const [playerGroups, setPlayerGroups] = React.useState({});
  const [attendance, setAttendance] = React.useState({});
  const [fussGroups, setFussGroups] = React.useState({});
  const [fussAttendance, setFussAttendance] = React.useState({});
  const [dates, setDates] = React.useState([]);
  const [adminMode, setAdminMode] = React.useState(false);
  const [coachMode, setCoachMode] = React.useState(false);
  const [feedbackData, setFeedbackData] = React.useState({});
  const [ref, setRef] = React.useState(null);
  const [db, setDb] = React.useState(null);
  const [coachFeedbackData, setCoachFeedbackData] = React.useState({});
  const [getNextFiveWeekdays, setGetNextFiveWeekdays] = React.useState(() => []);
  const [groupCourtCount, setGroupCourtCount] = React.useState(0);
  const [oldPw, setOldPw] = React.useState('');
  const [newPw1, setNewPw1] = React.useState('');
  const [newPw2, setNewPw2] = React.useState('');
  const [pwMessage, setPwMessage] = React.useState('');
  const [loginName, setLoginName] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [step, setStep] = React.useState("login");
  const [coachLoginPassword, setCoachLoginPassword] = React.useState('');
  const [coachLoginError, setCoachLoginError] = React.useState('');
  const [parentPlayer, setParentPlayer] = React.useState(null);
  const [parentPasswords, setParentPasswords] = React.useState([]);
  const [parentLoginCode, setParentLoginCode] = React.useState('');
  const [parentError, setParentError] = React.useState('');
  const [showFeedbackModal, setShowFeedbackModal] = React.useState(false);
  const [feedbackQueue, setFeedbackQueue] = React.useState([]);
  const [currentFeedbackIdx, setCurrentFeedbackIdx] = React.useState(0);
  const [groupAssignMode, setGroupAssignMode] = React.useState(false);
  // Utility function for Estonian date formatting
  function estonianDate(dateStr) {
    // Very basic dd.mm.yyyy output, adjust for weekday if needed
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    return `${day}.${month}.${year}`;
  }
  const [showGroupChangedWarning, setShowGroupChangedWarning] = React.useState(false);
  const [showPasswordForm, setShowPasswordForm] = React.useState(false);
  const [showOldParent, setShowOldParent] = React.useState(false);
  const [showCoachFeedbackModal, setShowCoachFeedbackModal] = React.useState(false);
  const [coachFeedbackSession, setCoachFeedbackSession] = React.useState(null);
  const [tableWrapperRef, setTableWrapperRef] = React.useState(null);
  const [activeView, setActiveView] = React.useState('');
  const [showGroupPrompt, setShowGroupPrompt] = React.useState(false);
  const [showAddPlayer, setShowAddPlayer] = React.useState(false);
  const [addPlayerError, setAddPlayerError] = React.useState('');
  // Ensure parentPasswords state
  const [newPlayerFirst, setNewPlayerFirst] = React.useState('');
  const [newPlayerLast, setNewPlayerLast] = React.useState('');
  const [newPlayerPw, setNewPlayerPw] = React.useState('');
  const [newParentPw, setNewParentPw] = React.useState('');
  const [newTennisGroup, setNewTennisGroup] = React.useState('');
  const [newFussGroup, setNewFussGroup] = React.useState('');
  const [downloadExcel, setDownloadExcel] = React.useState(() => {});
  const [COACH_FEEDBACK_EMOJI, setCOACH_FEEDBACK_EMOJI] = React.useState([]);

  // Helper: Estonian date format
  function estonianDate(dateStr) {
    // dateStr is "YYYY-MM-DD"
    const [year, month, day] = dateStr.split('-');
    return `${day}.${month}.${year}`;
  }
  // --- handleLogin function ---
  function handleLogin(e) {
    e.preventDefault();
    setSelectedPlayer(null);
    setAdminMode(false);
    setCoachMode(false);

    // Prepare the list, supports both array and object input
    const pwList = Array.isArray(playerPasswords) ? playerPasswords : Object.values(playerPasswords);

    // Handle admin login
    if (loginName === "admin" && loginPassword === "TallinkAdmin") {
      setAdminMode(true);
      setStep("admin");
      setLoginName("");
      setLoginPassword("");
      return;
    }

    // Handle player login
    const user = pwList.find(
      (p) => p.name === loginName && p.password === loginPassword
    );
    if (user) {
      setSelectedPlayer(user.name);
      setStep("player");
      setLoginName("");
      setLoginPassword("");
      return;
    }

    // If login fails
    setLoginPassword("");
    alert("Vale nimi või parool!");
  }

  // --- renderTable function ---
  function renderTable(forPlayer, isFuss) {
  const rows =
    forPlayer && selectedPlayer
      ? [playerPasswords.find((p) => p.name === selectedPlayer)]
      : playerPasswords;
  const groups = isFuss ? fussGroups : playerGroups;
  const data = isFuss ? fussAttendance : attendance;

  // Filter dates for player view: all past, today, and next 5 days
  let useDates = dates;
  if (forPlayer) {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayIdx = dates.findIndex(dd => dd.date >= todayStr);
    useDates = dates.slice(0, todayIdx + 6); // all past, today, and next 5 days
  }

  // --- Grouped rows logic for admin view ---
  let groupedRows = rows;
  if (!forPlayer) {
    // Group by group number (or A/B for füss)
    const g1 = (Array.isArray(rows) ? rows : Object.values(rows)).filter(({ name }) => groups[name] === (isFuss ? "A" : "1"));
    const g2 = (Array.isArray(rows) ? rows : Object.values(rows)).filter(({ name }) => groups[name] === (isFuss ? "B" : "2"));
    groupedRows = [];
    if (g1.length) {
      groupedRows.push({ label: true, group: isFuss ? "A" : "1" });
      groupedRows.push(...g1);
    }
    if (g2.length) {
      groupedRows.push({ label: true, group: isFuss ? "B" : "2" });
      groupedRows.push(...g2);
    }
  }

  // Coach feedback emoji scale for tennis
  const coachFeedbackEmoji = {
    1: { icon: "😞", label: "Proovi järgmine kord rohkem pingutada!" },
    2: { icon: "😕", label: "Veidi alla oma võimete" },
    3: { icon: "😐", label: "Hea pingutus" },
    4: { icon: "🙂", label: "Väga hea töö!" },
    5: { icon: "💪", label: "Suurepärane, tubli pingutus!" }
  };

  // Helper for feedback eligibility
  function isFeedbackEligible(dateStr) {
    // Allow feedback for yesterday or today after session end (after 15:00)
    const today = new Date();
    const target = new Date(dateStr);
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffDays = (today - target) / (1000 * 60 * 60 * 24);
    if (diffDays === 1) return true; // yesterday
    if (diffDays === 0 && new Date().getHours() > 15) return true; // today after session
    return false;
  }
  // --- Tennis attendance feedback deletion confirmation (admin only, not coach) ---
  // Helper for admin tennis attendance change (to "Ei")
  async function handleAdminTennisAttendanceChange(name, date) {
    // Only for adminMode, not coachMode, and only for tennis (isFuss === false)
    if (adminMode && !coachMode) {
      const prevVal = attendance[name][date];
      const newVal = prevVal === "Jah" ? "Ei" : "Jah";
      // If changing from "Jah" to "Ei", prompt for feedback deletion
      if (prevVal === "Jah" && newVal === "Ei" && feedbackData[name] && feedbackData[name][date]) {
        // Show confirmation dialog
        const confirm = window.confirm("Kas soovid kustutada ka mängija tagasiside sellele trennile?");
        if (confirm) {
          // Remove feedback for this player/date in Firebase
          const updates = { ...(feedbackData[name] || {}) };
          delete updates[date];
          await set(ref(db, "feedback/" + name), updates);
        }
      }
      // Toggle attendance
      setAttendance((a) => ({
        ...a,
        [name]: {
          ...a[name],
          [date]: newVal
        }
      }));
    } else {
      // fallback (shouldn't happen)
      setAttendance((a) => ({
        ...a,
        [name]: {
          ...a[name],
          [date]: a[name][date] === "Jah" ? "Ei" : "Jah"
        }
      }));
    }
  }
  return (
    <table className="attendance-table">
      <thead>
        <tr>
          <th>Mängija</th>
          <th>Grupp</th>
          {useDates.map((d) => (
            <th key={d.date}>
              <span style={{ fontWeight: 400, fontSize: 13 }}>{d.weekday}</span>
              <br />
              <span style={{ fontWeight: 600, fontSize: 14 }}>{estonianDate(d.date)}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {groupedRows.map((row, idx) => {
          if (row.label) {
            return (
              <tr key={"label-" + row.group}>
                <td colSpan={2 + useDates.length} style={{
                  background: "#e7f3ff",
                  fontWeight: "bold",
                  textAlign: "center"
                }}>
                  Grupp {row.group}
                </td>
              </tr>
            );
          }
          const { name } = row;
          return (
            <tr key={name}>
              <td>
                {(() => {
                  const parts = name.split(" ");
                  if (parts.length === 1) return parts[0];
                  const last = parts[parts.length - 1];
                  return parts[0] + " " + last.charAt(0) + ".";
                })()}
              </td>
              <td>{groups[name]}</td>
              {useDates.map((d) => (
                <td key={d.date}>
                  {isFuss
                    ? (adminMode || coachMode) && !forPlayer
                      ? (
                        <select
                          value={data[name][d.date] || "Ei käinud"}
                          onChange={e => {
                            setFussAttendance(a => ({
                              ...a,
                              [name]: { ...a[name], [d.date]: e.target.value }
                            }));
                          }}
                          style={{
                            background:
                              !data[name][d.date] || data[name][d.date] === "Ei käinud" || Number(data[name][d.date]) <= 4
                                ? "#ffb1b1"
                                : Number(data[name][d.date]) >= 8
                                  ? "#8fff8f"
                                  : "#ffe066"
                          }}
                        >
                          <option value="Ei käinud">Ei käinud</option>
                          {[...Array(10).keys()].map(i =>
                            <option key={i + 1} value={i + 1}>{i + 1}</option>
                          )}
                        </select>
                      )
                      : (
                        <span
                          style={{
                            display: "inline-block",
                            minWidth: 48,
                            padding: "4px 0",
                            borderRadius: "12px",
                            background:
                              !data[name][d.date] || data[name][d.date] === "Ei käinud" || Number(data[name][d.date]) <= 4
                                ? "#ffb1b1"
                                : Number(data[name][d.date]) >= 8
                                  ? "#8fff8f"
                                  : "#ffe066"
                          }}
                        >
                          {data[name][d.date] || "Ei käinud"}
                        </span>
                      )
                    : (
                        // Tennis attendance cell logic
                        (forPlayer && new Date(d.date) < new Date(new Date().toISOString().slice(0, 10)))
                          ? (
                              // Show coach feedback emoji if available for past dates
                              (() => {
                                if (attendance[name][d.date] === "Jah") {
                                  // Find group for this player
                                  const grp = playerGroups[name];
                                  // Try to get feedback value for this player from coachFeedbackData
                                  let val = 3;
                                  if (
                                    typeof coachFeedbackData?.[d.date]?.[grp]?.[name] !== "undefined"
                                  ) {
                                    val = coachFeedbackData[d.date][grp][name];
                                  }
                                  // Default to 3 if not found
                                  const emoji = coachFeedbackEmoji[val] || coachFeedbackEmoji[3];
                                  return (
                                    <span title={emoji.label} style={{ fontSize: "1.4em", display: "inline-block" }}>
                                      {emoji.icon}
                                    </span>
                                  );
                                } else {
                                  return "Ei";
                                }
                              })()
                            )
                          : ((forPlayer || adminMode || coachMode)
                              ? (
                                <button
                                  style={{
                                    minWidth: 48,
                                    background:
                                      data[name][d.date] === "Jah"
                                        ? "#8fff8f"
                                        : "#ffb1b1",
                                    border: "1px solid #ccc",
                                    borderRadius: "12px",
                                    cursor: "pointer",
                                    fontWeight: "bold"
                                  }}
                                  onClick={() => {
                                    // --- Begin feedback modal trigger logic ---
                                    // Only for player view, tennis, and current user
                                    if (forPlayer && name === selectedPlayer) {
                                      const prevVal = attendance[name][d.date];
                                      const newVal = prevVal === "Jah" ? "Ei" : "Jah";
                                      setAttendance((a) => ({
                                        ...a,
                                        [name]: {
                                          ...a[name],
                                          [d.date]: newVal
                                        }
                                      }));
                                      // Only trigger feedback if marking as "Jah" for eligible session
                                      if (
                                        newVal === "Jah" &&
                                        isFeedbackEligible(d.date)
                                      ) {
                                        // Check if feedback already given for this session
                                        if (
                                          !feedbackData[selectedPlayer] ||
                                          !feedbackData[selectedPlayer][d.date]
                                        ) {
                                          // Add to feedbackQueue and show modal immediately
                                          setFeedbackQueue((oldQ) => {
                                            // Avoid duplicates
                                            const exists = oldQ.some(q => q.date === d.date);
                                            if (!exists) {
                                              return [{ date: d.date, weekday: d.weekday }];
                                            }
                                            return oldQ;
                                          });
                                          setCurrentFeedbackIdx(0);
                                          setShowFeedbackModal(true);
                                        }
                                      }
                                      // If marking as "Ei", do nothing
                                    } else if (adminMode && !coachMode) {
                                      // Tennis attendance, admin view
                                      handleAdminTennisAttendanceChange(name, d.date);
                                    } else {
                                      // For coach or fallback, just toggle attendance
                                      setAttendance((a) => ({
                                        ...a,
                                        [name]: {
                                          ...a[name],
                                          [d.date]: a[name][d.date] === "Jah" ? "Ei" : "Jah"
                                        }
                                      }));
                                    }
                                  }}
                                >
                                  {attendance[name][d.date] === "Jah" ? "Jah" : "Ei"}
                                </button>
                              )
                              : (attendance[name][d.date] || ""))
                      )
                  }
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

  // --- Admin/Coach group/court summary ---
  function renderAdminSummary(isFuss) {
    const next5 = getNextFiveWeekdays(dates);
    const groups = isFuss ? fussGroups : playerGroups;
    const data = isFuss ? fussAttendance : attendance;
    const groupKeys = isFuss ? ["A", "B"] : ["1", "2"];
    const byGroup = {};
    groupKeys.forEach(grp => byGroup[grp] = {});

    next5.forEach((d) => {
      groupKeys.forEach((grp) => {
        const groupPlayers = playerPasswords
          .map((p) => p.name)
          .filter((n) => groups[n] === grp);
        const attending = groupPlayers.filter(
          (n) =>
            isFuss
              ? data[n][d.date] && data[n][d.date] !== "Ei käinud"
              : data[n][d.date] === "Jah"
        );
        byGroup[grp][d.date] = {
          count: attending.length,
          courts: groupCourtCount(attending.length)
        };
      });
    });

    return (
      <div style={{ margin: "24px 0" }}>
        <h3>Järgmise 5 päeva kokkuvõte (grupi kaupa)</h3>
        {groupKeys.map((grp) => (
          <div key={grp} style={{ marginBottom: 16 }}>
            <b>Grupp {grp}</b>
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Kuupäev</th>
                  <th>Osalejaid</th>
                  {!isFuss && <th>Väljakuid vaja</th>}
                </tr>
              </thead>
              <tbody>
                {next5.map((d) => (
                  <tr key={d.date}>
                    <td>
                      {d.weekday} <b>{estonianDate(d.date)}</b>
                    </td>
                    <td>{byGroup[grp][d.date].count}</td>
                    {!isFuss && <td>{byGroup[grp][d.date].courts}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    );
  }

  // --- Password change handler ---
  function handleChangePassword(e) {
    e.preventDefault();
    setPwMessage("");
    // Find this player in playerPasswords
    const current = playerPasswords.find(p => p.name === selectedPlayer);
    if (!current) {
      setPwMessage("Tundmatu kasutaja.");
      return;
    }
    if (oldPw !== current.password) {
      setPwMessage("Vana parool on vale.");
      return;
    }
    if (newPw1.length < 6) {
      setPwMessage("Uus parool peab olema vähemalt 6 tähemärki.");
      return;
    }
    if (newPw1 !== newPw2) {
      setPwMessage("Uued paroolid ei kattu.");
      return;
    }
    // Write new password to Firebase
    const newPwList = (Array.isArray(playerPasswords) ? playerPasswords : Object.values(playerPasswords)).map(p =>
      p.name === selectedPlayer ? { ...p, password: newPw1 } : p
    );
    set(ref(db, "playerPasswords"), newPwList);
    setPwMessage("Parool muudetud!");
    setShowPasswordForm(false);
    setOldPw(""); setNewPw1(""); setNewPw2("");
  }

  // --- Feedback submit/skip handlers ---
  function handleFeedbackSubmit(valObj) {
    const fbSession = feedbackQueue[currentFeedbackIdx];
    if (!fbSession) return;
    const updates = { ...(feedbackData[selectedPlayer] || {}) };
    updates[fbSession.date] = valObj;
    set(ref(db, "feedback/" + selectedPlayer), updates);
    nextFeedback();
  }
  function handleFeedbackSkip() {
    nextFeedback();
  }
  function nextFeedback() {
    if (currentFeedbackIdx + 1 < feedbackQueue.length) {
      setCurrentFeedbackIdx(i => i + 1);
    } else {
      setShowFeedbackModal(false);
    }
  }

  // --- Main UI ---
  return (
    <div className="container">
      <img src={logo} alt="Logo" style={{ width: 100, margin: 24 }} />
      <h1>Tallink Tennis Treeningute Märkimine</h1>

      {step === "login" && (
        <form
          onSubmit={handleLogin}
          className="login-form"
          style={{ maxWidth: 350, margin: "0 auto" }}
        >
          <label>
            Nimi:
            <select
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              required
            >
              <option value="">- vali nimi -</option>
              <option value="admin">Admin</option>
              {(Array.isArray(playerPasswords) ? playerPasswords : Object.values(playerPasswords)).map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Parool:
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit">Logi sisse</button>
        </form>
      )}

      {step === "login" && (
        <div style={{ marginTop: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <button
            style={{ background: "#f6faff", border: "1px solid #bce", padding: "8px 18px", borderRadius: 8, fontWeight: 600, fontSize: 16 }}
            onClick={() => setStep("parentLogin")}
          >
            Lapsevanemale
          </button>
          <button
            style={{ background: "#eafcf2", border: "1px solid #bce", padding: "8px 18px", borderRadius: 8, fontWeight: 600, fontSize: 16 }}
            onClick={() => { setStep("coachLogin"); setCoachLoginPassword(""); setCoachLoginError(""); }}
          >
            Treenerile
          </button>
        </div>
      )}

      {step === "coachLogin" && (
        <form
          onSubmit={e => {
            e.preventDefault();
            setCoachLoginError("");
            if (coachLoginPassword === "TallinkTreener") {
              setCoachMode(true);
              setStep("coach");
              setCoachLoginPassword("");
              setCoachLoginError("");
            } else {
              setCoachLoginError("Vale treeneri parool!");
            }
          }}
          className="login-form"
          style={{ maxWidth: 350, margin: "0 auto" }}
        >
          <h2>Treeneri sisselogimine</h2>
          <label>
            Parool:
            <input
              type="password"
              value={coachLoginPassword}
              onChange={e => setCoachLoginPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit">Logi sisse</button>
          <button type="button" style={{marginLeft: 10}} onClick={() => { setStep("login"); setCoachLoginPassword(""); setCoachLoginError(""); }}>Tagasi</button>
          {coachLoginError && <div style={{color: "#d00", marginTop: 8}}>{coachLoginError}</div>}
        </form>
      )}

      {step === "parentLogin" && (
        <form
          onSubmit={e => {
            e.preventDefault();
            setParentError("");
            if (!parentPlayer) { setParentError("Vali laps!"); return; }
            const pwRow = parentPasswords.find(p => p.name === parentPlayer);
            if (!pwRow || pwRow.parent !== parentLoginCode) {
              setParentError("Vale vanema kood!");
              return;
            }
            setStep("parent");
          }}
          className="login-form"
          style={{ maxWidth: 350, margin: "0 auto" }}
        >
          <h2>Lapsevanema sisselogimine</h2>
          <label>
            Lapse nimi:
            <select value={parentPlayer} onChange={e => setParentPlayer(e.target.value)} required>
              <option value="">- vali laps -</option>
              {(Array.isArray(playerPasswords) ? playerPasswords : Object.values(playerPasswords)).map((p) => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </label>
          <label>
            Vanema kood:
            <input
              type="password"
              value={parentLoginCode}
              onChange={e => setParentLoginCode(e.target.value)}
              required
            />
          </label>
          <button type="submit">Logi sisse</button>
          <button type="button" style={{marginLeft: 10}} onClick={() => setStep("login")}>Tagasi</button>
          {parentError && <div style={{color: "#d00", marginTop: 8}}>{parentError}</div>}
        </form>
      )}

      {step === "player" && selectedPlayer && (
        <div>
          {/* Feedback modal */}
          {showFeedbackModal && feedbackQueue.length > 0 && (
            <FeedbackModal
              session={feedbackQueue[currentFeedbackIdx]}
              onSubmit={handleFeedbackSubmit}
              onSkip={handleFeedbackSkip}
            />
          )}
          {showGroupChangedWarning && (
            <div style={{background:"#fff8d0",color:"#b08000",padding:"8px 12px",borderRadius:8,marginBottom:12,fontWeight:600}}>
              Sinu grupp on muutunud! Kontrolli kindlasti uut tunniplaani.
            </div>
          )}
          <h2>Tere, {selectedPlayer}!</h2>
          <div>
            <b>Sinu tennise trennid:</b>
            <ul style={{ marginBottom: 8 }}>
              {(() => {
                const tGrp = playerGroups[selectedPlayer];
                if (tGrp === "1") {
                  return [
                    <li key="Mon">Esmaspäev 11:00 - 12:30</li>,
                    <li key="Tue1">Teisipäev 9:30 - 11:00</li>,
                    <li key="Tue2">Teisipäev 12:30 - 14:00</li>,
                    <li key="Wed">Kolmapäev 11:00 - 12:30</li>,
                    <li key="Thu1">Neljapäev 9:30 - 11:00</li>,
                    <li key="Thu2">Neljapäev 12:30 - 14:00</li>,
                    <li key="Fri">Reede 10:00 - 12:00</li>
                  ];
                } else if (tGrp === "2") {
                  return [
                    <li key="Mon1">Esmaspäev 9:30 - 11:00</li>,
                    <li key="Mon2">Esmaspäev 12:30 - 14:00</li>,
                    <li key="Tue">Teisipäev 11:00 - 12:30</li>,
                    <li key="Wed1">Kolmapäev 9:30 - 11:00</li>,
                    <li key="Wed2">Kolmapäev 12:30 - 14:00</li>,
                    <li key="Thu">Neljapäev 11:00 - 12:30</li>,
                    <li key="Fri">Reede 12:00 - 14:00</li>
                  ];
                }
                return <li>Grupp määramata</li>;
              })()}
            </ul>
          </div>
          <div>
            <b>Sinu füssi trennid:</b>
            <ul>
              {(() => {
                const tGrp = playerGroups[selectedPlayer];
                const fGrp = fussGroups[selectedPlayer];
                if (fGrp === "A") {
                  if (tGrp === "1") {
                    return [
                      <li key="A1a">Esmaspäev 12:30 - 13:30</li>,
                      <li key="A1b">Kolmapäev 10:00 - 11:00</li>
                    ];
                  } else if (tGrp === "2") {
                    return [
                      <li key="A2a">Teisipäev 12:30 - 13:30</li>,
                      <li key="A2b">Neljapäev 10:00 - 11:00</li>
                    ];
                  }
                } else if (fGrp === "B") {
                  if (tGrp === "1") {
                    return [
                      <li key="B1a">Esmaspäev 10:00 - 11:00</li>,
                      <li key="B1b">Kolmapäev 12:30 - 13:30</li>
                    ];
                  } else if (tGrp === "2") {
                    return [
                      <li key="B2a">Teisipäev 10:00 - 11:00</li>,
                      <li key="B2b">Neljapäev 12:30 - 13:30</li>
                    ];
                  }
                }
                return <li>Grupp määramata</li>;
              })()}
            </ul>
          </div>
          {/* Password change form/button */}
          {showPasswordForm ? (
            <form onSubmit={handleChangePassword} style={{ margin: "16px 0" }}>
              <div>
                <input
                  type="password"
                  value={oldPw}
                  onChange={e => setOldPw(e.target.value)}
                  placeholder="Vana parool"
                  required
                />
              </div>
              <div>
                <input
                  type="password"
                  value={newPw1}
                  onChange={e => setNewPw1(e.target.value)}
                  placeholder="Uus parool"
                  required
                />
              </div>
              <div>
                <input
                  type="password"
                  value={newPw2}
                  onChange={e => setNewPw2(e.target.value)}
                  placeholder="Uus parool uuesti"
                  required
                />
              </div>
              <button type="submit">Muuda parool</button>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(false);
                  setOldPw(""); setNewPw1(""); setNewPw2("");
                }}
                style={{ marginLeft: 8 }}
              >
                Tühista
              </button>
              {pwMessage && <div style={{ marginTop: 8, color: "#d00" }}>{pwMessage}</div>}
            </form>
          ) : (
            <button onClick={() => setShowPasswordForm(true)} style={{ margin: "16px 0" }}>
              Muuda parooli
            </button>
          )}
          <div style={{ margin: "18px 0" }}>
            <div>
              <b>Tennis:</b>
              {/* Coach feedback legend for player view */}
              <div style={{ margin: "10px 0 14px 0", background: "#f6faff", border: "1px solid #e0e7ef", borderRadius: 8, padding: "8px 10px", fontSize: 15, maxWidth: 420 }}>
                <b>Treeneri tagasiside:</b>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
                  <span title="Proovi järgmine kord rohkem pingutada!"><span style={{ fontSize: "1.3em" }}>😞</span> <span style={{ fontSize: 13, color: "#666" }}>Proovi järgmine kord rohkem pingutada!</span></span>
                  <span title="Veidi alla oma võimete"><span style={{ fontSize: "1.3em" }}>😕</span> <span style={{ fontSize: 13, color: "#666" }}>Veidi alla oma võimete</span></span>
                  <span title="Hea pingutus"><span style={{ fontSize: "1.3em" }}>😐</span> <span style={{ fontSize: 13, color: "#666" }}>Hea pingutus</span></span>
                  <span title="Väga hea töö!"><span style={{ fontSize: "1.3em" }}>🙂</span> <span style={{ fontSize: 13, color: "#666" }}>Väga hea töö!</span></span>
                  <span title="Suurepärane, tubli pingutus!"><span style={{ fontSize: "1.3em" }}>💪</span> <span style={{ fontSize: 13, color: "#666" }}>Suurepärane, tubli pingutus!</span></span>
                </div>
              </div>
              {renderTable(true, false)}
            </div>
            <div style={{ marginTop: 32 }}>
              <b>Füss:</b>
              {renderTable(true, true)}
            </div>
          </div>
          <button
            onClick={() => {
              setStep("login");
              setLoginName("");
              setLoginPassword("");
              setSelectedPlayer("");
            }}
          >
            Logi välja
          </button>
        </div>
      )}

      {step === "parent" && parentPlayer && (
        <div>
          {showGroupChangedWarning && (
            <div style={{background:"#fff8d0",color:"#b08000",padding:"8px 12px",borderRadius:8,marginBottom:12,fontWeight:600}}>
              Sinu lapse grupp on muutunud! Kontrolli kindlasti uut tunniplaani.
            </div>
          )}
          <h2>Tere, lapsevanem!</h2>
          <div>
            <b>Laps:</b> {parentPlayer} <br/>
            <b>Tennise grupp:</b> {playerGroups[parentPlayer] || "-"} <br/>
            <b>Füssi grupp:</b> {fussGroups[parentPlayer] || "-"}
          </div>
          <div style={{ margin: "18px 0" }}>
            <b>Nädala tunniplaan:</b>
            <ul style={{ marginBottom: 8 }}>
              {(() => {
                const tGrp = playerGroups[parentPlayer];
                if (tGrp === "1") {
                  return [
                    <li key="Mon">Esmaspäev 11:00 - 12:30</li>,
                    <li key="Tue1">Teisipäev 9:30 - 11:00</li>,
                    <li key="Tue2">Teisipäev 12:30 - 14:00</li>,
                    <li key="Wed">Kolmapäev 11:00 - 12:30</li>,
                    <li key="Thu1">Neljapäev 9:30 - 11:00</li>,
                    <li key="Thu2">Neljapäev 12:30 - 14:00</li>,
                    <li key="Fri">Reede 10:00 - 12:00</li>
                  ];
                } else if (tGrp === "2") {
                  return [
                    <li key="Mon1">Esmaspäev 9:30 - 11:00</li>,
                    <li key="Mon2">Esmaspäev 12:30 - 14:00</li>,
                    <li key="Tue">Teisipäev 11:00 - 12:30</li>,
                    <li key="Wed1">Kolmapäev 9:30 - 11:00</li>,
                    <li key="Wed2">Kolmapäev 12:30 - 14:00</li>,
                    <li key="Thu">Neljapäev 11:00 - 12:30</li>,
                    <li key="Fri">Reede 12:00 - 14:00</li>
                  ];
                }
                return <li>Grupp määramata</li>;
              })()}
            </ul>
            <ul>
              <b>Füssi trennid:</b>
              {(() => {
                const tGrp = playerGroups[parentPlayer];
                const fGrp = fussGroups[parentPlayer];
                if (fGrp === "A") {
                  if (tGrp === "1") {
                    return [
                      <li key="A1a">Esmaspäev 12:30 - 13:30</li>,
                      <li key="A1b">Kolmapäev 10:00 - 11:00</li>
                    ];
                  } else if (tGrp === "2") {
                    return [
                      <li key="A2a">Teisipäev 12:30 - 13:30</li>,
                      <li key="A2b">Neljapäev 10:00 - 11:00</li>
                    ];
                  }
                } else if (fGrp === "B") {
                  if (tGrp === "1") {
                    return [
                      <li key="B1a">Esmaspäev 10:00 - 11:00</li>,
                      <li key="B1b">Kolmapäev 12:30 - 13:30</li>
                    ];
                  } else if (tGrp === "2") {
                    return [
                      <li key="B2a">Teisipäev 10:00 - 11:00</li>,
                      <li key="B2b">Neljapäev 12:30 - 13:30</li>
                    ];
                  }
                }
                return <li>Grupp määramata</li>;
              })()}
            </ul>
          </div>
          <div style={{ margin: "16px 0" }}>
            <b>Trendid ja kokkuvõte:</b>
            {/* Tennis */}
            <div>
              <b>Tennis:</b>
              {(() => {
  const thisPlayer = parentPlayer;
  function getWeekDates(weekOffset = 0) {
    const today = new Date();
    let monday = new Date(today);
    const day = today.getDay();
    monday.setDate(monday.getDate() - day + (day === 0 ? -6 : 1) - 7 * weekOffset);
    let sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return dates
      .filter(d => {
        const dd = new Date(d.date);
        return dd >= monday && dd <= sunday;
      })
      .map(d => d.date);
  }
  function getEffortAvgForWeek(weekOffset = 0) {
    const weekDates = getWeekDates(weekOffset);
    const grp = playerGroups[thisPlayer];
    let vals = [];
    for (const date of weekDates) {
      let val = 3; // default
      if (
        attendance[thisPlayer]?.[date] === "Jah" &&
        coachFeedbackData[date] && coachFeedbackData[date][grp] && typeof coachFeedbackData[date][grp][thisPlayer] !== "undefined"
      ) {
        val = coachFeedbackData[date][grp][thisPlayer];
      }
      vals.push(val);
    }
    if (vals.length === 0) vals = [3];
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  const runningWeekAvg = getEffortAvgForWeek(0);
  const prevWeek1Avg = getEffortAvgForWeek(1);
  const prevWeek2Avg = getEffortAvgForWeek(2);
  const previousAvg = (prevWeek1Avg + prevWeek2Avg) / 2;

  let warning = null;
  if (Math.abs(runningWeekAvg - previousAvg) > 1) {
    warning =
      runningWeekAvg > previousAvg
        ? <span style={{ color: "#0a0", marginLeft: 8 }}>🌟 Pingutus on oluliselt paranenud!</span>
        : <span style={{ color: "#d00", marginLeft: 8 }}>⚠️ Pingutus on langenud!</span>;
  }
  const roundedAvg = Math.round(runningWeekAvg);
  const emojiObj = COACH_FEEDBACK_EMOJI[roundedAvg] || COACH_FEEDBACK_EMOJI[3];
  let color = "#8fff8f";
  if (roundedAvg < 3) color = "#ffb1b1";
  else if (roundedAvg === 3) color = "#ffe066";
  else if (roundedAvg === 4) color = "#a3e6e3";
  else if (roundedAvg === 5) color = "#8fff8f";
  return (
    <div>
      Jooksev nädal:{" "}
      <span style={{ fontWeight: "bold", fontSize: 18, color }}>
        {emojiObj.icon} {emojiObj.label}
      </span>
      {warning}
    </div>
  );
})()}
            </div>
            {/* Füss */}
            <div style={{ marginTop: 10 }}>
              <b>Füss:</b>
              {(() => {
  const thisPlayer = parentPlayer;
  function getWeekDates(weekOffset = 0) {
    const today = new Date();
    let monday = new Date(today);
    const day = today.getDay();
    monday.setDate(monday.getDate() - day + (day === 0 ? -6 : 1) - 7 * weekOffset);
    let sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return dates
      .filter(d => {
        const dd = new Date(d.date);
        return dd >= monday && dd <= sunday;
      })
      .map(d => d.date);
  }
  function getEffortAvgForWeek(weekOffset = 0) {
    const weekDates = getWeekDates(weekOffset);
    let vals = [];
    for (const date of weekDates) {
      let val = 5; // default
      if (
        fussAttendance[thisPlayer]?.[date] &&
        fussAttendance[thisPlayer][date] !== "Ei käinud" &&
        !isNaN(fussAttendance[thisPlayer][date])
      ) {
        val = Number(fussAttendance[thisPlayer][date]);
      }
      vals.push(val);
    }
    if (vals.length === 0) vals = [5];
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  const runningWeekAvg = getEffortAvgForWeek(0);
  const prevWeek1Avg = getEffortAvgForWeek(1);
  const prevWeek2Avg = getEffortAvgForWeek(2);
  const previousAvg = (prevWeek1Avg + prevWeek2Avg) / 2;

  let warning = null;
  if (Math.abs(runningWeekAvg - previousAvg) > 1) {
    warning =
      runningWeekAvg > previousAvg
        ? <span style={{ color: "#0a0", marginLeft: 8 }}>🌟 Pingutus on oluliselt paranenud!</span>
        : <span style={{ color: "#d00", marginLeft: 8 }}>⚠️ Pingutus on langenud!</span>;
  }
  let color = "#8fff8f";
  if (runningWeekAvg < 5) color = "#ffb1b1";
  else if (runningWeekAvg < 7) color = "#ffe066";
  else if (runningWeekAvg >= 8) color = "#8fff8f";
  return (
    <div>
      Jooksev nädal: <span style={{ fontWeight: "bold", fontSize: 18, color }}>{Math.round(runningWeekAvg)} / 10</span>
      {warning}
    </div>
  );
})()}
            </div>
          </div>
          <div style={{ margin: "16px 0" }}>
            <b>Osalemine ja treeneri tagasiside:</b>
            {/* Legend */}
            <div style={{ fontSize: 13, margin: "8px 0 5px 0", color: "#444" }}>
              <span style={{ marginRight: 16 }}>
                <b>Tennis tagasiside:</b> <span style={{ background: "#ffb1b1", borderRadius: 4, padding: "1px 4px" }}>😞 Väike</span> <span style={{ background: "#ffe066", borderRadius: 4, padding: "1px 4px" }}>😕 Keskmisest väiksem</span> <span style={{ background: "#e8e8e8", borderRadius: 4, padding: "1px 4px" }}>😐 Keskmine</span> <span style={{ background: "#a3e6e3", borderRadius: 4, padding: "1px 4px" }}>🙂 Suurem</span> <span style={{ background: "#8fff8f", borderRadius: 4, padding: "1px 4px" }}>💪 Väga suur</span>
              </span>
              <span>
                <b>Füss:</b> <span style={{ background: "#ffb1b1", borderRadius: 4, padding: "1px 4px" }}>1-4 madal</span> <span style={{ background: "#ffe066", borderRadius: 4, padding: "1px 4px" }}>5-7 keskmine</span> <span style={{ background: "#8fff8f", borderRadius: 4, padding: "1px 4px" }}>8-10 kõrge</span>
              </span>
            </div>
            {(() => {
              // --- Parent attendance/feedback table with show/hide earlier days logic ---
              // Get all past dates (date < today)
              const allPastDates = dates.filter(d => new Date(d.date) < new Date());
              // Sort ascending by date (oldest first)
              allPastDates.sort((a, b) => a.date.localeCompare(b.date));
              const recentDates = allPastDates.slice(-5);
              const olderDates = allPastDates.slice(0, -5);
              // Helper to render a row for a date
              function renderRow(d) {
                // Tennis
                const tennisAtt = attendance[parentPlayer] && attendance[parentPlayer][d.date] === "Jah";
                let tFeedbackVal = 3;
                for (const grp in coachFeedbackData[d.date] || {}) {
                  if (coachFeedbackData[d.date][grp][parentPlayer]) {
                    tFeedbackVal = coachFeedbackData[d.date][grp][parentPlayer];
                  }
                }
                const tEmoji = {1:"😞",2:"😕",3:"😐",4:"🙂",5:"💪"}[tFeedbackVal] || "😐";
                let tBg = "#e8e8e8";
                if (tFeedbackVal === 1) tBg = "#ffb1b1";
                else if (tFeedbackVal === 2) tBg = "#ffe066";
                else if (tFeedbackVal === 4) tBg = "#a3e6e3";
                else if (tFeedbackVal === 5) tBg = "#8fff8f";
                // Fuss
                const fussAtt = fussAttendance[parentPlayer] && fussAttendance[parentPlayer][d.date] && fussAttendance[parentPlayer][d.date] !== "Ei käinud";
                const fussVal = fussAtt ? Number(fussAttendance[parentPlayer][d.date]) : null;
                let fussBg = "";
                if (fussVal !== null) {
                  if (fussVal <= 4) fussBg = "#ffb1b1";
                  else if (fussVal <= 7) fussBg = "#ffe066";
                  else fussBg = "#8fff8f";
                }
                return (
                  <tr key={d.date}>
                    <td>{estonianDate(d.date)}</td>
                    <td>{tennisAtt ? "Jah" : "Ei käinud"}</td>
                    <td style={{ background: tennisAtt ? tBg : "transparent", textAlign: "center" }}>
                      {tennisAtt ? tEmoji : "-"}
                    </td>
                    <td>{fussAtt ? "Jah" : "Ei käinud"}</td>
                    <td style={{ background: fussAtt ? fussBg : "transparent", textAlign: "center" }}>
                      {fussAtt ? fussVal : "-"}
                    </td>
                  </tr>
                );
              }
              return (
                <>
                  <table className="attendance-table">
                    <thead>
                      <tr>
                        <th>Kuupäev</th>
                        <th>Tennis</th>
                        <th>Tagasiside (Tennis)</th>
                        <th>Füss</th>
                        <th>Tagasiside (Füss)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentDates.map(renderRow)}
                      {showOldParent && olderDates.map(renderRow)}
                    </tbody>
                  </table>
                  {olderDates.length > 0 && (
                    <button
                      style={{ marginTop: 7, marginBottom: 12 }}
                      onClick={() => setShowOldParent(v => !v)}
                    >
                      {showOldParent ? "Peida varasemad päevad" : "Näita varasemaid päevi"}
                    </button>
                  )}
                </>
              );
            })()}
          </div>
          <div style={{ margin: "16px 0" }}>
            <b>Mängija enda tagasiside:</b>
            {/* Legend for Q2 and Q3 feedback emojis */}
            <div style={{ fontSize: 14, margin: "10px 0 7px 0", color: "#444", background: "#f6faff", border: "1px solid #e0e7ef", borderRadius: 8, padding: "8px 10px", maxWidth: 520 }}>
              <div style={{ marginBottom: 4 }}>
                <b>Q2: Kas tundsid täna treeneri toetusest puudust?</b>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 2 }}>
                  <span><span style={{ fontSize: "1.2em" }}>😁</span> <span style={{ fontSize: 13, color: "#666" }}>Ei tundnud üldse puudust</span></span>
                  <span><span style={{ fontSize: "1.2em" }}>🙂</span> <span style={{ fontSize: 13, color: "#666" }}>Vähe puudust</span></span>
                  <span><span style={{ fontSize: "1.2em" }}>🤔</span> <span style={{ fontSize: 13, color: "#666" }}>Natuke puudust</span></span>
                  <span><span style={{ fontSize: "1.2em" }}>😕</span> <span style={{ fontSize: 13, color: "#666" }}>Palju puudust</span></span>
                  <span><span style={{ fontSize: "1.2em" }}>😞</span> <span style={{ fontSize: 13, color: "#666" }}>Väga palju puudust</span></span>
                </div>
              </div>
              <div>
                <b>Q3: Kui selge oli tänase treeningu eesmärk sinu jaoks?</b>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 2 }}>
                  <span><span style={{ fontSize: "1.2em" }}>😕</span> <span style={{ fontSize: 13, color: "#666" }}>Üldse ei olnud selge</span></span>
                  <span><span style={{ fontSize: "1.2em" }}>🤔</span> <span style={{ fontSize: 13, color: "#666" }}>Pigem segane</span></span>
                  <span><span style={{ fontSize: "1.2em" }}>😐</span> <span style={{ fontSize: 13, color: "#666" }}>Keskmiselt selge</span></span>
                  <span><span style={{ fontSize: "1.2em" }}>🙂</span> <span style={{ fontSize: 13, color: "#666" }}>Pigem selge</span></span>
                  <span><span style={{ fontSize: "1.2em" }}>💡</span> <span style={{ fontSize: 13, color: "#666" }}>Täiesti selge</span></span>
                </div>
              </div>
            </div>
            <table className="attendance-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 90, whiteSpace: "normal" }}>Kuupäev</th>
                  <th style={{ minWidth: 110, whiteSpace: "normal" }}>Raskusaste</th>
                  <th style={{ minWidth: 130, whiteSpace: "normal" }}>Treeneri toetus</th>
                  <th style={{ minWidth: 120, whiteSpace: "normal" }}>Selgus</th>
                </tr>
              </thead>
              <tbody>
                {dates.map(d => (
                  feedbackData[parentPlayer] && feedbackData[parentPlayer][d.date] ?
                  <tr key={d.date}>
                    <td>{estonianDate(d.date)}</td>
                    <td>{feedbackData[parentPlayer][d.date].intensity} / 10</td>
                    <td>{FEEDBACK_EMOJI_Q2[feedbackData[parentPlayer][d.date].support]}</td>
                    <td>{FEEDBACK_EMOJI_Q3[feedbackData[parentPlayer][d.date].clarity]}</td>
                  </tr> : null
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ margin: "24px 0" }}>
            <a href="https://tallinktennisekeskus.ee/tennisekool/" target="_blank" rel="noopener noreferrer">
              <button>Treeneri kontaktid</button>
            </a>
            <button onClick={() => { setStep("login"); setParentPlayer(""); setParentLoginCode(""); }}>
              Logi välja
            </button>
          </div>
        </div>
      )}

      {/* Coach view: same as admin, but without Excel export and without feedback summary */}
      {step === "coach" && coachMode && (
        <div>
          <h2>Treeneri vaade</h2>
          <div style={{ marginBottom: 18 }}>
            <button
              onClick={() => setActiveView("tennis")}
              style={{
                background: activeView === "tennis" ? "#a3e6e3" : "",
                fontWeight: activeView === "tennis" ? "bold" : "",
                marginRight: 8
              }}
            >
              Tennis
            </button>
            <button
              onClick={() => setActiveView("fuss")}
              style={{
                background: activeView === "fuss" ? "#ffe066" : "",
                fontWeight: activeView === "fuss" ? "bold" : ""
              }}
            >
              Füss
            </button>
          </div>
          {showGroupPrompt && (
            <div className="group-prompt" style={{ background: "#ffffcc", padding: 16, marginBottom: 24 }}>
              <b>On reede pärastlõuna!</b> Palun vaata üle grupid uueks nädalaks.
              <button style={{ marginLeft: 16 }} onClick={() => setGroupAssignMode(true)}>
                Muuda gruppe
              </button>
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <button onClick={() => setGroupAssignMode(true)}>Muuda gruppe</button>
            {/* No Excel export button in coach view */}
            <button
              onClick={() => {
                setStep("login");
                setCoachMode(false);
                setCoachLoginPassword("");
                setCoachLoginError("");
              }}
              style={{ marginLeft: 12 }}
            >
              Logi välja
            </button>
          </div>
          {/* Feedback summary section intentionally not rendered in coach view */}
          {/* Coach feedback section - only show for tennis view */}
          {activeView === "tennis" && (
            <div style={{marginTop: 30}}>
              <h2>Tagasiside treeningute kohta</h2>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: 12}}>
                {dates
                  .filter(d => {
                    // Limit to today and previous 3 days (calendar days, ignore time)
                    const today = new Date();
                    const dateObj = new Date(d.date);
                    today.setHours(0,0,0,0);
                    dateObj.setHours(0,0,0,0);
                    const diff = (today - dateObj) / (1000 * 60 * 60 * 24);
                    return diff >= 0 && diff <= 3;
                  })
                  .map(d => (
                    ["1","2"].map(grp => {
                      const groupPlayers = (Array.isArray(playerPasswords) ? playerPasswords : Object.values(playerPasswords)).map(p => p.name).filter(n => playerGroups[n] === grp);
                      const attended = groupPlayers.filter(n => attendance[n][d.date] === "Jah");
                      if (attended.length === 0) return null;
                      // Here you could add logic to check coach feedback
                      // Coach feedback color logic
                      const feedbackList = coachFeedbackData?.[d.date]?.[grp] || {};
                      const someFeedbackGiven = Object.values(feedbackList).some(v => v !== 3);
                      return (
                        <div
                          key={d.date + grp}
                          style={{
                            border: '1px solid #bbb',
                            borderRadius: 8,
                            padding: 12,
                            minWidth: 180,
                            background: '#fafaff',
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                          onClick={() => {
                            setCoachFeedbackSession({ date: d.date, group: grp, weekday: d.weekday });
                            setShowCoachFeedbackModal(true);
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: 15 }}>
                            {estonianDate(d.date)} ({d.weekday}) <span style={{ fontWeight: 400 }}>Grupp {grp}</span>
                            <span
                              style={{
                                display: 'inline-block',
                                width: 14,
                                height: 14,
                                borderRadius: '50%',
                                background: someFeedbackGiven ? '#d6fdd9' : '#ff6060',
                                marginLeft: 8,
                                verticalAlign: 'middle'
                              }}
                            ></span>
                          </div>
                          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                            {attended.length} mängijat osales
                          </div>
                        </div>
                      );
                    })
                  ))}
              </div>
              {showCoachFeedbackModal && coachFeedbackSession && (
                <CoachFeedbackModal
                  session={coachFeedbackSession}
                  onClose={() => setShowCoachFeedbackModal(false)}
                  coachFeedbackData={coachFeedbackData}
                  playerPasswords={playerPasswords}
                  attendance={attendance}
                  onSave={(newData) => {
                    set(ref(db, `coachFeedback/${coachFeedbackSession.date}/${coachFeedbackSession.group}`), newData);
                    setShowCoachFeedbackModal(false);
                  }}
                />
              )}
            </div>
          )}
          <div
            className="attendance-table-wrapper"
            style={{ overflowX: "auto", overflowY: "auto", maxHeight: "500px" }}
            ref={tableWrapperRef}
          >
            {renderTable(false, activeView === "fuss")}
          </div>
        </div>
      )}

      {step === "admin" && adminMode && (
        <div>
          <h2>Administraatori vaade</h2>
          <div style={{ marginBottom: 18 }}>
            <button
              onClick={() => setActiveView("tennis")}
              style={{
                background: activeView === "tennis" ? "#a3e6e3" : "",
                fontWeight: activeView === "tennis" ? "bold" : "",
                marginRight: 8
              }}
            >
              Tennis
            </button>
            <button
              onClick={() => setActiveView("fuss")}
              style={{
                background: activeView === "fuss" ? "#ffe066" : "",
                fontWeight: activeView === "fuss" ? "bold" : ""
              }}
            >
              Füss
            </button>
          </div>
          {showGroupPrompt && (
            <div className="group-prompt" style={{ background: "#ffffcc", padding: 16, marginBottom: 24 }}>
              <b>On reede pärastlõuna!</b> Palun vaata üle grupid uueks nädalaks.
              <button style={{ marginLeft: 16 }} onClick={() => setGroupAssignMode(true)}>
                Muuda gruppe
              </button>
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <button style={{ marginRight: 12 }} onClick={() => setShowAddPlayer(true)}>
              Lisa mängija
            </button>
            <button onClick={() => setGroupAssignMode(true)}>Muuda gruppe</button>
            <button
              onClick={() =>
                downloadExcel(
                  attendance,
                  playerGroups,
                  fussAttendance,
                  fussGroups,
                  dates
                )
              }
              style={{ marginLeft: 12 }}
            >
              Ekspordi Excelisse
            </button>
            <button
              onClick={() => {
                setStep("login");
                setAdminMode(false);
                setLoginName("");
                setLoginPassword("");
              }}
              style={{ marginLeft: 12 }}
            >
              Logi välja
            </button>
          </div>
      {/* Player feedback summary section (admin and coach tennis views, before attendance/court summary and attendance table) */}
      {(step === "admin" && adminMode || step === "coach" && coachMode) && activeView === "tennis" && (
        <FeedbackSummaryByGroup
          dates={dates}
          playerPasswords={playerPasswords}
          playerGroups={playerGroups}
          feedbackData={feedbackData}
          coachFeedbackData={coachFeedbackData}
        />
      )}
          {renderAdminSummary(activeView === "fuss")}
          {/* Coach feedback section - only show for tennis view */}
          {activeView === "tennis" && (
            <div style={{marginTop: 30}}>
              <h2>Tagasiside treeningute kohta</h2>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: 12}}>
                {dates
                  .filter(d => {
                    // Limit to today and previous 3 days (calendar days, ignore time)
                    const today = new Date();
                    const dateObj = new Date(d.date);
                    today.setHours(0,0,0,0);
                    dateObj.setHours(0,0,0,0);
                    const diff = (today - dateObj) / (1000 * 60 * 60 * 24);
                    return diff >= 0 && diff <= 3;
                  })
                  .map(d => (
                    ["1","2"].map(grp => {
                      const groupPlayers = (Array.isArray(playerPasswords) ? playerPasswords : Object.values(playerPasswords)).map(p => p.name).filter(n => playerGroups[n] === grp);
                      const attended = groupPlayers.filter(n => attendance[n][d.date] === "Jah");
                      if (attended.length === 0) return null;
                      // Here you could add logic to check coach feedback
                      // Coach feedback color logic
                      const feedbackList = coachFeedbackData?.[d.date]?.[grp] || {};
                      const someFeedbackGiven = Object.values(feedbackList).some(v => v !== 3);
                      return (
                        <div
                          key={d.date + grp}
                          style={{
                            border: '1px solid #bbb',
                            borderRadius: 8,
                            padding: 12,
                            minWidth: 180,
                            background: '#fafaff',
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                          onClick={() => {
                            setCoachFeedbackSession({ date: d.date, group: grp, weekday: d.weekday });
                            setShowCoachFeedbackModal(true);
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: 15 }}>
                            {estonianDate(d.date)} ({d.weekday}) <span style={{ fontWeight: 400 }}>Grupp {grp}</span>
                            <span
                              style={{
                                display: 'inline-block',
                                width: 14,
                                height: 14,
                                borderRadius: '50%',
                                background: someFeedbackGiven ? '#d6fdd9' : '#ff6060',
                                marginLeft: 8,
                                verticalAlign: 'middle'
                              }}
                            ></span>
                          </div>
                          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                            {attended.length} mängijat osales
                          </div>
                        </div>
                      );
                    })
                  ))}
              </div>
              {showCoachFeedbackModal && coachFeedbackSession && (
                <CoachFeedbackModal
                  session={coachFeedbackSession}
                  onClose={() => setShowCoachFeedbackModal(false)}
                  coachFeedbackData={coachFeedbackData}
                  playerPasswords={playerPasswords}
                  attendance={attendance}
                  onSave={(newData) => {
                    set(ref(db, `coachFeedback/${coachFeedbackSession.date}/${coachFeedbackSession.group}`), newData);
                    setShowCoachFeedbackModal(false);
                  }}
                />
              )}
            </div>
          )}
          <div
            className="attendance-table-wrapper"
            style={{ overflowX: "auto", overflowY: "auto", maxHeight: "500px" }}
            ref={tableWrapperRef}
          >
            {renderTable(false, activeView === "fuss")}
          </div>
        </div>
      )}
    {/* Add Player Modal (admin) */}
    {showAddPlayer && (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(30,40,50,0.4)",
          zIndex: 1001,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
        onClick={e => { if (e.target === e.currentTarget) setShowAddPlayer(false); }}
      >
        <div style={{ background: "#fff", padding: 32, borderRadius: 12, minWidth: 370, position: "relative" }}>
          <button
            onClick={() => setShowAddPlayer(false)}
            style={{
              position: "absolute", top: 12, right: 16, fontSize: 17, background: "#eee", border: "none", borderRadius: 6, padding: "3px 9px", cursor: "pointer"
            }}
          >
            Sulge
          </button>
          <h2>Lisa uus mängija</h2>
          <form
            onSubmit={e => {
              e.preventDefault();
              setAddPlayerError("");
              const name = (newPlayerFirst + " " + newPlayerLast).trim();
              if (!name || !newPlayerPw || !newParentPw) {
                setAddPlayerError("Kõik väljad on kohustuslikud.");
                return;
              }
              if (playerPasswords.some(p => p.name === name)) {
                setAddPlayerError("See nimi on juba olemas!");
                return;
              }
              // Update playerPasswords
              const updatedPw = [...playerPasswords, { name, password: newPlayerPw, parent: newParentPw }];
              set(ref(db, "playerPasswords"), updatedPw);
              // Add to attendance/fussAttendance for all dates
              let att = { ...attendance, [name]: {} };
              dates.forEach(d => { att[name][d.date] = ""; });
              set(ref(db, "attendance"), att);
              let fAtt = { ...fussAttendance, [name]: {} };
              dates.forEach(d => { fAtt[name][d.date] = ""; });
              set(ref(db, "fussAttendance"), fAtt);
              // Add to playerGroups/fussGroups
              set(ref(db, "playerGroups/" + name), newTennisGroup);
              set(ref(db, "fussGroups/" + name), newFussGroup);
              // Done
              setShowAddPlayer(false);
              setNewPlayerFirst(""); setNewPlayerLast("");
              setNewPlayerPw(""); setNewParentPw("");
              setNewTennisGroup("1"); setNewFussGroup("A");
            }}
          >
            <div style={{ marginBottom: 10 }}>
              <label>Eesnimi:<br/>
                <input value={newPlayerFirst} onChange={e => setNewPlayerFirst(e.target.value)} style={{ width: "98%" }} required />
              </label>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label>Perekonnanimi:<br/>
                <input value={newPlayerLast} onChange={e => setNewPlayerLast(e.target.value)} style={{ width: "98%" }} required />
              </label>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label>Mängija parool:<br/>
                <input value={newPlayerPw} type="password" onChange={e => setNewPlayerPw(e.target.value)} style={{ width: "98%" }} required />
              </label>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label>Vanema kood:<br/>
                <input value={newParentPw} type="password" onChange={e => setNewParentPw(e.target.value)} style={{ width: "98%" }} required />
              </label>
            </div>
            <div style={{ marginBottom: 10 }}>
              <label>Tennise grupp:
                <select value={newTennisGroup} onChange={e => setNewTennisGroup(e.target.value)} style={{ marginLeft: 6 }}>
                  <option value="1">1</option>
                  <option value="2">2</option>
                </select>
              </label>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label>Füssi grupp:
                <select value={newFussGroup} onChange={e => setNewFussGroup(e.target.value)} style={{ marginLeft: 6 }}>
                  <option value="A">A</option>
                  <option value="B">B</option>
                </select>
              </label>
            </div>
            {addPlayerError && <div style={{ color: "#d00", marginBottom: 10 }}>{addPlayerError}</div>}
            <button type="submit" style={{ fontWeight: 600, fontSize: 16 }}>Lisa mängija</button>
          </form>
        </div>
      </div>
    )}
  </div>
  );
}

// --- FeedbackModal component ---
function FeedbackModal({ session, onSubmit, onSkip }) {
  const [intensity, setIntensity] = useState(5);
  const [support, setSupport] = useState(3);
  const [clarity, setClarity] = useState(3);
  // Intensity label scale
  let intensityLabel = "";
  if (intensity <= 2) intensityLabel = "väga kerge";
  else if (intensity <= 4) intensityLabel = "kerge";
  else if (intensity <= 6) intensityLabel = "keskmine";
  else if (intensity <= 8) intensityLabel = "raske";
  else intensityLabel = "väga raske";

  return (
    <div className="feedback-modal">
      <div className="feedback-content">
        <h2>Kuidas trenn läks? Palun anna tagasisidet!</h2>
        <div><b>{session.weekday} {estonianDate(session.date)}</b></div>
        <div style={{margin:"12px 0"}}><b>1. Kui raske või intensiivne tundus tänane treening?</b></div>
        <input
          type="range"
          min="1"
          max="10"
          value={intensity}
          onChange={e => setIntensity(Number(e.target.value))}
          style={{ width: 220, accentColor: `hsl(${120 - (intensity - 1) * 12},80%,60%)` }}
        />
        <div style={{color: "#888"}}>{intensity} ({intensityLabel})</div>
        <div style={{margin:"12px 0"}}><b>2. Kas tundsid täna treeneri toetusest puudust?</b></div>
        <div>
          {[1,2,3,4,5].map(val =>
            <button
              key={val}
              onClick={() => setSupport(val)}
              style={{
                fontSize: "1.5em",
                margin: "0 2px",
                background: val===support ? "#ffe066" : "transparent",
                border: "none"
              }}>
              {val === 1 ? "😁"
                : val === 2 ? "🙂"
                : val === 3 ? "🤔"
                : val === 4 ? "😕"
                : "😞"}
            </button>
          )}
        </div>
        {/* Q2 scale under button row */}
        <div style={{ color: "#888", minHeight: 20, marginTop: 6 }}>
          {support === 1 && "Ei tundnud üldse puudust"}
          {support === 2 && "Vähe puudust"}
          {support === 3 && "Natuke puudust"}
          {support === 4 && "Palju puudust"}
          {support === 5 && "Väga palju puudust"}
        </div>
        <div style={{margin:"12px 0"}}><b>3. Kui selge oli tänase treeningu eesmärk sinu jaoks?</b></div>
        <div>
          {[1,2,3,4,5].map(val =>
            <button
              key={val}
              onClick={() => setClarity(val)}
              style={{
                fontSize: "1.5em",
                margin: "0 2px",
                background: val===clarity ? "#a3e6e3" : "transparent",
                border: "none"
              }}>
              {val === 1 ? "😕"
                : val === 2 ? "🤔"
                : val === 3 ? "😐"
                : val === 4 ? "🙂"
                : "💡"}
            </button>
          )}
        </div>
        {/* Q3 scale under button row */}
        <div style={{ color: "#888", minHeight: 20, marginTop: 6 }}>
          {clarity === 1 && "Üldse ei olnud selge"}
          {clarity === 2 && "Pigem segane"}
          {clarity === 3 && "Keskmiselt selge"}
          {clarity === 4 && "Pigem selge"}
          {clarity === 5 && "Täiesti selge"}
        </div>
        <div style={{marginTop:20}}>
          <button onClick={() => onSubmit({intensity, support, clarity})} style={{marginRight:12}}>Saada</button>
          <button onClick={onSkip}>Hiljem</button>
        </div>
      </div>
    </div>
  );
}
// --- CoachFeedbackModal component ---
function CoachFeedbackModal({ session, onClose, coachFeedbackData, playerPasswords, attendance, onSave }) {
  // List of players who attended
  const groupPlayers = (Array.isArray(playerPasswords) ? playerPasswords : Object.values(playerPasswords)).map(p => p.name).filter(n => attendance[n][session.date] === "Jah" && n && n !== "");
  const prevData = (coachFeedbackData?.[session.date]?.[session.group]) || {};
  const [efforts, setEfforts] = React.useState(() => {
    let out = {};
    groupPlayers.forEach(n => {
      out[n] = prevData[n] || 3;
    });
    return out;
  });

  // Scale info
  const scale = [
    { val: 1, icon: "😞", label: "Väga väike" },
    { val: 2, icon: "😕", label: "Keskmisest väiksem" },
    { val: 3, icon: "😐", label: "Keskmine" },
    { val: 4, icon: "🙂", label: "Keskmisest suurem" },
    { val: 5, icon: "💪", label: "Väga suur" }
  ];

  return (
    <div className="feedback-modal">
      <div className="feedback-content">
        <h2>Pane mängijatele tagasiside (Grupp {session.group}, {estonianDate(session.date)})</h2>
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginBottom: 6 }}>
            {scale.map(s =>
              <div key={s.val} style={{ textAlign: "center", width: 50 }}>
                <span style={{ fontSize: "1.6em" }}>{s.icon}</span>
                <div style={{ fontSize: 12 }}>{s.label}</div>
              </div>
            )}
          </div>
        </div>
        <div style={{ maxHeight: 300, overflowY: "auto" }}>
          {groupPlayers.map(name => (
            <div key={name} style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
              <span style={{ minWidth: 120 }}>{name}</span>
              {scale.map(s =>
                <button
                  key={s.val}
                  style={{
                    margin: "0 2px",
                    fontSize: "1.3em",
                    background: efforts[name] === s.val ? "#ffe066" : "transparent",
                    border: "none",
                    cursor: "pointer"
                  }}
                  onClick={() => setEfforts(e => ({ ...e, [name]: s.val }))}
                >{s.icon}</button>
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <button
            onClick={() => onSave(efforts)}
            style={{ marginRight: 12 }}>Salvesta</button>
          <button onClick={onClose}>Sulge</button>
        </div>
      </div>
    </div>
  );
}
// --- Feedback emoji mapping for Q2 and Q3 ---
const FEEDBACK_EMOJI_Q2 = {
  1: "😁",
  2: "🙂",
  3: "🤔",
  4: "😕",
  5: "😞"
};
const FEEDBACK_EMOJI_Q3 = {
  1: "😕",
  2: "🤔",
  3: "😐",
  4: "🙂",
  5: "💡"
};
// --- FeedbackSummaryByGroup component ---
function FeedbackSummaryByGroup({ dates, playerPasswords, playerGroups, feedbackData, coachFeedbackData }) {
  const [showOld1, setShowOld1] = React.useState(false);
  const [showOld2, setShowOld2] = React.useState(false);
  const [showSessionModal, setShowSessionModal] = React.useState(false);
  const [selectedSession, setSelectedSession] = React.useState(null);

  // Helper: for a group, get sorted descending list of dates with at least one feedback in that group
  function getFeedbackDatesForGroup(grp) {
    const playerList = Array.isArray(playerPasswords)
      ? playerPasswords
      : Object.values(playerPasswords);
    const groupPlayers = playerList.map(p => p.name).filter(n => playerGroups[n] === String(grp));
    const feedbackDatesSet = new Set();
    for (const n of groupPlayers) {
      if (feedbackData[n]) {
        for (const d of Object.keys(feedbackData[n])) {
          feedbackDatesSet.add(d);
        }
      }
    }
    const validDates = dates.map(d => d.date);
    const feedbackDates = Array.from(feedbackDatesSet).filter(d => validDates.includes(d));
    const feedbackDateObjs = feedbackDates
      .map(dateStr => dates.find(d => d.date === dateStr))
      .filter(Boolean);
    feedbackDateObjs.sort((a, b) => b.date.localeCompare(a.date));
    return feedbackDateObjs;
  }

  // Only show the most recent 5 dates by default, show older dates if showOld is true
  function groupRows(grp, dateArr) {
    return dateArr.map((d) => {
      const playerList = Array.isArray(playerPasswords)
        ? playerPasswords
        : Object.values(playerPasswords);
      const groupPlayers = playerList.map(p => p.name).filter(n => playerGroups[n] === grp);
      const fbList = groupPlayers
        .map(n => feedbackData[n]?.[d.date])
        .filter(fb => !!fb);
      if (fbList.length === 0) return null;
      const avg = arr => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : null;
      const q1avg = avg(fbList.map(fb => fb.intensity));
      const q2avg = avg(fbList.map(fb => fb.support));
      const q3avg = avg(fbList.map(fb => fb.clarity));
      const unhappy = fbList.filter(fb => fb.support >= 4 || fb.clarity >= 4).length;
      return (
        <tr key={d.date + grp}>
          <td>
            <span
              style={{cursor:"pointer", textDecoration:"underline", color:"#3b70b2"}}
              onClick={() => { setSelectedSession({date:d.date,group:grp}); setShowSessionModal(true); }}
            >
              {estonianDate(d.date)}
            </span>
          </td>
          <td>{grp}</td>
          <td style={{ textAlign: "center" }}>{q1avg ? q1avg.toFixed(1) : "-"}</td>
          <td style={{
            textAlign: "center",
            background:
              q2avg !== null
                ? q2avg > 3.5
                  ? "#ffb1b1"
                  : q2avg > 2.5
                    ? "#ffe066"
                    : "#b8ffc9"
                : ""
          }}>{q2avg ? q2avg.toFixed(1) : "-"}</td>
          <td style={{
            textAlign: "center",
            background:
              q3avg !== null
                ? q3avg > 3.5
                  ? "#ffb1b1"
                  : q3avg > 2.5
                    ? "#ffe066"
                    : "#b8ffc9"
                : ""
          }}>{q3avg ? q3avg.toFixed(1) : "-"}</td>
          <td style={{ textAlign: "center" }}>{unhappy}</td>
          <td style={{ textAlign: "center" }}>{fbList.length}</td>
        </tr>
      );
    });
  }

  function renderGroup(grp, showOld, setShowOld) {
    const feedbackDateObjs = getFeedbackDatesForGroup(grp);
    // Sort feedbackDateObjs descending (already sorted in getFeedbackDatesForGroup)
    const mostRecent = feedbackDateObjs.slice(0, 5);
    const earlier = feedbackDateObjs.slice(5);

    return (
      <div style={{ marginBottom: 18 }}>
        <h3>Mängijate tagasiside kokkuvõte (Grupp {grp})</h3>
        <table className="attendance-table">
          <thead>
            <tr>
              <th>Kuupäev</th>
              <th>Grupp</th>
              <th>Intensiivsus</th>
              <th>
                <span style={{ display: "block" }}>Treeneri</span>
                <span style={{ display: "block" }}>aktiivsus</span>
              </th>
              <th>Eesmärk</th>
              <th>“Rahulolematuid”</th>
              <th>Kokku vastuseid</th>
            </tr>
          </thead>
          <tbody>
            {groupRows(grp, mostRecent)}
            {showOld && groupRows(grp, earlier)}
          </tbody>
        </table>
        {earlier.length > 0 && (
          <button
            style={{ marginTop: 7, marginBottom: 12 }}
            onClick={() => setShowOld(s => !s)}
          >
            {showOld ? "Peida varasemad päevad" : "Näita varasemaid päevi"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ margin: "30px 0 24px 0" }}>
      {/* Q2/Q3 legend */}
      <div style={{
        fontSize: 15,
        background: "#f6faff",
        border: "1px solid #e0e7ef",
        borderRadius: 8,
        padding: "10px 16px",
        margin: "18px 0",
        maxWidth: 800
      }}>
        <b>Küsimuste skaalad:</b>
        <div style={{display:"flex", gap:24, flexWrap:"wrap", marginTop:8}}>
          <div>
            <b>Q2: Treeneri toetus puudus</b>
            <ul style={{margin:0, paddingLeft:18}}>
              <li>😁 <b>1</b> – Ei tundnud üldse puudust (väga hea)</li>
              <li>🙂 <b>2</b> – Vähe puudust</li>
              <li>🤔 <b>3</b> – Natuke puudust</li>
              <li>😕 <b>4</b> – Palju puudust</li>
              <li>😞 <b>5</b> – Väga palju puudust (vajab tähelepanu)</li>
            </ul>
          </div>
          <div>
            <b>Q3: Treeningu eesmärgi selgus</b>
            <ul style={{margin:0, paddingLeft:18}}>
              <li>😕 <b>1</b> – Üldse ei olnud selge</li>
              <li>🤔 <b>2</b> – Pigem segane</li>
              <li>😐 <b>3</b> – Keskmiselt selge</li>
              <li>🙂 <b>4</b> – Pigem selge</li>
              <li>💡 <b>5</b> – Täiesti selge (väga hea)</li>
            </ul>
          </div>
        </div>
        <div style={{fontSize:13, color:"#555", marginTop:8}}>
          <b>Mida tähendab keskmine:</b><br/>
          <b>Q2:</b> Madal keskmine (1-2) = enamus tundis tuge, kõrge (4-5) = paljud tundsid puudust.<br/>
          <b>Q3:</b> Madal (1-2) = eesmärk polnud arusaadav, kõrge (4-5) = eesmärk oli väga selge.<br/>
          <b>Hea on Q2 madal ja Q3 kõrge.</b>
        </div>
      </div>
      {renderGroup("1", showOld1, setShowOld1)}
      {renderGroup("2", showOld2, setShowOld2)}
      <SessionFeedbackModal
        show={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        session={selectedSession}
        dates={dates}
        playerPasswords={playerPasswords}
        playerGroups={playerGroups}
        feedbackData={feedbackData}
        coachFeedbackData={coachFeedbackData}
      />
    </div>
  );
}

// --- SessionFeedbackModal component ---
function SessionFeedbackModal({ show, onClose, session, dates, playerPasswords, playerGroups, feedbackData, coachFeedbackData }) {
  React.useEffect(() => {
    if (!show) return;
    function onClick(e) {
      if (e.target.classList.contains("session-modal-overlay")) onClose();
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [show, onClose]);

  if (!show || !session) return null;
  const { date, group } = session;
  const estonianDateStr = dates.find(d => d.date === date)?.weekday + " " + (dates.find(d => d.date === date)?.date || "");
  const playerList = Array.isArray(playerPasswords)
    ? playerPasswords
    : Object.values(playerPasswords);

  const groupPlayers = playerList.map(p => p.name).filter(n => playerGroups[n] === group);
  // Get players with feedback or attendance "Jah" for that date and group
  const attending = groupPlayers.filter(n =>
    (feedbackData[n] && feedbackData[n][date]) ||
    (feedbackData[n] && Object.keys(feedbackData[n]).includes(date)) ||
    (n && n !== "" && typeof feedbackData[n]?.[date] !== "undefined")
  );

  return (
    <div className="session-modal-overlay" style={{
      position: "fixed", zIndex: 1001, top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(20,30,50,0.38)", display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 12,
        padding: 28,
        minWidth: 500,
        maxWidth: 800,
        boxShadow: "0 2px 18px #4442",
        position: "relative"
      }}>
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 18, fontSize: 18, background: "#eee", border: "none", borderRadius: 6, padding: "4px 9px", cursor: "pointer" }}>Sulge</button>
        <h2>Tagasiside detailid</h2>
        <div style={{fontSize:15,marginBottom:8}}><b>{estonianDateStr}</b> &nbsp; <span style={{fontSize:13, color:"#555"}}>Grupp {group}</span></div>
        <table className="attendance-table" style={{ fontSize: 14, width: "100%" }}>
          <thead>
            <tr>
              <th>Mängija</th>
              <th>Raskus</th>
              <th>Treeneri toetus</th>
              <th>Eesmärk</th>
              <th>Treeneri tagasiside</th>
            </tr>
          </thead>
          <tbody>
            {groupPlayers.map(name => {
              const fb = feedbackData[name]?.[date];
              if (!fb) return null;
              const coachVal = coachFeedbackData?.[date]?.[group]?.[name] || 3;
              const coachObj = {1:"😞 Väga väike",2:"😕 Keskmisest väiksem",3:"😐 Keskmine",4:"🙂 Keskmisest suurem",5:"💪 Väga suur"};
              return (
                <tr key={name}>
                  <td style={{ padding: "7px 5px", wordBreak: "break-word" }}>
                    {(() => {
                      const parts = name.split(" ");
                      if (parts.length === 1) return parts[0];
                      const last = parts[parts.length - 1];
                      return parts[0] + " " + last.charAt(0) + ".";
                    })()}
                  </td>
                  <td style={{ textAlign: "center", padding: "7px 5px", wordBreak: "break-word" }}>{fb.intensity ?? "-"}</td>
                  <td style={{ textAlign: "center", padding: "7px 5px", wordBreak: "break-word" }}>{fb.support ? FEEDBACK_EMOJI_Q2[fb.support] + " " + fb.support : "-"}</td>
                  <td style={{ textAlign: "center", padding: "7px 5px", wordBreak: "break-word" }}>{fb.clarity ? FEEDBACK_EMOJI_Q3[fb.clarity] + " " + fb.clarity : "-"}</td>
                  <td style={{ textAlign: "center", padding: "7px 5px", wordBreak: "break-word" }}>{coachObj[coachVal] || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{fontSize:13, marginTop:12, color:"#555", background:"#f6faff", border:"1px solid #e0e7ef", borderRadius:8, padding:"8px 12px"}}>
          <b>Legend:</b>
          <div>
            <b>Q2:</b> 1=😁 Ei tundnud üldse puudust, 5=😞 Väga palju puudust.<br/>
            <b>Q3:</b> 1=😕 Üldse ei olnud selge, 5=💡 Täiesti selge.<br/>
            <b>Treeneri tagasiside:</b> 😞 Väga väike ... 💪 Väga suur.
          </div>
        </div>
      </div>
    </div>
  );
}
export default App;