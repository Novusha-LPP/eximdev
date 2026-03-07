import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const JobSchema = new mongoose.Schema({ job_no: String, job_number: String, branch_id: mongoose.Schema.Types.ObjectId, branch_code: String }, { strict: false });
const BranchSchema = new mongoose.Schema({ branch_code: String }, { strict: false });

async function fixJobBranches() {
    try {
        await mongoose.connect(process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI);
        const JobModel = mongoose.models.Job || mongoose.model('Job', JobSchema);
        const BranchModel = mongoose.models.Branch || mongoose.model('Branch', BranchSchema);

        // 1. Get GIM branch ID
        const gimBranch = await BranchModel.findOne({ branch_code: "GIM" });
        if (!gimBranch) {
            console.error("GIM branch not found!");
            process.exit(1);
        }
        const gimId = gimBranch._id;
        console.log(`GIM Branch ID: ${gimId}`);

        // 2. Fix jobs with null branch_id but GIM-like job_number
        const filter = {
            $or: [
                { job_no: /^GIM/ },
                { job_number: /^GIM/ },
                { branch_code: "GIM" }
            ],
            branch_id: null
        };

        const countToUpdate = await JobModel.countDocuments(filter);
        console.log(`Found ${countToUpdate} GIM jobs with null branch_id.`);

        if (countToUpdate > 0) {
            const result = await JobModel.updateMany(filter, {
                $set: {
                    branch_id: gimId,
                    branch_code: "GIM"
                }
            });
            console.log(`Updated ${result.modifiedCount} jobs to GIM.`);
        }

        // 3. Fix AMD jobs if any (branch_code matching but branch_id null?)
        const amdBranch = await BranchModel.findOne({ branch_code: "AMD" });
        if (amdBranch) {
            const amdId = amdBranch._id;
            const amdFilter = { branch_code: "AMD", branch_id: null };
            const amdCount = await JobModel.countDocuments(amdFilter);
            console.log(`Found ${amdCount} AMD jobs with null branch_id.`);
            if (amdCount > 0) {
                await JobModel.updateMany(amdFilter, { $set: { branch_id: amdId } });
                console.log(`Updated ${amdCount} jobs to AMD.`);
            }
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

fixJobBranches();
