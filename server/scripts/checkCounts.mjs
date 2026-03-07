import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

async function checkCounts() {
    try {
        await mongoose.connect(process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI);

        // Define schemas to avoid missing models
        const JobSchema = new mongoose.Schema({ branch_id: mongoose.Schema.Types.ObjectId }, { strict: false });
        const JobModel = mongoose.models.Job || mongoose.model('Job', JobSchema);
        const BranchModel = mongoose.models.Branch || mongoose.model('Branch', new mongoose.Schema({}, { strict: false }));

        const branches = await BranchModel.find({}).lean();
        console.log('--- Counts by Branch ---');
        const counts = await JobModel.aggregate([
            { $group: { _id: '$branch_id', count: { $sum: 1 } } }
        ]);

        counts.forEach(c => {
            const branch = branches.find(b => b._id.toString() === (c._id || '').toString());
            console.log(`${branch ? branch.branch_code : (c._id === null ? 'NULL_ID' : 'UNKNOWN')}: ${c.count} (ID: ${c._id})`);
        });

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkCounts();
