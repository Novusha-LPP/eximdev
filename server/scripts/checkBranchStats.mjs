import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

async function checkBranchIds() {
    try {
        await mongoose.connect(process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI);
        const Job = mongoose.model('Job', new mongoose.Schema({}, { strict: false }));
        const Branch = mongoose.model('Branch', new mongoose.Schema({}, { strict: false }));

        const branches = await Branch.find().lean();
        const branchMap = {};
        branches.forEach(b => branchMap[b._id.toString()] = b.branch_name + ' (' + b.branch_code + ')');

        const stats = await Job.aggregate([
            {
                $group: {
                    _id: "$branch_id",
                    count: { $sum: 1 },
                    codes: { $addToSet: "$branch_code" },
                    yearSample: { $addToSet: "$year" }
                }
            }
        ]);

        console.log('--- DB Branch Stats ---');
        stats.forEach(s => {
            const idStr = s._id ? s._id.toString() : 'NULL';
            const name = branchMap[idStr] || 'Unknown';
            console.log(`ID: ${idStr} | Name: ${name} | Count: ${s.count} | Codes: ${s.codes.join(',')} | Years: ${s.yearSample.slice(0, 5).join(',')}`);
        });

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkBranchIds();
