import FirstAidProduct from '../../model/attendance/FirstAidProduct.js';
import FirstAidChecklist from '../../model/attendance/FirstAidChecklist.js';
import UserModel from '../../model/userModel.mjs';
import mongoose from 'mongoose';
import logger from '../../logger.js';

const isAuthorizedManager = (user) => {
    if (!user) return false;
    const role = String(user.role || '').toUpperCase();
    const dept = String(user.department || '').toUpperCase();
    return (
        role === 'ADMIN' ||
        dept === 'HR' ||
        role === 'HOD' ||
        role === 'HEAD_OF_DEPARTMENT' ||
        role === 'HEADOFDEPARTMENT' ||
        user.isHOD === true
    );
};

const seedDefaultProducts = async (companyId, userId) => {
    const defaults = [
        { name: 'Paracetamol Tablets IP 500 mg', generic: 'Paracetamol', purpose: 'Fever, headache, body pain, mild to moderate pain' },
        { name: 'Lopox', generic: 'Loperamide Hydrochloride 2 mg', purpose: 'Diarrhea (Loose Motion)' },
        { name: 'Zycold-P', generic: 'Paracetamol + Phenylephrine + Chlorpheniramine', purpose: 'Cold, cough, fever, blocked nose, runny nose' },
        { name: 'Histafree', generic: 'Bromhexine + Phenylephrine + Chlorpheniramine', purpose: 'Cough, chest congestion, common cold' },
        { name: 'Wayfenac Gel', generic: 'Diclofenac + Methyl Salicylate + Menthol', purpose: 'Muscle pain, joint pain, sprain, swelling' },
        { name: 'Vitadash-Z', generic: 'Vitamin C + Zinc', purpose: 'Immunity support, vitamin deficiency, recovery' },
        { name: 'Soframycin Cream', generic: 'Framycetin Sulphate', purpose: 'Cuts, wounds, burns, skin infection' },
        { name: 'Clocip Antifungal Powder', generic: 'Clotrimazole', purpose: 'Fungal infection, itching, athlete\'s foot' },
        { name: 'Volini Pain Relief Spray', generic: 'Diclofenac-based pain relief spray', purpose: 'Muscle pain, back pain, sprain, sports injury' },
        { name: 'Microporous Surgical Tape', generic: 'Adhesive Tape', purpose: 'Dressing fixation, bandage support' },
        { name: 'Surgical Scissors', generic: '-', purpose: 'Cutting bandages, tape, gauze' },
        { name: 'Cotton Roll', generic: 'Absorbent Cotton', purpose: 'Wound cleaning, dressing' },
        { name: 'Roller Bandage', generic: 'Cotton Bandage', purpose: 'Dressing support, sprain, wound covering' },
        { name: 'Gauze Swab', generic: 'Sterile Gauze', purpose: 'Cleaning and dressing wounds' },
        { name: 'Crepe Bandage', generic: 'Elastic Bandage', purpose: 'Sprain, strain, compression support' },
        { name: 'Band-Aid', generic: 'Adhesive Bandage', purpose: 'Minor cuts and small wounds' }
    ];
    for (const item of defaults) {
        try {
            const existing = await FirstAidProduct.findOne({ name: item.name, company_id: companyId });
            if (existing) {
                existing.generic_name = item.generic;
                existing.purpose = item.purpose;
                await existing.save();
            } else {
                await FirstAidProduct.create({
                    name: item.name,
                    generic_name: item.generic,
                    purpose: item.purpose,
                    company_id: companyId,
                    status: 'active',
                    created_by: userId
                });
            }
        } catch (e) {
            // Ignore
        }
    }
};

// --- PRODUCT/MEDICINE CRUD ---

export const getProducts = async (req, res) => {
    try {
        const companyId = req.user.company_id;
        let products = await FirstAidProduct.find({ company_id: companyId }).sort({ name: 1 });
        
        if (products.length === 0) {
            console.log(`[FirstAid] Seeding default medicines for company: ${companyId}`);
            await seedDefaultProducts(companyId, req.user._id);
            products = await FirstAidProduct.find({ company_id: companyId }).sort({ name: 1 });
        }
        
        res.status(200).json(products);
    } catch (err) {
        logger.error(`Error in getProducts: ${err.message}`);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const addProduct = async (req, res) => {
    try {
        const { name, genericName, purpose, totalStock } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Product name is required.' });
        }

        const requester = await UserModel.findById(req.user._id).lean();
        if (!isAuthorizedManager(requester)) {
            return res.status(403).json({ message: 'Access Denied: Only Admin/HOD can add products.' });
        }

        const companyId = req.user.company_id;
        const exists = await FirstAidProduct.findOne({ name: name.trim(), company_id: companyId });
        if (exists) {
            return res.status(400).json({ message: 'Product with this name already exists.' });
        }

        const product = new FirstAidProduct({
            name: name.trim(),
            generic_name: (genericName || '').trim(),
            purpose: (purpose || '').trim(),
            total_stock: totalStock !== undefined ? Number(totalStock) || 0 : 0,
            company_id: companyId,
            created_by: req.user._id
        });
        await product.save();

        res.status(201).json(product);
    } catch (err) {
        logger.error(`Error in addProduct: ${err.message}`);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, status, genericName, purpose, totalStock } = req.body;

        const requester = await UserModel.findById(req.user._id).lean();
        if (!isAuthorizedManager(requester)) {
            return res.status(403).json({ message: 'Access Denied: Only Admin/HOD can update products.' });
        }

        const product = await FirstAidProduct.findById(id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        if (name !== undefined) product.name = name.trim();
        if (status !== undefined) product.status = status;
        if (genericName !== undefined) product.generic_name = (genericName || '').trim();
        if (purpose !== undefined) product.purpose = (purpose || '').trim();
        if (totalStock !== undefined) product.total_stock = Number(totalStock) || 0;
        product.updated_by = req.user._id;

        await product.save();
        res.status(200).json(product);
    } catch (err) {
        logger.error(`Error in updateProduct: ${err.message}`);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const requester = await UserModel.findById(req.user._id).lean();
        if (!isAuthorizedManager(requester)) {
            return res.status(403).json({ message: 'Access Denied: Only Admin/HOD can delete products.' });
        }

        // We toggle to inactive rather than hard delete to preserve historical checklist records
        const product = await FirstAidProduct.findById(id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found.' });
        }

        product.status = 'inactive';
        product.updated_by = req.user._id;
        await product.save();

        res.status(200).json({ message: 'Product deactivated successfully.', product });
    } catch (err) {
        logger.error(`Error in deleteProduct: ${err.message}`);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// --- CHECKLIST CRUD & SIGN-OFFS ---

export const getChecklists = async (req, res) => {
    try {
        const companyId = req.user.company_id;
        const { month, area } = req.query;
        const filter = { company_id: companyId };
        
        if (month) filter.month = month;
        if (area) filter.area = area;

        const checklists = await FirstAidChecklist.find(filter).sort({ month: -1, area: 1 });
        res.status(200).json(checklists);
    } catch (err) {
        logger.error(`Error in getChecklists: ${err.message}`);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const getChecklistById = async (req, res) => {
    try {
        const { id } = req.params;
        const checklist = await FirstAidChecklist.findById(id);
        if (!checklist) {
            return res.status(404).json({ message: 'Checklist not found.' });
        }
        res.status(200).json(checklist);
    } catch (err) {
        logger.error(`Error in getChecklistById: ${err.message}`);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const createChecklist = async (req, res) => {
    try {
        const { month, area, responsibility } = req.body;
        if (!month || !area || !responsibility) {
            return res.status(400).json({ message: 'Month, area, and responsibility are required.' });
        }

        const companyId = req.user.company_id;

        // Check if checklist already exists
        const exists = await FirstAidChecklist.findOne({ month, area, company_id: companyId });
        if (exists) {
            return res.status(400).json({ message: `A First Aid Checklist already exists for Area "${area}" in "${month}".` });
        }

        // Get all active products
        let activeProducts = await FirstAidProduct.find({ company_id: companyId, status: 'active' }).sort({ name: 1 });
        if (activeProducts.length === 0) {
            await seedDefaultProducts(companyId, req.user._id);
            activeProducts = await FirstAidProduct.find({ company_id: companyId, status: 'active' }).sort({ name: 1 });
        }

        const items = activeProducts.map(p => ({
            product_id: p._id,
            product_name: p.name,
            generic_name: p.generic_name || '',
            purpose: p.purpose || '',
            expiry_date: '',
            week1_qty: '',
            week2_qty: '',
            week3_qty: '',
            week4_qty: '',
            week5_qty: '',
            remarks: ''
        }));

        const checklist = new FirstAidChecklist({
            month,
            area: area.trim(),
            responsibility: responsibility.trim(),
            company_id: companyId,
            items,
            created_by: req.user._id
        });

        await checklist.save();
        res.status(201).json(checklist);
    } catch (err) {
        logger.error(`Error in createChecklist: ${err.message}`);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const updateChecklist = async (req, res) => {
    try {
        const { id } = req.params;
        const { items, responsibility } = req.body;

        const checklist = await FirstAidChecklist.findById(id);
        if (!checklist) {
            return res.status(404).json({ message: 'Checklist not found.' });
        }

        if (responsibility !== undefined) checklist.responsibility = responsibility;
        if (items !== undefined) checklist.items = items;
        checklist.updated_by = req.user._id;

        await checklist.save();
        res.status(200).json(checklist);
    } catch (err) {
        logger.error(`Error in updateChecklist: ${err.message}`);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const checkWeek = async (req, res) => {
    try {
        const { id, week } = req.params;
        const weekNum = parseInt(week, 10);
        if (isNaN(weekNum) || weekNum < 1 || weekNum > 5) {
            return res.status(400).json({ message: 'Invalid week number (must be 1-5).' });
        }

        const checklist = await FirstAidChecklist.findById(id);
        if (!checklist) {
            return res.status(404).json({ message: 'Checklist not found.' });
        }

        // Add or update weekly check sign-off
        const idx = checklist.checked_by_weeks.findIndex(w => w.week_no === weekNum);
        const signOffData = {
            week_no: weekNum,
            date: new Date(),
            user_id: req.user._id,
            user_name: req.user.username
        };

        if (idx > -1) {
            checklist.checked_by_weeks[idx] = signOffData;
        } else {
            checklist.checked_by_weeks.push(signOffData);
        }

        await checklist.save();
        res.status(200).json(checklist);
    } catch (err) {
        logger.error(`Error in checkWeek: ${err.message}`);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

export const reviewWeek = async (req, res) => {
    try {
        const { id, week } = req.params;
        const weekNum = parseInt(week, 10);
        if (isNaN(weekNum) || weekNum < 1 || weekNum > 5) {
            return res.status(400).json({ message: 'Invalid week number (must be 1-5).' });
        }

        const requester = await UserModel.findById(req.user._id).lean();
        if (!isAuthorizedManager(requester)) {
            return res.status(403).json({ message: 'Access Denied: Only Admin/HOD can review checklists.' });
        }

        const checklist = await FirstAidChecklist.findById(id);
        if (!checklist) {
            return res.status(404).json({ message: 'Checklist not found.' });
        }

        // Add or update weekly review sign-off
        const idx = checklist.reviewed_by_weeks.findIndex(w => w.week_no === weekNum);
        const signOffData = {
            week_no: weekNum,
            date: new Date(),
            user_id: req.user._id,
            user_name: req.user.username
        };

        if (idx > -1) {
            checklist.reviewed_by_weeks[idx] = signOffData;
        } else {
            checklist.reviewed_by_weeks.push(signOffData);
        }

        await checklist.save();
        res.status(200).json(checklist);
    } catch (err) {
        logger.error(`Error in reviewWeek: ${err.message}`);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
