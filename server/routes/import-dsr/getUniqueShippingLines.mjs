import express from "express";
import JobModel from "../../model/jobModel.mjs";

const router = express.Router();

router.get("/api/get-unique-shipping-lines", async (req, res) => {
    try {
        const uniqueShippingLines = await JobModel.aggregate([
            {
                $match: {
                    $or: [
                        { status: { $regex: /^pending$/i } },
                        { status: { $regex: /^completed$/i } }
                    ],
                    shipping_line_airline: { $exists: true, $ne: "", $ne: null }
                },
            },
            {
                $group: {
                    _id: "$shipping_line_airline",
                },
            },
            {
                $project: {
                    _id: 0,
                    shipping_line_airline: "$_id",
                },
            },
            {
                $sort: {
                    shipping_line_airline: 1,
                },
            },
        ]);

        res.status(200).json(uniqueShippingLines);
    } catch (error) {
        console.error("Error fetching unique shipping lines:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
