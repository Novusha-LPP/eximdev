import express from "express";
import UserModel from "../../model/userModel.mjs";

const router = express.Router();

// Update user profile photo
router.put("/api/update-profile-photo", async (req, res) => {
    try {
        const { username, employee_photo } = req.body;

        if (!username || !employee_photo) {
            return res.status(400).json({ message: "Username and photo URL are required" });
        }

        const updatedUser = await UserModel.findOneAndUpdate(
            { username },
            { $set: { employee_photo } },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
            message: "Profile photo updated successfully",
            employee_photo: updatedUser.employee_photo
        });
    } catch (error) {
        console.error("Error updating profile photo:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

export default router;
