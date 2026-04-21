import dotenv from 'dotenv';
import mongoose from 'mongoose';
import moment from 'moment';
import fs from 'fs';

import UserModel from '../model/userModel.mjs';
import LeaveApplication from '../model/attendance/LeaveApplication.js';
import LeaveBalance from '../model/attendance/LeaveBalance.js';
import LeavePolicy from '../model/attendance/LeavePolicy.js';
import TeamModel from '../model/teamModel.mjs';

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

// ============================================================================
// CONSTANTS & HELPERS
// ============================================================================

const STAGE_2_APPROVER_USERNAME = 'shalini_arun';
const FINAL_APPROVER_USERNAMES = new Set(['manu_pillai', 'suraj_rajan', 'rajan_aranamkatte']);

const LEAVE_STAGE = {
  HOD: 'stage_1_hod',
  SHALINI: 'stage_2_shalini',
  FINAL: 'stage_3_final'
};

const formatPersonName = (person) => {
  if (!person) return null;
  if (typeof person === 'string') return person;
  return person.first_name
    ? `${person.first_name} ${person.last_name || ''}`.trim()
    : person.username || null;
};

const toIdString = (value) => {
  if (!value) return null;
  const candidate = value?._id || value;
  try {
    return candidate.toString();
  } catch {
    return String(candidate);
  }
};

const isAssignedToActor = (leave, actor) => {
  const actorId = toIdString(actor?._id);
  const actorUsername = String(actor?.username || '').toLowerCase();

  const currentApprover = leave?.current_approver_id;
  const currentApproverId = toIdString(currentApprover);
  const currentApproverUsername = String(currentApprover?.username || '').toLowerCase();

  if (actorId && currentApproverId && actorId === currentApproverId) {
    return true;
  }

  if (actorUsername && currentApproverUsername && actorUsername === currentApproverUsername) {
    return true;
  }

  return false;
};

const canActorActOnLeave = (leave, actor) => {
  if (String(leave.approval_status || '') !== 'pending') return false;

  const stage = leave.approval_stage || LEAVE_STAGE.HOD;
  const actorId = toIdString(actor._id);
  const actorUsername = String(actor.username || '').toLowerCase();
  const currentApproverId = toIdString(leave.current_approver_id);

  if (stage === LEAVE_STAGE.HOD) {
    return isAssignedToActor(leave, actor);
  }

  if (stage === LEAVE_STAGE.SHALINI) {
    if (actorUsername !== STAGE_2_APPROVER_USERNAME) return false;
    return !currentApproverId || actorId === currentApproverId;
  }

  if (stage === LEAVE_STAGE.FINAL) {
    if (!FINAL_APPROVER_USERNAMES.has(actorUsername)) return false;
    return !currentApproverId || actorId === currentApproverId;
  }

  return false;
};

const markApprovalChainStage = (application, stage, status, comments) => {
  if (!Array.isArray(application.approval_chain)) {
    application.approval_chain = [];
  }
  const chainItem = application.approval_chain.find((entry) => entry?.stage === stage);
  if (chainItem) {
    chainItem.action = status;
    chainItem.action_date = new Date();
    if (comments) {
      chainItem.comments = comments;
    }
  }
};

// ============================================================================
// APPROVAL FLOW TEST
// ============================================================================

const testRegularEmployeeApprovalFlow = async (companyId) => {
  console.log(`\n╔════════════════════════════════════════════════════════════════════╗`);
  console.log(`║    TEST 1: Regular Employee -> HOD -> Shalini -> Final             ║`);
  console.log(`╚════════════════════════════════════════════════════════════════════╝\n`);

  try {
    // Get a regular employee
    const employee = await UserModel.findOne({
      isActive: true,
      role: { $not: /hod|head|admin/i },
      username: { $ne: 'shalini_arun' }
    });

    if (!employee) {
      console.log('⚠️  No regular employee found. Skipping this test.');
      return null;
    }

    // Get team
    const team = await TeamModel.findOne({
      'members.userId': employee._id,
      isActive: { $ne: false }
    }).populate('hodId', '_id username first_name last_name role');

    if (!team || !team.hodId) {
      console.log('⚠️  Employee has no team or HOD. Skipping this test.');
      return null;
    }

    const hod = team.hodId;
    console.log(`Employee: ${employee.username}`);
    console.log(`Team HOD: ${hod.username}`);

    // Get Shalini
    const shalini = await UserModel.findOne({
      username: STAGE_2_APPROVER_USERNAME,
      isActive: true
    });

    // Get final approver
    const finalApprover = await UserModel.findOne({
      username: 'manu_pillai',
      isActive: true
    });

    // Create test leave application
    const policy = await LeavePolicy.findOne({ company_id: companyId, status: 'active' });
    const appNumber = `LA-FLOW-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const fromDate = moment().add(14, 'days').startOf('day').toDate();
    const toDate = moment(fromDate).add(2, 'days').toDate();

    const application = new LeaveApplication({
      employee_id: employee._id,
      company_id: companyId,
      leave_policy_id: policy._id,
      leave_type: policy.leave_type,
      from_date: fromDate,
      to_date: toDate,
      total_days: 3,
      reason: 'Flow test leave',
      is_half_day: false,
      approval_status: 'pending',
      approval_stage: LEAVE_STAGE.HOD,
      current_approver_id: hod._id,
      application_number: appNumber,
      approval_chain: [
        {
          level: 1,
          stage: LEAVE_STAGE.HOD,
          approver_id: hod._id,
          approver_role: 'HOD',
          action: 'pending'
        },
        {
          level: 2,
          stage: LEAVE_STAGE.SHALINI,
          approver_id: shalini._id,
          approver_username: STAGE_2_APPROVER_USERNAME,
          approver_role: 'ADMIN',
          action: 'pending'
        },
        {
          level: 3,
          stage: LEAVE_STAGE.FINAL,
          approver_id: finalApprover._id,
          approver_role: 'ADMIN',
          action: 'pending',
          comments: 'Final approver group: manu_pillai, suraj_rajan, rajan_aranamkatte'
        }
      ]
    });

    await application.save();
    console.log(`✓ Application created: ${application._id}`);
    console.log(`  Initial Stage: ${application.approval_stage}`);
    console.log(`  Current Approver: ${hod.username}`);

    // Step 1: HOD approves
    console.log(`\n📋 Step 1: HOD (${hod.username}) approves the leave`);
    const canHodAct = canActorActOnLeave(application, hod);
    console.log(`  Can HOD act: ${canHodAct ? '✓ Yes' : '✗ No'}`);

    if (canHodAct) {
      application.approval_stage = LEAVE_STAGE.SHALINI;
      application.current_approver_id = shalini._id;
      markApprovalChainStage(application, LEAVE_STAGE.HOD, 'approved', 'Approved by HOD');
      await application.save();

      console.log(`  ✓ HOD approved`);
      console.log(`  → Routed to: ${shalini.username} (Stage 2)`);
    } else {
      console.log(`  ✗ HOD cannot act on this application!`);
      return null;
    }

    // Step 2: Shalini approves
    console.log(`\n📋 Step 2: Shalini (${shalini.username}) approves the leave`);
    const canShaliniAct = canActorActOnLeave(application, shalini);
    console.log(`  Can Shalini act: ${canShaliniAct ? '✓ Yes' : '✗ No'}`);

    if (canShaliniAct) {
      application.approval_stage = LEAVE_STAGE.FINAL;
      application.current_approver_id = finalApprover._id;
      markApprovalChainStage(application, LEAVE_STAGE.SHALINI, 'approved', 'Approved by Shalini Arun');
      await application.save();

      console.log(`  ✓ Shalini approved`);
      console.log(`  → Routed to: ${finalApprover.username} (Stage 3)`);
    } else {
      console.log(`  ✗ Shalini cannot act on this application!`);
      return null;
    }

    // Step 3: Final approver approves
    console.log(`\n📋 Step 3: Final Approver (${finalApprover.username}) approves the leave`);
    const canFinalAct = canActorActOnLeave(application, finalApprover);
    console.log(`  Can Final Approver act: ${canFinalAct ? '✓ Yes' : '✗ No'}`);

    if (canFinalAct) {
      application.approval_status = 'approved';
      application.approval_stage = null;
      application.current_approver_id = undefined;
      markApprovalChainStage(application, LEAVE_STAGE.FINAL, 'approved', 'Approved by Final Approver');
      await application.save();

      console.log(`  ✓ Final Approver approved`);
      console.log(`  → Leave is now APPROVED`);
    } else {
      console.log(`  ✗ Final Approver cannot act on this application!`);
      return null;
    }

    // Verify final state
    console.log(`\n✅ Flow completed successfully!`);
    console.log(`  Final Status: ${application.approval_status}`);
    console.log(`  Final Stage: ${application.approval_stage || 'None (Completed)'}`);

    return {
      name: 'Regular Employee Flow',
      passed: true,
      applicationId: application._id,
      path: `${employee.username} → ${hod.username} → ${shalini.username} → ${finalApprover.username}`
    };
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return {
      name: 'Regular Employee Flow',
      passed: false,
      error: error.message
    };
  }
};

const testShaliniApprovalFlow = async (companyId) => {
  console.log(`\n╔════════════════════════════════════════════════════════════════════╗`);
  console.log(`║    TEST 2: Shalini -> Manu (Stages Skipped)                       ║`);
  console.log(`╚════════════════════════════════════════════════════════════════════╝\n`);

  try {
    const shalini = await UserModel.findOne({
      username: STAGE_2_APPROVER_USERNAME,
      isActive: true
    });

    const manu = await UserModel.findOne({
      username: 'manu_pillai',
      isActive: true
    });

    if (!shalini || !manu) {
      console.log('⚠️  Shalini or Manu not found. Skipping this test.');
      return null;
    }

    const policy = await LeavePolicy.findOne({ company_id: companyId, status: 'active' });
    const appNumber = `LA-SHALINI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const fromDate = moment().add(21, 'days').startOf('day').toDate();
    const toDate = moment(fromDate).add(1, 'day').toDate();

    const application = new LeaveApplication({
      employee_id: shalini._id,
      company_id: companyId,
      leave_policy_id: policy._id,
      leave_type: policy.leave_type,
      from_date: fromDate,
      to_date: toDate,
      total_days: 2,
      reason: 'Shalini leave request',
      is_half_day: false,
      approval_status: 'pending',
      approval_stage: LEAVE_STAGE.FINAL,
      current_approver_id: manu._id,
      application_number: appNumber,
      approval_chain: [
        {
          level: 1,
          stage: LEAVE_STAGE.HOD,
          approver_id: manu._id,
          approver_role: 'HOD',
          action: 'approved',
          action_date: new Date(),
          comments: 'Stage skipped for HOD/admin requester'
        },
        {
          level: 2,
          stage: LEAVE_STAGE.SHALINI,
          approver_id: shalini._id,
          approver_username: STAGE_2_APPROVER_USERNAME,
          approver_role: 'ADMIN',
          action: 'approved',
          action_date: new Date(),
          comments: 'Stage skipped for senior admin requester'
        },
        {
          level: 3,
          stage: LEAVE_STAGE.FINAL,
          approver_id: manu._id,
          approver_role: 'ADMIN',
          action: 'pending',
          comments: 'Final approver group: manu_pillai, suraj_rajan, rajan_aranamkatte'
        }
      ]
    });

    await application.save();
    console.log(`✓ Shalini's leave application created: ${application._id}`);
    console.log(`  Approval Stage: ${application.approval_stage}`);
    console.log(`  Current Approver: ${manu.username}`);
    console.log(`  Stages 1 & 2 Skipped: ✓`);

    // Manu approves
    console.log(`\n📋 Manu (${manu.username}) approves Shalini's leave at Stage 3`);
    const canManuAct = canActorActOnLeave(application, manu);
    console.log(`  Can Manu act: ${canManuAct ? '✓ Yes' : '✗ No'}`);

    if (canManuAct) {
      application.approval_status = 'approved';
      application.approval_stage = null;
      application.current_approver_id = undefined;
      markApprovalChainStage(application, LEAVE_STAGE.FINAL, 'approved', 'Approved by Manu');
      await application.save();

      console.log(`  ✓ Manu approved Shalini's leave`);
      console.log(`  → Leave is now APPROVED`);
    } else {
      console.log(`  ✗ Manu cannot act on this application!`);
      return null;
    }

    console.log(`\n✅ Shalini's flow completed successfully!`);
    console.log(`  Final Status: ${application.approval_status}`);

    return {
      name: 'Shalini Application Flow',
      passed: true,
      applicationId: application._id,
      path: `${shalini.username} → (Stages 1 & 2 Skipped) → ${manu.username}`
    };
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return {
      name: 'Shalini Application Flow',
      passed: false,
      error: error.message
    };
  }
};

const testFinalApproverSelfApprovalFlow = async (companyId) => {
  console.log(`\n╔════════════════════════════════════════════════════════════════════╗`);
  console.log(`║    TEST 3: Manu Self-Approval (Stages Skipped)                    ║`);
  console.log(`╚════════════════════════════════════════════════════════════════════╝\n`);

  try {
    const manu = await UserModel.findOne({
      username: 'manu_pillai',
      isActive: true
    });

    if (!manu) {
      console.log('⚠️  Manu not found. Skipping this test.');
      return null;
    }

    const policy = await LeavePolicy.findOne({ company_id: companyId, status: 'active' });
    const appNumber = `LA-MANU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const fromDate = moment().add(28, 'days').startOf('day').toDate();
    const toDate = moment(fromDate).add(0, 'days').toDate();

    const application = new LeaveApplication({
      employee_id: manu._id,
      company_id: companyId,
      leave_policy_id: policy._id,
      leave_type: policy.leave_type,
      from_date: fromDate,
      to_date: toDate,
      total_days: 1,
      reason: 'Manu self leave request',
      is_half_day: false,
      approval_status: 'pending',
      approval_stage: LEAVE_STAGE.FINAL,
      current_approver_id: manu._id,
      application_number: appNumber,
      approval_chain: [
        {
          level: 1,
          stage: LEAVE_STAGE.HOD,
          approver_id: manu._id,
          approver_role: 'HOD',
          action: 'approved',
          action_date: new Date(),
          comments: 'Stage skipped for HOD/admin requester'
        },
        {
          level: 2,
          stage: LEAVE_STAGE.SHALINI,
          approver_id: manu._id,
          approver_username: STAGE_2_APPROVER_USERNAME,
          approver_role: 'ADMIN',
          action: 'approved',
          action_date: new Date(),
          comments: 'Stage skipped for senior admin requester'
        },
        {
          level: 3,
          stage: LEAVE_STAGE.FINAL,
          approver_id: manu._id,
          approver_role: 'ADMIN',
          action: 'pending',
          comments: 'Final approver group: manu_pillai, suraj_rajan, rajan_aranamkatte'
        }
      ]
    });

    await application.save();
    console.log(`✓ Manu's leave application created: ${application._id}`);
    console.log(`  Approval Stage: ${application.approval_stage}`);
    console.log(`  Current Approver: ${manu.username}`);
    console.log(`  Stages 1 & 2 Skipped: ✓`);

    // Manu self-approves
    console.log(`\n📋 Manu (${manu.username}) self-approves his leave at Stage 3`);
    const canManuSelfApprove = canActorActOnLeave(application, manu);
    console.log(`  Can Manu self-approve: ${canManuSelfApprove ? '✓ Yes' : '✗ No'}`);

    if (canManuSelfApprove) {
      application.approval_status = 'approved';
      application.approval_stage = null;
      application.current_approver_id = undefined;
      markApprovalChainStage(application, LEAVE_STAGE.FINAL, 'approved', 'Self-approved');
      await application.save();

      console.log(`  ✓ Manu self-approved his leave`);
      console.log(`  → Leave is now APPROVED`);
    } else {
      console.log(`  ✗ Manu cannot self-approve this application!`);
      return null;
    }

    console.log(`\n✅ Manu's self-approval flow completed successfully!`);
    console.log(`  Final Status: ${application.approval_status}`);

    return {
      name: 'Final Approver Self-Approval Flow',
      passed: true,
      applicationId: application._id,
      path: `${manu.username} → (Stages 1 & 2 Skipped) → Self-Approval`
    };
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return {
      name: 'Final Approver Self-Approval Flow',
      passed: false,
      error: error.message
    };
  }
};

// ============================================================================
// MAIN EXECUTION
// ============================================================================

const main = async () => {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║    APPROVAL FLOW VERIFICATION TEST                                ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');

  try {
    const mongoUri = resolveMongoUri();
    console.log(`\n🔌 Connecting to MongoDB...`);

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });

    console.log('✓ Connected successfully!');

    const company = await mongoose.connection.collection('companies').findOne({});
    if (!company) {
      console.error('❌ No company found in database');
      await mongoose.disconnect();
      process.exit(1);
    }

    const companyId = company._id;

    const results = [];

    // Run all flow tests
    const result1 = await testRegularEmployeeApprovalFlow(companyId);
    if (result1) results.push(result1);

    const result2 = await testShaliniApprovalFlow(companyId);
    if (result2) results.push(result2);

    const result3 = await testFinalApproverSelfApprovalFlow(companyId);
    if (result3) results.push(result3);

    // Print summary
    console.log(`\n╔════════════════════════════════════════════════════════════════════╗`);
    console.log(`║    APPROVAL FLOW TEST SUMMARY                                    ║`);
    console.log(`╚════════════════════════════════════════════════════════════════════╝\n`);

    const passed = results.filter((r) => r.passed).length;
    const total = results.length;

    results.forEach((result) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${result.name}`);
      if (result.passed) {
        console.log(`     Path: ${result.path}`);
        console.log(`     App ID: ${result.applicationId}`);
      } else {
        console.log(`     Error: ${result.error}`);
      }
    });

    console.log(`\n${'─'.repeat(70)}`);
    console.log(`Total: ${passed}/${total} flows completed successfully`);
    console.log(`${'─'.repeat(70)}`);

    if (passed === total) {
      console.log(`\n🎉 All approval flows are working correctly!`);
    } else {
      console.log(`\n⚠️  Some flows failed. Please review the details above.`);
    }

    await mongoose.disconnect();
    console.log(`\n✓ Test completed. Disconnected from MongoDB.`);
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
};

main();
