const mongoose = require('mongoose');

async function restore() {
  await mongoose.connect('mongodb://127.0.0.1:27017/exim');
  const db = mongoose.connection.db;
  
  console.log('--- SCANNING FOR ORPHANED LEAVE REFERENCES ---');
  const atts = await db.collection('attendancerecords').find({
    leave_application_id: { $exists: true, $ne: null }
  }).toArray();
  
  const orphanIds = new Set();
  const orphanRecords = [];
  
  for (const a of atts) {
    const leave = await db.collection('leaveapplications').findOne({ _id: a.leave_application_id });
    if (!leave) {
      orphanIds.add(a.leave_application_id.toString());
      orphanRecords.push(a);
    }
  }
  
  console.log(`Found ${orphanRecords.length} orphaned attendance records across ${orphanIds.size} missing leave applications.`);
  
  for (const idStr of orphanIds) {
    const id = new mongoose.Types.ObjectId(idStr);
    const affectedAtts = orphanRecords.filter(a => a.leave_application_id.toString() === idStr);
    affectedAtts.sort((a, b) => a.attendance_date - b.attendance_date);
    
    const firstAtt = affectedAtts[0];
    const lastAtt = affectedAtts[affectedAtts.length - 1];
    
    const employee = await db.collection('users').findOne({ _id: firstAtt.employee_id });
    if (!employee) {
      console.log(`Skipping restoration for missing user ${firstAtt.employee_id}`);
      continue;
    }

    // Try to find a leave policy to use
    let policy = await db.collection('leavepolicies').findOne({ company_id: employee.company_id });
    if (!policy) {
        // Fallback to any policy if company specific not found
        policy = await db.collection('leavepolicies').findOne({});
    }

    const fromDate = new Date(firstAtt.attendance_date);
    fromDate.setHours(0,0,0,0);
    const toDate = new Date(lastAtt.attendance_date);
    toDate.setHours(23,59,59,999);

    const totalDays = affectedAtts.length;

    const newLeave = {
      _id: id,
      company_id: employee.company_id,
      employee_id: employee._id,
      department_id: employee.department_id,
      team_id: firstAtt.team_id || employee.team_id,
      application_number: `RESTORED-${idStr.substring(18)}`,
      leave_policy_id: policy ? policy._id : new mongoose.Types.ObjectId(), // Placeholder if no policy found
      leave_type: policy ? (policy.leave_type || 'leave') : 'leave',
      from_date: fromDate,
      to_date: toDate,
      total_days: totalDays,
      reason: 'Restored from history - Missing record recovery',
      approval_status: 'approved',
      approval_stage: 'stage_3_final',
      applied_on: firstAtt.createdAt || new Date(),
      createdAt: firstAtt.createdAt || new Date(),
      updatedAt: new Date()
    };

    try {
        await db.collection('leaveapplications').insertOne(newLeave);
        console.log(`Restored Leave ID: ${idStr} for User: ${employee.username} (${totalDays} days: ${fromDate.toISOString().split('T')[0]} to ${toDate.toISOString().split('T')[0]})`);
    } catch (err) {
        console.error(`Failed to restore ${idStr}:`, err.message);
    }
  }

  process.exit();
}

restore().catch(err => {
  console.error(err);
  process.exit(1);
});
