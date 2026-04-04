import express from "express";
import multer from "multer";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import UserModel from "../../model/userModel.mjs";
import authMiddleware from "../../middleware/authMiddleware.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import logger from "../../logger.js";
import GlobalMarketingAsset from "../../model/GlobalMarketingAsset.mjs";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Configure AWS S3
const s3Client = new S3Client({
    region: process.env.REACT_APP_AWS_REGION || "ap-south-1",
    credentials: {
        accessKeyId: process.env.REACT_APP_ACCESS_KEY,
        secretAccessKey: process.env.REACT_APP_SECRET_ACCESS_KEY,
    },
});

// Middleware to check if user has access to HR/Marketing data
const hrOrMarketingOnly = async (req, res, next) => {
    try {
        // Since JWT might not have latest modules/department, fetch from DB
        const user = await UserModel.findById(req.user._id).select('role department modules first_name last_name');
        
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMarketing = user.department === 'Marketing';
        const isHR = user.department === 'HR';
        const isAdmin = user.role === 'Admin';
        const hasMarketingModule = user.modules?.includes('Update Employee Data');

        if (!isAdmin && !isMarketing && !isHR && !hasMarketingModule) {
            return res.status(403).json({ message: "Access Denied: HR/Marketing/Admin Only" });
        }

        req.full_name = `${user.first_name} ${user.last_name}`.trim();
        next();
    } catch (err) {
        logger.error(`Permission check error: ${err.message}`);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

// Get active employees grouped by company
router.get("/api/hr/active-by-company", authMiddleware, hrOrMarketingOnly, async (req, res) => {
    try {
        const users = await UserModel.find({ isActive: { $ne: false } }, 'first_name last_name username company employee_photo employee_photo_updatedBy employee_photo_updatedAt email_signature email_signature_updatedBy email_signature_updatedAt marketing_assets department designation profile_photo_proof email_signature_proof is_verified');
        
        const grouped = users.reduce((acc, user) => {
            const company = user.company || "Other";
            if (!acc[company]) acc[company] = [];
            acc[company].push(user);
            return acc;
        }, {});

        res.json(grouped);
    } catch (err) {
        logger.error(`Error fetching employees: ${err.message}`);
        res.status(500).json({ message: "Server Error" });
    }
});

// Upload Asset (Profile Photo, Email Signature, or Variable)
router.post("/api/hr/asset/upload", authMiddleware, hrOrMarketingOnly, upload.single('file'), auditMiddleware("UserAsset"), async (req, res) => {
    try {
        const { userId, assetType, assetName } = req.body; // assetType: 'photo', 'signature', 'variable'
        const file = req.file;

        if (!userId) return res.status(400).json({ message: "User ID is required" });

        const user = await UserModel.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        let fileUrl = "";
        if (file) {
            const timestamp = Date.now();
            const extension = file.originalname.split('.').pop();
            const key = `marketing/${userId}/${assetType}_${timestamp}.${extension}`;

            const command = new PutObjectCommand({
                Bucket: process.env.REACT_APP_S3_BUCKET,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            });

            await s3Client.send(command);
            fileUrl = `https://${process.env.REACT_APP_S3_BUCKET}.s3.${process.env.REACT_APP_AWS_REGION || "ap-south-1"}.amazonaws.com/${key}`;
        } else if (assetType === 'variable') {
            fileUrl = req.body.value; // For text-based variables
        }

        if (assetType === 'photo') {
            // Delete old photo from S3 if exists
            if (user.employee_photo && user.employee_photo.includes(process.env.REACT_APP_S3_BUCKET)) {
                await deleteFromS3(user.employee_photo);
            }
            user.employee_photo = fileUrl;
            user.employee_photo_updatedBy = req.full_name;
            user.employee_photo_updatedAt = new Date();
            user.profile_photo_proof = null; // Clear proof on update
        } else if (assetType === 'signature') {
            // Delete old signature from S3 if exists
            if (user.email_signature && user.email_signature.includes(process.env.REACT_APP_S3_BUCKET)) {
                await deleteFromS3(user.email_signature);
            }
            user.email_signature = fileUrl;
            user.email_signature_updatedBy = req.full_name;
            user.email_signature_updatedAt = new Date();
            user.email_signature_proof = null; // Clear proof on update
        } else if (assetType === 'variable') {
            const existingAssetIndex = user.marketing_assets.findIndex(a => a.name === assetName);
            if (existingAssetIndex > -1) {
                // Delete old file from S3 if it was a file
                const oldLink = user.marketing_assets[existingAssetIndex].link;
                if (oldLink && oldLink.includes(process.env.REACT_APP_S3_BUCKET)) {
                    await deleteFromS3(oldLink);
                }
                user.marketing_assets[existingAssetIndex] = { name: assetName, link: fileUrl, updatedAt: new Date(), updatedBy: req.full_name };
            } else {
                user.marketing_assets.push({ name: assetName, link: fileUrl, updatedAt: new Date(), updatedBy: req.full_name });
            }
        }

        await user.save();
        res.json({ message: "Asset updated successfully", user });
    } catch (err) {
        logger.error(`Asset upload error: ${err.message}`);
        res.status(500).json({ message: "Server Error", details: err.message });
    }
});

// Delete Asset
router.delete("/api/hr/asset/:userId/:assetId?", authMiddleware, hrOrMarketingOnly, auditMiddleware("UserAsset"), async (req, res) => {
    try {
        const { userId, assetId = "" } = req.params;
        const { assetType } = req.query; // 'photo', 'signature', 'variable'

        const user = await UserModel.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (assetType === 'photo') {
            if (user.employee_photo && user.employee_photo.includes(process.env.REACT_APP_S3_BUCKET)) {
                await deleteFromS3(user.employee_photo);
            }
            user.employee_photo = "";
            user.profile_photo_proof = null; // Clear proof when photo is deleted
        } else if (assetType === 'signature') {
            if (user.email_signature && user.email_signature.includes(process.env.REACT_APP_S3_BUCKET)) {
                await deleteFromS3(user.email_signature);
            }
            user.email_signature = "";
            user.email_signature_proof = null; // Clear proof when signature is deleted
        } else if (assetType === 'variable') {
            const assetIndex = user.marketing_assets.findIndex(a => a._id.toString() === assetId);
            if (assetIndex > -1) {
                const link = user.marketing_assets[assetIndex].link;
                if (link && link.includes(process.env.REACT_APP_S3_BUCKET)) {
                    await deleteFromS3(link);
                }
                user.marketing_assets.splice(assetIndex, 1);
            }
        }

        // Update is_verified status
        if (user.profile_photo_proof?.status === 'Approved' && user.email_signature_proof?.status === 'Approved') {
            user.is_verified = true;
        } else {
            user.is_verified = false;
        }

        await user.save();
        res.json({ message: "Asset deleted successfully", user });
    } catch (err) {
        logger.error(`Asset deletion error: ${err.message}`);
        res.status(500).json({ message: "Server Error" });
    }
});

// GLOBAL ASSETS ROUTES

// Get all global assets
router.get("/api/hr/global-assets", authMiddleware, async (req, res) => {
    try {
        const assets = await GlobalMarketingAsset.find().sort({ updatedAt: -1 });
        res.json(assets);
    } catch (err) {
        logger.error(`Error fetching global assets: ${err.message}`);
        res.status(500).json({ message: "Server Error" });
    }
});

// Upload Global Asset
router.post("/api/hr/global-asset/upload", authMiddleware, hrOrMarketingOnly, upload.single('file'), auditMiddleware("GlobalAsset"), async (req, res) => {
    try {
        const { assetName, value, type } = req.body; // type: 'file' or 'text'
        const file = req.file;

        let link = "";
        if (file) {
            const timestamp = Date.now();
            const extension = file.originalname.split('.').pop();
            const key = `marketing/global/${timestamp}_${file.originalname}`;

            const command = new PutObjectCommand({
                Bucket: process.env.REACT_APP_S3_BUCKET,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
            });

            await s3Client.send(command);
            link = `https://${process.env.REACT_APP_S3_BUCKET}.s3.${process.env.REACT_APP_AWS_REGION || "ap-south-1"}.amazonaws.com/${key}`;
        } else {
            link = value;
        }

        const newAsset = new GlobalMarketingAsset({
            name: assetName,
            link,
            type: file ? 'file' : 'text',
            updatedBy: req.full_name
        });

        await newAsset.save();
        res.json({ message: "Global asset added successfully", asset: newAsset });
    } catch (err) {
        logger.error(`Global asset upload error: ${err.message}`);
        res.status(500).json({ message: "Server Error" });
    }
});

// Delete Global Asset
router.delete("/api/hr/global-asset/:id", authMiddleware, hrOrMarketingOnly, auditMiddleware("GlobalAsset"), async (req, res) => {
    try {
        const { id } = req.params;
        const asset = await GlobalMarketingAsset.findById(id);
        if (!asset) return res.status(404).json({ message: "Asset not found" });

        // Delete from S3 if file
        if (asset.link.includes(process.env.REACT_APP_S3_BUCKET)) {
            await deleteFromS3(asset.link);
        }

        await asset.delete(); // Note: Depending on mongoose version, use .deleteOne() or .remove()
        res.json({ message: "Global asset deleted" });
    } catch (err) {
        // Fallback for newer mongoose versions
        try {
            await GlobalMarketingAsset.deleteOne({ _id: req.params.id });
             res.json({ message: "Global asset deleted" });
        } catch (innerErr) {
            logger.error(`Global asset deletion error: ${err.message}`);
            res.status(500).json({ message: "Server Error" });
        }
    }
});

// User uploads proof of marketing assets
router.post("/api/user/marketing-proof-upload", authMiddleware, upload.single('file'), auditMiddleware("UserMarketingProof"), async (req, res) => {
    try {
        const userId = req.user._id;
        const { assetType } = req.body; // 'profile_photo' or 'email_signature'
        const file = req.file;

        if (!file || !['profile_photo', 'email_signature'].includes(assetType)) {
            return res.status(400).json({ message: "File and valid assetType are required" });
        }

        const user = await UserModel.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const proofField = `${assetType}_proof`;
        
        // Delete old proof from S3 if exists
        if (user[proofField]?.url && user[proofField].url.includes(process.env.REACT_APP_S3_BUCKET)) {
            await deleteFromS3(user[proofField].url);
        }

        const timestamp = Date.now();
        const extension = file.originalname.split('.').pop();
        const key = `marketing/proofs/${userId}_${assetType}_${timestamp}.${extension}`;

        const command = new PutObjectCommand({
            Bucket: process.env.REACT_APP_S3_BUCKET,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
        });

        await s3Client.send(command);
        const fileUrl = `https://${process.env.REACT_APP_S3_BUCKET}.s3.${process.env.REACT_APP_AWS_REGION || "ap-south-1"}.amazonaws.com/${key}`;

        user[proofField] = {
            url: fileUrl,
            status: 'Pending'
        };
        
        await user.save();

        res.json({ message: `${assetType} proof uploaded successfully. Pending approval.`, proofUrl: fileUrl, user });
    } catch (err) {
        logger.error(`Proof upload error: ${err.message}`);
        res.status(500).json({ message: "Server Error", details: err.message });
    }
});

// Marketing/Admin action on proof (Approve/Reject)
router.post("/api/hr/marketing-proof-action", authMiddleware, hrOrMarketingOnly, auditMiddleware("UserMarketingProofAction"), async (req, res) => {
    try {
        const { userId, assetType, action } = req.body; // action: 'Approved' or 'Rejected'

        if (!userId || !assetType || !['Approved', 'Rejected'].includes(action)) {
            return res.status(400).json({ message: "Invalid request parameters" });
        }

        const user = await UserModel.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const proofField = `${assetType}_proof`;
        if (!user[proofField]) {
            user[proofField] = {};
        }

        user[proofField].status = action;
        if (action === 'Approved') {
            user[proofField].approvedAt = new Date();
            user[proofField].approvedBy = req.full_name;
        }

        // Check if both are Approved to set is_verified
        if (user.profile_photo_proof?.status === 'Approved' && user.email_signature_proof?.status === 'Approved') {
            user.is_verified = true;
        } else {
            user.is_verified = false;
        }

        await user.save();
        res.json({ message: `${assetType} proof ${action} successfully`, user });
    } catch (err) {
        logger.error(`Proof action error: ${err.message}`);
        res.status(500).json({ message: "Server Error" });
    }
});

// Helper function to delete from S3
async function deleteFromS3(url) {
    try {
        const urlObj = new URL(url);
        const key = decodeURIComponent(urlObj.pathname.substring(1));
        const command = new DeleteObjectCommand({
            Bucket: process.env.REACT_APP_S3_BUCKET,
            Key: key,
        });
        await s3Client.send(command);
    } catch (err) {
        logger.error(`S3 direct deletion error: ${err.message}`);
    }
}

export default router;
