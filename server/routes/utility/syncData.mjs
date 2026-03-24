import express from "express";
import { syncProductionToLocal } from "../../services/syncService.mjs";

const router = express.Router();

router.post("/utility/sync-production", async (req, res) => {
    // Security Check: Only allow in non-production environments
    if (process.env.NODE_ENV === "production" && !req.query.force) {
        return res.status(403).json({
            success: false,
            message: "Database sync is disabled in production environment.",
        });
    }

    // Set headers for SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const { runSync, runMigrateJobs, runMigrateGandhidham } = req.body;

    const sendProgress = (data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
        console.log("🚀 Starting Production-to-Local Sync Request (SSE)...");

        await syncProductionToLocal({
            runSync: !!runSync,
            runMigrateJobs: !!runMigrateJobs,
            runMigrateGandhidham: !!runMigrateGandhidham,
            onProgress: (progress) => {
                sendProgress({ success: true, ...progress });
            }
        });

        res.end();
    } catch (error) {
        console.error("❌ Sync Route Error:", error);
        sendProgress({
            success: false,
            message: "An error occurred during database synchronization.",
            error: error.message,
        });
        res.end();
    }
});

export default router;
