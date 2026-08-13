/**
 * PolicyResolver – determines the active WeekOffPolicy & HolidayPolicy for a user.
 *
 * Resolution order (first match wins):
 *   1. Explicit override on user record  (user.weekoff_policy_id / user.holiday_policy_id)
 *   2. Policy whose applicability matches user's team
 *   3. Policy with empty (All) applicability scope — company-wide default
 */

import WeekOffPolicy from '../../model/attendance/WeekOffPolicy.js';
import HolidayPolicy from '../../model/attendance/HolidayPolicy.js';
import Shift from '../../model/attendance/Shift.js';
import TeamModel from '../../model/teamModel.mjs';
import moment from 'moment-timezone';
import mongoose from 'mongoose';

const CACHE_TTL_MS = 60 * 1000;
const weekOffPolicyCache = { data: null, expiresAt: 0 };
const holidayPolicyCache = new Map();
const userTeamCache = new Map();

class PolicyResolver {
  static async getUserTeamIds(user, providedTeamIds = null) {
    if (Array.isArray(providedTeamIds)) {
      return providedTeamIds.map((id) => String(id));
    }

    if (!user?._id) return [];

    const key = String(user._id);
    const now = Date.now();
    const cached = userTeamCache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.teamIds;
    }

    const userTeams = await TeamModel.find({
      'members.userId': user._id,
      isActive: { $ne: false }
    }).select('_id').lean();

    const teamIds = userTeams.map((t) => String(t._id));
    userTeamCache.set(key, { teamIds, expiresAt: now + CACHE_TTL_MS });
    return teamIds;
  }

  static async getActiveWeekOffPolicies(companyId) {
    const now = Date.now();
    const cacheKey = companyId ? String(companyId) : 'global';
    
    if (weekOffPolicyCache.data && weekOffPolicyCache.data[cacheKey] && weekOffPolicyCache.expiresAt > now) {
      return weekOffPolicyCache.data[cacheKey];
    }

    const query = { status: 'active' };
    if (companyId) {
        query.company_id = companyId;
    }

    const policies = await WeekOffPolicy.find(query).lean();
    
    if (!weekOffPolicyCache.data) weekOffPolicyCache.data = {};
    weekOffPolicyCache.data[cacheKey] = policies;
    weekOffPolicyCache.expiresAt = now + CACHE_TTL_MS;
    
    return policies;
  }

  static async getActiveHolidayPolicies(companyId, year) {
    if (!companyId) return [];

    const cacheKey = `${companyId}:${year}`;
    const now = Date.now();
    const cached = holidayPolicyCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const policies = await HolidayPolicy.find({
      company_id: companyId,
      year,
      status: 'active'
    }).lean();

    holidayPolicyCache.set(cacheKey, { data: policies, expiresAt: now + CACHE_TTL_MS });
    return policies;
  }

  // ───────────────────────────────────────────────────────────
  // Shift resolution
  // ───────────────────────────────────────────────────────────

  /**
   * Returns the resolved Shift for a user.
   * @param {Object} user 
   * @param {string|Date} [date]
   * @param {Date} [referenceTime]
   * @returns {Promise<Object|null>}
   */
  static async resolveShift(user, date = null, referenceTime = null) {
    const companyId = user.company_id?._id || user.company_id;
    if (!companyId) return null;

    let isRabs = false;
    let autoShiftEnabled = false;
    const Company = mongoose.model('Company');
    const company = await Company.findById(companyId).lean();

    if (user.company && /RABS/i.test(user.company)) {
      isRabs = true;
    } else if (company && /RABS/i.test(company.company_name)) {
      isRabs = true;
    }

    if (isRabs && company?.attendance_config?.auto_shift_detection_enabled) {
      autoShiftEnabled = true;
    }

    // Bypass dynamic routing if the user has an explicitly assigned/custom shift
    if (isRabs && user?.work_pattern_override?.custom_shift === true) {
      isRabs = false;
      autoShiftEnabled = false;
    }

    let resolveDynamically = isRabs;

    if (!resolveDynamically) {
      const hasReferenceTime = !!referenceTime;
      let hasPunches = false;
      if (date) {
        const AttendancePunch = mongoose.model('AttendancePunch');
        const dateStr = typeof date === 'string' ? date : moment(date).format('YYYY-MM-DD');
        const firstInPunch = await AttendancePunch.findOne({
          employee_id: user._id,
          punch_type: 'IN',
          punch_date_str: dateStr
        }).sort({ punch_time: 1 }).lean();
        if (firstInPunch) {
          hasPunches = true;
        }
      }
      if (hasReferenceTime || hasPunches) {
        resolveDynamically = true;
      }
    }

    if (resolveDynamically) {
      console.log(`[AutoShiftDetection] Executing shift resolution for user: ${user.username}. Auto Shift Detection flag: ${autoShiftEnabled}`);
    } else {
      console.log(`[AutoShiftDetection] Skipping shift resolution for user: ${user.username} (Non-RABS and no current/past punches). Using standard assigned shift logic.`);
    }

    if (resolveDynamically) {
      const activeShifts = await Shift.find({ company_id: companyId, status: 'active' }).lean();
      if (activeShifts.length > 0) {
        let comparisonTime = referenceTime;
        
        if (!comparisonTime && date) {
          const AttendancePunch = mongoose.model('AttendancePunch');
          const dateStr = typeof date === 'string' ? date : moment(date).format('YYYY-MM-DD');
          const firstInPunch = await AttendancePunch.findOne({
            employee_id: user._id,
            punch_type: 'IN',
            punch_date_str: dateStr
          }).sort({ punch_time: 1 }).lean();
          
          if (firstInPunch) {
            comparisonTime = firstInPunch.punch_time;
          }
        }
        
        const tz = company?.timezone || 'Asia/Kolkata';
        
        if (!comparisonTime) {
          const todayStr = moment().tz(tz).format('YYYY-MM-DD');
          const targetDateStr = date ? (typeof date === 'string' ? date : moment(date).format('YYYY-MM-DD')) : todayStr;
          
          if (targetDateStr === todayStr) {
            comparisonTime = new Date();
          }
        }
        
        if (comparisonTime) {
          const targetMoment = moment(comparisonTime).tz(tz);
          const targetMinutes = targetMoment.hours() * 60 + targetMoment.minutes();

          if (autoShiftEnabled) {
            // Auto Shift Detection logic based on detection windows
            const matchingShifts = [];
            for (const s of activeShifts) {
              if (!s.detection_window_start || !s.detection_window_end) continue;
              
              const [sh, sm] = s.detection_window_start.split(':').map(Number);
              const [eh, em] = s.detection_window_end.split(':').map(Number);
              if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) continue;
              
              const startMin = sh * 60 + sm;
              const endMin = eh * 60 + em;
              
              let inWindow = false;
              if (startMin <= endMin) {
                inWindow = targetMinutes >= startMin && targetMinutes <= endMin;
              } else {
                inWindow = targetMinutes >= startMin || targetMinutes <= endMin;
              }
              
              if (inWindow) {
                matchingShifts.push(s);
              }
            }

            if (matchingShifts.length === 1) {
              return await Shift.findById(matchingShifts[0]._id);
            } else if (matchingShifts.length > 1) {
              let bestShift = null;
              let minDiff = Infinity;
              for (const s of matchingShifts) {
                if (!s.start_time) continue;
                const [sh, sm] = s.start_time.split(':').map(Number);
                if (isNaN(sh) || isNaN(sm)) continue;
                
                const startMin = sh * 60 + sm;
                let diff = Math.abs(targetMinutes - startMin);
                diff = Math.min(diff, 1440 - diff);
                
                if (diff < minDiff) {
                  minDiff = diff;
                  bestShift = s;
                } else if (diff === minDiff) {
                  const bestPriority = bestShift.priority ?? Infinity;
                  const currentPriority = s.priority ?? Infinity;
                  if (currentPriority < bestPriority) {
                    bestShift = s;
                  }
                }
              }
              if (bestShift) {
                return await Shift.findById(bestShift._id);
              }
            }
            // Fall back to existing 24-hour flexible proximity matching if no windows match
          }

          // Existing 24-hour proximity matching
          let closestShift = null;
          let minDiff = Infinity;
          
          for (const s of activeShifts) {
            if (!s.start_time) continue;
            const [sh, sm] = s.start_time.split(':').map(Number);
            if (isNaN(sh) || isNaN(sm)) continue;
            
            const shiftMinutes = sh * 60 + sm;
            let diff = Math.abs(targetMinutes - shiftMinutes);
            diff = Math.min(diff, 1440 - diff);
            
            if (diff < minDiff) {
              minDiff = diff;
              closestShift = s;
            }
          }
          
          if (closestShift) {
            return await Shift.findById(closestShift._id);
          }
        }
      }
    }

    const assignedShiftIds = Array.isArray(user.shift_ids)
      ? user.shift_ids.map((id) => id?._id || id).filter(Boolean)
      : [];

    if (assignedShiftIds.length > 0) {
      const preferred = assignedShiftIds[0];
      const shift = await Shift.findById(preferred);
      if (shift && shift.status === 'active') return shift;
    }

    if (user.shift_id) {
      const shift = await Shift.findById(user.shift_id);
      if (shift && shift.status === 'active') return shift;
    }

    const shifts = await Shift.find({ company_id: companyId, status: 'active' });

    // Find user teams
    let userTeamIds = [];
    if (user._id) {
        const userTeams = await TeamModel.find({
            "members.userId": user._id,
            isActive: { $ne: false }
        });
        userTeamIds = userTeams.map(t => t._id.toString());
    }

    // 2. Team match
    if (userTeamIds.length > 0) {
      const match = shifts.find(s =>
        s.applicability?.teams?.all === false &&
        s.applicability?.teams?.list?.some(t => userTeamIds.includes(t.toString()))
      );
      if (match) return match;
    }

    // 3. Global fallback (all scopes All=true)
    const fallback = shifts.find(s => (s.applicability?.teams?.all !== false));
    return fallback || null;
  }

  // ───────────────────────────────────────────────────────────
  // Week-Off resolution
  // ───────────────────────────────────────────────────────────

  /**
   * Returns the resolved WeekOffPolicy for a user.
   * @param {Object} user  – Mongoose user document
   * @returns {Promise<Object|null>}
   */
  static async resolveWeekOffPolicy(user, options = {}) {
    const companyId = user.company_id?._id || user.company_id;
    const userTeamIds = await this.getUserTeamIds(user, options.teamIds);
    const policies = await this.getActiveWeekOffPolicies(companyId);

    if (user.weekoff_policy_id) {
      const explicit = policies.find((p) => String(p._id) === String(user.weekoff_policy_id));
      if (explicit) return explicit;

      const policy = await WeekOffPolicy.findById(user.weekoff_policy_id).lean();
      if (policy && policy.status === 'active') return policy;
    }

    // 2. Team match
    if (userTeamIds.length > 0) {
      const match = policies.find(p =>
        !p.applicability.teams?.all &&
        p.applicability.teams?.list?.some(t => userTeamIds.includes(t.toString()))
      );
      if (match) return match;
    }

    // 3. Global fallback (all scopes All=true)
    const fallback = policies.find(p => (p.applicability.teams?.all !== false));
    return fallback || null;
  }

  /**
   * Determines if a given date is a weekly-off for the user.
   * @param {string|Date} date
   * @param {Object|null} weekOffPolicy
   * @returns {{ isOff: boolean, isHalfDay: boolean }}
   */
  static resolveWeeklyOffStatus(date, weekOffPolicy, tz = 'Asia/Kolkata') {
    const d = moment.tz(date, tz);
    const dayOfWeek = d.day(); // 0=Sun … 6=Sat

    if (!weekOffPolicy) {
      // Default fallback
      return { isOff: dayOfWeek === 0, isHalfDay: false };
    }

    const weekOfMonth = Math.ceil(d.date() / 7);
    const dayRule = (weekOffPolicy.day_rules || []).find(r => r.day_index === dayOfWeek);

    if (!dayRule) return { isOff: false, isHalfDay: false };

    // Check rules: priority specific week > all weeks (0)
    const specificRule = dayRule.rules.find(r => r.week_number === weekOfMonth);
    if (specificRule) {
      return {
        isOff: specificRule.off_type !== 'none',
        isHalfDay: specificRule.off_type === 'half_day'
      };
    }

    const allWeeksRule = dayRule.rules.find(r => r.week_number === 0);
    if (allWeeksRule) {
      return {
        isOff: allWeeksRule.off_type !== 'none',
        isHalfDay: allWeeksRule.off_type === 'half_day'
      };
    }

    return { isOff: false, isHalfDay: false };
  }

  // ───────────────────────────────────────────────────────────
  // Holiday resolution
  // ───────────────────────────────────────────────────────────

  /**
   * Returns the resolved HolidayPolicy for a user and year.
   * @param {Object} user
   * @param {number} year  – 4-digit year (default: current year)
   * @returns {Promise<Object|null>}
   */
  static async resolveHolidayPolicy(user, year, options = {}) {
    const targetYear = year || new Date().getFullYear();
    const companyId = user.company_id?._id || user.company_id;
    const deptId = user.department_id?._id || user.department_id;
    const branchId = user.branch_id?._id || user.branch_id;
    const desig = user.designation || '';
    const userTeamIds = await this.getUserTeamIds(user, options.teamIds);
    const policies = await this.getActiveHolidayPolicies(companyId, targetYear);

    // 1. Explicit override
    if (user.holiday_policy_id) {
      const explicit = policies.find((p) => String(p._id) === String(user.holiday_policy_id));
      if (explicit) return explicit;

      const policy = await HolidayPolicy.findById(user.holiday_policy_id).lean();
      if (policy && policy.status === 'active' && policy.year === targetYear) return policy;
    }

    if (userTeamIds.length > 0) {
      const match = policies.find(p =>
        p.applicability?.teams?.all === false &&
        p.applicability?.teams?.list?.some(t => userTeamIds.includes(t.toString()))
      );
      if (match) return match;
    }

    // 3. Designation
    if (desig) {
      const match = policies.find(p =>
        p.applicability?.designations?.all === false && p.applicability?.designations?.list?.includes(desig)
      );
      if (match) return match;
    }

    // 4. Department
    if (deptId) {
      const match = policies.find(p =>
        p.applicability?.departments?.all === false && p.applicability?.departments?.list?.some(d => d.toString() === deptId.toString())
      );
      if (match) return match;
    }

    // 5. Branch
    if (branchId) {
      const match = policies.find(p =>
        p.applicability?.branches?.all === false && p.applicability?.branches?.list?.some(b => b.toString() === branchId.toString())
      );
      if (match) return match;
    }

    // 6. Company-wide fallback (teams.all=true and no other selectors)
    const fallback = policies.find(p =>
      (p.applicability?.teams?.all !== false) &&
      (p.applicability?.designations?.all !== false) && (p.applicability?.departments?.all !== false) && (p.applicability?.branches?.all !== false)
    );
    return fallback || null;
  }

  /**
   * Checks if a date is a holiday for the user.
   * Priority: leave > holiday > weekly_off  (handled by AttendanceEngine)
   *
   * @param {string|Date} date
   * @param {Object|null} holidayPolicy
   * @returns {{ isHoliday: boolean, isOptional: boolean, name: string|null }}
   */
  static resolveHolidayStatus(date, holidayPolicy) {
    if (!holidayPolicy) return { isHoliday: false, isOptional: false, name: null };

    const d = moment(date).format('YYYY-MM-DD');
    const entry = (holidayPolicy.holidays || []).find(h =>
      moment(h.holiday_date).format('YYYY-MM-DD') === d
    );

    if (!entry) return { isHoliday: false, isOptional: false, name: null };

    return {
      isHoliday:  !entry.is_optional,
      isOptional:  !!entry.is_optional,
      name:        entry.holiday_name,
      type:        entry.holiday_type
    };
  }

  /**
   * Convenience: resolve both policies for a user at once.
   * @param {Object} user
   * @param {number} year
   * @returns {Promise<{ weekOffPolicy, holidayPolicy }>}
   */
  static async resolveAll(user, year, options = {}) {
    const teamIds = await this.getUserTeamIds(user, options.teamIds);

    const [weekOffPolicy, holidayPolicy] = await Promise.all([
      this.resolveWeekOffPolicy(user, { ...options, teamIds }),
      this.resolveHolidayPolicy(user, year, { ...options, teamIds })
    ]);
    return { weekOffPolicy, holidayPolicy };
  }

  /**
   * Get all holidays from a policy as a flat list (for dashboard/calendar use).
   * @param {number} companyId
   * @param {number} year
   * @param {Object|null} userContext   - Optional user to get user-specific policy
   * @returns {Promise<Array>}
   */
  static async getHolidayList(companyId, year, userContext = null) {
    let policy = null;
    if (userContext) {
      policy = await this.resolveHolidayPolicy(userContext, year);
    } else {
      // For admin/company-wide view: return all unique holiday entries across active policies for year
      const policies = await HolidayPolicy.find({ company_id: companyId, year, status: 'active' });
      const holidays = [];
      const seen = new Set();
      policies.forEach(p => {
        (p.holidays || []).forEach(h => {
          const key = moment(h.holiday_date).format('YYYY-MM-DD');
          if (!seen.has(key)) {
            seen.add(key);
            holidays.push({ ...h.toObject?.() ?? h, policy_name: p.policy_name, policy_id: p._id });
          }
        });
      });
      return holidays.sort((a, b) => new Date(a.holiday_date) - new Date(b.holiday_date));
    }

    if (!policy) return [];
    return (policy.holidays || [])
      .map(h => ({ ...h.toObject?.() ?? h, policy_name: policy.policy_name, policy_id: policy._id }))
      .sort((a, b) => new Date(a.holiday_date) - new Date(b.holiday_date));
  }
}

export default PolicyResolver;

