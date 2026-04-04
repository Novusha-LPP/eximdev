import express from 'express';
import JobCounterModel from '../../model/jobCounterModel.mjs';
import BranchModel from '../../model/branchModel.mjs';

const router = express.Router();

router.get('/get-next-job-number', async (req, res) => {
    try {
        const { branch_id, trade_type, mode, financial_year } = req.query;

        if (!branch_id || !trade_type || !mode || !financial_year) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const branch = await BranchModel.findById(branch_id);
        if (!branch) {
            return res.status(404).json({ message: "Branch not found" });
        }

        const counter = await JobCounterModel.findOne({ 
            branch_id, 
            financial_year, 
            trade_type, 
            mode 
        });

        const nextSequence = (counter ? counter.last_sequence : 0) + 1;
        const paddedSequence = nextSequence.toString().padStart(5, '0');
        const jobNumber = `${branch.branch_code}/${trade_type}/${mode}/${paddedSequence}/${financial_year}`;

        res.json({ nextSequence, paddedSequence, jobNumber });
    } catch (error) {
        console.error("Error fetching next job number:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
