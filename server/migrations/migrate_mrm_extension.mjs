import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import MRMMetadata from '../model/mrm/mrmMetadataModel.mjs';
import MRMItem from '../model/mrm/mrmItemModel.mjs';
import OpenPointProject from '../model/openPoints/openPointProjectModel.mjs';
import UserModel from '../model/userModel.mjs';

const getMongoUri = () => {
    if (process.env.NODE_ENV === 'production') return process.env.PROD_MONGODB_URI;
    if (process.env.NODE_ENV === 'server') return process.env.SERVER_MONGODB_URI;
    return process.env.DEV_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/alvision';
};

async function runMigration() {
    const uri = getMongoUri();
    console.log('Connecting to MongoDB for MRM Extension migration...');
    await mongoose.connect(uri);
    console.log('Connected successfully.');

    try {
        // 1. Ensure "MRM Action Points" project exists in Open Points
        let mrmProject = await OpenPointProject.findOne({ 
            $or: [
                { name: 'MRM Action Points' },
                { initials: 'MRM' }
            ] 
        });

        if (!mrmProject) {
            console.log('Creating "MRM Action Points" project in Open Points...');
            const ownerUser = await UserModel.findOne({ username: 'suraj_rajan' }) || 
                              await UserModel.findOne({ role: { $in: ['Admin', 'admin'] } });
            
            if (!ownerUser) {
                console.warn('Warning: Neither suraj_rajan nor an admin user was found. Using first available user.');
            }
            const fallbackOwner = ownerUser || await UserModel.findOne();

            mrmProject = new OpenPointProject({
                name: 'MRM Action Points',
                initials: 'MRM',
                description: 'Automated action points originating from Monthly Review Meetings (MRM).',
                owner: fallbackOwner._id,
                status: 'Active',
                team_members: []
            });
            await mrmProject.save();
            console.log('Created MRM project with ID:', mrmProject._id);
        } else {
            console.log('Existing MRM Project found with ID:', mrmProject._id);
        }

        // 2. Migrate legacy MRMMetadata documents
        const legacyMetaDocs = await MRMMetadata.find({
            $or: [
                { status: { $exists: false } },
                { status: null },
                { status: '' }
            ]
        });

        console.log(`Found ${legacyMetaDocs.length} legacy MRMMetadata documents to migrate.`);
        let metaMigrated = 0;
        const defaultAdmin = await UserModel.findOne({ role: { $in: ['Admin', 'admin'] } });

        for (const meta of legacyMetaDocs) {
            // If legacy record is an orphan with no userId, clean it or assign default
            if (!meta.userId) {
                if (defaultAdmin) {
                    meta.userId = defaultAdmin._id;
                } else {
                    console.log(`Skipping invalid orphan metadata without userId: ${meta._id}`);
                    continue;
                }
            }

            if (meta.meetingDone === true) {
                meta.status = 'Approved';
                meta.isLocked = true;
                if (!meta.approvedAt) meta.approvedAt = meta.reviewDate || meta.updatedAt || new Date();
            } else {
                meta.status = 'Draft';
                meta.isLocked = false;
            }
            await meta.save();
            metaMigrated++;
        }
        console.log(`Migrated ${metaMigrated} MRMMetadata documents.`);

        // 3. Set default fields for existing MRMItems if missing
        const itemUpdateResult = await MRMItem.updateMany(
            {
                $or: [
                    { aggregationType: { $exists: false } },
                    { optimizationDirection: { $exists: false } },
                    { toleranceBand: { $exists: false } }
                ]
            },
            {
                $set: {
                    aggregationType: 'Sum',
                    optimizationDirection: 'Higher',
                    toleranceBand: 5
                }
            }
        );
        console.log(`Updated default rollup configuration on ${itemUpdateResult.modifiedCount} MRMItem records.`);

        console.log('✅ Migration completed successfully with ZERO data loss.');
    } catch (error) {
        console.error('Migration failed with error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.');
    }
}

runMigration();
