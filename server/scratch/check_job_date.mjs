import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });
import JobModel from '../model/jobModel.mjs';

const run = async () => {
    try {
        const uri = process.env.NODE_ENV === 'production' ? process.env.PROD_MONGODB_URI :
            process.env.NODE_ENV === 'server' ? process.env.SERVER_MONGODB_URI :
            process.env.DEV_MONGODB_URI || 'mongodb://127.0.0.1:27017/exim';
            
        await mongoose.connect(uri);
        console.log("Connected to DB");

        const today = new Date().toISOString().split('T')[0];
        console.log("Today is:", today);

        // Fetch a few recent jobs to see their job_date format
        const jobs = await JobModel.find({
            status: { $regex: /^pending$/i },
            branch_code: { $in: ["GIM", "COK"] }
        }).sort({ _id: -1 }).limit(10).select('job_date created_at');

        console.log("Recent pending jobs in GIM/COK:");
        jobs.forEach(j => {
            console.log(`- job_date: "${j.job_date}" | created_at: ${j.created_at}`);
        });

        // Also let's check how many jobs match the day regex specifically
        const dayMatch = await JobModel.countDocuments({
            status: { $regex: /^pending$/i },
            branch_code: { $in: ["GIM", "COK"] },
            job_date: { $regex: `^${today}` }
        });
        console.log(`Count matching job_date ^${today}: ${dayMatch}`);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
