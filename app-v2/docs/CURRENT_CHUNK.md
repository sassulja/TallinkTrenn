# Current Task Directives

**Target Phase:** Phase 11 — UI / UX Polish  
**Active Chunk:** 11.10d — TopNav Navigation Restore (All Roles)

---

## 1. Objective

Restore full navigation inside TopNav dropdown after sidebar removal.

---

## 2. Scope

- src/components/ui/TopNav.jsx ONLY

---

## 3. Changes

### 3.1 Navigation dropdown (right side)

Always:
- Treeningud → /sessions

Player / Parent:
- Ajalugu → /history

Admin:
- Divider
- Admin → /admin
- Kohalolek → /admin/attendance
- Treenerid → /admin/coaches
- Tagasiside → /admin/feedback
- Eksport → /admin/export

---

### 3.2 Behavior

- Clicking item:
  - navigates
  - closes dropdown

- Dropdown:
  - simple conditional render
  - no animation
  - no portal

---

### 3.3 Guardrails

- Do NOT use legacy routes:
  - /attendance
  - /roster
  - /prestatus

- Do NOT include:
  - /player/:id/stats

- Do NOT modify:
  - routing
  - other files
  - TopNav structure outside dropdown

---

## 4. Definition of Done

- All roles have correct navigation
- Admin pages reachable again
- No legacy routes used
- Dropdown closes on click
- No layout break
- No console errors

---

STOP after completion.
Show exact diff only.