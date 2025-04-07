import express from 'express';
import PrData from '../../model/srcc/pr.mjs';

const router = express.Router();

router.get('/api/get-lr-job-list', async (req, res) => {
    try {
        const { year, status } = req.query; // Use query instead of params
        const { page = 1, limit = 100, search = "" } = req.query;
        const skip = (page - 1) * limit;

        // Build aggregation pipeline
        const pipeline = [
            { $match: { year, status } }, // Match year and status
            {
                $match: {
                    $or: [
                        { pr_no: { $regex: search, $options: "i" } },
                        { consignor: { $regex: search, $options: "i" } },
                        { consignee: { $regex: search, $options: "i" } }
                    ]
                }
            },
            { $skip: skip },
            { $limit: parseInt(limit) },
            {
                $project: {
                    pr_no: 1,
                    pr_date: 1,
                    consignor: 1,
                    consignee: 1,
                    status: 1
                }
            }
        ];

        const data = await PrData.aggregate(pipeline);
        const total = await PrData.countDocuments({ year, status });

        res.json({
            data,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;