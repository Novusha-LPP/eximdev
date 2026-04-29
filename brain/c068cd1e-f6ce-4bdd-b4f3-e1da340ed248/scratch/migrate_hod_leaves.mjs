import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../server/.env') });

const MONGODB_URI = process.env.PROD_MONGODB_URI || 'mongodb://localhost:27017/exim';

const STAGE_2_APPROVER_USERNAME = 'shalini_arun';

async function migrate() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        const db = mongoose.connection.db;
        const usersCol = db.collection('users');
        const teamsCol = db.collection('teams');
        const leavesCol = db.collection('leaveapplications');

        // 1. Identify all HODs
        console.log('Identifying HODs...');
        const activeTeams = await teamsCol.find({ isActive: { $ne: false } }).toArray();
        const hodUserIds = new Set();
        
        activeTeams.forEach(team => {
            if (team.hodId) hodUserIds.add(team.hodId.toString());
        });

        const hodRoleUsers = await usersCol.find({
            role: { $regex: /HOD|HEADOFDEPARTMENT/i },
            isActive: true
        }).toArray();
        
        hodRoleUsers.forEach(u => hodUserIds.add(u._id.toString()));

        const hodIds = Array.from(hodUserIds).map(id => new mongoose.Types.ObjectId(id));
        console.log(`Found ${hodIds.length} HODs.`);

        // 2. Find Shalini
        const shalini = await usersCol.findOne({ username: STAGE_2_APPROVER_USERNAME, isActive: true });
        if (!shalini) {
            console.error('Shalini Arun user not found. Aborting.');
            process.exit(1);
        }
        console.log(`Shalini ID: ${shalini._id}`);

        // 3. Find pending applications by HODs at stage_1_hod
        const applications = await leavesCol.find({
            employee_id: { $in: hodIds },
            approval_status: { $in: ['pending', 'pending_hod'] },
            approval_stage: 'stage_1_hod'
        }).toArray();

        console.log(`Found ${applications.length} applications to migrate.`);

        if (applications.length === 0) {
            console.log('Nothing to migrate.');
            process.exit(0);
        }

        const now = new Date();
        let updatedCount = 0;

        for (const app of applications) {
            console.log(`Migrating application ${app.application_number} (Employee: ${app.employee_id})...`);

            const newChain = (app.approval_chain || []).map(step => {
                if (step.stage === 'stage_1_hod') {
                    return {
                        ...step,
                        action: 'approved',
                        action_date: now,
                        comments: 'Migrated: Stage skipped for HOD requester',
                        approver_id: app.employee_id // Attributed to self-approval skip
                    };
                }
                if (step.stage === 'stage_2_shalini') {
                    return {
                        ...step,
                        action: 'pending',
                        approver_id: shalini._id,
                        approver_username: STAGE_2_APPROVER_USERNAME
                    };
                }
                return step;
            });

            // Ensure Level 2 exists in chain
            if (!newChain.find(s => s.stage === 'stage_2_shalini')) {
                newChain.push({
                    level: 2,
                    stage: 'stage_2_shalini',
                    approver_id: shalini._id,
                    approver_username: STAGE_2_APPROVER_USERNAME,
                    approver_role: 'ADMIN',
                    action: 'pending'
                });
            }

            await leavesCol.updateOne(
                { _id: app._id },
                {
                    $set: {
                        approval_stage: 'stage_2_shalini',
                        current_approver_id: shalini._id,
                        approval_status: 'pending',
                        approval_chain: newChain,
                        updatedAt: now
                    }
                }
            );
            updatedCount++;
        }

        console.log(`Successfully migrated ${updatedCount} applications.`);
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
