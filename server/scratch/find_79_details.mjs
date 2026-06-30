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

        const qAllTime = {
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
                { branch_code: { $in: ["GIM", "COK"] } }
            ],
        };
        console.log("GIM/COK Main Billing (all time):", await JobModel.countDocuments(qAllTime));

        // Let's check GIM only (all time)
        const qAllTimeGim = { ...qAllTime, branch_code: "GIM" };
        console.log("GIM Main Billing (all time):", await JobModel.countDocuments(qAllTimeGim));

        // Let's check GIM only in "26-27" (already checked, returned 7)
        
        // Wait, what if we run:
        // GIM pending jobs in "26-27" (no billing checks): 120
        // COK pending jobs in "26-27" (no billing checks): 8
        // Total GIM/COK pending in 26-27: 128

        // What if they are on Tab 0 (Import Billing), Year "26-27", and they see 79 because:
        // Let's check:
        const q79 = {
            status: { $regex: /^pending$/i },
            branch_code: "GIM", // they might be on GIM branch only!
            // what if the year is "26-27"?
            // Let's check GIM pending jobs where bill_document_sent_to_accounts is set
            bill_document_sent_to_accounts: { $exists: true, $nin: [null, ""] }
        };
        console.log("GIM pending with bill sent (all time):", await JobModel.countDocuments(q79));
        console.log("GIM pending with bill sent in 26-27:", await JobModel.countDocuments({ ...q79, year: "26-27" }));

        // Wait! Let's check if there are 79 jobs in some detailed_status group
        // If we look at GIM pending jobs in June 2026? June count is 54.
        
        // What if the count of 79 is:
        // GIM pending jobs (all time) of a specific detailed status?
        // Billing Pending is 86 (All years GIM/COK) -> GIM only?
        const qBillingPendingGimAllTime = {
            status: { $regex: /^pending$/i },
            detailed_status: "Billing Pending",
            branch_code: "GIM"
        };
        console.log("GIM Billing Pending (all time):", await JobModel.countDocuments(qBillingPendingGimAllTime));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
