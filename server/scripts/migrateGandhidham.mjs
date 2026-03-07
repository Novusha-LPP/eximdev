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

async function migrateGandhidhamJobs() {
    try {
        console.log("🚀 Starting Gandhidham Jobs Migration...");
        await mongoose.connect(MONGODB_URI);
        console.log("✅ Connected to MongoDB");

        // 1. Get Gandhidham branch details
        const gandhidhamBranch = await BranchModel.findOne({ branch_code: "GIM" }); // Using the code GIM found
        if (!gandhidhamBranch) {
            console.error("❌ Gandhidham branch (GIM) not found! Ensure it's created first.");
            process.exit(1);
        }
        const branch_id = gandhidhamBranch._id;
        const branch_code = gandhidhamBranch.branch_code;
        console.log(`📍 Using Branch: ${branch_code} (${branch_id})`);

        // 2. Access the source collection
        const sourceCollection = mongoose.connection.db.collection('gandhidham_jobs_sea');
        const count = await sourceCollection.countDocuments();
        console.log(`📊 Found ${count} jobs to migrate from gandhidham_jobs_sea.`);

        if (count === 0) {
            console.log("⚠️ No jobs found to migrate. Exiting.");
            process.exit(0);
        }

        // 3. Process jobs in batches
        const batchSize = 100;
        let totalMoved = 0;
        let totalProcessed = 0;

        const allJobs = await sourceCollection.find({}).toArray();

        for (const oldJob of allJobs) {
            totalProcessed++;

            // Clean up the job object before insertion
            const { _id, ...jobData } = oldJob;

            // Set required fields for the new numbering system
            const trade_type = "IMP";
            const mode = "SEA";
            const financial_year = jobData.year || "24-25";

            // In the source collection, 'job_no' exists as a string or number
            const seqNum = parseInt(jobData.job_no, 10);
            if (isNaN(seqNum)) {
                console.warn(`⚠️ Skipping job with invalid job_no: ${jobData.job_no}`);
                continue;
            }

            const paddedSeq = seqNum.toString().padStart(5, '0');
            const job_number = `${branch_code}/${trade_type}/${mode}/${paddedSeq}/${financial_year}`;

            // Check if job already exists in JobModel to avoid duplicates
            // We use job_no and branch_id to uniquely identify within a branch for now
            const existingJob = await JobModel.findOne({ job_no: jobData.job_no, branch_id });

            // Sanitization: Ensure fields that JobModel expects to be strings but might be boolean/numbers are converted
            if (typeof jobData.hss === 'boolean') jobData.hss = jobData.hss ? "Yes" : "No";
            if (jobData.container_nos && Array.isArray(jobData.container_nos)) {
                jobData.container_nos = jobData.container_nos.map(c => ({
                    ...c,
                    arrival_date: c.arrival_date ? String(c.arrival_date) : undefined,
                    delivery_date: c.delivery_date ? String(c.delivery_date) : undefined,
                }));
            }

            try {
                if (existingJob) {
                    console.log(`⏩ Job ${job_number} already exists in target collection. Updating instead of inserting.`);
                    await JobModel.updateOne(
                        { _id: existingJob._id },
                        {
                            $set: {
                                ...jobData,
                                job_number,
                                branch_id,
                                branch_code,
                                trade_type,
                                mode,
                                sequence_number: seqNum,
                                financial_year
                            }
                        },
                        { runValidators: false } // Skip validators if we want to force move
                    );
                } else {
                    const newJob = new JobModel({
                        ...jobData,
                        job_number,
                        branch_id,
                        branch_code,
                        trade_type,
                        mode,
                        sequence_number: seqNum,
                        financial_year
                    });
                    await newJob.save({ validateBeforeSave: false }); // Bypass validation to get data in
                    totalMoved++;
                }
            } catch (err) {
                console.error(`❌ FAILED for job_no: ${jobData.job_no}`, err.message);
                if (err.errors) {
                    Object.keys(err.errors).forEach(key => {
                        console.error(`   - ${key}: ${err.errors[key].message}`);
                    });
                }
            }

            if (totalProcessed % batchSize === 0) {
                console.log(`⏳ Processed ${totalProcessed} jobs...`);
            }
        }

        console.log(`✅ Migration complete. ${totalMoved} new jobs moved, ${totalProcessed - totalMoved} updated.`);

        // 4. Initialize counters
        console.log("🏁 Updating Job Counters for Gandhidham...");
        const pipeline = [
            { $match: { branch_id: branch_id } },
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

        console.log("🎉 Job counters for Gandhidham initialized.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

migrateGandhidhamJobs();
