import React, { useState, useEffect } from 'react';
import { set, ref as databaseRef, onValue } from "firebase/database";
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import logo from './Logo.png';
import playerPasswordsData from './player_passwords.json';
import parentPasswordsData from './parent_passwords.json';
import { db as firebaseDb, firebaseConfig } from './firebase';

// --- Day order arrays for schedule rendering ---
const TENNIS_GROUP1_ORDER = [
  "Monday", "Tuesday1", "Tuesday2", "Wednesday", "Thursday1", "Thursday2", "Friday"
];
const TENNIS_GROUP2_ORDER = [
  "Monday1", "Monday2", "Tuesday", "Wednesday1", "Wednesday2", "Thursday", "Friday"
];
const FUSS_GROUP_ORDER = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"
];

function estonianDate(dateStr) {
  if (!dateStr) return '';
  
  // If dateStr is an object with a date property, use that
  const date = typeof dateStr === 'object' && dateStr.date ? dateStr.date : dateStr;
  
  // date is "YYYY-MM-DD"
  const [year, month, day] = date.split('-');
  return `${day}.${month}.${year}`;
}

// --- AttendanceToggle component ---
function AttendanceToggle({ value, onChange }) {
  const isJah = value === 'Jah';
  return (
    <button
      type="button"
      onClick={() => onChange(isJah ? 'Ei' : 'Jah')}
      style={{
        background: isJah ? '#b8ffc9' : '#ffb1b1',
        color: isJah ? '#0a4' : '#a00',
        border: '1px solid #ccc',
        borderRadius: 6,
        padding: '2px 14px',
        fontWeight: 600,
        cursor: 'pointer',
        outline: 'none',
        minWidth: 44,
        transition: 'background 0.2s, color 0.2s'
      }}
    >
      {isJah ? 'Jah' : 'Ei'}
    </button>
  );
}

function generatePastDates(startDateStr, endDateStr) {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  const weekdays = [1, 2, 3, 4, 5]; // Monday to Friday
  const dates = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    if (weekdays.includes(current.getDay())) {
      const dateStr = current.toISOString().split("T")[0];
      const weekdayName = current.toLocaleDateString("et-EE", { weekday: "long" });
      dates.push({ date: dateStr, weekday: weekdayName });
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}
function App() {
  const dates = React.useMemo(() => getNextFiveWeekdays(), []);
  // --- State hooks for variables referenced but not defined ---
  const [selectedPlayer, setSelectedPlayer] = React.useState(null);
  const [playerPasswords, setPlayerPasswords] = React.useState(
    Array.isArray(playerPasswordsData) ? playerPasswordsData : Object.values(playerPasswordsData)
  );
  const [parentPasswords, setParentPasswords] = React.useState(
    Array.isArray(parentPasswordsData) ? parentPasswordsData : Object.values(parentPasswordsData)
  );
  const [playerGroups, setPlayerGroups] = React.useState({});
  // Ensure showPastDates and dates are declared only once at the top level
  const [showPastDates, setShowPastDates] = React.useState(false);
  // Remove duplicate dates state, will rely on getNextFiveWeekdays()
  const [fussGroups, setFussGroups] = React.useState({});
  const [attendance, setAttendance] = React.useState({});
  const [allDates, setAllDates] = React.useState([]);

React.useEffect(() => {
  const datesRef = databaseRef(firebaseDb, "dates");
  onValue(datesRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const parsed = Object.keys(data).map(dateKey => ({
        date: dateKey,
        weekday: new Date(dateKey).toLocaleDateString("et-EE", { weekday: "long" })
      }));
      setAllDates(parsed);
    }
  });
}, []);

  const [fussAttendance, setFussAttendance] = React.useState({});
  const [adminMode, setAdminMode] = React.useState(false);
  const [coachMode, setCoachMode] = React.useState(false);
  const [feedbackData, setFeedbackData] = React.useState({});
  const [ref, setRef] = React.useState(null);
  const [db, setDb] = React.useState(firebaseDb);
  const [coachFeedbackData, setCoachFeedbackData] = React.useState({});
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
  const [parentLoginCode, setParentLoginCode] = React.useState('');
  const [parentError, setParentError] = React.useState('');
  const [showFeedbackModal, setShowFeedbackModal] = React.useState(false);
  const [feedbackQueue, setFeedbackQueue] = React.useState([]);
  const [currentFeedbackIdx, setCurrentFeedbackIdx] = React.useState(0);
  const [groupAssignMode, setGroupAssignMode] = React.useState(false);
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
  const [newPlayerFirst, setNewPlayerFirst] = React.useState('');
  const [newPlayerLast, setNewPlayerLast] = React.useState('');
  const [newPlayerPw, setNewPlayerPw] = React.useState('');
  const [newParentPw, setNewParentPw] = React.useState('');
  const [newTennisGroup, setNewTennisGroup] = React.useState('');
  const [newFussGroup, setNewFussGroup] = React.useState('');
  const [downloadExcel, setDownloadExcel] = React.useState(() => {});
  const [COACH_FEEDBACK_EMOJI, setCOACH_FEEDBACK_EMOJI] = React.useState([
    { val: 1, icon: "😞", label: "Väga väike" },
    { val: 2, icon: "😕", label: "Keskmisest väiksem" },
    { val: 3, icon: "😐", label: "Keskmine" },
    { val: 4, icon: "🙂", label: "Keskmisest suurem" },
    { val: 5, icon: "💪", label: "Väga suur" }
  ]);
  const [showScheduleModal, setShowScheduleModal] = React.useState(false);
  const [schedule, setSchedule] = React.useState({
    tennis: {
      group1: {
        Monday: "11:00 - 12:30",
        Tuesday1: "9:30 - 11:00",
        Tuesday2: "12:30 - 14:00",
        Wednesday: "11:00 - 12:30",
        Thursday1: "9:30 - 11:00",
        Thursday2: "12:30 - 14:00",
        Friday: "10:00 - 12:00"
      },
      group2: {
        Monday1: "9:30 - 11:00",
        Monday2: "12:30 - 14:00",
        Tuesday: "11:00 - 12:30",
        Wednesday1: "9:30 - 11:00",
        Wednesday2: "12:30 - 14:00",
        Thursday: "11:00 - 12:30",
        Friday: "12:00 - 14:00"
      }
    },
    fuss: {
      groupA: {
        Monday: "15:00 - 16:30",
        Tuesday: "15:00 - 16:30",
        Wednesday: "15:00 - 16:30",
        Thursday: "15:00 - 16:30",
        Friday: "15:00 - 16:30"
      },
      groupB: {
        Monday: "16:30 - 18:00",
        Tuesday: "16:30 - 18:00",
        Wednesday: "16:30 - 18:00",
        Thursday: "16:30 - 18:00",
        Friday: "16:30 - 18:00"
      }
    }
  });
  const [activeScheduleTab, setActiveScheduleTab] = React.useState('tennis');
  const [showPrevTennis, setShowPrevTennis] = React.useState(false);
  const [showPrevFuss, setShowPrevFuss] = React.useState(false);
  // Add state for showing past attendance tables
  const [showPastTennis, setShowPastTennis] = React.useState(false);
  const [showPastFuss, setShowPastFuss] = React.useState(false);

  // Add useEffect to load schedule from Firebase
  React.useEffect(() => {
    if (!db) return;
    
    const scheduleRef = databaseRef(db, 'schedule');
    onValue(scheduleRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSchedule(data);
      }
    });
  }, [db]);

  function handleScheduleChange(sport, group, day, value) {
    const newSchedule = {
      ...schedule,
      [sport]: {
        ...schedule[sport],
        [group]: {
          ...schedule[sport][group],
          [day]: value
        }
      }
    };
    setSchedule(newSchedule);
    set(databaseRef(db, "schedule"), newSchedule);
  }

  // Function to handle coach feedback
  function handleCoachFeedback(newData) {
    if (!coachFeedbackSession) return;
    set(databaseRef(db, `coachFeedback/${coachFeedbackSession.date}/${coachFeedbackSession.group}`), newData);
    setShowCoachFeedbackModal(false);
  }

  // Function to handle login
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

  // Function to add new player
  function handleAddPlayer(e) {
    e.preventDefault();
    if (!newPlayerFirst || !newPlayerLast || !newPlayerPw || !newParentPw) {
      setAddPlayerError("Kõik väljad on kohustuslikud");
      return;
    }
    const newPlayer = {
      name: `${newPlayerFirst} ${newPlayerLast}`,
      password: newPlayerPw,
      parentPassword: newParentPw
    };
    const updatedPw = [...playerPasswords, newPlayer];
    setPlayerPasswords(updatedPw);
    set(databaseRef(db, "playerPasswords"), updatedPw);
    
    // Initialize attendance data
    const att = { ...attendance, [newPlayer.name]: {} };
    const fAtt = { ...fussAttendance, [newPlayer.name]: {} };
    setAttendance(att);
    setFussAttendance(fAtt);
    set(databaseRef(db, "attendance"), att);
    set(databaseRef(db, "fussAttendance"), fAtt);
    
    // Set default groups
    set(databaseRef(db, `playerGroups/${newPlayer.name}`), "1");
    set(databaseRef(db, `fussGroups/${newPlayer.name}`), "A");
    
    setShowAddPlayer(false);
    setNewPlayerFirst("");
    setNewPlayerLast("");
    setNewPlayerPw("");
    setNewParentPw("");
    setAddPlayerError("");
  }

  // Initialize Firebase and load data
  React.useEffect(() => {
    if (!db) return;

    // Load dates from Firebase with debug logging and improved parsing
    const scheduleRef = databaseRef(db, 'schedule');
    onValue(scheduleRef, (snapshot) => {
      const data = snapshot.val();
      console.log("📦 Raw schedule data from Firebase:", data);
      if (data) {
        const parsedDates = Object.values(data)
          .filter(entry => entry.date)
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        console.log("✅ Parsed and sorted dates:", parsedDates);
      } else {
        console.warn("⚠️ No schedule data found in Firebase.");
      }
    });

    // Load tennis attendance
    const tennisAttendanceRef = databaseRef(db, 'attendance');
    onValue(tennisAttendanceRef, (snapshot) => {
      const data = snapshot.val() || {};
      setAttendance(data);
    });

    // Load fuss attendance
    const fussAttendanceRef = databaseRef(db, 'fussAttendance');
    onValue(fussAttendanceRef, (snapshot) => {
      const data = snapshot.val() || {};
      setFussAttendance(data);
    });

    // Load tennis groups
    const tennisGroupsRef = databaseRef(db, 'playerGroups');
    onValue(tennisGroupsRef, (snapshot) => {
      const data = snapshot.val() || {};
      // Apply default group 1 for players without a group
      const defaultGroups = {};
      playerPasswords.forEach(player => {
        defaultGroups[player.name] = data[player.name] || "1";
      });
      setPlayerGroups(defaultGroups);
    });

    // Load fuss groups
    const fussGroupsRef = databaseRef(db, 'fussGroups');
    onValue(fussGroupsRef, (snapshot) => {
      const data = snapshot.val() || {};
      // Apply default group A for players without a group
      const defaultGroups = {};
      playerPasswords.forEach(player => {
        defaultGroups[player.name] = data[player.name] || "A";
      });
      setFussGroups(defaultGroups);
    });
  }, [db, playerPasswords]);

// --- Utility: Get next five weekdays (Mon-Fri) ---
function getNextFiveWeekdays() {
  const result = [];
  const today = new Date();
  while (result.length < 5) {
    const day = today.getDay();
    if (day !== 0 && day !== 6) {
      result.push(new Date(today));
    }
    today.setDate(today.getDate() + 1);
  }
  return result.map(date => ({
    date: date.toISOString().split("T")[0],
    weekday: date.toLocaleDateString("et-EE", { weekday: 'long' }),
  }));
}

  // Function to calculate court count
  function groupCourtCount(group, date, data, isFuss) {
    if (isFuss) return 1; // Fussball always needs 1 court
    const attending = Object.keys(data)
      .filter(name => data[name][date] === "Jah")
      .filter(name => (isFuss ? fussGroups[name] : playerGroups[name]) === group);
    return Math.ceil(attending.length / 4);
  }

  // Function to handle group changes
  function handleGroupChange(name, newGroup, isFuss) {
    if (!name || !newGroup) return;
    
    const groupRef = databaseRef(db, isFuss ? 'fussGroups' : 'playerGroups');
    const currentGroups = isFuss ? fussGroups : playerGroups;
    
    // Update local state first
    if (isFuss) {
      setFussGroups(prev => ({
        ...prev,
        [name]: newGroup
      }));
    } else {
      setPlayerGroups(prev => ({
        ...prev,
        [name]: newGroup
      }));
    }
    
    // Update Firebase
    set(groupRef, {
      ...currentGroups,
      [name]: newGroup
    });
    
    // Show warning about group change
    setShowGroupChangedWarning(true);
  }

  // Function to render the attendance table
  function renderTable(forPlayer, isFuss) {
    const data = isFuss ? fussAttendance : attendance;
    const groups = isFuss ? fussGroups : playerGroups;
    const next5 = getNextFiveWeekdays();
    const groupKeys = isFuss ? ["A", "B"] : ["1", "2"];
    const byGroup = {};
    groupKeys.forEach(grp => byGroup[grp] = {});

    // Calculate group summaries
    next5.forEach((d) => {
      groupKeys.forEach((grp) => {
        const groupPlayers = playerPasswords
          .map((p) => p.name)
          .filter((n) => groups[n] === grp);
        const attending = groupPlayers.filter(
          (n) =>
            isFuss
              ? data[n] && data[n][d.date] && data[n][d.date] !== "Ei käinud"
              : data[n] && data[n][d.date] === "Jah"
        );
        byGroup[grp][d.date] = {
          count: attending.length,
          courts: groupCourtCount(grp, d.date, data, isFuss)
        };
      });
    });

    // Handle attendance change
    const handleAttendanceChange = (name, date, value) => {
      const newData = {
        ...data,
        [name]: {
          ...data[name],
          [date]: value
        }
      };
      
      if (isFuss) {
        setFussAttendance(newData);
        set(databaseRef(db, "fussAttendance"), newData);
      } else {
        setAttendance(newData);
        set(databaseRef(db, "attendance"), newData);
      }
    };

    return (
      <div style={{ margin: "24px 0" }}>
        <h3>Järgmise 5 päeva kokkuvõte (grupi kaupa)</h3>
        {groupKeys.map((grp) => (
          <div key={grp} style={{ marginBottom: 16 }}>
            <b>Grupp {grp}</b>
            <table className="attendance-table">
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

        <h3 style={{ marginTop: 32 }}>Osalemine</h3>
        <div style={{ overflowX: "auto" }}>
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Mängija</th>
                {next5.map((d) => (
                  <th key={d.date}>
                    {d.weekday}<br/>
                    {estonianDate(d.date)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {playerPasswords.map((p) => {
                const playerGroup = groups[p.name];
                if (playerGroup !== (forPlayer ? (isFuss ? fussGroups[forPlayer] : playerGroups[forPlayer]) : groupKeys[0])) {
                  return null;
                }
                return (
                  <tr key={p.name}>
                    <td>{p.name}</td>
                    {next5.map((d) => (
                      <td key={d.date}>
                        {forPlayer ? (
                          // Player view: keep dropdown
                          <select
                            value={data[p.name]?.[d.date] || ""}
                            onChange={(e) => handleAttendanceChange(p.name, d.date, e.target.value)}
                            disabled={forPlayer && p.name !== forPlayer}
                          >
                            <option value="">-</option>
                            <option value="Jah">Jah</option>
                            <option value="Ei">Ei</option>
                            {isFuss && <option value="Ei käinud">Ei käinud</option>}
                          </select>
                        ) : (
                          // Coach/Admin view: toggles
                          <AttendanceToggle
                            value={data[p.name]?.[d.date] || "Ei"}
                            onChange={(val) => handleAttendanceChange(p.name, d.date, val)}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

// --- Date helpers ---

function getNextFiveWeekdays() {
  const result = [];
  const today = new Date();
  while (result.length < 5) {
    const day = today.getDay();
    if (day !== 0 && day !== 6) {
      result.push(new Date(today));
    }
    today.setDate(today.getDate() + 1);
  }
  return result.map(date => ({
    date: date.toISOString().split("T")[0],
    weekday: date.toLocaleDateString("et-EE", { weekday: 'long' }),
  }));
}

function getNextPreviousWeekdays(referenceDate, count) {
  const result = [];
  const date = new Date(referenceDate);
  let checked = 0;
  while (result.length < count && checked < 60) {
    date.setDate(date.getDate() - 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) {
      result.unshift({
        date: date.toISOString().split("T")[0],
        weekday: date.toLocaleDateString("et-EE", { weekday: 'long' }),
      });
    }
    checked++;
  }
  return result;
}

function getTableDates(showPastDates, allDates) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  if (!Array.isArray(allDates)) {
    console.warn("⚠️ getTableDates called without valid allDates array");
    return [];
  }

  const futureDates = allDates
    .filter(d => {
      const date = new Date(d.date);
      return date >= today;
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  if (!showPastDates) return futureDates;

  const pastDates = allDates
    .filter(d => {
      const date = new Date(d.date);
      return date < today;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return [...pastDates, ...futureDates];
}

// --- Admin/Coach group/court summary ---

function renderAdminSummary(isFuss) {
    // Use a local tableDates variable to avoid shadowing allDates state
    const tableDates = getTableDates(showPastDates, allDates);
    const data = isFuss ? fussAttendance : attendance;
    const groups = isFuss ? fussGroups : playerGroups;
    const allPlayers = playerPasswords || [];

    // Group players by their group
    const playersByGroup = {};
    allPlayers.forEach(player => {
      const group = groups[player.name] || (isFuss ? "A" : "1");
      if (!playersByGroup[group]) {
        playersByGroup[group] = [];
      }
      playersByGroup[group].push(player);
    });

    // Sort groups
    const sortedGroups = Object.keys(playersByGroup).sort((a, b) => {
      if (isFuss) {
        return a.localeCompare(b);
      }
      return parseInt(a) - parseInt(b);
    });

    // --- NEW LOGIC ---
    return (
      <div className="admin-summary">
        <h2>{isFuss ? "Fussball" : "Tennis"} Admin Summary</h2>
        {sortedGroups.map(group => {
          const players = playersByGroup[group] || [];

          // --- Begin new summary logic ---
          // Set the start date for tracking attendance and metrics
          const startDate = new Date("2025-06-25"); // You can make this editable via state/UI later
          const today = new Date();

          const groupAttendance = players.map(player => {
            const playerData = data[player.name] || {};
            return tableDates
              .filter(d => {
                const dateObj = new Date(d.date);
                return dateObj >= startDate && dateObj <= today;
              })
              .map(date => {
                const sessionData = playerData[date.date] || {};
                return {
                  ...sessionData,
                  date: date.date,
                  player: player.name,
                };
              });
          }).flat();

          // Group data by player
          const playerStats = {};
          players.forEach(player => {
            const playerRecords = groupAttendance.filter(r => r.player === player.name);
            const tennisSessions = playerRecords.filter(r => r.sessionType === 'tennis');
            const fussSessions = playerRecords.filter(r => r.sessionType === 'fuss');

            const calculateAverage = (arr, key) =>
              arr.length === 0 ? 0 : arr.reduce((sum, r) => sum + (parseFloat(r[key]) || 0), 0) / arr.length;

            const recentRecords = playerRecords.slice(-5);
            const lastEffort = calculateAverage(recentRecords, 'effort');
            const lastMissedCoach = calculateAverage(recentRecords, 'missedCoach');
            const lastObjectiveClarity = calculateAverage(recentRecords, 'objectiveClarity');

            const totalSessions = playerRecords.length;
            const attendedSessions = playerRecords.filter(r => r.attended === true || r.attended === "Jah").length;
            const attendancePercent = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;

            playerStats[player.name] = {
              attendance: attendancePercent.toFixed(1),
              tennisCoachFeedback: calculateAverage(tennisSessions, 'coachFeedback').toFixed(1),
              fussCoachFeedback: calculateAverage(fussSessions, 'coachFeedback').toFixed(1),
              avgEffort: calculateAverage(playerRecords, 'effort').toFixed(1),
              avgMissedCoach: calculateAverage(playerRecords, 'missedCoach').toFixed(1),
              avgObjectiveClarity: calculateAverage(playerRecords, 'objectiveClarity').toFixed(1),
              significantEffortDrop: lastEffort > 0 && (lastEffort < 0.7 * calculateAverage(playerRecords, 'effort')),
              significantCoachDrop: lastMissedCoach > 0 && (lastMissedCoach < 0.7 * calculateAverage(playerRecords, 'missedCoach')),
              significantClarityDrop: lastObjectiveClarity > 0 && (lastObjectiveClarity < 0.7 * calculateAverage(playerRecords, 'objectiveClarity')),
            };
          });
          // --- End new summary logic ---

          return (
            <div key={group} className="group-summary">
              <h3>Group {group}</h3>
              <div className="summary-stats">
                <table>
                  <thead>
                    <tr>
                      <th>Mängija</th>
                      <th>Osalemine %</th>
                      <th>Tennis Coach Feedback</th>
                      <th>Füss Coach Feedback</th>
                      <th>Keskmine Raskus</th>
                      <th>Keskmine Treeneri Puudus</th>
                      <th>Keskmine Selgus</th>
                      <th>Effort Drop</th>
                      <th>Coach Drop</th>
                      <th>Clarity Drop</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map(player => (
                      <tr key={player.name}>
                        <td>{player.name}</td>
                        <td>{playerStats[player.name]?.attendance ?? "-"}</td>
                        <td>{playerStats[player.name]?.tennisCoachFeedback ?? "-"}</td>
                        <td>{playerStats[player.name]?.fussCoachFeedback ?? "-"}</td>
                        <td>{playerStats[player.name]?.avgEffort ?? "-"}</td>
                        <td>{playerStats[player.name]?.avgMissedCoach ?? "-"}</td>
                        <td>{playerStats[player.name]?.avgObjectiveClarity ?? "-"}</td>
                        <td>{playerStats[player.name]?.significantEffortDrop ? "⚠️" : ""}</td>
                        <td>{playerStats[player.name]?.significantCoachDrop ? "⚠️" : ""}</td>
                        <td>{playerStats[player.name]?.significantClarityDrop ? "⚠️" : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

// --- Password change handler ---
function handleChangePassword(e) {
  e.preventDefault();
  if (newPw1 !== newPw2) {
    setPwMessage("Paroolid ei kattu!");
    return;
  }
  if (newPw1.length < 4) {
    setPwMessage("Parool peab olema vähemalt 4 tähemärki!");
    return;
  }
  const newPwList = playerPasswords.map(p => {
    if (p.name === selectedPlayer) {
      return { ...p, password: newPw1 };
    }
    return p;
  });
  setPlayerPasswords(newPwList);
  set(databaseRef(db, "playerPasswords"), newPwList);
  setPwMessage("Parool muudetud!");
  setShowPasswordForm(false);
  setOldPw("");
  setNewPw1("");
  setNewPw2("");
}


  // --- Feedback submit/skip handlers ---
  function handleFeedbackSubmit(valObj) {
    const updates = {
      ...feedbackData[selectedPlayer],
      [feedbackQueue[currentFeedbackIdx].date]: valObj
    };
    setFeedbackData({ ...feedbackData, [selectedPlayer]: updates });
    set(databaseRef(db, "feedback/" + selectedPlayer), updates);
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
            if (!pwRow || pwRow.parent_password !== parentLoginCode) {
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
                const tennisGroup = playerGroups[selectedPlayer] || "group1";
                if (tennisGroup === "1" || tennisGroup === "group1") {
                  const scheduleBlock = schedule.tennis[tennisGroup] || {};
                  return TENNIS_GROUP1_ORDER.map(day => (
                    scheduleBlock[day] ?
                      <li key={day}>{
                        day === "Monday" ? "Esmaspäev" :
                        day === "Tuesday1" ? "Teisipäev 9:30 - 11:00" :
                        day === "Tuesday2" ? "Teisipäev 12:30 - 14:00" :
                        day === "Wednesday" ? "Kolmapäev" :
                        day === "Thursday1" ? "Neljapäev 9:30 - 11:00" :
                        day === "Thursday2" ? "Neljapäev 12:30 - 14:00" :
                        day === "Friday" ? "Reede" : day
                      }: {scheduleBlock[day]}</li>
                    : null
                  ));
                } else if (tennisGroup === "2" || tennisGroup === "group2") {
                  const scheduleBlock = schedule.tennis[tennisGroup] || {};
                  return TENNIS_GROUP2_ORDER.map(day => (
                    scheduleBlock[day] ?
                      <li key={day}>{
                        day === "Monday1" ? "Esmaspäev 9:30 - 11:00" :
                        day === "Monday2" ? "Esmaspäev 12:30 - 14:00" :
                        day === "Tuesday" ? "Teisipäev" :
                        day === "Wednesday1" ? "Kolmapäev 9:30 - 11:00" :
                        day === "Wednesday2" ? "Kolmapäev 12:30 - 14:00" :
                        day === "Thursday" ? "Neljapäev" :
                        day === "Friday" ? "Reede" : day
                      }: {scheduleBlock[day]}</li>
                    : null
                  ));
                }
                return <li>Grupp määramata</li>;
              })()}
            </ul>
          </div>
          <div>
            <b>Sinu füssi trennid:</b>
            <ul>
              {(() => {
                const tennisGroup = playerGroups[selectedPlayer] || "group1";
                const fitnessGroup = fussGroups[selectedPlayer] || "groupB";
                if (fitnessGroup === "A" || fitnessGroup === "groupA") {
                  if (tennisGroup === "1" || tennisGroup === "group1") {
                    return [
                      <li key="A1a">Esmaspäev 12:30 - 13:30</li>,
                      <li key="A1b">Kolmapäev 10:00 - 11:00</li>
                    ];
                  } else if (tennisGroup === "2" || tennisGroup === "group2") {
                    return [
                      <li key="A2a">Teisipäev 12:30 - 13:30</li>,
                      <li key="A2b">Neljapäev 10:00 - 11:00</li>
                    ];
                  }
                } else if (fitnessGroup === "B" || fitnessGroup === "groupB") {
                  if (tennisGroup === "1" || tennisGroup === "group1") {
                    return [
                      <li key="B1a">Esmaspäev 10:00 - 11:00</li>,
                      <li key="B1b">Kolmapäev 12:30 - 13:30</li>
                    ];
                  } else if (tennisGroup === "2" || tennisGroup === "group2") {
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
              {/* --- Next 5 days attendance table (dates as columns, editable) --- */}
              <div style={{ margin: "18px 0" }}>
                <h3>Järgmise 5 päeva osalemine</h3>
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>Mängija</th>
                      {getTableDates(false).map((d) => (
                        <th key={d.date}>
                          {d.weekday}<br/>{estonianDate(d.date)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{selectedPlayer}</td>
                      {getTableDates(false).map((d) => (
                        <td key={d.date}>
                          <AttendanceToggle
                            value={attendance[selectedPlayer]?.[d.date] || "Ei"}
                            onChange={val => {
                              const newData = {
                                ...attendance,
                                [selectedPlayer]: {
                                  ...attendance[selectedPlayer],
                                  [d.date]: val
                                }
                              };
                              setAttendance(newData);
                              set(databaseRef(db, "attendance"), newData);
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* --- Previous sessions attendance table (dates as columns, read-only, collapsible) --- */}
              <button onClick={() => setShowPrevTennis(v => !v)} style={{ marginBottom: 8 }}>
                {showPrevTennis ? "Peida varasemad päevad" : "Näita varasemaid päevi"}
              </button>
              {showPrevTennis && (
                <div style={{ overflowX: "auto", maxWidth: 900 }}>
                  <table className="attendance-table">
                    <thead>
                      <tr>
                        <th>Mängija</th>
                        {getTableDates(true).filter(d => new Date(d.date) < new Date()).slice(-30).map((d) => (
                          <th key={d.date}>
                            {d.weekday}<br/>{estonianDate(d.date)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{selectedPlayer}</td>
                        {getTableDates(true).filter(d => new Date(d.date) < new Date()).slice(-30).map((d) => (
                          <td key={d.date}>
                            {attendance[selectedPlayer]?.[d.date] || "-"}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {/* Füss section */}
            <div style={{ marginTop: 32 }}>
              <b>Füss:</b>
              {/* --- Next 5 days attendance table (dates as columns, editable) for fuss --- */}
              <div style={{ margin: "18px 0" }}>
                <h3>Järgmise 5 päeva osalemine</h3>
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>Mängija</th>
                      {getTableDates(false).map((d) => (
                        <th key={d.date}>
                          {d.weekday}<br/>{estonianDate(d.date)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{selectedPlayer}</td>
                      {getTableDates(false).map((d) => (
                        <td key={d.date}>
                          <AttendanceToggle
                            value={fussAttendance[selectedPlayer]?.[d.date] || "Ei"}
                            onChange={val => {
                              const newData = {
                                ...fussAttendance,
                                [selectedPlayer]: {
                                  ...fussAttendance[selectedPlayer],
                                  [d.date]: val
                                }
                              };
                              setFussAttendance(newData);
                              set(databaseRef(db, "fussAttendance"), newData);
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* --- Previous sessions attendance table (dates as columns, read-only, collapsible) for fuss --- */}
              <button onClick={() => setShowPrevFuss(v => !v)} style={{ marginBottom: 8 }}>
                {showPrevFuss ? "Peida varasemad päevad" : "Näita varasemaid päevi"}
              </button>
              {showPrevFuss && (
                <div style={{ overflowX: "auto", maxWidth: 900 }}>
                  <table className="attendance-table">
                    <thead>
                      <tr>
                        <th>Mängija</th>
                        {getTableDates(true).filter(d => new Date(d.date) < new Date()).slice(-30).map((d) => (
                          <th key={d.date}>
                            {d.weekday}<br/>{estonianDate(d.date)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{selectedPlayer}</td>
                        {getTableDates(true).filter(d => new Date(d.date) < new Date()).slice(-30).map((d) => (
                          <td key={d.date}>
                            {fussAttendance[selectedPlayer]?.[d.date] || "-"}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
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
            <b>Nädala tunniplaani:</b>
            <ul style={{ marginBottom: 8 }}>
              {(() => {
                const tennisGroup = playerGroups[parentPlayer] || "group1";
                if (tennisGroup === "1" || tennisGroup === "group1") {
                  const scheduleBlock = schedule.tennis[tennisGroup] || {};
                  return TENNIS_GROUP1_ORDER.map(day => (
                    scheduleBlock[day] ?
                      <li key={day}>{
                        day === "Monday" ? "Esmaspäev" :
                        day === "Tuesday1" ? "Teisipäev 9:30 - 11:00" :
                        day === "Tuesday2" ? "Teisipäev 12:30 - 14:00" :
                        day === "Wednesday" ? "Kolmapäev" :
                        day === "Thursday1" ? "Neljapäev 9:30 - 11:00" :
                        day === "Thursday2" ? "Neljapäev 12:30 - 14:00" :
                        day === "Friday" ? "Reede" : day
                      }: {scheduleBlock[day]}</li>
                    : null
                  ));
                } else if (tennisGroup === "2" || tennisGroup === "group2") {
                  const scheduleBlock = schedule.tennis[tennisGroup] || {};
                  return TENNIS_GROUP2_ORDER.map(day => (
                    scheduleBlock[day] ?
                      <li key={day}>{
                        day === "Monday1" ? "Esmaspäev 9:30 - 11:00" :
                        day === "Monday2" ? "Esmaspäev 12:30 - 14:00" :
                        day === "Tuesday" ? "Teisipäev" :
                        day === "Wednesday1" ? "Kolmapäev 9:30 - 11:00" :
                        day === "Wednesday2" ? "Kolmapäev 12:30 - 14:00" :
                        day === "Thursday" ? "Neljapäev" :
                        day === "Friday" ? "Reede" : day
                      }: {scheduleBlock[day]}</li>
                    : null
                  ));
                }
                return <li>Grupp määramata</li>;
              })()}
            </ul>
            <ul>
              <b>Füssi trennid:</b>
              {(() => {
                const tennisGroup = playerGroups[parentPlayer] || "group1";
                const fitnessGroup = fussGroups[parentPlayer] || "groupB";
                if (fitnessGroup === "A" || fitnessGroup === "groupA") {
                  if (tennisGroup === "1" || tennisGroup === "group1") {
                    return [
                      <li key="A1a">Esmaspäev 12:30 - 13:30</li>,
                      <li key="A1b">Kolmapäev 10:00 - 11:00</li>
                    ];
                  } else if (tennisGroup === "2" || tennisGroup === "group2") {
                    return [
                      <li key="A2a">Teisipäev 12:30 - 13:30</li>,
                      <li key="A2b">Neljapäev 10:00 - 11:00</li>
                    ];
                  }
                } else if (fitnessGroup === "B" || fitnessGroup === "groupB") {
                  if (tennisGroup === "1" || tennisGroup === "group1") {
                    return [
                      <li key="B1a">Esmaspäev 10:00 - 11:00</li>,
                      <li key="B1b">Kolmapäev 12:30 - 13:30</li>
                    ];
                  } else if (tennisGroup === "2" || tennisGroup === "group2") {
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
                {getTableDates(true).map(d => (
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
                {getTableDates(showPastDates)
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
                    set(databaseRef(db, `coachFeedback/${coachFeedbackSession.date}/${coachFeedbackSession.group}`), newData);
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
            {/* Show loading if dates not loaded */}
            {(getTableDates(showPastDates).length === 0) ? (
              <div>Laadib kuupäevi...</div>
            ) : (
              renderTable(showPastDates, activeView === "fuss")
            )}
          </div>
          <div style={{ marginBottom: 32 }}>
            <h2>Tennis</h2>
            {/* Next 5 days table (existing) */}
            {/* ...existing next 5 days table code... */}
            {/* Collapsible past attendance table */}
            {/* Show loading if dates not loaded */}
            {(getTableDates(true).length === 0) ? (
              <div>Laadib kuupäevi...</div>
            ) : (
              <>
                <button onClick={() => setShowPastTennis(v => !v)} style={{ margin: '16px 0 8px 0' }}>
                  {showPastTennis ? "Peida varasemad päevad" : "Näita varasemaid päevi"}
                </button>
                {showPastTennis && (
                  <div style={{ overflowX: 'auto', maxWidth: 1200 }}>
                    <table className="attendance-table">
                      <thead>
                        <tr>
                          <th>Mängija</th>
                          {getTableDates(true).filter(d => new Date(d.date) < new Date()).slice(-30).map(d => (
                            <th key={d.date} style={{ background: '#f6f7fa' }}>
                              {d.weekday}<br/>{estonianDate(d.date)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(playerGroups).map(([name, group]) => (
                          <tr key={name}>
                            <td>{name}</td>
                            {getTableDates(true).filter(d => new Date(d.date) < new Date()).slice(-30).map(d => (
                              <td key={d.date} style={{ background: '#f6f7fa' }}>
                                <AttendanceToggle
                                  value={attendance[d.date]?.[name] ?? "Ei"}
                                  onChange={val => {
                                    const newAttendance = {
                                      ...attendance,
                                      [d.date]: {
                                        ...attendance[d.date],
                                        [name]: val,
                                      },
                                    };
                                    setAttendance(newAttendance);
                                    set(databaseRef(db, `attendance/${d.date}`), newAttendance[d.date]);
                                  }}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
          <div>
            <h2>Füss</h2>
            {/* Next 5 days table (existing) */}
            {/* ...existing next 5 days fuss table code... */}
            {/* Collapsible past attendance table for fuss */}
            {/* Show loading if dates not loaded */}
            {(getTableDates(true).length === 0) ? (
              <div>Laadib kuupäevi...</div>
            ) : (
              <>
                <button onClick={() => setShowPastFuss(v => !v)} style={{ margin: '16px 0 8px 0' }}>
                  {showPastFuss ? "Peida varasemad päevad" : "Näita varasemaid päevi"}
                </button>
                {showPastFuss && (
                  <div style={{ overflowX: 'auto', maxWidth: 1200 }}>
                    <table className="attendance-table">
                      <thead>
                        <tr>
                          <th>Mängija</th>
                          {getTableDates(true).filter(d => new Date(d.date) < new Date()).slice(-30).map(d => (
                            <th key={d.date} style={{ background: '#f6f7fa' }}>
                              {d.weekday}<br/>{estonianDate(d.date)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(fussGroups).map(([name, group]) => (
                          <tr key={name}>
                            <td>{name}</td>
                            {getTableDates(true).filter(d => new Date(d.date) < new Date()).slice(-30).map(d => (
                              <td key={d.date} style={{ background: '#f6f7fa' }}>
                                <AttendanceToggle
                                  value={fussAttendance[d.date]?.[name] ?? "Ei"}
                                  onChange={val => {
                                    const newAttendance = {
                                      ...fussAttendance,
                                      [d.date]: {
                                        ...fussAttendance[d.date],
                                        [name]: val,
                                      },
                                    };
                                    setFussAttendance(newAttendance);
                                    set(databaseRef(db, `fussAttendance/${d.date}`), newAttendance[d.date]);
                                  }}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {step === "admin" && adminMode && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <button style={{ marginRight: 12 }} onClick={() => setShowAddPlayer(true)}>
              Lisa mängija
            </button>
            <button onClick={() => setGroupAssignMode(true)}>Muuda gruppe</button>
            <button onClick={() => setShowScheduleModal(true)} style={{ marginLeft: 12 }}>
              Muuda tunniplaani
            </button>
            <button
              onClick={() =>
                downloadExcel(
                  attendance,
                  playerGroups,
                  fussAttendance,
                  fussGroups,
                  getNextFiveWeekdays()
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

          {/* Tennis Groups */}
          <div style={{ marginBottom: 32 }}>
            <h2>Tennis</h2>
            {/* Main attendance table with show/hide past dates */}
            <button onClick={() => setShowPastDates(v => !v)} style={{ margin: '16px 0 8px 0' }}>
              {showPastDates ? "Peida varasemad päevad" : "Näita varasemaid päevi"}
            </button>
            {(() => {
              // Use getTableDates(showPastDates) for tableDates
              const tableDates = getTableDates(showPastDates, dates);
              // Guard clause: wait for players or tableDates
              if (!tableDates || tableDates.length === 0 || !playerGroups || Object.keys(playerGroups).length === 0) {
                console.log("⛔ Waiting for playerGroups or tableDates...", { playerGroups, tableDates });
                return <div>Ootab mängijate või kuupäevi...</div>;
              }
              // Table rendering: show player names, not group numbers
              return (
                <div>
                  <h2>Treeningute kohalolek</h2>
                  <table>
                    <thead>
                      <tr>
                        <th>Mängija</th>
                        {tableDates.map((date) => (
                          <th key={date.date}>
                            {date.weekday}<br/>{estonianDate(date.date)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(playerGroups).map(([name, group]) => (
                        <tr key={name}>
                          <td>{name}</td>
                          {tableDates.map((date) => (
                            <td key={date.date}>
                              <AttendanceToggle
                                value={attendance[date.date]?.[name] || "Ei"}
                                onChange={(val) => {
                                  const newAttendance = {
                                    ...attendance,
                                    [date.date]: {
                                      ...attendance[date.date],
                                      [name]: val,
                                    },
                                  };
                                  setAttendance(newAttendance);
                                  set(
                                    databaseRef(db, `attendance/${date.date}`),
                                    newAttendance[date.date]
                                  );
                                }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>

          {/* Fuss Groups */}
          <div>
            <h2>Füss</h2>
            <div style={{ display: "flex", gap: 24 }}>
              {/* Group A */}
              <div style={{ flex: 1 }}>
                <h3>Grupp A</h3>
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>Mängija</th>
                      {getTableDates(false).map((date) => (
                        <th key={date.date}>{estonianDate(date.date)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(fussGroups)
                      .filter(([_, group]) => group === "A")
                      .map(([name]) => (
                        <tr key={name}>
                          <td>{name}</td>
                          {getTableDates(false).map((date) => (
                            <td key={date.date}>
                              <AttendanceToggle
                                value={fussAttendance[date.date]?.[name] || "Ei"}
                                onChange={(val) => {
                                  const newAttendance = {
                                    ...fussAttendance,
                                    [date.date]: {
                                      ...fussAttendance[date.date],
                                      [name]: val,
                                    },
                                  };
                                  setFussAttendance(newAttendance);
                                  set(
                                    databaseRef(db, `fussAttendance/${date.date}`),
                                    newAttendance[date.date]
                                  );
                                }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Group B */}
              <div style={{ flex: 1 }}>
                <h3>Grupp B</h3>
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>Mängija</th>
                      {getTableDates(false).map((date) => (
                        <th key={date.date}>{estonianDate(date.date)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(fussGroups)
                      .filter(([_, group]) => group === "B")
                      .map(([name]) => (
                        <tr key={name}>
                          <td>{name}</td>
                          {getTableDates(false).map((date) => (
                            <td key={date.date}>
                              <AttendanceToggle
                                value={fussAttendance[date.date]?.[name] || "Ei"}
                                onChange={(val) => {
                                  const newAttendance = {
                                    ...fussAttendance,
                                    [date.date]: {
                                      ...fussAttendance[date.date],
                                      [name]: val,
                                    },
                                  };
                                  setFussAttendance(newAttendance);
                                  set(
                                    databaseRef(db, `fussAttendance/${date.date}`),
                                    newAttendance[date.date]
                                  );
                                }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    {/* Add Player Modal (admin) */}
    {showAddPlayer && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: 400,
          width: '90%'
        }}>
          <h2>Lisa uus mängija</h2>
          <form
            onSubmit={handleAddPlayer}
            className="add-player-form"
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
            <div style={{ marginBottom: 14 }}>
              <label>Vanema kood:<br/>
                <input value={newParentPw} type="password" onChange={e => setNewParentPw(e.target.value)} style={{ width: "98%" }} required />
              </label>
            </div>
            {addPlayerError && <div style={{ color: "#d00", marginBottom: 10 }}>{addPlayerError}</div>}
            <button type="submit" style={{ fontWeight: 600, fontSize: 16 }}>Lisa mängija</button>
            <button 
              type="button" 
              onClick={() => setShowAddPlayer(false)}
              style={{ marginLeft: 12 }}
            >
              Tühista
            </button>
          </form>
        </div>
      </div>
    )}

    {/* Group Assignment Modal */}
    {groupAssignMode && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: 800,
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          <h2>Muuda gruppe</h2>
          <div style={{ display: "flex", gap: 24 }}>
            <div style={{ flex: 1 }}>
              <h3>Tennis</h3>
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Mängija</th>
                    <th>Grupp</th>
                  </tr>
                </thead>
                <tbody>
                  {playerPasswords.map(p => (
                    <tr key={p.name}>
                      <td>{p.name}</td>
                      <td>
                        <select
                          value={playerGroups[p.name] || "1"}
                          onChange={e => handleGroupChange(p.name, e.target.value, false)}
                        >
                          <option value="1">1</option>
                          <option value="2">2</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ flex: 1 }}>
              <h3>Füss</h3>
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Mängija</th>
                    <th>Grupp</th>
                  </tr>
                </thead>
                <tbody>
                  {playerPasswords.map(p => (
                    <tr key={p.name}>
                      <td>{p.name}</td>
                      <td>
                        <select
                          value={fussGroups[p.name] || "A"}
                          onChange={e => handleGroupChange(p.name, e.target.value, true)}
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <button onClick={() => setGroupAssignMode(false)}>Sulge</button>
          </div>
        </div>
      </div>
    )}

    {/* Add Schedule Modal */}
    {showScheduleModal && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: 800,
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}>
          <h2>Muuda tunniplaani</h2>
          
          {/* Add tabs */}
          <div style={{ marginBottom: 20, borderBottom: '1px solid #ccc' }}>
            <button 
              onClick={() => setActiveScheduleTab('tennis')}
              style={{
                padding: '8px 16px',
                marginRight: 8,
                border: 'none',
                background: activeScheduleTab === 'tennis' ? '#007bff' : 'transparent',
                color: activeScheduleTab === 'tennis' ? 'white' : 'black',
                cursor: 'pointer'
              }}
            >
              Tennis
            </button>
            <button 
              onClick={() => setActiveScheduleTab('fuss')}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: activeScheduleTab === 'fuss' ? '#007bff' : 'transparent',
                color: activeScheduleTab === 'fuss' ? 'white' : 'black',
                cursor: 'pointer'
              }}
            >
              Füss
            </button>
          </div>

          {activeScheduleTab === 'tennis' ? (
            <div style={{ display: "flex", gap: 24 }}>
              <div style={{ flex: 1 }}>
                <h3>Grupp 1</h3>
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>Päev</th>
                      <th>Aeg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TENNIS_GROUP1_ORDER.map(day => (
                      schedule.tennis.group1[day] ?
                        <tr key={day}>
                          <td>{
                            day === "Monday" ? "Esmaspäev" :
                            day === "Tuesday1" ? "Teisipäev 9:30 - 11:00" :
                            day === "Tuesday2" ? "Teisipäev 12:30 - 14:00" :
                            day === "Wednesday" ? "Kolmapäev" :
                            day === "Thursday1" ? "Neljapäev 9:30 - 11:00" :
                            day === "Thursday2" ? "Neljapäev 12:30 - 14:00" :
                            day === "Friday" ? "Reede" : day
                          }</td>
                          <td>
                            <input
                              type="text"
                              value={schedule.tennis.group1[day]}
                              onChange={(e) => handleScheduleChange('tennis', 'group1', day, e.target.value)}
                              style={{ width: '100%' }}
                            />
                          </td>
                        </tr>
                      : null
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ flex: 1 }}>
                <h3>Grupp 2</h3>
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>Päev</th>
                      <th>Aeg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TENNIS_GROUP2_ORDER.map(day => (
                      schedule.tennis.group2[day] ?
                        <tr key={day}>
                          <td>{
                            day === "Monday1" ? "Esmaspäev 9:30 - 11:00" :
                            day === "Monday2" ? "Esmaspäev 12:30 - 14:00" :
                            day === "Tuesday" ? "Teisipäev" :
                            day === "Wednesday1" ? "Kolmapäev 9:30 - 11:00" :
                            day === "Wednesday2" ? "Kolmapäev 12:30 - 14:00" :
                            day === "Thursday" ? "Neljapäev" :
                            day === "Friday" ? "Reede" : day
                          }</td>
                          <td>
                            <input
                              type="text"
                              value={schedule.tennis.group2[day]}
                              onChange={(e) => handleScheduleChange('tennis', 'group2', day, e.target.value)}
                              style={{ width: '100%' }}
                            />
                          </td>
                        </tr>
                      : null
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 24 }}>
              <div style={{ flex: 1 }}>
                <h3>Grupp A</h3>
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>Päev</th>
                      <th>Aeg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FUSS_GROUP_ORDER.map(day => (
                      schedule.fuss.groupA[day] ?
                        <tr key={day}>
                          <td>{
                            day === "Monday" ? "Esmaspäev" :
                            day === "Tuesday" ? "Teisipäev" :
                            day === "Wednesday" ? "Kolmapäev" :
                            day === "Thursday" ? "Neljapäev" :
                            day === "Friday" ? "Reede" : day
                          }</td>
                          <td>
                            <input
                              type="text"
                              value={schedule.fuss.groupA[day]}
                              onChange={(e) => handleScheduleChange('fuss', 'groupA', day, e.target.value)}
                              style={{ width: '100%' }}
                            />
                          </td>
                        </tr>
                      : null
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ flex: 1 }}>
                <h3>Grupp B</h3>
                <table className="attendance-table">
                  <thead>
                    <tr>
                      <th>Päev</th>
                      <th>Aeg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {FUSS_GROUP_ORDER.map(day => (
                      schedule.fuss.groupB[day] ?
                        <tr key={day}>
                          <td>{
                            day === "Monday" ? "Esmaspäev" :
                            day === "Tuesday" ? "Teisipäev" :
                            day === "Wednesday" ? "Kolmapäev" :
                            day === "Thursday" ? "Neljapäev" :
                            day === "Friday" ? "Reede" : day
                          }</td>
                          <td>
                            <input
                              type="text"
                              value={schedule.fuss.groupB[day]}
                              onChange={(e) => handleScheduleChange('fuss', 'groupB', day, e.target.value)}
                              style={{ width: '100%' }}
                            />
                          </td>
                        </tr>
                      : null
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div style={{ marginTop: 20 }}>
            <button onClick={() => setShowScheduleModal(false)}>Sulge</button>
          </div>
        </div>
      </div>
    )}

    {/* ... existing code ... */}

    {/* ...existing code ... */}
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
    // Use tableDates (from getTableDates) instead of dates if available
    const tableDates = getTableDates(true, dates);
    const validDates = tableDates.map(d => d.date);
    const feedbackDatesSet = new Set();
    for (const n of groupPlayers) {
      if (feedbackData[n]) {
        for (const d of Object.keys(feedbackData[n])) {
          feedbackDatesSet.add(d);
        }
      }
    }
    const feedbackDates = Array.from(feedbackDatesSet).filter(d => validDates.includes(d));
    const feedbackDateObjs = feedbackDates
      .map(dateStr => tableDates.find(d => d.date === dateStr))
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
              <th>"Rahulolematuid"</th>
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
  // Use tableDates (from getTableDates) instead of dates if available
  const tableDates = getTableDates(true, dates);
  const estonianDateStr = tableDates.find(d => d.date === date)?.weekday + " " + (tableDates.find(d => d.date === date)?.date || "");
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


// --- Helper: get next 5 weekdays ---
function getNextFiveWeekdays() {
  const result = [];
  const current = new Date();
  while (result.length < 5) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      const d = current.toISOString().split("T")[0];
      result.push({ date: d, weekday: ["P", "E", "T", "K", "N", "R", "L"][day] });
    }
    current.setDate(current.getDate() + 1);
  }
  return result;
}


// --- getTableDates helper ---
function getTableDates(showPastDates) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!Array.isArray(allDates)) return [];

  const parsedDates = allDates.map(d => ({
    ...d,
    dateObj: new Date(d.date)
  }));

  const futureDates = parsedDates
    .filter(d => d.dateObj >= today)
    .sort((a, b) => a.dateObj - b.dateObj)
    .slice(0, 5);

  if (!showPastDates) {
    return futureDates.map(({ date, weekday }) => ({ date, weekday }));
  }

  const pastDates = parsedDates
    .filter(d => d.dateObj < today)
    .sort((a, b) => b.dateObj - a.dateObj)
    .slice(0, 30)
    .reverse();

  return [
    ...pastDates.map(({ date, weekday }) => ({ date, weekday })),
    ...futureDates.map(({ date, weekday }) => ({ date, weekday }))
  ];
}




export default App;