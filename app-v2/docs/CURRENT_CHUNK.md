# Current Task Directives

**Target Phase:** Phase 9 — UX Hardening
**Active Chunk:** 9.6 — Time-Based Transition Verification

---

## 1. The Objective
Verify all time-based rules switch correctly.
These are the most common source of subtle bugs.
Fix any that are not working correctly.

---

## 2. Time Rules to Verify

### Rule 1 — preStatus lock (sessionStart - 60min)
When: now >= sessionStart - 60 minutes
Effect: player/parent cannot change preStatus
UI: "Lukustatud" badge shown, buttons hidden
Pages: SessionListPage (player card, parent card),
  PreStatusPage

### Rule 2 — Session default tab
(sessionStart - 60min to sessionEnd + 1h)
When: now >= sessionStart AND
  now <= sessionEnd + 1h
Effect: SessionPage defaults to Kohalolek tab
Before: defaults to Staatus tab
After: defaults to Tagasiside tab
Page: SessionPage

### Rule 3 — Coach feedback visibility to player
(sessionEnd + 24h)
When: now >= sessionEnd + 24h
Effect: player/parent can see coach feedback
Before: "Treeneri tagasiside on varsti saadaval"
Pages: SessionListPage (player/parent cards),
  HistoryPage

### Rule 4 — Feedback edit window
(sessionEnd + 7 days)
When: now > sessionEnd + 7 days
Effect: feedback edit controls hidden
Both coach feedback (SessionPage) and
player feedback (SessionListPage, PreStatusPage)
Pages: SessionPage Tagasiside tab,
  SessionListPage player/parent cards,
  HistoryPage

### Rule 5 — Feedback reminder window
When: sessionEnd < now <= sessionEnd + 7 days
AND player has not submitted feedback
AND realStatus === kohal or hilines
Effect: "📝 Anna tagasiside" reminder shown
Pages: SessionListPage player card,
  SessionListPage parent card

---

## 3. Verification Approach

For each rule, verify by:
1. Checking the code logic is correct
2. Manually testing with emulator data
   that has sessions at the right time boundaries

For rules that are hard to test with real time
(e.g. sessionEnd + 24h), use this approach:
- Find a past session in emulator
- Temporarily adjust the threshold in code
  to verify the toggle works
- Then restore correct threshold
- Document result

---

## 4. Known Time Utility

All time computations must use:
- getTallinnNow() for current time
- combineDateAndTime(date, time) for session times

These are already in src/utils/dateUtils.js.
Do not use new Date() directly for session
time comparisons — always use these utils.

---

## 5. Fix Scope

For each failing rule:
- Fix the time comparison logic
- Ensure consistent use of getTallinnNow()
  and combineDateAndTime()
- Do not change the rule thresholds unless
  they are provably wrong

---

## 6. Strict Guardrails
* **Do not change rule thresholds**
* **Always use getTallinnNow() and
  combineDateAndTime() for time comparisons**
* **Fix logic only — no UI redesign**
* **No schema changes**
* **Document any rule that cannot be verified
  due to lack of test data**

---

## 7. Definition of Done (Verification)

**Test A — preStatus lock:**
- Session starting in < 60 minutes
- Log in as player
- Expected: Lukustatud badge, no preStatus buttons
- Log in as parent
- Expected: same behavior on parent card

**Test B — Session default tab:**
- Open a future session (not started)
- Expected: Staatus tab active by default
- Open an active session (started, not ended)
- Expected: Kohalolek tab active by default
- Open a past session (ended > 1h ago)
- Expected: Tagasiside tab active by default

**Test C — Coach feedback visibility:**
- Find past session with coach feedback
- Session ended > 24h ago
- Log in as player
- Expected: coach feedback visible
- Find session ended < 24h ago
- Expected: "Treeneri tagasiside on varsti
  saadaval" shown

**Test D — Feedback edit window:**
- Find session ended > 7 days ago
- Log in as coach
- Expected: feedback shown read-only
- Expected: "Muutmisaeg lõppenud" shown
- Log in as admin
- Expected: edit controls still visible

**Test E — Feedback reminder:**
- Past session within 7 days, realStatus kohal,
  no player feedback submitted
- Log in as player
- Expected: "📝 Anna tagasiside" shown

1. No console errors.
2. Do NOT update docs/ImplementationPlan.md until I
   reply "Verified ✅". Then STOP. Do not proceed to
   any other task. Show exact diffs.