import express from "express";
import verifyToken from "../middleware/authMiddleware.mjs";
import UserModel from "../model/userModel.mjs";

const router = express.Router();

router.get("/api/me", verifyToken, async (req, res) => {
    try {
        const user = await UserModel.findById(req.user._id).select(
            "username role can_access_exim_bot modules first_name middle_name last_name company employee_photo designation department employment_type email assigned_importer assigned_importer_name selected_icd_codes"
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
});

export default router;
