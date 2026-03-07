import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

async function checkGIMStatus() {
    try {
        await mongoose.connect(process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI);
        const JobModel = mongoose.models.Job || mongoose.model('Job', new mongoose.Schema({ branch_id: mongoose.Schema.Types.ObjectId, status: String }, { strict: false }));

        console.log('--- Status Breakdown for GIM (69abeef20a6647027c4a09c1) ---');
        const gimId = new mongoose.Types.ObjectId('69abeef20a6647027c4a09c1');
        const counts = await JobModel.aggregate([
            { $match: { branch_id: gimId } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        counts.forEach(c => console.log(`${c._id || 'NO_STATUS'}: ${c.count}`));

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkGIMStatus();
