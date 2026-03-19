# Tallink Trenn v2 — Acceptance Tests

## Overview
This document contains comprehensive acceptance test cases covering all four role workflows in Tallink Trenn v2.
Note: these are manual tests run against the local Firebase emulator.

## Test Users Required
List of test accounts needed:
- admin@test.com
- coach@test.com
- player@test.com (linked to a player)
- parent@test.com (linked to 2 players)

## Admin Tests (AT-A)

## Test: [AT-A1] Create a new player
**Role:** admin
**Preconditions:**
- Logged in as admin.
**Steps:**
1. Navigate to the Players management view.
2. Fill out the new player form (First Name, Last Name, Birth Year, etc.).
3. Click Save/Create.
**Expected:**
- Player is successfully created and appears in the players list.

## Test: [AT-A2] Create a player invite link
**Role:** admin
**Preconditions:**
- Logged in as admin.
- A player record exists without an associated Auth user.
**Steps:**
1. Navigate to the player profile or the invitations view.
2. Select "Create Invite" for the player role.
3. Generate the link.
**Expected:**
- Invitation token is created in the database.
- A shareable URL is presented to the admin.

## Test: [AT-A3] Create a parent invite link
**Role:** admin
**Preconditions:**
- Logged in as admin.
- At least one player record exists.
**Steps:**
1. Navigate to the invitations view.
2. Select "Create Invite" for the parent role.
3. Associate the invite with the target player(s).
4. Generate the link.
**Expected:**
- Invitation token is created with `parent` role and linked player IDs.
- A shareable URL is presented to the admin.

## Test: [AT-A4] Generate session instances (next 30 days)
**Role:** admin
**Preconditions:**
- Logged in as admin.
- At least one active session definition exists.
**Steps:**
1. Navigate to the Admin Dashboard or Sessions view.
2. Click the UI trigger to generate instances (e.g., 30-day sync button).
**Expected:**
- Session instances are generated for the next 30 days based on active definitions.
- No duplicate instances are created for previously generated dates.

## Test: [AT-A5] Sync rosters (next 30 days)
**Role:** admin
**Preconditions:**
- Logged in as admin.
- Session instances exist for the next 30 days.
- Recurring enrollments are configured.
**Steps:**
1. Navigate to the Admin Dashboard or Rosters view.
2. Click the "Sync Rosters" button.
**Expected:**
- Players are added to instances based on recurring enrollments and recurring changes.
- Manual overrides (e.g., `removedByCoach` flag) are respected and not overwritten.

## Test: [AT-A6] View attendance grid and filter by sport
**Role:** admin
**Preconditions:**
- Logged in as admin.
- Session instances exist with varying sports (e.g., tennis, fitness) and attendance data.
**Steps:**
1. Navigate to the Admin Attendance view.
2. Select a valid date range.
3. Apply a sport filter (e.g., "tennis").
**Expected:**
- The grid accurately displays attendance records matching only the selected sport and date range.

## Test: [AT-A7] View player attendance statistics
**Role:** admin
**Preconditions:**
- Logged in as admin.
- A player has historical attendance data.
**Steps:**
1. Navigate to the Player Stats view for the target player (`/admin/player/:playerId/stats`).
2. Review the displayed statistics.
**Expected:**
- Attendance rate, late cancel count, and absence count are accurately calculated and displayed.

## Test: [AT-A8] View coach performance overview
**Role:** admin
**Preconditions:**
- Logged in as admin.
- Players have submitted feedback including coach engagement ratings for past sessions.
**Steps:**
1. Navigate to the Coach Overview page (`/admin/coaches`).
**Expected:**
- Coach engagement averages are displayed accurately based on aggregated historical player feedback.

## Test: [AT-A9] Export session data to CSV
**Role:** admin
**Preconditions:**
- Logged in as admin.
- Past sessions with attendance and feedback data exist.
**Steps:**
1. Navigate to the Export page (`/admin/export`).
2. Select a date range and click to export.
**Expected:**
- A CSV file containing accurate session, attendance, and feedback data is downloaded to the local machine.

## Test: [AT-A10] View feedback analytics
**Role:** admin
**Preconditions:**
- Logged in as admin.
- Past sessions contain feedback data from players and coaches.
**Steps:**
1. Navigate to the Feedback Analytics page (`/admin/feedback`).
**Expected:**
- Group effort averages, coach engagement trends, and individual feedback histories are visible.

## Coach Tests (AT-C)

## Test: [AT-C1] Login and land on /sessions
**Role:** coach
**Preconditions:**
- Logged out.
**Steps:**
1. Navigate to the login page (`/`).
2. Authenticate with coach credentials.
**Expected:**
- Authentication succeeds.
- Immediate redirect to `/sessions` (Coach mobile home).

## Test: [AT-C2] Open an upcoming session — Staatus tab
**Role:** coach
**Preconditions:**
- Logged in as coach.
- There is a session scheduled for the future (not started).
**Steps:**
1. Tap the upcoming session card on the `/sessions` page.
**Expected:**
- Routed to `/session/:instanceId`.
- The default active view/tab is "Staatus".

## Test: [AT-C3] Approve an extra session request
**Role:** coach
**Preconditions:**
- Logged in as coach.
- An upcoming session has a pending extra request.
**Steps:**
1. Open the upcoming session.
2. Locate the pending extra request in the Staatus tab.
3. Click "Approve".
**Expected:**
- The request status updates to approved.
- The player is added to the session roster.

## Test: [AT-C4] Add a player manually from Staatus tab
**Role:** coach
**Preconditions:**
- Logged in as coach.
- An upcoming or active session is open on the Staatus tab.
**Steps:**
1. Click the manual add player button.
2. Select a player from the club list and confirm.
**Expected:**
- The player is added to the session roster with source "manual_add".

## Test: [AT-C5] Open active session — Kohalolek tab
**Role:** coach
**Preconditions:**
- Logged in as coach.
- There is a session currently active (start time passed, end time + 1h not passed).
**Steps:**
1. Tap the active session card on the `/sessions` page.
**Expected:**
- Routed to `/session/:instanceId`.
- The default active view/tab is "Kohalolek".

## Test: [AT-C6] Mark attendance with tap cycle
**Role:** coach
**Preconditions:**
- Logged in as coach.
- An active session is open on the Kohalolek tab.
**Steps:**
1. Locate a player on the roster.
2. Tap their attendance status button multiple times.
**Expected:**
- Status cycles predictably through the available options (e.g., Märkimata -> Kohal -> Puudus -> Hilines -> Vabastatud).
- The state saves correctly to the backend after a brief debounce period.

## Test: [AT-C7] Use Mark All Present
**Role:** coach
**Preconditions:**
- Logged in as coach.
- An active session is open on the Kohalolek tab with one or more unmarked players.
**Steps:**
1. Click "Märgi kõik kohal" (Mark All Present).
2. Confirm the action when prompted.
**Expected:**
- All currently unmarked rostered players are updated to "Kohal".

## Test: [AT-C8] Add a walk-in player
**Role:** coach
**Preconditions:**
- Logged in as coach.
- An active session is open on the Kohalolek tab.
**Steps:**
1. Use the "Add Walk-in" or equivalent button.
2. Select a player from the roster list.
**Expected:**
- The player is added to the roster with source "walkIn".
- The player's realStatus is automatically set to "Kohal".

## Test: [AT-C9] Write feedback in Tagasiside tab
**Role:** coach
**Preconditions:**
- Logged in as coach.
- A past session is open (ended within the last 7 days).
**Steps:**
1. Navigate to the "Tagasiside" tab for the session.
2. Submit an effort rating emoji and optional text note for a player.
**Expected:**
- Feedback is successfully saved to the backend.
- Edit controls remain visible since it's within the 7-day window.

## Test: [AT-C10] Send a session message
**Role:** coach
**Preconditions:**
- Logged in as coach.
- A session is open on the Staatus tab.
**Steps:**
1. Locate the messaging input section.
2. Type a message (e.g., "Court changed to #3") and submit.
**Expected:**
- The message posts successfully and appears in the feed.
- Visible to all roles linked to the session.

## Player Tests (AT-P)

## Test: [AT-P1] Login and land on /sessions
**Role:** player
**Preconditions:**
- Logged out.
**Steps:**
1. Navigate to the login page (`/`).
2. Authenticate with player credentials.
**Expected:**
- Authentication succeeds.
- Immediate redirect to `/sessions`.

## Test: [AT-P2] Confirm preStatus (Kinnitan)
**Role:** player
**Preconditions:**
- Logged in as player.
- An upcoming session is available on `/sessions` (scheduled >60 mins from now).
**Steps:**
1. Locate the upcoming session card.
2. Click "Kinnitan".
**Expected:**
- PreStatus updates to "Kinnitatud".
- UI reflects the confirmed state correctly without a full page reload.

## Test: [AT-P3] Cancel preStatus (Ei osale)
**Role:** player
**Preconditions:**
- Logged in as player.
- An upcoming session is available on `/sessions` (scheduled >60 mins from now).
**Steps:**
1. Locate the upcoming session card.
2. Click "Ei osale".
**Expected:**
- PreStatus updates to "Ei osale".
- UI reflects the cancelled state correctly.

## Test: [AT-P4] Request extra session
**Role:** player
**Preconditions:**
- Logged in as player.
- Extra session request functionality is exposed via UI.
**Steps:**
1. Access the extra session request form.
2. Fill out the target timeframe criteria and submit.
**Expected:**
- A request is created in the database with "pending" status.

## Test: [AT-P5] View past session attendance result
**Role:** player
**Preconditions:**
- Logged in as player.
- A past session has an explicitly marked attendance by the coach.
**Steps:**
1. Locate the past session on `/sessions` (typically under a Möödunud block).
**Expected:**
- The realStatus (e.g., "Kohal" or "Puudus") is accurately displayed on the session card.

## Test: [AT-P6] Submit session feedback
**Role:** player
**Preconditions:**
- Logged in as player.
- A past session ended within the last 7 days and was marked "Kohal" or "Hilines" for this player.
**Steps:**
1. Locate the applicable session card.
2. Select an effort rating, a coach engagement rating, and type an optional note.
3. Click Save.
**Expected:**
- Feedback is successfully persisted.
- A confirmation visual is temporarily shown.

## Test: [AT-P7] View session history at /history
**Role:** player
**Preconditions:**
- Logged in as player.
- User has participated in multiple past sessions.
**Steps:**
1. Navigate to the `/history` module.
**Expected:**
- A chronological list of past sessions is displayed.
- Each entry shows attendance details and previously received/submitted feedback.

## Parent Tests (AT-PA)

## Test: [AT-PA1] Login and land on /sessions
**Role:** parent
**Preconditions:**
- Logged out.
**Steps:**
1. Navigate to the login page (`/`).
2. Authenticate with parent credentials.
**Expected:**
- Authentication succeeds.
- Immediate redirect to `/sessions`.

## Test: [AT-PA2] View sessions for all children
**Role:** parent
**Preconditions:**
- Logged in as parent.
- The parent profile is linked to 2 or more active players with schedules.
**Steps:**
1. Navigate to `/sessions`.
2. Verify the "Kõik lapsed" (All Children) filter is active.
**Expected:**
- Session cards for all linked children are displayed interleaving chronologically.

## Test: [AT-PA3] Filter to one child
**Role:** parent
**Preconditions:**
- Logged in as parent.
- Associated with 2 or more active players.
**Steps:**
1. In the child filter pills at the top, click on exactly one child's name.
**Expected:**
- The session list immediately filters down to only show sessions belonging to the chosen child.

## Test: [AT-PA4] Set preStatus for child
**Role:** parent
**Preconditions:**
- Logged in as parent.
- One of the children has an upcoming session (scheduled >60 mins from now).
**Steps:**
1. Locate the child's upcoming session card.
2. Click "Kinnitan" or "Ei osale".
**Expected:**
- The UI and backend immediately register the preStatus choice for that specific child.

## Test: [AT-PA5] View past session attendance result
**Role:** parent
**Preconditions:**
- Logged in as parent.
- A child was marked by the coach in a past session.
**Steps:**
1. Locate the child's past session card.
**Expected:**
- The real attendance status is shown accurately.

## Test: [AT-PA6] View coach feedback after 24h
**Role:** parent
**Preconditions:**
- Logged in as parent.
- A child has a past session that ended >24 hours ago, and the coach has written feedback.
**Steps:**
1. Locate the child's past session card.
**Expected:**
- The coach's effort rating and note are visible to the parent.

## Test: [AT-PA7] Verify coach engagement rating hidden
**Role:** parent
**Preconditions:**
- Logged in as parent.
- A child has a past session where the player submitted their own feedback (including coach engagement).
**Steps:**
1. Locate the child's past session card.
**Expected:**
- The child's own effort rating and the coach's effort rating are visible.
- The player-submitted coach engagement rating is hidden from the parent view.

## Test: [AT-PA8] View child history at /history
**Role:** parent
**Preconditions:**
- Logged in as parent.
- The linked children have participated in past sessions.
**Steps:**
1. Navigate to the `/history` module.
**Expected:**
- Complete session and attendance history for the children is available, grouped or ordered logically.
