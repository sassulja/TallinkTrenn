# Current Task Directives

**Target Phase:** Phase 11 — UI / UX Polish  
**Active Chunk:** 11.6 — Toast Notification System (SessionListPage)

---

## 1. Objective

Replace string-based top-level message system with typed messages
and a fixed toast notification. Non-blocking, mobile-friendly.

---

## 2. Scope

- src/pages/SessionListPage.jsx ONLY

---

## 3. Changes

### 3.1 Message state

Replace:
  const [parentMsg, setParentMsg] = useState("")

With:
  const [parentMsg, setParentMsg] = useState(null)

### 3.2 Auto-dismiss useEffect (REQUIRED)

Add near other useEffects:
  useEffect(() => {
      if (!parentMsg) return
      const timer = setTimeout(() => setParentMsg(null), 4000)
      return () => clearTimeout(timer)
  }, [parentMsg])

### 3.3 Update ALL setParentMsg calls

Clear calls:
  setParentMsg("") → setParentMsg(null)

Error messages — system failures:
  - `Viga: ${err.message}`
  → setParentMsg({ text: `Viga: ${err.message}`, type: "error" })

Warning messages — user constraints:
  - "Lukustatud — eelstaatust ei saa enam muuta."
  - "Treening on täis. Kinnitamine ei ole võimalik."
  - "Treening on täis. Palun kontrollige oma kinnitust."
  - "Palun vali nii pingutuse kui treeneri hinnang."
  - `Sul on juba ${sportLabel} treening samal ajal: ...`
  → setParentMsg({ text: "...", type: "warning" })

Success messages — confirmed actions:
  - "Eelstaatus salvestatud."
  → setParentMsg({ text: "Eelstaatus salvestatud.", type: "success" })

### 3.4 Remove ALL inline renders

Remove every occurrence of:
  {parentMsg && <p style={{ color: parentMsg.startsWith("Viga") ? ... }}>{parentMsg}</p>}

There are exactly two occurrences — remove both.

### 3.5 Add single toast render

Place once at root of component return, outside all role branches,
just before the final closing tag:

  {parentMsg && (
      <div
          onClick={() => setParentMsg(null)}
          style={{
              position: "fixed",
              bottom: "max(24px, env(safe-area-inset-bottom))",
              left: "50%",
              transform: "translateX(-50%)",
              background:
                  parentMsg.type === "error" ? "#dc2626" :
                  parentMsg.type === "warning" ? "#d97706" :
                  "#16a34a",
              color: "white",
              padding: "10px 20px",
              borderRadius: "8px",
              fontWeight: "bold",
              fontSize: "14px",
              zIndex: 9999,
              maxWidth: "320px",
              textAlign: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              transition: "all 0.2s ease",
              cursor: "pointer"
          }}
      >
          {parentMsg.text}
      </div>
  )}

---

## 4. Guardrails

- NO logic changes
- NO new components
- NO other files touched
- ALL setParentMsg calls must be converted — do not miss any
- Exactly ONE toast render
- Remove ALL inline p-tag renders (there are two)
- Do NOT rename parentMsg
- Do NOT introduce helper functions
- Do NOT refactor render structure
- Do NOT introduce a content variable
- Minimal diff only

---

## 5. Definition of Done

- Toast appears at bottom on any message
- error → red, warning → yellow, success → green
- Auto-dismisses after 4 seconds
- Tap to dismiss
- No inline messages anywhere
- No layout shift
- No console errors

---

STOP after completion.
Show exact diff only.