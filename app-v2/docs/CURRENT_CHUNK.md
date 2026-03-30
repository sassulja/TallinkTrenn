# Current Task Directives

**Target Phase:** Phase 11 — UI / UX Polish  
**Active Chunk:** 11.7 — Bulk Upload (Players, CSV)

---

## 1. Objective

Add simple CSV bulk upload for players in AdminPage.

---

## 2. Scope

- src/pages/AdminPage.jsx ONLY

---

## 3. Changes

### 3.1 UI

Add above "Create Player" section:

- File input (accept .csv)
- Button: "Upload CSV"
- Message display

Add state:

const [csvFile, setCsvFile] = useState(null)
const [uploadMsg, setUploadMsg] = useState("")

---

### 3.2 CSV Parsing

Import at top:

import Papa from "papaparse"

---

### 3.3 Upload handler

Add function:

const handleCsvUpload = () => {
  if (!csvFile) return

  Papa.parse(csvFile, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      let count = 0
      const now = new Date().toISOString()

      for (const row of results.data) {
        const firstName = row.firstName?.trim()
        const lastName = row.lastName?.trim()

        if (!firstName || !lastName) continue

        await push(ref(database, "players"), {
          firstName,
          lastName,
          birthYear: row.birthYear ? Number(row.birthYear) : null,
          fitnessGroup: row.fitnessGroup || null,
          wtn: row.wtn ? Number(row.wtn) : null,
          createdAt: now
        })

        count++
      }

      setUploadMsg(`${count} players added`)
      setCsvFile(null)
    }
  })
}

---

### 3.4 Wire UI

<input
  type="file"
  accept=".csv"
  onChange={e => setCsvFile(e.target.files[0])}
/>

<button onClick={handleCsvUpload}>
  Upload CSV
</button>

{uploadMsg && <div>{uploadMsg}</div>}

---

## 4. Guardrails

- Do NOT modify existing player creation logic
- Do NOT add duplicate detection
- Do NOT add parent linking
- Do NOT refactor layout

---

## 5. Definition of Done

- CSV file can be uploaded
- Players created in Firebase
- Success message shown

---

STOP after completion.
Show exact diff only.