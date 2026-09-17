import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import OpenPointProject from '../model/openPoints/openPointProjectModel.mjs';
import OpenPoint from '../model/openPoints/openPointModel.mjs';
import MRMItem from '../model/mrm/mrmItemModel.mjs';
import UserModel from '../model/userModel.mjs';
import { syncActionPlanToOpenPoint } from '../services/mrmOpenPointsSyncService.mjs';

const getMongoUri = () => {
    if (process.env.NODE_ENV === 'production') return process.env.PROD_MONGODB_URI;
    if (process.env.NODE_ENV === 'server') return process.env.SERVER_MONGODB_URI;
    return process.env.DEV_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/eximNew';
};

async function runMigration() {
    const uri = getMongoUri();
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected successfully.');

    try {
        // -------------------------------------------------------------
        // STEP 1: Disambiguate Legacy "MRM Open Points" (MOP) Project
        // -------------------------------------------------------------
        console.log('\n--- Step 1: Disambiguating Legacy Project ---');
        const legacyProject = await OpenPointProject.findOne({
            $or: [
                { _id: new mongoose.Types.ObjectId('6997f2374d307b060bed4fe9') },
                { name: 'MRM Open Points', initials: 'MOP' }
            ]
        });

        if (legacyProject) {
            legacyProject.name = '[Legacy] MRM Open Points (Feb 2026)';
            legacyProject.status = 'Archived';
            legacyProject.description = 'Historical manual MRM open points created in February 2026';
            await legacyProject.save();
            console.log(`✅ Renamed legacy project to "${legacyProject.name}" (status: Archived)`);
        } else {
            console.log('Legacy project already renamed or not found.');
        }

        // -------------------------------------------------------------
        // STEP 2: Ensure "MRM Action Points" (MRM) Project & Team Members
        // -------------------------------------------------------------
        console.log('\n--- Step 2: Populating Team Members for MRM Action Points ---');
        let mrmProject = await OpenPointProject.findOne({
            $or: [{ name: 'MRM Action Points' }, { initials: 'MRM' }]
        });

        const ownerUser = await UserModel.findOne({ username: 'suraj_rajan' }) ||
                          await UserModel.findOne({ role: { $in: ['Admin', 'admin'] } }) ||
                          await UserModel.findOne();

        if (!mrmProject) {
            mrmProject = new OpenPointProject({
                name: 'MRM Action Points',
                initials: 'MRM',
                description: 'Automated action points originating from Monthly Review Meetings (MRM).',
                owner: ownerUser?._id,
                status: 'Active',
                team_members: []
            });
            await mrmProject.save();
            console.log('Created MRM Action Points project.');
        }

        // Get all active users (excluding vehicle drivers)
        const activeUsers = await UserModel.find({
            status: { $ne: 'Inactive' },
            role: { $nin: ['driver'] }
        }).select('_id username role');

        const existingMemberIds = new Set((mrmProject.team_members || []).map(m => m.user?.toString()));
        let membersAdded = 0;

        activeUsers.forEach(u => {
            const uidStr = u._id.toString();
            if (!existingMemberIds.has(uidStr) && uidStr !== mrmProject.owner?.toString()) {
                mrmProject.team_members.push({
                    user: u._id,
                    role: ['Admin', 'admin'].includes(u.role) ? 'L4' : 'L2'
                });
                existingMemberIds.add(uidStr);
                membersAdded++;
            }
        });

        if (membersAdded > 0) {
            await mrmProject.save();
            console.log(`✅ Added ${membersAdded} active employees to MRM Action Points team members.`);
        } else {
            console.log(`Team members already up to date (${mrmProject.team_members.length} members).`);
        }

        // -------------------------------------------------------------
        // STEP 3: Backfill Unsynced Historical MRM Items with Action Plans
        // -------------------------------------------------------------
        console.log('\n--- Step 3: Backfilling Historical 2026 MRM Items ---');
        const unsyncedItems = await MRMItem.find({
            year: 2026,
            actionPlan: { $exists: true, $ne: '' },
            $or: [{ openPointId: { $exists: false } }, { openPointId: null }]
        }).sort({ year: 1, month: 1, seq: 1, createdAt: 1 });

        console.log(`Found ${unsyncedItems.length} unsynced MRM items to process.`);

        let syncedCount = 0;
        let createdPointCount = 0;
        let linkedExistingCount = 0;

        for (let i = 0; i < unsyncedItems.length; i++) {
            const item = unsyncedItems[i];
            const beforeCount = await OpenPoint.countDocuments({ project_id: mrmProject._id });

            const point = await syncActionPlanToOpenPoint(item, ownerUser);
            if (point) {
                syncedCount++;
                const afterCount = await OpenPoint.countDocuments({ project_id: mrmProject._id });
                if (afterCount > beforeCount) {
                    createdPointCount++;
                } else {
                    linkedExistingCount++;
                }
            }

            if ((i + 1) % 250 === 0 || i === unsyncedItems.length - 1) {
                console.log(`Progress: ${i + 1}/${unsyncedItems.length} items processed (${syncedCount} synced: ${createdPointCount} new points, ${linkedExistingCount} linked recurring).`);
            }
        }

        // Final verification counts
        const totalMRMOpenPoints = await OpenPoint.countDocuments({ originModule: 'MRM' });
        const remainingUnsynced = await MRMItem.countDocuments({
            actionPlan: { $exists: true, $ne: '' },
            $or: [{ openPointId: { $exists: false } }, { openPointId: null }]
        });

        console.log('\n======================================================');
        console.log('MIGRATION SUMMARY');
        console.log('======================================================');
        console.log(`Total MRM Items Synced: ${syncedCount}`);
        console.log(`New Open Points Created: ${createdPointCount}`);
        console.log(`Recurring Linked Points: ${linkedExistingCount}`);
        console.log(`Total Active MRM Open Points in Project: ${totalMRMOpenPoints}`);
        console.log(`Remaining Unsynced Items: ${remainingUnsynced}`);
        console.log('======================================================\n');

    } catch (error) {
        console.error('Migration failed with error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

runMigration();
