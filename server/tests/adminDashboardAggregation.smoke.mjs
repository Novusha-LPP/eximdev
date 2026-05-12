import assert from 'node:assert/strict';
import AggregationService from '../services/attendance/AggregationService.js';
import AttendanceRecord from '../model/attendance/AttendanceRecord.js';
import LeaveApplication from '../model/attendance/LeaveApplication.js';
import RegularizationRequest from '../model/attendance/RegularizationRequest.js';
import User from '../model/userModel.mjs';
import TeamModel from '../model/teamModel.mjs';

const orgA = '64a000000000000000000001';
const orgB = '64a000000000000000000002';
const empA1 = '64a000000000000000000011';
const empA2 = '64a000000000000000000012';
const empB1 = '64a000000000000000000021';

const original = {
  attendanceFind: AttendanceRecord.find,
  leaveFind: LeaveApplication.find,
  leaveCount: LeaveApplication.countDocuments,
  regCount: RegularizationRequest.countDocuments,
  userFind: User.find,
  userFindOne: User.findOne,
  userCount: User.countDocuments,
  userDistinct: User.distinct,
  teamFind: TeamModel.find,
  getPendingApprovalsCount: AggregationService.getPendingApprovalsCount
};

const stats = {
  attendanceFind: 0,
  leaveFind: 0,
  userFind: 0,
  userFindOne: 0,
  userCount: 0,
  userDistinct: 0,
  teamFind: 0,
  leaveCount: 0,
  regCount: 0,
  getPendingApprovalsCount: 0
};

const chain = (value) => ({
  populate() { return this; },
  select() { return this; },
  sort() { return this; },
  skip() { return this; },
  limit() { return this; },
  lean() { return Promise.resolve(value); }
});

const resolveOrg = (query) => {
  const companyId = query?.company_id;
  if (!companyId) return null;
  if (typeof companyId === 'object' && '$in' in companyId) {
    return companyId.$in[0];
  }
  return companyId;
};

AttendanceRecord.find = () => {
  stats.attendanceFind += 1;
  return chain([
    {
      employee_id: { _id: empA1, first_name: 'Asha', last_name: 'One', username: 'asha.one', company_id: { toString: () => orgA } },
      status: 'present',
      is_late: false,
      is_early_exit: false,
      first_in: '2026-05-11T09:05:00Z',
      last_out: '2026-05-11T18:05:00Z',
      total_work_hours: 8.75,
      late_by_minutes: 0,
      attendance_date: new Date('2026-05-11T00:00:00Z')
    },
    {
      employee_id: { _id: empA2, first_name: 'Arun', last_name: 'Two', username: 'arun.two', company_id: { toString: () => orgA } },
      status: 'late',
      is_late: true,
      is_early_exit: false,
      first_in: '2026-05-11T10:15:00Z',
      last_out: '2026-05-11T18:00:00Z',
      total_work_hours: 7.5,
      late_by_minutes: 45,
      attendance_date: new Date('2026-05-11T00:00:00Z')
    },
    {
      employee_id: { _id: empB1, first_name: 'Bina', last_name: 'Three', username: 'bina.three', company_id: { toString: () => orgB } },
      status: 'absent',
      is_late: false,
      is_early_exit: false,
      first_in: null,
      last_out: null,
      total_work_hours: 0,
      late_by_minutes: 0,
      attendance_date: new Date('2026-05-11T00:00:00Z')
    }
  ]);
};

LeaveApplication.find = () => {
  stats.leaveFind += 1;
  return chain([
    {
      _id: 'leave-1',
      employee_id: { _id: empB1, first_name: 'Bina', last_name: 'Three', username: 'bina.three', company_id: { toString: () => orgB } },
      leave_policy_id: { leave_type: 'Casual Leave' },
      from_date: new Date('2026-05-11T00:00:00Z'),
      to_date: new Date('2026-05-11T23:59:59Z')
    }
  ]);
};

LeaveApplication.countDocuments = async () => {
  stats.leaveCount += 1;
  return 1;
};

RegularizationRequest.countDocuments = async () => {
  stats.regCount += 1;
  return 0;
};

User.find = async (query = {}) => {
  stats.userFind += 1;
  const org = resolveOrg(query);
  if (query.department_id) {
    return chain([{ _id: empA1 }, { _id: empA2 }]);
  }
  if (org === orgA) {
    return chain([{ _id: empA1 }, { _id: empA2 }]);
  }
  if (org === orgB) {
    return chain([{ _id: empB1 }]);
  }
  return chain([]);
};

User.findOne = async (query = {}) => {
  stats.userFindOne += 1;
  const org = resolveOrg(query);
  const company_name = org === orgA ? 'Alpha Org' : 'Beta Org';
  return chain({ company_id: { _id: org, company_name } });
};

User.countDocuments = async (query = {}) => {
  stats.userCount += 1;
  const org = resolveOrg(query);
  if (!org) return 3;
  if (org === orgA) return 2;
  if (org === orgB) return 1;
  return 0;
};

User.distinct = async () => {
  stats.userDistinct += 1;
  return [orgA, orgB];
};

TeamModel.find = () => {
  stats.teamFind += 1;
  return chain([]);
};

AggregationService.getPendingApprovalsCount = async () => {
  stats.getPendingApprovalsCount += 1;
  return 1;
};

try {
  AggregationService.clearCache();

  assert.deepEqual(AggregationService.buildCompanyFilter([]), {});

  const first = await AggregationService.getGlobalDashboardSummary('2026-05-11', [], [], []);
  const second = await AggregationService.getGlobalDashboardSummary('2026-05-11', [], [], []);

  assert.equal(first.summary.total_employees, 3);
  assert.equal(first.summary.present_today, 2);
  assert.equal(first.summary.absent_today, 0);
  assert.equal(first.summary.on_leave_today, 1);
  assert.equal(first.summary.late_arrivals, 1);
  assert.equal(first.organizations.length, 2);
  assert.equal(first.organizations[0].total_employees + first.organizations[1].total_employees, 3);
  assert.equal(second.summary.total_employees, 3);
  assert.equal(stats.attendanceFind, 1, 'cached second call should not refetch attendance records');
  assert.equal(stats.leaveFind, 1, 'cached second call should not refetch leave records');

  AggregationService.clearCache();
  await AggregationService.getGlobalDashboardSummary('2026-05-11', [], [], []);
  assert.equal(stats.attendanceFind, 2, 'cache clear should force a refresh');

  console.log('adminDashboardAggregation.smoke.mjs passed');
} finally {
  AttendanceRecord.find = original.attendanceFind;
  LeaveApplication.find = original.leaveFind;
  LeaveApplication.countDocuments = original.leaveCount;
  RegularizationRequest.countDocuments = original.regCount;
  User.find = original.userFind;
  User.findOne = original.userFindOne;
  User.countDocuments = original.userCount;
  User.distinct = original.userDistinct;
  TeamModel.find = original.teamFind;
  AggregationService.getPendingApprovalsCount = original.getPendingApprovalsCount;
}
