import React, { useEffect, useMemo, useState } from 'react';
import { onValue, ref as databaseRef, set } from 'firebase/database';
import logo from './Logo.png';
import playerPasswordsData from './player_passwords.json';
import parentPasswordsData from './parent_passwords.json';
import { db } from './firebase';
import AttendanceToggleWithEffort from './components/AttendanceToggleWithEffort';
import AttendanceToggle from './components/AttendanceToggle';
import SessionOptionsManager from './components/admin/SessionOptionsManager';
import SessionOverview from './components/coach/SessionOverview';
import PlayerScheduleView from './components/player/PlayerScheduleView';
import PlayerTopBar from './components/player/PlayerTopBar';
import SessionsView from './components/admin/SessionsView';
import { handleDownloadExcel } from './utils/excelExport';
import { estonianDate } from './utils'; // Shared utility
import {
  getPlayerTennisTime,
  getPlayerFitnessTime,
  getTennisPlayersForDayTime,
  getFitnessPlayersForDayTime
} from './utils/scheduleUtils';

// New data layer imports for player-based scheduling
import {
  subscribeToAllSessionOptions,
  subscribeToPlayerSchedules,
  subscribeToAllOverrides,
  getPlayersForSession,
  getDayNameFromDate,
  isDateInPast,
  getSessionsForDay,
  formatSessionTime,
  getCapacityStatus,
  getCapacityColor,
  formatCapacity,
  CAPACITY_STATUS,
  runMigration,
  isMigrationComplete,
  loginUser,
  updatePlayerAttendance,
  COACH_FEEDBACK_EMOJI,
  FEEDBACK_EMOJI_Q1,
  FEEDBACK_EMOJI_Q2,
  FEEDBACK_EMOJI_Q3,
  getCoachFeedback
} from './data';


const TENNIS_GROUP1_ORDER = [
  'Monday',
  'Tuesday1',
  'Tuesday2',
  'Wednesday',
  'Thursday1',
  'Thursday2',
  'Friday'
];

const TENNIS_GROUP2_ORDER = [
  'Monday1',
  'Monday2',
  'Tuesday',
  'Wednesday1',
  'Wednesday2',
  'Thursday',
  'Friday'
];

const FUSS_GROUP_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// estonianDate moved to src/utils/index.js

function formatMobileName(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return parts[0];
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1].charAt(0);
  return `${firstName} ${lastInitial}.`;
}

function App() {
  // Persist login state from localStorage on mount
  useEffect(() => {
    // Restore role-based login persistence
    const savedStep = localStorage.getItem("step");
    const savedCoachMode = localStorage.getItem("coachMode") === "true";
    const savedAdminMode = localStorage.getItem("adminMode") === "true";
    const savedPlayer = localStorage.getItem("selectedPlayer");
    const savedParent = localStorage.getItem("selectedParent");

    if (savedStep) setStep(savedStep);
    if (savedCoachMode) setCoachMode(true);
    if (savedAdminMode) setAdminMode(true);
    if (savedPlayer) {
      setSelectedPlayer(savedPlayer);
      setPlayerMode(true);
    }
    if (savedParent) {
      setSelectedParent(savedParent);
      setParentMode(true);
    }
  }, []);

  // Styles previously injected here are now handled by components or index.css
  // Leaving this hook empty or removing entirely if no other styles needed


  const handleAttendanceChange = async (date, sport, value, sessionId) => {
    try {
      const playerToUpdate = selectedPlayer || currentUser?.username;
      if (!playerToUpdate) return;

      // sessionId is passed from PlayerScheduleView to support multi-session distinction
      await updatePlayerAttendance(date, playerToUpdate, value, sessionId);
    } catch (err) {
      console.error("Attendance update failed:", err);
      alert("Ebaõnnestus osalemise muutmine.");
    }
  };

  const dates = useMemo(() => getNextFiveWeekdays(), []);
  const [currentUser, setCurrentUser] = useState(null); // { username, role, ... }
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [playerPasswords, setPlayerPasswords] = useState(
    Array.isArray(playerPasswordsData) ? playerPasswordsData : Object.values(playerPasswordsData)
  );
  const [parentPasswords, setParentPasswords] = useState(
    Array.isArray(parentPasswordsData) ? parentPasswordsData : Object.values(parentPasswordsData)
  );
  // REMOVED: playerGroups, fussGroups
  const [showPastDates, setShowPastDates] = useState(false);
  const [attendance, setAttendance] = useState({});
  const [allDates, setAllDates] = useState([]);
  const [fussAttendance, setFussAttendance] = useState({});
  const [fussEffort, setFussEffort] = useState({});
  const [adminMode, setAdminMode] = useState(false);
  const [coachMode, setCoachMode] = useState(false);
  // Restore coach mode from localStorage on mount
  useEffect(() => {
    const savedCoachMode = localStorage.getItem("coachMode");
    if (savedCoachMode === "true") {
      setStep("coach");
      setCoachMode(true);
    }
  }, []);
  const [parentMode, setParentMode] = useState(false);
  const [playerMode, setPlayerMode] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [feedbackData, setFeedbackData] = useState({});
  const [coachFeedbackData, setCoachFeedbackData] = useState({});
  const [oldPw, setOldPw] = useState('');
  const [newPw1, setNewPw1] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [step, setStep] = useState('login');
  const [coachLoginPassword, setCoachLoginPassword] = useState('');
  const [coachLoginError, setCoachLoginError] = useState('');
  const [parentPlayer, setParentPlayer] = useState(null);
  const [parentLoginCode, setParentLoginCode] = useState('');
  const [parentError, setParentError] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackQueue, setFeedbackQueue] = useState([]);
  const [currentFeedbackIdx, setCurrentFeedbackIdx] = useState(0);
  // REMOVED: groupAssignMode, showGroupChangedWarning
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showOldParent, setShowOldParent] = useState(false);
  const [showCoachFeedbackModal, setShowCoachFeedbackModal] = useState(false);
  const [coachFeedbackSession, setCoachFeedbackSession] = useState(null);
  const [tennisSessionsCompleted, setTennisSessionsCompleted] = useState({});
  const [activeView, setActiveView] = useState('tennis');
  const [coachViewMode, setCoachViewMode] = useState('dashboard');
  // REMOVED: showGroupPrompt
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [addPlayerError, setAddPlayerError] = useState('');
  const [newPlayerFirst, setNewPlayerFirst] = useState('');
  const [newPlayerLast, setNewPlayerLast] = useState('');
  const [newPlayerPw, setNewPlayerPw] = useState('');
  const [newParentPw, setNewParentPw] = useState('');
  // REMOVED: newTennisGroup, newFussGroup
  const [archivedPlayers, setArchivedPlayers] = useState([]);
  const [activePlayerTab, setActivePlayerTab] = useState('active');
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [playerToDelete, setPlayerToDelete] = useState(null);
  const [COACH_FEEDBACK_EMOJI, setCOACH_FEEDBACK_EMOJI] = useState([
    { val: 1, icon: "😞", label: "Väga väike" },
    { val: 2, icon: "😕", label: "Keskmisest väiksem" },
    { val: 3, icon: "😐", label: "Keskmine" },
    { val: 4, icon: "🙂", label: "Keskmisest suurem" },
    { val: 5, icon: "💪", label: "Väga suur" }
  ]);
  // REMOVED: showScheduleModal, schedule, activeScheduleTab, showPrevTennis, showPrevFuss, showPastTennis, showPastFuss

  // New state for player-based scheduling
  const [sessionOptions, setSessionOptions] = useState({ tennis: {}, fuss: {} });
  // REMOVED: playerWeeklySchedules
  const [scheduleOverrides, setScheduleOverrides] = useState({});
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState(null);

  // Subscribe to new schedule data
  useEffect(() => {
    if (!db) return;

    // Session options subscription
    const unsubOptions = subscribeToAllSessionOptions((data) => {
      setSessionOptions(data);
    });

    // Schedule overrides subscription
    const unsubOverrides = subscribeToAllOverrides((data) => {
      setScheduleOverrides(data);
    });

    return () => {
      if (typeof unsubOptions === 'function') unsubOptions();
      if (typeof unsubOverrides === 'function') unsubOverrides();
    };
  }, [db]);

  useEffect(() => {
    const datesRef = databaseRef(db, 'dates');
    return onValue(datesRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      const parsed = Object.keys(data).map((dateKey) => ({
        date: dateKey,
        weekday: new Date(dateKey).toLocaleDateString('et-EE', { weekday: 'long' })
      }));
      setAllDates(parsed);
    });
  }, []);

  // Removed legacy schedule subscription

  useEffect(() => {
    if (!db) return;

    const tennisAttendanceRef = databaseRef(db, 'attendance');
    onValue(tennisAttendanceRef, (snapshot) => {
      setAttendance(snapshot.val() || {});
    });

    const fussAttendanceRef = databaseRef(db, 'fussAttendance');
    onValue(fussAttendanceRef, (snapshot) => {
      setFussAttendance(snapshot.val() || {});
    });

    const fussEffortRef = databaseRef(db, 'fussEffort');
    onValue(fussEffortRef, (snapshot) => {
      setFussEffort(snapshot.val() || {});
    });

    const tennisSessionsRef = databaseRef(db, 'tennisSessionsCompleted');
    onValue(tennisSessionsRef, (snapshot) => {
      setTennisSessionsCompleted(snapshot.val() || {});
    });

    // Removed playerGroups and fussGroups subscriptions

    // Listener for player feedback
    const feedbackRef = databaseRef(db, 'feedback');
    onValue(feedbackRef, (snapshot) => {
      setFeedbackData(snapshot.val() || {});
    });

    // Listener for coach feedback
    const coachFeedbackRef = databaseRef(db, 'coachFeedback');
    onValue(coachFeedbackRef, (snapshot) => {
      const val = snapshot.val() || {};
      console.log('App.js loaded coachFeedbackData:', Object.keys(val).length, val);
      setCoachFeedbackData(val);
    });

    const archivedPlayersRef = databaseRef(db, 'archivedPlayers');
    onValue(archivedPlayersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setArchivedPlayers(Array.isArray(data) ? data : Object.values(data));
      } else {
        setArchivedPlayers([]);
      }
    });
  }, [db, playerPasswords]);

  // Removed default group initialization effect

  function handleScheduleChange() { }

  // Function to handle coach feedback
  function handleCoachFeedback(newData) {
    if (!coachFeedbackSession) return;
    set(databaseRef(db, `coachFeedback/${coachFeedbackSession.date}/${coachFeedbackSession.group}`), newData);
    setShowCoachFeedbackModal(false);
  }



  // Function to mark tennis session as completed
  function markTennisSessionCompleted() { }

  // Function to handle login
  // Function to handle login
  async function handleLogin(e) {
    e.preventDefault();
    setSelectedPlayer(null);
    setAdminMode(false);
    setCoachMode(false);
    setParentMode(false);
    setPlayerMode(false);
    setSelectedParent(null);
    setCurrentUser(null);
    setCoachLoginError('');

    try {
      const user = await loginUser(loginName, loginPassword);
      console.log("Logged in user:", user);
      setCurrentUser(user);

      // Clear sensitive fields
      setLoginName("");
      setLoginPassword("");
      setCoachLoginPassword("");

      // Persist basic role info for restoration (optional, or rely on currentUser)
      localStorage.setItem("step", user.role);

      if (user.role === 'admin') {
        setStep("admin");
        setAdminMode(true);
        localStorage.setItem("adminMode", true);
      }
      else if (user.role === 'coach') {
        setStep("coach");
        setCoachMode(true);
        localStorage.setItem("coachMode", true);
        // If coach has specific permissions, we might want to store them or rely on currentUser state
      }
      else if (user.role === 'parent') {
        setStep("parent");
        setParentMode(true);
        setSelectedParent(user.username);
        localStorage.setItem("selectedParent", user.username);
        // Automatically select first child if available
        if (user.linkedPlayers && user.linkedPlayers.length > 0) {
          setSelectedPlayer(user.linkedPlayers[0]);
          localStorage.setItem("selectedPlayer", user.linkedPlayers[0]);
        }
      }
      else if (user.role === 'player') {
        setStep("player");
        setPlayerMode(true);
        setSelectedPlayer(user.username);
        localStorage.setItem("selectedPlayer", user.username);
      }

    } catch (error) {
      console.error("Login error:", error);
      alert(error.message || "Sisselogimine ebaõnnestus");
    }
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

    // REMOVED: Default group assignment (legacy)

    setShowAddPlayer(false);
    setNewPlayerFirst("");
    setNewPlayerLast("");
    setNewPlayerPw("");
    setNewParentPw("");
    setAddPlayerError("");
  }

  // Function to archive (delete) a player
  function handleArchivePlayer() {
    if (!playerToDelete) return;

    const playerData = playerPasswords.find(p => p.name === playerToDelete);
    const parentData = parentPasswords.find(p => p.name === playerToDelete);

    if (!playerData) return;

    // Create archived player record
    const archivedPlayer = {
      ...playerData,
      parentPassword: parentData?.parent_password || '',
      // REMOVED: group assignments
      archivedDate: new Date().toISOString()
    };

    // Add to archived players
    const updatedArchived = [...archivedPlayers, archivedPlayer];
    setArchivedPlayers(updatedArchived);
    set(databaseRef(db, 'archivedPlayers'), updatedArchived);

    // Remove from active players
    const updatedPlayerPasswords = playerPasswords.filter(p => p.name !== playerToDelete);
    const updatedParentPasswords = parentPasswords.filter(p => p.name !== playerToDelete);

    setPlayerPasswords(updatedPlayerPasswords);
    setParentPasswords(updatedParentPasswords);
    set(databaseRef(db, 'playerPasswords'), updatedPlayerPasswords);
    set(databaseRef(db, 'parentPasswords'), updatedParentPasswords);

    // REMOVED: Group removal (legacy)

    // Close confirmation dialog
    setShowDeleteConfirm(false);
    setPlayerToDelete(null);
  }

  // Function to restore an archived player
  function handleRestorePlayer(archivedPlayer) {
    // Add back to active players
    const newPlayerData = {
      name: archivedPlayer.name,
      password: archivedPlayer.password,
      parentPassword: archivedPlayer.parentPassword
    };

    const newParentData = {
      name: archivedPlayer.name,
      parent_password: archivedPlayer.parentPassword
    };

    const updatedPlayerPasswords = [...playerPasswords, newPlayerData];
    const updatedParentPasswords = [...parentPasswords, newParentData];

    setPlayerPasswords(updatedPlayerPasswords);
    setParentPasswords(updatedParentPasswords);
    set(databaseRef(db, 'playerPasswords'), updatedPlayerPasswords);
    set(databaseRef(db, 'parentPasswords'), updatedParentPasswords);

    // REMOVED: Group restoration (legacy)

    // Remove from archived players
    const updatedArchived = archivedPlayers.filter(p => p.name !== archivedPlayer.name);
    setArchivedPlayers(updatedArchived);
    set(databaseRef(db, 'archivedPlayers'), updatedArchived);
  }

  // Hook placeholders to avoid conditional usage warnings




  // Sort queue by date ascending (oldest first) so they catch up chronologically



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
    today.setHours(0, 0, 0, 0); // Normalize to midnight
    const todayStr = today.toISOString().split("T")[0];

    if (!Array.isArray(allDates)) {
      console.warn("⚠️ getTableDates called without valid allDates array");
      return [];
    }

    const futureDates = allDates
      .filter(d => {
        const date = new Date(d.date);
        date.setHours(0, 0, 0, 0); // Normalize to midnight
        return date >= today;
      })
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);

    if (!showPastDates) return futureDates;

    const pastDates = allDates
      .filter(d => {
        const date = new Date(d.date);
        date.setHours(0, 0, 0, 0); // Normalize to midnight
        return date < today;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // Fix: Limit default history to last 7 days
    // "Näita varasemaid päevi" (showPastDates=true) currently loads EVERYTHING.
    // We want to limit it or step it.
    // But for now, let's just reverse it so we see recent past first?
    // Requirement: "Default history window: last 7 days".
    // This implies showPastDates=false should show recent past?
    // No, usually "past" is hidden by default.
    // The toggle is "Näita varasemaid päevi".
    // If toggled ON, we should limit to 7 days? "Shows full history -> Expected last 7 days".
    // So if showPastDates is TRUE, we take last 7.

    if (showPastDates) {
      // Take last 7
      const start = Math.max(0, pastDates.length - 7);
      return [...pastDates.slice(start), ...futureDates];
    }

    return futureDates;
  }

  // --- Admin/Coach group/court summary ---



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
    const newPwList = playerPasswords.map((p) => {
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
      [feedbackQueue[currentFeedbackIdx].date]: valObj,
    };
    setFeedbackData({ ...feedbackData, [selectedPlayer]: updates });
    set(databaseRef(db, `feedback/${selectedPlayer}`), updates);
    nextFeedback();
  }

  function handleFeedbackSkip() {
    nextFeedback();
  }

  function nextFeedback() {
    if (currentFeedbackIdx + 1 < feedbackQueue.length) {
      setCurrentFeedbackIdx((i) => i + 1);
    } else {
      setShowFeedbackModal(false);
    }
  }

  const handleSessionsViewAttendanceChange = (sport, newAttendance, date) => {
    if (sport === 'tennis') {
      setAttendance(newAttendance);
      if (date) {
        set(databaseRef(db, `attendance/${date}`), newAttendance[date]);
      }
    } else {
      setFussAttendance(newAttendance);
      if (date) {
        set(databaseRef(db, `fussAttendance/${date}`), newAttendance[date]);
      }
    }
  };

  function handleFeedbackAttendanceChange(session) {
    const { date, type } = session;
    const attVal = "Ei";

    if (type === 'fuss') {
      const newAtt = {
        ...fussAttendance,
        [date]: {
          ...fussAttendance[date],
          [selectedPlayer]: attVal
        }
      };
      setFussAttendance(newAtt);
      set(databaseRef(db, `fussAttendance/${date}/${selectedPlayer}`), attVal);
    } else {
      const newAtt = {
        ...attendance,
        [date]: {
          ...attendance[date],
          [selectedPlayer]: attVal
        }
      };
      setAttendance(newAtt);
      set(databaseRef(db, `attendance/${date}/${selectedPlayer}`), attVal);
    }

    // Remove existing feedback if present
    if (feedbackData[selectedPlayer]?.[date]) {
      const updates = { ...feedbackData[selectedPlayer] };
      delete updates[date];
      setFeedbackData({ ...feedbackData, [selectedPlayer]: updates });
      set(databaseRef(db, `feedback/${selectedPlayer}/${date}`), null);
    }

    nextFeedback();
  }


  // --- Main UI ---
  return (
    <>
      <div className="container">
        <img src={logo} alt="Logo" style={{ width: 100, margin: 24 }} />
        <h1>Tallink Tennis Treeningute Märkimine</h1>
        {/* End of main container div */}
        {/* LOGIN FORM */}
        {step === "login" && (
          <div className="login-container">
            <h2>Logi sisse</h2>
            <form onSubmit={handleLogin}>
              <div>
                <label>Kasutajanimi:</label>
                <input
                  type="text"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label>Parool:</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit">Sisene</button>
            </form>
          </div>
        )}
        {/* COACH VIEW */}
        {step === "coach" && (
          <div>
            <div>
              <h2>Treeneri vaade</h2>
              <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setCoachViewMode('dashboard')}
                  style={{
                    padding: '8px 16px',
                    background: coachViewMode === 'dashboard' ? '#007bff' : 'white',
                    color: coachViewMode === 'dashboard' ? 'white' : '#007bff',
                    border: '1px solid #007bff',
                    borderRadius: 4,
                    fontWeight: coachViewMode === 'dashboard' ? 'bold' : 'normal'
                  }}
                >
                  Töölauad
                </button>
                <button
                  onClick={() => setCoachViewMode('sessions')}
                  style={{
                    padding: '8px 16px',
                    background: coachViewMode === 'sessions' ? '#007bff' : 'white',
                    color: coachViewMode === 'sessions' ? 'white' : '#007bff',
                    border: '1px solid #007bff',
                    borderRadius: 4,
                    fontWeight: coachViewMode === 'sessions' ? 'bold' : 'normal'
                  }}
                >
                  Treeningud
                </button>
                <button
                  onClick={() => {
                    localStorage.clear();
                    setStep("login");
                    setCoachMode(false);
                    setAdminMode(false);
                    setParentMode(false);
                    setPlayerMode(false);
                    setSelectedPlayer(null);
                    setSelectedParent(null);
                    setCoachLoginPassword("");
                    setCoachLoginError("");
                  }}
                  style={{ marginLeft: 'auto' }}
                >
                  Logi välja
                </button>
              </div>

              {coachViewMode === 'sessions' ? (
                <SessionsView
                  isAdmin={false}
                  playerPasswords={playerPasswords}
                  sessionOptions={sessionOptions}
                  // REMOVED: playerWeeklySchedules
                  scheduleOverrides={scheduleOverrides}
                  attendance={attendance}
                  fussAttendance={fussAttendance}
                  onAttendanceChange={handleSessionsViewAttendanceChange}
                  allDates={allDates}
                  currentUser={currentUser}
                />
              ) : (
                <>
                  <button
                    data-testid="tab-tennis"
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
                    data-testid="tab-fuss"
                    onClick={() => setActiveView("fuss")}
                    style={{
                      background: activeView === "fuss" ? "#ffe066" : "",
                      fontWeight: activeView === "fuss" ? "bold" : ""
                    }}
                  >
                    Füss
                  </button>
                  <div style={{ marginBottom: 16 }}>
                    {/* Groups are now managed via SessionsView, no separate button needed here */}
                    {/* No Excel export button in coach view */}

                  </div>
                  {/* Feedback summary section intentionally not rendered in coach view */}
                  {/* Coach feedback section - only show for tennis view */}
                  {/* Coach Dashboard - Session Cards */}
                  {activeView === "tennis" && (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h2>Töölaud (Viimased 7 päeva)</h2>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
                        {getTableDates(false, allDates) // 'false' for showPastDates usually toggles, but here we want specific range
                          .filter(d => {
                            // Filter: Today - 7 days to Today
                            const today = new Date();
                            const dateObj = new Date(d.date);
                            today.setHours(23, 59, 59, 999);
                            dateObj.setHours(0, 0, 0, 0);

                            const diffTime = today - dateObj;
                            const diffDays = diffTime / (1000 * 60 * 60 * 24);

                            return diffDays >= 0 && diffDays <= 7;
                          })
                          .map(d => {
                            // Get sessions for this day
                            const sessions = getSessionsForDay(sessionOptions.tennis, d.weekday);
                            if (!sessions || sessions.length === 0) return null;

                            return sessions.map(session => (
                              <div key={`${d.date}-${session.id}`} style={{ border: '1px solid #eee', borderRadius: 8, padding: 10, background: '#f9f9f9' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: 8 }}>{estonianDate(d.date)}</div>
                                <SessionOverview
                                  date={d.date}
                                  sport="tennis"
                                  sessionOptions={sessionOptions}
                                  scheduleOverrides={scheduleOverrides}
                                  attendance={attendance}
                                  onAttendanceChange={(newAttendance) => {
                                    setAttendance(newAttendance);
                                    set(databaseRef(db, `attendance/${d.date}`), newAttendance[d.date]);
                                  }}
                                  allPlayers={playerPasswords}
                                  isAdmin={false}
                                  currentUser={currentUser}
                                  feedbackData={feedbackData}
                                  coachFeedbackData={coachFeedbackData}
                                // Force single session view by passing specific session? 
                                // SessionOverview renders ALL sessions for the day.
                                // We want to render specific sessions here or just reuse the component?
                                // The previous dashboard logic rendered specific cards.
                                // SessionOverview renders the grid of sessions for a day. 
                                // Let's reuse SessionOverview per day, but filter visibility?
                                // No, SessionOverview renders the GRID. 
                                // So we should just render SessionOverview for each DATE in range.
                                />
                              </div>
                            ));
                          }).flat() // SessionOverview is per day, so we shouldn't map sessions inside map(d). 
                          // Wait, if SessionOverview renders ALL sessions for a day, we just need to render it once per date.
                          /* 
                             CORRECTION: SessionOverview takes `date` and renders ALL sessions for that date.
                             So we should just map dates -> SessionOverview.
                          */
                        }
                      </div>
                      {/* Redoing the map correctly below */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                        {getTableDates(true, allDates) // Use true to get all history, then filter
                          .filter(d => {
                            const today = new Date();
                            const dateObj = new Date(d.date);
                            today.setHours(23, 59, 59, 999);
                            dateObj.setHours(0, 0, 0, 0);
                            const diffDays = (today - dateObj) / (1000 * 60 * 60 * 24);
                            return diffDays >= 0 && diffDays <= 7;
                          })
                          .map(d => {
                            // Only render if there are sessions?
                            const sessions = getSessionsForDay(sessionOptions.tennis, d.weekday);
                            if (!sessions || sessions.length === 0) return null;

                            return (
                              <div key={d.date}>
                                <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: 8, marginBottom: 16 }}>
                                  {estonianDate(d.date)} ({d.weekday})
                                </h3>
                                <SessionOverview
                                  date={d.date}
                                  sport="tennis"
                                  sessionOptions={sessionOptions}
                                  scheduleOverrides={scheduleOverrides}
                                  attendance={attendance}
                                  onAttendanceChange={(newAttendance) => {
                                    setAttendance(newAttendance);
                                    set(databaseRef(db, `attendance/${d.date}`), newAttendance[d.date]);
                                  }}
                                  allPlayers={playerPasswords}
                                  isAdmin={false}
                                  currentUser={currentUser}
                                  feedbackData={feedbackData}
                                  coachFeedbackData={coachFeedbackData}
                                />
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Main attendance tables - same layout as admin */}
                  {/* Tennis view */}
                  {activeView === "tennis" && (
                    <div style={{ marginBottom: 32 }}>
                      <h2>Tennis</h2>
                      <button onClick={() => setShowPastDates(v => !v)} style={{ margin: '16px 0 24px 0' }}>
                        {showPastDates ? "Peida varasemad päevad" : "Näita varasemaid päevi"}
                      </button>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                        {getTableDates(showPastDates, allDates).map(date => (
                          <div key={date.date}>
                            <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: 8, marginBottom: 16 }}>
                              {estonianDate(date.date)} ({date.weekday})
                            </h3>
                            <SessionOverview
                              date={date.date}
                              sport="tennis"
                              sessionOptions={sessionOptions}
                              // REMOVED: playerWeeklySchedules
                              scheduleOverrides={scheduleOverrides}
                              attendance={attendance}
                              onAttendanceChange={(newAttendance) => {
                                setAttendance(newAttendance);
                                set(
                                  databaseRef(db, `attendance/${date.date}`),
                                  newAttendance[date.date]
                                );
                              }}
                              allPlayers={playerPasswords}
                              isAdmin={false}
                              currentUser={currentUser}
                              feedbackData={feedbackData}
                              coachFeedbackData={coachFeedbackData}
                            // REMOVED: playerGroups, fussGroups
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Füss view */}
                  {activeView === "fuss" && (
                    <div>
                      <h2>Füss</h2>

                      {/* Coach feedback section REMOVED as per QA requirements (Session cards are source of truth) */}


                      {/* Coach Feedback Modal for Füss */}
                      {showCoachFeedbackModal && coachFeedbackSession && coachFeedbackSession.sport === 'fuss' && (
                        <CoachFeedbackModal
                          session={coachFeedbackSession}
                          onClose={() => setShowCoachFeedbackModal(false)}
                          coachFeedbackData={coachFeedbackData}
                          playerPasswords={playerPasswords}
                          attendance={attendance}
                          fussAttendance={fussAttendance}
                          // REMOVED: playerGroups, fussGroups
                          onSave={(newData) => {
                            // Update local state immediately
                            const updatedFeedback = {
                              ...coachFeedbackData,
                              [coachFeedbackSession.date]: {
                                ...coachFeedbackData[coachFeedbackSession.date],
                                [coachFeedbackSession.group]: newData
                              }
                            };
                            setCoachFeedbackData(updatedFeedback);
                            // Save to Firebase
                            set(databaseRef(db, `coachFeedback/${coachFeedbackSession.date}/${coachFeedbackSession.group}`), newData);
                            setShowCoachFeedbackModal(false);
                          }}
                        />
                      )}

                      <button onClick={() => setShowPastDates(v => !v)} style={{ margin: '16px 0 24px 0' }}>
                        {showPastDates ? "Peida varasemad päevad" : "Näita varasemaid päevi"}
                      </button>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                        {getTableDates(showPastDates, allDates).map(date => (
                          <div key={date.date}>
                            <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: 8, marginBottom: 16 }}>
                              {estonianDate(date.date)} ({date.weekday})
                            </h3>
                            <SessionOverview
                              date={date.date}
                              sport="fuss"
                              sessionOptions={sessionOptions}
                              // REMOVED: playerWeeklySchedules
                              scheduleOverrides={scheduleOverrides}
                              attendance={fussAttendance}
                              onAttendanceChange={(newAttendance) => {
                                // For Fuss, attendance state is fussAttendance
                                setFussAttendance(newAttendance);
                                set(
                                  databaseRef(db, `fussAttendance/${date.date}`),
                                  newAttendance[date.date]
                                );
                              }}
                              allPlayers={playerPasswords}
                              isAdmin={false}
                              currentUser={currentUser}
                              feedbackData={feedbackData}
                              coachFeedbackData={coachFeedbackData}
                            // REMOVED: playerGroups, fussGroups
                            />

                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>)
              }
            </div >
          </div >
        )}
      </div >
      {/* Modal Section - moved from after the return */}
      {/* Add/Manage Player Modal (admin) */}
      {
        showAddPlayer && (
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
              <h2>Mängijate haldamine</h2>
              {/* Tab buttons */}
              <div style={{ marginBottom: 20, borderBottom: '1px solid #ccc' }}>
                <button
                  onClick={() => setActivePlayerTab('active')}
                  style={{
                    padding: '8px 16px',
                    marginRight: 8,
                    border: 'none',
                    background: activePlayerTab === 'active' ? '#007bff' : 'transparent',
                    color: activePlayerTab === 'active' ? 'white' : 'black',
                    cursor: 'pointer',
                    borderRadius: '4px 4px 0 0'
                  }}
                >
                  ➕ Aktiivsed mängijad
                </button>
                <button
                  onClick={() => setActivePlayerTab('archived')}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    background: activePlayerTab === 'archived' ? '#007bff' : 'transparent',
                    color: activePlayerTab === 'archived' ? 'white' : 'black',
                    cursor: 'pointer',
                    borderRadius: '4px 4px 0 0'
                  }}
                >
                  🗂️ Arhiveeritud mängijad
                </button>
              </div>
              {/* Search bar */}
              <div style={{ marginBottom: 16 }}>
                <input
                  type="text"
                  placeholder="Otsi mängijat nime järgi..."
                  value={playerSearchTerm}
                  onChange={(e) => setPlayerSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              {activePlayerTab === 'active' ? (
                <div>
                  {/* Add new player form */}
                  <div style={{
                    background: '#f8f9fa',
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '20px'
                  }}>
                    <h3>Lisa uus mängija</h3>
                    <form onSubmit={handleAddPlayer} className="add-player-form">
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <label>Eesnimi:<br />
                            <input
                              value={newPlayerFirst}
                              onChange={e => setNewPlayerFirst(e.target.value)}
                              style={{ width: "95%" }}
                              required
                            />
                          </label>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label>Perekonnanimi:<br />
                            <input
                              value={newPlayerLast}
                              onChange={e => setNewPlayerLast(e.target.value)}
                              style={{ width: "95%" }}
                              required
                            />
                          </label>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <label>Mängija parool:<br />
                            <input
                              value={newPlayerPw}
                              type="password"
                              onChange={e => setNewPlayerPw(e.target.value)}
                              style={{ width: "95%" }}
                              required
                            />
                          </label>
                        </div>
                        <div style={{ flex: 1 }}>
                          <label>Vanema kood:<br />
                            <input
                              value={newParentPw}
                              type="password"
                              onChange={e => setNewParentPw(e.target.value)}
                              style={{ width: "95%" }}
                              required
                            />
                          </label>
                        </div>
                      </div>
                      {addPlayerError && <div style={{ color: "#d00", marginBottom: 10 }}>{addPlayerError}</div>}
                      <button type="submit" style={{ fontWeight: 600, fontSize: 16, padding: '8px 16px' }}>
                        Lisa mängija
                      </button>
                    </form>
                  </div>
                  {/* Active players list */}
                  <div>
                    <h3>Aktiivsed mängijad ({playerPasswords.filter(p =>
                      p.name.toLowerCase().includes(playerSearchTerm.toLowerCase())
                    ).length})</h3>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {playerPasswords
                        .filter(p => p.name.toLowerCase().includes(playerSearchTerm.toLowerCase()))
                        .map(player => (
                          <div key={player.name} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            border: '1px solid #eee',
                            borderRadius: '4px',
                            marginBottom: '4px',
                            background: '#fff'
                          }}>
                            <div>
                              <strong>{player.name}</strong>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                {/* Groups management removed */}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setPlayerToDelete(player.name);
                                setShowDeleteConfirm(true);
                              }}
                              style={{
                                background: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: '14px'
                              }}
                              title="Arhiveeri mängija"
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Archived players tab */
                <div>
                  <h3>Arhiveeritud mängijad ({archivedPlayers.filter(p =>
                    p.name.toLowerCase().includes(playerSearchTerm.toLowerCase())
                  ).length})</h3>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {archivedPlayers.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                        Arhiveeritud mängijaid pole
                      </div>
                    ) : (
                      archivedPlayers
                        .filter(p => p.name.toLowerCase().includes(playerSearchTerm.toLowerCase()))
                        .map(player => (
                          <div key={player.name} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            border: '1px solid #eee',
                            borderRadius: '4px',
                            marginBottom: '4px',
                            background: '#f8f9fa'
                          }}>
                            <div>
                              <strong>{player.name}</strong>
                              <div style={{ fontSize: '12px', color: '#666' }}>
                                Arhiveeritud: {new Date(player.archivedDate).toLocaleDateString('et-EE')} |
                                Tennis: Grupp {player.tennisGroup} | Füss: Grupp {player.fussGroup}
                              </div>
                            </div>
                            <button
                              onClick={() => handleRestorePlayer(player)}
                              style={{
                                background: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                fontSize: '14px'
                              }}
                              title="Taasta mängija"
                            >
                              ♻️ Taasta
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}
              <div style={{ marginTop: 20, textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddPlayer(false);
                    setActivePlayerTab('active');
                    setPlayerSearchTerm('');
                    setNewPlayerFirst('');
                    setNewPlayerLast('');
                    setNewPlayerPw('');
                    setNewParentPw('');
                    setAddPlayerError('');
                  }}
                  style={{ padding: '8px 16px' }}
                >
                  Sulge
                </button>
              </div>

            </div>
          </div>
        )
      }

      {/* PLAYER VIEW */}
      {
        step === "player" && selectedPlayer && (
          <div>
            {/* Feedback modal */}
            {showFeedbackModal && feedbackQueue.length > 0 && (
              <FeedbackModal
                session={feedbackQueue[currentFeedbackIdx]}
                onSubmit={handleFeedbackSubmit}
                onSkip={handleFeedbackSkip}
                onChangeAttendance={handleFeedbackAttendanceChange}
              />
            )}
            {/* Group warning removed */}
            <PlayerTopBar
              playerName={selectedPlayer}
              onLogout={() => {
                setStep("login");
                setLoginName("");
                setLoginPassword("");
                setSelectedPlayer("");
                setPlayerSearchTerm("");
              }}
              onChangePassword={() => setShowPasswordForm(true)}
            />

            <PlayerScheduleView
              player={selectedPlayer}
              allDates={allDates}
              sessionOptions={sessionOptions}
              // REMOVED: playerWeeklySchedules
              scheduleOverrides={scheduleOverrides}
              attendance={attendance}
              fussAttendance={fussAttendance}
              onAttendanceChange={(date, sport, val) => {
                if (sport === 'tennis') {
                  const newAttendance = {
                    ...attendance,
                    [date]: {
                      ...attendance[date],
                      [selectedPlayer]: val
                    }
                  };
                  setAttendance(newAttendance);
                  set(databaseRef(db, `attendance/${date}`), newAttendance[date]);
                } else {
                  const newAttendance = {
                    ...fussAttendance,
                    [date]: {
                      ...fussAttendance[date],
                      [selectedPlayer]: val
                    }
                  };
                  setFussAttendance(newAttendance);
                  set(databaseRef(db, `fussAttendance/${date}`), newAttendance[date]);
                }
              }}
            />

            {/* Password change form (if open) */}
            {showPasswordForm && (
              <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.5)', zIndex: 1200,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{ background: 'white', padding: 20, borderRadius: 8, width: 300 }}>
                  <h3>Muuda parooli</h3>
                  <form onSubmit={(e) => {
                    handleChangePassword(e);
                    setShowPasswordForm(false);
                  }}>
                    <div style={{ marginBottom: 12 }}>
                      <input
                        type="password"
                        value={oldPw}
                        onChange={e => setOldPw(e.target.value)}
                        placeholder="Vana parool"
                        required
                        style={{ width: '100%', padding: 8 }}
                      />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <input
                        type="password"
                        value={newPw1}
                        onChange={e => setNewPw1(e.target.value)}
                        placeholder="Uus parool"
                        required
                        style={{ width: '100%', padding: 8 }}
                      />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <input
                        type="password"
                        value={newPw2}
                        onChange={e => setNewPw2(e.target.value)}
                        placeholder="Uus parool uuesti"
                        required
                        style={{ width: '100%', padding: 8 }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => setShowPasswordForm(false)}>Loobu</button>
                      <button type="submit" style={{ background: '#1890ff', color: 'white', border: 'none', padding: '8px 16px', borderRadius: 4 }}>Salvesta</button>
                    </div>
                    {pwMessage && <div style={{ marginTop: 8, color: "#d00" }}>{pwMessage}</div>}
                  </form>
                </div>
              </div>
            )}
            {/* Legacy tables removed */}
          </div>
        )
      }

      {/* PARENT VIEW */}
      {
        step === "parent" && selectedParent && (
          <div>
            {/* Group warning removed */}
            <h2>Tere, lapsevanem!</h2>
            <div>
              <b>Laps:</b> {selectedParent} <br />
              {/* Groups info removed */}
            </div>
            <div style={{ margin: "18px 0" }}>

              <PlayerScheduleView
                player={selectedPlayer}
                title={`${selectedPlayer} kava`}
                allDates={allDates}
                sessionOptions={sessionOptions}
                // REMOVED: playerWeeklySchedules
                scheduleOverrides={scheduleOverrides}
                attendance={attendance}
                fussAttendance={fussAttendance}
                onAttendanceChange={handleAttendanceChange}
                feedbackData={feedbackData}
                coachFeedbackData={coachFeedbackData}
              />

              <div style={{ margin: "24px 0" }}>
                <a href="https://tallinktennisekeskus.ee/tennisekool/" target="_blank" rel="noopener noreferrer">
                  <button>Treeneri kontaktid</button>
                </a>
                <button onClick={() => { setStep("login"); setSelectedParent(""); setParentLoginCode(""); }}>
                  Logi välja
                </button>
              </div>
            </div>
          </div>
        )
      }


      {/* ADMIN VIEW */}
      {
        step === "admin" && adminMode && (
          <div>
            <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <h2 style={{ margin: 0, marginRight: 12 }}>Admin Töölaud</h2>

              <button
                onClick={() => {
                  setStep("login");
                  setAdminMode(false);
                  setLoginName("");
                  setLoginPassword("");
                }}
                style={{ marginLeft: 'auto' }}
              >
                Logi välja
              </button>

              <button
                onClick={() => import('./data/reset').then(m => m.resetTestData())}
                style={{ marginLeft: 12, background: '#dc3545', color: 'white', border: '1px solid #bd2130' }}
              >
                ⚠️ RESET DB
              </button>
            </div>

            <SessionsView
              isAdmin={true}
              playerPasswords={playerPasswords}
              sessionOptions={sessionOptions}
              // REMOVED: playerWeeklySchedules
              scheduleOverrides={scheduleOverrides}
              attendance={attendance}
              fussAttendance={fussAttendance}
              onAttendanceChange={handleSessionsViewAttendanceChange}
              allDates={allDates}
              feedbackData={feedbackData}
              coachFeedbackData={coachFeedbackData}
            />
          </div>
        )


      }

    </>
  );
}



// FEEDBACK_EMOJI_Q1, Q2, Q3 are imported from data/feedback.js

function FeedbackModal({ session, onSubmit, onSkip, existingFeedback }) {
  const [effort, setEffort] = useState(null);
  const [coachAttention, setCoachAttention] = useState(null);
  const [clarity, setClarity] = useState(null);

  useEffect(() => {
    // Pre-fill with existing feedback if available, otherwise reset
    if (existingFeedback) {
      setEffort(existingFeedback.intensity || existingFeedback.effort || null);
      setCoachAttention(existingFeedback.coachAttention || null);
      setClarity(existingFeedback.objectiveClarity || null);
    } else {
      setEffort(null);
      setCoachAttention(null);
      setClarity(null);
    }
  }, [existingFeedback, session]);

  if (!session) return null;

  const canSubmit = effort && coachAttention && clarity;

  return (
    <div className="feedback-modal">
      <div className="feedback-content">
        <h2 style={{ marginBottom: 4 }}>Kuidas trenn läks?</h2>
        <p style={{ margin: "0 0 20px 0", color: "#666" }}>
          {estonianDate(session.date)} ({session.weekday}) - {session.type === 'fuss' ? 'ÜKE' : 'Tennis'}
        </p>

        {/* Q1: Effort */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>1. Kui suur oli su pingutus?</p>
          <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 400 }}>
            {FEEDBACK_EMOJI_Q1.map((item) => (
              <div
                key={item.val}
                onClick={() => setEffort(item.val)}
                style={{
                  cursor: "pointer",
                  opacity: effort === item.val ? 1 : 0.5,
                  transform: effort === item.val ? "scale(1.2)" : "scale(1)",
                  transition: "all 0.2s",
                  textAlign: "center",
                  flex: 1
                }}
              >
                <div style={{ fontSize: 24 }}>{item.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 500 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Q2: Coach Attention */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>2. Kas treeneri tähelepanu oli piisav?</p>
          <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 400 }}>
            {FEEDBACK_EMOJI_Q2.map((item) => (
              <div
                key={item.val}
                onClick={() => setCoachAttention(item.val)}
                style={{
                  cursor: "pointer",
                  opacity: coachAttention === item.val ? 1 : 0.5,
                  transform: coachAttention === item.val ? "scale(1.2)" : "scale(1)",
                  transition: "all 0.2s",
                  textAlign: "center",
                  flex: 1
                }}
              >
                <div style={{ fontSize: 24 }}>{item.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 500 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Q3: Objective Clarity */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>3. Kas harjutuste eesmärk oli selge?</p>
          <div style={{ display: "flex", justifyContent: "space-between", maxWidth: 400 }}>
            {FEEDBACK_EMOJI_Q3.map((item) => (
              <div
                key={item.val}
                onClick={() => setClarity(item.val)}
                style={{
                  cursor: "pointer",
                  opacity: clarity === item.val ? 1 : 0.5,
                  transform: clarity === item.val ? "scale(1.2)" : "scale(1)",
                  transition: "all 0.2s",
                  textAlign: "center",
                  flex: 1
                }}
              >
                <div style={{ fontSize: 24 }}>{item.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 500 }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
          <button
            onClick={() => onSubmit({
              effort,
              coachAttention,
              objectiveClarity: clarity
            })}
            disabled={!canSubmit}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: canSubmit ? "#28a745" : "#ccc",
              color: "white",
              fontWeight: 600,
              cursor: canSubmit ? "pointer" : "not-allowed",
              flex: 1
            }}
          >
            Salvesta
          </button>

          <button
            onClick={onSkip}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid #ccc",
              background: "white",
              color: "#666",
              cursor: "pointer"
            }}
          >
            Jäta vahele
          </button>
        </div>


      </div>
    </div>
  );
}

// Feedback constants are imported from data/feedback.js

function CoachFeedbackModal({
  session,
  onClose,
  onSave,
  coachFeedbackData,
  playerPasswords,
  attendance,
  fussAttendance
}) {
  const [ratings, setRatings] = useState({});

  useEffect(() => {
    // Load existing ratings if available
    // Session structure: { date, id, group (optional), ... }
    // Feedback structure: coachFeedbackData[date][sessionId] or legacy group
    if (session && coachFeedbackData && coachFeedbackData[session.date]) {
      const sessionKey = session.id || session.group; // Fallback for legacy
      if (coachFeedbackData[session.date][sessionKey]) {
        setRatings(coachFeedbackData[session.date][sessionKey]);
      }
    } else {
      setRatings({});
    }
  }, [session, coachFeedbackData]);

  if (!session) return null;

  const dateStr = session.date;
  const isFuss = session.sport === 'fuss' || session.type === 'fuss';
  const groupName = session.group;
  const attRecord = isFuss ? fussAttendance : attendance;

  // Filter players who attended
  // We use the passed attendance object.
  // Legacy: attendance[date][player]
  // New: attendance[date][sessionId][player] ?? Not yet.
  // Current app uses: attendance[date][player] (Daily boolean)

  const attendees = (Array.isArray(playerPasswords) ? playerPasswords : Object.values(playerPasswords)).filter(p => {
    const pName = p.name;
    const status = attRecord[dateStr]?.[pName];
    return status === "Jah" || status === true;
  });

  const handleRating = (player, val) => {
    setRatings(prev => ({ ...prev, [player]: val }));
  };

  return (
    <div className="feedback-modal" onClick={onClose}>
      <div className="feedback-content" onClick={e => e.stopPropagation()}>
        <h2 style={{ borderBottom: '1px solid #eee', paddingBottom: 10, marginBottom: 16 }}>
          Treeneri tagasiside: {isFuss ? 'Füss' : 'Tennis'} Grupp {groupName}
        </h2>
        <p style={{ marginBottom: 20, color: '#666' }}>
          {estonianDate ? estonianDate(dateStr) : dateStr} ({session.weekday})
          <br />
          Hinda mängijate panust (1-5)
        </p>

        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {attendees.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
              Ühtegi mängijat pole märgitud osalejaks.
            </div>
          ) : (
            attendees.map(p => {
              const currentVal = ratings[p.name];
              return (
                <div key={p.name} style={{ marginBottom: 16, borderBottom: '1px solid #f0f0f0', paddingBottom: 8 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{p.name}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {COACH_FEEDBACK_EMOJI.map(item => (
                      <button
                        key={item.val}
                        onClick={() => handleRating(p.name, item.val)}
                        title={item.label}
                        style={{
                          background: currentVal === item.val ? '#e3f2fd' : 'transparent',
                          border: currentVal === item.val ? '2px solid #2196f3' : '1px solid #ddd',
                          borderRadius: 8,
                          padding: '8px 12px',
                          fontSize: '20px',
                          cursor: 'pointer',
                          opacity: currentVal && currentVal !== item.val ? 0.6 : 1,
                          minWidth: 50,
                          transition: 'all 0.2s'
                        }}
                      >
                        {item.icon}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f8f9fa',
              border: '1px solid #ccc',
              color: '#333',
              padding: '8px 16px',
              borderRadius: 4,
              cursor: 'pointer'
            }}>
            Loobu
          </button>
          <button
            type="button"
            onClick={() => onSave(ratings)}
            style={{
              background: '#28a745',
              border: 'none',
              color: 'white',
              padding: '8px 24px',
              borderRadius: 4,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Salvesta
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
