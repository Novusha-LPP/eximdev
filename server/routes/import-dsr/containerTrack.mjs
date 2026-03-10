import express from "express";
import axios from "axios";

const router = express.Router();

router.post("/api/container-track", async (req, res) => {
    try {
        const { containerNo } = req.body;

        if (!containerNo || !Array.isArray(containerNo) || containerNo.length === 0) {
            return res.status(400).json({
                success: false,
                message: "containerNo array is required"
            });
        }

        const response = await axios.post(
            "https://www.concorindia.co.in/api/multipalContainer",
            { containerNo },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                },
                timeout: 30000
            }
        );

        res.json({
            success: true,
            data: response.data
        });

    } catch (error) {
        console.error("CONCOR Container Track API error:", error.message);

        if (error.response) {
            return res.status(error.response.status).json({
                success: false,
                message: "CONCOR API error",
                error: error.response.data
            });
        }

        if (error.code === "ECONNABORTED") {
            return res.status(504).json({
                success: false,
                message: "Request timeout - CONCOR is taking too long to respond"
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to fetch container tracking data",
            error: error.message
        });
    }
});

export default router;
