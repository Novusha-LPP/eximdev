import mongoose from "mongoose";
import JobModel from "../model/jobModel.mjs";
import BranchModel from "../model/branchModel.mjs";
import JobCounterModel from "../model/jobCounterModel.mjs";

/**
 * Migration logic from migrateJobs.mjs
 */
export async function migrateJobs(onProgress) {
    console.log("🚀 Starting Migration (Standard Jobs)...");

    // 1. Fetch all branches and categorize them for lookup
    const allBranches = await BranchModel.find({});
    const branchMap = {}; // Map of branch_code -> { SEA: id, AIR: id }
    allBranches.forEach(b => {
        if (!branchMap[b.branch_code]) branchMap[b.branch_code] = {};
        branchMap[b.branch_code][b.category] = b._id;
    });

    const defaultBranchCode = "AMD";
    const amdSeaBranchId = branchMap[defaultBranchCode]?.["SEA"];
    const amdAirBranchId = branchMap[defaultBranchCode]?.["AIR"];

    // 2. Process jobs in batches
    const batchSize = 500;
    let totalProcessed = 0;
    let totalMigrated = 0;

    // The query finds all jobs that either:
    // a) Don't have a job_number (newly synced)
    // b) Have a branch_id that doesn't match their mode (repair)
    // For simplicity in this robust version, we look for jobs where:
    // 1. job_number is missing OR
    // 2. branch_id is null OR
    // 3. it's an AMD job (main concern)
    const query = {
        $or: [
            { job_number: { $exists: false } },
            { branch_id: { $exists: false } },
            { branch_code: "AMD" } // Focus on AMD for repair as reported
        ],
        job_no: { $exists: true, $ne: "", $nin: [null, "nan", "NaN"] }
    };

    const totalToMigrate = await JobModel.countDocuments(query);
    console.log(`📊 Found ${totalToMigrate} jobs to process/migrate.`);

    if (onProgress) onProgress({ phase: "Standard Jobs", current: 0, total: totalToMigrate });

    let lastId = null;
    while (true) {
        // Use cursor-based pagination (sort by _id and use $gt) to visit every job exactly once
        const batchQuery = { ...query };
        if (lastId) {
            batchQuery._id = { $gt: lastId };
        }

        const jobs = await JobModel.find(batchQuery).sort({ _id: 1 }).limit(batchSize);
        if (jobs.length === 0) break;

        // Track the last ID for the next batch
        lastId = jobs[jobs.length - 1]._id;

        const bulkOps = jobs
            .map((job) => {
                const seqNum = parseInt(job.job_no, 10);
                if (isNaN(seqNum)) {
                    if (!job.job_number) {
                        return {
                            updateOne: {
                                filter: { _id: job._id },
                                update: { $set: { job_number: "INVALID_JOB_NO" } }
                            }
                        };
                    }
                    return null;
                }

                const branch_code = job.branch_code || defaultBranchCode;

                // Determine Mode
                let mode = "SEA"; // Default
                if (job.mode && ["SEA", "AIR"].includes(job.mode.toUpperCase())) {
                    mode = job.mode.toUpperCase();
                } else if (job.port_of_reporting && /air/i.test(job.port_of_reporting)) {
                    mode = "AIR";
                } else if (job.custom_house && /air/i.test(job.custom_house)) {
                    mode = "AIR";
                }

                const branch_id = branchMap[branch_code]?.[mode] || branchMap[branch_code]?.["SEA"] || amdSeaBranchId;
                const trade_type = job.trade_type || "IMP";
                const financial_year = job.year || "24-25";

                const paddedSeq = seqNum.toString().padStart(5, "0");
                const job_number = `${branch_code}/${trade_type}/${mode}/${paddedSeq}/${financial_year}`;

                // Only update if something actually changed
                if (
                    job.job_number === job_number &&
                    String(job.branch_id) === String(branch_id) &&
                    job.mode === mode
                ) {
                    return null;
                }

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
                                financial_year,
                            },
                        },
                    },
                };
            })
            .filter(Boolean);

        if (bulkOps.length > 0) {
            await JobModel.bulkWrite(bulkOps);
            totalMigrated += bulkOps.filter(op => op.updateOne.update.$set.job_number !== "INVALID_JOB_NO").length;
        }

        totalProcessed += jobs.length;
        console.log(`⏳ Processed ${totalProcessed}/${totalToMigrate} jobs...`);
        if (onProgress) onProgress({ phase: "Standard Jobs", current: totalProcessed, total: totalToMigrate });
    }

    console.log(`✅ Migration complete. ${totalMigrated} jobs migrated.`);

    // 3. Initialize counters
    console.log("🏁 Initializing Job Counters...");
    if (onProgress) onProgress({ phase: "Initializing Counters", current: 0, total: 1 });

    const pipeline = [
        {
            $group: {
                _id: {
                    branch_id: "$branch_id",
                    trade_type: "$trade_type",
                    mode: "$mode",
                    financial_year: "$financial_year",
                },
                maxSequence: { $max: "$sequence_number" },
            },
        },
    ];

    const stats = await JobModel.aggregate(pipeline);

    for (const stat of stats) {
        if (!stat._id.branch_id) continue;

        await JobCounterModel.findOneAndUpdate(
            {
                branch_id: stat._id.branch_id,
                trade_type: stat._id.trade_type,
                mode: stat._id.mode,
                financial_year: stat._id.financial_year,
            },
            { $set: { last_sequence: stat.maxSequence } },
            { upsert: true, new: true }
        );
    }
    console.log("🎉 Job counters initialized.");
    if (onProgress) onProgress({ phase: "Initialization Complete", current: 1, total: 1 });
    return { totalMigrated };
}

/**
 * Migration logic from migrateGandhidham.mjs
 */
export async function migrateGandhidhamJobs(onProgress) {
    console.log("🚀 Starting Gandhidham Jobs Migration...");

    // 1. Fetch all branches and categorize them for lookup
    const allBranches = await BranchModel.find({});
    const branchMap = {}; // Map of branch_code -> { SEA: id, AIR: id }
    allBranches.forEach(b => {
        if (!branchMap[b.branch_code]) branchMap[b.branch_code] = {};
        branchMap[b.branch_code][b.category] = b._id;
    });

    const branch_code = "GIM";
    const mode = "SEA"; // Gandhidham jobs are from a 'sea' collection
    const branch_id = branchMap[branch_code]?.[mode];
    if (!branch_id) {
        throw new Error("Gandhidham branch (GIM) SEA category not found!");
    }

    // 2. Access the source collection
    const db = mongoose.connection.db;
    const sourceCollection = db.collection("gandhidham_jobs_sea");
    const count = await sourceCollection.countDocuments();
    console.log(`📊 Found ${count} jobs to migrate from gandhidham_jobs_sea.`);

    if (count === 0) {
        if (onProgress) onProgress({ phase: "Gandhidham Jobs", current: 0, total: 0 });
        return { totalMoved: 0, updated: 0 };
    }

    if (onProgress) onProgress({ phase: "Gandhidham Jobs", current: 0, total: count });

    const allJobs = await sourceCollection.find({}).toArray();
    let totalMoved = 0;
    let totalProcessed = 0;

    for (const oldJob of allJobs) {
        totalProcessed++;
        const { _id, ...jobData } = oldJob;

        const trade_type = "IMP";
        const mode = "SEA";
        const financial_year = jobData.year || "24-25";

        const seqNum = parseInt(jobData.job_no, 10);
        if (isNaN(seqNum)) continue;

        const paddedSeq = seqNum.toString().padStart(5, "0");
        const job_number = `${branch_code}/${trade_type}/${mode}/${paddedSeq}/${financial_year}`;

        // Search for existing job by job_no and branch_code (to catch wrong branch_id assignments)
        const existingJob = await JobModel.findOne({
            job_no: jobData.job_no,
            branch_code,
        });

        // Sanitization
        if (typeof jobData.hss === "boolean")
            jobData.hss = jobData.hss ? "Yes" : "No";
        if (jobData.container_nos && Array.isArray(jobData.container_nos)) {
            jobData.container_nos = jobData.container_nos.map((c) => ({
                ...c,
                arrival_date: c.arrival_date ? String(c.arrival_date) : undefined,
                delivery_date: c.delivery_date ? String(c.delivery_date) : undefined,
            }));
        }

        if (existingJob) {
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
                        financial_year,
                    },
                },
                { runValidators: false }
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
                financial_year,
            });
            await newJob.save({ validateBeforeSave: false });
            totalMoved++;
        }

        if (totalProcessed % 50 === 0 || totalProcessed === count) {
            if (onProgress) onProgress({ phase: "Gandhidham Jobs", current: totalProcessed, total: count });
        }
    }

    // Update counters
    const pipeline = [
        { $match: { branch_id: branch_id } },
        {
            $group: {
                _id: {
                    branch_id: "$branch_id",
                    trade_type: "$trade_type",
                    mode: "$mode",
                    financial_year: "$financial_year",
                },
                maxSequence: { $max: "$sequence_number" },
            },
        },
    ];

    const stats = await JobModel.aggregate(pipeline);
    for (const stat of stats) {
        await JobCounterModel.findOneAndUpdate(
            {
                branch_id: stat._id.branch_id,
                trade_type: stat._id.trade_type,
                mode: stat._id.mode,
                financial_year: stat._id.financial_year,
            },
            { $set: { last_sequence: stat.maxSequence } },
            { upsert: true, new: true }
        );
    }

    return { totalMoved, updated: totalProcessed - totalMoved };
}
