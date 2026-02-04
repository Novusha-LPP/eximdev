import express from "express";
// JobModel is now attached to req by branchJobMiddleware
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

router.get("/reports", async (req, res) => {
    try {
        // Use req.JobModel (attached by branchJobMiddleware) for branch-specific collection
        const JobModel = req.JobModel;

        // 1. Fetch potential jobs (optimized for performance)
        // We fetch ALL jobs to allow frontend to calculate "Total vs Fined" stats
        const jobs = await JobModel.find({})
            .select("job_no be_no be_date fine_amount penalty_amount importer penalty_by_us penalty_by_importer")
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
                penalty_by_us: job.penalty_by_us || false,
                penalty_by_importer: job.penalty_by_importer || false
            };
        });

        res.json(reportData);
    } catch (error) {
        console.error("Error fetching project nucleus reports:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post("/update-penalty-status", async (req, res) => {
    try {
        const { jobId, updates } = req.body;

        if (!jobId || !updates) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const updatedJob = await JobModel.findByIdAndUpdate(
            jobId,
            { $set: updates },
            { new: true }
        ).select("job_no penalty_by_us penalty_by_importer");

        if (!updatedJob) {
            return res.status(404).json({ error: "Job not found" });
        }

        res.json({ success: true, data: updatedJob });
    } catch (error) {
        console.error("Error updating penalty status:", error);
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


// Top 10 Importers Report
router.get("/top-importers", async (req, res) => {
    try {
        // Use req.JobModel (attached by branchJobMiddleware) for branch-specific collection
        const JobModel = req.JobModel;

        const { filterType, month, year, quarter, startDate, endDate } = req.query;

        // Base Match Condition: Must have out_of_charge date and NOT be Ex-Bond
        const matchStage = {
            out_of_charge: { $ne: null, $ne: "" },
            importer: { $ne: null, $ne: "" },
            be_filing_type: { $ne: "Ex-Bond" },
            type_of_b_e: { $ne: "Ex-Bond" }
        };

        const pipeline = [
            { $match: matchStage },
            // Robust Date Parsing
            {
                $addFields: {
                    oocDate: {
                        $cond: {
                            if: {
                                $and: [
                                    { $ne: ["$out_of_charge", null] },
                                    { $ne: ["$out_of_charge", ""] },
                                    { $regexMatch: { input: "$out_of_charge", regex: /^\d{4}-\d{2}-\d{2}/ } },
                                ],
                            },
                            then: { $toDate: "$out_of_charge" },
                            else: null,
                        },
                    },
                }
            },
            { $match: { oocDate: { $ne: null } } }
        ];

        let dateMatch = {};

        if (filterType === 'month' && month !== undefined && year) {
            const m = parseInt(month) + 1;
            const y = parseInt(year);
            dateMatch = {
                $expr: {
                    $and: [
                        { $eq: [{ $month: "$oocDate" }, m] },
                        { $eq: [{ $year: "$oocDate" }, y] }
                    ]
                }
            };
        } else if (filterType === 'quarter' && quarter && year) {
            const q = parseInt(quarter);
            const y = parseInt(year);
            const startMonth = (q - 1) * 3 + 1;
            const endMonth = startMonth + 2;
            dateMatch = {
                $expr: {
                    $and: [
                        { $gte: [{ $month: "$oocDate" }, startMonth] },
                        { $lte: [{ $month: "$oocDate" }, endMonth] },
                        { $eq: [{ $year: "$oocDate" }, y] }
                    ]
                }
            };
        } else if (filterType === 'year' && year) {
            const y = parseInt(year);
            dateMatch = {
                $expr: { $eq: [{ $year: "$oocDate" }, y] }
            };
        } else if (filterType === 'date-range' && startDate && endDate) {
            dateMatch = {
                oocDate: {
                    $gte: new Date(startDate),
                    $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
                }
            };
        }

        if (Object.keys(dateMatch).length > 0) {
            pipeline.push({ $match: dateMatch });
        }

        // Grouping & Aggregation
        pipeline.push(
            {
                $addFields: {
                    isLCL: { $eq: ["$consignment_type", "LCL"] },
                    // Calculate container counts for this job
                    fcl20: {
                        $size: {
                            $filter: {
                                input: { $ifNull: ["$container_nos", []] },
                                as: "c",
                                cond: { $eq: ["$$c.size", "20"] }
                            }
                        }
                    },
                    fcl40: {
                        $size: {
                            $filter: {
                                input: { $ifNull: ["$container_nos", []] },
                                as: "c",
                                cond: { $eq: ["$$c.size", "40"] }
                            }
                        }
                    }
                }
            },
            {
                $addFields: {
                    // Calculate TEUs for this job
                    jobFclTeus: {
                        $add: [
                            "$fcl20",
                            { $multiply: ["$fcl40", 2] }
                        ]
                    },
                    jobLclTeus: {
                        $cond: [
                            { $eq: ["$isLCL", true] },
                            1, // 1 TEU for LCL job
                            0
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: "$importer",
                    fclTeus: {
                        $sum: { $cond: [{ $eq: ["$isLCL", false] }, "$jobFclTeus", 0] }
                    },
                    lclTeus: { $sum: "$jobLclTeus" },
                    total20: {
                        $sum: { $cond: [{ $eq: ["$isLCL", false] }, "$fcl20", 0] }
                    },
                    total40: {
                        $sum: { $cond: [{ $eq: ["$isLCL", false] }, "$fcl40", 0] }
                    },
                    jobCount: { $sum: 1 }
                }
            },
            {
                $addFields: {
                    totalTeus: { $add: ["$fclTeus", "$lclTeus"] }
                }
            },
            { $sort: { totalTeus: -1 } },
            { $limit: 10 }
        );

        const topImporters = await JobModel.aggregate(pipeline);

        const relevantImporterNames = topImporters.map(i => i._id);
        const users = await UserModel.find({
            assigned_importer_name: { $in: relevantImporterNames }
        }).select("first_name last_name username assigned_importer_name role");

        const result = topImporters.map(imp => {
            const handlers = users.filter(u =>
                u.assigned_importer_name &&
                u.assigned_importer_name.includes(imp._id) &&
                (u.role && u.role.toLowerCase() === 'user')
            ).map(u => `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.username);

            return {
                importer: imp._id,
                handlers: handlers,
                totalTeus: imp.totalTeus,
                fclTeus: imp.fclTeus,
                lclTeus: imp.lclTeus,
                total20: imp.total20,
                total40: imp.total40
            };
        });

        res.json(result);

    } catch (error) {
        console.error("Error fetching top importers:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
