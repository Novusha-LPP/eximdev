import express from "express";
import JobModel from "../../model/jobModel.mjs";
import JobCounterModel from "../../model/jobCounterModel.mjs";
import BranchModel from "../../model/branchModel.mjs";
import DocumentCollectionModel from "../../model/documentCollectionModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import { generateJobNumber } from "../../services/jobNumberService.mjs";

const router = express.Router();

// Middleware to ensure user is an Admin
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === "Admin") {
        next();
    } else {
        res.status(403).json({ message: "Access denied. Admin only." });
    }
};

router.get("/get-job", authMiddleware, adminOnly, async (req, res) => {
    try {
        const { query } = req.query; // General query string
        if (!query || !query.trim()) {
            return res.status(400).json({ message: "Search query is required." });
        }

        const cleanQuery = query.trim();

        // Search across job_number, bl_no, and be_no
        const job = await JobModel.findOne({
            $or: [
                { job_number: cleanQuery },
                { awb_bl_no: cleanQuery },
                { be_no: cleanQuery }
            ]
        })
        .populate("branch_id", "branch_name branch_code category")
        .lean();

        if (!job) {
            return res.status(404).json({ message: "Job not found." });
        }

        res.status(200).json(job);
    } catch (error) {
        console.error("Get Job Search Error:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});

/**
 * Preview the migration: Calculate the next sequence in target year, branch, and division (mode)
 */
router.get("/preview", authMiddleware, adminOnly, async (req, res) => {
    try {
        const { jobId, targetYear, targetBranchCode, targetMode } = req.query;

        if (!jobId) {
            return res.status(400).json({ message: "jobId is required." });
        }

        const job = await JobModel.findById(jobId).lean();
        if (!job) {
            return res.status(404).json({ message: "Job not found." });
        }

        const year = targetYear || job.year || job.financial_year;
        const mode = (targetMode || job.mode || "SEA").toUpperCase();
        const branchCode = (targetBranchCode || job.branch_code || (job.branch_id && job.branch_id.branch_code) || "AMD").toUpperCase();
        const tradeType = (job.trade_type || "IMP").toUpperCase();

        // 1. Resolve target branch for this branch code and division (category)
        const targetBranch = await BranchModel.findOne({
            branch_code: branchCode,
            category: mode
        }).lean();

        if (!targetBranch) {
            return res.status(400).json({
                message: `Target branch '${branchCode}' with division '${mode}' not found in the system.`
            });
        }

        const branchId = targetBranch._id;

        // 2. Get current counter for the target scope
        let counter = await JobCounterModel.findOne({
            branch_id: branchId,
            financial_year: year,
            trade_type: tradeType,
            mode
        }).lean();

        let nextSequence = (counter ? counter.last_sequence : 0) + 1;

        // 3. Self-healing check (similar to generateJobNumber service)
        // Find the absolute maximum sequence currently in the database to avoid collision
        const maxJob = await JobModel.findOne({
            branch_id: branchId,
            year: year,
            trade_type: tradeType,
            mode
        }).sort({ sequence_number: -1 }).select("sequence_number").lean();

        if (maxJob && maxJob.sequence_number >= nextSequence) {
            nextSequence = maxJob.sequence_number + 1;
        }

        const paddedSequence = nextSequence.toString().padStart(5, '0');
        const proposedJobNumber = `${branchCode}/${tradeType}/${mode}/${paddedSequence}/${year}`;

        res.status(200).json({
            success: true,
            currentJobNumber: job.job_number,
            proposedJobNumber,
            nextSequence,
            paddedSequence,
            targetYear: year,
            targetBranchCode: branchCode,
            targetBranchName: targetBranch.branch_name,
            targetMode: mode
        });

    } catch (error) {
        console.error("Migration Preview Error:", error);
        res.status(500).json({ message: "Internal server error during preview." });
    }
});

/**
 * List sequence gaps in the target scope (branch, mode, year)
 */
router.get("/gaps", authMiddleware, adminOnly, async (req, res) => {
    try {
        const { jobId, targetYear, targetBranchCode, targetMode } = req.query;

        if (!jobId) {
            return res.status(400).json({ message: "jobId is required." });
        }

        const job = await JobModel.findById(jobId).lean();
        if (!job) {
            return res.status(404).json({ message: "Job not found." });
        }

        const year = targetYear || job.year || job.financial_year;
        const mode = (targetMode || job.mode || "SEA").toUpperCase();
        const branchCode = (targetBranchCode || job.branch_code || (job.branch_id && job.branch_id.branch_code) || "AMD").toUpperCase();
        const tradeType = (job.trade_type || "IMP").toUpperCase();

        const targetBranch = await BranchModel.findOne({
            branch_code: branchCode,
            category: mode
        }).lean();

        if (!targetBranch) {
            return res.status(200).json({ gaps: [] });
        }

        const branchId = targetBranch._id;

        // 1. Get current counter to know the max range
        const counter = await JobCounterModel.findOne({
            branch_id: branchId,
            financial_year: year,
            trade_type: tradeType,
            mode
        }).lean();

        if (!counter || counter.last_sequence === 0) {
            return res.status(200).json({ gaps: [] });
        }

        // 2. Fetch all existing sequences in the target scope
        const existingJobs = await JobModel.find({
            branch_id: branchId,
            year: year,
            trade_type: tradeType,
            mode
        }).select("sequence_number job_no").lean();

        const usedSequences = new Set();
        existingJobs.forEach(j => {
            if (j.sequence_number) usedSequences.add(j.sequence_number);
            const parsed = parseInt(j.job_no, 10);
            if (!isNaN(parsed)) usedSequences.add(parsed);
        });

        const gaps = [];

        // 3. Identify missing numbers from 1 to current max
        for (let i = 1; i <= counter.last_sequence; i++) {
            if (!usedSequences.has(i)) {
                gaps.push({
                    sequence_number: i,
                    job_no: i.toString().padStart(5, '0')
                });
            }
        }

        res.status(200).json({ success: true, gaps });

    } catch (error) {
        console.error("Gap Detection Error:", error);
        res.status(500).json({ message: "Internal server error during gap detection." });
    }
});

/**
 * Execute the migration
 */
router.post("/execute", authMiddleware, adminOnly, auditMiddleware("Job"), async (req, res) => {
    try {
        const { jobId, targetYear, targetBranchCode, targetMode, requestedSequence } = req.body;

        if (!jobId) {
            return res.status(400).json({ message: "jobId is required." });
        }

        const job = await JobModel.findById(jobId);
        if (!job) {
            return res.status(404).json({ message: "Job not found." });
        }

        const year = targetYear || job.year || job.financial_year;
        const mode = (targetMode || job.mode || "SEA").toUpperCase();
        const branchCode = (targetBranchCode || job.branch_code || "AMD").toUpperCase();
        const tradeType = (job.trade_type || "IMP").toUpperCase();

        const targetBranch = await BranchModel.findOne({
            branch_code: branchCode,
            category: mode
        });

        if (!targetBranch) {
            return res.status(400).json({
                message: `Target branch '${branchCode}' with division '${mode}' not found in the system.`
            });
        }

        // Validation: Ensure at least one aspect is changing or sequence reuse is requested
        const isYearSame = (job.year === year || job.financial_year === year);
        const isBranchSame = (String(job.branch_id) === String(targetBranch._id) && job.branch_code === branchCode);
        const isModeSame = (job.mode === mode);

        if (isYearSame && isBranchSame && isModeSame && !requestedSequence) {
            return res.status(400).json({
                message: "No change detected in Financial Year, Branch, or Division. Migration cancelled."
            });
        }

        // Check if a job with the same BL number already exists in the target scope
        if (job.awb_bl_no) {
            const duplicateBL = await JobModel.findOne({
                awb_bl_no: job.awb_bl_no,
                branch_id: targetBranch._id,
                year,
                mode,
                _id: { $ne: jobId } // Exclude the job being migrated
            }).lean();

            if (duplicateBL) {
                return res.status(400).json({ 
                    message: `A job with the same BL/AWB number (${job.awb_bl_no}) already exists in ${branchCode} (${mode}) for year ${year}. Duplicate migration is blocked.` 
                });
            }
        }

        let newJobData;

        if (requestedSequence) {
            const paddedSequence = requestedSequence.toString().padStart(5, '0');
            const targetJobNumber = `${branchCode}/${tradeType}/${mode}/${paddedSequence}/${year}`;

            // Verify sequence and job_number are still available
            const existing = await JobModel.findOne({
                $or: [
                    { branch_id: targetBranch._id, year, trade_type: tradeType, mode, sequence_number: requestedSequence },
                    { branch_id: targetBranch._id, year, trade_type: tradeType, mode, job_no: paddedSequence },
                    { job_number: targetJobNumber }
                ],
                _id: { $ne: jobId }
            }).lean();

            if (existing) {
                return res.status(400).json({ message: `Sequence ${requestedSequence} is already in use in the target scope.` });
            }
            
            newJobData = {
                job_number: targetJobNumber,
                sequence_number: requestedSequence,
                job_no: paddedSequence,
                branch_code: branchCode
            };

            // Ensure the counter tracks this sequence if it is higher than current
            await JobCounterModel.findOneAndUpdate(
                { branch_id: targetBranch._id, financial_year: year, trade_type: tradeType, mode },
                { $max: { last_sequence: requestedSequence } },
                { upsert: true }
            );
        } else {
            // Default logic: increment counter for target branch, year, trade_type, and mode
            newJobData = await generateJobNumber({
                branch_id: targetBranch._id,
                trade_type: tradeType,
                mode,
                financial_year: year
            });
        }

        // Update the job document
        const oldJobNumber = job.job_number;
        job.branch_id = targetBranch._id;
        job.branch_code = branchCode;
        job.mode = mode;
        job.year = year;
        job.financial_year = year;
        job.job_no = newJobData.job_no;
        job.sequence_number = newJobData.sequence_number;
        job.job_number = newJobData.job_number;

        await job.save();

        // Update any associated document collections if present
        try {
            await DocumentCollectionModel.updateMany(
                { job_number: oldJobNumber },
                {
                    $set: {
                        job_number: job.job_number,
                        branch_code: branchCode,
                        year: year
                    }
                }
            );
        } catch (docErr) {
            console.warn("Could not sync DocumentCollection during job migration:", docErr.message);
        }

        res.status(200).json({
            success: true,
            message: `Job migrated successfully from ${oldJobNumber} to ${job.job_number}`,
            oldJobNumber,
            newJobNumber: job.job_number,
            branch_code: branchCode,
            mode,
            year
        });

    } catch (error) {
        console.error("Migration Execution Error:", error);
        res.status(500).json({ message: error.message || "Internal server error during migration." });
    }
});

export default router;
