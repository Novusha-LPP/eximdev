import { canActorActOnLeave } from '../controllers/attendance/HOD.controller.js';

// Setup Mock Data
const users = {
  uday: { _id: '1', username: 'uday_zope', role: 'HOD', hod_id: '6' },
  shalini: { _id: '2', username: 'shalini_arun', role: 'ADMIN' },
  manu: { _id: '3', username: 'manu_pillai', role: 'ADMIN' },
  suraj: { _id: '4', username: 'suraj_rajan', role: 'ADMIN' },
  rajan: { _id: '5', username: 'rajan_aranamkatte', role: 'ADMIN' },
  punit: { _id: '6', username: 'punit_pandey', role: 'HOD' },
  otherHod: { _id: '7', username: 'other_hod', role: 'HOD', hod_id: '6' },
  regular: { _id: '8', username: 'john_doe', role: 'EMPLOYEE', hod_id: '7' }
};

const runTests = () => {
  console.log('--- STARTING LEAVE ROUTING TESTS ---');

  // Test Case 1: shalini_arun leave application at FINAL stage
  const shaliniLeave = {
    approval_status: 'pending',
    approval_stage: 'stage_3_final',
    employee_id: users.shalini,
    current_approver_id: null
  };

  console.log('\n[Case 1] Applicant: shalini_arun');
  console.log('Can manu approve? Expected: true | Actual:', canActorActOnLeave(shaliniLeave, users.manu));
  console.log('Can suraj approve? Expected: true | Actual:', canActorActOnLeave(shaliniLeave, users.suraj));
  console.log('Can rajan approve? Expected: true | Actual:', canActorActOnLeave(shaliniLeave, users.rajan));
  console.log('Can uday approve? Expected: false | Actual:', canActorActOnLeave(shaliniLeave, users.uday));
  console.log('Can shalini approve herself? Expected: false | Actual:', canActorActOnLeave(shaliniLeave, users.shalini));

  // Test Case 2: HOD (other_hod) leave application at FINAL stage (bypassed)
  const hodLeave = {
    approval_status: 'pending',
    approval_stage: 'stage_3_final',
    employee_id: users.otherHod,
    current_approver_id: null
  };

  console.log('\n[Case 2] Applicant: other_hod (HOD user)');
  console.log('Can shalini approve? Expected: true | Actual:', canActorActOnLeave(hodLeave, users.shalini));
  console.log('Can manu approve? Expected: true | Actual:', canActorActOnLeave(hodLeave, users.manu));
  console.log('Can suraj approve? Expected: true | Actual:', canActorActOnLeave(hodLeave, users.suraj));
  console.log('Can rajan approve? Expected: true | Actual:', canActorActOnLeave(hodLeave, users.rajan));
  console.log('Can uday approve? Expected: true | Actual:', canActorActOnLeave(hodLeave, users.uday));

  // Test Case 3: Regular employee leave application at FINAL stage
  const regularLeave = {
    approval_status: 'pending',
    approval_stage: 'stage_3_final',
    employee_id: users.regular,
    current_approver_id: null
  };

  console.log('\n[Case 3] Applicant: regular employee (john_doe)');
  console.log('Can shalini approve? Expected: false | Actual:', canActorActOnLeave(regularLeave, users.shalini));
  console.log('Can manu approve? Expected: true | Actual:', canActorActOnLeave(regularLeave, users.manu));
  console.log('Can uday approve? Expected: true | Actual:', canActorActOnLeave(regularLeave, users.uday));

  console.log('\n--- TESTS COMPLETED ---');
};

runTests();
