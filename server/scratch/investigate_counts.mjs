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

        // 1) What Import Billing sees: detailed_status = "Billing Pending", no date filter
        const billingPendingAll = await JobModel.countDocuments({
            detailed_status: "Billing Pending",
            be_no: { $not: { $regex: /^cancelled$/i } },
        });
        console.log(`\n=== Import Billing (Billing Pending, all time) === ${billingPendingAll}`);

        // 2) Same but status=pending
        const billingPendingWithStatus = await JobModel.countDocuments({
            detailed_status: "Billing Pending",
            status: { $regex: /^pending$/i },
            be_no: { $not: { $regex: /^cancelled$/i } },
        });
        console.log(`Billing Pending + status=pending: ${billingPendingWithStatus}`);

        // 3) What does Import Billing ACTUALLY query? Let's check status values for billing pending jobs
        const statusBreakdown = await JobModel.aggregate([
            { $match: { detailed_status: "Billing Pending", be_no: { $not: { $regex: /^cancelled$/i } } } },
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        console.log("\nStatus breakdown for Billing Pending jobs:");
        statusBreakdown.forEach(s => console.log(`  status="${s._id}": ${s.count}`));

        // 4) Pending job summary month-wise June 2026
        const juneJobs = await JobModel.aggregate([
            { $match: { status: { $regex: /^pending$/i }, be_no: { $not: { $regex: /^cancelled$/i } } } },
            { $addFields: { parsedJobDate: { $cond: { if: { $and: [{ $ne: ["$job_date", null] }, { $ne: ["$job_date", ""] }, { $regexMatch: { input: "$job_date", regex: /^\d{4}-\d{2}-\d{2}/ } }] }, then: { $toDate: "$job_date" }, else: null } } } },
            { $match: { $expr: { $and: [{ $eq: [{ $month: "$parsedJobDate" }, 6] }, { $eq: [{ $year: "$parsedJobDate" }, 2026] }] } } },
            { $count: "total" }
        ]);
        console.log(`\nPending jobs in June 2026 (month filter): ${juneJobs[0]?.total || 0}`);

        // 5) All pending jobs, no date filter
        const allPending = await JobModel.countDocuments({
            status: { $regex: /^pending$/i },
            be_no: { $not: { $regex: /^cancelled$/i } },
        });
        console.log(`All pending jobs (no date filter): ${allPending}`);

        // 6) Category breakdown for June
        const juneCats = await JobModel.aggregate([
            { $match: { status: { $regex: /^pending$/i }, be_no: { $not: { $regex: /^cancelled$/i } } } },
            { $addFields: { parsedJobDate: { $cond: { if: { $and: [{ $ne: ["$job_date", null] }, { $ne: ["$job_date", ""] }, { $regexMatch: { input: "$job_date", regex: /^\d{4}-\d{2}-\d{2}/ } }] }, then: { $toDate: "$job_date" }, else: null } } } },
            { $match: { $expr: { $and: [{ $eq: [{ $month: "$parsedJobDate" }, 6] }, { $eq: [{ $year: "$parsedJobDate" }, 2026] }] } } },
            { $group: { _id: { $ifNull: ["$detailed_status", "Uncategorized"] }, count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        console.log("\nCategory breakdown for June 2026 pending jobs:");
        let juneTotal = 0;
        juneCats.forEach(c => { console.log(`  ${c._id}: ${c.count}`); juneTotal += c.count; });
        console.log(`  TOTAL: ${juneTotal}`);

        // 7) All-time category breakdown
        const allCats = await JobModel.aggregate([
            { $match: { status: { $regex: /^pending$/i }, be_no: { $not: { $regex: /^cancelled$/i } } } },
            { $group: { _id: { $ifNull: ["$detailed_status", "Uncategorized"] }, count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        console.log("\nCategory breakdown ALL TIME pending jobs:");
        let allTotal = 0;
        allCats.forEach(c => { console.log(`  ${c._id}: ${c.count}`); allTotal += c.count; });
        console.log(`  TOTAL: ${allTotal}`);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};
run();
