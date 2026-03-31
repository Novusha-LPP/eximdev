
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = 'mongodb://localhost:27017/exim';

const SURAJ_ID = "69cbc481d44c495e5ef54664"; // Suraj Forwarders Private Limited
const EXIM_ID = "69cbc481d44c495e5ef54678"; // EXIM Global

async function seed() {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    
    console.log('--- REPAIRING USER LINKS ---');
    // 1. Re-link users to Suraj Forwarders
    const res = await db.collection('users').updateMany(
        { company_id: { $ne: new mongoose.Types.ObjectId(SURAJ_ID) } },
        { $set: { company_id: new mongoose.Types.ObjectId(SURAJ_ID) } }
    );
    console.log(`Re-linked ${res.modifiedCount} orphaned users to Suraj Forwarders.`);

    // 2. Assign some users to EXIM Global for testing
    const eximUsers = await db.collection('users').find({}).limit(50).toArray();
    const eximUserIds = eximUsers.map(u => u._id);
    const resExim = await db.collection('users').updateMany(
        { _id: { $in: eximUserIds } },
        { $set: { company_id: new mongoose.Types.ObjectId(EXIM_ID) } }
    );
    console.log(`Re-linked ${resExim.modifiedCount} users to EXIM Global for testing.`);

    console.log('--- GENERATING ATTENDANCE FOR TODAY (31-03-2026) ---');
    const today = new Date("2026-03-31T00:00:00.000Z");
    const monthYear = "2026-03";

    // Clear existing records for today to avoid duplicates
    await db.collection('attendancerecords').deleteMany({ attendance_date: today });

    const allUsers = await db.collection('users').find({ isActive: true }).toArray();
    const records = [];

    allUsers.forEach((user, index) => {
        // Randomize status for statistics
        let status = 'present';
        let is_late = false;
        let late_by_minutes = 0;
        let first_in = "09:00 AM";
        const dice = Math.random();

        if (dice < 0.1) {
            status = 'absent';
            first_in = null;
        } else if (dice < 0.3) {
            is_late = true;
            late_by_minutes = Math.floor(Math.random() * 60) + 1;
            first_in = `09:${late_by_minutes.toString().padStart(2, '0')} AM`;
        } else if (dice < 0.4) {
             status = 'half_day';
             first_in = "02:00 PM";
        }

        records.push({
            employee_id: user._id,
            company_id: user.company_id,
            attendance_date: today,
            year_month: monthYear,
            status: status,
            first_in: first_in,
            last_out: status === 'present' ? "06:00 PM" : null,
            total_work_hours: status === 'present' ? 9 : (status === 'half_day' ? 4 : 0),
            is_late: is_late,
            late_by_minutes: late_by_minutes,
            is_ot: Math.random() > 0.8,
            ot_minutes: Math.random() > 0.8 ? 60 : 0,
            is_locked: false,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    });

    if (records.length > 0) {
        await db.collection('attendancerecords').insertMany(records);
        console.log(`Generated ${records.length} attendance records for today.`);
    }

    // Add some random leaves pending
    console.log('--- GENERATING PENDING LEAVES ---');
    await db.collection('leaveapplications').deleteMany({ from_date: today });
    const leaveUsers = allUsers.slice(0, 10);
    const leaves = leaveUsers.map((u, i) => ({
        employee_id: u._id,
        company_id: u.company_id,
        leave_policy_id: new mongoose.Types.ObjectId("69cbc481d44c495e5ef54664"), // dummy policy
        leave_type: 'sick',
        from_date: today,
        to_date: today,
        total_days: 1,
        reason: 'Sample sick leave from seed script',
        approval_status: 'pending',
        application_number: `LEV-${Date.now()}-${i}`,
        createdAt: new Date()
    }));
    await db.collection('leaveapplications').insertMany(leaves);
    console.log(`Generated 10 pending leave applications with unique numbers.`);

    console.log('--- SEEDING COMPLETE ---');

  } catch (err) {
    console.error('Seeding failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
