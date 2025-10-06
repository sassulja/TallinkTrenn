# Copilot Instructions for TallinkTrenn

## Project Overview
- This is a React app for managing tennis and fitness ("füss") group schedules, attendance, and feedback for a sports school.
- The main logic is in `src/App.js` (and sometimes `src/3_07_App.js` for legacy/variant logic).
- The app supports multiple user roles: admin, coach, parent, and player. UI and data flows change based on role.

## Key Components & Data Flows
- **App.js**: Central entry point, manages routing between views and user roles.
- **FeedbackModal, CoachFeedbackModal, SessionFeedbackModal**: Handle feedback collection from players and coaches after sessions. Feedback is numeric and emoji-based, with custom scales for intensity, support, and clarity.
- **AttendanceToggle**: Used for marking attendance per session.
- **Helpers**: Functions like `generatePastDates`, `getNextFiveWeekdays`, and feedback emoji mappings are defined in the main file.
- **State**: Most state is managed via React hooks at the top level of `App.js`.

## Developer Workflows
- **Start dev server**: `npm start` (runs on http://localhost:3000)
- **Build for production**: `npm run build`
- **Run tests**: `npm test` (uses Create React App defaults)
- **No custom build/test scripts**: All scripts are standard from Create React App.

## Project-Specific Patterns
- **Feedback scales**: Numeric (1-10 or 1-5) with custom emoji/label mappings. See `FEEDBACK_EMOJI_Q2` and `FEEDBACK_EMOJI_Q3` in `App.js`.
- **Attendance and feedback are grouped by session date and group name.**
- **Role-based UI**: Use `step` and `coachMode` state to determine which view to render (admin, coach, parent, player).
- **Legacy/variant logic**: Some features are duplicated in `src/3_07_App.js` for historical reasons. Always check both files if a feature seems missing.

## Integration & External Dependencies
- **No backend**: All data is managed client-side (in-memory or local storage). No API calls or server integration.
- **No custom middleware or Redux**: State is managed with React hooks only.
- **No authentication libraries**: Simple password checks for role access.

## Conventions
- **Component structure**: Most components are defined in the main file, not split into separate files.
- **Inline styles**: Styling is mostly inline, not via CSS modules or styled-components.
- **Estonian language**: Most UI text and variable names are in Estonian.
- **Date handling**: Dates are handled as strings (YYYY-MM-DD), with helpers for formatting.

## Examples
- To add a new feedback question, update the relevant modal component and feedback summary logic in `App.js` (and `3_07_App.js` if needed).
- To change attendance logic, update the attendance-related helpers and UI in the main file.

## Key Files
- `src/App.js` — main app logic, all major components
- `src/3_07_App.js` — legacy/variant logic, sometimes used in parallel
- `src/index.js` — React entry point
- `public/index.html` — HTML template

---

If you are unsure about a pattern or workflow, check both `App.js` and `3_07_App.js` for similar logic. When in doubt, follow the structure and conventions already present in these files.
