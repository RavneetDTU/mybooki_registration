# Mybooki — Restaurant Registration Backend

A production-ready Node.js backend that handles **restaurant onboarding and registration** for the Mybooki platform. It accepts multi-part registration forms (including verification documents), uploads files to Cloudinary, persists all data to Firebase Firestore, and proxies authentication and calendar requests to the core Mybooki auth service.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Code Reference](#code-reference)
- [Firestore Collections](#firestore-collections)

---

## Architecture Overview

```
Registration Form (Frontend)
         │
         ▼
POST /api/register           ← Multipart form with optional verification doc
         │
   Multer (memory)           ← Validates file type (JPG/PDF) and size (≤ 10 MB)
         │
   Cloudinary Upload         ← Streams document buffer to Cloudinary; returns secure URL
         │
   Firestore Write           ← Persists full registration record with status: pending_approval
         │
         ▼
GET /api/registrations       ← Admin panel fetches all registrations, newest first

Auth / Calendar Proxy
         │
POST /api/auth/google        ← Proxies Google OAuth token exchange → Auth Service (port 5016)
POST /api/auth/refresh       ← Proxies token refresh → Auth Service
GET  /api/auth/calendars/:userId   ← Proxies calendar list fetch
GET  /api/auth/events/:calendarId  ← Proxies calendar event fetch
PATCH /api/auth/calendars/:calendarId/settings  ← Proxies settings update
DELETE /api/auth/calendars/:calendarId           ← Proxies calendar disconnect
POST /api/auth/calendar/book-event               ← Proxies event booking
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js (CommonJS) |
| Framework | Express 5 |
| File Handling | Multer (memory storage) |
| File Storage | Cloudinary (`cloudinary` v2) |
| Database | Firebase Firestore (`firebase-admin`) |
| HTTP Client | Axios (proxy requests) |
| Environment | dotenv |
| Process Manager | Nodemon (dev) |

---

## Project Structure

```
.
├── server.js                   # Main entry point — Express bootstrap + route registration
├── .env                        # Local environment variables (not committed)
├── .env.example                # Environment variable template
├── restro-registrations-firebase-adminsdk-fbsvc-*.json  # Firebase service account key
├── config/
│   ├── db.js                   # Firebase Admin SDK init; exports Firestore `db` instance
│   └── cloudinary.js           # Cloudinary SDK config; exports `cloudinary` instance
└── routes/
    ├── register.js             # POST /api/register — multipart form handler
    ├── registrations.js        # GET /api/registrations — list all registrations
    └── auth-proxy.js           # /api/auth/* — transparent proxy to Auth Service (port 5016)
```

---

## Environment Variables

Create a `.env` file in the project root (see `.env.example` for a template):

```env
# ── Firebase ──
# Full service account JSON as a single-line string
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}

# ── Cloudinary ──
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ── Server ──
PORT=5000
```

> **Firebase** — the service account JSON is loaded directly from the `FIREBASE_SERVICE_ACCOUNT` environment variable. Keep the entire JSON on one line with escaped newlines inside the private key (`\\n`).

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development server (nodemon — auto-restarts on file changes)
npm start

# Start production server (plain node)
npm run run
```

The server starts on the port defined in `PORT` (default: `5000`).

**Health check** — confirm the server is up:

```
GET http://localhost:5000/
→ { "status": "Registration backend is running" }
```

---

## API Reference

### Registration

| Method | Path | Content-Type | Description |
|---|---|---|---|
| `POST` | `/api/register` | `multipart/form-data` | Submit a new restaurant registration |
| `GET` | `/api/registrations` | — | Fetch all registrations, newest first |

#### `POST /api/register`

Accepts a `multipart/form-data` body with the following fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | ✅ | Account holder's full name |
| `email` | `string` | ✅ | Account holder's email |
| `password` | `string` | ✅ | Account holder's password |
| `restaurantName` | `string` | ✅ | Name of the restaurant |
| `restaurantEmail` | `string` | ✅ | Restaurant's contact email |
| `restaurantPhone` | `string` | ✅ | Restaurant's contact phone |
| `restaurantAddress` | `string` | ✅ | Restaurant's physical address |
| `contactName` | `string` | ✅ | Primary contact person's name |
| `contactPhone` | `string` | ✅ | Primary contact person's phone |
| `contactEmail` | `string` | ✅ | Primary contact person's email |
| `verificationDoc` | `file` | ❌ | JPG or PDF only, max 10 MB |

**Success response `201`:**
```json
{
  "message": "Registration submitted successfully. We will review and approve within 24 working hours.",
  "registrationId": "<firestore-document-id>"
}
```

**Error responses:**

| Status | Cause |
|---|---|
| `400` | Missing required fields or unsupported file type |
| `500` | Cloudinary upload failure or Firestore write failure |

---

#### `GET /api/registrations`

Returns all registration documents from Firestore ordered by `createdAt` descending.

**Success response `200`:**
```json
{
  "count": 12,
  "registrations": [
    {
      "id": "<firestore-document-id>",
      "name": "...",
      "restaurantName": "...",
      "status": "pending_approval",
      "verificationDocUrl": "https://res.cloudinary.com/...",
      ...
    }
  ]
}
```

---

### Auth Proxy (`/api/auth/*`)

All routes transparently forward requests to the Mybooki Auth Service at `http://103.55.104.142:5016`. Errors from the upstream service are passed through with their original status codes.

| Method | Path | Proxied To | Description |
|---|---|---|---|
| `POST` | `/api/auth/google` | `POST /api/auth/google` | Initial Google OAuth token exchange |
| `POST` | `/api/auth/refresh` | `POST /api/auth/refresh` | Refresh an expired access token |
| `GET` | `/api/auth/calendars/:userId` | `GET /api/auth/calendars/:userId` | Fetch all calendars for a user |
| `GET` | `/api/auth/events/:calendarId` | `GET /api/auth/events/:calendarId` | Fetch events for a calendar; supports `?date=YYYY-MM-DD` |
| `PATCH` | `/api/auth/calendars/:calendarId/settings` | `PATCH /api/auth/calendars/:calendarId/settings` | Update calendar open/close times |
| `DELETE` | `/api/auth/calendars/:calendarId` | `DELETE /api/auth/calendars/:calendarId` | Disconnect / delete a calendar |
| `POST` | `/api/auth/calendar/book-event` | `POST /api/auth/calendar/book-event` | Book a calendar event for a lead |

#### `POST /api/auth/calendar/book-event` — Body

```json
{
  "calendarId": "primary",
  "eventType": "consultation",
  "eventDate": "2026-05-15",
  "startTime": "10:00",
  "leadName": "John Doe",
  "leadEmail": "john@example.com",
  "leadPhone": "+27 81 234 5678"
}
```

---

## Code Reference

### `server.js`

Entry point. Bootstraps Express, registers middleware, mounts route groups, and starts the HTTP server.

| Middleware / Route | Path | Purpose |
|---|---|---|
| `cors()` | global | Allow cross-origin requests from frontend |
| `express.json()` | global | Parse JSON request bodies |
| `express.urlencoded()` | global | Parse URL-encoded form bodies |
| `registerRoute` | `/api/register` | Restaurant registration handler |
| `registrationsRoute` | `/api/registrations` | Registration list handler |
| `authProxyRoute` | `/api/auth` | Auth & calendar proxy |
| Health check | `GET /` | Returns server status JSON |

---

### `config/db.js`

Initializes Firebase Admin SDK on import. Parses the `FIREBASE_SERVICE_ACCOUNT` environment variable as JSON, calls `admin.initializeApp()`, and performs a live connectivity check by listing Firestore collections at startup. Calls `process.exit(1)` if initialization fails to prevent a silently broken server.

| Export | Purpose |
|---|---|
| `db` | Active Firestore instance used by `register.js` and `registrations.js` |

---

### `config/cloudinary.js`

Configures the Cloudinary v2 SDK from environment variables. Exports the configured instance for use in the upload stream inside `register.js`.

| Export | Purpose |
|---|---|
| `cloudinary` | Configured Cloudinary v2 instance |

---

### `routes/register.js`

Handles `POST /api/register`. Uses Multer with in-memory storage to parse the incoming multipart form.

| Step | Detail |
|---|---|
| **Multer config** | Memory storage; accepts only `image/jpeg` and `application/pdf`; max 10 MB |
| **Validation** | Checks all required text fields; returns `400` with a descriptive error if any are missing |
| **Cloudinary upload** | If `verificationDoc` is present, streams the file buffer to the `mybooki-registrations` Cloudinary folder via `upload_stream` |
| **Firestore write** | Persists the full registration object with `status: 'pending_approval'` and an ISO timestamp |
| **Response** | Returns `201` with the new Firestore document ID |

> ⚠️ Passwords are currently stored in plaintext. Hash them with `bcrypt` before moving to production.

---

### `routes/registrations.js`

Handles `GET /api/registrations`. Queries the `registrations` Firestore collection ordered by `createdAt` descending and returns the full list with a `count` field.

---

### `routes/auth-proxy.js`

Thin proxy layer built with Axios. Each handler forwards the incoming request (body, params, query) verbatim to the Auth Service at `http://103.55.104.142:5016` and relays the response — including error status codes — back to the caller. No transformation or authentication is applied at this layer.

| Handler | Method + Path | Upstream |
|---|---|---|
| Google OAuth | `POST /google` | `/api/auth/google` |
| Token Refresh | `POST /refresh` | `/api/auth/refresh` |
| List Calendars | `GET /calendars/:userId` | `/api/auth/calendars/:userId` |
| List Events | `GET /events/:calendarId` | `/api/auth/events/:calendarId` |
| Update Settings | `PATCH /calendars/:calendarId/settings` | `/api/auth/calendars/:calendarId/settings` |
| Delete Calendar | `DELETE /calendars/:calendarId` | `/api/auth/calendars/:calendarId` |
| Book Event | `POST /calendar/book-event` | `/api/auth/calendar/book-event` |

---

## Firestore Collections

| Collection | Key | Description |
|---|---|---|
| `registrations` | Auto-generated Firestore ID | One document per restaurant registration; includes all form fields, `verificationDocUrl`, `status`, and `createdAt` |

### Registration Document Shape

```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "<plaintext — hash before production>",
  "restaurantName": "The Golden Fork",
  "restaurantEmail": "info@goldenfork.com",
  "restaurantPhone": "+27 21 555 0100",
  "restaurantAddress": "12 Main Rd, Cape Town",
  "contactName": "Jane Smith",
  "contactPhone": "+27 82 555 0101",
  "contactEmail": "jane@goldenfork.com",
  "verificationDocUrl": "https://res.cloudinary.com/mybooki/image/upload/...",
  "verificationDocName": "business_license.pdf",
  "status": "pending_approval",
  "createdAt": "2026-04-29T10:30:00.000Z"
}
```

Possible `status` values:

| Value | Meaning |
|---|---|
| `pending_approval` | Submitted; awaiting admin review |
| *(extensible)* | Future: `approved`, `rejected` |
