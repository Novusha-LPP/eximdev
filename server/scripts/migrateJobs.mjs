import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from "mongoose";
import dotenv from "dotenv";
import JobModel from "../model/jobModel.mjs";
import BranchModel from "../model/branchModel.mjs";
import JobCounterModel from "../model/jobCounterModel.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.DEV_MONGODB_URI || process.env.PROD_MONGODB_URI;
console.log("🔗 Attempting to connect to:", MONGODB_URI ? `${MONGODB_URI.substring(0, 20)}...` : "UNDEFINED");

async function migrate() {
    try {
        console.log("🚀 Starting Migration...");
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Connected to MongoDB");

        // 1. Ensure a default branch exists (e.g., AMD)
        let defaultBranch = await BranchModel.findOne({ branch_code: "AMD" });
        if (!defaultBranch) {
            console.log("📝 Creating default branch: AMD");
            defaultBranch = await BranchModel.create({
                branch_name: "Ahmedabad",
                branch_code: "AMD",
                created_by: "system_migration"
            });
        }
        const branch_id = defaultBranch._id;
        const branch_code = defaultBranch.branch_code;

        // 2. Process jobs in batches
        const batchSize = 500;
        let totalProcessed = 0;
        let totalMigrated = 0;

        const count = await JobModel.countDocuments({ job_number: { $exists: false } });
        console.log(`📊 Found ${count} jobs to migrate.`);

        while (true) {
            const jobs = await JobModel.find({ job_number: { $exists: false } }).limit(batchSize);
            if (jobs.length === 0) break;

            const bulkOps = jobs.map(job => {
                if (!job.job_no) {
                    console.warn(`⚠️ Skipping job ${job._id} (missing job_no)`);
                    return null;
                }
                const seqNum = parseInt(job.job_no, 10);
                if (isNaN(seqNum)) {
                    console.warn(`⚠️ Skipping job ${job._id} (invalid job_no: ${job.job_no})`);
                    return null;
                }
                const trade_type = "IMP";
                const mode = "SEA";
                const financial_year = job.year || "24-25";

                const paddedSeq = seqNum.toString().padStart(5, '0');
                const job_number = `${branch_code}/${trade_type}/${mode}/${paddedSeq}/${financial_year}`;

                return {
                    updateOne: {
                        filter: { _id: job._id },
                        update: {
                            $set: {
                                job_number,
                                branch_id,
                                branch_code,
                                trade_type,
                                mode,
                                sequence_number: seqNum,
                                financial_year
                            }
                        }
                    }
                };
            });

            if (bulkOps.filter(o => o !== null).length > 0) {
                await JobModel.bulkWrite(bulkOps.filter(o => o !== null));
                totalMigrated += bulkOps.filter(o => o !== null).length;
            }

            totalProcessed += jobs.length;
            console.log(`⏳ Processed ${totalProcessed} jobs...`);
        }

        console.log(`✅ Migration complete. ${totalMigrated} jobs migrated.`);

        // 3. Initialize counters
        console.log("🏁 Initializing Job Counters...");
        const pipeline = [
            {
                $group: {
                    _id: {
                        branch_id: "$branch_id",
                        trade_type: "$trade_type",
                        mode: "$mode",
                        financial_year: "$financial_year"
                    },
                    maxSequence: { $max: "$sequence_number" }
                }
            }
        ];

        const stats = await JobModel.aggregate(pipeline);

        for (const stat of stats) {
            if (!stat._id.branch_id) continue;

            await JobCounterModel.findOneAndUpdate(
                {
                    branch_id: stat._id.branch_id,
                    trade_type: stat._id.trade_type,
                    mode: stat._id.mode,
                    financial_year: stat._id.financial_year
                },
                { $set: { last_sequence: stat.maxSequence } },
                { upsert: true, new: true }
            );
            console.log(`📈 Counter initialized for ${stat._id.financial_year}: ${stat.maxSequence}`);
        }

        console.log("🎉 Job counters initialized.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

migrate();
