# Tallink Trenn v2 — Master Implementation Plan

**Schema Version:** Frozen v1.0  
**Last Updated:** 2026-03-30  
**Architecture:** React + Firebase RTDB (Single Role Routing, Deterministic IDs)

## Status Legend
✅ Completed  
🟡 Partially Completed  
⬜ Not Started  
🚨 URGENT  

---

## Phase 1 — Foundation, Security & Sandboxing

- [x] ✅ 1.1 Project Setup & Repo Hygiene  
- [x] ✅ 1.2 Firebase RTDB Init & Environment  
- [x] ✅ 1.3 Security Rules Placeholder  
- [x] ✅ 1.4 Local Emulator Setup  
- [x] ✅ 1.5 Auth + Single Role Routing  

---

## Phase 2 — RTDB Schema Baseline & Permissions

- [x] ✅ 2.1 RTDB JSON Tree Design  
- [x] ✅ 2.2 Users Node  
- [x] ✅ 2.3 Players Node + Parent Links  
- [x] ✅ 2.4 Coach Permissions Node  

---

## Phase 3 — Sessions Engine

- [x] ✅ 3.1 Session Definitions CRUD  
- [x] ✅ 3.2 Recurring Enrollments Manager  
- [x] ✅ 3.3 Recurring Changes Manager  
- [x] ✅ 3.4 Session Instance Generator  
- [x] ✅ 3.5 Roster Sync Engine  
- [x] ✅ 3.6 Admin "Sync Rosters Next 30 Days"  
- [x] ✅ 3.7 Security Rules v2  

---

## Phase 4 — Roster & Attendance Core

- [x] ✅ 4.1 Manual Roster Add/Remove  
- [x] ✅ 4.2 Attendance Schema Implementation  
- [x] ✅ 4.3 Pre-Status UI + Lock Rule  
- [x] ✅ 4.4 Capacity Enforcement  
- [x] ✅ 4.5 Coach/Admin Pre-Status Overrides  
- [x] ✅ 4.6 Real Attendance Marking  
- [x] ✅ 4.7 Walk-ins + Late Cancel Flagging  

---

## Phase 5 — Extra Sessions & Requests

- [x] ✅ 5.0 Invitation System  
- [x] ✅ 5.1 One-off SessionInstance Creation  
- [x] ✅ 5.2 Attendance Metadata  
- [x] ✅ 5.3 Attendance Engine Improvements  

---

## Phase 6 — Coach Mobile UI & Messaging

- [x] ✅ 6.1 SessionListPage  
- [x] ✅ 6.2 SessionPage  
- [x] ✅ 6.3 Mobile UI Optimizations  
- [x] ✅ 6.4 SessionPage Tab Structure  
- [x] ✅ 6.5 Session Messaging  
- [x] ✅ 6.6 Parent Session Cards  
- [x] ✅ 6.7 Player Session Cards  

---

## Phase 7 — Feedback

- [x] ✅ 7.1 Coach Feedback  
- [x] ✅ 7.2 Player Feedback  
- [x] ✅ 7.3 Feedback Visibility + Reminder  
- [x] ✅ 7.4 Parent/Player History  

---

## Phase 8 — Admin Oversight & Analytics

- [x] ✅ 8.1 Attendance Statistics per Player  
- [x] ✅ 8.2 Admin Attendance Viewer  
- [x] ✅ 8.3 Coach Performance Overview  
- [x] ✅ 8.4 Feedback Analytics  
- [x] ✅ 8.5 Session Summary Export  

---

## Phase 9 — UX Hardening & Testing

- [x] ✅ 9.1 Loading / Error / Empty States  
- [x] ✅ 9.2 404 Catch-All Route  
- [x] ✅ 9.3 Acceptance Tests  
- [x] ✅ 9.4 Form Validation  
- [x] ✅ 9.5 Permission Edge Cases  
- [x] ✅ 9.6 State Consistency After Writes  
- [x] ✅ 9.7 Time-Based Transition Verification  
- [x] ✅ 9.8 Cross-Role Consistency  

---

## Phase 10 — Production Readiness & Stability

- [x] ✅ 10.1 Security Rules Audit  
- [x] ✅ 10.2 Production Environment Setup  
- [x] ✅ 10.3.1 List Ordering + Grouping Rules  
- [x] ✅ 10.3.2 Write Collision Handling  
- [x] ✅ 10.3.3 Data Fallback Safety  
- [x] ✅ 10.3.4 Session Generation Edge Cases  
- [x] ✅ 10.4 Deployment  
- [x] ✅ 10.5 Release Checklist  

---

## Phase 10.5 — Session Management & Feature Recovery

- [x] ✅ 10.5.0 Audit Existing Functionality  
- [x] ✅ 10.5.1 Edit Session Instance (Coach/Admin)  
- [x] ✅ 10.5.2 One-off Session Creation  
- [x] ✅ 10.5.3 Extra Session Requests  
- [x] ✅ 10.5.4 Player Session List Split  
- [x] ✅ 10.5.5 Coach Invite Flow  
- [x] ✅ 10.5.6 Global Data Subscriptions  
- [x] ✅ 10.5.7 Overlap Warning + Auto-reject  

- [ ] ⬜ 10.5.9 Overlap check at approval (coach side)  
- [ ] ⬜ 10.5.10 Request conflict auto-reject (capacity)  

---

## Phase 11 — UI / UX Polish & Usability

- [x] ✅ 11.1 Mobile Layout Audit  
- [x] ✅ 11.2 SessionListPage Interaction Fix  
- [x] ✅ 11.3 Layout & Visual Consistency  

- [ ] ⬜ 11.4 Visual Hierarchy & Clarity  
- [ ] ⬜ 11.5 Component Standardization  
- [ ] ⬜ 11.6 UX Improvements  
- [ ] ⬜ 11.7 Final UI Cleanup  

---

## Phase 11 — Coach UX Improvements

- [x] ✅ 11.9a Session Header Compression  
- [x] ✅ 11.9b Add Player Search  
- [x] ✅ 11.9c Status Tab Compression  
- [x] ✅ 11.9d Status Summary Improvement  
- [x] ✅ 11.9e Inline Add Player UI Simplification  
- [x] ✅ 11.9f Sticky Tab Bar  
- [x] ✅ 11.9g Remove Top Navigation Noise  

- [x] ✅ 11.9k Walk-in Search UX  

- [ ] ⬜ 11.9h Action Hierarchy Fix  
- [ ] ⬜ 11.9i Messages Section Compression  
- [ ] ⬜ 11.9j SessionPage Structure Optimization  

---

## Phase 11 — Navigation Refactor

- [x] ✅ 11.10 Remove Sidebar (All Roles)  

- [🟡] 🟡 11.11 Unified Navigation Model  
  - TopNav implemented  
  - Role-based dropdown working  
  - Admin navigation restored  
  - UX still needs refinement  

- [x] ✅ 11.14 Top Navigation System  
  - TopNav replaces sidebar  
  - Name-based dropdown menu  
  - Role-aware navigation  
  - Outside click closes dropdown  
  - Route-aware highlighting  
  - Mobile-first layout  

---

## Phase 11 — Logic Consistency Fixes

- [x] ✅ 11.12 Shared preStatus Validation  
- [x] ✅ 11.13 Parent View Parity  

---

## Current Status

System is:
- ✅ Feature complete  
- ✅ Permission-consistent  
- ✅ Navigation unified  
- 🟡 UX still being refined  

Current focus:
→ Phase 11 polish (clarity, hierarchy, simplification)