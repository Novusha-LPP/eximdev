import express from "express";
import BranchModel from "../../model/branchModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";

const router = express.Router();

// Get all branches
router.get("/get-branches", async (req, res) => {
    try {
        const branches = await BranchModel.find().select("branch_name branch_code category is_active ports _id");
        res.status(200).json(branches);
    } catch (error) {
        console.error("Error fetching branches:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Create a new branch
router.post("/add-branch", async (req, res) => {
    try {
        const { branch_name, branch_code, category, is_active } = req.body;

        if (!branch_name || !branch_code || !category) {
            return res.status(400).json({ error: "Branch name, code, and category are required." });
        }

        if (branch_code.length < 3 || branch_code.length > 5) {
            return res.status(400).json({ error: "Branch code must be between 3 and 5 characters." });
        }

        const uppercaseCode = branch_code.toUpperCase();

        // Check if code exists
        const existingBranch = await BranchModel.findOne({ branch_code: uppercaseCode });
        if (existingBranch) {
            return res.status(400).json({ error: "Branch code already exists." });
        }

        const newBranch = new BranchModel({
            branch_name,
            branch_code: uppercaseCode,
            category,
            is_active: is_active !== undefined ? is_active : true,
            created_by: req.user?.id || null // Assuming user is in req
        });

        await newBranch.save();
        res.status(201).json(newBranch);
    } catch (error) {
        console.error("Error creating branch:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Add a port to a branch
router.post("/add-branch-port", async (req, res) => {
    try {
        const { branch_id, port_name, port_code } = req.body;

        if (!branch_id || !port_name || !port_code) {
            return res.status(400).json({ error: "Branch ID, Port Name, and Port Code are required." });
        }

        const uppercaseCode = port_code.toUpperCase();

        const branch = await BranchModel.findById(branch_id);
        if (!branch) {
            return res.status(404).json({ error: "Branch not found." });
        }

        // Check if port code already exists in this branch
        const portExists = branch.ports.some(p => p.port_code === uppercaseCode);
        if (portExists) {
            return res.status(400).json({ error: "Port code already exists in this branch." });
        }

        branch.ports.push({ port_name, port_code: uppercaseCode });
        await branch.save();

        res.status(201).json({ message: "Port added to branch successfully", branch });
    } catch (error) {
        console.error("Error adding port to branch:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
