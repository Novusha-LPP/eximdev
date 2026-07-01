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
        console.log("Connected to DB.");

        const matchStage = {
            status: { $regex: "^pending$", $options: "i" },
            be_no: { $not: { $regex: "^cancelled$", $options: "i" } },
            bill_document_sent_to_accounts: {
                $exists: true,
                $nin: [null, ""],
            },
            $or: [
                { billing_completed_date: { $exists: false } },
                { billing_completed_date: "" },
                { billing_completed_date: null },
                {
                    $and: [
                        { billing_completed_date: { $exists: true, $ne: "" } },
                        { dsr_queries: { $elemMatch: { select_module: "Accounts", resolved: { $ne: true } } } }
                    ]
                }
            ]
        };

        const jobs = await JobModel.find(matchStage).select('job_date be_no status').limit(20);
        console.log("Sample jobs:");
        jobs.forEach(j => console.log(j.job_date));
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
