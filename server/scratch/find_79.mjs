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

        // Let's test different combinations to find where "79" comes from for GIM/COK:

        // 1. Total pending jobs for GIM + COK (no date/month filter, but yes year filter)
        // Let's check for year = '26-27'
        const q1 = {
            status: { $regex: /^pending$/i },
            be_no: { $not: { $regex: /^cancelled$/i } },
            branch_code: { $in: ["GIM", "COK"] },
            year: "26-27"
        };
        console.log("1. GIM/COK Pending in 26-27:", await JobModel.countDocuments(q1));

        // 2. GIM only, pending in 26-27
        const q2 = { ...q1, branch_code: "GIM" };
        console.log("2. GIM Pending in 26-27:", await JobModel.countDocuments(q2));

        // 3. What if we include other statuses?
        // Let's check how many jobs in GIM & COK for year 26-27 have detailed_status: 'Billing Pending' or 'Custom Clearance Completed' (Clearance Completed Tab)
        const q3 = {
            status: { $regex: /^pending$/i },
            detailed_status: { $in: ["Billing Pending", "Custom Clearance Completed"] },
            branch_code: { $in: ["GIM", "COK"] },
            year: "26-27"
        };
        console.log("3. Clearance Completed GIM/COK in 26-27 (regardless of cancelled be_no):", await JobModel.countDocuments(q3));

        // 4. What about Tab 0 (Import Billing) without bill_document_sent_to_accounts condition but with year '26-27' and branch GIM/COK?
        // Wait, if it didn't have bill_document_sent_to_accounts condition, it would be identical to q1 (128).

        // 5. Let's list all pending jobs for GIM/COK in 26-27 and check their fields to see why they might equal 79
        // Maybe some of them have billing completed?
        const q5 = {
            status: { $regex: /^pending$/i },
            be_no: { $not: { $regex: /^cancelled$/i } },
            branch_code: { $in: ["GIM", "COK"] },
            year: "26-27",
            // billing_completed_date must NOT exist/be empty
            $or: [
                { billing_completed_date: { $exists: false } },
                { billing_completed_date: "" },
                { billing_completed_date: null },
            ]
        };
        console.log("5. GIM/COK Pending in 26-27 (Unbilled only):", await JobModel.countDocuments(q5));

        // 6. What if year is "25-26"?
        const q6 = { ...q1, year: "25-26" };
        console.log("6. GIM/COK Pending in 25-26:", await JobModel.countDocuments(q6));

        // 7. GIM only, pending in 26-27, Unbilled
        const q7 = { ...q5, branch_code: "GIM" };
        console.log("7. GIM Pending in 26-27 (Unbilled only):", await JobModel.countDocuments(q7));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
