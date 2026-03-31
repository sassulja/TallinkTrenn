# Current Task Directives

**Target Phase:** Phase 11 — Final Cleanup  
**Active Chunk:** 11.7 — UI Consistency Cleanup

---

## 1. Objective

Finish UI consistency by replacing remaining hardcoded colors
in clearly duplicated or global patterns.

---

## 2. Scope

- src/pages/SessionPage.jsx ONLY

---

## 3. Changes

### 3.1 PRE_STATUS_COLORS → tokens

Replace:

const PRE_STATUS_COLORS = {
  kinnitatud: "#22c55e",
  eiOsale: "#ef4444"
}

With:

const PRE_STATUS_COLORS = {
  kinnitatud: "var(--color-success)",
  eiOsale: "var(--color-danger)"
}

---

### 3.2 TabBar color cleanup

Replace inside TabBar:

#3b82f6 → var(--color-primary)  
#666 → var(--color-text-muted)

---

### 3.3 Normalize search result row styles

Find BOTH:
- roster search result rows
- walk-in search result rows

Ensure BOTH use:

background: "var(--color-background-secondary)"
border: "1px solid var(--color-border)"

Remove any remaining "#f9fafb"

---

### 3.4 Replace remaining #666

Only replace:

color: "#666"
→ color: "var(--color-text-muted)"

Do NOT touch:
- other gray values
- spacing
- layout

---

## 4. Guardrails

- Do NOT refactor components
- Do NOT change structure
- Do NOT modify logic
- Do NOT touch other files

---

## 5. Definition of Done

- No duplicate styling patterns
- No hardcoded primary/success/danger colors
- TabBar matches rest of UI
- Search blocks identical

---

STOP after completion.
Show exact diff only.