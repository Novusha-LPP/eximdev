import express from "express";
import mongoose from "mongoose";
import UserModel from "../../model/userModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import logger from "../../logger.js";

const router = express.Router();

const isAuthorizedManager = (user) => {
    if (!user) return false;
    const role = String(user.role || '').toUpperCase();
    const dept = String(user.department || '').toUpperCase();
    const modules = user.modules || [];
    
    return (
        role === 'ADMIN' ||
        dept === 'HR' ||
        role === 'HOD' ||
        role === 'HEAD_OF_DEPARTMENT' ||
        role === 'HEADOFDEPARTMENT' ||
        modules.includes('Update Employee Data')
    );
};

// GET PF and ESIC documents for a specific user
router.get("/api/hr/pf-esic/:userId", authMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Fetch fresh user data from DB to verify role, department, modules, and RABS status
        const requester = await UserModel.findById(req.user._id).select('role department modules company company_id');
        if (!requester) return res.status(404).json({ message: "Requester not found" });

        const company = await mongoose.model('Company').findById(requester.company_id).lean();
        const isRabsUser = (requester.company && /RABS/i.test(requester.company)) || (company && /RABS/i.test(company.company_name));

        if (!isRabsUser && requester.role !== 'Admin') {
            return res.status(403).json({ message: "Access Denied: The PF & ESIC Documents are restricted to RABS employees only." });
        }

        const employee = await UserModel.findById(userId).select("pf_no pf_card_url esic_no esic_card_url username first_name last_name company company_id");
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const targetCompany = await mongoose.model('Company').findById(employee.company_id).lean();
        const isTargetRabs = (employee.company && /RABS/i.test(employee.company)) || (targetCompany && /RABS/i.test(targetCompany.company_name));

        if (!isTargetRabs) {
            return res.status(403).json({ message: "Access Denied: PF & ESIC Documents are only applicable to RABS employees." });
        }

        // Security check: Only respective employee and HR/Admin/HOD can access
        const isSelf = String(req.user._id) === String(userId);
        const hasManagerAccess = isAuthorizedManager(requester);
        
        if (!isSelf && !hasManagerAccess) {
            return res.status(403).json({ message: "Access Denied: Only the respective employee or authorized managers/HR/Admin can access these documents." });
        }

        res.status(200).json({
            pf_no: employee.pf_no,
            pf_card_url: employee.pf_card_url || "",
            esic_no: employee.esic_no,
            esic_card_url: employee.esic_card_url || ""
        });
    } catch (err) {
        logger.error(`Error fetching PF/ESIC documents: ${err.message}`);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// Update PF and ESIC documents for a specific user
router.post("/api/hr/pf-esic/:userId", authMiddleware, auditMiddleware("User"), async (req, res) => {
    try {
        const { userId } = req.params;
        const { pf_card_url, esic_card_url } = req.body;

        // Security check: Only authorized managers/HR/Admin can upload/modify
        const requester = await UserModel.findById(req.user._id).select('role department modules company company_id');
        if (!requester) return res.status(404).json({ message: "User not found" });

        const company = await mongoose.model('Company').findById(requester.company_id).lean();
        const isRabsUser = (requester.company && /RABS/i.test(requester.company)) || (company && /RABS/i.test(company.company_name));

        if (!isRabsUser && requester.role !== 'Admin') {
            return res.status(403).json({ message: "Access Denied: PF & ESIC modifications are restricted to RABS employees only." });
        }
        
        if (!isAuthorizedManager(requester)) {
            return res.status(403).json({ message: "Access Denied: Only authorized managers, HR, or Admin can modify these documents." });
        }

        const employee = await UserModel.findById(userId);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const targetCompany = await mongoose.model('Company').findById(employee.company_id).lean();
        const isTargetRabs = (employee.company && /RABS/i.test(employee.company)) || (targetCompany && /RABS/i.test(targetCompany.company_name));

        if (!isTargetRabs) {
            return res.status(403).json({ message: "Access Denied: PF & ESIC Documents are only applicable to RABS employees." });
        }

        if (pf_card_url !== undefined) {
            employee.pf_card_url = pf_card_url;
        }
        if (esic_card_url !== undefined) {
            employee.esic_card_url = esic_card_url;
        }

        employee.updated_by = req.user._id;
        await employee.save();

        res.status(200).json({
            message: "PF/ESIC documents updated successfully",
            pf_card_url: employee.pf_card_url || "",
            esic_card_url: employee.esic_card_url || ""
        });
    } catch (err) {
        logger.error(`Error saving PF/ESIC documents: ${err.message}`);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

export default router;
