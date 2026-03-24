import express from "express";
import BranchModel from "../../model/branchModel.mjs";
import UserBranchModel from "../../model/userBranchModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";

import auditMiddleware from "../../middleware/auditTrail.mjs";

const router = express.Router();

// Get all branches
router.get("/get-branches", async (req, res) => {
    try {
        const branches = await BranchModel.find().select("branch_name branch_code category is_active configuration ports _id");
        res.status(200).json(branches);
    } catch (error) {
        console.error("Error fetching branches:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Get branches assigned to the logged-in user
router.get("/my-branches", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.username || req.user._id;
        const role = req.user.role;

        const assignments = await UserBranchModel.find({ user_id: userId })
            .populate("branch_id", "branch_name branch_code category is_active configuration ports _id");

        if (assignments.length > 0) {
            const branches = assignments
                .filter(a => a.branch_id && a.branch_id.is_active)
                .map(a => a.branch_id);
            return res.status(200).json(branches);
        }

        if (role === 'Admin') {
            const branches = await BranchModel.find({ is_active: true }).select("branch_name branch_code category is_active configuration ports _id");
            return res.status(200).json(branches);
        }

        res.status(200).json([]);
    } catch (error) {
        console.error("Error fetching my branches:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Update an existing branch
router.put("/update-branch/:id", authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { branch_name, is_active, configuration } = req.body;

        const branch = await BranchModel.findById(id);
        if (!branch) {
            return res.status(404).json({ error: "Branch not found." });
        }

        // Update all categories (SEA/AIR) for this branch code to keep them in sync
        const result = await BranchModel.updateMany(
            { branch_code: branch.branch_code },
            {
                $set: {
                    branch_name: branch_name !== undefined ? branch_name : branch.branch_name,
                    is_active: is_active !== undefined ? is_active : branch.is_active,
                    configuration: configuration !== undefined ? configuration : branch.configuration
                }
            }
        );

        res.status(200).json({ message: "Branch updated successfully.", result });
    } catch (error) {
        console.error("Error updating branch:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Create a new branch
router.post("/add-branch", authMiddleware, async (req, res) => {
    try {
        const { branch_name, branch_code, is_active, configuration } = req.body;

        if (!branch_name || !branch_code) {
            return res.status(400).json({ error: "Branch name and code are required." });
        }

        if (branch_code.length < 3 || branch_code.length > 5) {
            return res.status(400).json({ error: "Branch code must be between 3 and 5 characters." });
        }

        const uppercaseCode = branch_code.toUpperCase();

        // Check if either SEA or AIR already exists for this code
        const existingBranch = await BranchModel.findOne({ branch_code: uppercaseCode });
        if (existingBranch) {
            return res.status(400).json({ error: "Branch code already exists." });
        }

        const creator = req.user?.id || null;
        const activeStatus = is_active !== undefined ? is_active : true;

        // Create both branches
        const seaBranch = new BranchModel({
            branch_name,
            branch_code: uppercaseCode,
            category: 'SEA',
            is_active: activeStatus,
            created_by: creator,
            configuration: configuration || {
                railout_enabled: true,
                gateway_igm_enabled: true,
                gateway_igm_date_enabled: true
            }
        });

        const airBranch = new BranchModel({
            branch_name,
            branch_code: uppercaseCode,
            category: 'AIR',
            is_active: activeStatus,
            created_by: creator,
            configuration: configuration || {
                railout_enabled: true,
                gateway_igm_enabled: true,
                gateway_igm_date_enabled: true
            }
        });

        await Promise.all([seaBranch.save(), airBranch.save()]);

        res.status(201).json({
            message: "SEA and AIR branches created successfully.",
            branches: [seaBranch, airBranch]
        });
    } catch (error) {
        console.error("Error creating branch:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Add a port to a branch
router.post("/add-branch-port", authMiddleware, async (req, res) => {
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

// User Branch Assignment Routes

// Get assigned branches for a user
router.get("/user-branches/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const assignments = await UserBranchModel.find({ user_id: userId })
            .populate("branch_id", "branch_name branch_code category")
            .sort({ assigned_at: -1 });
        res.status(200).json(assignments);
    } catch (error) {
        console.error("Error fetching user branches:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Assign a branch to a user
router.post("/assign-branch", authMiddleware, async (req, res) => {
    try {
        const { user_id, branch_id } = req.body;

        if (!user_id || !branch_id) {
            return res.status(400).json({ error: "User ID and Branch ID are required." });
        }

        // Check if already assigned
        const existing = await UserBranchModel.findOne({ user_id, branch_id });
        if (existing) {
            return res.status(400).json({ error: "User is already assigned to this branch." });
        }

        const assignment = new UserBranchModel({
            user_id,
            branch_id
        });

        await assignment.save();
        res.status(201).json({ message: "Branch assigned successfully.", assignment });
    } catch (error) {
        console.error("Error assigning branch:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Unassign a branch from a user
router.delete("/unassign-branch/:userBranchId", authMiddleware, async (req, res) => {
    try {
        const { userBranchId } = req.params;
        await UserBranchModel.findByIdAndDelete(userBranchId);
        res.status(200).json({ message: "Branch unassigned successfully." });
    } catch (error) {
        console.error("Error unassigning branch:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;
