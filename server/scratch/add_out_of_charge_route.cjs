const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../routes/project-nucleus/nucleusReports.mjs');
let content = fs.readFileSync(filePath, 'utf8');

const newRoute = `
// Out of Charge Summary Report
router.get("/out-of-charge-summaries", authMiddleware, applyUserBranchFilter, async (req, res) => {
    try {
        const { filterType, month, year, quarter, startDate, endDate, day, branchId, category } = req.query;
        const branchMatch = getBranchMatch(branchId, category, req.authorizedBranchIds);

        // Base: all non-cancelled jobs
        const baseMatchStage = {
            be_no: { $not: { $regex: "^cancelled$", $options: "i" } },
            out_of_charge: { $ne: null, $ne: "" },
            ...branchMatch,
        };

        const pipeline = [
            { $match: baseMatchStage },
            // Parse out_of_charge for date filtering
            {
                $addFields: {
                    parsedOocDate: {
                        $cond: {
                            if: {
                                $and: [
                                    { $ne: ["$out_of_charge", null] },
                                    { $ne: ["$out_of_charge", ""] },
                                    { $regexMatch: { input: "$out_of_charge", regex: /^\\d{4}-\\d{2}-\\d{2}/ } },
                                ],
                            },
                            then: { $toDate: "$out_of_charge" },
                            else: null,
                        },
                    },
                },
            },
            { $match: { parsedOocDate: { $ne: null } } }
        ];

        // Apply date filters
        let dateMatch = {};

        if (filterType === "day" && day) {
            dateMatch = {
                out_of_charge: { $regex: \`^\${day}\` },
            };
        } else if (filterType === "week" && day) {
            const refDate = new Date(day);
            const dayOfWeek = refDate.getDay(); 
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const weekStart = new Date(refDate);
            weekStart.setDate(refDate.getDate() + mondayOffset);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);
            dateMatch = {
                parsedOocDate: { $gte: weekStart, $lte: weekEnd },
            };
        } else if (filterType === "month" && month !== undefined && year) {
            const m = parseInt(month) + 1;
            const y = parseInt(year);
            dateMatch = {
                $expr: {
                    $and: [
                        { $eq: [{ $month: "$parsedOocDate" }, m] },
                        { $eq: [{ $year: "$parsedOocDate" }, y] },
                    ],
                },
            };
        } else if (filterType === "quarter" && quarter && year) {
            const q = parseInt(quarter);
            const y = parseInt(year);
            const sm = (q - 1) * 3 + 1;
            const em = sm + 2;
            dateMatch = {
                $expr: {
                    $and: [
                        { $gte: [{ $month: "$parsedOocDate" }, sm] },
                        { $lte: [{ $month: "$parsedOocDate" }, em] },
                        { $eq: [{ $year: "$parsedOocDate" }, y] },
                    ],
                },
            };
        } else if (filterType === "year" && year) {
            const y = parseInt(year);
            dateMatch = {
                $expr: { $eq: [{ $year: "$parsedOocDate" }, y] },
            };
        } else if (filterType === "date-range" && startDate && endDate) {
            dateMatch = {
                parsedOocDate: {
                    $gte: new Date(startDate),
                    $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
                },
            };
        }

        if (Object.keys(dateMatch).length > 0) {
            pipeline.push({ $match: dateMatch });
        }

        pipeline.push({
            $facet: {
                totalJobsCreated: [
                    { $count: "count" }
                ],
                outOfChargeData: [
                    {
                        $group: {
                            _id: {
                                branch: { $ifNull: ["$branch_code", "Unassigned"] },
                                port: { $ifNull: ["$port_of_reporting", "Unassigned"] },
                                employee: { $ifNull: ["$job_owner", "Unassigned"] },
                            },
                            count: { $sum: 1 },
                        }
                    },
                    { $sort: { "_id.branch": 1, "_id.port": 1, count: -1 } },
                    {
                        $project: {
                            _id: 0,
                            branch: "$_id.branch",
                            port: "$_id.port",
                            employee: "$_id.employee",
                            count: 1,
                        }
                    }
                ],
                categoryData: [
                    {
                        $group: {
                            _id: { $ifNull: ["$detailed_status", "Uncategorized"] },
                            count: { $sum: 1 },
                        }
                    },
                    { $sort: { count: -1 } },
                    {
                        $project: {
                            _id: 0,
                            category: "$_id",
                            count: 1,
                        }
                    }
                ]
            }
        });

        const result = await JobModel.aggregate(pipeline);

        const totalCreated = result[0]?.totalJobsCreated[0]?.count || 0;
        const outOfChargeData = result[0]?.outOfChargeData || [];
        const categoryData = result[0]?.categoryData || [];

        res.json({
            success: true,
            totalCreated,
            data: outOfChargeData,
            categoryData
        });
    } catch (error) {
        console.error("Error in /out-of-charge-summaries:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});
`;

if (!content.includes('/out-of-charge-summaries')) {
    content = content.replace('module.exports = router;', newRoute + '\n\nmodule.exports = router;');
    content = content.replace('export default router;', newRoute + '\n\nexport default router;');
    fs.writeFileSync(filePath, content);
    console.log("Added /out-of-charge-summaries route.");
} else {
    console.log("Route already exists.");
}
