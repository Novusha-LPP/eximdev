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

        // Let's count jobs matching GIM/COK, status pending, be_no not cancelled
        // Let's see how many there are in total for year "26-27" (which is probably the selected year in Import Billing)
        // Let's fetch distinct years from these jobs to see what year formats exist
        
        const jobs = await JobModel.find({
            status: { $regex: /^pending$/i },
            be_no: { $not: { $regex: /^cancelled$/i } },
            branch_code: { $in: ["GIM", "COK"] }
        }).select('year job_date');

        console.log("Total GIM & COK pending jobs all-time:", jobs.length);
        
        const yearCounts = {};
        jobs.forEach(j => {
            yearCounts[j.year] = (yearCounts[j.year] || 0) + 1;
        });
        console.log("\nCounts by 'year' field:");
        console.log(yearCounts);

        // Let's also parse job_date and group by month for the year 2026
        const monthlyCounts = {};
        jobs.forEach(j => {
            if (j.job_date && j.job_date.startsWith('2026-')) {
                const month = j.job_date.substring(5, 7);
                monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
            }
        });
        console.log("\nCounts by month in 2026 (using job_date):");
        console.log(monthlyCounts);

        // Let's calculate count for June 2026 (month "06") + counts for all other months in 2026
        const juneCount = monthlyCounts['06'] || 0;
        console.log("June 2026 Count:", juneCount);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
