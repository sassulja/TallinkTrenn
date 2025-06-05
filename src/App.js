import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import playerPasswords from "./player_passwords.json";
import dates from "./dates.json";
import logo from "./Logo.jpg";
import { db } from "./firebase";
import { ref, set, onValue } from "firebase/database";

const ADMIN_PASSWORD = "Tallink2025";

// Helpers for default groups
function getDefaultGroups(players) {
  let out = {};
  players.forEach(({ name }) => {
    out[name] = "1";
  });
  return out;
}
function getDefaultFussGroups(players) {
  let out = {};
  players.forEach(({ name }) => {
    out[name] = "B";
  });
  return out;
}
function getDefaultAttendance(players, dates) {
  let out = {};
  players.forEach(({ name }) => {
    out[name] = {};
    dates.forEach(({ date }) => {
      out[name][date] = "";
    });
  });
  return out;
}
function getNextFiveWeekdays(dates) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const startIdx = dates.findIndex((d) => d.date >= todayStr);
  return startIdx >= 0 ? dates.slice(startIdx, startIdx + 5) : [];
}
function groupCourtCount(count) {
  return Math.ceil(count / 4);
}
function estonianDate(d) {
  return `${d.slice(8, 10)}.${d.slice(5, 7)}`;
}
function downloadExcel(
  attendance,
  playerGroups,
  fussAttendance,
  fussGroups,
  dates
) {
  // Tennis
  let tennisRows = [
    ["Nimi", "Tennise grupp", ...dates.map((d) => d.date)],
  ];
  for (const name in attendance) {
    tennisRows.push([
      name,
      playerGroups[name],
      ...dates.map((d) => attendance[name][d.date] || ""),
    ]);
  }
  // Füss
  let fussRows = [
    ["Nimi", "Füssi grupp", ...dates.map((d) => d.date)],
  ];
  for (const name in fussAttendance) {
    fussRows.push([
      name,
      fussGroups[name],
      ...dates.map((d) => fussAttendance[name][d.date] || ""),
    ]);
  }
  // Combine
  const csv =
    ["TENNIS", ...tennisRows.map((r) => r.join(";"))].join("\n") +
    "\n\n" +
    ["FÜSS", ...fussRows.map((r) => r.join(";"))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "treeningud.csv";
  a.click();
}

export default function App() {
  // State
  const [step, setStep] = useState("login");
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [playerGroups, setPlayerGroups] = useState(getDefaultGroups(playerPasswords));
  const [attendance, setAttendance] = useState(getDefaultAttendance(playerPasswords, dates));
  const [fussGroups, setFussGroups] = useState(getDefaultFussGroups(playerPasswords));
  const [fussAttendance, setFussAttendance] = useState(getDefaultAttendance(playerPasswords, dates));
  const [adminMode, setAdminMode] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [groupAssignMode, setGroupAssignMode] = useState(false);
  const [showGroupPrompt, setShowGroupPrompt] = useState(false);
  const [activeView, setActiveView] = useState("tennis"); // "tennis" or "fuss"

  const tableWrapperRef = useRef(null);

useEffect(() => {
    if (!tableWrapperRef.current) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const colIdx = dates.findIndex(d => d.date >= todayStr);
    if (colIdx >= 0) {
      const scrollX = Math.max((colIdx - 2) * 42, 0);
      tableWrapperRef.current.scrollLeft = scrollX;
    }
  }, [dates, activeView]);

  // --- Sync from Firebase ---
  useEffect(() => {
    // Attendance (tennis)
    const attRef = ref(db, "attendance");
    const unsubAtt = onValue(attRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setAttendance(data);
    });

    // PlayerGroups (tennis)
    const grpRef = ref(db, "playerGroups");
    const unsubGrp = onValue(grpRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setPlayerGroups(data);
    });

    // Fuss attendance
    const fussAttRef = ref(db, "fussAttendance");
    const unsubFussAtt = onValue(fussAttRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setFussAttendance(data);
    });

    // Fuss groups
    const fussGrpRef = ref(db, "fussGroups");
    const unsubFussGrp = onValue(fussGrpRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setFussGroups(data);
    });

    return () => {
      unsubAtt();
      unsubGrp();
      unsubFussAtt();
      unsubFussGrp();
    };
  }, []);

  // --- Save to Firebase whenever changed ---
  useEffect(() => {
    set(ref(db, "attendance"), attendance);
  }, [attendance]);
  useEffect(() => {
    set(ref(db, "playerGroups"), playerGroups);
  }, [playerGroups]);
  useEffect(() => {
    set(ref(db, "fussAttendance"), fussAttendance);
  }, [fussAttendance]);
  useEffect(() => {
    set(ref(db, "fussGroups"), fussGroups);
  }, [fussGroups]);

  // --- Friday group prompt ---
  useEffect(() => {
    function checkGroupPrompt() {
      const now = new Date();
      if (
        now.getDay() === 5 && // Friday
        now.getHours() >= 15
      ) {
        setShowGroupPrompt(true);
      } else {
        setShowGroupPrompt(false);
      }
    }
    if (adminMode) {
      checkGroupPrompt();
      const timer = setInterval(checkGroupPrompt, 1000 * 60 * 10);
      return () => clearInterval(timer);
    }
  }, [adminMode]);

  // --- Force group assign if not set
  useEffect(() => {
    if (
      adminMode &&
      (Object.keys(playerGroups).some((n) => !playerGroups[n]) ||
        Object.keys(fussGroups).some((n) => !fussGroups[n]))
    ) {
      setGroupAssignMode(true);
    }
  }, [adminMode, playerGroups, fussGroups]);

  // --- Login handler ---
  function handleLogin(e) {
    e.preventDefault();
    if (loginName.toLowerCase() === "admin" && loginPassword === ADMIN_PASSWORD) {
      setAdminMode(true);
      setStep("admin");
      return;
    }
    const match = playerPasswords.find(
      (p) => p.name === loginName && p.password === loginPassword
    );
    if (match) {
      setStep("player");
      setSelectedPlayer(loginName);
      return;
    }
    alert("Vale nimi või parool!");
  }

  // --- Group assignment view ---
  if (
    adminMode &&
    (groupAssignMode ||
      Object.keys(playerGroups).some((n) => !playerGroups[n]) ||
      Object.keys(fussGroups).some((n) => !fussGroups[n]))
  ) {
    return (
      <div className="container">
        <img src={logo} alt="Logo" style={{ width: 100, margin: 24 }} />
        <h2>Määra mängijate grupid</h2>
        <table>
          <thead>
            <tr>
              <th>Mängija</th>
              <th>Tennise grupp</th>
              <th>Füssi grupp</th>
            </tr>
          </thead>
          <tbody>
            {playerPasswords.map(({ name }) => (
              <tr key={name}>
                <td>{name}</td>
                <td>
                  <select
                    value={playerGroups[name] || ""}
                    onChange={(e) => {
                      const newGroups = { ...playerGroups, [name]: e.target.value };
                      setPlayerGroups(newGroups);
                    }}
                  >
                    <option value="">- vali -</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                  </select>
                </td>
                <td>
                  <select
                    value={fussGroups[name] || ""}
                    onChange={(e) => {
                      const newGroups = { ...fussGroups, [name]: e.target.value };
                      setFussGroups(newGroups);
                    }}
                  >
                    <option value="">- vali -</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={() => {
            if (
              Object.values(playerGroups).every((g) => g === "1" || g === "2") &&
              Object.values(fussGroups).every((g) => g === "A" || g === "B")
            ) {
              setGroupAssignMode(false);
              setStep("admin");
            } else {
              alert("Palun määra kõikidele mängijatele mõlemad grupid!");
            }
          }}
        >
          Salvesta
        </button>
      </div>
    );
  }

  // --- Attendance table render (both types) ---
  function renderTable(forPlayer, isFuss = false) {
    const rows =
      forPlayer && selectedPlayer
        ? [playerPasswords.find((p) => p.name === selectedPlayer)]
        : playerPasswords;
    const groups = isFuss ? fussGroups : playerGroups;
    const data = isFuss ? fussAttendance : attendance;

    return (
      <table className="attendance-table">
        <thead>
          <tr>
            <th>Mängija</th>
            <th>{isFuss ? "Füssi grupp" : "Grupp"}</th>
            {dates.map((d) => (
              <th key={d.date}>
                <span style={{ fontWeight: 400, fontSize: 13 }}>{d.weekday}</span>
                <br />
                <span style={{ fontWeight: 600, fontSize: 14 }}>{estonianDate(d.date)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ name }) => (
            <tr key={name}>
              <td>{name}</td>
              <td>{groups[name]}</td>
              {dates.map((d) => (
                <td key={d.date}>
                  {isFuss
                    ? adminMode && !forPlayer
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
                      : (data[name][d.date] || "Ei käinud")
                    : (forPlayer || adminMode)
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
                            setAttendance((a) => ({
                              ...a,
                              [name]: {
                                ...a[name],
                                [d.date]: a[name][d.date] === "Jah" ? "Ei" : "Jah"
                              }
                            }));
                          }}
                        >
                          {data[name][d.date] === "Jah" ? "Jah" : "Ei"}
                        </button>
                      )
                      : (data[name][d.date] || "")
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  // --- Admin group/court summary ---
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
                  <th>Väljakuid vaja</th>
                </tr>
              </thead>
              <tbody>
                {next5.map((d) => (
                  <tr key={d.date}>
                    <td>
                      {d.weekday} <b>{estonianDate(d.date)}</b>
                    </td>
                    <td>{byGroup[grp][d.date].count}</td>
                    <td>{byGroup[grp][d.date].courts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    );
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
              {playerPasswords.map((p) => (
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

      {step === "player" && selectedPlayer && (
        <div>
          <h2>Tere, {selectedPlayer}!</h2>
          <div>
            Sinu tennise grupp: <b>{playerGroups[selectedPlayer]}</b>
          </div>
          <div>
            Sinu füssi grupp: <b>{fussGroups[selectedPlayer]}</b>
          </div>
          <div style={{ margin: "18px 0" }}>
            <div>
              <b>Tennis:</b>
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
          {renderAdminSummary(activeView === "fuss")}
          <div className="attendance-table-wrapper" style={{ overflowX: "auto" }} ref={tableWrapperRef}>
            {renderTable(false, activeView === "fuss")}
          </div>
        </div>
      )}
    </div>
  );
}