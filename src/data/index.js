// src/data/index.js
// Central export for all data layer modules

// Session options (admin-defined training slots)
export {
    subscribeToSessionOptions,
    subscribeToAllSessionOptions,
    addSessionOption,
    updateSessionOption,
    deleteSessionOption,
    getSessionsForDay,
    formatSessionTime
} from './sessionOptions';

// Player schedules (weekly templates and overrides)
export {
    subscribeToDateOverrides,
    subscribeToAllOverrides,
    addScheduleOverride,
    removeScheduleOverride,
    getPlayersForSession,
    getDayNameFromDate,
    isDateInPast
} from './playerSchedules';

// Capacity management
export {
    CAPACITY_STATUS,
    getCapacityStatus,
    getSessionCapacity,
    getCapacityColor,
    getCapacityLabel,
    wouldExceedCapacity,
    formatCapacity
} from './capacityManager';

// Audit logging
export {
    AUDIT_ACTIONS,
    writeAuditLog,
    logScheduleTemplateChange,
    logScheduleOverride,
    logPlayerMove,
    logCapacityOverride,
    logBulkUpload,
    subscribeToRecentLogs,
    getActionLabel
} from './auditLog';

// Migration
export {
    runMigration,
    isMigrationComplete,
    previewMigration
} from './migration';

// Extra Sessions
export {
    requestExtraSession,
    subscribeToPlayerRequests,
    subscribeToRequestsForDate,
    updateRequestStatus
} from './extraSessions';

// Session Applications (New)
export {
    createApplication,
    updateApplicationStatus,
    deleteApplication,
    subscribeToApplicationsForDate,
    subscribeToSessionApplications,
    subscribeToAllApplications
} from './sessionApplications';

// Attendance
export {
    updatePlayerAttendance
} from './attendance';

// Session Reports (Actual Attendance)
export {
    markActualAttendance,
    subscribeToSessionReport,
    subscribeToReportsForDay
} from './sessionReports';

// User Management
export {
    loginUser,
    createCoach,
    updateCoach,
    deleteCoach,
    getCoaches,
    createParent,
    updateParent,
    deleteParent,
    getParents,
    requestAccess,
    approveAccessRequest,
    denyAccessRequest,
    subscribeToCoachRequests,
    deleteRequest
} from './users';

// Feedback
export {
    savePlayerFeedback,
    saveCoachFeedback,
    getFeedbackTrend,
    getCoachFeedback,
    FEEDBACK_EMOJI_Q1,
    FEEDBACK_EMOJI_Q2,
    FEEDBACK_EMOJI_Q3,
    COACH_FEEDBACK_EMOJI
} from './feedback';
