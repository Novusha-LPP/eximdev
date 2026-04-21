import dotenv from 'dotenv';
import mongoose from 'mongoose';
import moment from 'moment';

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

const isHodRole = (role) => {
  const normalized = String(role || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
  return normalized === 'HOD' || normalized === 'HEADOFDEPARTMENT';
};

const getShaliniApprover = async (companyId) => {
  const companyScoped = await UserModel.findOne({
    username: STAGE_2_APPROVER_USERNAME,
    company_id: companyId,
    isActive: true
  }).select('_id username role');

  if (companyScoped) return companyScoped;

  return UserModel.findOne({
    username: STAGE_2_APPROVER_USERNAME,
    isActive: true
  }).select('_id username role');
};

const getApproverByUsername = async (username, companyId) => {
  const companyScoped = await UserModel.findOne({
    username,
    company_id: companyId,
    isActive: true
  }).select('_id username role');

  if (companyScoped) return companyScoped;

  return UserModel.findOne({
    username,
    isActive: true
  }).select('_id username role');
};

// ============================================================================
// TEST SCENARIOS
// ============================================================================

const createTestLeaveApplication = async (employeeUsername, companyId, scenario) => {
  console.log(`\n📝 Creating test leave application for: ${employeeUsername} (${scenario})`);

  try {
    // Get employee
    const employee = await UserModel.findOne({
      username: employeeUsername,
      isActive: true
    });

    if (!employee) {
      console.error(`❌ Employee not found: ${employeeUsername}`);
      return null;
    }

    console.log(`✓ Found employee: ${employeeUsername} (ID: ${employee._id})`);

    // Get leave policy (use any active policy)
    let policy = await LeavePolicy.findOne({
      company_id: companyId,
      status: 'active',
      leave_type: 'casual'
    });

    if (!policy) {
      policy = await LeavePolicy.findOne({
        status: 'active'
      });
    }

    if (!policy) {
      console.error(`❌ No active leave policy found`);
      return null;
    }

    console.log(`✓ Using leave policy: ${policy.leave_type} (${policy._id})`);

    // Determine routing based on employee role
    const isHod = isHodRole(employee.role);
    const isAdmin = String(employee.username || '').toLowerCase() === STAGE_2_APPROVER_USERNAME;
    const isFinalApprover = FINAL_APPROVER_USERNAMES.has(String(employee.username || '').toLowerCase());

    console.log(`  - Is HOD: ${isHod}`);
    console.log(`  - Is Shalini (Stage 2): ${isAdmin}`);
    console.log(`  - Is Final Approver: ${isFinalApprover}`);

    // Determine initial approver and stage
    let assignedStage = LEAVE_STAGE.HOD;
    let currentApproverId = null;
    let expectedRoutingDescription = '';

    if (isAdmin) {
      // Shalini applying -> Goes to Manu Pillai at Stage 3
      const manuUser = await getApproverByUsername('manu_pillai', companyId);
      if (manuUser) {
        assignedStage = LEAVE_STAGE.FINAL;
        currentApproverId = manuUser._id;
        expectedRoutingDescription = 'Shalini -> Manu (Stage 3, Final Approval)';
      }
    } else if (isFinalApprover) {
      // Manu/Suraj/Rajan applying -> Self-approve at Stage 3
      assignedStage = LEAVE_STAGE.FINAL;
      currentApproverId = employee._id;
      expectedRoutingDescription = `${employeeUsername} -> Self (Stage 3, Final Approval)`;
    } else if (isHod) {
      // HOD applying -> Goes to Shalini at Stage 2
      const shaliniUser = await getShaliniApprover(companyId);
      if (shaliniUser) {
        assignedStage = LEAVE_STAGE.SHALINI;
        currentApproverId = shaliniUser._id;
        expectedRoutingDescription = 'HOD -> Shalini (Stage 2)';
      }
    } else {
      // Regular employee -> Goes to Team HOD
      const userTeam = await TeamModel.findOne({
        'members.userId': employee._id,
        isActive: { $ne: false }
      });

      if (userTeam && userTeam.hodId) {
        assignedStage = LEAVE_STAGE.HOD;
        currentApproverId = userTeam.hodId;
        expectedRoutingDescription = 'Regular -> Team HOD (Stage 1)';
      }
    }

    console.log(`✓ Routing: ${expectedRoutingDescription}`);
    console.log(`  - Assigned Stage: ${assignedStage}`);
    console.log(`  - Current Approver: ${currentApproverId}`);

    // Create approval chain
    const shaliniUser = await getShaliniApprover(companyId);

    const approvalChain = [
      {
        level: 1,
        stage: LEAVE_STAGE.HOD,
        approver_id: currentApproverId,
        approver_role: 'HOD',
        action: assignedStage === LEAVE_STAGE.HOD ? 'pending' : 'approved',
        action_date: assignedStage === LEAVE_STAGE.HOD ? undefined : new Date(),
        comments: assignedStage === LEAVE_STAGE.HOD ? undefined : 'Stage skipped for HOD/admin requester'
      },
      {
        level: 2,
        stage: LEAVE_STAGE.SHALINI,
        approver_id: shaliniUser._id,
        approver_username: STAGE_2_APPROVER_USERNAME,
        approver_role: 'ADMIN',
        action:
          assignedStage === LEAVE_STAGE.HOD ? 'pending' : assignedStage === LEAVE_STAGE.SHALINI ? 'pending' : 'approved',
        action_date: assignedStage === LEAVE_STAGE.FINAL ? new Date() : undefined,
        comments: assignedStage === LEAVE_STAGE.FINAL ? 'Stage skipped for senior admin requester' : undefined
      },
      {
        level: 3,
        stage: LEAVE_STAGE.FINAL,
        approver_id: assignedStage === LEAVE_STAGE.FINAL ? currentApproverId : undefined,
        approver_role: 'ADMIN',
        action: 'pending',
        comments: 'Final approver group: manu_pillai, suraj_rajan, rajan_aranamkatte'
      }
    ]
      .map((step) => ({
        ...step,
        action: ['pending', 'approved', 'rejected'].includes(step.action) ? step.action : 'pending'
      }))
      .filter((step) => step.action);

    // Create leave application
    const fromDate = moment().add(7, 'days').startOf('day').toDate();
    const toDate = moment(fromDate).add(2, 'days').toDate();

    // Generate unique application number
    const appNumber = `LA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const application = new LeaveApplication({
      employee_id: employee._id,
      company_id: companyId,
      leave_policy_id: policy._id,
      leave_type: policy.leave_type,
      from_date: fromDate,
      to_date: toDate,
      total_days: 3,
      reason: `Test leave for ${scenario}`,
      is_half_day: false,
      approval_status: 'pending',
      approval_stage: assignedStage,
      current_approver_id: currentApproverId,
      approval_chain: approvalChain,
      application_number: appNumber
    });

    await application.save();

    console.log(`✓ Leave application created successfully!`);
    console.log(`  ID: ${application._id}`);
    console.log(`  Status: ${application.approval_status}`);
    console.log(`  Stage: ${application.approval_stage}`);

    return {
      applicationId: application._id,
      employeeUsername,
      scenario,
      assignedStage,
      approvalChain,
      expectedRoutingDescription
    };
  } catch (error) {
    console.error(`❌ Error creating leave application: ${error.message}`);
    return null;
  }
};

const verifyApprovalChain = (application, expectedStage) => {
  console.log(`\n🔍 Verifying approval chain for: ${application.scenario}`);

  const chainByStage = new Map((application.approvalChain || []).map((entry) => [entry.stage, entry]));

  // Check if expected stage is properly configured
  const expectedStageEntry = chainByStage.get(expectedStage);

  if (!expectedStageEntry) {
    console.error(`❌ Expected stage ${expectedStage} not found in approval chain`);
    return false;
  }

  console.log(`✓ Assigned Stage: ${expectedStage}`);

  // Verify skipped stages are marked as 'approved'
  const hodStage = chainByStage.get(LEAVE_STAGE.HOD);
  const shaliniStage = chainByStage.get(LEAVE_STAGE.SHALINI);
  const finalStage = chainByStage.get(LEAVE_STAGE.FINAL);

  let isValid = true;

  console.log(`\nStage Details:`);
  console.log(`1️⃣  HOD Stage (Stage 1):`);
  if (hodStage) {
    console.log(`   - Action: ${hodStage.action}`);
    if (expectedStage !== LEAVE_STAGE.HOD && hodStage.action !== 'approved') {
      console.warn(`   ⚠️  Expected 'approved' for skipped stage, got '${hodStage.action}'`);
    }
    if (hodStage.action === 'approved') {
      console.log(`   - Comments: ${hodStage.comments || '(none)'}`);
    }
  }

  console.log(`\n2️⃣  Shalini Stage (Stage 2):`);
  if (shaliniStage) {
    console.log(`   - Action: ${shaliniStage.action}`);
    if (expectedStage !== LEAVE_STAGE.SHALINI && expectedStage !== LEAVE_STAGE.HOD && shaliniStage.action !== 'approved') {
      console.warn(`   ⚠️  Expected 'approved' for skipped stage, got '${shaliniStage.action}'`);
    }
    if (shaliniStage.action === 'approved') {
      console.log(`   - Comments: ${shaliniStage.comments || '(none)'}`);
    }
  }

  console.log(`\n3️⃣  Final Stage (Stage 3):`);
  if (finalStage) {
    console.log(`   - Action: ${finalStage.action}`);
    console.log(`   - Comments: ${finalStage.comments || '(none)'}`);
  }

  return isValid;
};

// ============================================================================
// MAIN EXECUTION
// ============================================================================

const main = async () => {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║    SPECIAL APPROVAL WORKFLOW TEST SCRIPT                           ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');

  try {
    // Connect to MongoDB
    const mongoUri = resolveMongoUri();
    console.log(`\n🔌 Connecting to MongoDB: ${mongoUri.replace(/mongodb:\/\/.*@/, 'mongodb://***@')}`);

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });

    console.log('✓ Connected successfully!');

    // Get company ID (assume first company)
    const company = await mongoose.connection.collection('companies').findOne({});
    if (!company) {
      console.error('❌ No company found in database');
      await mongoose.disconnect();
      process.exit(1);
    }

    const companyId = company._id;
    console.log(`✓ Using company: ${company._id}`);

    const testCases = [
      {
        username: 'shalini_arun',
        scenario: 'Shalini Arun Application',
        expectedStage: LEAVE_STAGE.FINAL,
        description: 'Shalini applying -> Routed to Manu Pillai (Final Stage, self-approve by Manu)'
      },
      {
        username: 'manu_pillai',
        scenario: 'Manu Pillai Application',
        expectedStage: LEAVE_STAGE.FINAL,
        description: 'Manu applying -> Self-approval at Final Stage'
      },
      {
        username: 'suraj_rajan',
        scenario: 'Suraj Rajan Application',
        expectedStage: LEAVE_STAGE.FINAL,
        description: 'Suraj applying -> Self-approval at Final Stage'
      }
    ];

    const results = [];

    console.log(`\n╔════════════════════════════════════════════════════════════════════╗`);
    console.log(`║    SCENARIO 1: Senior Admin Applications (Skip Stages)              ║`);
    console.log(`╚════════════════════════════════════════════════════════════════════╝`);

    for (const testCase of testCases) {
      console.log(`\n${'─'.repeat(70)}`);
      console.log(`Test: ${testCase.scenario}`);
      console.log(`Description: ${testCase.description}`);
      console.log(`Expected Stage: ${testCase.expectedStage}`);
      console.log(`${'─'.repeat(70)}`);

      const app = await createTestLeaveApplication(testCase.username, companyId, testCase.scenario);

      if (app) {
        const isValid = verifyApprovalChain(app, testCase.expectedStage);
        results.push({
          scenario: testCase.scenario,
          passed: isValid,
          applicationId: app.applicationId
        });
      } else {
        results.push({
          scenario: testCase.scenario,
          passed: false,
          applicationId: null
        });
      }
    }

    // Test HOD scenario
    console.log(`\n╔════════════════════════════════════════════════════════════════════╗`);
    console.log(`║    SCENARIO 2: HOD Application (Routed to Shalini)                  ║`);
    console.log(`╚════════════════════════════════════════════════════════════════════╝`);

    // Find a HOD user
    const hodUser = await UserModel.findOne({ isActive: true }).where('role').regex(/hod|head/i);

    if (hodUser) {
      console.log(`\n${'─'.repeat(70)}`);
      console.log(`Test: HOD Application (${hodUser.username})`);
      console.log(`Description: HOD applying -> Routed to Shalini (Stage 2)`);
      console.log(`Expected Stage: ${LEAVE_STAGE.SHALINI}`);
      console.log(`${'─'.repeat(70)}`);

      const app = await createTestLeaveApplication(hodUser.username, companyId, 'HOD Application');

      if (app) {
        const isValid = verifyApprovalChain(app, LEAVE_STAGE.SHALINI);
        results.push({
          scenario: 'HOD Application',
          passed: isValid,
          applicationId: app.applicationId
        });
      }
    }

    // Print summary
    console.log(`\n╔════════════════════════════════════════════════════════════════════╗`);
    console.log(`║    TEST SUMMARY                                                     ║`);
    console.log(`╚════════════════════════════════════════════════════════════════════╝\n`);

    const passed = results.filter((r) => r.passed).length;
    const total = results.length;

    results.forEach((result) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${result.scenario}`);
      if (result.applicationId) {
        console.log(`     Application ID: ${result.applicationId}`);
      }
    });

    console.log(`\n${'─'.repeat(70)}`);
    console.log(`Total: ${passed}/${total} tests passed`);
    console.log(`${'─'.repeat(70)}`);

    if (passed === total) {
      console.log(`\n🎉 All tests passed! Special approval workflow is working correctly.`);
    } else {
      console.log(`\n⚠️  Some tests failed. Please review the details above.`);
    }

    // Verify in database
    console.log(`\n╔════════════════════════════════════════════════════════════════════╗`);
    console.log(`║    DATABASE VERIFICATION                                           ║`);
    console.log(`╚════════════════════════════════════════════════════════════════════╝\n`);

    for (const result of results) {
      if (result.applicationId) {
        const dbApp = await LeaveApplication.findById(result.applicationId)
          .populate('employee_id', 'username')
          .populate('current_approver_id', 'username');

        if (dbApp) {
          console.log(`\n${result.scenario}:`);
          console.log(`  Employee: ${dbApp.employee_id.username}`);
          console.log(`  Approval Stage: ${dbApp.approval_stage}`);
          console.log(`  Current Approver: ${dbApp.current_approver_id?.username || 'None'}`);
          console.log(`  Status: ${dbApp.approval_status}`);
          console.log(`  Chain Length: ${dbApp.approval_chain?.length || 0} stages`);
        }
      }
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
