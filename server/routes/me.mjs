import express from "express";
import verifyToken from "../middleware/authMiddleware.mjs";
import UserModel from "../model/userModel.mjs";
import TeamModel from "../model/teamModel.mjs";

const router = express.Router();

router.get("/api/me", verifyToken, async (req, res) => {
    try {
        const user = await UserModel.findById(req.user._id).select(
            "username role can_access_exim_bot modules first_name middle_name last_name company employee_photo designation department employment_type email assigned_importer assigned_importer_name selected_icd_codes tenantId is_verified passwordChangedAt"
        );

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const userObj = user.toObject();
        const isHodOfAnyTeam = await TeamModel.exists({ hodId: user._id, isActive: { $ne: false } });
        userObj.isHOD = !!isHodOfAnyTeam;
        userObj.hodId = isHodOfAnyTeam ? user._id.toString() : undefined;

        const passwordChangedAt = user.passwordChangedAt || new Date(0);
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        userObj.passwordExpired = (Date.now() - new Date(passwordChangedAt).getTime()) > thirtyDaysInMs;

        res.status(200).json(userObj);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
});

export default router;
