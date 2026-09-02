import express from "express";
import mongoose from "mongoose";
import verifyToken from "../../middleware/authMiddleware.mjs";
import UserModel from "../../model/userModel.mjs";
import TeamModel from "../../model/teamModel.mjs";
import {
    getTemplate,
    saveTemplate,
    getZones,
    saveZone,
    deleteZone,
    getChecklist,
    updateChecklist,
    getAllChecklists
} from "../../controllers/audit5s/audit5s.controller.mjs";

const router = express.Router();

const requireRabsUser = async (req, res, next) => {
    try {
        const user = await UserModel.findById(req.user._id).select('username role company company_id').lean();
        if (!user) return res.status(404).json({ message: "User not found" });

        const company = await mongoose.model('Company').findById(user.company_id).lean();
        const isRabs = (user.company && /RABS/i.test(user.company)) || (company && /RABS/i.test(company.company_name));

        const isHodRole = (r) => {
            const normalized = String(r || '').trim().toLowerCase().replace(/[^a-z]/g, '');
            return normalized === 'hod' || normalized === 'headofdepartment';
        };

        const isHodOfAnyTeam = await TeamModel.exists({
            $or: [
                { hodId: user._id },
                ...(isHodRole(user.role) ? [{ "members.username": user.username }] : [])
            ],
            isActive: { $ne: false }
        });

        const isHod = isHodRole(user.role) || !!isHodOfAnyTeam;
        const isAdmin = user.role === 'Admin';

        if (!isRabs || (!isAdmin && !isHod)) {
            return res.status(403).json({ message: "Access Denied: The 5S Audit module is restricted to RABS Admin and HOD users only." });
        }
        next();
    } catch (err) {
        console.error("Error in requireRabsUser middleware:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// All routes are protected by default session check and RABS validation
router.use(verifyToken);
router.use(requireRabsUser);

// Template routes
router.get("/template", getTemplate);
router.post("/template", saveTemplate);

// Zone routes
router.get("/zones", getZones);
router.post("/zones", saveZone);
router.delete("/zones/:id", deleteZone);

// Checklist routes
router.get("/checklists", getAllChecklists);
router.get("/checklist", getChecklist);
router.put("/checklist/:id", updateChecklist);

export default router;
