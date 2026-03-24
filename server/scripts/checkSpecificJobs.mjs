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
        const Job = mongoose.model('Job', new mongoose.Schema({}, { strict: false }));

        // Find one GIM job
        const gimJob = await Job.findOne({ job_number: { $regex: /^GIM/i } }).lean();
        // Find one AMD job
        const amdJob = await Job.findOne({ job_number: { $regex: /^AMD/i } }).lean();

        console.log('--- GIM JOB ---');
        if (gimJob) {
            console.log('ID:', gimJob._id);
            console.log('Job No:', gimJob.job_no);
            console.log('Job Number:', gimJob.job_number);
            console.log('Branch ID:', gimJob.branch_id, 'Type:', typeof gimJob.branch_id);
            console.log('Branch Code:', gimJob.branch_code);
        } else {
            console.log('No GIM job found.');
        }

        console.log('\n--- AMD JOB ---');
        if (amdJob) {
            console.log('ID:', amdJob._id);
            console.log('Job No:', amdJob.job_no);
            console.log('Job Number:', amdJob.job_number);
            console.log('Branch ID:', amdJob.branch_id, 'Type:', typeof amdJob.branch_id);
            console.log('Branch Code:', amdJob.branch_code);
        } else {
            console.log('No AMD job found.');
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkJobs();
