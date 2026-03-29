# Current Task Directives

**Target Phase:** Phase 11 — UI / UX Polish  
**Active Chunk:** 11.8 — Parent View Parity (Lisatreeningud + Fixes)

---

## 1. Objective

Fix parent session view to match player view:
- Fix def guard to allow one-off sessions
- Remove broken inst.isExtraSession logic
- Switch all parent SessionGroup calls to renderItem pattern
- Add proper Lisatreeningud second loop (roster-based, per child, deduplicated)
- Wire myExtraRequest, onCancelExtraRequest, onRequestExtra to SessionCardParent

---

## 2. Scope

- src/pages/SessionListPage.jsx ONLY
- SessionCardParent signature (add missing props)
- Parent view section (loops + rendering)

---

## 3. Changes

### 3.1 SessionCardParent — add missing props to signature

Current:
  function SessionCardParent({ ..., isExtraSession = false })

Replace with:
  function SessionCardParent({ ..., isExtraSession = false, myExtraRequest = null, onCancelExtraRequest, onRequestExtra })

### 3.2 Fix def guard in parent main loop

Find in parent main loop:
  if (!def) return

Replace with:
  if (!def && inst.definitionId) return

### 3.3 Remove broken isExtraSession logic

Remove these lines from parent main loop entirely:
  if (inst.isExtraSession) {
      extraSessions.push(sessionObj)
      return
  }

### 3.4 Switch parent main loop to data-only sessionObj

Change sessionObj construction to:
  const sessionObj = { instId, inst, def, sessionStartMs, playerId, childName }

Remove renderCard from sessionObj entirely.

### 3.5 Switch all parent SessionGroup calls to renderItem

For each of: activeSessions, todaySessions, upcomingSessions, pastSessions
Replace:
  <SessionGroup title="..." sessions={...} defaultOpen={...} />

With:
  <SessionGroup
      title="..."
      sessions={...}
      defaultOpen={...}
      renderItem={s => (
          <SessionCardParent
              key={`${s.instId}_${s.playerId}`}
              instId={s.instId} inst={s.inst} def={s.def}
              attendance={attendance} rosters={rosters} players={players}
              sessionMessages={sessionMessages}
              sessionFeedback={feedbackData}
              childName={s.childName} playerId={s.playerId}
              nowMs={nowMs} onPreStatus={handleParentPreStatus}
              isExtraSession={false}
          />
      )}
  />

### 3.6 Add extra sessions second loop

After the main loop, add:

  const seenExtra = new Set()

  Object.entries(instances).forEach(([instId, inst]) => {
      const def = definitions[inst.definitionId] || null
      if (!def && inst.definitionId) return
      if (inst.status === "cancelled") return

      filteredPlayerIds.forEach(playerId => {
          const currentRoster = rosters[instId] || {}
          const isOnRoster = currentRoster[playerId] &&
              currentRoster[playerId].removedByCoach !== true
          if (isOnRoster) return

          try {
              const { startMs: sessionStartMs } = getSessionBounds(inst, def)
              if (sessionStartMs <= nowMs + 60 * 60 * 1000) return

              const key = `${instId}__${playerId}`
              if (seenExtra.has(key)) return
              seenExtra.add(key)

              const childName = childOptions.find(c => c.id === playerId)?.name || ""
              extraSessions.push({ instId, inst, def, sessionStartMs, playerId, childName })
          } catch (e) { return }
      })
  })

  extraSessions.sort(compareSessionItems)

### 3.7 Render Lisatreeningud section

Add after Möödunud SessionGroup in parent render:

  <SessionGroup
      title="Lisatreeningud"
      sessions={extraSessions}
      defaultOpen={true}
      renderItem={s => (
          <SessionCardParent
              key={`${s.instId}_${s.playerId}`}
              instId={s.instId} inst={s.inst} def={s.def}
              attendance={attendance} rosters={rosters} players={players}
              sessionMessages={sessionMessages}
              sessionFeedback={feedbackData}
              childName={s.childName} playerId={s.playerId}
              nowMs={nowMs} onPreStatus={handleParentPreStatus}
              isExtraSession={true}
              myExtraRequest={extraRequests[s.instId]?.[s.playerId] || null}
              onCancelExtraRequest={() => handleCancelExtraRequest(s.instId, s.playerId)}
              onRequestExtra={() => navigate(`/sessions/${s.instId}`)}
          />
      )}
  />

---

## 4. Guardrails

- Do NOT touch player view
- Do NOT touch coach/admin view
- Do NOT touch handleCancelExtraRequest
- Do NOT touch any other file
- Extra sessions must NOT appear in normal session groups
- Deduplication key = instId__playerId

---

## 5. Definition of Done

- Parent sees rostered sessions in normal groups (Aktiivne/Täna/Tulevased/Möödunud)
- Parent sees non-rostered available sessions in Lisatreeningud only
- No one-off sessions skipped due to missing def
- No renderCard used in parent view
- No duplicate cards for multi-child families
- No console errors

---

STOP after completion.
Show exact diff only.