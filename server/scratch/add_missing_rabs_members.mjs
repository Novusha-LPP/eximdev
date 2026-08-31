import mongoose from 'mongoose';
import dotenv from 'dotenv';
import UserModel from '../model/userModel.mjs';
import TeamModel from '../model/teamModel.mjs';
import CompanyModel from '../model/attendance/Company.js';

dotenv.config({ path: './.env' });
const MONGO_URI = process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/exim';

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to DB...');

    const rabsCompany = await CompanyModel.findOne({ company_name: /RABS Industries India Private Limited/i });
    if (!rabsCompany) {
      console.log('RABS Company not found');
      process.exit(1);
    }
    const rabsId = rabsCompany._id;

    // Active users of RABS excluding drivers/dev_master
    const query = {
      company_id: rabsId,
      isActive: { $ne: false },
      role: { $nin: ['driver', 'Driver'] }
    };
    if (process.env.NODE_ENV === 'production') {
      query.username = { $ne: 'dev_master' };
    }
    const rabsUsers = await UserModel.find(query).lean();
    console.log(`Found ${rabsUsers.length} active non-driver users for RABS.`);

    // Find RABS team
    const rabsTeam = await TeamModel.findOne({ name: /RABS Industries/i, isActive: { $ne: false } });
    if (!rabsTeam) {
      console.log('RABS Team not found');
      process.exit(1);
    }

    const teamMemberIds = new Set(rabsTeam.members.map(m => m.userId?.toString()).filter(Boolean));
    const teamUsernames = new Set(rabsTeam.members.map(m => String(m.username || '').toLowerCase().trim()));

    let addedCount = 0;
    for (const u of rabsUsers) {
      const inTeamById = teamMemberIds.has(u._id.toString());
      const inTeamByUsername = teamUsernames.has(u.username.toLowerCase().trim());
      if (!inTeamById && !inTeamByUsername) {
        console.log(`Adding user ${u.username} (${u._id}) to RABS Team...`);
        rabsTeam.members.push({
          userId: u._id,
          username: u.username,
          addedAt: new Date()
        });
        addedCount++;
      }
    }

    if (addedCount > 0) {
      await rabsTeam.save();
      console.log(`Successfully added ${addedCount} members to RABS team.`);
    } else {
      console.log('No members needed to be added.');
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
