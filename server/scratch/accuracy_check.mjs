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

        // 1. Total pending non-cancelled (no date filter - "all time")
        const allPending = await JobModel.countDocuments({
            status: { $regex: /^pending$/i },
            be_no: { $not: { $regex: /^cancelled$/i } },
        });
        console.log("All pending non-cancelled jobs (all time):", allPending);

        // 2. Group by branch (all time)
        const byBranch = await JobModel.aggregate([
            { $match: { status: { $regex: "^pending$", $options: "i" }, be_no: { $not: { $regex: "^cancelled$", $options: "i" } } } },
            { $group: { _id: "$branch_code", count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        console.log("\nBy branch (all time):");
        byBranch.forEach(b => console.log(`  ${b._id || 'null'}: ${b.count}`));

        // 3. Check what the "day" filter does - today
        const today = '2026-06-30';
        const dayFiltered = await JobModel.countDocuments({
            status: { $regex: /^pending$/i },
            be_no: { $not: { $regex: /^cancelled$/i } },
            job_date: { $regex: `^${today}` }
        });
        console.log(`\nPending jobs with job_date starting with "${today}":`, dayFiltered);

        // 4. Group by branch+port+employee for today
        const todayGrouped = await JobModel.aggregate([
            { $match: { status: { $regex: "^pending$", $options: "i" }, be_no: { $not: { $regex: "^cancelled$", $options: "i" } }, job_date: { $regex: `^${today}` } } },
            { $group: { _id: { branch: { $ifNull: ["$branch_code", "Unassigned"] }, port: { $ifNull: ["$port_of_reporting", "Unassigned"] }, employee: { $ifNull: ["$job_owner", "Unassigned"] } }, count: { $sum: 1 } } },
            { $sort: { "_id.branch": 1, count: -1 } }
        ]);
        console.log(`\nGrouped by branch/port/employee for today (${today}):`);
        todayGrouped.forEach(r => console.log(`  ${r._id.branch} | ${r._id.port} | ${r._id.employee}: ${r.count}`));

        // 5. Check what "day" filter the frontend is sending — the user sees 57 which is neither 11 nor 1254
        // Let's check if there's a date mismatch — maybe filterType=day but no day param?
        const noDateFilter = await JobModel.aggregate([
            { $match: { status: { $regex: "^pending$", $options: "i" }, be_no: { $not: { $regex: "^cancelled$", $options: "i" } } } },
            { $addFields: { parsedJobDate: { $cond: { if: { $and: [{ $ne: ["$job_date", null] }, { $ne: ["$job_date", ""] }, { $regexMatch: { input: "$job_date", regex: /^\d{4}-\d{2}-\d{2}/ } }] }, then: { $toDate: "$job_date" }, else: null } } } },
            { $group: { _id: { branch: { $ifNull: ["$branch_code", "Unassigned"] }, port: { $ifNull: ["$port_of_reporting", "Unassigned"] }, employee: { $ifNull: ["$job_owner", "Unassigned"] } }, count: { $sum: 1 } } },
            { $sort: { "_id.branch": 1, count: -1 } }
        ]);
        const total = noDateFilter.reduce((s, r) => s + r.count, 0);
        console.log(`\nAll pending (no date filter applied): ${total} jobs, ${noDateFilter.length} groups`);
        noDateFilter.forEach(r => console.log(`  ${r._id.branch} | ${r._id.port} | ${r._id.employee}: ${r.count}`));

        // 6. Check distinct branch_codes
        const branches = await JobModel.distinct('branch_code', { status: { $regex: /^pending$/i }, be_no: { $not: { $regex: /^cancelled$/i } } });
        console.log("\nDistinct branch_codes in pending jobs:", branches);

        // 7. Check user's authorized branches — the middleware might be filtering
        // Let's check what AMD branch looks like
        const amdCount = await JobModel.countDocuments({
            status: { $regex: /^pending$/i },
            be_no: { $not: { $regex: /^cancelled$/i } },
            branch_code: 'AMD'
        });
        console.log("\nAMD pending:", amdCount);

        const cokCount = await JobModel.countDocuments({
            status: { $regex: /^pending$/i },
            be_no: { $not: { $regex: /^cancelled$/i } },
            branch_code: 'COK'
        });
        console.log("COK pending:", cokCount);

        const gimCount = await JobModel.countDocuments({
            status: { $regex: /^pending$/i },
            be_no: { $not: { $regex: /^cancelled$/i } },
            branch_code: 'GIM'
        });
        console.log("GIM pending:", gimCount);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
