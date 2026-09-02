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
        console.log("Connected to DB:", uri);

        // Fetch the 20 most recently added jobs
        const recentJobs = await JobModel.find({}).sort({ _id: -1 }).limit(20).select('job_date job_no status bill_document_sent_to_accounts');
        console.log("Most recent jobs in the database:");
        recentJobs.forEach(j => {
            console.log(`Job No: ${j.job_no} | Date: ${j.job_date} | Status: ${j.status} | Bill Sent: ${j.bill_document_sent_to_accounts}`);
        });

        // Let's also specifically search for jobs with today's date in any format
        const today = new Date().toISOString().split('T')[0];
        const todayParts = today.split('-'); // [2026, 06, 30]
        const todayRegex = new RegExp(`(${today}|${todayParts[2]}-${todayParts[1]}-${todayParts[0]}|${todayParts[2]}/${todayParts[1]}/${todayParts[0]})`);
        
        const todaysJobs = await JobModel.find({ job_date: { $regex: todayRegex } }).limit(5).select('job_date job_no status');
        console.log(`\nJobs matching today's date (${todayRegex.source}):`, todaysJobs.length);
        todaysJobs.forEach(j => console.log(j.job_date));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
