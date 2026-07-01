import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

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

        const pipeline = [
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        branch: { $ifNull: ["$branch_code", "Unassigned"] },
                        port: { $ifNull: ["$port_of_reporting", "Unassigned"] },
                        employee: { $ifNull: ["$job_owner", "Unassigned"] },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { "_id.branch": 1, "_id.port": 1, count: -1 } },
            {
                $project: {
                    _id: 0,
                    branch: "$_id.branch",
                    port: "$_id.port",
                    employee: "$_id.employee",
                    count: 1,
                },
            }
        ];

        const allJobs = await JobModel.aggregate(pipeline);
        console.log("Total pending jobs unfiltered:", allJobs.length, "groups");
        const totalCount = allJobs.reduce((sum, r) => sum + r.count, 0);
        console.log("Total count unfiltered:", totalCount);
        console.log(JSON.stringify(allJobs, null, 2));

        // Test with today's date
        const today = new Date().toISOString().split('T')[0];
        pipeline.splice(1, 0, {
            $match: {
                job_date: { $regex: `^${today}` },
            }
        });
        const todayJobs = await JobModel.aggregate(pipeline);
        console.log(`\nTotal pending jobs for today (${today}):`, todayJobs.length, "groups");
        const todayTotalCount = todayJobs.reduce((sum, r) => sum + r.count, 0);
        console.log("Total count today:", todayTotalCount);
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
