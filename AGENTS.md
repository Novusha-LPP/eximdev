# AlVision Exim — Agent Guide

> Fast reference for AI agents. Monorepo export-import management platform.

---

## 1. Stack & Architecture

| Layer | Choice | Details / Key Libraries |
|---|---|---|
| **Frontend** | React 18 (Create React App) | React Router v6, MUI v5, Bootstrap 5, Ant Design, Formik + Yup, Axios (`withCredentials: true`), Leaflet, Recharts, ApexCharts, Sass |
| **Backend** | Node.js ESM (`"type": "module"`) | Express 4, MongoDB (Mongoose 6), JWT in `httpOnly` cookie (`token`), Multer, `ws` (WebSockets), Winston, Sentry |
| **Infra** | AWS S3 + Local/Atlas DB | Backend port `9006`, PM2 (`ecosystem.config.json`), Docker (`server/Dockerfile`), Cloudflare Tunnel |

---

## 2. Common Commands

```bash
# Frontend (client/)
npm start                 # Dev server (localhost:3000)
npm run dev               # Dev server bound to 0.0.0.0 (LAN / Cloudflare tunnel)
npm run build             # Production build -> client/build
npm run winBuild          # Windows production build (sourcemaps disabled)
npm run serve             # Serve static build

# Backend (server/)
npm start                 # Nodemon dev server
npm run start:dev         # NODE_ENV=development nodemon
npm run start:server      # NODE_ENV=server nodemon
npm run start:prod        # NODE_ENV=production nodemon
npm run lint              # ESLint check

# Docker & PM2 (server/)
docker build -t exim-server . && docker run -p 9006:9006 exim-server
pm2 start ecosystem.config.json
```

---

## 3. Structure at a Glance

* **`client/src/`**:
  * `components/<module>/`: Feature-grouped UI (accounts, attendance, crm, customerKyc, dgft, documentation, import-dsr/do/operations, inward/outward, mrm, etc.).
  * `api/`, `contexts/`, `hooks/`, `pages/`, `styles/`, `utils/`.
* **`server/`**:
  * `app.mjs`: Central application entry point, HTTP server, and route registration.
  * `routes/<module>/`: Express routers organized by domain.
  * `model/`: Mongoose models (`jobModel.mjs`, `userModel.mjs`, `attendance/`, `crm/`, etc.).
  * `middleware/`: `authMiddleware.mjs`, `branchMiddleware.mjs`, `icdFilter.mjs`, `auditTrail.mjs`.
  * `services/`: Scrapers (`currencyRateScraper.js`), audit trail (`auditTrailService.mjs`), background sync.
  * `tallyapi/`: Tally ERP integration routes and service.
  * `scripts/` & `migrations/`: Ad-hoc maintenance, DB migrations, and test scripts.
* **Scratch / Debug**: Safe locations for test scripts are `scratch/`, `tmp/`, and `server/scripts/`.

---

## 4. Key Architectural Rules (Critical)

1. **Route Registration in `server/app.mjs`**:
   * There is **no** centralized prefix router. Every router is imported and mounted directly in `server/app.mjs` via `app.use(router)` or `app.use('/api/...', router)`.
   * **Rule**: Whenever you create a new route file, you *must* register it in `server/app.mjs`.

2. **Authentication & Session Flow**:
   * Login via `/api/login` signs a JWT (10h expiry) sent in an `httpOnly` cookie named `token`.
   * Axios is globally configured with `withCredentials: true` (`client/src/index.js`). All frontend API calls must preserve cookie transmission.
   * `authMiddleware.mjs` verifies the JWT and enforces profile completion: non-admin users with `< 70%` profile completion are blocked from write/module access.

3. **Multi-Branch Isolation**:
   * Non-admin users are scoped to their assigned branches via `req.user.authorizedBranchIds` from `UserBranchModel` (enforced by `branchMiddleware.mjs` and `icdFilter.mjs`).
   * Admin users bypass branch filtering (`authorizedBranchIds = null`).

4. **Environment & Database Selection**:
   * `NODE_ENV=production` -> `PROD_MONGODB_URI`
   * `NODE_ENV=server` -> `SERVER_MONGODB_URI`
   * default/development -> `DEV_MONGODB_URI`
   * In production, direct browser GET requests to `/api/*` returning HTML are blocked (404).

5. **WebSockets (`server/app.mjs`)**:
   * HTTP upgrade handles 3 endpoints:
     * `/` (default): `setupJobOverviewWebSocket`
     * `/analytics`: `setupAnalyticsWebSocket`
     * `/dgft-license`: `setupDgftWebSocket`

6. **Cluster Mode & Cron Scheduling**:
   * Clustered with `os.availableParallelism()` workers (`DISABLE_CLUSTER=true` runs single-process).
   * Scheduled cron jobs (currency scraper, attendance repair, missed punch cleanup, monthly CRM deal carry-forward, reminders, invoicing) **must only run on worker 1** (`!cluster.worker || cluster.worker.id === 1`) to prevent duplicate execution.

7. **Audit Trail & Async Context**:
   * `server/plugins/auditPlugin.mjs` auto-logs mutations on key schemas.
   * Relies on `utils/context.mjs`. Keep `context.run({ user, req }, next)` in middleware.

8. **Coding Pitfalls**:
   * Backend uses Node ESM (`"type": "module"`). Use `.mjs` or ES `import/export`.
   * `jobModel.mjs` is large (~41 KB) and widely referenced; make schema edits carefully.
   * No automated CI tests currently exist. Use scratch scripts for verification.
