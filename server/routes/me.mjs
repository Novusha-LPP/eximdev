import express from "express";
import verifyToken from "../middleware/authMiddleware.mjs";
import UserModel from "../model/userModel.mjs";

const router = express.Router();

router.get("/api/me", verifyToken, async (req, res) => {
    console.log("DEBUG: /api/me hit. User ID from token:", req.user?._id);
    try {
        console.log("DEBUG: /api/me - Attempting to find user in database...");

        // Let's verify we have a connection
        const UserModel = (await import("../model/userModel.mjs")).default;

        const user = await UserModel.findById(req.user._id).select(
            "username role can_access_exim_bot modules first_name middle_name last_name company employee_photo designation department employment_type email assigned_importer assigned_importer_name selected_icd_codes assignedBranch"
        ).lean();

        console.log("DEBUG: /api/me - Database query complete. User found:", !!user);
        if (!user) {
            console.log("DEBUG: /api/me - User not found in database for ID:", req.user._id);
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user);
    } catch (err) {
        console.error("DEBUG: /api/me - Error occurred:", err.message);
        console.error(err);
        res.status(500).json({ message: "Server Error", error: err.message });
    }
});

export default router;
