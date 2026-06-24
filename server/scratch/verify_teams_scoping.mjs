import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../model/userModel.mjs';
import TeamModel from '../model/teamModel.mjs';
import AttendanceRecord from '../model/attendance/AttendanceRecord.js';
import { getRestrictedEmployeeIds } from '../utils/attendance/allowedAdminRestriction.mjs';

// Controllers
import { getUsers, bulkAssignShifts, migrateUser } from '../controllers/attendance/master.controller.js';
import {
  getEmployeeFullProfile,
  getEmployeeMigrationHistory,
  createManualAdjustment,
  updateAttendanceRecord,
  deleteAttendanceRecord
} from '../controllers/attendance/attendance.controller.js';
import { assignPolicyToUser, bulkAssignPoliciesToUsers } from '../controllers/attendance/policy.controller.js';
import { updateBalance } from '../controllers/attendance/leave.controller.js';

dotenv.config({ path: './.env' });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

const mockRes = () => {
  const res = {};
  res.statusCode = 200;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
};

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB...');

    // Find restricted admins
    const ajith = await User.findOne({ username: 'ajith_sivadasan' }).populate('company_id');
    const afzal = await User.findOne({ username: 'afzal_ghanchi' }).populate('company_id');
    const shalini = await User.findOne({ username: 'shalini_arun' }).populate('company_id');

    if (!ajith || !afzal) {
      console.error('Error: ajith_sivadasan or afzal_ghanchi not found in DB. Cannot proceed.');
      process.exit(1);
    }
    if (!shalini) {
      console.warn('Warning: shalini_arun not found in DB. Global check will be skipped.');
    }

    console.log('Admins retrieved.', {
      shalini: shalini ? { username: shalini.username, role: shalini.role, company: shalini.company_id?.company_name } : 'not found'
    });

    // Identify RABS team members
    const rabsTeam = await TeamModel.findOne({
      $or: [
        { hodUsername: 'ajith_sivadasan' },
        { hodUsername: 'afzal_ghanchi' },
        { name: /RABS/i }
      ],
      isActive: { $ne: false }
    });

    if (!rabsTeam) {
      console.error('Error: RABS team not found. Cannot proceed.');
      process.exit(1);
    }

    const restrictedIds = await getRestrictedEmployeeIds(ajith);
    console.log(`Ajith restricted employee count: ${restrictedIds.length}`);

    // Find a RABS member (other than Ajith / Afzal if possible, or just any in restrictedIds)
    const rabsMemberId = restrictedIds.find(id => id !== String(ajith._id) && id !== String(afzal._id)) || restrictedIds[0];
    const rabsMember = await User.findById(rabsMemberId);
    console.log(`Target RABS Member: ${rabsMember ? rabsMember.username : 'None'}`);

    // Find a non-RABS member
    const nonRabsMember = await User.findOne({
      _id: { $nin: restrictedIds.map(id => new mongoose.Types.ObjectId(id)) },
      isActive: true
    });
    console.log(`Target Non-RABS Member: ${nonRabsMember ? nonRabsMember.username : 'None'}`);

    if (!nonRabsMember) {
      console.error('Error: No active non-RABS member found in DB. Cannot run isolation checks.');
      process.exit(1);
    }

    let failedTests = 0;
    let passedTests = 0;

    function assert(condition, message) {
      if (condition) {
        console.log(`[PASS] ${message}`);
        passedTests++;
      } else {
        console.error(`[FAIL] ${message}`);
        failedTests++;
      }
    }

    console.log('\n--- Running Scoping Security Tests ---\n');

    // 1. Test Master Controller: getUsers
    {
      const req = { user: ajith, query: {} };
      const res = mockRes();
      await getUsers(req, res);
      assert(res.statusCode === 200, 'getUsers returns success for restricted admin');
      const usersReturned = res.body?.data || [];
      const nonRabsReturned = usersReturned.some(u => String(u._id) === String(nonRabsMember._id));
      assert(!nonRabsReturned, 'getUsers does NOT return non-RABS members for restricted admin');
      const rabsReturned = usersReturned.some(u => String(u._id) === String(rabsMember._id));
      assert(rabsReturned, 'getUsers returns RABS members for restricted admin');
    }

    // 2. Test Master Controller: bulkAssignShifts
    {
      // Assigning to a non-RABS member should fail
      const req = { user: ajith, body: { employeeIds: [String(nonRabsMember._id)], shiftId: String(new mongoose.Types.ObjectId()) } };
      const res = mockRes();
      await bulkAssignShifts(req, res);
      assert(res.statusCode === 403, `bulkAssignShifts to non-RABS member is Forbidden (403), got status: ${res.statusCode}`);
    }

    // 3. Test Master Controller: migrateUser
    {
      // Migrating non-RABS member should fail
      const req = { user: ajith, body: { userId: String(nonRabsMember._id), targetCompanyId: String(new mongoose.Types.ObjectId()), action: 'active' } };
      const res = mockRes();
      await migrateUser(req, res);
      assert(res.statusCode === 403, `migrateUser of non-RABS member is Forbidden (403), got status: ${res.statusCode}`);
    }

    // 4. Test Attendance Controller: getEmployeeFullProfile
    {
      // RABS member should succeed
      const reqRabs = { user: ajith, params: { id: String(rabsMember._id) }, query: {} };
      const resRabs = mockRes();
      await getEmployeeFullProfile(reqRabs, resRabs);
      assert(resRabs.statusCode === 200 || resRabs.statusCode === 404, `getEmployeeFullProfile for RABS member returns ${resRabs.statusCode} (expected success/404, not 403)`);

      // Non-RABS member should fail
      const reqNonRabs = { user: ajith, params: { id: String(nonRabsMember._id) }, query: {} };
      const resNonRabs = mockRes();
      await getEmployeeFullProfile(reqNonRabs, resNonRabs);
      assert(resNonRabs.statusCode === 403, 'getEmployeeFullProfile for non-RABS member is Forbidden (403)');
    }

    // 5. Test Attendance Controller: getEmployeeMigrationHistory
    {
      // RABS member should succeed/not 403
      const reqRabs = { user: ajith, params: { id: String(rabsMember._id) } };
      const resRabs = mockRes();
      await getEmployeeMigrationHistory(reqRabs, resRabs);
      assert(resRabs.statusCode !== 403, 'getEmployeeMigrationHistory for RABS member does not return 403');

      // Non-RABS member should fail
      const reqNonRabs = { user: ajith, params: { id: String(nonRabsMember._id) } };
      const resNonRabs = mockRes();
      await getEmployeeMigrationHistory(reqNonRabs, resNonRabs);
      assert(resNonRabs.statusCode === 403, 'getEmployeeMigrationHistory for non-RABS member is Forbidden (403)');
    }

    // 6. Test Attendance Controller: createManualAdjustment
    {
      // Non-RABS member should fail
      const req = {
        user: ajith,
        body: {
          employee_id: String(nonRabsMember._id),
          attendance_date: '2026-06-16',
          status: 'present'
        }
      };
      const res = mockRes();
      await createManualAdjustment(req, res);
      assert(res.statusCode === 403, 'createManualAdjustment for non-RABS member is Forbidden (403)');
    }

    // 7. Test Attendance Controller: updateAttendanceRecord
    {
      // Non-RABS member should fail
      const req = {
        user: ajith,
        body: {
          employee_id: String(nonRabsMember._id),
          status: 'present'
        },
        params: {
          id: String(new mongoose.Types.ObjectId())
        }
      };
      const res = mockRes();
      await updateAttendanceRecord(req, res);
      assert(res.statusCode === 403, 'updateAttendanceRecord for non-RABS member is Forbidden (403)');
    }

    // 8. Test Attendance Controller: deleteAttendanceRecord
    {
      // Let's find or create a dummy record for non-RABS user to test deletion scoping
      let dummyRecord = await AttendanceRecord.findOne({ employee_id: nonRabsMember._id });
      if (!dummyRecord) {
        dummyRecord = new AttendanceRecord({
          company_id: nonRabsMember.company_id?._id || nonRabsMember.company_id,
          employee_id: nonRabsMember._id,
          attendance_date: new Date('2026-06-15'),
          status: 'absent'
        });
        await dummyRecord.save();
      }

      const req = {
        user: ajith,
        params: { id: String(dummyRecord._id) }
      };
      const res = mockRes();
      await deleteAttendanceRecord(req, res);
      assert(res.statusCode === 403, 'deleteAttendanceRecord for non-RABS member is Forbidden (403)');
    }

    // 9. Test Policy Controller: assignPolicyToUser
    {
      const req = {
        user: ajith,
        params: { userId: String(nonRabsMember._id) },
        body: { weekoff_policy_id: String(new mongoose.Types.ObjectId()) }
      };
      const res = mockRes();
      await assignPolicyToUser(req, res);
      assert(res.statusCode === 403, 'assignPolicyToUser for non-RABS member is Forbidden (403)');
    }

    // 10. Test Policy Controller: bulkAssignPoliciesToUsers
    {
      const req = {
        user: ajith,
        body: {
          user_ids: [String(rabsMember._id), String(nonRabsMember._id)],
          weekoff_policy_id: String(new mongoose.Types.ObjectId())
        }
      };
      const res = mockRes();
      await bulkAssignPoliciesToUsers(req, res);
      assert(res.statusCode === 403, 'bulkAssignPoliciesToUsers containing a non-RABS member is Forbidden (403)');
    }

    // 11. Test Leave Controller: updateBalance
    {
      const req = {
        user: ajith,
        params: { employee_id: String(nonRabsMember._id) },
        body: {
          leave_policy_id: String(new mongoose.Types.ObjectId()),
          opening_balance: 15
        }
      };
      const res = mockRes();
      await updateBalance(req, res);
      assert(res.statusCode === 403, 'updateBalance for non-RABS member is Forbidden (403)');
    }

    // 12. Test Global Admin (Shalini) Bypass Checks
    if (shalini) {
      console.log('\n--- Running Global Admin Bypass Checks (Shalini) ---\n');

      // getUsers check
      const reqUsers = { user: shalini, query: { all_companies: 'true' } };
      const resUsers = mockRes();
      await getUsers(reqUsers, resUsers);
      const returnedNonRabs = (resUsers.body?.data || []).some(u => String(u._id) === String(nonRabsMember._id));
      assert(returnedNonRabs, 'getUsers returns non-RABS members for global admin');

      // getEmployeeFullProfile check (should not be 403)
      const reqProfile = { user: shalini, params: { id: String(nonRabsMember._id) }, query: {} };
      const resProfile = mockRes();
      await getEmployeeFullProfile(reqProfile, resProfile);
      assert(resProfile.statusCode !== 403, 'getEmployeeFullProfile for non-RABS member is NOT 403 for global admin');
    }

    console.log(`\nVerification Finished: ${passedTests} passed, ${failedTests} failed.`);
    if (failedTests > 0) {
      console.error('Some scoping tests failed!');
      process.exit(1);
    } else {
      console.log('All scoping security tests passed successfully!');
      process.exit(0);
    }

  } catch (err) {
    console.error('Error during execution:', err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

run();
