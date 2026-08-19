import express from 'express';
import verifyToken from '../../middleware/authMiddleware.mjs';
import {
    getProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    getChecklists,
    getChecklistById,
    createChecklist,
    updateChecklist,
    checkWeek,
    reviewWeek
} from '../../controllers/attendance/firstAid.controller.js';
import UserModel from '../../model/userModel.mjs';
import mongoose from 'mongoose';

const router = express.Router();

// Middleware to restrict access to RABS users only (with Admin bypass)
const requireRabsUser = async (req, res, next) => {
    try {
        const user = await UserModel.findById(req.user._id).select('role company company_id').lean();
        if (!user) return res.status(404).json({ message: "User not found" });

        const company = await mongoose.model('Company').findById(user.company_id).lean();
        const isRabs = (user.company && /RABS/i.test(user.company)) || (company && /RABS/i.test(company.company_name));

        if (!isRabs && user.role !== 'Admin') {
            return res.status(403).json({ message: "Access Denied: The First Aid module is restricted to RABS employees only." });
        }
        next();
    } catch (err) {
        console.error("Error in requireRabsUser middleware:", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

// Protect all routes by verifyToken and requireRabsUser
router.use(verifyToken);
router.use(requireRabsUser);

// Products CRUD
router.get('/products', getProducts);
router.post('/products', addProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// Checklists CRUD & signatures
router.get('/checklists', getChecklists);
router.get('/checklists/:id', getChecklistById);
router.post('/checklists', createChecklist);
router.put('/checklists/:id', updateChecklist);
router.post('/checklists/:id/check/:week', checkWeek);
router.post('/checklists/:id/review/:week', reviewWeek);

export default router;
