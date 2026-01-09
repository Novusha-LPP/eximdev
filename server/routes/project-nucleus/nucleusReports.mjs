import express from "express";
import JobModel from "../../model/jobModel.mjs";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

router.get("/reports", async (req, res) => {
    try {
        // 1. Fetch potential jobs (optimized for performance)
        // We fetch ALL jobs to allow frontend to calculate "Total vs Fined" stats
        const jobs = await JobModel.find({})
            .select("job_no be_no be_date fine_amount penalty_amount importer")
            .lean();

        // 2. Fetch all users for handler mapping
        // Map Importer Name -> List of User Names
        const users = await UserModel.find({}).select(
            "first_name last_name username assigned_importer_name role"
        ).lean();

        const importerHandlers = {};

        users.forEach((user) => {
            // Filter: Only include users with role 'User' (case-insensitive check to be safe)
            if (!user.role || (user.role !== 'User' && user.role !== 'user')) {
                return;
            }

            const displayName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username;

            if (user.assigned_importer_name && Array.isArray(user.assigned_importer_name)) {
                user.assigned_importer_name.forEach((impName) => {
                    // impName is the importer name string
                    if (impName) {
                        if (!importerHandlers[impName]) {
                            importerHandlers[impName] = [];
                        }
                        importerHandlers[impName].push(displayName);
                    }
                });
            }
        });

        // 3. Process and Filter Jobs
        // We return ALL jobs to client so it can calculate totals vs fines
        const reportData = jobs.map((job) => {
            const fineVal = parseAmount(job.fine_amount);
            const penaltyVal = parseAmount(job.penalty_amount);

            return {
                _id: job._id,
                job_no: job.job_no,
                be_no: job.be_no,
                be_date: job.be_date,
                fine_amount: job.fine_amount || "0",
                penalty_amount: job.penalty_amount || "0",
                fine_val: fineVal,
                penalty_val: penaltyVal,
                importer: job.importer,
                handlers: importerHandlers[job.importer] || [],
            };
        });

        res.json(reportData);
    } catch (error) {
        console.error("Error fetching project nucleus reports:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

function parseAmount(amountStr) {
    if (!amountStr) return 0;
    if (typeof amountStr === 'number') return amountStr;

    // Remove non-numeric chars except dot
    // e.g. "₹5,000" -> "5000", "5000.00" -> "5000.00"
    const cleaned = amountStr.toString().replace(/[^0-9.]/g, "");
    return parseFloat(cleaned) || 0;
}

export default router;
