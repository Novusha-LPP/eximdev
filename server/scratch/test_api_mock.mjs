import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from '../model/userModel.mjs';
import * as attendanceCtrl from '../controllers/attendance/attendance.controller.js';
import * as hodCtrl from '../controllers/attendance/HOD.controller.js';

dotenv.config({ path: './.env' });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

function createMockResponse() {
  return {
    statusVal: 200,
    jsonVal: null,
    status(code) {
      this.statusVal = code;
      return this;
    },
    json(data) {
      this.jsonVal = data;
      return this;
    }
  };
}

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB...');

    const afzal = await UserModel.findOne({ username: 'afzal_ghanchi' }).lean();
    const ajith = await UserModel.findOne({ username: 'ajith_sivadasan' }).lean();
    const umang = await UserModel.findOne({ username: 'umangsingh_rajput' }).lean();

    console.log('\n--- 1. Testing HOD Dashboard for Afzal Ghanchi ---');
    const reqAfzalDb = {
      user: {
        _id: afzal._id,
        username: afzal.username,
        role: afzal.role,
        company_id: afzal.company_id,
        isAttendanceAllowedAdmin: afzal.isAttendanceAllowedAdmin
      },
      query: {
        date: '2026-08-24'
      }
    };
    const resAfzalDb = createMockResponse();
    await hodCtrl.getDashboard(reqAfzalDb, resAfzalDb);
    
    console.log('Status:', resAfzalDb.statusVal);
    if (resAfzalDb.jsonVal && resAfzalDb.jsonVal.data) {
      const empList = resAfzalDb.jsonVal.data.teamCalendar || [];
      console.log(`HOD Dashboard loaded ${empList.length} employees for Afzal.`);
      const umangFound = empList.find(e => e.id?.toString() === umang._id.toString());
      console.log(`Is Umang visible under Afzal Ghanchi?`, !!umangFound);
    } else {
      console.log('Error/Response:', resAfzalDb.jsonVal);
    }

    console.log('\n--- 2. Testing Employee Full Profile for Ajith Sivadasan ---');
    const reqAjithProf = {
      user: {
        _id: ajith._id,
        username: ajith.username,
        role: ajith.role,
        company_id: ajith.company_id,
        isAttendanceAllowedAdmin: ajith.isAttendanceAllowedAdmin
      },
      params: {
        id: umang._id.toString()
      },
      query: {
        startDate: '2026-08-01',
        endDate: '2026-08-31'
      }
    };
    const resAjithProf = createMockResponse();
    await attendanceCtrl.getEmployeeFullProfile(reqAjithProf, resAjithProf);

    console.log('Status:', resAjithProf.statusVal);
    if (resAjithProf.statusVal === 200) {
      console.log('Successfully fetched full profile for Umang!');
      console.log('Attendance Records Count:', resAjithProf.jsonVal?.attendance?.length);
    } else {
      console.log('Error:', resAjithProf.jsonVal);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
