import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import UserModel from '../model/userModel.mjs';
import LeaveBalance from '../model/attendance/LeaveBalance.js';
import LeavePolicy from '../model/attendance/LeavePolicy.js';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });
const MONGO_URI = process.env.PROD_MONGODB_URI;

if (!MONGO_URI) {
  console.error('PROD_MONGODB_URI is not defined in .env');
  process.exit(1);
}

// Artifact file path
const ARTIFACT_PATH = 'C:\\Users\\india\\.gemini\\antigravity-ide\\brain\\2355fd8b-8673-46f0-b6aa-2f3d49b43910\\duplicate_privilege_balances.md';

async function run() {
  try {
    console.log('Connecting to production DB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');

    console.log('Running aggregation...');
    const duplicates = await LeaveBalance.aggregate([
      {
        $match: {
          leave_type: { $regex: /^privilege$/i }
        }
      },
      {
        $group: {
          _id: {
            employee_id: '$employee_id',
            year: '$year'
          },
          count: { $sum: 1 },
          balances: {
            $push: {
              balance_id: '$_id',
              leave_policy_id: '$leave_policy_id',
              opening_balance: '$opening_balance',
              closing_balance: '$closing_balance',
              used: '$used',
              createdAt: '$createdAt',
              updatedAt: '$updatedAt'
            }
          }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    let mdContent = `# Duplicate Privilege Leave Balances Report (Production)

This report lists all employees in the production environment who have multiple (duplicate) privilege leave balance records for the same year.

Total duplicate groups found: **${duplicates.length}**

## Duplicate Groups Details

`;

    let index = 1;
    for (const group of duplicates) {
      const { employee_id, year } = group._id;
      const user = await UserModel.findById(employee_id).select('first_name last_name username employee_code').lean();
      
      const empName = user ? `${user.first_name} ${user.last_name} (@${user.username})` : 'Unknown';
      const empCode = user?.employee_code || 'N/A';
      
      mdContent += `### ${index}. ${empName} (Code: ${empCode})
- **Employee ID**: \`${employee_id}\`
- **Year**: ${year}
- **Number of Privilege Balances**: ${group.count}

| Balance ID | Policy Name | Status | Opening | Used | Closing | Created At | Updated At |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
`;

      for (const bal of group.balances) {
        const policy = await LeavePolicy.findById(bal.leave_policy_id).select('policy_name status').lean();
        const policyName = policy ? policy.policy_name : 'Unknown Policy';
        const policyStatus = policy ? policy.status : 'N/A';
        const createdStr = bal.createdAt.toISOString().slice(0, 19).replace('T', ' ');
        const updatedStr = bal.updatedAt.toISOString().slice(0, 19).replace('T', ' ');
        
        mdContent += `| \`${bal.balance_id}\` | ${policyName} | ${policyStatus} | ${bal.opening_balance} | ${bal.used} | ${bal.closing_balance} | ${createdStr} | ${updatedStr} |\n`;
      }
      mdContent += `\n---\n\n`;
      index++;
    }

    fs.writeFileSync(ARTIFACT_PATH, mdContent, 'utf8');
    console.log(`Report successfully written to ${ARTIFACT_PATH}`);
    process.exit(0);
  } catch (err) {
    console.error('Error during run:', err);
    process.exit(1);
  }
}

run();
