import mongoose from 'mongoose';
import TeamModel from '../model/teamModel.mjs';
import User from '../model/userModel.mjs';
import LeaveApplication from '../model/attendance/LeaveApplication.js';
import LeaveBalance from '../model/attendance/LeaveBalance.js';
import LeavePolicy from '../model/attendance/LeavePolicy.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI =
  process.env.DEV_MONGODB_URI ||
  process.env.SERVER_MONGODB_URI ||
  'mongodb://127.0.0.1:27017/exim';

async function seedLeaves() {
  try {
    console.log('Connecting to database...', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get 2 sample teams
    const teams = await TeamModel.find({
      isActive: { $ne: false },
      members: { $not: { $size: 0 } }
    }).limit(2);

    if (teams.length === 0) {
      console.log('No active teams found with members.');
      process.exit(0);
    }

    console.log(`Found ${teams.length} teams to seed data for.`);

    let count = 0;

    for (const team of teams) {
      console.log(`Processing team: ${team.name}`);

      // Get a few members
      const memberIds = team.members
        .map((m) => m.userId)
        .filter(Boolean)
        .slice(0, 2);

      if (memberIds.length === 0) continue;

      const users = await User.find({
        _id: { $in: memberIds },
        isActive: true
      });

      for (const user of users) {
        // Find a leave policy for user's company
        const companyId = user.company_id?._id || user.company_id;

        if (!companyId) continue;

        let policy = await LeavePolicy.findOne({ company_id: companyId });

        if (!policy) {
          console.log(
            `No LeavePolicy found for company ${companyId}, creating a dummy one.`
          );

          policy = await LeavePolicy.create({
            company_id: companyId,
            policy_name: 'Standard Leave',
            leave_type: 'sick',
            leave_code: 'SL',
            description: 'System generated standard leave policy',
            annual_quota: 24,
            status: 'active'
          });
        }

        // Ensure balance exists
        let balance = await LeaveBalance.findOne({
          employee_id: user._id,
          leave_policy_id: policy._id,
          year: new Date().getFullYear()
        });

        if (!balance) {
          balance = await LeaveBalance.create({
            company_id: companyId,
            employee_id: user._id,
            leave_policy_id: policy._id,
            leave_type: policy.leave_type,
            year: new Date().getFullYear(),
            opening_balance: 24,
            credited: 0,
            closing_balance: 24,
            consumed: 0,
            pending_approval: 0
          });
        }

        // Create Leave Application
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() + 2);

        const toDate = new Date();
        toDate.setDate(fromDate.getDate() + 1);

        const application = new LeaveApplication({
          employee_id: user._id,
          company_id: companyId,
          department_id: user.department_id,
          team_id: team._id,
          leave_policy_id: policy._id,
          leave_type: policy.leave_type,
          from_date: fromDate,
          to_date: toDate,
          total_days: 2,
          reason: `Attending family function - seeded for ${team.name}`,
          is_half_day: false,
          approval_status: 'pending',
          application_number: `LA-SEED-${Date.now()}-${user._id
            .toString()
            .slice(-4)}`
        });

        await application.save();

        // Lock balance for pending leave
        balance.pending_approval += 2;
        balance.closing_balance -= 2;
        await balance.save();

        console.log(
          `  -> Seeded leave application for ${user.username} in team ${team.name}!`
        );

        count++;
      }
    }

    console.log(
      `\nSeeding completed successfully! Added ${count} pending leave requests.`
    );

    process.exit(0);
  } catch (err) {
    console.error('Error seeding data:', err);
    process.exit(1);
  }
}

seedLeaves();