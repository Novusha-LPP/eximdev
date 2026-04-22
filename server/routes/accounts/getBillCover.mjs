import express from "express";
import JobModel from "../../model/jobModel.mjs";
import BillModel from "../../model/billModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";

const router = express.Router();

router.get("/get-bill-cover", authMiddleware, async (req, res) => {
    try {
        const { importer, date } = req.query;

        if (!importer || !date) {
            return res.status(400).json({ success: false, message: "Importer and date are required" });
        }

        // Find jobs for the importer where bill_date contains the specified date
        // bill_date can be "date1,date2"
        const jobs = await JobModel.find({
            importer: { $regex: new RegExp(`^${importer}$`, "i") },
            bill_date: { $regex: date }
        }).select("job_no job_number bill_no bill_date importer description").lean();

        if (jobs.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const jobIds = jobs.map(j => j._id);

        // Fetch bills for these jobs to get final totals
        const bills = await BillModel.find({
            jobId: { $in: jobIds }
        }).select("jobId billNo type finalTotal totalTaxable totalNonGst").lean();

        // Combine job data with bill data
        const result = jobs.map(job => {
            const jobBills = bills.filter(b => b.jobId.toString() === job._id.toString());
            return {
                ...job,
                bills: jobBills
            };
        });

        res.json({ success: true, data: result });
    } catch (error) {
        console.error("Error in get-bill-cover:", error);
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
