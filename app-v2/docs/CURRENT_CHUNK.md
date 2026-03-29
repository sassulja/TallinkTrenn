# Current Task Directives

**Target Phase:** Phase 11 — UI / UX Polish  
**Active Chunk:** 11.9b — Add Player Search (Coach UX)

---

## 1. Objective

Replace the "Lisa nimekirja" dropdown with a fast inline search + add flow:

- Type to filter players
- Show limited results (max 8)
- Exclude already rostered players
- One-tap add
- Clear input after add

No backend or data changes.

---

## 2. Scope

- src/pages/SessionPage.jsx ONLY
- Only the "Lisa nimekirja" block in coach view

---

## 3. Changes

### 3.1 Add local state

Add near other state hooks:

const [playerSearch, setPlayerSearch] = useState("")

---

### 3.2 Build filtered player list

Before render (near existing derived data), add:

const currentRoster = rosters[instanceId] || {}

const availablePlayers = Object.entries(players || {})
  .filter(([pid, p]) => {
    if (!p) return false

    // exclude already on roster
    if (currentRoster[pid] && currentRoster[pid].removedByCoach !== true) return false

    // search filter
    if (!playerSearch.trim()) return false

    const fullName = `${p.firstName || ""} ${p.lastName || ""}`.toLowerCase()
    return fullName.includes(playerSearch.toLowerCase())
  })
  .slice(0, 8)

---

### 3.3 Replace dropdown UI

Find the current block:

<select>...</select>
<button>Lisa nimekirja</button>

Remove it completely.

Replace with:

<div style={{ marginTop: "8px" }}>
  <input
    type="text"
    placeholder="Otsi mängijat..."
    value={playerSearch}
    onChange={e => setPlayerSearch(e.target.value)}
    style={{
      width: "100%",
      padding: "8px",
      borderRadius: "6px",
      border: "1px solid #ccc",
      marginBottom: "6px"
    }}
  />

  {playerSearch && (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      {availablePlayers.length === 0 ? (
        <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
          Mängijat ei leitud
        </div>
      ) : (
        availablePlayers.map(([pid, p]) => {
          const name = `${p.firstName || ""} ${p.lastName || ""}`.trim()
          return (
            <div
              key={pid}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "6px 8px",
                borderRadius: "6px",
                background: "#f9fafb",
                border: "1px solid #eee"
              }}
            >
              <span>{name}</span>
              <button
                onClick={() => {
                  handleAddPlayer(pid)
                  setPlayerSearch("")
                }}
                style={{
                  padding: "4px 8px",
                  fontSize: "12px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  background: "white",
                  cursor: "pointer"
                }}
              >
                Lisa
              </button>
            </div>
          )
        })
      )}
    </div>
  )}
</div>

---

## 4. Guardrails

- Do NOT modify handleAddPlayer logic
- Do NOT change data fetching
- Do NOT introduce new components
- Do NOT affect other tabs (Kohalolek / Tagasiside)
- Must work with existing players structure
- Keep styling simple

---

## 5. Definition of Done

- Typing filters players instantly
- Already rostered players never appear
- Max 8 results shown
- Tap "Lisa" adds player correctly
- Input clears after add
- No console errors

---

STOP after completion.
Show exact diff only.