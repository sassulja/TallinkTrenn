// ...existing code...
function App() {
  // TEST: ChatGPT integration — remove after verifying
  console.log('✅ ChatGPT test: App() reached');
  // Add mobile name formatting styles
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .player-name-mobile {
        display: none;
      }
      .player-name-desktop {
        display: inline;
      }
      
      .feedback-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }
      
      .feedback-content {
        background-color: white;
        padding: 24px;
        border-radius: 8px;
        max-width: 600px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
      }
      
      @media (max-width: 768px) {
        .player-name-mobile {
          display: inline;
        }
        .player-name-desktop {
          display: none;
        }
        
        .feedback-content {
          padding: 16px;
          width: 95%;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
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
  const [fussEffort, setFussEffort] = React.useState({});
  const [adminMode, setAdminMode] = React.useState(false);
  const [coachMode, setCoachMode] = React.useState(false);
  const [parentMode, setParentMode] = React.useState(false);
  const [playerMode, setPlayerMode] = React.useState(false);
  const [selectedParent, setSelectedParent] = React.useState(null);
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
  const [tennisSessionsCompleted, setTennisSessionsCompleted] = React.useState({});
  // Removed tableWrapperRef as it's no longer used
  const [activeView, setActiveView] = React.useState('tennis');
  const [showGroupPrompt, setShowGroupPrompt] = React.useState(false);
  const [showAddPlayer, setShowAddPlayer] = React.useState(false);
  const [addPlayerError, setAddPlayerError] = React.useState('');
  const [newPlayerFirst, setNewPlayerFirst] = React.useState('');
  const [newPlayerLast, setNewPlayerLast] = React.useState('');
  const [newPlayerPw, setNewPlayerPw] = React.useState('');
  const [newParentPw, setNewParentPw] = React.useState('');
  const [newTennisGroup, setNewTennisGroup] = React.useState('');
  const [newFussGroup, setNewFussGroup] = React.useState('');
  const [archivedPlayers, setArchivedPlayers] = React.useState([]);
  const [activePlayerTab, setActivePlayerTab] = React.useState('active'); // 'active' or 'archived'
  const [playerSearchTerm, setPlayerSearchTerm] = React.useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [playerToDelete, setPlayerToDelete] = React.useState(null);
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

  // Function to handle füss effort rating
  function handleFussEffortChange(playerName, date, group, effortValue) {
    const newFussEffort = {
      ...fussEffort,
      [date]: {
        ...fussEffort[date],
        [`fuss-${group}`]: {
          ...fussEffort[date]?.[`fuss-${group}`],
          [playerName]: effortValue
        }
      }
    };
    setFussEffort(newFussEffort);
    
    if (effortValue === null) {
      // Remove the effort rating from Firebase
      set(databaseRef(db, `fussEffort/${date}/fuss-${group}/${playerName}`), null);
    } else {
      set(databaseRef(db, `fussEffort/${date}/fuss-${group}/${playerName}`), effortValue);
    }
  }

  // Function to mark tennis session as completed
  function markTennisSessionCompleted(date, group) {
    const sessionKey = `${date}-${group}`;
    const newCompleted = {
      ...tennisSessionsCompleted,
      [sessionKey]: true
    };
    setTennisSessionsCompleted(newCompleted);
    set(databaseRef(db, `tennisSessionsCompleted/${sessionKey}`), true);
  }

  // Function to handle login
  function handleLogin(e) {
    e.preventDefault();
    setSelectedPlayer(null);
    setAdminMode(false);
    setCoachMode(false);
    setParentMode(false);
    setPlayerMode(false);
    setSelectedParent(null);

    // Prepare player and parent password lists
    const pwList = Array.isArray(playerPasswords) ? playerPasswords : Object.values(playerPasswords);
    const parentPwList = Array.isArray(parentPasswords) ? parentPasswords : Object.values(parentPasswords);

    // 1. Admin login
    if (loginName === "admin" && loginPassword === "TallinkAdmin") {
      setStep("admin");
      setAdminMode(true);
      setLoginName("");
      setLoginPassword("");
      return;
    }

    // 2. Coach login
    if (loginName === "coach" && loginPassword === "TallinkCoach") {
      setStep("coach");
      setCoachMode(true);
      setLoginName("");
      setLoginPassword("");
      return;
    }

    // 3. Parent login (from main login screen, not parentLogin flow)
    const parent = parentPwList.find(
      (entry) => entry.name === loginName && entry.parent_password === loginPassword
    );
    if (parent) {
      setSelectedParent(parent.name);
      setStep("parent");
      setParentMode(true);
      setLoginName("");
      setLoginPassword("");
      return;
    }

    // 4. Player login
    const player = pwList.find(
      (entry) => entry.name === loginName && entry.password === loginPassword
    );
    if (player) {
      setSelectedPlayer(player.name);
      setStep("player");
      setPlayerMode(true);
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
      tennisGroup: playerGroups[playerToDelete] || '1',
      fussGroup: fussGroups[playerToDelete] || 'A',
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
    
    // Remove from groups
    const newPlayerGroups = { ...playerGroups };
    const newFussGroups = { ...fussGroups };
    delete newPlayerGroups[playerToDelete];
    delete newFussGroups[playerToDelete];
    
    setPlayerGroups(newPlayerGroups);
    setFussGroups(newFussGroups);
    set(databaseRef(db, 'playerGroups'), newPlayerGroups);
    set(databaseRef(db, 'fussGroups'), newFussGroups);
    
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
    
    // Restore groups (use default or saved groups)
    const newPlayerGroups = {
      ...playerGroups,
      [archivedPlayer.name]: archivedPlayer.tennisGroup || '1'
    };
    const newFussGroups = {
      ...fussGroups,
      [archivedPlayer.name]: archivedPlayer.fussGroup || 'A'
    };
    
    setPlayerGroups(newPlayerGroups);
    setFussGroups(newFussGroups);
    set(databaseRef(db, 'playerGroups'), newPlayerGroups);
    set(databaseRef(db, 'fussGroups'), newFussGroups);
    
    // Remove from archived players
    const updatedArchived = archivedPlayers.filter(p => p.name !== archivedPlayer.name);
    setArchivedPlayers(updatedArchived);
    set(databaseRef(db, 'archivedPlayers'), updatedArchived);
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

    // Load fuss effort ratings
    const fussEffortRef = databaseRef(db, 'fussEffort');
    onValue(fussEffortRef, (snapshot) => {
      const data = snapshot.val() || {};
      setFussEffort(data);
    });

    // Load tennis sessions completed
    const tennisSessionsRef = databaseRef(db, 'tennisSessionsCompleted');
    onValue(tennisSessionsRef, (snapshot) => {
      const data = snapshot.val() || {};
      setTennisSessionsCompleted(data);
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

    // Load archived players
    const archivedPlayersRef = databaseRef(db, 'archivedPlayers');
    onValue(archivedPlayersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const archived = Array.isArray(data) ? data : Object.values(data);
        setArchivedPlayers(archived);
      } else {
        setArchivedPlayers([]);
      }
    });
  }, [db, playerPasswords]);

  // Separate effect for initializing groups when playerPasswords changes
  React.useEffect(() => {
    if (!db || !playerPasswords.length) return;

    // Initialize player groups if not already set
    if (Object.keys(playerGroups).length === 0) {
      const defaultGroups = {};
      playerPasswords.forEach(player => {
        defaultGroups[player.name] = "1";
      });
      setPlayerGroups(defaultGroups);
    }

    // Initialize fuss groups if not already set  
    if (Object.keys(fussGroups).length === 0) {
      const defaultGroups = {};
      playerPasswords.forEach(player => {
        defaultGroups[player.name] = "A";
      });
      setFussGroups(defaultGroups);
    }
  }, [db, playerPasswords, playerGroups, fussGroups]); // Include all dependencies but make sure conditions prevent infinite loops

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
          }
        )}
      </div>
    );
  }

  return (
    <div style={{ margin: "30px 0 24px 0" }}>
      {/* ...existing code for FeedbackSummaryByGroup legend and rendering... */}
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
      {/* ...existing code... */}
    </div>
      )}

      {step === "login" && (
        <div style={{ marginTop: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <button
            data-testid="btn-parent-login"
            style={{ background: "#f6faff", border: "1px solid #bce", padding: "8px 18px", borderRadius: 8, fontWeight: 600, fontSize: 16 }}
            onClick={() => setStep("parentLogin")}
          >
            Lapsevanemale
          </button>
          <button
            data-testid="btn-coach-login"
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
                      {getTableDates(false, allDates).map((d) => (
                        <th key={d.date}>
                          {d.weekday}<br/>{estonianDate(d.date)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{selectedPlayer}</td>
                      {getTableDates(false, allDates).map((d) => (
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
                        {getTableDates(true, allDates).filter(d => new Date(d.date) < new Date()).slice(-30).map((d) => (
                          <th key={d.date}>
                            {d.weekday}<br/>{estonianDate(d.date)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{selectedPlayer}</td>
                        {getTableDates(true, allDates).filter(d => new Date(d.date) < new Date()).slice(-30).map((d) => (
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
                      {getTableDates(false, allDates).map((d) => (
                        <th key={d.date}>
                          {d.weekday}<br/>{estonianDate(d.date)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{selectedPlayer}</td>
                      {getTableDates(false, allDates).map((d) => (
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
                        {getTableDates(true, allDates).filter(d => new Date(d.date) < new Date()).slice(-30).map((d) => (
                          <th key={d.date}>
                            {d.weekday}<br/>{estonianDate(d.date)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{selectedPlayer}</td>
                        {getTableDates(true, allDates).filter(d => new Date(d.date) < new Date()).slice(-30).map((d) => (
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
                {getTableDates(true, allDates).map(d => (
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
                {getTableDates(showPastDates, allDates)
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
                      
                      // FIX 1: Correct attendance data structure
                      const attended = groupPlayers.filter(n => attendance[d.date]?.[n] === "Jah");
                      if (attended.length === 0) return null;
                      
                      const sessionKey = `${d.date}-${grp}`;
                      const isCompleted = tennisSessionsCompleted[sessionKey];
                      
                      // Get schedule time for this group and date
                      const dayOfWeek = new Date(d.date).getDay();
                      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
                      
                      let scheduleTime = '';
                      let sessionEndTime = null;
                      
                      if (grp === '1') {
                        const group1Schedule = schedule.tennis.group1 || {};
                        // Map day names to schedule keys
                        const scheduleKey = dayName === 'monday' ? 'Monday' :
                                          dayName === 'tuesday' ? 'Tuesday1' : // Default to first session
                                          dayName === 'wednesday' ? 'Wednesday' :
                                          dayName === 'thursday' ? 'Thursday1' : // Default to first session
                                          dayName === 'friday' ? 'Friday' : null;
                        scheduleTime = scheduleKey ? group1Schedule[scheduleKey] || '' : '';
                      } else if (grp === '2') {
                        const group2Schedule = schedule.tennis.group2 || {};
                        const scheduleKey = dayName === 'monday' ? 'Monday1' : // Default to first session
                                          dayName === 'tuesday' ? 'Tuesday' :
                                          dayName === 'wednesday' ? 'Wednesday1' : // Default to first session
                                          dayName === 'thursday' ? 'Thursday' :
                                          dayName === 'friday' ? 'Friday' : null;
                        scheduleTime = scheduleKey ? group2Schedule[scheduleKey] || '' : '';
                      }
                      
                      // FIX 2: Check if session has finished
                      const isSessionFinished = () => {
                        const now = new Date();
                        const sessionDate = new Date(d.date);
                        
                        // If session is from a previous day, it's finished
                        if (sessionDate.toDateString() !== now.toDateString()) {
                          return true;
                        }
                        
                        // If session is today, check the time
                        if (scheduleTime) {
                          const timeMatch = scheduleTime.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
                          if (timeMatch) {
                            const [, , , endHour, endMinute] = timeMatch;
                            const sessionEnd = new Date(sessionDate);
                            sessionEnd.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);
                            return now > sessionEnd;
                          }
                        }
                        
                        // If we can't parse the time, assume it's finished if it's not today
                        return false;
                      };
                      
                      // Only show sessions that have finished and aren't completed yet
                      if (!isSessionFinished() || isCompleted) return null;
                      
                      return (
                        <div
                          key={d.date + grp}
                          style={{
                            border: '1px solid #bbb',
                            borderRadius: 8,
                            padding: 12,
                            minWidth: 200,
                            background: '#fafaff',
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                          onClick={() => {
                            setCoachFeedbackSession({ date: d.date, group: grp, weekday: d.weekday });
                            setShowCoachFeedbackModal(true);
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>
                            🗓️ {estonianDate(d.date)} ({d.weekday})
                          </div>
                          <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
                            🧑‍🤝‍🧑 Tennis Grupp {grp}
                          </div>
                          <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
                            🕒 {scheduleTime || 'Aeg määramata'}
                          </div>
                          <div style={{ fontSize: 12, color: '#666' }}>
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
                  fussAttendance={fussAttendance}
                  playerGroups={playerGroups}
                  fussGroups={fussGroups}
                  onSave={(newData) => {
                    set(databaseRef(db, `coachFeedback/${coachFeedbackSession.date}/${coachFeedbackSession.group}`), newData);
                    // Mark session as completed
                    markTennisSessionCompleted(coachFeedbackSession.date, coachFeedbackSession.group);
                    setShowCoachFeedbackModal(false);
                  }}
                />
              )}
            </div>
          )}
          
          {/* Main attendance tables - same layout as admin */}
          {/* Tennis view */}
          {activeView === "tennis" && (
            <div style={{ marginBottom: 32 }}>
              <h2>Tennis</h2>
              <button onClick={() => setShowPastDates(v => !v)} style={{ margin: '16px 0 8px 0' }}>
                {showPastDates ? "Peida varasemad päevad" : "Näita varasemaid päevi"}
              </button>
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Group 1 */}
                <div>
                  <h3>Grupp 1</h3>
                  <div style={{ 
                    overflowX: "auto", 
                    overflowY: "auto",
                    maxWidth: "100%",
                    maxHeight: "400px",
                    border: "1px solid #ddd",
                    borderRadius: "8px"
                  }}>
                    <table className="attendance-table" style={{ minWidth: "600px" }}>
                      <thead>
                        <tr style={{ position: "sticky", top: 0, zIndex: 15 }}>
                          <th style={{ 
                            position: "sticky", 
                            left: 0, 
                            top: 0,
                            background: "#f8f9fa", 
                            zIndex: 20,
                            minWidth: "120px",
                            borderRight: "2px solid #dee2e6"
                          }}>Mängija</th>
                          {getTableDates(showPastDates, allDates).map((date) => {
                            const sessionKey = `${date.date}-1`;
                            const isCompleted = tennisSessionsCompleted[sessionKey];
                            const hasFeedback = coachFeedbackData?.[date.date]?.[1];
                            const canEdit = isCompleted || hasFeedback;
                            
                            return (
                              <th key={date.date} style={{ 
                                minWidth: "80px", 
                                whiteSpace: "nowrap",
                                background: "#f8f9fa",
                                position: "sticky",
                                top: 0,
                                cursor: canEdit ? 'pointer' : 'default',
                                textDecoration: canEdit ? 'underline' : 'none'
                              }}
                              onClick={() => {
                                if (canEdit) {
                                  setCoachFeedbackSession({ date: date.date, group: '1', weekday: date.weekday });
                                  setShowCoachFeedbackModal(true);
                                }
                              }}
                              >
                                {date.weekday}<br/>{estonianDate(date.date)}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(playerGroups)
                          .filter(([_, group]) => group === "1")
                          .map(([name]) => (
                            <tr key={name}>
                              <td style={{ 
                                position: "sticky", 
                                left: 0, 
                                background: "#fff", 
                                zIndex: 5,
                                fontWeight: "500",
                                borderRight: "2px solid #dee2e6"
                              }}>
                                <span className="player-name-desktop">{name}</span>
                                <span className="player-name-mobile">{formatMobileName(name)}</span>
                              </td>
                              {getTableDates(showPastDates, allDates).map((date) => (
                                <td key={date.date} style={{ minWidth: "80px" }}>
                                  <AttendanceToggle
                                    value={attendance[date.date]?.[name] || "Ei"}
                                    onChange={(val) => {
                                      const newAttendance = {
                                        ...attendance,
                                        [date.date]: {
                                          ...attendance[date.date],
                                          [name]: val
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
                </div>

                {/* Group 2 */}
                <div>
                  <h3>Grupp 2</h3>
                  <div style={{ 
                    overflowX: "auto", 
                    overflowY: "auto",
                    maxWidth: "100%",
                    maxHeight: "400px",
                    border: "1px solid #ddd",
                    borderRadius: "8px"
                  }}>
                    <table className="attendance-table" style={{ minWidth: "600px" }}>
                      <thead>
                        <tr style={{ position: "sticky", top: 0, zIndex: 15 }}>
                          <th style={{ 
                            position: "sticky", 
                            left: 0, 
                            top: 0,
                            background: "#f8f9fa", 
                            zIndex: 20,
                            minWidth: "120px",
                            borderRight: "2px solid #dee2e6"
                          }}>Mängija</th>
                          {getTableDates(showPastDates, allDates).map((date) => {
                            const sessionKey = `${date.date}-2`;
                            const isCompleted = tennisSessionsCompleted[sessionKey];
                            const hasFeedback = coachFeedbackData?.[date.date]?.[2];
                            const canEdit = isCompleted || hasFeedback;
                            
                            return (
                              <th key={date.date} style={{ 
                                minWidth: "80px", 
                                whiteSpace: "nowrap",
                                background: "#f8f9fa",
                                position: "sticky",
                                top: 0,
                                cursor: canEdit ? 'pointer' : 'default',
                                textDecoration: canEdit ? 'underline' : 'none'
                              }}
                              onClick={() => {
                                if (canEdit) {
                                  setCoachFeedbackSession({ date: date.date, group: '2', weekday: date.weekday });
                                  setShowCoachFeedbackModal(true);
                                }
                              }}
                              >
                                {date.weekday}<br/>{estonianDate(date.date)}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(playerGroups)
                          .filter(([_, group]) => group === "2")
                          .map(([name]) => (
                            <tr key={name}>
                              <td style={{ 
                                position: "sticky", 
                                left: 0, 
                                background: "#fff", 
                                zIndex: 5,
                                fontWeight: "500",
                                borderRight: "2px solid #dee2e6"
                              }}>
                                <span className="player-name-desktop">{name}</span>
                                <span className="player-name-mobile">{formatMobileName(name)}</span>
                              </td>
                              {getTableDates(showPastDates, allDates).map((date) => (
                                <td key={date.date} style={{ minWidth: "80px" }}>
                                  <AttendanceToggle
                                    value={attendance[date.date]?.[name] || "Ei"}
                                    onChange={(val) => {
                                      const newAttendance = {
                                        ...attendance,
                                        [date.date]: {
                                          ...attendance[date.date],
                                          [name]: val
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
                </div>
              </div>
            </div>
          )}

          {/* Füss view */}
          {activeView === "fuss" && (
            <div>
              <h2>Füss</h2>
              
              {/* Coach feedback section for Füss */}
              <div style={{marginTop: 30, marginBottom: 30}}>
                <h2>Tagasiside treeningute kohta</h2>
                <div style={{display: 'flex', flexWrap: 'wrap', gap: 12}}>
                  {getTableDates(showPastDates, allDates)
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
                      ["A","B"].map(grp => {
                        const groupPlayers = (Array.isArray(playerPasswords) ? playerPasswords : Object.values(playerPasswords)).map(p => p.name).filter(n => fussGroups[n] === grp);
                        const attended = groupPlayers.filter(n => fussAttendance[d.date]?.[n] === "Jah");
                        if (attended.length === 0) return null;
                        // Coach feedback color logic
                        const feedbackList = coachFeedbackData?.[d.date]?.[`fuss-${grp}`] || {};
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
                              setCoachFeedbackSession({ date: d.date, group: `fuss-${grp}`, weekday: d.weekday, sport: 'fuss' });
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
              </div>
              
              <button onClick={() => setShowPastDates(v => !v)} style={{ margin: '16px 0 8px 0' }}>
                {showPastDates ? "Peida varasemad päevad" : "Näita varasemaid päevi"}
              </button>
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Group A */}
                <div>
                  <h3>Grupp A</h3>
                  <div style={{ 
                    overflowX: "auto", 
                    overflowY: "auto",
                    maxWidth: "100%",
                    maxHeight: "400px",
                    border: "1px solid #ddd",
                    borderRadius: "8px"
                  }}>
                    <table className="attendance-table" style={{ minWidth: "600px" }}>
                      <thead>
                        <tr style={{ position: "sticky", top: 0, zIndex: 15 }}>
                          <th style={{ 
                            position: "sticky", 
                            left: 0, 
                            top: 0,
                            background: "#f8f9fa", 
                            zIndex: 20,
                            minWidth: "120px",
                            borderRight: "2px solid #dee2e6"
                          }}>Mängija</th>
                          {getTableDates(showPastDates, allDates).map((date) => (
                            <th key={date.date} style={{ 
                              minWidth: "80px", 
                              whiteSpace: "nowrap",
                              background: "#f8f9fa",
                              position: "sticky",
                              top: 0
                            }}>
                              {date.weekday}<br/>{estonianDate(date.date)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(fussGroups)
                          .filter(([_, group]) => group === "A")
                          .map(([name]) => (
                            <tr key={name}>
                              <td style={{ 
                                position: "sticky", 
                                left: 0, 
                                background: "#fff", 
                                zIndex: 5,
                                fontWeight: "500",
                                borderRight: "2px solid #dee2e6"
                              }}>
                                <span className="player-name-desktop">{name}</span>
                                <span className="player-name-mobile">{formatMobileName(name)}</span>
                              </td>
                              {getTableDates(showPastDates, allDates).map((date) => (
                                <td key={date.date} style={{ minWidth: "80px" }}>
                                  <AttendanceToggleWithEffort
                                    value={fussAttendance[date.date]?.[name] || "Ei"}
                                    onChange={(val) => {
                                      const newAttendance = {
                                        ...fussAttendance,
                                        [date.date]: {
                                          ...fussAttendance[date.date],
                                          [name]: val
                                        },
                                      };
                                      setFussAttendance(newAttendance);
                                      set(
                                        databaseRef(db, `fussAttendance/${date.date}`),
                                        newAttendance[date.date]
                                      );
                                    }}
                                    effortValue={fussEffort[date.date]?.[`fuss-A`]?.[name] || null}
                                    onEffortChange={(effortValue) => {
                                      handleFussEffortChange(name, date.date, 'A', effortValue);
                                    }}
                                    playerName={name}
                                    date={date.date}
                                    coachMode={coachMode}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Group B */}
                <div>
                  <h3>Grupp B</h3>
                  <div style={{ 
                    overflowX: "auto", 
                    overflowY: "auto",
                    maxWidth: "100%",
                    maxHeight: "400px",
                    border: "1px solid #ddd",
                    borderRadius: "8px"
                  }}>
                    <table className="attendance-table" style={{ minWidth: "600px" }}>
                      <thead>
                        <tr style={{ position: "sticky", top: 0, zIndex: 15 }}>
                          <th style={{ 
                            position: "sticky", 
                            left: 0, 
                            top: 0,
                            background: "#f8f9fa", 
                            zIndex: 20,
                            minWidth: "120px",
                            borderRight: "2px solid #dee2e6"
                          }}>Mängija</th>
                          {getTableDates(showPastDates, allDates).map((date) => (
                            <th key={date.date} style={{ 
                              minWidth: "80px", 
                              whiteSpace: "nowrap",
                              background: "#f8f9fa",
                              position: "sticky",
                              top: 0
                            }}>
                              {date.weekday}<br/>{estonianDate(date.date)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(fussGroups)
                          .filter(([_, group]) => group === "B")
                          .map(([name]) => (
                            <tr key={name}>
                              <td style={{ 
                                position: "sticky", 
                                left: 0, 
                                background: "#fff", 
                                zIndex: 5,
                                fontWeight: "500",
                                borderRight: "2px solid #dee2e6"
                              }}>
                                <span className="player-name-desktop">{name}</span>
                                <span className="player-name-mobile">{formatMobileName(name)}</span>
                              </td>
                              {getTableDates(showPastDates, allDates).map((date) => (
                                <td key={date.date} style={{ minWidth: "80px" }}>
                                  <AttendanceToggleWithEffort
                                    value={fussAttendance[date.date]?.[name] || "Ei"}
                                    onChange={(val) => {
                                      const newAttendance = {
                                        ...fussAttendance,
                                        [date.date]: {
                                          ...fussAttendance[date.date],
                                          [name]: val
                                        },
                                      };
                                      setFussAttendance(newAttendance);
                                      set(
                                        databaseRef(db, `fussAttendance/${date.date}`),
                                        newAttendance[date.date]
                                      );
                                    }}
                                    effortValue={fussEffort[date.date]?.[`fuss-B`]?.[name] || null}
                                    onEffortChange={(effortValue) => {
                                      handleFussEffortChange(name, date.date, 'B', effortValue);
                                    }}
                                    playerName={name}
                                    date={date.date}
                                    coachMode={coachMode}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              {/* End of Group B attendance table section */}
            )}
          </div>
        </div>
      )}
      {step === "admin" && adminMode && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <button style={{ marginRight: 12 }} onClick={() => setShowAddPlayer(true)}>
              Halda mängijaid
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
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Group 1 */}
              <div>
                <h3>Grupp 1</h3>
                <div style={{ 
                  overflowX: "auto", 
                  overflowY: "auto",
                  maxWidth: "100%",
                  maxHeight: "400px",
                  border: "1px solid #ddd",
                  borderRadius: "8px"
                }}>
                  <table className="attendance-table" style={{ minWidth: "600px" }}>
                    <thead>
                      <tr style={{ position: "sticky", top: 0, zIndex: 15 }}>
                        <th style={{ 
                          position: "sticky", 
                          left: 0, 
                          top: 0,
                          background: "#f8f9fa", 
                          zIndex: 20,
                          minWidth: "120px",
                          borderRight: "2px solid #dee2e6"
                        }}>Mängija</th>
                        {getTableDates(showPastDates, allDates).map((date) => (
                          <th key={date.date} style={{ 
                            minWidth: "80px", 
                            whiteSpace: "nowrap",
                            background: "#f8f9fa",
                            position: "sticky",
                            top: 0
                          }}>
                            {date.weekday}<br/>{estonianDate(date.date)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(playerGroups)
                        .filter(([_, group]) => group === "1")
                        .map(([name]) => (
                          <tr key={name}>
                            <td style={{ 
                              position: "sticky", 
                              left: 0, 
                              background: "#fff", 
                              zIndex: 5,
                              fontWeight: "500",
                              borderRight: "2px solid #dee2e6"
                            }}>
                              <span className="player-name-desktop">{name}</span>
                              <span className="player-name-mobile">{formatMobileName(name)}</span>
                            </td>
                            {getTableDates(showPastDates, allDates).map((date) => (
                              <td key={date.date} style={{ minWidth: "80px" }}>
                                <AttendanceToggle
                                  value={attendance[date.date]?.[name] || "Ei"}
                                  onChange={(val) => {
                                    const newAttendance = {
                                      ...attendance,
                                      [date.date]: {
                                        ...attendance[date.date],
                                        [name]: val
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
              </div>

              {/* Group 2 */}
              <div>
                <h3>Grupp 2</h3>
                <div style={{ 
                  overflowX: "auto", 
                  overflowY: "auto",
                  maxWidth: "100%",
                  maxHeight: "400px",
                  border: "1px solid #ddd",
                  borderRadius: "8px"
                }}>
                  <table className="attendance-table" style={{ minWidth: "600px" }}>
                    <thead>
                      <tr style={{ position: "sticky", top: 0, zIndex: 15 }}>
                        <th style={{ 
                          position: "sticky", 
                          left: 0, 
                          top: 0,
                          background: "#f8f9fa", 
                          zIndex: 20,
                          minWidth: "120px",
                          borderRight: "2px solid #dee2e6"
                        }}>Mängija</th>
                        {getTableDates(showPastDates, allDates).map((date) => (
                          <th key={date.date} style={{ 
                            minWidth: "80px", 
                            whiteSpace: "nowrap",
                            background: "#f8f9fa",
                            position: "sticky",
                            top: 0
                          }}>
                            {date.weekday}<br/>{estonianDate(date.date)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(playerGroups)
                        .filter(([_, group]) => group === "2")
                        .map(([name]) => (
                          <tr key={name}>
                            <td style={{ 
                              position: "sticky", 
                              left: 0, 
                              background: "#fff", 
                              zIndex: 5,
                              fontWeight: "500",
                              borderRight: "2px solid #dee2e6"
                            }}>
                              <span className="player-name-desktop">{name}</span>
                              <span className="player-name-mobile">{formatMobileName(name)}</span>
                            </td>
                            {getTableDates(showPastDates, allDates).map((date) => (
                              <td key={date.date} style={{ minWidth: "80px" }}>
                                <AttendanceToggle
                                  value={attendance[date.date]?.[name] || "Ei"}
                                  onChange={(val) => {
                                    const newAttendance = {
                                      ...attendance,
                                      [date.date]: {
                                        ...attendance[date.date],
                                        [name]: val
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
              </div>
            </div>
          </div>

          {/* Füss Groups */}
          <div>
            <h2>Füss</h2>
            {/* Add show/hide past dates button for füss section */}
            <button onClick={() => setShowPastDates(v => !v)} style={{ margin: '16px 0 8px 0' }}>
              {showPastDates ? "Peida varasemad päevad" : "Näita varasemaid päevi"}
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Group A */}
              <div>
                <h3>Grupp A</h3>
                <div style={{ 
                  overflowX: "auto", 
                  overflowY: "auto",
                  maxWidth: "100%",
                  maxHeight: "400px",
                  border: "1px solid #ddd",
                  borderRadius: "8px"
                }}>
                  <table className="attendance-table" style={{ minWidth: "600px" }}>
                    <thead>
                      <tr style={{ position: "sticky", top: 0, zIndex: 15 }}>
                        <th style={{ 
                          position: "sticky", 
                          left: 0, 
                          top: 0,
                          background: "#f8f9fa", 
                          zIndex: 20,
                          minWidth: "120px",
                          borderRight: "2px solid #dee2e6"
                        }}>Mängija</th>
                        {getTableDates(showPastDates, allDates).map((date) => (
                          <th key={date.date} style={{ 
                            minWidth: "80px", 
                            whiteSpace: "nowrap",
                            background: "#f8f9fa",
                            position: "sticky",
                            top: 0
                          }}>
                            {date.weekday}<br/>{estonianDate(date.date)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(fussGroups)
                        .filter(([_, group]) => group === "A")
                        .map(([name]) => (
                          <tr key={name}>
                            <td style={{ 
                              position: "sticky", 
                              left: 0, 
                              background: "#fff", 
                              zIndex: 5,
                              fontWeight: "500",
                              borderRight: "2px solid #dee2e6"
                            }}>
                              <span className="player-name-desktop">{name}</span>
                              <span className="player-name-mobile">{formatMobileName(name)}</span>
                            </td>
                            {getTableDates(showPastDates, allDates).map((date) => (
                              <td key={date.date} style={{ minWidth: "80px" }}>
                                <AttendanceToggle
                                  value={fussAttendance[date.date]?.[name] || "Ei"}
                                  onChange={(val) => {
                                    const newAttendance = {
                                      ...fussAttendance,
                                      [date.date]: {
                                        ...fussAttendance[date.date],
                                        [name]: val
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

              {/* Group B */}
              <div>
                <h3>Grupp B</h3>
                <div style={{ 
                  overflowX: "auto", 
                  overflowY: "auto",
                  maxWidth: "100%",
                  maxHeight: "400px",
                  border: "1px solid #ddd",
                  borderRadius: "8px"
                }}>
                  <table className="attendance-table" style={{ minWidth: "600px" }}>
                    <thead>
                      <tr style={{ position: "sticky", top: 0, zIndex: 15 }}>
                        <th style={{ 
                          position: "sticky", 
                          left: 0,
                          top: 0,
                          background: "#f8f9fa", 
                          zIndex: 20,
                          minWidth: "120px",
                          borderRight: "2px solid #dee2e6"
                        }}>Mängija</th>
                        {getTableDates(showPastDates, allDates).map((date) => (
                          <th key={date.date} style={{ 
                            minWidth: "80px", 
                            whiteSpace: "nowrap",
                            background: "#f8f9fa",
                            position: "sticky",
                            top: 0
                          }}>
                            {date.weekday}<br/>{estonianDate(date.date)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(fussGroups)
                        .filter(([_, group]) => group === "B")
                        .map(([name]) => (
                          <tr key={name}>
                            <td style={{ 
                              position: "sticky", 
                              left: 0, 
                              background: "#fff", 
                              zIndex: 5,
                              fontWeight: "500",
                              borderRight: "2px solid #dee2e6"
                            }}>
                              <span className="player-name-desktop">{name}</span>
                              <span className="player-name-mobile">{formatMobileName(name)}</span>
                            </td>
                            {getTableDates(showPastDates, allDates).map((date) => (
                              <td key={date.date} style={{ minWidth: "80px" }}>
                                <AttendanceToggle
                                  value={fussAttendance[date.date]?.[name] || "Ei"}
                                  onChange={(val) => {
                                    const newAttendance = {
                                      ...fussAttendance,
                                      [date.date]: {
                                        ...fussAttendance[date.date],
                                        [name]: val
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
        </div>
      )}

    {/* Add/Manage Player Modal (admin) */}
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
                      <label>Eesnimi:<br/>
                        <input 
                          value={newPlayerFirst} 
                          onChange={e => setNewPlayerFirst(e.target.value)} 
                          style={{ width: "95%" }} 
                          required 
                        />
                      </label>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label>Perekonnanimi:<br/>
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
                      <label>Mängija parool:<br/>
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
                      <label>Vanema kood:<br/>
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
                            Tennis: Grupp {playerGroups[player.name] || '1'} | 
                            Füss: Grupp {fussGroups[player.name] || 'A'}
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
    )}

    {/* Delete confirmation modal */}
    {showDeleteConfirm && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1001
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: 400,
          width: '90%'
        }}>
          <h3>Kinnita arhiveerimine</h3>
          <p>Oled kindel, et soovid mängija <strong>{playerToDelete}</strong> arhiveerida?</p>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Mängija eemaldatakse aktiivsete mängijate seast, kuid andmed säilitatakse 
            ja saab hiljem taastada.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                setPlayerToDelete(null);
              }}
              style={{
                padding: '8px 16px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              Ei
            </button>
            <button
              onClick={handleArchivePlayer}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                background: '#dc3545',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              Jah, arhiveeri
            </button>
          </div>
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

  // ...existing code for FeedbackSummaryByGroup legend and rendering...





// --- FeedbackModal component ---

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

// --- Helper: get next 5 weekdays ---
function getNextFiveWeekdays() {
  const result = [];
  let current = new Date();
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

export default App;