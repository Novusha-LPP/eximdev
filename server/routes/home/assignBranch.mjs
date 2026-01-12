import express from "express";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

router.post("/api/assign-branch", async (req, res) => {
    try {
        const { branch, username } = req.body;
        const user = await UserModel.findOne({ username });
        if (!user) {
            return res.status(404).send("User not found");
        }
        user.assignedBranch = branch;
        await user.save();
        res.send("success");
    } catch (error) {
        console.error("Error assigning branch:", error);
        res.status(500).send("Internal server error");
    }
});

export default router;
