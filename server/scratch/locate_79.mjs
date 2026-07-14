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

        // We want to find out how to get exactly 79 jobs from `/api/get-billing-import-job`
        // Let's check GIM only vs GIM/COK, and what filters can yield 79.
        
        // Let's test the main query with GIM only:
        const qGimMain = {
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
                    ],
                },
                { branch_code: "GIM" },
                { year: "26-27" }
            ],
        };
        console.log("GIM only billing jobs main query:", await JobModel.countDocuments(qGimMain));

        // What about WITHOUT the bill_document_sent_to_accounts requirement but with some other status?
        // Let's check total GIM pending jobs in 26-27 (we saw it was 120).
        
        // Wait, what if the user's Import Billing tab shows 79 because:
        // they are looking at the "Clearance Completed" tab?
        // In my check, Clearance Completed GIM/COK in 26-27 is 60.
        // What if they are looking at GIM only in Clearance Completed?
        const qClearanceGim = {
            status: { $regex: /^pending$/i },
            detailed_status: { $in: ["Billing Pending", "Custom Clearance Completed"] },
            branch_code: "GIM",
            year: "26-27"
        };
        console.log("GIM Clearance Completed count in 26-27:", await JobModel.countDocuments(qClearanceGim));

        // Wait! Let's check how many total jobs are in the database for GIM and COK for Year 26-27 (regardless of status/cancelled)
        const qAllGimCok = {
            branch_code: { $in: ["GIM", "COK"] },
            year: "26-27"
        };
        console.log("Total GIM/COK jobs in 26-27:", await JobModel.countDocuments(qAllGimCok));

        // Let's check other branch combinations. What if they have AMD as well?
        // Wait, AMD alone is 1212.
        
        // Let's write a script to group all jobs in the system by branch, year, status, and bill_document_sent_to_accounts to see if we can locate "79".
        const summary = await JobModel.aggregate([
            { $match: { branch_code: { $in: ["GIM", "COK"] } } },
            {
                $group: {
                    _id: {
                        year: "$year",
                        status: "$status",
                        detailed_status: "$detailed_status",
                        has_bill_sent: { $cond: { if: { $and: [{ $exists: ["$bill_document_sent_to_accounts", true] }, { $ne: ["$bill_document_sent_to_accounts", null] }, { $ne: ["$bill_document_sent_to_accounts", ""] }] }, then: true, else: false } }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);
        console.log("\nCounts for GIM/COK:");
        console.log(JSON.stringify(summary, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
