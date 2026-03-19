# Tallink Trenn v2 — Master Implementation Plan

**Schema Version:** Frozen v1.0
**Last Updated:** 2026-03-19
**Architecture:** React + Firebase RTDB (Single Role Routing, Deterministic IDs)

## Status Legend
✅ Completed (Fully implemented, tested, and visually verified)
🟡 Partially Completed (Needs cleanup, UI, or bug fixes)
⬜ Not Started (Pending)
🚨 URGENT (Security risk or critical blocker)

---

## Phase 1 — Foundation, Security & Sandboxing
*Agent Note: The live database is currently open. Security rules and local emulator setup are the highest priority before any feature development continues.*

- [x] ✅ **1.1 Project Setup & Repo Hygiene:** React app structured, modular services/utils/constants.
- [x] ✅ **1.2 Firebase RTDB Init & Environment:** Connected to RTDB, deterministic writes working, `date-fns-tz` integrated.
- [x] ✅ **1.3 Security Rules Placeholder:** URGENT. Lock down the open production database paths. Allow authenticated `Admin` role full access.
- [x] ✅ **1.4 Local Emulator Setup:** Set up Firebase Emulator suite for local dev workflow so agents do not corrupt the live DB.
- [x] ✅ **1.5 Auth + Single Role Routing:** Role routing works (`users/{uid}/role`), cleanup of legacy `roles/` drift done. Admin Role Manager UI complete.

## Phase 2 — RTDB Schema Baseline & Permissions
- [x] ✅ **2.1 RTDB JSON Tree Design:** Skeleton and conventions documented in `schema.md`.
- [x] ✅ **2.2 Users Node:** Needs Admin Role Manager UI completed.
- [x] ✅ **2.3 Players Node + Parent Links:** Admin UI for players and parent links completed.
- [x] ✅ **2.4 Coach Permissions Node:** Implement global vs. assigned permissions logic. Critical blocker for Phase 4.

## Phase 3 — Sessions Engine
- [x] ✅ **3.1 Session Definitions CRUD:** Admin UI complete.
- [x] ✅ **3.2 Recurring Enrollments Manager:** Admin UI complete.
- [x] ✅ **3.3 Recurring Changes Manager:** Effective-dated changes pending.
- [x] ✅ **3.4 Session Instance Generator:** 30-day horizon, `YYYY-MM-DD__definitionId` working.
- [x] ✅ **3.5 Roster Sync Engine:** Additive, protective, Policy B precedence working.
- [x] ✅ **3.6 Admin "Sync Rosters Next 30 Days":** Button complete.
- [x] ✅ **3.7 Security Rules v2:** Tighten rules per node/role post-schema implementation.

## Phase 4 — Roster & Attendance Core
*Agent Note: Do not start until Phase 2.4 (Coach Permissions) is fully ✅.*

- [x] ✅ **4.1 Manual Roster Add/Remove:** Coach/admin UI; must respect coach permissions.
- [x] ✅ **4.2 Attendance Schema Implementation:** Spec shape, computed locks.
- [x] ✅ **4.3 Pre-Status UI + Lock Rule:** Player/parent UI; locks 60 minutes before start.
- [x] ✅ **4.4 Capacity Enforcement:** Kinnitatud-only; full/override warnings.
- [x] ✅ **4.5 Coach/Admin Pre-Status Overrides:** Warnings if overridden after start time.
- [x] ✅ **4.6 Real Attendance Marking:** Kohal / Hilines / Puudus / Vabastatud.
- [x] ✅ **4.7 Walk-ins + Late Cancel Flagging**

## Phase 5 — Extra Sessions & Requests
- [x] ✅ **5.0 Invitation System:** Admin generates invite links for player and parent roles. Accept-invite page handles Auth user creation and player linking. No email integration — manual link sharing only.
- [x] ✅ **5.1 One-off SessionInstance Creation:** Coach/admin UI.
- [x] ✅ **5.2 Attendance Metadata:** markedBy / markedAt fields on attendance nodes.
- [x] ✅ **5.3 Attendance Engine Improvements:** walk-in attendance auto-kohal on roster add, attendance write structure validation, data consistency checks.

## Phase 6 — Coach Mobile UI & Messaging
- [x] ✅ **6.1 — SessionListPage:** Coach mobile home screen at /sessions. Session list grouped by time state. Coach login redirect. Tap to navigate to /session/:instanceId.
- [x] ✅ **6.2 — SessionPage:** Unified coach/admin session view. preStatus + realStatus in one page. Tap cycle, 5-second debounce with flush-on-exit, summary bar, walk-in UI, time-based mode switching.
- [x] ✅ **6.3 — Mobile UI Optimizations:** Mark All Present button, swipe improvements, layout polish, localStorage last session.
- [x] ✅ **6.4 — SessionPage Tab Structure:** Add three-tab navigation to SessionPage (Staatus, Kohalolek, Tagasiside). Move existing attendance content to Kohalolek tab. Build Staatus tab with preStatus display, extra requests, roster tools. Tagasiside tab placeholder only. Time-based default tab logic. Remove /coach placeholder. Simplify coach sidebar to Treeningud + Logout.
- [x] ✅ **6.5 — Session Messaging:** sessionMessages schema, coach write UI in Staatus tab, read display for all permitted roles. Tests A-E passed. Two fixes applied: createdByName from RTDB displayName, Instance ID hidden from player/parent.
- [x] ✅ **6.6 — Parent Session Cards:** SessionListPage extended to support parent role. Parent sees chronological session cards across all linked children. Data pipeline: fetch parentLinks/{uid}, fetch rosters per instanceId, merge into chronological list. Each card shows: child name, session time/sport, preStatus with Kinnitan/Ei osale buttons, attendance result after session start, coach feedback after sessionEnd+24h, feedback reminder if missing within 7-day window. Child filter: Kõik lapsed by default. Parent cannot mark attendance, write feedback, or access roster tools. PreStatus writes to attendance/{instanceId}/{playerId}/preStatus. /prestatus redirect for parents added after this chunk completes. Role-aware card components: SessionCardCoach, SessionCardParent.
- [x] ✅ **6.7 — Player Session Cards:** Player role uses /sessions as home screen. Session cards show: session details, preStatus controls (with lock rule and capacity check), attendance result after session start, player feedback entry inline (within sessionEnd + 7 day window, only if realStatus kohal or hilines), session messages. Replaces /prestatus for players. /prestatus redirect added after this chunk completes. Player sidebar updated to Treeningud + Logout.

## Phase 7 — Feedback
- [x] ✅ **7.1 — Coach Feedback:** Tagasiside tab in SessionPage. Emoji-based effort rating per player. 7-day edit window from sessionEnd.
- [x] ✅ **7.2 — Player Feedback:** Inline on PreStatusPage past session cards. Effort + coach engagement emoji ratings. 7-day edit window. Only shown if realStatus kohal or hilines.
- [x] ✅ **7.3 — Feedback Visibility + Reminder:** 24h delay for coach feedback visibility to player/parent. Reminder indicator on /prestatus for missing feedback within window.
- [x] ✅ **7.4 — Parent/Player History:** /player/:playerId page. Session history, attendance, coach and player feedback.

## Phase 8 — Admin Oversight & Analytics
- [x] ✅ **8.1 — Attendance Statistics per Player:** 
  Per-player attendance summary. Attendance rate, 
  late cancel count, absence count, session count. 
  Visible to admin. Accessible from player list.
- [x] ✅ **8.2 — Admin Attendance Viewer:** 
  Cross-session attendance overview. Filter by 
  player, date range, sport. See patterns across 
  multiple sessions.
- [x] ✅ **8.3 — Coach Performance Overview:** 
  Admin sees coach engagement averages per coach 
  over time. Based on player coachEngagement ratings.
- [x] ✅ **8.4 — Feedback Analytics:** 
  Group effort averages over time, coach engagement 
  trends, per-player feedback history summary.
- [x] ✅ **8.5 — Session Summary Export:** 
  Export attendance and feedback data to CSV for 
  external reporting.

## Phase 9 — UX Hardening & Testing

**Priority order:**

- [x] ✅ **9.1 — Loading / Error / Empty States:** 
  Consistent loading spinners and error messages 
  across all pages. Meaningful empty states 
  distinguishing "no data yet" vs "no data matching 
  filters". No blank screens while data loads.

- [x] ✅ **9.2 — 404 Catch-All Route:** 
  Unknown routes show a proper 404 page with 
  role-aware navigation back to home. Fix /coach 
  empty page issue.

- [x] ✅ **9.3 — Acceptance Tests:** 
  Scripted role flows verifying end-to-end behavior 
  for coach, player, parent, and admin workflows.

- [x] ✅ **9.4 — Form Validation:** 
  Graceful error handling on invitation creation, 
  session definition forms, and player add forms.

- [x] ✅ **9.5 — Permission Edge Cases:** 
  UI must never show actions a user cannot perform. 
  Audit all role-based controls.

- [x] ✅ **9.6 — State Consistency After Writes:** 
  After any action, UI reflects it immediately. 
  No stale state requiring refresh. Covers preStatus 
  changes, removedByCoach, feedback submit.

- [x] ✅ **9.7 — Time-Based Transition Verification:** 
  Verify all time rules switch correctly: preStatus 
  lock (-60min), session start → Kohalolek default, 
  sessionEnd+24h → feedback visible, 
  sessionEnd+7d → edit lock.

- [ ] ⬜ **9.8 — Cross-Role Consistency:** 
  Same data must look consistent across coach, 
  player, parent, admin. Audit known mismatches.

- [ ] ⬜ **9.9 — Deferred to Phase 10:** List ordering, 
  write collisions, data fallback safety, session 
  generation edge cases, mobile layout audit, 
  security rules audit.
  
- [ ] ⬜ **9.9 — List Ordering + Grouping Rules:** 
  Confirm sorting always correct: today vs future 
  vs past, multiple children parent view, removed 
  players at bottom.

- [ ] ⬜ **9.10 — Write Collision Handling:** 
  App behaves predictably when two users act 
  simultaneously. preStatus + coach override 
  conflict handling.

- [ ] ⬜ **9.11 — Data Fallback Safety:** 
  App must not break if data is missing: no 
  attendance node, partial feedback node, 
  missing player link.

- [ ] ⬜ **9.12 — Session Generation Edge Cases:** 
  Handle sync on definitions with no enrollments, 
  gaps in date ranges, duplicate instance prevention.

- [ ] ⬜ **9.13 — Mobile Layout Audit:** 
  Audit non-optimized pages for mobile usability. 
  AdminPage, RosterPage, AttendancePage.

- [ ] ⬜ **9.14 — Security Rules Audit:** 
  Final security sweep before Phase 10 deployment. 
  Verify all rules match intended permissions.

## Phase 10 — Deployment & Lockdown
- [ ] ⬜ **10.1 Production Rules Tightening:** Final security sweep and release checklist.