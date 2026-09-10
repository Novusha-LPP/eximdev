import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import UserModel from '../model/userModel.mjs';
import KPISheetModel from '../model/kpi/kpiSheetModel.mjs';
import MRMSegmentRollup from '../model/mrm/mrmSegmentRollupModel.mjs';
import MRMHodScore from '../model/mrm/mrmHodScoreModel.mjs';

const isDryRun = process.argv.includes('--dry-run');

const getMongoUri = () => {
    if (process.env.NODE_ENV === 'production') return process.env.PROD_MONGODB_URI;
    if (process.env.NODE_ENV === 'server') return process.env.SERVER_MONGODB_URI;
    return process.env.DEV_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/alvision';
};

async function runMigration() {
    console.log(`=======================================================`);
    console.log(`MRM 2.0 Migration: Safe Schema Extension & Rollup Setup`);
    console.log(`Mode: ${isDryRun ? 'DRY-RUN (No writes will be committed)' : 'LIVE EXECUTION'}`);
    console.log(`=======================================================`);

    const uri = getMongoUri();
    console.log(`Connecting to MongoDB (${process.env.NODE_ENV || 'development'})...`);
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully.\n');

    try {
        // 1. Check and update User documents with sub_team and sub_team_role
        console.log('--- 1. Checking User Model (sub_team, sub_team_role) ---');
        const usersNeedingSubTeam = await UserModel.countDocuments({
            $or: [
                { sub_team: { $exists: false } },
                { sub_team: null },
                { sub_team: '' }
            ]
        });
        console.log(`Users without sub_team: ${usersNeedingSubTeam}`);

        if (!isDryRun && usersNeedingSubTeam > 0) {
            const userUpdateRes = await UserModel.updateMany(
                {
                    $or: [
                        { sub_team: { $exists: false } },
                        { sub_team: null },
                        { sub_team: '' }
                    ]
                },
                {
                    $set: {
                        sub_team: 'General',
                        sub_team_role: 'Member'
                    }
                }
            );
            console.log(`Updated ${userUpdateRes.modifiedCount} user documents with default sub_team='General'.`);
        }

        // 2. Check and update KPISheet summary extension fields
        console.log('\n--- 2. Checking KPISheet Model (summary flags) ---');
        const sheetsNeedingSummaryFlags = await KPISheetModel.countDocuments({
            $or: [
                { 'summary.business_loss_nothing_to_report': { $exists: false } },
                { 'summary.blockers_nothing_to_report': { $exists: false } },
                { 'summary.open_points_nothing_to_report': { $exists: false } }
            ]
        });
        console.log(`KPISheet documents without summary flags: ${sheetsNeedingSummaryFlags}`);

        if (!isDryRun && sheetsNeedingSummaryFlags > 0) {
            const sheetUpdateRes = await KPISheetModel.updateMany(
                {
                    $or: [
                        { 'summary.business_loss_nothing_to_report': { $exists: false } },
                        { 'summary.blockers_nothing_to_report': { $exists: false } },
                        { 'summary.open_points_nothing_to_report': { $exists: false } }
                    ]
                },
                {
                    $set: {
                        'summary.business_loss_nothing_to_report': false,
                        'summary.business_loss_remarks': '',
                        'summary.blockers_nothing_to_report': false,
                        'summary.blockers_recurrence_key': '',
                        'summary.open_points_nothing_to_report': false,
                        'summary.open_points_count': 0,
                        'summary.is_submitted_on_time': true
                    }
                }
            );
            console.log(`Updated ${sheetUpdateRes.modifiedCount} KPISheet documents with summary extension defaults.`);
        }

        // 3. Ensure indexes on new collections
        console.log('\n--- 3. Ensuring Indexes on MRMSegmentRollup & MRMHodScore ---');
        if (!isDryRun) {
            await MRMSegmentRollup.syncIndexes();
            console.log('Synchronized indexes for MRMSegmentRollup collection.');
            await MRMHodScore.syncIndexes();
            console.log('Synchronized indexes for MRMHodScore collection.');
        } else {
            console.log('[DRY-RUN] Would sync indexes for MRMSegmentRollup and MRMHodScore.');
        }

        console.log('\n=======================================================');
        console.log(`Migration ${isDryRun ? 'DRY-RUN completed' : 'COMPLETED successfully'}!`);
        console.log('=======================================================');
    } catch (error) {
        console.error('Migration failed with error:', error);
        throw error;
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB connection closed.');
    }
}

runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
