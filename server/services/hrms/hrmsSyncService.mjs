import UserModel from '../../model/userModel.mjs';
import HrmsSyncState from '../../model/hrms/hrmsSyncStateModel.mjs';
import hrmsClient from './hrmsClient.mjs';
import bcrypt from 'bcrypt';

class HrmsSyncService {
  constructor() {
    this.isPolling = false;
    this.pollIntervalTimer = null;
  }

  /**
   * Fetch or initialize persistent HRMS sync state.
   */
  async getSyncState() {
    let state = await HrmsSyncState.findOne({ systemCode: 'EXIM' });
    if (!state) {
      state = await HrmsSyncState.create({
        systemCode: 'EXIM',
        lastCursor: 'c_000000000000',
        lastPolledAt: null,
      });
    }
    return state;
  }

  /**
   * Formats an EXIM user model into HRMS integration sync payload.
   */
  formatUserForHrms(user) {
    const rawHireDate = user.date_of_joining || user.joining_date;
    let hireDateStr = null;
    if (rawHireDate) {
      const d = new Date(rawHireDate);
      if (!isNaN(d.getTime())) {
        hireDateStr = d.toISOString().split('T')[0];
      }
    }
    if (!hireDateStr) {
      hireDateStr = '2024-01-01'; // Safe fallback
    }

    const isManager =
      user.role === 'Admin' ||
      user.role === 'Head_of_Department' ||
      user.role === 'HOD' ||
      Boolean(user.isHod) ||
      user.crmRole === 'Manager';

    return {
      employee_code: (user.employee_code || user.username || '').trim(),
      first_name: (user.first_name || user.username || 'Employee').trim(),
      last_name: (user.last_name || '').trim() || '.',
      email: (user.email || user.official_email || user.personal_email || '').trim() || null,
      mobile: (user.mobile || '').trim() || null,
      date_of_birth: user.date_of_birth || user.dob || null,
      gender: user.gender ? user.gender.toUpperCase() : null,
      company: user.company || 'Suraj Forwarders Private Limited',
      department: user.department || 'Operations',
      designation: user.designation || 'Executive',
      location: user.branch || user.location || 'Suraj Forwarders Private Limited Head Office',
      role: isManager ? 'MANAGER' : 'EMPLOYEE',
      hire_date: hireDateStr,
      source_updated_at: new Date().toISOString(),
    };
  }

  /**
   * Pushes a single EXIM user to HRMS (Upsert).
   */
  async pushUserToHrms(userId, { dryRun = false } = {}) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const payload = this.formatUserForHrms(user);
    const externalId = user._id.toString();

    console.log(`[HRMS Sync] Pushing user ${user.username} (${externalId}) to HRMS...`);
    const result = await hrmsClient.upsertEmployee(externalId, payload, { dryRun });
    return { user: user.username, externalId, result };
  }

  /**
   * Syncs user separation or rehire to HRMS when their status changes in EXIM.
   */
  async syncUserStatusToHrms(userId, isActive, { lastWorkingDay = null } = {}) {
    try {
      const user = await UserModel.findById(userId);
      if (!user) return null;
      const externalId = user._id.toString();

      if (!isActive) {
        const lwd =
          lastWorkingDay ||
          (user.deactivatedAt
            ? user.deactivatedAt.toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0]);
        console.log(`[HRMS Sync] Syncing exit for user ${user.username} (${externalId}) to HRMS...`);
        return await hrmsClient.exitEmployee(externalId, {
          lastWorkingDay: lwd,
          reasonCode: "RESIGNED",
        });
      } else {
        const hireDate = user.date_of_joining
          ? user.date_of_joining.toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];
        console.log(`[HRMS Sync] Syncing rehire for user ${user.username} (${externalId}) to HRMS...`);
        return await hrmsClient.rehireEmployee(externalId, { hireDate });
      }
    } catch (err) {
      console.warn(`[HRMS Sync] User status sync warning:`, err?.message || err);
      return null;
    }
  }

  /**
   * Pushes all active EXIM users to HRMS in bulk batches of up to 100.
   */
  async syncAllUsersToHrms({ dryRun = false } = {}) {
    const users = await UserModel.find({ isActive: { $ne: false } });
    console.log(`[HRMS Sync] Starting bulk sync of ${users.length} active users to HRMS...`);

    const batchSize = 100;
    const summary = {
      total: users.length,
      batches: 0,
      created: 0,
      updated: 0,
      unchanged: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < users.length; i += batchSize) {
      const chunk = users.slice(i, i + batchSize);
      summary.batches++;

      if (dryRun) {
        // Run individual dry-run PUTs for preview
        for (const u of chunk) {
          try {
            const p = this.formatUserForHrms(u);
            const res = await hrmsClient.upsertEmployee(u._id.toString(), p, { dryRun: true });
            if (res?.outcome === 'CREATED') summary.created++;
            else if (res?.outcome === 'UPDATED') summary.updated++;
            else summary.unchanged++;
          } catch (err) {
            summary.failed++;
            summary.errors.push({ username: u.username, error: err.message });
          }
        }
      } else {
        const records = chunk.map((u) => ({
          external_id: u._id.toString(),
          ...this.formatUserForHrms(u),
        }));

        try {
          const res = await hrmsClient.bulkUpsertEmployees(records);
          summary.created += res?.created || 0;
          summary.updated += res?.updated || 0;
          summary.unchanged += res?.unchanged || 0;
          summary.failed += res?.failed || 0;
        } catch (err) {
          console.error(`[HRMS Sync] Bulk batch ${summary.batches} failed:`, err.message);
          summary.failed += chunk.length;
          summary.errors.push({ batch: summary.batches, error: err.message });
        }
      }
    }

    return summary;
  }

  /**
   * Links existing EXIM users with HRMS employees.
   */
  async linkExistingUsers({ dryRun = false } = {}) {
    const users = await UserModel.find({});
    const records = users.map((u) => ({
      external_id: u._id.toString(),
      employee_code: (u.employee_code || u.username || '').trim(),
    })).filter((r) => r.employee_code);

    console.log(`[HRMS Sync] Linking ${records.length} users with HRMS (dryRun: ${dryRun})...`);
    return await hrmsClient.linkEmployees(records, { dryRun });
  }

  /**
   * Reconciles active EXIM user IDs against HRMS active external identities.
   */
  async runReconciliation() {
    const activeUsers = await UserModel.find({ isActive: { $ne: false } }).select('_id');
    const activeExternalIds = activeUsers.map((u) => u._id.toString());

    console.log(`[HRMS Sync] Running reconciliation for ${activeExternalIds.length} active users...`);
    const result = await hrmsClient.reconcileEmployees(activeExternalIds);

    // Save result to sync state
    const state = await this.getSyncState();
    state.lastReconcile = {
      reconciled_at: new Date(),
      matched: result?.matched || 0,
      in_app_not_in_hrms_count: result?.in_app_not_in_hrms?.length || 0,
      active_in_hrms_not_in_app_count: result?.active_in_hrms_not_in_app?.length || 0,
      separated_in_hrms_active_in_app_count: result?.separated_in_hrms_active_in_app?.length || 0,
      raw: result,
    };
    await state.save();

    return result;
  }

  /**
   * Polls the HRMS events feed (Pull model) and applies changes locally in EXIM.
   * Handles:
   *  - employee.hired
   *  - employee.updated
   *  - employee.separated
   *  - employee.rehired
   */
  async pollAndApplyEvents() {
    if (this.isPolling) {
      console.log('[HRMS Sync] Polling is already in progress, skipping tick.');
      return { status: 'IN_PROGRESS' };
    }

    this.isPolling = true;
    const state = await this.getSyncState();
    const currentCursor = state.lastCursor || 'c_000000000000';

    try {
      state.totalPolls = (state.totalPolls || 0) + 1;
      state.lastPolledAt = new Date();

      const feedRes = await hrmsClient.getEventsFeed(currentCursor, 500);
      const events = feedRes?.events || [];
      const nextCursor = feedRes?.next_cursor || currentCursor;

      let appliedCount = 0;
      const recentLogs = [];

      for (const evt of events) {
        const { id: eventId, event: eventType, employment_id, external_id, employee, occurred_at } = evt;
        console.log(`[HRMS Sync] Processing event ${eventId} (${eventType}) for employment ${employment_id}...`);

        let outcome = 'APPLIED';
        let errorMsg = null;
        let details = null;

        try {
          if (eventType === 'employee.hired') {
            // Find existing user or create a new user in EXIM
            let user = null;
            if (external_id) {
              user = await UserModel.findById(external_id);
            }
            if (!user && employee?.employee_code) {
              user = await UserModel.findOne({
                $or: [
                  { employee_code: employee.employee_code },
                  { username: employee.employee_code },
                ],
              });
            }
            if (!user && employee?.email) {
              user = await UserModel.findOne({ email: employee.email });
            }

            if (user) {
              // Existing user -> Confirm link in HRMS
              await hrmsClient.upsertEmployee(user._id.toString(), {
                employment_id,
              });
              outcome = 'LINKED';
              details = { linked_user: user.username, user_id: user._id };
            } else {
              // Create new user in EXIM
              const defaultPasswordHash = await bcrypt.hash('Firstname@1234', 10);
              const username = employee.employee_code || (employee.email ? employee.email.split('@')[0] : `emp_${Date.now()}`);

              const newUser = await UserModel.create({
                username,
                password: defaultPasswordHash,
                first_name: employee.first_name || username,
                last_name: employee.last_name || '.',
                email: employee.email || null,
                mobile: employee.mobile || null,
                employee_code: employee.employee_code || username,
                company: employee.company?.name || employee.company?.code || 'Suraj Forwarders Private Limited',
                department: employee.department?.name || 'Operations',
                designation: employee.designation?.name || 'Executive',
                role: employee.role === 'MANAGER' ? 'Manager' : 'Employee',
                isHod: employee.role === 'MANAGER',
                isActive: true,
                date_of_joining: employee.hire_date ? new Date(employee.hire_date) : new Date(),
                modules: ['Attendance'],
              });

              // Confirm link back in HRMS with new User ID
              await hrmsClient.upsertEmployee(newUser._id.toString(), {
                employment_id,
              });

              outcome = 'CREATED_AND_LINKED';
              details = { created_user: newUser.username, user_id: newUser._id };
            }
          } else if (eventType === 'employee.updated') {
            // Update existing user attributes in EXIM
            let user = null;
            if (external_id) user = await UserModel.findById(external_id);
            if (!user && employee?.employee_code) {
              user = await UserModel.findOne({ employee_code: employee.employee_code });
            }

            if (user && employee) {
              if (employee.first_name) user.first_name = employee.first_name;
              if (employee.last_name) user.last_name = employee.last_name;
              if (employee.email) user.email = employee.email;
              if (employee.mobile) user.mobile = employee.mobile;
              if (employee.department?.name) user.department = employee.department.name;
              if (employee.designation?.name) user.designation = employee.designation.name;
              if (employee.company?.name) user.company = employee.company.name;
              await user.save();
              outcome = 'APPLIED';
              details = { updated_user: user.username };
            } else {
              outcome = 'SKIPPED';
              details = { reason: 'User not found for update' };
            }
          } else if (eventType === 'employee.separated') {
            // Mark user inactive
            let user = null;
            if (external_id) user = await UserModel.findById(external_id);
            if (!user && employee?.employee_code) {
              user = await UserModel.findOne({ employee_code: employee.employee_code });
            }

            if (user) {
              user.isActive = false;
              user.deactivatedAt = employee?.last_working_day ? new Date(employee.last_working_day) : new Date();
              await user.save();
              outcome = 'APPLIED';
              details = { separated_user: user.username };
            } else {
              outcome = 'SKIPPED';
            }
          } else if (eventType === 'employee.rehired') {
            // Reactivate user
            let user = null;
            if (external_id) user = await UserModel.findById(external_id);
            if (!user && employee?.employee_code) {
              user = await UserModel.findOne({ employee_code: employee.employee_code });
            }

            if (user) {
              user.isActive = true;
              user.deactivatedAt = null;
              if (employee?.hire_date) user.date_of_joining = new Date(employee.hire_date);
              await user.save();
              outcome = 'APPLIED';
              details = { rehired_user: user.username };
            } else {
              outcome = 'SKIPPED';
            }
          }

          appliedCount++;
        } catch (eventErr) {
          outcome = 'FAILED';
          errorMsg = eventErr.message;
          console.error(`[HRMS Sync] Error applying event ${eventId}:`, eventErr.message);
        }

        recentLogs.push({
          eventId,
          eventType,
          employmentId: employment_id,
          externalId: external_id,
          occurredAt: occurred_at ? new Date(occurred_at) : new Date(),
          processedAt: new Date(),
          outcome,
          error: errorMsg,
          details,
        });
      }

      // Update state
      state.lastCursor = nextCursor;
      state.lastSuccessAt = new Date();
      state.lastError = null;
      state.totalEventsProcessed = (state.totalEventsProcessed || 0) + appliedCount;

      if (recentLogs.length > 0) {
        state.recentEvents = [...recentLogs, ...(state.recentEvents || [])].slice(0, 100);
      }
      await state.save();

      return {
        status: 'SUCCESS',
        eventsReceived: events.length,
        eventsApplied: appliedCount,
        nextCursor,
      };
    } catch (err) {
      console.error('[HRMS Sync] Poll cycle failed:', err.message);
      state.lastError = err.message;
      await state.save().catch(() => {});
      return { status: 'ERROR', error: err.message };
    } finally {
      this.isPolling = false;
    }
  }

  /**
   * Start recurring background polling for worker 1.
   */
  startBackgroundSync(intervalMs = 60000) {
    if (process.env.DISABLE_HRMS_SYNC === 'true') {
      console.log('⏸️ [HRMS Sync] Background events poller disabled via DISABLE_HRMS_SYNC=true');
      return;
    }

    if (this.pollIntervalTimer) {
      clearInterval(this.pollIntervalTimer);
    }

    console.log(`⏱️ [HRMS Sync] Background events poller started (interval: ${intervalMs / 1000}s)`);
    // Run an initial poll after 5 seconds
    setTimeout(() => {
      this.pollAndApplyEvents().catch((err) => console.error('[HRMS Sync] Initial poll error:', err.message));
    }, 5000);

    this.pollIntervalTimer = setInterval(() => {
      this.pollAndApplyEvents().catch((err) => console.error('[HRMS Sync] Interval poll error:', err.message));
    }, intervalMs);
  }
}

export const hrmsSyncService = new HrmsSyncService();
export default hrmsSyncService;
