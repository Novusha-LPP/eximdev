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

        // Count jobs in June 2026 manually
        const jobs = await JobModel.find({
            status: { $regex: /^pending$/i },
        });

        let juneCount = 0;
        let juneBillingCount = 0;
        const monthCounts = {};

        jobs.forEach(j => {
            if (j.job_date && j.job_date.startsWith('2026-06')) {
                juneCount++;
                if (j.detailed_status === 'Billing Pending') juneBillingCount++;
            }
            if (j.job_date) {
                const month = j.job_date.substring(0, 7);
                monthCounts[month] = (monthCounts[month] || 0) + 1;
            }
        });

        console.log(`Total Pending Jobs: ${jobs.length}`);
        console.log(`Pending Jobs in June 2026 (based on job_date string): ${juneCount}`);
        console.log(`Billing Pending Jobs in June 2026: ${juneBillingCount}`);
        console.log(`Month Breakdown:`, monthCounts);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
