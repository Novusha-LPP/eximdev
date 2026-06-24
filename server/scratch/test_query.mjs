import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Company from '../model/attendance/Company.js';
import LeaveApplication from '../model/attendance/LeaveApplication.js';
import UserModel from '../model/userModel.mjs';

dotenv.config({ path: './.env' });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

const LEAVE_STAGE = {
    HOD: 'stage_1_hod',
    SHALINI: 'stage_2_shalini',
    FINAL: 'stage_3_final'
};

const PENDING_STATUSES = ['pending', 'pending_hod', 'pending_shalini', 'pending_final'];

const getActorPendingLeaveQuery = (actor) => {
    const actorId = actor._id?._id || actor._id;
    const actorUsername = String(actor.username || '').toLowerCase();

    return {
        approval_status: { $in: PENDING_STATUSES },
        current_approver_id: actorId,
        employee_id: { $ne: actorId }
    };
};

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB...');

  const ajith = await UserModel.findOne({ username: 'ajith_sivadasan' }).lean();
  console.log('Ajith ID:', ajith._id);

  const rabsCompany = await Company.findOne({ company_name: /RABS Industries India Private Limited/i });
  const rabsCompanyId = rabsCompany?._id;

  const rabsEmployees = await UserModel.find({
      company_id: rabsCompanyId,
      isActive: { $ne: false }
  }).select('_id').lean();
  
  const employeeFilter = { $in: rabsEmployees.map(e => e._id) };

  const leaveQuery = { employee_id: employeeFilter };
  const actorPendingQuery = getActorPendingLeaveQuery(ajith);

  const finalQuery = {
      ...leaveQuery,
      ...actorPendingQuery
  };

  console.log('Final Query:', JSON.stringify(finalQuery, null, 2));

  const count = await LeaveApplication.countDocuments(finalQuery);
  console.log('Count:', count);

  const leaves = await LeaveApplication.find(finalQuery).lean();
  console.log('Leaves found:', leaves);

  process.exit(0);
}

run();
