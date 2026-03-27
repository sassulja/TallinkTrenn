# Current Task Directives

**Target Phase:** Phase 10.5 — Session Management & Recovery  
**Active Chunk:** 10.5.10 — Extra Requests Consistency & Player UI Finalization

---

## 1. Objective

Finalize extra session request system:

1. Player UI:
   - Show correct request status
   - Allow cancel (optimistic update)
   - Use isLocked as ONLY gate

2. Data consistency:
   - roster = source of truth
   - extraRequests must reflect roster changes

---

## 2. Scope

- src/pages/SessionListPage.jsx
- src/pages/SessionPage.jsx

---

## 3. Player Rules

- isLocked = (sessionStartMs - nowMs) < 60 * 60 * 1000
- isLocked is the ONLY gate for player actions
- Do NOT use sessionStarted for player logic

### Player states:

| Status | UI |
|------|----|
| none / cancelled | Soovin osaleda |
| pending | Taotlus on ootel + Tühista |
| rejected | Taotlus tagasi lükatud |
| approved | not shown (player in roster) |
| isLocked | no actions |

---

## 4. Coach/Admin Rules

- NEVER time-locked
- sessionStarted is informational only
- Coach/admin can:
  - approve anytime
  - add players manually anytime
  - override rejected requests

---

## 5. Data Consistency Rule (CRITICAL)

Roster is the source of truth.

When a player is added to roster:

IF extraRequests/{instanceId}/{playerId} exists →
SET status = "approved"

This must be done in SAME logical action using multi-path update.

Example:

update(ref(database), {
  [`rosters/${instanceId}/${playerId}`]: rosterData,
  [`extraRequests/${instanceId}/${playerId}/status`]: "approved"
})

---

## 6. SessionListPage

### 6.1 extraRequests subscription

- Add global subscription for extraRequests

### 6.2 Cancel handler

- Optimistic update:
  - Save previous status
  - Set status = "cancelled"
  - On error → revert

### 6.3 Props to SessionCardPlayer

- myExtraRequest
- onCancelExtraRequest

---

## 7. SessionCardPlayer

### Props

- myExtraRequest
- onCancelExtraRequest

### UI Logic

Use ONLY isLocked.

if (isLocked) → return null

if (status === "pending") → label + cancel button
if (status === "rejected") → label only
if (status === null || status === "cancelled") → request button

### Buttons

- type="button"
- e.stopPropagation()

---

## 8. SessionPage (Player View)

### Cancel handler

- Same optimistic logic as SessionListPage

### UI Logic

if (isLocked) → return null

if (status === "pending") → label + cancel
if (status === "rejected") → label
if (status === null || status === "cancelled") → request button

### Safety

- Use optional chaining:
  extraRequests?.[myPlayerId]

- Remove unused sessionStarted from player logic

- All buttons:
  - type="button"
  - e.stopPropagation()

---

## 9. Guardrails

- DO NOT touch coach/admin views
- DO NOT modify approval logic structure
- DO NOT introduce new components
- DO NOT re-enable re-request after rejected
- DO NOT use sessionStarted as gate

---

## 10. Definition of Done

- Player sees correct status everywhere
- Cancel works instantly (optimistic)
- No re-request after rejected
- No stale pending requests after roster update
- No console errors
- Data always consistent