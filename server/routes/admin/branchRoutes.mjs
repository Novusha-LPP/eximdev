import express from "express";
import BranchModel from "../../model/branchModel.mjs";
import { initializeBranchCollections } from "../../model/jobModelFactory.mjs";


const router = express.Router();

// Create new branch
router.post("/api/admin/branches", async (req, res) => {
    try {
        const { branch_name, categories, sea_icd_list, air_icd_list } = req.body;

        // Validate
        if (!branch_name) {
            return res.status(400).json({ message: "Branch name is required" });
        }

        const newBranch = new BranchModel({
            branch_name,
            sea_icd_list: sea_icd_list || [],
            air_icd_list: air_icd_list || [],
            categories: categories || ["SEA"],
            sea_behavior: req.body.sea_behavior || "Other SEA",
        });

        await newBranch.save();

        // Initialize collections for the new branch
        await initializeBranchCollections(branch_name, categories || ["SEA"]);

        res.status(201).json(newBranch);

    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: "Branch name already exists" });
        }
        console.error("Error creating branch:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Update branch
router.put("/api/admin/branches/:id", async (req, res) => {
    try {
        const { sea_icd_list, air_icd_list, categories, isActive, branch_name } = req.body;

        const branch = await BranchModel.findByIdAndUpdate(
            req.params.id,
            {
                sea_icd_list,
                air_icd_list,
                categories,
                isActive,
                branch_name,
                sea_behavior: req.body.sea_behavior,
            },
            { new: true }
        );

        if (!branch) {
            return res.status(404).json({ message: "Branch not found" });
        }

        // Initialize collections in case new categories were added
        if (categories && categories.length > 0) {
            await initializeBranchCollections(branch.branch_name, categories);
        }

        res.status(200).json(branch);

    } catch (err) {
        console.error("Error updating branch:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Get all branches
router.get("/api/admin/branches", async (req, res) => {
    try {
        const branches = await BranchModel.find();
        res.status(200).json({ data: branches });
    } catch (err) {
        console.error("Error fetching branches:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
