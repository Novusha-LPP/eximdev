import express from "express";
import JobModel from "../../model/jobModel.mjs";
import JobCounterModel from "../../model/jobCounterModel.mjs";
import BranchModel from "../../model/branchModel.mjs";
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
        if (!query) {
            return res.status(400).json({ message: "Search query is required." });
        }

        // Search across job_number, bl_no, and be_no
        const job = await JobModel.findOne({
            $or: [
                { job_number: query },
                { awb_bl_no: query },
                { be_no: query }
            ]
        }).lean();

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
 * Preview the migration: Calculate the next sequence in the target year
 */
router.get("/preview", authMiddleware, adminOnly, async (req, res) => {
    try {
        const { jobId, targetYear } = req.query;

        if (!jobId || !targetYear) {
            return res.status(400).json({ message: "jobId and targetYear are required." });
        }

        const job = await JobModel.findById(jobId).lean();
        if (!job) {
            return res.status(404).json({ message: "Job not found." });
        }

        const { branch_id, trade_type, mode, branch_code } = job;

        // 1. Get current counter for the target year
        let counter = await JobCounterModel.findOne({
            branch_id,
            financial_year: targetYear,
            trade_type,
            mode
        }).lean();

        let nextSequence = (counter ? counter.last_sequence : 0) + 1;

        // 2. Self-healing check (similar to generateJobNumber service)
        // Find the absolute maximum sequence currently in the database to avoid collision
        const maxJob = await JobModel.findOne({
            branch_id,
            year: targetYear,
            trade_type,
            mode
        }).sort({ sequence_number: -1 }).select("sequence_number").lean();

        if (maxJob && maxJob.sequence_number >= nextSequence) {
            nextSequence = maxJob.sequence_number + 1;
        }

        const paddedSequence = nextSequence.toString().padStart(5, '0');
        const proposedJobNumber = `${branch_code}/${trade_type}/${mode}/${paddedSequence}/${targetYear}`;

        res.status(200).json({
            success: true,
            currentJobNumber: job.job_number,
            proposedJobNumber,
            nextSequence,
            paddedSequence,
            targetYear
        });

    } catch (error) {
        console.error("Migration Preview Error:", error);
        res.status(500).json({ message: "Internal server error during preview." });
    }
});

/**
 * List sequence gaps in the target year
 */
router.get("/gaps", authMiddleware, adminOnly, async (req, res) => {
    try {
        const { jobId, targetYear } = req.query;

        if (!jobId || !targetYear) {
            return res.status(400).json({ message: "jobId and targetYear are required." });
        }

        const job = await JobModel.findById(jobId).lean();
        if (!job) {
            return res.status(404).json({ message: "Job not found." });
        }

        const { branch_id, trade_type, mode } = job;

        // 1. Get current counter to know the max range
        const counter = await JobCounterModel.findOne({
            branch_id,
            financial_year: targetYear,
            trade_type,
            mode
        }).lean();

        if (!counter || counter.last_sequence === 0) {
            return res.status(200).json({ gaps: [] });
        }

        // 2. Fetch all existing sequences in the target year
        const existingJobs = await JobModel.find({
            branch_id,
            year: targetYear,
            trade_type,
            mode
        }).select("sequence_number").lean();

        const usedSequences = new Set(existingJobs.map(j => j.sequence_number));
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
        const { jobId, targetYear, requestedSequence } = req.body;

        if (!jobId || !targetYear) {
            return res.status(400).json({ message: "jobId and targetYear are required." });
        }

        const job = await JobModel.findById(jobId);
        if (!job) {
            return res.status(404).json({ message: "Job not found." });
        }

        // Check if a job with the same BL number already exists in the target year
        if (job.awb_bl_no) {
            const duplicateBL = await JobModel.findOne({
                awb_bl_no: job.awb_bl_no,
                year: targetYear,
                _id: { $ne: jobId } // Exclude the job being migrated
            }).lean();

            if (duplicateBL) {
                return res.status(400).json({ 
                    message: `A job with the same BL/AWB number (${job.awb_bl_no}) already exists in the target year ${targetYear}. Duplicate migration is blocked.` 
                });
            }
        }

        let newJobData;

        if (requestedSequence) {
            // Verify sequence is still available
            const existing = await JobModel.findOne({
                branch_id: job.branch_id,
                year: targetYear,
                trade_type: job.trade_type,
                mode: job.mode,
                sequence_number: requestedSequence
            }).lean();

            if (existing) {
                return res.status(400).json({ message: `Sequence ${requestedSequence} is already in use.` });
            }

            const branch = await BranchModel.findById(job.branch_id).lean();
            const paddedSequence = requestedSequence.toString().padStart(5, '0');
            
            newJobData = {
                job_number: `${branch.branch_code}/${job.trade_type}/${job.mode}/${paddedSequence}/${targetYear}`,
                sequence_number: requestedSequence,
                job_no: paddedSequence,
                branch_code: branch.branch_code
            };
        } else {
            // Default logic: increment counter
            newJobData = await generateJobNumber({
                branch_id: job.branch_id,
                trade_type: job.trade_type,
                mode: job.mode,
                financial_year: targetYear
            });
        }

        // Update the job document
        const oldJobNumber = job.job_number;
        job.year = targetYear;
        job.financial_year = targetYear;
        job.job_no = newJobData.job_no;
        job.sequence_number = newJobData.sequence_number;
        job.job_number = newJobData.job_number;
        job.branch_code = newJobData.branch_code;

        await job.save();

        res.status(200).json({
            success: true,
            message: `Job migrated successfully from ${oldJobNumber} to ${job.job_number}`,
            oldJobNumber,
            newJobNumber: job.job_number
        });

    } catch (error) {
        console.error("Migration Execution Error:", error);
        res.status(500).json({ message: error.message || "Internal server error during migration." });
    }
});

export default router;
