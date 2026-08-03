import express from "express";
import verifyToken from "../../middleware/authMiddleware.mjs";
import {
    getTemplate,
    saveTemplate,
    getZones,
    saveZone,
    deleteZone,
    getChecklist,
    updateChecklist
} from "../../controllers/audit5s/audit5s.controller.mjs";

const router = express.Router();

// All routes are protected by default session check
router.use(verifyToken);

// Template routes
router.get("/template", getTemplate);
router.post("/template", saveTemplate);

// Zone routes
router.get("/zones", getZones);
router.post("/zones", saveZone);
router.delete("/zones/:id", deleteZone);

// Checklist routes
router.get("/checklist", getChecklist);
router.put("/checklist/:id", updateChecklist);

export default router;
