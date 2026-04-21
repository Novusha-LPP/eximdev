import dotenv from 'dotenv';
import mongoose from 'mongoose';

import User from '../model/userModel.mjs';
import LeaveApplication from '../model/attendance/LeaveApplication.js';

dotenv.config();

const resolveMongoUri = () => {
  return (
    process.env.DEV_MONGODB_URI ||
    process.env.SERVER_MONGODB_URI ||
    process.env.PROD_MONGODB_URI ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb://localhost:27017/exim'
  );
};

const getArg = (name) => {
  const key = `--${name}`;
  const index = process.argv.indexOf(key);
  if (index === -1) return undefined;
  return process.argv[index + 1];
};

const hasFlag = (name) => process.argv.includes(`--${name}`);

const STAGE_2_APPROVER_USERNAME = 'shalini_arun';
const LEAVE_STAGE = {
  HOD: 'stage_1_hod',
  SHALINI: 'stage_2_shalini',
  FINAL: 'stage_3_final'
};

const toIdString = (value) => {
  if (!value) return '';
  const candidate = value?._id || value;
  try {
    return candidate.toString();
  } catch {
    return String(candidate);
  }
};

const getShaliniApprover = async (companyId) => {
  const companyScoped = await User.findOne({
    username: STAGE_2_APPROVER_USERNAME,
    company_id: companyId,
    isActive: true
  }).select('_id username role');

  if (companyScoped) return companyScoped;

  return User.findOne({
    username: STAGE_2_APPROVER_USERNAME,
    isActive: true
  }).select('_id username role');
};

const rebuildApprovalChainForShaliniRouting = (application, shaliniId) => {
  const existingChain = Array.isArray(application.approval_chain) ? application.approval_chain : [];
  const finalApproverGroup = 'Final approver group: manu_pillai, suraj_rajan, rajan_aranamkatte';

  const hodStage = existingChain.find((entry) => entry?.stage === LEAVE_STAGE.HOD) || {
    level: 1,
    stage: LEAVE_STAGE.HOD,
    approver_role: 'HOD'
  };

  const shaliniStage = existingChain.find((entry) => entry?.stage === LEAVE_STAGE.SHALINI) || {
    level: 2,
    stage: LEAVE_STAGE.SHALINI,
    approver_username: STAGE_2_APPROVER_USERNAME,
    approver_role: 'ADMIN'
  };

  const finalStage = existingChain.find((entry) => entry?.stage === LEAVE_STAGE.FINAL) || {
    level: 3,
    stage: LEAVE_STAGE.FINAL,
    approver_role: 'ADMIN'
  };

  application.approval_chain = [
    {
      ...hodStage,
      level: 1,
      stage: LEAVE_STAGE.HOD,
      action: 'approved',
      action_date: hodStage.action_date || new Date(),
      comments: 'Stage skipped for HOD/admin requester',
      approver_id: hodStage.approver_id || application.employee_id,
      approver_role: hodStage.approver_role || 'HOD'
    },
    {
      ...shaliniStage,
      level: 2,
      stage: LEAVE_STAGE.SHALINI,
      action: 'pending',
      action_date: undefined,
      comments: undefined,
      approver_id: shaliniId,
      approver_username: STAGE_2_APPROVER_USERNAME,
      approver_role: 'ADMIN'
    },
    {
      ...finalStage,
      level: 3,
      stage: LEAVE_STAGE.FINAL,
      action: 'pending',
      action_date: undefined,
      comments: finalStage.comments || finalApproverGroup,
      approver_role: 'ADMIN'
    }
  ];
};

const main = async () => {
  const dryRun = hasFlag('dry-run');
  const username = getArg('username');
  const leaveId = getArg('leave-id');

  console.log('Special HOD self-leave migration');
  console.log(`Mode: ${dryRun ? 'dry-run' : 'apply'}`);

  await mongoose.connect(resolveMongoUri(), { serverSelectionTimeoutMS: 5000 });

  const query = {
    $or: [
      { approval_status: 'pending_hod' },
      { approval_stage: LEAVE_STAGE.HOD, approval_status: 'pending' }
    ],
    $expr: { $eq: ['$employee_id', '$current_approver_id'] }
  };

  if (leaveId) {
    query._id = new mongoose.Types.ObjectId(leaveId);
  }

  const applications = await LeaveApplication.find(query)
    .populate('employee_id', 'username first_name last_name role')
    .populate('current_approver_id', 'username first_name last_name role')
    ;

  const scopedApplications = username
    ? applications.filter((application) => String(application.employee_id?.username || '').toLowerCase() === username.toLowerCase())
    : applications;

  if (!scopedApplications.length) {
    console.log('No matching self-owned HOD leave records found.');
    await mongoose.disconnect();
    process.exit(0);
  }

  let updatedCount = 0;

  for (const application of scopedApplications) {
    const companyId = application.company_id;
    const shaliniUser = await getShaliniApprover(companyId);

    if (!shaliniUser) {
      console.log(`Skipping ${application._id}: Shalini Arun not found for company ${companyId}`);
      continue;
    }

    console.log(`\nLeave: ${application._id}`);
    console.log(`Employee: ${application.employee_id?.username || application.employee_id}`);
    console.log(`Current status: ${application.approval_status}`);
    console.log(`Current stage: ${application.approval_stage}`);
    console.log(`Current approver: ${application.current_approver_id?.username || application.current_approver_id}`);
    console.log(`New approver: ${shaliniUser.username}`);

    if (!dryRun) {
      application.approval_status = 'pending';
      application.approval_stage = LEAVE_STAGE.SHALINI;
      application.current_approver_id = shaliniUser._id;
      application.hod_reviewed_by = undefined;
      application.hod_reviewed_at = undefined;
      application.hod_review_comment = undefined;
      application.final_reviewed_by = undefined;
      application.final_reviewed_at = undefined;
      application.final_review_comment = undefined;
      application.rejected_by = undefined;
      application.rejected_at = undefined;
      application.rejection_reason = undefined;
      rebuildApprovalChainForShaliniRouting(application, shaliniUser._id);
      await application.save();
    }

    updatedCount += 1;
    console.log(dryRun ? 'Dry-run only, no changes saved.' : 'Updated successfully.');
  }

  console.log(`\nMatched records: ${scopedApplications.length}`);
  console.log(`Processed records: ${updatedCount}`);

  await mongoose.disconnect();
  process.exit(0);
};

main().catch(async (error) => {
  console.error('Migration failed:', error);
  await mongoose.disconnect();
  process.exit(1);
});
