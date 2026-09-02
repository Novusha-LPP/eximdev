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

        // The query from /api/get-billing-ready-jobs:
        const baseQuery = {
            $and: [
                { status: { $regex: /^pending$/i } },
                {
                    detailed_status: {
                        $in: ["Billing Pending", "Custom Clearance Completed"],
                    },
                },
                { branch_code: { $in: ["GIM", "COK"] } },
                { year: "26-27" } // default year in billing tab
            ],
        };

        const readyJobsCount = await JobModel.countDocuments(baseQuery);
        console.log("Total matching jobs in Clearance Completed query (for year 26-27, GIM/COK):", readyJobsCount);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
