import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

async function checkJobs() {
    try {
        await mongoose.connect(process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI);

        // Define schemas to avoid missing models
        const BranchSchema = new mongoose.Schema({ branch_name: String, branch_code: String }, { strict: false });
        const BranchModel = mongoose.models.Branch || mongoose.model('Branch', BranchSchema);

        const JobSchema = new mongoose.Schema({ job_number: String, branch_id: mongoose.Schema.Types.ObjectId }, { strict: false });
        const JobModel = mongoose.models.Job || mongoose.model('Job', JobSchema);

        console.log('--- Branches ---');
        const branches = await BranchModel.find({}).lean();
        branches.forEach(b => console.log(`${b.branch_code}: ${b._id} (${b.branch_name})`));

        console.log('\n--- GIM Job Samples (Job Number starts with GIM) ---');
        const gimJobs = await JobModel.find({
            $or: [
                { job_no: /^GIM/ },
                { job_number: /^GIM/ }
            ]
        }).limit(10).lean();

        if (gimJobs.length === 0) {
            console.log('No GIM jobs found by prefix.');
        } else {
            gimJobs.forEach(j => {
                const branchMatch = branches.find(b => b._id.toString() === (j.branch_id || '').toString());
                console.log(`Job: ${j.job_number || j.job_no} | BranchID: ${j.branch_id} | Branch: ${branchMatch ? branchMatch.branch_code : 'Unknown'}`);
            });
        }

        console.log('\n--- Jobs with NO Branch ID ---');
        const noBranchJobs = await JobModel.find({ branch_id: null }).limit(5).lean();
        noBranchJobs.forEach(j => console.log(`Job: ${j.job_number || j.job_no} | BranchID: ${j.branch_id}`));

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkJobs();
