# Current Task Directives

**Target Phase:** Phase 10.5 — Session Management & Recovery  
**Active Chunk:** 10.5.2 — One-off Session Creation (Admin)

---

## 1. Objective

Allow admin to create a single standalone session instance
that is not linked to any recurring definition.

---

## 2. Scope

- src/pages/AdminPage.jsx ONLY

---

## 3. Architecture rule (DO NOT VIOLATE)

- Write ONLY to sessionInstances/{instanceId}
- DO NOT create or reference sessionDefinitions
- DO NOT call instanceGenerator.js
- DO NOT touch rosterSync.js
- NO definitionId field in the created object

---

## 4. Implementation

### 4.1 instanceId format

const pushKey = push(ref(database, "sessionInstances")).key
const instanceId = `${date}__${pushKey}`

### 4.2 Fields to write

{
  date,                                    // "YYYY-MM-DD"
  startTime,                               // "HH:mm"
  endTime,                                 // "HH:mm"
  sport,                                   // "tennis" | "fitness"
  capacity: Number(capacity),              // must be number, not string
  assignedCoachIds: { [selectedCoachId]: true },  // object, NOT array
  status: "scheduled",
  createdBy: currentUser.uid,
  createdAt: Date.now()
  // NO definitionId
}

### 4.3 UI

- Add a clearly labeled section in AdminPage:
  "Lisa üksiktreening" (Add one-off session)
- Form fields:
  - date (date input)
  - startTime (time input)
  - endTime (time input)
  - sport (select: tennis / fitness)
  - capacity (number input)
  - assignedCoachIds (select from existing coaches)
- Submit button: "Loo treening"
- On success: clear form, show confirmation

---

## 5. Guardrails

- NO changes to sessionDefinitions
- NO changes to instanceGenerator.js
- NO changes to rosterSync.js
- NO new components — inline in AdminPage.jsx
- ONLY AdminPage.jsx modified
- capacity must be stored as Number(capacity), not a string
- assignedCoachIds must use shape { coachId: true }, not an array

---

## 6. Definition of Done

- Admin can create a one-off session via form
- Instance appears in sessionInstances with correct fields
- No definitionId present on created instance
- Session visible in SessionListPage immediately
- No console errors

---

STOP after completion.
Show exact diff only.