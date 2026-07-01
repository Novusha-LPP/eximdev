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

        // The query from getImportBilling.js for GIM/COK:
        const baseQuery = {
            $and: [
                { status: { $regex: /^pending$/i } },
                {
                    bill_document_sent_to_accounts: {
                        $exists: true,
                        $nin: [null, ""],
                    },
                },
                {
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
                    ],
                },
                { branch_code: { $in: ["GIM", "COK"] } },
                { year: "26-27" } // default year in billing tab
            ],
        };

        const billingJobsCount = await JobModel.countDocuments(baseQuery);
        console.log("Total matching jobs in main Import Billing query (for year 26-27, GIM/COK):", billingJobsCount);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
