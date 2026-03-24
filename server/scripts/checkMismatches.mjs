import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

async function checkMismatches() {
    try {
        await mongoose.connect(process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI);
        const JobModel = mongoose.models.Job || mongoose.model('Job', new mongoose.Schema({ branch_id: mongoose.Schema.Types.ObjectId, job_number: String }, { strict: false }));
        const BranchModel = mongoose.models.Branch || mongoose.model('Branch', new mongoose.Schema({ branch_code: String }, { strict: false }));

        const branches = await BranchModel.find({}).lean();
        const amd = branches.find(b => b.branch_code === "AMD");
        const gim = branches.find(b => b.branch_code === "GIM");

        console.log('--- Checking for GIM/AMD Mismatches ---');

        const gimWithAmdId = await JobModel.countDocuments({
            job_number: { $regex: /^GIM/i },
            branch_id: amd._id
        });
        console.log(`Jobs starting with GIM but having AMD ID: ${gimWithAmdId}`);

        const amdWithGimId = await JobModel.countDocuments({
            job_number: { $regex: /^AMD/i },
            branch_id: gim._id
        });
        console.log(`Jobs starting with AMD but having GIM ID: ${amdWithGimId}`);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkMismatches();
