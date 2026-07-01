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
        const todayParts = today.split('-'); // [2026, 06, 30]
        const todayRegex = new RegExp(`^(${today}|${todayParts[2]}-${todayParts[1]}-${todayParts[0]}|${todayParts[2]}/${todayParts[1]}/${todayParts[0]})`);

        const matchStage = {
            status: { $regex: "^pending$", $options: "i" },
            be_no: { $not: { $regex: "^cancelled$", $options: "i" } },
            job_date: { $regex: todayRegex }
        };

        const todayJobs = await JobModel.find(matchStage);
        console.log(`Total pending jobs for today (pure pending only):`, todayJobs.length);
        
        const allJobsToday = await JobModel.find({ job_date: { $regex: todayRegex } });
        console.log(`Total ANY jobs for today:`, allJobsToday.length);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
