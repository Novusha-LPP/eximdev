/**
 * HRMS Platform Integration Client
 * Uses official HRMS Integration API Key to issue employee session tokens
 * and perform Attendance, Punch, Leave, Corrections, and Approval operations.
 */

import dotenv from 'dotenv';
dotenv.config();

const HRMS_BASE_URL = (process.env.HRMS_BASE_URL || 'http://hrmsapi.alvision.in').replace(/\/$/, '');
const HRMS_API_KEY = process.env.HRMS_API_KEY || 'hrms_test_i50hhHYx_KuXYvGMeJOk76AzvIapcmWKg5wvNIyKxDFaax1fQ';

class HrmsClient {
  constructor() {
    this.baseUrl = HRMS_BASE_URL;
    this.apiKey = HRMS_API_KEY;

    // Session cache: externalId -> { access_token, expiresAt, employment_id, roles }
    this.sessionCache = new Map();

    // Cache of integration employees list
    this.employeesCache = null;
    this.employeesCachedAt = 0;
    this.CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  }

  /**
   * Helper for integration endpoints using X-API-Key header.
   */
  async integrationRequest(path, options = {}) {
    const headers = {
      'Accept': 'application/json',
      'X-API-Key': this.apiKey,
      ...(options.headers || {}),
    };

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const url = `${this.baseUrl}${path}`;
    const timeoutMs = options.timeoutMs || 15000;
    const signal = options.signal || AbortSignal.timeout(timeoutMs);

    let res;
    try {
      res = await fetch(url, { ...options, headers, signal });
    } catch (fetchErr) {
      const err = new Error(fetchErr.name === 'TimeoutError' || fetchErr.name === 'AbortError'
        ? `HRMS request timed out after ${timeoutMs / 1000}s`
        : `HRMS connection failed: ${fetchErr.message}`);
      err.code = fetchErr.code || (fetchErr.name === 'TimeoutError' ? 'ETIMEDOUT' : 'HRMS_NETWORK_ERROR');
      err.status = 503;
      throw err;
    }

    if (!res.ok) {
      const errorJson = await res.json().catch(() => null);
      const detail = errorJson?.detail || errorJson?.error?.message || errorJson?.message || `HRMS integration error ${res.status}`;
      const err = new Error(detail);
      err.status = res.status;
      err.code = errorJson?.code;
      err.details = errorJson?.error?.details || [];
      throw err;
    }

    if (res.status === 204) return null;
    return await res.json();
  }

  /**
   * Helper for standard HRMS endpoints using Bearer token.
   */
  async bearerRequest(path, token, options = {}) {
    const headers = {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {}),
    };

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const url = `${this.baseUrl}${path}`;
    const timeoutMs = options.timeoutMs || 15000;
    const signal = options.signal || AbortSignal.timeout(timeoutMs);

    let res;
    try {
      res = await fetch(url, { ...options, headers, signal });
    } catch (fetchErr) {
      const err = new Error(fetchErr.name === 'TimeoutError' || fetchErr.name === 'AbortError'
        ? `HRMS request timed out after ${timeoutMs / 1000}s`
        : `HRMS connection failed: ${fetchErr.message}`);
      err.code = fetchErr.code || (fetchErr.name === 'TimeoutError' ? 'ETIMEDOUT' : 'HRMS_NETWORK_ERROR');
      err.status = 503;
      throw err;
    }

    if (!res.ok) {
      if (res.status === 401 && options.userId) {
        this.sessionCache.delete(String(options.userId));
      }
      const errorJson = await res.json().catch(() => null);
      const detail = errorJson?.detail || errorJson?.error?.message || errorJson?.message || `HRMS error ${res.status}`;
      const err = new Error(detail);
      err.status = res.status;
      err.code = errorJson?.code;
      err.details = errorJson?.error?.details || [];
      throw err;
    }

    if (res.status === 204) return null;
    return await res.json();
  }

  /**
   * Fetch all employees from the integration feed.
   */
  async getIntegrationEmployees(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && this.employeesCache && this.employeesCachedAt > now - this.CACHE_TTL) {
      return this.employeesCache;
    }

    let allEmployees = [];
    let offset = 0;
    const limit = 200;
    let pageCount = 0;
    const MAX_PAGES = 50;

    while (true) {
      const res = await this.integrationRequest(`/v1/integrations/employees?limit=${limit}&offset=${offset}`);
      const emps = res?.employees || [];
      allEmployees.push(...emps);
      pageCount++;
      if (emps.length < limit || !res?.has_more || pageCount >= MAX_PAGES) break;
      offset += limit;
    }

    this.employeesCache = allEmployees;
    this.employeesCachedAt = now;
    return allEmployees;
  }

  /**
   * Links an EXIM user to an existing HRMS employee if external_id is missing.
   */
  async linkUserToHrms(user) {
    const externalId = user._id.toString();
    const emps = await this.getIntegrationEmployees(true);

    const norm = (val) => String(val || '').trim().toLowerCase();
    const cleanAlphaNum = (val) => String(val || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const targetUsername = norm(user.username);
    const targetCleanUsername = cleanAlphaNum(user.username);
    const targetCode = norm(user.employee_code);
    const targetCleanCode = cleanAlphaNum(user.employee_code);
    const targetEmail = norm(user.email);
    const targetFullName = norm(`${user.first_name || ''} ${user.last_name || ''}`).trim();

    const match = emps.find((e) => {
      const code = norm(e.employee_code);
      const cleanCode = cleanAlphaNum(e.employee_code);
      const email = norm(e.email);
      const empFullName = norm(`${e.first_name || e.legal_first_name || ''} ${e.last_name || e.legal_last_name || ''}`).trim();

      // 1. Employee code or clean employee code exact match
      if (targetCode && (code === targetCode || cleanCode === targetCleanCode)) return true;

      // 2. Username matches employee code
      if (targetUsername && (code === targetUsername || cleanCode === targetCleanUsername)) return true;

      // 3. Email exact match
      if (targetEmail && email === targetEmail) return true;

      // 4. Full name match (if non-empty and has at least first and last name)
      if (targetFullName && empFullName && targetFullName === empFullName && targetFullName.length > 5) return true;

      return false;
    });

    if (match && match.employment_id) {
      console.log(`[HRMS Client] Linking user ${user.username} (${externalId}) to HRMS employment ${match.employment_id}`);
      try {
        if (match.employee_code) {
          await this.linkEmployees([{ external_id: externalId, employee_code: match.employee_code }], { dryRun: false });
        }
      } catch (linkErr) {
        console.warn(`[HRMS Client] linkEmployees failed, trying direct PUT:`, linkErr.message);
      }

      await this.integrationRequest(`/v1/integrations/employees/${encodeURIComponent(externalId)}`, {
        method: 'PUT',
        body: {
          employment_id: match.employment_id,
        },
      });

      this.sessionCache.delete(externalId);
      return match;
    }

    return null;
  }

  /**
   * Obtains a session token for an employee from the HRMS Integration API.
   * Token is cached for 50 minutes (validity: 60 minutes).
   */
  async getEmployeeSession(user) {
    if (!user || !user._id) {
      throw new Error('User context is required to issue HRMS session');
    }

    const externalId = user._id.toString();
    const now = Date.now();
    const cached = this.sessionCache.get(externalId);

    if (cached && cached.expiresAt > now + 60 * 1000) {
      return cached;
    }

    // Periodic prune of expired sessions from cache
    if (this.sessionCache.size > 200) {
      for (const [key, val] of this.sessionCache.entries()) {
        if (!val || val.expiresAt <= now) this.sessionCache.delete(key);
      }
    }

    try {
      const data = await this.integrationRequest('/v1/integrations/sessions', {
        method: 'POST',
        body: { external_id: externalId },
      });

      const sessionObj = {
        access_token: data.access_token,
        employment_id: data.employment_id,
        roles: data.roles || ['EMPLOYEE'],
        expiresAt: now + (data.expires_in || 3600) * 1000,
      };

      this.sessionCache.set(externalId, sessionObj);
      return sessionObj;
    } catch (err) {
      // If session is refused, attempt auto-linking by employee code/email
      if (err.status === 403 || err.code === 'SESSION_REFUSED') {
        console.warn(`[HRMS Client] Session refused for ${user.username} (${externalId}). Attempting auto-link...`);
        const linked = await this.linkUserToHrms(user);
        if (linked) {
          // Retry session issuance after link
          const data = await this.integrationRequest('/v1/integrations/sessions', {
            method: 'POST',
            body: { external_id: externalId },
          });

          const sessionObj = {
            access_token: data.access_token,
            employment_id: data.employment_id,
            roles: data.roles || ['EMPLOYEE'],
            expiresAt: now + (data.expires_in || 3600) * 1000,
          };

          this.sessionCache.set(externalId, sessionObj);
          return sessionObj;
        }
      }

      throw err;
    }
  }

  // ─── Self-Service Endpoints via Employee Session Token ──────────────────────

  /**
   * Today's punch status for the logged-in employee.
   */
  async getTodayStatus(user, workDate = null) {
    const session = await this.getEmployeeSession(user);
    const query = workDate ? `?work_date=${encodeURIComponent(workDate)}` : '';
    return await this.bearerRequest(`/v1/time/today${query}`, session.access_token, { userId: user._id });
  }

  /**
   * Record a punch (IN, OUT, BREAK_START, BREAK_END).
   */
  async recordPunch({ user, punchType, source = 'WEB', latitude = null, longitude = null, confirmLongDay = false }) {
    const session = await this.getEmployeeSession(user);
    const body = {
      punch_type: punchType,
      source: source || 'WEB',
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      confirm_long_day: Boolean(confirmLongDay),
    };
    return await this.bearerRequest('/v1/time/punches', session.access_token, {
      method: 'POST',
      body,
      userId: user._id,
    });
  }

  /**
   * Get attendance days ledger for the date range.
   */
  async getAttendanceDays({ user, fromDate, toDate }) {
    const session = await this.getEmployeeSession(user);
    const params = new URLSearchParams({
      from_date: fromDate,
      to_date: toDate,
    });
    return await this.bearerRequest(`/v1/time/attendance-days?${params.toString()}`, session.access_token, { userId: user._id });
  }

  /**
   * Get leave balances for the employee.
   */
  async getLeaveBalances(user, year = null) {
    const session = await this.getEmployeeSession(user);
    const query = year ? `?year=${encodeURIComponent(year)}` : '';
    return await this.bearerRequest(`/v1/leave/balances${query}`, session.access_token, { userId: user._id });
  }

  /**
   * List available leave types.
   */
  async getLeaveTypes(user) {
    const session = await this.getEmployeeSession(user);
    return await this.bearerRequest('/v1/leave/types', session.access_token, { userId: user._id });
  }

  /**
   * List leave applications for the employee.
   */
  async getLeaveApplications(user, status = null) {
    const session = await this.getEmployeeSession(user);
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return await this.bearerRequest(`/v1/leave/applications${query}`, session.access_token, { userId: user._id });
  }

  /**
   * Create and submit a leave application.
   */
  async applyLeave({ user, leaveTypeId, fromDate, toDate, halfDayOption = 'NONE', reason = '' }) {
    const session = await this.getEmployeeSession(user);

    // 1. Create draft application
    const draft = await this.bearerRequest('/v1/leave/applications', session.access_token, {
      method: 'POST',
      body: {
        leave_type_id: leaveTypeId,
        from_date: fromDate,
        to_date: toDate,
        half_day_option: halfDayOption || 'NONE',
        reason: reason || null,
      },
      userId: user._id,
    });

    // 2. Submit the draft application
    if (draft && draft.id) {
      try {
        const submitted = await this.bearerRequest(`/v1/leave/applications/${encodeURIComponent(draft.id)}/submit`, session.access_token, {
          method: 'POST',
          userId: user._id,
        });
        return submitted;
      } catch (submitErr) {
        console.warn(`[HRMS Client] Application created (${draft.id}) but submit failed:`, submitErr.message);
        const err = new Error(`Leave application drafted, but submit failed: ${submitErr.message}`);
        err.status = submitErr.status || 400;
        err.code = submitErr.code || 'LEAVE_SUBMIT_FAILED';
        err.details = submitErr.details || [];
        throw err;
      }
    }

    return draft;
  }

  /**
   * Cancel an active or pending leave application.
   */
  async cancelLeave({ user, applicationId, cancelReason = 'Cancelled by employee' }) {
    const session = await this.getEmployeeSession(user);
    return await this.bearerRequest(`/v1/leave/applications/${encodeURIComponent(applicationId)}/cancel`, session.access_token, {
      method: 'POST',
      body: {
        cancel_reason: cancelReason || null,
      },
      userId: user._id,
    });
  }

  /**
   * Get correction (regularization) requests.
   */
  async getCorrections(user, status = null) {
    const session = await this.getEmployeeSession(user);
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    return await this.bearerRequest(`/v1/corrections${query}`, session.access_token, { userId: user._id });
  }

  /**
   * Submit an attendance correction request.
   */
  async requestCorrection({ user, workDate, correctionType, requestedPunchIn = null, requestedPunchOut = null, reason }) {
    const session = await this.getEmployeeSession(user);
    return await this.bearerRequest('/v1/corrections', session.access_token, {
      method: 'POST',
      body: {
        work_date: workDate,
        correction_type: correctionType,
        requested_punch_in: requestedPunchIn || null,
        requested_punch_out: requestedPunchOut || null,
        reason: reason || 'Attendance correction',
      },
      userId: user._id,
    });
  }

  /**
   * Cancel a pending correction request.
   */
  async cancelCorrection({ user, correctionId }) {
    const session = await this.getEmployeeSession(user);
    return await this.bearerRequest(`/v1/corrections/${encodeURIComponent(correctionId)}/cancel`, session.access_token, {
      method: 'POST',
      userId: user._id,
    });
  }

  /**
   * Approve an attendance correction request directly.
   */
  async approveCorrection({ user, correctionId, comments = 'Approved by administrator' }) {
    const session = await this.getEmployeeSession(user);
    return await this.bearerRequest(`/v1/corrections/${encodeURIComponent(correctionId)}/approve`, session.access_token, {
      method: 'POST',
      body: {
        action: 'APPROVE',
        comments: comments || null,
      },
      userId: user._id,
    });
  }

  /**
   * Get approvals inbox for managers/admins.
   */
  async getApprovalsInbox(user) {
    const session = await this.getEmployeeSession(user);
    return await this.bearerRequest('/v1/approvals/inbox', session.access_token, { userId: user._id });
  }

  /**
   * Make decision on an approval item.
   */
  async makeApprovalDecision({ user, instanceId, action, comments = '' }) {
    const session = await this.getEmployeeSession(user);
    return await this.bearerRequest(`/v1/approvals/requests/${encodeURIComponent(instanceId)}/decision`, session.access_token, {
      method: 'POST',
      body: {
        action: action === 'REJECT' ? 'REJECT' : 'APPROVE',
        comments: comments || null,
      },
      userId: user._id,
    });
  }

  /**
   * Profile of the currently signed-in employee.
   */
  async getProfile(user) {
    const session = await this.getEmployeeSession(user);
    return await this.bearerRequest('/v1/persons/me', session.access_token, { userId: user._id });
  }

  // ─── Direct Integration API Operations (via X-API-Key) ──────────────────────

  /**
   * Read daily attendance snapshot across the organization.
   */
  async getDailyAttendance(date) {
    return await this.integrationRequest(`/v1/integrations/attendance/daily?date=${encodeURIComponent(date)}`);
  }

  /**
   * Read approved leaves across the organization.
   */
  async getOrgLeaves(from, to) {
    return await this.integrationRequest(`/v1/integrations/leave?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  }

  /**
   * Read holiday calendars.
   */
  async getHolidays(year = new Date().getFullYear()) {
    return await this.integrationRequest(`/v1/integrations/holidays?year=${encodeURIComponent(year)}`);
  }

  /**
   * Read integration reference data (companies, departments, locations, designations).
   */
  async getReferenceData() {
    return await this.integrationRequest('/v1/integrations/reference-data');
  }

  // ─── Employee Sync & Lifecycle Endpoints (v1.5) ─────────────────────────────

  /**
   * Create or update one employee in HRMS.
   * Path: PUT /v1/integrations/employees/{external_id}
   */
  async upsertEmployee(externalId, employeeData, { dryRun = false, idempotencyKey = null } = {}) {
    const query = dryRun ? '?dry_run=true' : '';
    const headers = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return await this.integrationRequest(`/v1/integrations/employees/${encodeURIComponent(externalId)}${query}`, {
      method: 'PUT',
      headers,
      body: employeeData,
    });
  }

  /**
   * Fetch an employee by external ID from HRMS.
   * Path: GET /v1/integrations/employees/{external_id}
   */
  async getEmployee(externalId) {
    return await this.integrationRequest(`/v1/integrations/employees/${encodeURIComponent(externalId)}`);
  }

  /**
   * Separate / exit an employee in HRMS.
   * Path: POST /v1/integrations/employees/{external_id}/exit
   */
  async exitEmployee(externalId, { lastWorkingDay, reasonCode = 'RESIGNATION', idempotencyKey = null } = {}) {
    const headers = {
      'Idempotency-Key': idempotencyKey || `exit-${externalId}-${Date.now()}`,
    };
    return await this.integrationRequest(`/v1/integrations/employees/${encodeURIComponent(externalId)}/exit`, {
      method: 'POST',
      headers,
      body: {
        last_working_day: lastWorkingDay,
        reason_code: reasonCode,
      },
    });
  }

  /**
   * Rehire an employee in HRMS.
   * Path: POST /v1/integrations/employees/{external_id}/rehire
   */
  async rehireEmployee(externalId, { hireDate, idempotencyKey = null } = {}) {
    const headers = {
      'Idempotency-Key': idempotencyKey || `rehire-${externalId}-${Date.now()}`,
    };
    return await this.integrationRequest(`/v1/integrations/employees/${encodeURIComponent(externalId)}/rehire`, {
      method: 'POST',
      headers,
      body: {
        hire_date: hireDate,
      },
    });
  }

  /**
   * Bulk upsert employees in HRMS (up to 200).
   * Path: POST /v1/integrations/employees/bulk
   */
  async bulkUpsertEmployees(records, { idempotencyKey = null } = {}) {
    const headers = {
      'Idempotency-Key': idempotencyKey || `bulk-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    };
    return await this.integrationRequest('/v1/integrations/employees/bulk', {
      method: 'POST',
      headers,
      body: { records },
    });
  }

  /**
   * Link existing employees between EXIM and HRMS.
   * Path: POST /v1/integrations/employees/link
   */
  async linkEmployees(records, { dryRun = false } = {}) {
    return await this.integrationRequest('/v1/integrations/employees/link', {
      method: 'POST',
      body: {
        records,
        dry_run: Boolean(dryRun),
      },
    });
  }

  /**
   * Reconcile active external IDs between EXIM and HRMS.
   * Path: POST /v1/integrations/reconcile
   */
  async reconcileEmployees(activeExternalIds) {
    return await this.integrationRequest('/v1/integrations/reconcile', {
      method: 'POST',
      body: {
        active_external_ids: activeExternalIds,
      },
    });
  }

  /**
   * Poll events feed from HRMS (Pull sync).
   * Path: GET /v1/integrations/events?after=<cursor>&limit=500
   */
  async getEventsFeed(afterCursor = null, limit = 500) {
    const params = new URLSearchParams();
    if (afterCursor) params.append('after', afterCursor);
    if (limit) params.append('limit', String(limit));
    const query = params.toString() ? `?${params.toString()}` : '';
    return await this.integrationRequest(`/v1/integrations/events${query}`);
  }
}

export const hrmsClient = new HrmsClient();
export default hrmsClient;
