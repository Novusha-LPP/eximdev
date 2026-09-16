**Attendance Regularization (Correction Request) API**

This document describes the attendance regularization (correction request) endpoints implemented in the attendance router.

Routes (in `attendanceRoutes.mjs`):

- `GET /regularizations` — `attendanceAuthBridge`, `attendanceCtrl.getRegularizations`
- `POST /regularization` — `attendanceAuthBridge`, `attendanceCtrl.requestRegularization`
- `POST /regularization/cancel/:id` — `attendanceAuthBridge`, `attendanceCtrl.cancelRegularization`

Purpose

- Allow employees to request corrections (regularizations) for attendance records, list their requests, and cancel a pending request.

Authentication & Authorization

- All endpoints require authentication via `attendanceAuthBridge` (follows app standard auth, e.g., JWT/httpOnly cookie).
- Additional role checks are performed inside controllers where applicable (approvals handled elsewhere).

1) GET /regularizations

- Description: Return a list of regularization requests for the authenticated user (or for the scope the auth bridge provides).
- Query params (recommended):
  - `status` (optional) — filter by `pending|approved|rejected|cancelled`
  - `from` / `to` (optional) — ISO dates for range
  - `page` / `limit` (optional) — pagination
- Success (200):
  ```json
  {
    "items": [
      {
        "id":"string",
        "employeeId":"string",
        "date":"2026-05-10",
        "type":"IN|OUT|FULL_DAY",
        "requestedBy":"user_123",
        "reason":"string",
        "status":"pending",
        "createdAt":"ISO",
        "attachments":[{"name":"file.pdf","url":"/uploads/..."}]
      }
    ],
    "meta": {"page":1,"limit":20,"total":42}
  }
  ```

2) POST /regularization

- Description: Create a new regularization (correction) request for an attendance record.
- Request body (JSON):

  - `employeeId` (string, optional) — server may derive from auth; include when admin requests on behalf.
  - `date` (string, required) — ISO date of the attendance to correct.
  - `type` (string, required) — e.g., `IN`, `OUT`, `FULL_DAY`, `MISSED_PUNCH` (align with app enums).
  - `requestedBy` (string, optional) — user id (server can override from auth).
  - `originalTime` (string, optional) — old time value (if applicable).
  - `requestedTime` (string, optional) — new time value (if applicable).
  - `reason` (string, required) — brief justification.
  - `attachments` (array, optional) — `{name, url, mimeType}` (upload first, pass URLs).
- Validation / error codes:

  - `400` — missing/invalid fields (return field-level messages).
  - `401` — unauthenticated.
  - `403` — user not allowed to create request for this `employeeId`.
  - `409` — duplicate active request for same date/type (optional behavior).
  - `500` — server error.
- Success (201 Created):

  ```json
  {
    "id":"string",
    "employeeId":"string",
    "date":"2026-05-10",
    "type":"IN",
    "requestedBy":"user_123",
    "reason":"Forgot to punch in",
    "status":"pending",
    "createdAt":"ISO",
    "attachments":[...]
  }
  ```

Server-side behavior:

- Persist a `Regularization`/`CorrectionRequest` record with `status: pending` and audit fields.
- Validate that `date` is in a valid payroll window (or allow but flag for review).
- Notify workflow owners (HOD/admin) via in-app notification/email.
- Optionally block duplicate pending requests for same `employeeId`+`date`+`type`.

3) POST /regularization/cancel/:id

- Description: Cancel an existing pending regularization request.
- Params: `id` — regularization request id to cancel.
- Validation / error codes:
  - `400` — invalid id or request not cancellable (e.g., already approved/rejected).
  - `401` — unauthenticated.
  - `403` — user not allowed to cancel (must be requester or admin depending on rules).
  - `404` — request not found.
  - `500` — server error.
- Success (200):
  ```json
  { "id":"string","status":"cancelled","updatedAt":"ISO" }
  ```

Database / model notes

- Suggested fields for a `regularizations` collection:
  - `_id`, `employeeId`, `requestedBy`, `date`, `type`, `originalTime`, `requestedTime`, `reason`, `attachments`, `status` (`pending|approved|rejected|cancelled`), `createdAt`, `updatedAt`, `audit` (who changed status).

Controller mapping (already in code):

- `attendanceCtrl.getRegularizations` — list endpoint
- `attendanceCtrl.requestRegularization` — create endpoint
- `attendanceCtrl.cancelRegularization` — cancel endpoint

Frontend/UX notes

- Provide a small form with: date picker, type select, optional time fields, reason textarea, file uploads.
- After successful POST, show toast and navigate to request detail or list.
- On cancel, confirm with user; optimistic UI may hide cancelled item after success.

Testing checklist

- Unit tests for controller validations (missing fields, invalid dates).
- Integration tests for full flow: create → listed in GET → cancel → status updated.
- Auth tests: ensure unauthenticated requests return `401` and unauthorized return `403`.

Example curl

```
curl -X POST "https://<host>/api/attendance/regularization" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "date":"2026-05-10",
    "type":"IN",
    "requestedTime":"09:10",
    "reason":"Missed punch due to network",
    "attachments":[{"name":"screenshot.png","url":"/uploads/abcd.png"}]
  }'
```

Notes & Next steps

- Ensure `attendanceCtrl.requestRegularization` validates input and sets `requestedBy` from auth context.
- Decide duplicate-request policy (return `409` vs allow multiples).
- If attachments are accepted as URLs, provide a helper endpoint or uploader for the frontend.

Document created to mirror the routes in `server/routes/attendance/attendanceRoutes.mjs`.
