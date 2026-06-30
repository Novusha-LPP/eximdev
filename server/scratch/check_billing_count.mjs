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

        // Import Billing default query: status=pending + detailed_status IN ["Billing Pending", "Custom Clearance Completed"]
        // NO date filter at all
        const billingPageCount = await JobModel.countDocuments({
            status: { $regex: /^pending$/i },
            detailed_status: { $in: ["Billing Pending", "Custom Clearance Completed"] },
        });
        console.log(`Import Billing page count (Billing Pending + Custom Clearance Completed, ALL TIME): ${billingPageCount}`);

        // Breakdown
        const bp = await JobModel.countDocuments({ status: { $regex: /^pending$/i }, detailed_status: "Billing Pending" });
        const cc = await JobModel.countDocuments({ status: { $regex: /^pending$/i }, detailed_status: "Custom Clearance Completed" });
        console.log(`  Billing Pending: ${bp}`);
        console.log(`  Custom Clearance Completed: ${cc}`);
        console.log(`  Sum: ${bp + cc}`);

        process.exit(0);
    } catch(e) { console.error(e); process.exit(1); }
};
run();
