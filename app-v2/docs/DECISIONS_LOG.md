Tallink Trenn v2 — Architectural Decisions Log

Last Updated: 2026-02-26
Schema Version: Frozen v1.0

This file records architectural decisions that affect logic, behavior, or precedence.
If a decision here conflicts with code, this file wins.

⸻

[2026-02-23] Role Storage — Single Source of Truth

Role is stored only at:

users/{uid}/role

Role is a lowercase string:
	•	admin
	•	coach
	•	parent
	•	player

The legacy node roles/{uid} was temporarily used for bootstrap login and must be removed.

Decision:
roles/ is not part of the schema and must not exist going forward.

⸻

[2026-02-23] parentLinks Direction

Correct structure:

parentLinks/{parentUid}/{playerId} = true

Reason:
Parent login must efficiently answer “which players do I manage?”

Reverse direction is not allowed.

⸻

[2026-02-23] SessionInstance ID Strategy (Frozen)

Recurring sessionInstance ID format:

YYYY-MM-DD__definitionId

Rules:
	•	Deterministic
	•	No push IDs
	•	Must use Europe/Tallinn date
	•	Format must never change in future versions

⸻

[2026-02-23] 30-Day Horizon Rule

Both engines operate on the same window:
	•	Instance Generator
	•	Roster Sync Engine

Rule:

Generate and sync only for dates where:

date >= today (Europe/Tallinn)
AND
date <= today + 30 calendar days (inclusive)

No instances or rosters may exist outside this horizon unless manually created.

⸻

[2026-02-23] Roster Sync Policy — Additive & Protective

Roster engine behavior:

Add:
	•	Missing players from recurringEnrollments + recurringChanges

Remove:
	•	Only entries where:
	•	source equals “recurring”
	•	enrollment is no longer valid

Protect:
	•	Never modify or remove:
	•	source: “manual_add”
	•	source: “approved_request”

Roster engine must be idempotent.

⸻

[2026-02-23] recurringChanges Precedence (Policy B)

For any player and date:

If both “add” and “remove” apply:
remove wins.

Change actions:
	•	add
	•	remove

Changes apply per specific date using effectiveFrom and effectiveTo.

⸻

[2026-02-23] recurringEnrollments Effective Dating

Structure:

recurringEnrollments/{definitionId}/{playerId}

Fields:
	•	active (boolean)
	•	effectiveFrom (YYYY-MM-DD or null)
	•	effectiveTo (YYYY-MM-DD or null)

effectiveFrom and effectiveTo are required for mid-season schedule changes.

⸻

[2026-02-23] Late Cancel Policy (Frozen)

lateCancel is:
	•	Stored on the attendance record
	•	Boolean
	•	Default false
	•	Set to true only when coach/admin writes realStatus = “Puudus”

Players and parents never set lateCancel.

⸻

[2026-02-23] Coach Permission Resolution

A coach has permission to manage a sessionInstance if:
	1.	coachPermissions/{uid}/global is true
OR
	2.	sessionInstance.definitionId exists in coachPermissions/{uid}/sessionDefinitions
OR
	3.	coach uid appears in sessionInstance.assignedCoachIds

Permissions are never stored per-instance manually outside the schema.

⸻

[2026-02-23] Timezone Policy

All date and time logic uses:

Europe/Tallinn

All computations must use date-fns-tz.

No raw Date() comparisons without timezone normalization.

⸻

[2026-02-23] Ootel Default Policy

If attendance record does not exist for a rostered player:

preStatus is implicitly “Ootel”.

Do not proactively write Ootel records.

Only write attendance when status changes.

⸻

[2026-02-23] Capacity Rule

Session is full if:

confirmedCount >= capacity

confirmedCount counts only:

preStatus = “Kinnitatud”

Other statuses do not affect capacity.

⸻

[2026-02-23] No Legacy Nodes Rule

Nodes that must not exist in final architecture:
	•	roles/
	•	Any name-based keys
	•	Push IDs for recurring sessionInstances

All IDs must be stable and deterministic where specified.

⸻

[2026-02-26] Emulator Seed Button — Temporary

A "Seed Emulator Admin User" button exists in AdminPage.jsx.
This is a temporary development tool.

Rules:
- Only visible when VITE_USE_EMULATOR=true
- Must be removed before Phase 10 (Production Lockdown)
- Never appears in production builds

Removal: When chunk 10.1 (Production Rules Tightening) runs,
the agent must search for and remove all code gated by
VITE_USE_EMULATOR including this button and seedEmulator.js.

⸻

[2026-02-26] Emulator toggle: 
VITE_USE_EMULATOR=true in .env.local enables local emulator mode. This file is never committed to the repo.

⸻

[2026-02-26] Emulator Seed Button Location

Seed button lives on LoginPage.jsx, not AdminPage.jsx.

Reason: AdminPage requires authentication. Seeding must happen
before login to avoid circular dependency (need role to log in,
need login to seed role).

Rules:
- Only visible when VITE_USE_EMULATOR=true
- Must be removed in chunk 10.1 along with seedEmulator.js

⸻

[2026-02-27] WTN Field Format

WTN is stored as a string in RTDB, not a number.
Always 2 decimal places (e.g. "32.10" not 32.1).
Stored via parseFloat().toFixed(2).
Display and sort must treat it as a numeric string.

⸻

[2026-03-03] Roster Override Model:
Coach may remove recurring player at instance level.
Implementation: rosters/{instanceId}/{playerId}.removedByCoach = true.
Sync engine must respect this flag and never re-add for that instance.
Admin deletions always hard-delete the node.

⸻

[2026-03-03] Attendance Node Structure:
Single node at attendance/{instanceId}/{playerId}.
Contains preStatus, realStatus, lateCancel.
No separate preStatus node.

[2026-03-03] preStatus Values:
kinnitatud | eiOsale | null
null means "Vastamata" — derived display state, never written.
kinnitatud = confirmed attending.
eiOsale = will not attend.

[2026-03-03] realStatus Values:
kohal | hilines | puudus | vabastatud | null
Set by coach or admin only.

[2026-03-03] lateCancel Rule:
lateCancel = true when realStatus written as "puudus"
AND preStatus was "kinnitatud" at time of write.
Never set manually. Never set by player or parent.

[2026-03-03] preStatus Lock Rule:
preStatus locks 60 minutes before session startTime.
Lock computed in Europe/Tallinn timezone via getTallinnNow().
Lock applies to player and parent roles only.
Coach and admin may override at any time.

⸻

[2026-03-03] Player-User Linking:
users/{uid} stores a playerId field linking the Auth user to their players/{playerId} record.
This field is null for admin, coach, and parent roles.
For player role, playerId is required and is set during invite acceptance.
The players/ node exists independently of Auth — players can exist without accounts.
Direct seed (seedPlayerUser) must manually set playerId to link test player to a players/ record.

⸻

[2026-03-03] Invitation System (Deferred to Phase 5):
Account creation for player and parent roles uses an invitation-based flow.
Admin creates player record first, then generates an invite with a secure token.
Invite link is shared manually (no email integration in Phase 5).
On acceptance: Auth user is created, users/{uid} is written with playerId, parentLinks are written for parent invites.
Admin never sets passwords or creates Auth users directly.
Schema: invitations/{inviteId} = { type, role, email, playerId, playerIds, status, token, createdAt, expiresAt, acceptedAt, acceptedByUid }
Status values: pending | accepted | expired

⸻

[2026-03-05] Player Offboarding (Deferred to Phase 8):
When a player leaves the club, the following cleanup is required:
1. Set players/{playerId}.active = false
2. Find all users/{uid} where playerId === that playerId — delete or deactivate those Auth users and user nodes
3. Find all parentLinks/{uid}/{playerId} entries for that playerId — remove those specific links
4. If a parent's parentLinks becomes empty after removal (no other linked players), deactivate that parent user too
5. If a parent still has other active linked players, keep their account intact
This logic must be built as an admin action in Phase 8 Admin Oversight.
Do not implement now. Document only.

⸻

[2026-03-06] Future Instance Generation (Deferred to Phase 6): Admin currently creates future session instances manually. Phase 6 should include bulk generation of recurring instances (e.g. generate next N weeks) and automatic roster propagation from recurringEnrollments. This reduces admin workload from multiple clicks per session to a single bulk action.
[2026-03-06] eiOsale Display Label: The stored preStatus value "eiOsale" must never be changed. UI display label may be changed to "Puudun" in Phase 9 UX polish. Data model and display language are intentionally separated.
[2026-03-06] Walk-in Source Value: Roster entries created from walk-ins use source: "walkIn" (camelCase). Consistent with existing walkIn: true field on roster entries. Other source values: "recurring", "manual_add", "extraRequest".
[2026-03-06] Coach UI Mode Switching (Deferred to Phase 6): Before session start, coach sees preStatus view. After session start, coach sees realStatus view. This is a default view switch, not a permissions change — coach can always navigate back. To be implemented as part of Phase 6 coach mobile UI overhaul.
[2026-03-06] Coach Mobile UI Overhaul (Deferred to Phase 6): Full coach attendance UX to be built in Phase 6 including: tap cycle (not marked -> kohal -> puudus -> hilines -> vabastatud), 5-second debounce with flush-on-exit, summary bar (Present X | Late X | Absent X), Mark All Present button, walk-in UI, mobile-optimized layout.
[2026-03-06] Unified Session View (Phase 6 Decision Required): PreStatusPage and AttendancePage are currently separate. Phase 6 must decide whether to merge into a single unified session view for coaches or keep separate. Decision should be made before building mobile UI.

⸻

[2026-03-08] Coach Login Redirect: Coaches are redirected to /sessions on login. This is their mobile home screen. Admins redirect to /admin. Players and parents redirect to existing home. Rationale: coach primary task is running sessions, not system administration.

[2026-03-08] SessionListPage Architecture: New page at /sessions serves as coach mobile home screen. Sessions grouped into: Aktiivne (started, within 2h), Täna (today, not yet started), Tulevased (future dates), Möödunud (past, collapsed). Permission filter reuses existing coach permission logic — no new permission system.

[2026-03-08] SessionPage Unified View (Phase 6.2): SessionPage.jsx at /session/:instanceId replaces AttendancePage for coach/admin workflow. PreStatusPage.jsx kept unchanged for player/parent. AttendancePage.jsx kept as fallback but not actively used. Role-based routing: coach/admin -> SessionPage, player/parent -> PreStatusPage.

⸻

[2026-03-09] Session Route Access: /session/:instanceId is coach and admin only. Players and parents never access this route. Player/parent flow stays on /prestatus unchanged.

[2026-03-09] Feedback Architecture: Coach writes feedback per player from SessionPage roster row. Stored at feedback/{instanceId}/{playerId} with fields: coachNote (string), rating (1-5 integer), createdAt (ISO). Player views feedback at /feedback/:instanceId. Parent views player history including attendance and feedback at /player/:playerId. Feedback belongs to player workflow, not coach session workspace.

[2026-03-09] SessionPage Three-Tab Architecture: /session/:instanceId is a time-aware three-tab workspace, not just an attendance page. Tabs: Staatus (preStatus, extra requests, roster tools), Kohalolek (real attendance, walk-ins, tap cycle, debounce), Tagasiside (feedback, corrections, summary). Default tab by time: before session start → Staatus, from start until end+1h → Kohalolek, after that → Tagasiside. Coach can always switch tabs manually — time controls default only, not permissions. All three tabs are inside one page, not separate routes.

[2026-03-09] Coach Navigation Simplified: Coach sidebar shows only Treeningud (/sessions) and Logout. Roster, Attendance, Pre-Status are admin/player tools and must not appear in coach nav. The /coach placeholder page will be removed in chunk 6.4.

[2026-03-09] Feedback Schema: feedback/{instanceId}/{playerId}/coach and feedback/{instanceId}/{playerId}/player are separate nodes. Coach node: effort (1-5), note (string), createdAt (ISO), createdBy (uid), updatedAt (ISO). Player node: effort (1-5), coachEngagement (1-5), note (string), createdAt (ISO), updatedAt (ISO). Both use emoji-based 1-5 scale. Editable until sessionEnd + 7 days. Never use submittedAt for window — always sessionEnd as anchor.

[2026-03-09] Feedback Visibility Rules: Coach feedback visible to player and parent only after sessionEnd + 24h. Admin sees immediately. Coach sees immediately. Player feedback visible to coach and admin immediately. Parent sees player feedback immediately. Visibility check is client-side for now — sessionEnd timestamp from sessionInstances. Phase 10 security hardening will enforce server-side via visibleAt field.

[2026-03-09] Feedback Edit Window: Both coach and player feedback editable until sessionEnd + 7 days. UI hides edit controls after this window. Server-side enforcement deferred to Phase 10. Coach can edit for full 7 days regardless of when they first submitted.

[2026-03-09] Feedback Reminder UI: Until push notifications are implemented, show an inline reminder on /prestatus for past sessions where player has not yet submitted feedback and the 7-day window is still open. Label: "Anna tagasiside". Push notification architecture deferred to later phase.

[2026-03-09] Session Card Averages: SessionListPage session cards show coach feedback average, player effort average, and coach engagement average only when feedback exists. Never show zeroes — omit averages entirely if no feedback data exists yet. To be added in Phase 7.

[2026-03-09] Session Messaging (6.5): Lightweight coach-to-group messaging at sessionMessages/{instanceId}/{messageId} with fields: text, createdBy, createdAt. Visible to coach, rostered players, and parents. Displayed in Staatus tab of SessionPage. Examples: court changes, equipment reminders, timing updates.

[2026-03-09] /coach Route: Route removed from App.jsx in chunk 6.4. Currently shows empty page due to React Router fallthrough. Add a catch-all 404 redirect in Phase 9 UX hardening.

[2026-03-10] Parent Navigation Architecture: Parents use /sessions as their home screen, same route as coach but different content rendered based on role. Parent sees chronological session cards across all linked children. Each card shows: child name, session time and sport, preStatus with Kinnitan/Ei osale buttons (parent can set preStatus for their children), attendance result after session start, coach feedback after sessionEnd + 24h, feedback reminder indicator if player feedback missing within 7-day window. Parents can set preStatus for linked children. Parents cannot write player feedback, write coach feedback, access roster tools, or mark real attendance. Child filter at top: Kõik lapsed by default, can filter to one child. /prestatus remains player-only route. /parent route removed entirely. Parents never see coach workspace tools. SessionListPage must support three distinct card types: coach view, admin view, parent view.

---

[2026-03-11] Parent Child Filter UI: Changed from dropdown to pill/toggle buttons. Pills are cleaner and faster to tap for typical case of 2-3 children. Dropdown was original decision but pills are better UX at small scale.

[2026-03-11] Coach Engagement Rating Visibility: player.coachEngagement is hidden from parents. It is a club management signal, not a parent-facing metric. Visible to coach and admin only. Parents see only player.effort and coach.effort ratings.

[2026-03-11] Tagasiside Tab Player Feedback Visibility: Coach sees player feedback as group averages only (effort average + coach engagement average) — not individual responses. Admin sees full individual player feedback per player (effort, coachEngagement, note). This protects player anonymity from their own coach while giving admin full oversight.

---

[2026-03-19] Coach Navigation Scope: Coach sidebar intentionally minimal — Treeningud + Logout only. No separate history, player list, or analytics pages for coach. All coach workflow lives inside /sessions and /session/:instanceId. Past sessions accessible via Möödunud group in SessionListPage. Admin handles all analytics and oversight views. Duplication of logic avoided by keeping coach workflow session-first.

[2026-03-19] Coach /admin Access: Coach navigating to /admin is silently redirected to /sessions. No explicit access denied page shown — redirect is the correct UX for role mismatch. Explicit access denied messages only shown within permitted pages when specific session permission is missing.

[2026-03-19] Session Default Tab Edge Case: Sessions starting within 60 minutes default to Kohalolek tab, not Staatus tab. This is correct behavior — the active window starts at sessionStart - 60min, and at that point player/parent preStatus is already locked. Coach has no preStatus actions remaining so Kohalolek is the appropriate default.

[2026-03-19] Admin Feedback Real-Time Update: Admin Tagasiside tab does not auto-refresh when player submits feedback from another session. Admin must reload the session page to see newly submitted player feedback. This is acceptable — admin feedback review is not a real-time workflow. Real-time feedback sync deferred to Phase 10 if needed.