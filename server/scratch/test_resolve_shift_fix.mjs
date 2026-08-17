import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import moment from 'moment-timezone';

dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

// Register models
import User from '../model/userModel.mjs';
import Shift from '../model/attendance/Shift.js';
import Company from '../model/attendance/Company.js';

// Implement the resolver with the fix
async function resolveShiftFixed(user, date = null, referenceTime = null) {
    const companyId = user.company_id?._id || user.company_id;
    if (!companyId) return null;

    let isRabs = false;
    let autoShiftEnabled = false;
    const CompanyModel = mongoose.model('Company');
    const company = await CompanyModel.findById(companyId).lean();

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
      // Fix 1: For non-RABS users, only resolve dynamically if they do NOT have an explicitly assigned shift
      const hasAssignedShift = user.shift_id || (Array.isArray(user.shift_ids) && user.shift_ids.filter(Boolean).length > 0);
      if (!hasAssignedShift) {
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
    }

    if (resolveDynamically) {
      console.log(`[AutoShiftDetection] Executing shift resolution for user: ${user.username}. Auto Shift Detection flag: ${autoShiftEnabled}`);
    } else {
      console.log(`[AutoShiftDetection] Skipping shift resolution for user: ${user.username} (Using standard assigned shift logic).`);
    }

    if (resolveDynamically) {
      const activeShifts = await Shift.find({ company_id: companyId, status: 'active' }).lean();
      
      // Fix 2: Ensure the user's assigned shift(s) are also considered as candidates if active
      const assignedShiftIds = [];
      if (user.shift_id) assignedShiftIds.push(user.shift_id.toString());
      if (Array.isArray(user.shift_ids)) {
        user.shift_ids.forEach(id => {
          if (id) assignedShiftIds.push((id._id || id).toString());
        });
      }
      
      for (const sId of assignedShiftIds) {
        if (!activeShifts.some(s => s._id.toString() === sId)) {
          const sObj = await Shift.findById(sId).lean();
          if (sObj && sObj.status === 'active') {
            activeShifts.push(sObj);
          }
        }
      }

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
          }

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

    let userTeamIds = [];
    if (user._id) {
        const TeamModel = mongoose.model('Team');
        const userTeams = await TeamModel.find({
            "members.userId": user._id,
            isActive: { $ne: false }
        });
        userTeamIds = userTeams.map(t => t._id.toString());
    }

    if (userTeamIds.length > 0) {
      const match = shifts.find(s =>
        s.applicability?.teams?.all === false &&
        s.applicability?.teams?.list?.some(t => userTeamIds.includes(t.toString()))
      );
      if (match) return match;
    }

    const fallback = shifts.find(s => (s.applicability?.teams?.all !== false));
    return fallback || null;
}

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB...');

    const user = await User.findOne({ username: 'ajay_singh' }).lean();
    if (!user) {
      console.error('User ajay_singh not found');
      process.exit(1);
    }

    const tz = 'Asia/Kolkata';
    const nowTime = moment.tz('2026-08-14 19:00', 'YYYY-MM-DD HH:mm', tz).toDate();
    const shiftDate = '2026-08-14';

    console.log(`\nResolving shift using FIXED logic for ${user.username} at 19:00...`);
    const resolvedShift = await resolveShiftFixed(user, shiftDate, nowTime);

    if (resolvedShift) {
      console.log('Resolved Shift:');
      console.log(` - ID: ${resolvedShift._id}`);
      console.log(` - Name: ${resolvedShift.shift_name}`);
      console.log(` - Start Time: ${resolvedShift.start_time}`);
      console.log(` - End Time: ${resolvedShift.end_time}`);
      console.log(` - Cross Day: ${resolvedShift.is_cross_day}`);
    } else {
      console.log('No shift resolved.');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
