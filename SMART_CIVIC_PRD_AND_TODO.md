# Smart Civic Reporting System
## Product Requirements Document & Development TODO

> **IDE:** Antigravity Agentic IDE  
> **Stack:** Node.js + Express · Supabase (PostgreSQL) · Next.js 16 · Tailwind v4 · Twilio · Google Maps  
> **Last updated:** March 2025 · Version 1.0

---

## Table of Contents

1. [Current Implementation Audit](#1-current-implementation-audit)
2. [Product Requirements Document (PRD)](#2-product-requirements-document)
3. [Phased TODO List](#3-phased-todo-list)

---

## 1. Current Implementation Audit

### ✅ Already Built

#### Backend (`/backend`)
| File | Status | Notes |
|------|--------|-------|
| `server.js` | ✅ Done | Express + CORS + routes wired correctly |
| `config/supabase.js` | ✅ Done | Supabase client initialized |
| `routes/webhooks.js` | ⚠️ Partial | WhatsApp/SMS text-only, no photo/location/language/state machine |
| `routes/webhooks.js` IVR | ⚠️ Partial | Category selection works, no location step, no citizen lookup confirmation |
| `routes/complaints.js` | ✅ Done | GET list, GET by ID, PATCH status |
| `routes/workers.js` | ✅ Done | GET list, PATCH reassign |
| `routes/analytics.js` | ✅ Done | Summary KPIs + leaderboard |
| `routes/tickets.js` | ✅ Done | Public ticket status lookup |
| `cron/slaChecker.js` | ⚠️ Partial | Escalation works, but ignores working hours; no auto-reassignment |
| `database/schema.sql` | ✅ Done | All 6 tables + PostGIS + triggers + RLS + SLA seed data |

#### Frontend (`/frontend`)
| Page | Status | Notes |
|------|--------|-------|
| `/admin` dashboard | ⚠️ Mock | UI built, uses hardcoded mock data — not connected to API |
| `/admin/complaints` | ⚠️ Mock | Table UI built, uses mock data — no API connection |
| `/admin/workers` | ⚠️ Mock | Table UI built, mock data — no CRUD working |
| `/admin/analytics` | ❌ Placeholder | Just an icon — nothing built |
| `/admin/map` | ⚠️ Partial | Google Maps loads, but uses hardcoded mock markers |
| `/admin/leaderboard` | ⚠️ Mock | UI built, uses mock citizens array |
| `/track` | ⚠️ Mock | UI built well, but uses fake API simulation |

### ❌ Not Yet Built
- Conversation state machine (multi-step WhatsApp flow)
- Language selection and multi-language support
- WhatsApp photo upload → Supabase Storage
- GPS location extraction from WhatsApp payload
- Reverse geocoding (GPS → ward name)
- IVR multi-step location selection (zone → ward → village)
- Admin location mapping (offline ward lookup JSON)
- Auto routing engine (category → department → worker)
- Worker dispatch notifications (WhatsApp map link / SMS directions)
- Worker response handler (`1` = accept, `3` = complete)
- Auto voice reminder for unresponsive workers
- Completion photo verification
- Working-hours-aware SLA calculation
- Auto-reassignment on worker non-response
- Badge award automation (`complaint_count` threshold)
- Duplicate complaint detection
- Supervisor auth (login/logout)
- All frontend pages connected to real backend API
- Ticket detail modal with history + actions
- Manual escalation + reassignment controls in dashboard
- Worker add/edit/delete CRUD
- IVR simulation web form
- Worker performance metrics in dashboard

---

## 2. Product Requirements Document

### 2.1 Product Vision

The Smart Civic Reporting System is a multi-channel digital platform enabling citizens to report civic issues — garbage, potholes, drainage, water leaks, streetlights — via WhatsApp, SMS, and IVR (Interactive Voice Response) without installing any app. The system auto-routes complaints to the correct municipal department, assigns field workers, tracks resolution with SLA deadlines, and keeps citizens updated at every stage.

### 2.2 Problem Statement

Citizens currently have no simple, inclusive way to report civic issues. Reports go untracked, departments are unaccountable, and field workers have no structured task system. Basic phone users in rural areas are entirely excluded from digital reporting tools.

### 2.3 Goals

- Enable complaint submission via WhatsApp, SMS, and IVR with zero app installation
- Support both smartphone and basic phone citizens and workers equally
- Auto-route complaints to the correct department and field worker
- Enforce SLA-based resolution tracking with auto-escalation and auto-reassignment
- Provide supervisors a real-time dashboard for oversight, escalation, and analytics
- Reward active citizens with community badges

### 2.4 Users & Roles

| Role | Channel | Key Actions |
|------|---------|------------|
| Citizen (smartphone) | WhatsApp | Submit complaint via photo + GPS, check status |
| Citizen (basic phone) | SMS / IVR | Submit complaint via keypad, get SMS confirmation |
| Field Worker (smartphone) | WhatsApp | Receive task, accept/complete, upload completion photo |
| Field Worker (basic phone) | SMS | Receive SMS task, confirm via keypad |
| Supervisor / Admin | Web Dashboard | Monitor complaints, escalate, reassign, view analytics |

### 2.5 Functional Requirements

#### FR-01: WhatsApp Complaint Submission (Citizen)
- System prompts language selection on first message (1=English, 2=Tamil, 3=Hindi, 4=Telugu)
- Language preference saved to `citizens` table
- Bot sends numbered issue category menu (1=Garbage, 2=Drainage, 3=Pothole, 4=Water Leak, 5=Streetlight)
- System accepts photo attachment; downloads and stores to Supabase Storage
- System accepts live GPS location from WhatsApp share
- System accepts geo-tagged image as location fallback
- Unique ticket ID generated: format `CMP-YYYY-NNNNN`
- Confirmation message sent to citizen with ticket ID + expected resolution time
- `citizens.complaint_count` incremented on each submission
- Badge award check triggered after count increment

#### FR-02: IVR Complaint Submission (Basic Phone)
- Twilio Voice call answers with regional language TTS greeting
- Keypad category selection: 1–5 mapped to issue types
- Second gather step for location: zone → ward selection via keypad
- Ward code mapped to ward name using JSON lookup table
- Ticket created in DB with `location_source = 'admin_mapping'`
- SMS confirmation with ticket ID sent to caller's number

#### FR-03: SMS Complaint Submission (Basic Phone)
- Citizen sends SMS with keyword (category name)
- System registers complaint, replies with ticket ID via SMS
- Location identified by admin code or defaults to phone's registered ward

#### FR-04: Conversation State Machine
- Per-citizen session state stored in Supabase or in-memory map
- States: `NEW → LANG_SELECTED → CATEGORY_SELECTED → PHOTO_RECEIVED → LOCATION_RECEIVED → TICKET_CREATED`
- Each incoming message checked against current state and routed accordingly
- Session resets after ticket creation; citizen can start new complaint or check status

#### FR-05: Data Processing & Normalization
- GPS lat/lng extracted from Twilio WhatsApp location payload
- Google Maps Geocoding API called to convert coords → ward name + locality
- PostGIS `location` field auto-synced via existing DB trigger
- IVR/SMS ward codes normalized to `ward_code` field using JSON lookup
- All complaints, regardless of channel, land in same schema structure

#### FR-06: Routing Engine
- On ticket creation, `category` looked up against `departments` table
- Department matched: Garbage/Drainage → Sanitation, Pothole → Roads & PWD, Water Leak → Water Supply, Streetlight → Electricity
- First available worker in matched department queried from `workers` table
- Complaint assigned: `complaints.worker_id` set, `complaints.department_id` set, `complaints.status` → `'assigned'`
- `workers.is_available` set to `false`

#### FR-07: Worker Dispatch Notification
- Smartphone worker receives WhatsApp message: ticket ID + category + clickable Google Maps link from GPS coords
- Basic phone worker receives SMS: ticket ID + ward name + locality + nearest landmark (from address_ward field)
- If no worker available: status stays `'open'`, supervisor dashboard flagged

#### FR-08: Worker Task Interaction
- Worker replies `1` → status updated to `'in_progress'`, citizen notified via WhatsApp/SMS
- Worker replies `3` → completion verification triggered
- Smartphone worker must send geo-tagged photo → stored in Supabase Storage as `completion_photo_url`
- Basic phone worker sends `3 TICKET_ID` via SMS → treated as completion confirmation
- On completion: status → `'resolved'`, `resolved_at` set, worker `is_available` reset to `true`, citizen notified

#### FR-09: Auto Voice Reminder
- node-cron checks all `'assigned'` complaints every 30 minutes
- If worker has not responded (status still `'assigned'`) past configurable reminder threshold → Twilio voice call triggered to worker
- If still no response past escalation threshold → auto-reassignment attempted

#### FR-10: Auto-Reassignment
- If assigned worker is unresponsive past threshold, system finds next available worker in same department
- Reassignment logged in `status_history` with `changed_by_role = 'system'`
- If no alternative worker available → status → `'escalated'`, supervisor notified

#### FR-11: SLA Tracking (Working Hours Aware)
- SLA deadline calculated at ticket creation: `created_at + sla_config.deadline_hours` of working time
- Working hours: Monday–Saturday, 9:00 AM – 5:00 PM
- SLA timer pauses outside working hours
- Cron job escalates tickets where working-hours-elapsed time exceeds `sla_config.deadline_hours`

#### FR-12: Supervisor Dashboard
- Live complaint table: all tickets with status, category, ward, worker, time elapsed
- Filter tabs: All / Open / Assigned / In Progress / Resolved / Escalated
- Manual escalation button on any ticket
- Manual reassignment: change worker assignment from dashboard
- KPI cards: today's complaints, resolved today, SLA breaches, avg resolution time
- Map view: all open complaints as pins on Google Maps, color-coded by category
- Department analytics: resolution rate and avg time by department
- Worker performance: resolution count, response rate, avg hours per worker
- Charts: category pie, complaints-over-time line, status distribution bar
- Ticket detail modal: full info, photos, status history timeline, action buttons
- Supervisor login via Supabase Auth (email + password)

#### FR-13: Citizen Notifications
- WhatsApp/SMS on ticket registration (ticket ID + category)
- WhatsApp/SMS on ticket assignment to worker
- WhatsApp/SMS on ticket resolution
- WhatsApp/SMS if ticket escalated
- Citizen can reply with ticket ID to check status at any time
- Public web page `/track` connected to real API for status lookup

#### FR-14: Rewards & Badges
- `citizens.complaint_count` auto-incremented on every successful ticket creation
- Threshold: 5 complaints → `community_helper_green` badge awarded
- `citizens.badge` field updated automatically by backend
- Citizen notified via WhatsApp/SMS when badge is awarded
- Leaderboard on supervisor dashboard shows top reporters with badge indicators

#### FR-15: IVR Simulation Form
- Web page mimicking IVR flow for demo without real phone call
- Fields: language select, category select, zone select, ward select, phone number input
- Submit triggers same backend ticket creation as real IVR
- SMS confirmation simulated on screen

### 2.6 Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| API response time | < 500ms for dashboard queries |
| Webhook response | < 2s (Twilio timeout is 5s) |
| Uptime | 99% (Render free tier) |
| Photo storage | Supabase Storage, private bucket, signed URLs |
| Auth | Supabase Auth JWT, supervisors only |
| Security | Twilio webhook signature validation, HTTPS enforced |
| Cost | ₹0 for development and college demo |

### 2.7 Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Backend runtime | Node.js (CommonJS) |
| Backend framework | Express.js v5 |
| Database | Supabase PostgreSQL + PostGIS |
| DB client | @supabase/supabase-js v2 |
| Scheduler | node-cron |
| Messaging | Twilio (WhatsApp + SMS + Voice/TwiML) |
| Geocoding | Google Maps Geocoding API |
| Frontend | Next.js 16 + TypeScript |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Maps (frontend) | @react-google-maps/api |
| Dev tunneling | ngrok |
| Backend hosting | Render (free tier) |
| Frontend hosting | Vercel (free tier) |

### 2.8 Environment Variables

```
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
TWILIO_SMS_NUMBER=

# Google
GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# App config
BADGE_THRESHOLD=5
WORKER_REMINDER_HOURS=4
WORKER_REASSIGN_HOURS=8
WORKING_HOURS_START=9
WORKING_HOURS_END=17
PORT=5000
BACKEND_URL=
```

---

## 3. Phased TODO List

> Tasks are ordered **0 dependency → n dependency** within each phase.  
> Complete tasks in the listed order — each task assumes all above tasks are done.  
> ✅ = Already built | 🔧 = Needs fix/upgrade | ❌ = Not built

---

### Phase 0 — Environment & Project Setup
> No dependencies. Do this before anything else.

- [ ] ❌ Create `.env` file in `/backend` with all required environment variables
- [ ] ❌ Create `.env.local` file in `/frontend` with all required environment variables
- [ ] ❌ Add `.env` and `.env.local` to `.gitignore` in both `backend/` and `frontend/`
- [ ] ❌ Create Twilio account → verify phone number → note Account SID + Auth Token
- [ ] ❌ Enable Twilio WhatsApp sandbox → join sandbox with test phone number
- [ ] ❌ Enable Twilio SMS number from sandbox
- [ ] ❌ Enable Twilio Voice capabilities on account
- [ ] ❌ Create Google Cloud project → enable Geocoding API → enable Maps JavaScript API → generate API key
- [ ] ✅ Confirm Supabase project is created → copy URL + anon key + service key
- [ ] ❌ Install ngrok → run `ngrok http 5000` → note HTTPS forwarding URL
- [ ] ❌ Set Twilio WhatsApp webhook URL → `https://<ngrok-url>/webhook/whatsapp`
- [ ] ❌ Set Twilio SMS webhook URL → `https://<ngrok-url>/webhook/sms`
- [ ] ❌ Set Twilio Voice webhook URL → `https://<ngrok-url>/webhook/ivr`
- [ ] ❌ Add `start` script to `backend/package.json`: `"start": "node server.js"`
- [ ] ❌ Test backend health check: `GET /api/health` returns `{ status: 'ok' }`

---

### Phase 1 — Database Setup & Seed Data
> Depends on: Phase 0 (Supabase project ready)

- [ ] ✅ Run `database/schema.sql` in Supabase SQL editor — creates all 6 tables + triggers
- [ ] ❌ Verify all tables exist in Supabase Table Editor: `departments`, `workers`, `citizens`, `sla_config`, `complaints`, `status_history`
- [ ] ❌ Verify `sla_config` has 5 default rows (garbage=24h, pothole=72h, drainage=48h, water_leak=48h, streetlight=120h)
- [ ] ❌ Insert seed departments into `departments` table:
  - `Sanitation` (categories: garbage, drainage)
  - `Roads & PWD` (categories: pothole)
  - `Water Supply` (categories: water_leak)
  - `Electricity` (categories: streetlight)
- [ ] ❌ Insert 2–3 test workers into `workers` table (one smartphone, one basic phone, assign to departments)
- [ ] ❌ Add `categories` column (TEXT[]) to `departments` table in Supabase if not already present
- [ ] ❌ Add `phone_type` column (TEXT, values: 'smartphone' | 'basic') to `workers` table
- [ ] ❌ Add `preferred_language` column (TEXT) to `citizens` table
- [ ] ❌ Add `channel` column (TEXT) to `complaints` table: 'whatsapp' | 'sms' | 'ivr'
- [ ] ❌ Add `location_source` column (TEXT) to `complaints` table: 'gps' | 'admin_mapping'
- [ ] ❌ Add `completion_photo_url` column (TEXT, nullable) to `complaints` table
- [ ] ❌ Add `badge` column (TEXT, nullable) to `citizens` table
- [ ] ❌ Add `sla_deadline` column (TIMESTAMPTZ, nullable) to `complaints` table
- [ ] ❌ Add `resolved_at` column (TIMESTAMPTZ, nullable) to `complaints` table
- [ ] ❌ Create Supabase Storage bucket named `complaint-photos` → set to private
- [ ] ❌ Create Supabase Storage bucket named `completion-photos` → set to private
- [ ] ❌ Set RLS policies: service role key bypasses all (already true), add anon read policy for `tickets` status endpoint
- [ ] ❌ Test DB connection from backend: `node -e "const s = require('./config/supabase'); s.from('departments').select('*').then(console.log)"`

---

### Phase 2 — Backend: Ward Lookup & Utilities
> Depends on: Phase 1 (DB ready with departments)

- [ ] ❌ Create `/backend/utils/` folder
- [ ] ❌ Create `/backend/utils/wardLookup.js` — JSON map of IVR keypad codes to ward data:
  ```js
  // Structure: { zone_digit: { label, wards: { ward_digit: { ward_code, ward_name, locality } } } }
  ```
  Add at least 3 zones × 3 wards each for demo
- [ ] ❌ Create `/backend/utils/categoryDeptMap.js` — maps complaint category to department name:
  ```js
  module.exports = { garbage: 'Sanitation', drainage: 'Sanitation', pothole: 'Roads & PWD', water_leak: 'Water Supply', streetlight: 'Electricity' }
  ```
- [ ] ❌ Create `/backend/utils/slaHelper.js` — exports `calculateSlaDeadline(category, createdAt)` function
  - Reads `WORKING_HOURS_START`, `WORKING_HOURS_END` from env
  - Adds SLA hours as working-hours-only time to `createdAt`
  - Returns deadline as UTC timestamp
- [ ] ❌ Create `/backend/utils/ticketId.js` — exports `generateTicketId()`:
  ```js
  // Format: CMP-YYYY-NNNNN (random 5-digit suffix, check for uniqueness in DB)
  ```
- [ ] ❌ Create `/backend/utils/geocode.js` — exports `reverseGeocode(lat, lng)`:
  - Calls Google Maps Geocoding API
  - Returns `{ ward_name, locality, formatted_address }`
- [ ] ❌ Create `/backend/utils/twilioNotify.js` — exports:
  - `sendWhatsApp(to, message)` — Twilio WhatsApp message
  - `sendSMS(to, message)` — Twilio SMS message
  - `makeVoiceCall(to, twimlMessage)` — Twilio voice call for reminders
- [ ] ❌ Test `wardLookup.js` manually in node REPL
- [ ] ❌ Test `geocode.js` with a known lat/lng (e.g. 13.0827, 80.2707)
- [ ] ❌ Test `twilioNotify.sendSMS()` to your own phone number

---

### Phase 3 — Backend: Conversation State Machine
> Depends on: Phase 2 (utilities ready)

- [ ] ❌ Create `/backend/utils/sessionStore.js` — in-memory session map per citizen phone:
  ```js
  // Map: { phone: { state, language, category, photoUrl, lat, lng } }
  // States: NEW | LANG_SELECTED | CATEGORY_SELECTED | PHOTO_RECEIVED | LOCATION_RECEIVED
  ```
- [ ] ❌ Create `/backend/handlers/whatsappHandler.js` — exports `handleWhatsApp(req, res)`:
  - Parse `req.body`: extract `From`, `Body`, `MediaUrl0`, `MediaContentType0`, `Latitude`, `Longitude`
  - Look up or create citizen in DB
  - Read current session state from `sessionStore`
  - Route to correct state handler (see below)
- [ ] ❌ Implement state `NEW`:
  - Reply with language selection menu (1=English, 2=Tamil, 3=Hindi, 4=Telugu)
  - Set session state → `LANG_SELECTED`
- [ ] ❌ Implement state `LANG_SELECTED`:
  - Parse digit reply → map to language code
  - Save `preferred_language` to `citizens` table
  - Reply with category menu
  - Set session state → `CATEGORY_SELECTED`
- [ ] ❌ Implement state `CATEGORY_SELECTED`:
  - Parse digit reply → map to category string
  - Save category in session
  - Reply requesting photo
  - Set session state → `PHOTO_RECEIVED` waiting
- [ ] ❌ Implement state `PHOTO_RECEIVED` (waiting for photo):
  - Check if `MediaUrl0` present and content type is image
  - Download photo from Twilio URL using `axios`
  - Upload photo binary to Supabase Storage `complaint-photos` bucket
  - Save public/signed URL in session as `photoUrl`
  - Reply requesting location share
  - Set session state → `LOCATION_RECEIVED` waiting
- [ ] ❌ Implement state `LOCATION_RECEIVED` (waiting for location):
  - Check if `Latitude` and `Longitude` present in request body
  - Call `reverseGeocode(lat, lng)` → get ward_name + locality
  - Call `generateTicketId()` → unique ticket ID
  - Call `calculateSlaDeadline(category, now)` → SLA deadline
  - Insert complaint row into Supabase with all fields
  - Increment `citizens.complaint_count` 
  - Check badge threshold → update `citizens.badge` if earned → send badge notification
  - Clear session state → `NEW`
  - Reply with ticket confirmation message (ticket ID + category + est. resolution)
  - Trigger routing engine (async, don't await in webhook response)
- [ ] ❌ Handle geo-tagged image fallback: if message has `MediaUrl0` but no `Latitude`/`Longitude`, extract EXIF GPS data or prompt user to share live location
- [ ] ❌ Handle status check: if message body contains valid ticket ID pattern `CMP-XXXX-XXXXX`, reply with current status
- [ ] ❌ Update `routes/webhooks.js` → replace `handleIncomingMessage` with `whatsappHandler`
- [ ] ❌ Test full WhatsApp flow end-to-end via Twilio sandbox on real phone

---

### Phase 4 — Backend: IVR Multi-Step Flow Upgrade
> Depends on: Phase 2 (wardLookup + ticketId + twilioNotify ready)

- [ ] ❌ Rewrite `router.post('/ivr')` in `webhooks.js`:
  - Language greeting TTS using regional text
  - Gather digit for language selection
  - Redirect to `/webhook/ivr/language`
- [ ] ❌ Create `router.post('/ivr/language')`:
  - Read `Digits` → map to language
  - Store in Twilio session (use query params or Twilio's `<Gather>` carry-forward)
  - Say category menu in selected language
  - Gather digit → redirect to `/webhook/ivr/category`
- [ ] ❌ Create `router.post('/ivr/category')`:
  - Read `Digits` → map to category
  - Say zone selection menu (from `wardLookup` zone list)
  - Gather digit → redirect to `/webhook/ivr/zone`
- [ ] ❌ Create `router.post('/ivr/zone')`:
  - Read `Digits` → identify zone
  - Say ward menu for that zone
  - Gather digit → redirect to `/webhook/ivr/ward`
- [ ] ❌ Create `router.post('/ivr/ward')`:
  - Read `Digits` → look up ward from `wardLookup`
  - Look up or create citizen by `req.body.From`
  - Generate ticket ID, calculate SLA deadline
  - Insert complaint: `location_source = 'admin_mapping'`, `channel = 'ivr'`, `ward_code`, `ward_name`
  - Increment `citizens.complaint_count`, check badge
  - Send SMS ticket confirmation to caller number via `sendSMS()`
  - Say ticket confirmation via TTS
  - Trigger routing engine (async)
- [ ] ❌ Test IVR flow end-to-end by calling Twilio number (or use Twilio debugger)

---

### Phase 5 — Backend: Routing Engine & Worker Dispatch
> Depends on: Phase 3 and Phase 4 (complaints are being created in DB)

- [ ] ❌ Create `/backend/services/routingEngine.js` — exports `routeComplaint(complaintId)`:
  - Fetch complaint row by ID including `category`
  - Look up department from `categoryDeptMap`
  - Query `departments` table for matching department ID
  - Query `workers` for first available worker in that department (`is_available = true`)
  - If worker found:
    - Update `complaints`: set `worker_id`, `department_id`, `status = 'assigned'`
    - Update `workers`: set `is_available = false`, `current_ticket_id = complaintId`
    - Log to `status_history`: `status = 'assigned'`, `changed_by_role = 'system'`
    - Call `dispatchWorker(complaint, worker)` (see below)
    - Call `notifyCitizen(complaint, 'assigned')` (see below)
  - If no worker found:
    - Update `complaints`: set `department_id`, keep `status = 'open'`
    - Log to `status_history`: note = 'No worker available, queued'
- [ ] ❌ Create `/backend/services/dispatchWorker.js` — exports `dispatchWorker(complaint, worker)`:
  - If `worker.phone_type === 'smartphone'`:
    - Build Google Maps URL: `https://maps.google.com/?q=${complaint.lat},${complaint.lng}`
    - Send WhatsApp message: ticket ID + category + map link + "Reply 1 to accept, 3 when complete"
  - If `worker.phone_type === 'basic'`:
    - Build SMS text: ticket ID + ward name + locality + "SMS 1 to accept, SMS 3 when done"
    - Send SMS via `sendSMS()`
- [ ] ❌ Create `/backend/services/citizenNotify.js` — exports `notifyCitizen(complaint, event)`:
  - Events: `'registered'`, `'assigned'`, `'resolved'`, `'escalated'`, `'badge_awarded'`
  - Fetch citizen phone from `citizens` table
  - Build appropriate message per event
  - Send WhatsApp if `channel = 'whatsapp'`, SMS if `channel = 'sms'` or `'ivr'`
- [ ] ❌ Call `routeComplaint(complaintId)` asynchronously after every successful ticket creation in WhatsApp handler, IVR ward handler, and SMS handler
- [ ] ❌ Test routing: create a ticket via WhatsApp → verify worker receives WhatsApp task notification

---

### Phase 6 — Backend: Worker Response Handler
> Depends on: Phase 5 (worker dispatch working)

- [ ] ❌ Create `/backend/handlers/workerResponseHandler.js` — exports `handleWorkerResponse(req, res)`:
  - Parse `From` and `Body` from incoming WhatsApp/SMS message
  - Look up worker by phone number in `workers` table
  - If `worker.current_ticket_id` is null → reply "No active task assigned"
  - Fetch complaint by `worker.current_ticket_id`
  - If body includes `'1'` and status is `'assigned'`:
    - Update `complaints.status → 'in_progress'`
    - Log to `status_history`
    - Call `notifyCitizen(complaint, 'assigned')` to inform citizen of progress
    - Reply "Task accepted. Reply 3 when complete."
  - If body includes `'3'` and status is `'in_progress'`:
    - If worker is smartphone type and message has `MediaUrl0`:
      - Download and upload photo to Supabase Storage `completion-photos`
      - Set `complaints.completion_photo_url`
    - If worker is basic type:
      - Accept SMS `3 TICKET_ID` as confirmation
    - Update `complaints.status → 'resolved'`, set `resolved_at = now()`
    - Update `workers.is_available = true`, `workers.current_ticket_id = null`
    - Increment `workers.total_resolved`
    - Log to `status_history`
    - Call `notifyCitizen(complaint, 'resolved')`
    - Reply "Task marked complete. Thank you!"
- [ ] ❌ In `routes/webhooks.js`: detect if incoming WhatsApp/SMS sender is a worker (check `workers` table by phone) → route to `workerResponseHandler` instead of `whatsappHandler`
- [ ] ❌ Test worker accept (`1`) and complete (`3`) flow end-to-end

---

### Phase 7 — Backend: SLA, Reminders & Auto-Reassignment Upgrade
> Depends on: Phase 5 (routing engine), Phase 6 (worker response)

- [ ] 🔧 Rewrite `cron/slaChecker.js` — replace current simple escalation with full logic:
- [ ] ❌ Import `calculateSlaDeadline` from `slaHelper.js` (or use stored `sla_deadline` column)
- [ ] ❌ Add working-hours-aware elapsed time calculation to cron check:
  - Do NOT count time outside 9AM–5PM or weekends
  - Compare working-hours elapsed against `sla_config.deadline_hours`
- [ ] ❌ Add reminder logic in cron:
  - If `status = 'assigned'` and `WORKER_REMINDER_HOURS` elapsed since assignment with no update:
    - Make Twilio voice call to worker via `makeVoiceCall()`
    - Log reminder sent in `status_history`
- [ ] ❌ Add auto-reassignment logic in cron:
  - If `status = 'assigned'` and `WORKER_REASSIGN_HOURS` elapsed with no update:
    - Free current worker: `is_available = true`, `current_ticket_id = null`
    - Call `routeComplaint(complaintId)` to try next available worker
    - If no worker → escalate + notify supervisor
- [ ] ❌ Add escalation logic (keep existing but base on working hours):
  - If working-hours elapsed > `sla_config.deadline_hours` → set `status = 'escalated'`
  - Log to `status_history`, notify citizen
- [ ] ❌ Test cron: manually call `checkSLAs()` with a complaint that is past deadline

---

### Phase 8 — Backend: Remaining API Endpoints
> Depends on: Phase 1 (DB schema complete with all new columns)

- [ ] ❌ Add `GET /api/analytics/timeseries` route in `analytics.js`:
  - Query complaints grouped by `DATE(created_at)` for last 30 days
  - Return `[{ date, count }]`
- [ ] ❌ Add `GET /api/analytics/department-performance` route:
  - Return resolution rate + avg resolution hours grouped by department
- [ ] ❌ Add `GET /api/workers/performance` route:
  - Return total_resolved, avg_resolution_hours per worker
- [ ] ❌ Add `POST /api/complaints/:id/escalate` route:
  - Supervisor manually escalates a complaint
  - Update status → `'escalated'`, log to status_history, notify citizen
- [ ] ❌ Add `PATCH /api/complaints/:id/reassign` route:
  - Supervisor manually assigns a different worker
  - Update worker_id, notify new worker via dispatch, log to status_history
- [ ] ❌ Add `GET /api/citizens/leaderboard` route (move from analytics or add alias):
  - Include badge status in response
- [ ] ❌ Add `POST /api/workers` route — create new worker
- [ ] ❌ Add `PUT /api/workers/:id` route — update worker details
- [ ] ❌ Add `DELETE /api/workers/:id` route — remove worker
- [ ] ❌ Add `POST /api/ivr-simulation` route:
  - Accepts `{ phone, language, category, zone_digit, ward_digit }`
  - Creates ticket using same logic as IVR ward handler
  - Returns ticket ID + sends SMS confirmation

---

### Phase 9 — Frontend: Connect Dashboard to Real API
> Depends on: Phase 8 (all backend API endpoints working)

- [ ] ❌ Create `/frontend/src/lib/api.ts` — axios instance with `baseURL = process.env.NEXT_PUBLIC_BACKEND_URL`
- [ ] ❌ Create `/frontend/src/lib/types.ts` — TypeScript interfaces: `Complaint`, `Worker`, `Citizen`, `AnalyticsSummary`, `StatusHistory`
- [ ] 🔧 Update `/admin/page.tsx` (Dashboard):
  - Replace mock `setTimeout` with real `GET /api/analytics/summary` call
  - Replace mock chart data with `complaints_by_category` from API response
  - Add `GET /api/analytics/timeseries` for complaints-over-time line chart
  - Connect system status indicators to real health check endpoint
- [ ] 🔧 Update `/admin/complaints/page.tsx`:
  - Replace mock array with real `GET /api/complaints` call
  - Add status filter tabs that pass `?status=` query param
  - Add search input that filters by `ticket_id` or `address_ward`
  - Make each row clickable → open ticket detail modal
- [ ] ❌ Create `/frontend/src/components/TicketDetailModal.tsx`:
  - Fetch `GET /api/complaints/:id` on open
  - Display all complaint fields, photos (signed URL), status history timeline
  - Escalate button → call `POST /api/complaints/:id/escalate`
  - Reassign dropdown → call `PATCH /api/complaints/:id/reassign`
- [ ] 🔧 Update `/admin/workers/page.tsx`:
  - Replace mock array with real `GET /api/workers` call
  - Add Worker form modal → `POST /api/workers`
  - Edit button → `PUT /api/workers/:id`
  - Delete button → `DELETE /api/workers/:id` (with confirmation)
- [ ] 🔧 Update `/admin/analytics/page.tsx`:
  - Build full analytics page with real data:
    - Pie chart: complaints by category (from `GET /api/analytics/summary`)
    - Line chart: complaints over time (from `GET /api/analytics/timeseries`)
    - Table: department performance (from `GET /api/analytics/department-performance`)
    - Table: worker performance (from `GET /api/workers/performance`)
- [ ] 🔧 Update `/admin/map/page.tsx`:
  - Replace mock markers with real complaint coordinates from `GET /api/complaints?status=open`
  - Color-code markers by category (red=garbage, orange=pothole, blue=drainage, etc.)
  - Clicking a marker shows a popup with ticket ID + status + "View Ticket" button
  - Update center coordinates to Chennai (13.0827, 80.2707)
- [ ] 🔧 Update `/admin/leaderboard/page.tsx`:
  - Replace mock array with real `GET /api/citizens/leaderboard` call
  - Show badge field from API response as green indicator
- [ ] 🔧 Update `/track/page.tsx`:
  - Replace mock `setTimeout` with real `GET /api/tickets/:ticketId/status` call
  - Display real status history from API

---

### Phase 10 — Frontend: Supervisor Auth
> Depends on: Phase 9 (dashboard pages connected to real API)

- [ ] ❌ Install `@supabase/ssr` in frontend: `npm install @supabase/ssr`
- [ ] ❌ Create `/frontend/src/lib/supabase.ts` — browser Supabase client
- [ ] ❌ Create `/frontend/src/app/login/page.tsx`:
  - Email + password form
  - Call `supabase.auth.signInWithPassword()`
  - Redirect to `/admin` on success
- [ ] ❌ Create `/frontend/src/middleware.ts`:
  - Check session cookie on all `/admin/*` routes
  - Redirect to `/login` if no valid session
- [ ] ❌ Add logout button to admin layout (`/admin/layout.tsx`)
  - Call `supabase.auth.signOut()` → redirect to `/login`
- [ ] ❌ Create supervisor user in Supabase Auth dashboard (for testing)
- [ ] ❌ Test: accessing `/admin` without login → redirected to `/login`

---

### Phase 11 — Frontend: IVR Simulation Page
> Depends on: Phase 8 (`POST /api/ivr-simulation` endpoint ready)

- [ ] ❌ Create `/frontend/src/app/simulate-ivr/page.tsx`:
  - Title: "IVR & SMS Simulation (Demo)"
  - Language dropdown (1=English, 2=Tamil, 3=Hindi, 4=Telugu)
  - Category dropdown (Garbage, Drainage, Pothole, Water Leak, Streetlight)
  - Zone dropdown (populated from wardLookup)
  - Ward dropdown (updates based on zone selection)
  - Phone number input field
  - Submit button → `POST /api/ivr-simulation`
  - Success: show ticket ID in a confirmation box
  - Error: show error message
- [ ] ❌ Add link to simulation page from public home page and admin nav

---

### Phase 12 — Final: Testing, Cleanup & Deployment
> Depends on: All phases above complete

- [ ] ❌ Test WhatsApp end-to-end: submit complaint → verify DB record → verify worker notified → reply 1 → reply 3 → verify resolved + citizen notified
- [ ] ❌ Test IVR end-to-end: call number → navigate menus → verify ticket in DB → verify SMS confirmation received
- [ ] ❌ Test SMS end-to-end: send SMS → verify ticket created → verify confirmation SMS received
- [ ] ❌ Test SLA: manually set a complaint's `sla_deadline` to past time → run `checkSLAs()` → verify escalation
- [ ] ❌ Test auto-reassignment: create ticket → assign worker → wait past reassign threshold → verify reassignment
- [ ] ❌ Test badge: submit 5 complaints from same phone → verify `citizens.badge` updated → verify WhatsApp notification received
- [ ] ❌ Test supervisor auth: verify `/admin` blocks unauthenticated access
- [ ] ❌ Test all dashboard pages with real data (no more mock data anywhere)
- [ ] ❌ Add `start` script to backend: `"start": "node server.js"`
- [ ] ❌ Deploy backend to Render:
  - Connect GitHub repo → select `backend/` as root directory
  - Add all env vars in Render dashboard
  - Note the production HTTPS URL
- [ ] ❌ Update Twilio webhooks to use Render production URL (replace ngrok)
- [ ] ❌ Deploy frontend to Vercel:
  - Connect GitHub repo → select `frontend/` as root directory
  - Add all `NEXT_PUBLIC_*` env vars in Vercel dashboard
  - Set `NEXT_PUBLIC_BACKEND_URL` to Render backend URL
- [ ] ❌ Test all flows on production deployment
- [ ] ❌ Remove all remaining mock data, `console.log` debug statements, hardcoded values
- [ ] ❌ Add error boundaries to frontend pages
- [ ] ❌ Verify HTTPS is working on both Render and Vercel deployments

---

## Appendix: Feature → Phase Mapping

| Feature (from spec) | Phase |
|---------------------|-------|
| Language selection in WhatsApp | Phase 3 |
| Issue category menu | Phase 3 |
| Photo upload to Supabase Storage | Phase 3 |
| GPS location extraction | Phase 3 |
| Geo-tagged image fallback | Phase 3 |
| Ticket ID generation + confirmation | Phase 3 |
| IVR regional language voice flow | Phase 4 |
| IVR admin location mapping | Phase 4 |
| SMS ticket confirmation | Phase 4–5 |
| GPS reverse geocoding | Phase 2 |
| Ward normalization utility | Phase 2 |
| Duplicate complaint detection | Phase 3 (add check before insert) |
| Category → department auto-routing | Phase 5 |
| Auto worker assignment | Phase 5 |
| WhatsApp map link to worker | Phase 5 |
| SMS directions to basic phone worker | Phase 5 |
| Reply 1 to accept, 3 to complete | Phase 6 |
| Auto voice reminder | Phase 7 |
| Completion photo upload | Phase 6 |
| SMS keypad completion confirmation | Phase 6 |
| SLA working-hours tracking | Phase 7 |
| Auto-reassignment | Phase 7 |
| Escalation on SLA breach | Phase 7 |
| Live complaint table with filters | Phase 9 |
| Escalation controls in dashboard | Phase 9 |
| Worker performance monitoring | Phase 9 |
| Department analytics charts | Phase 9 |
| Map view with real pins | Phase 9 |
| Citizen status notifications | Phase 5 |
| Public ticket status page (real API) | Phase 9 |
| complaint_count tracking | Phase 3 |
| Green badge auto-award | Phase 3 |
| Leaderboard (real data) | Phase 9 |
| Supervisor auth | Phase 10 |
| IVR simulation form | Phase 11 |

---

*End of Document*
