import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BranchModel from '../model/branchModel.mjs';

dotenv.config({ path: './server/.env' });

const MONGO_URI = process.env.SERVER_MONGODB_URI || process.env.DEV_MONGODB_URI || 'mongodb://localhost:27017/eximNew';

async function repair() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const collection = mongoose.connection.db.collection('branches');

        // Drop conflicting unique indexes if they exist
        try {
            await collection.dropIndex('branch_name_1');
            console.log('Dropped unique index branch_name_1');
        } catch (e) { console.log('index branch_name_1 not found or already dropped'); }

        try {
            await collection.dropIndex('branch_code_1');
            console.log('Dropped unique index branch_code_1');
        } catch (e) { console.log('index branch_code_1 not found or already dropped'); }

        const allBranches = await BranchModel.find();
        const branchCodes = [...new Set(allBranches.map(b => b.branch_code))];

        console.log(`Found ${branchCodes.length} unique branch codes.`);

        for (const code of branchCodes) {
            const variants = allBranches.filter(b => b.branch_code === code);
            const categories = variants.map(v => v.category);

            const hasSea = categories.includes('SEA');
            const hasAir = categories.includes('AIR');

            if (hasSea && !hasAir) {
                console.log(`Branch ${code} is missing AIR category. Creating...`);
                const source = variants.find(v => v.category === 'SEA');
                const airBranch = new BranchModel({
                    branch_name: source.branch_name,
                    branch_code: source.branch_code,
                    category: 'AIR',
                    is_active: source.is_active,
                    created_by: 'system_repair'
                });
                await airBranch.save();
                console.log(`Created AIR variant for ${code}`);
            } else if (!hasSea && hasAir) {
                console.log(`Branch ${code} is missing SEA category. Creating...`);
                const source = variants.find(v => v.category === 'AIR');
                const seaBranch = new BranchModel({
                    branch_name: source.branch_name,
                    branch_code: source.branch_code,
                    category: 'SEA',
                    is_active: source.is_active,
                    created_by: 'system_repair'
                });
                await seaBranch.save();
                console.log(`Created SEA variant for ${code}`);
            } else {
                console.log(`Branch ${code} already has both variants (or something is weird). Skipping.`);
            }
        }

        console.log('Repair complete!');
        process.exit(0);
    } catch (error) {
        console.error('Repair failed:', error);
        process.exit(1);
    }
}

repair();
