# AlVision Exim — Agent Guide

> This file is maintained for AI coding agents. It describes the actual structure, conventions, and runtime behavior of this codebase. Do not assume generic React/Node patterns; always verify against the files here.

---

## 1. Project Overview

AlVision Exim is a comprehensive web application that streamlines export-import business processes. It replaces manual Excel-sheet workflows with an online system that supports:

- Automatic data ingestion from email attachments and manual Excel uploads
- Dynamic report generation and real-time operational dashboards
- Import/Export consignment tracking (DSR, DO, Operations, Submission, Documentation)
- Employee lifecycle management (Onboarding, KYC, Exit Feedback, Attendance, Leave)
- Customer KYC with multi-level approval workflows
- Accounts, billing, and ledger management
- CRM, DGFT register, KPI dashboards, MRM, and Open Points tracking
- Document collection and storage via AWS S3
- Tally ERP integration and ICEGate proxy APIs
- Master directory (countries, ports, airlines, shipping lines, CFS, transporters, etc.)

The codebase is a monorepo with a React SPA frontend and an Express.js/MongoDB backend.

---

## 2. Technology Stack

### Frontend (`client/`)
- **Framework**: React 18 (Create React App)
- **Routing**: React Router DOM v6
- **HTTP Client**: Axios (with `withCredentials: true` globally configured)
- **UI Libraries**:
  - MUI (Material-UI) v5 — primary component library
  - MUI X Date Pickers
  - React Bootstrap + Bootstrap 5
  - Ant Design (selective usage)
  - Material React Table
- **Styling**: Sass (`.scss` files), MUI `sx` prop, some inline styles
- **Charts**: ApexCharts, Recharts
- **Maps**: Leaflet + React-Leaflet
- **Forms**: Formik + Yup
- **PDF/Excel**: JSPDF, html2canvas, exceljs, xlsx
- **Animation**: Framer Motion
- **Other**: Moment, date-fns, react-hot-toast, react-toastify

### Backend (`server/`)
- **Runtime**: Node.js (ES Modules — `"type": "module"` in `package.json`)
- **Framework**: Express.js 4
- **Database**: MongoDB via Mongoose 6
- **Authentication**: JWT (signed with `JWT_SECRET`) stored in `httpOnly` cookies
- **Password Hashing**: bcryptjs
- **File Uploads**: Multer
- **Scheduling**: node-cron, node-schedule
- **WebSockets**: `ws` library (for job-overview and analytics real-time updates)
- **Logging**: Winston (file + optional MongoDB transport)
- **Monitoring**: Sentry (error tracking, profiling on Linux)
- **Email**: Nodemailer, AWS SES
- **Cloud Storage**: AWS SDK v2/v3 for S3
- **Scraping**: Playwright (currency rate scraper)
- **Process Management**: PM2 (`ecosystem.config.json` present)

### Infrastructure
- **Frontend Hosting**: AWS S3 static website
- **Backend Port**: `9006`
- **Database**: MongoDB Atlas (production / server env), local MongoDB (development)
- **Reverse Proxy / Tunnel**: Cloudflare Tunnel (`cloudflare/config.yml`) for local dev exposure
- **Containerization**: Dockerfile present (`server/Dockerfile` uses `node:24-alpine`)

---

## 3. Repository Structure

```
.
├── client/                     # React SPA (Create React App)
│   ├── src/
│   │   ├── api/               # API client configs
│   │   ├── assets/            # Static data, images, DSR templates
│   │   ├── components/        # Feature-organized React components
│   │   │   ├── accounts/
│   │   │   ├── admin/
│   │   │   ├── analytics/
│   │   │   ├── attendance/
│   │   │   ├── crm/
│   │   │   ├── customerKyc/
│   │   │   ├── dgft/
│   │   │   ├── document-collection/
│   │   │   ├── documentation/
│   │   │   ├── employeeKyc/
│   │   │   ├── employeeOnboarding/
│   │   │   ├── eSanchit/
│   │   │   ├── exit-interview/
│   │   │   ├── home/
│   │   │   ├── hr/
│   │   │   ├── import-billing/
│   │   │   ├── import-do/
│   │   │   ├── import-dsr/
│   │   │   ├── import-operations/
│   │   │   ├── import-utility-tool/
│   │   │   ├── inward-register/
│   │   │   ├── kpi/
│   │   │   ├── master-directory/
│   │   │   ├── mrm/
│   │   │   ├── open-points/
│   │   │   ├── outward-register/
│   │   │   ├── project-nucleus/
│   │   │   ├── Report/
│   │   │   ├── submission/
│   │   │   ├── teams/
│   │   │   └── userProfile/
│   │   ├── config/            # Directory config
│   │   ├── contexts/          # React Context providers
│   │   ├── customHooks/       # Custom hooks
│   │   ├── forms/             # Reusable form components
│   │   ├── hooks/             # Additional hooks
│   │   ├── pages/             # Top-level pages
│   │   ├── schemas/           # Yup/validation schemas
│   │   ├── services/          # Frontend service helpers
│   │   ├── styles/            # Global and module SCSS
│   │   └── utils/             # Utility functions
│   ├── public/                # CRA public assets
│   ├── build/                 # Production build output (gitignored)
│   ├── package.json           # CRA dependencies & scripts
│   └── .env                   # Frontend env vars
│
├── server/                     # Express API
│   ├── app.mjs                # Application entry point
│   ├── controllers/           # Business logic controllers
│   ├── middleware/            # Express middleware
│   │   ├── authMiddleware.mjs
│   │   ├── authApiKey.mjs
│   │   ├── auditTrail.mjs
│   │   ├── branchMiddleware.mjs
│   │   ├── icdFilter.mjs
│   │   ├── requireAllowedAdmin.mjs
│   │   └── requireRole.mjs
│   ├── model/                 # Mongoose schemas/models
│   │   ├── jobModel.mjs
│   │   ├── userModel.mjs
│   │   ├── attendance/
│   │   ├── crm/
│   │   └── ...
│   ├── routes/                # Express routers (by module)
│   │   ├── accounts/
│   │   ├── admin/
│   │   ├── analytics/
│   │   ├── attendance/
│   │   ├── billing/
│   │   ├── charges/
│   │   ├── ChargesSection/
│   │   ├── crm/
│   │   ├── CustomerKyc/
│   │   ├── dgft/
│   │   ├── documentation/
│   │   ├── document-collection/
│   │   ├── employee-kyc/
│   │   ├── employee-onboarding/
│   │   ├── e-sanchit/
│   │   ├── exit-interview/
│   │   ├── home/
│   │   ├── hr/
│   │   ├── import-billing/
│   │   ├── import-do/
│   │   ├── import-dsr/
│   │   ├── import-operations/
│   │   ├── inward-register/
│   │   ├── master-directory/
│   │   ├── mrm/
│   │   ├── open-points/
│   │   ├── outward-register/
│   │   ├── project-nucleus/
│   │   ├── report/
│   │   ├── scmCube/
│   │   ├── submission/
│   │   ├── tallyapi/
│   │   ├── team/
│   │   ├── upload/
│   │   └── utility/
│   ├── migrations/            # One-off DB migration scripts
│   ├── scripts/               # Admin/utility Node scripts
│   ├── plugins/               # Mongoose plugins
│   │   └── auditPlugin.mjs
│   ├── services/              # Background services
│   │   ├── currencyRateScraper.js
│   │   └── auditTrailService.mjs
│   ├── tallyapi/              # Tally ERP integration
│   ├── setupJobOverviewWebSocket.mjs
│   ├── setupAnalyticsWebSocket.mjs
│   ├── logger.js
│   ├── Dockerfile
│   ├── ecosystem.config.json
│   ├── nodemon.json
│   ├── package.json
│   └── .env
│
├── cloudflare/                # Cloudflare tunnel config
├── tmp/                       # Scratch/debug scripts
├── scratch/                   # More scratch/debug scripts
└── README.md
```

---

## 4. Build & Development Commands

### Frontend
```bash
cd client
npm install
npm start                 # Dev server on 0.0.0.0:3000
npm run dev              # Dev server bound to 0.0.0.0
npm run build            # Production build -> client/build
npm run winBuild         # Windows production build (sourcemaps disabled)
npm run serve            # Serve static build
```

### Backend
```bash
cd server
npm install
npm start                # nodemon (watches routes, model, middleware, services, controllers, tallyapi, scmCube)
npm run start:dev        # NODE_ENV=development nodemon
npm run start:server     # NODE_ENV=server nodemon
npm run start:prod       # NODE_ENV=production nodemon
npm run lint             # eslint .
```

### Docker
```bash
cd server
docker build -t exim-server .
docker run -p 9006:9006 exim-server
```

### PM2
```bash
cd server
pm2 start ecosystem.config.json
```

---

## 5. Environment Configuration

Both `client/.env` and `server/.env` are **gitignored** and must be created manually.

### Frontend (`client/.env`)
Typical variables:
- `REACT_APP_API_STRING` — base URL for backend API (e.g., `http://0.0.0.0:9006`)

### Backend (`server/.env`)
Typical variables:
- `DEV_MONGODB_URI`, `SERVER_MONGODB_URI`, `PROD_MONGODB_URI` — MongoDB connection strings
- `JWT_SECRET` — secret for signing JWTs
- `SENTRY_DSN` — Sentry error tracking DSN
- `PORT` — server port (default `9006`)
- `DISABLE_CLUSTER` — set to `"true"` to run single-process mode
- `DISABLE_SENTRY_PROFILING` — set to `"true"` to disable profiling
- AWS credentials / S3 bucket config
- Nodemailer / SES credentials
- Tally integration credentials

The backend selects the MongoDB URI based on `NODE_ENV`:
- `production` -> `PROD_MONGODB_URI`
- `server` -> `SERVER_MONGODB_URI`
- anything else -> `DEV_MONGODB_URI`

---

## 6. Code Style & Conventions

### File Naming
- **Backend**: Prefer `.mjs` for ES modules. Some legacy `.js` files remain.
- **Frontend**: `.js` for components/logic, `.jsx` for React components (mixed usage), `.scss` for styles.
- Routes: camelCase with module prefix, e.g., `addJobsFromExcel.mjs`, `getImporterJobs.mjs`.
- Models: PascalCase + `Model.mjs`, e.g., `jobModel.mjs`, `userModel.mjs`.

### Module Organization
- Backend routes are grouped by **business module** under `server/routes/<module>/`.
- Frontend components mirror the same module structure under `client/src/components/<module>/`.
- Each major feature has its own folder in both frontend and backend.

### Import Patterns
- Backend uses standard ES module `import/export`.
- Frontend uses standard ES module imports (CRA transpiles them).
- Axios is configured globally in `client/src/index.js` with `axios.defaults.withCredentials = true`.

### Async Handling
- Backend controllers use `async/await` with try/catch blocks.
- Mongoose queries are awaited directly.

### Logging
- Use the Winston `logger` from `server/logger.js` for server-side errors.
- In production, errors go to `logs/prod-error.log`. In dev, errors also go to the console.
- There is also a MongoDB transport that stores errors in a `serverlogs` collection.

### Audit Trail
- The `auditPlugin.mjs` Mongoose plugin automatically logs CREATE/UPDATE/DELETE on models that apply it.
- It relies on an async context system (`utils/context.mjs`) to capture the current user and request.
- Several models apply this plugin; check existing models to see usage.

---

## 7. Architecture Patterns

### Authentication Flow
1. User logs in via `/api/login` -> backend validates credentials with bcryptjs.
2. JWT is signed (10h expiry) and returned in an `httpOnly` cookie named `token`.
3. Subsequent requests send the cookie automatically (Axios `withCredentials: true`).
4. `authMiddleware.mjs` verifies the JWT and attaches `req.user`.
5. For non-Admin users, `authMiddleware` also fetches authorized branch IDs from `UserBranchModel` and attaches them to `req.user.authorizedBranchIds`.
6. Some external routes use API-key auth (`authApiKey.mjs`).

### Multi-Branch / Multi-Org Filtering
- Many models include `branch_id` or `branch_code`.
- `branchMiddleware.mjs` and `icdFilter.mjs` enforce data isolation based on the authenticated user's assignments.
- Admin users bypass branch filtering.

### Route Registration
- All routes are imported and mounted directly in `server/app.mjs` using `app.use(router)`.
- There is **no** centralized prefix router; each route module defines its own path strings.
- When adding a new route, you must both create the router file **and** import + mount it in `app.mjs`.

### WebSockets
- Two WebSocket servers are created in `app.mjs`:
  - `setupJobOverviewWebSocket` — default upgrade path
  - `setupAnalyticsWebSocket` — upgrade path `/analytics`
- The HTTP server handles the `upgrade` event and routes by pathname.

### Cron Jobs
- Initialized only on the first worker when running in cluster mode.
- Scheduled tasks:
  - Currency rate scraper (`scrapeAndSaveCurrencyRates`) — daily at 00:01 IST
  - Stale missed-punch session cleanup — every 15 minutes
  - Reminder system initialization (`initReminderSystem`)

### Clustering
- By default, `app.mjs` forks one worker per CPU core using Node.js `cluster`.
- Set `DISABLE_CLUSTER=true` to run a single process (useful for debugging).
- MongoDB connection pool is tuned (`maxPoolSize: 30`) for clustered mode.

---

## 8. Testing Strategy

### Current State
- **No automated test suites are currently maintained** in the repository.
- `jest`, `supertest`, and `mongodb-memory-server` are listed as `devDependencies` in `server/package.json`, but no `.test.js` / `.spec.js` files exist outside of `node_modules`.
- Manual API testing is done via scratch scripts in `server/`, `tmp/`, and `scratch/` directories (e.g., `test_api.js`, `test_full_flow.js`).

### Manual Testing Conventions
- Developers create ad-hoc `.mjs` or `.js` scripts to test endpoints.
- These scripts often hardcode JWT tokens or perform login + cookie extraction.
- They are **not** part of CI and should not be committed to production branches.

### Adding Tests
If you introduce tests:
- Place them in `server/tests/` or `client/src/__tests__/`.
- Use `jest` + `supertest` for API integration tests.
- Use `mongodb-memory-server` to spin up an in-memory MongoDB instance.
- The `app` instance is exported from `server/app.mjs` for test harnesses.
- In test mode (`NODE_ENV=test`), the backend skips the MongoDB connection and server listen logic.

---

## 9. Security Considerations

- **JWT Secret**: Never use the fallback string. Always set `JWT_SECRET` in `.env`.
- **Cookies**: `httpOnly`, `secure` in production, `sameSite: lax`.
- **CORS**: Explicit allowlist of origins in `app.mjs`. Do not widen `*` in production.
- **Browser Blocking**: In production, direct browser access to `/api/*` routes that accept HTML is blocked (returns 404).
- **Sentry**: DSN and profiling integration are environment-gated.
- **Secrets**: All `.env` files are gitignored. Do not commit credentials.
- **File Uploads**: Multer is used; ensure size limits and file-type validation are enforced on any new upload endpoints.
- **Audit Trail**: Sensitive mutations on key models are automatically logged. Do not bypass Mongoose hooks if audit compliance is required.

---

## 10. Deployment Notes

### Production Build
1. Build the React app: `cd client && npm run build`
2. Deploy `client/build/` to AWS S3 (or serve via CDN).
3. Start the backend with `NODE_ENV=production` using PM2 or Docker.

### Cloudflare Tunnel (Local Dev Exposure)
- Config is in `cloudflare/config.yml`.
- Maps `test-frontend.alvision.in` -> `0.0.0.0:3000`
- Maps `test-backend.alvision.in` -> `0.0.0.0:9006`

### PM2
- `ecosystem.config.json` sets `NODE_ENV: "server"` and watches files.
- Ensure `nodemon.json` and `ecosystem.config.json` are not committed if they contain local secrets.

### Database Migrations
- One-off migration scripts live in `server/migrations/`.
- Run them manually with `node migrations/<script>.mjs`.
- Always back up the database before running migrations.

---

## 11. Common Pitfalls for Agents

- **Missing Route Registration**: Creating a new route file is not enough; you must import and `app.use()` it in `server/app.mjs`.
- **ES Modules vs CommonJS**: The backend is `"type": "module"`. Use `import/export`. If you must use `.js` for a CommonJS file, rename it to `.cjs`.
- **Cluster Mode & Cron Jobs**: Cron initialization is worker-gated (`cluster.worker.id === 1`). If you add new cron jobs, gate them the same way to prevent duplicate execution.
- **Axios Credentials**: The frontend relies on `withCredentials: true`. If a new API client is introduced, preserve this setting or cookies will not be sent.
- **Context-Aware Logging**: The audit plugin requires the async context from `utils/context.mjs`. If you refactor middleware, ensure `context.run({ user, req }, next)` is preserved where needed.
- **Model Size**: `jobModel.mjs` is extremely large. Be cautious when editing it; small schema changes can have wide-reaching effects.
- **Environment Variables**: The backend distinguishes three environments. Test changes in the correct environment.

---

## 12. Useful Scratch / Debug Locations

- `server/scratch/` — temporary debug scripts
- `server/scripts/` — admin/utility scripts
- `tmp/` — root-level scratch files for quick checks
- `scratch/` — more ad-hoc debug scripts

These directories are **not** part of the production runtime; they are safe places for one-off investigations.

---

*Last updated: 2026-05-26*
