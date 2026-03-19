import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AppLayout from "./layouts/AppLayout";
import RoleLayout from "./layouts/RoleLayout";
import ProtectedRoute from "./layouts/ProtectedRoute";

import LoginPage from "./pages/LoginPage";
import PlayerPage from "./pages/PlayerPage";
import ParentPage from "./pages/ParentPage";

import AdminPage from "./pages/AdminPage";
import RosterPage from "./pages/RosterPage";
import PreStatusPage from "./pages/PreStatusPage";
import AttendancePage from "./pages/AttendancePage";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import SessionListPage from "./pages/SessionListPage";
import SessionPage from "./pages/SessionPage";
import HistoryPage from "./pages/HistoryPage";
import PlayerStatsPage from "./pages/PlayerStatsPage";
import AdminAttendancePage from "./pages/AdminAttendancePage";
import CoachOverviewPage from "./pages/CoachOverviewPage";
import FeedbackAnalyticsPage from "./pages/FeedbackAnalyticsPage";
import ExportPage from "./pages/ExportPage";
import NotFoundPage from "./pages/NotFoundPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>

          {/* Public route */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />

          {/* Role protected area */}
          <Route element={<RoleLayout />}>

            <Route
              path="/player"
              element={<Navigate to="/sessions" replace />}
            />

            <Route
              path="/parent"
              element={<Navigate to="/sessions" replace />}
            />

            <Route
              path="/coach"
              element={<Navigate to="/sessions" replace />}
            />



            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/player/:playerId/stats"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <PlayerStatsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/attendance"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminAttendancePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/coaches"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <CoachOverviewPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/feedback"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <FeedbackAnalyticsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/export"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <ExportPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/roster"
              element={
                <ProtectedRoute allowedRoles={["admin", "coach"]}>
                  <RosterPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/prestatus"
              element={
                <ProtectedRoute allowedRoles={["coach", "admin"]}>
                  <PreStatusPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/attendance"
              element={
                <ProtectedRoute allowedRoles={["admin", "coach"]}>
                  <AttendancePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/sessions"
              element={
                <ProtectedRoute allowedRoles={["admin", "coach", "parent", "player"]}>
                  <SessionListPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/history"
              element={
                <ProtectedRoute allowedRoles={["parent", "player"]}>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/session/:instanceId"
              element={
                <ProtectedRoute allowedRoles={["admin", "coach"]}>
                  <SessionPage />
                </ProtectedRoute>
              }
            />

          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;