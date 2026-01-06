import express from "express";
import User from "../../model/userModel.mjs";

const router = express.Router();

// GET users assigned to a specific importer
// Using query param to handle special characters safely: /api/get-importer-users?importerName=...
router.get("/api/get-importer-users", async (req, res) => {
    try {
        const { importerName } = req.query;

        if (!importerName) {
            return res.status(400).json({ error: "Importer name is required" });
        }

        // Find users who have this importer in their assigned_importer_name array.
        // assigned_importer_name is an array of strings.
        const users = await User.find({
            assigned_importer_name: importerName,
        }).select("username");

        const userNames = users.map((u) => u.username);

        // Sort for consistent display
        userNames.sort();

        res.status(200).json(userNames);
    } catch (error) {
        console.error("Error fetching importer users:", error);
        res.status(500).json({ error: "Failed to fetch assigned users" });
    }
});

export default router;
