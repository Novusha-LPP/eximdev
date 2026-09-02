import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });
import JobModel from '../model/jobModel.mjs';
import UserBranchModel from '../model/userBranchModel.mjs';

const run = async () => {
    try {
        const uri = process.env.NODE_ENV === 'production' ? process.env.PROD_MONGODB_URI :
            process.env.NODE_ENV === 'server' ? process.env.SERVER_MONGODB_URI :
            process.env.DEV_MONGODB_URI || 'mongodb://127.0.0.1:27017/exim';
            
        await mongoose.connect(uri);
        console.log("Connected to DB");

        // Let's find all user branch assignments to understand what branch_ids map to GIM, COK, etc.
        // We also want to check the jobs where branch_code is GIM or COK and see if they match the branch_id filter.
        
        const jobs = await JobModel.find({
            status: { $regex: /^pending$/i },
            be_no: { $not: { $regex: /^cancelled$/i } }
        }).select('branch_code branch_id port_of_reporting job_owner');

        console.log("Total pending jobs:", jobs.length);
        
        // Count branch mappings
        const branchMap = {};
        jobs.forEach(j => {
            const code = j.branch_code || 'null';
            const id = j.branch_id ? j.branch_id.toString() : 'null';
            const key = `${code} -> ${id}`;
            branchMap[key] = (branchMap[key] || 0) + 1;
        });
        
        console.log("\nPending jobs branch mapping (code -> id):");
        console.log(branchMap);

        // Let's check the distinct branch codes and check their branch ids
        const uniqueBranches = await JobModel.aggregate([
            { $match: { status: { $regex: /^pending$/i }, be_no: { $not: { $regex: /^cancelled$/i } } } },
            { $group: { _id: { code: "$branch_code", id: "$branch_id" }, count: { $sum: 1 } } }
        ]);
        console.log("\nUnique branches and ids:", JSON.stringify(uniqueBranches, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
