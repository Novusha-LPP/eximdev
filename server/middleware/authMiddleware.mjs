import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { context } from "../utils/context.mjs";
import UserBranchModel from "../model/userBranchModel.mjs";

dotenv.config();

const verifyToken = async (req, res, next) => {
    // 1. Check for API key (x-api-key) for server-to-server calls
    const apiKey = req.headers["x-api-key"] || req.query["api_key"] || req.query["x-api-key"];
    if (apiKey) {
        const cleanKey = apiKey.trim();
        const expectedApiKey = process.env.CLIENT_API_KEY || process.env.JWT_SECRET;
        let isValid = false;
        let keyDoc = null;

        if (expectedApiKey && cleanKey === expectedApiKey.trim()) {
            isValid = true;
        } else {
            try {
                const ApiKeyModel = (await import("../model/apiKeyModel.mjs")).default;
                keyDoc = await ApiKeyModel.findOne({ key: cleanKey, isActive: true });
                if (keyDoc) {
                    isValid = true;
                    ApiKeyModel.updateOne(
                        { _id: keyDoc._id },
                        { $set: { lastUsedAt: new Date() } }
                    ).catch(err => console.error("Error updating API key lastUsedAt:", err));
                }
            } catch (dbErr) {
                console.error("Database check for API key failed:", dbErr);
            }
        }

        if (isValid) {
            req.user = {
                role: 'Admin',
                username: 'ClientApp',
                _id: keyDoc ? keyDoc._id : "6a2bb38ff9c7a55975a46633"
            };
            // Run subsequent middleware and controller in the user context
            context.run({ user: req.user, req }, next);
            return;
        } else {
            return res.status(401).json({ message: "Access Denied: Invalid API Key" });
        }
    }

    // Check for token in cookies or Authorization header
    let token = req.cookies.token;
    
    if (!token && req.headers.authorization) {
        const parts = req.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
            token = parts[1];
        }
    }

    if (!token) {
        return res.status(401).json({ message: "Access Denied: No Token Provided" });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_do_not_use_in_prod");
        req.user = verified;

        // Fetch user from DB to calculate profile completion
        const UserModel = (await import("../model/userModel.mjs")).default;
        const { calculateProfileCompletion } = await import("../utils/profileCompletion.mjs");
        
        const fullUser = await UserModel.findById(verified._id).lean();
        if (fullUser) {
            const completion = calculateProfileCompletion(fullUser);
            req.user.profileCompletion = completion;
            req.user.isAttendanceAllowedAdmin = fullUser.isAttendanceAllowedAdmin || false;

            // Only enforce profile completion controls for non-Admin users
            if (fullUser.role !== 'Admin') {
                const isWriteRequest = ['POST', 'PUT', 'DELETE'].includes(req.method);
                
                // Allowed paths that bypass restrictions:
                // - Auth/user profile: me, getUserData, logout, change-password, complete-kyc, complete-onboarding, update-profile-photo
                // - Attendance/payroll/statutory compliance: attendance, leave, regularization, payroll
                const allowedPathPattern = /^\/api\/(login|logout|me|getUserData|complete-kyc|complete-onboarding|update-profile-photo|attendance|leave|payroll|regularization)/i;
                const isAllowedPath = allowedPathPattern.test(req.path);

                if (completion.isBlocked && !isAllowedPath) {
                    return res.status(403).json({
                        message: `Access Denied: Profile Incomplete (${completion.percentage}%). All standard modules are locked until your profile is at least 70% complete. Please update your profile in the Employee KYC section.`
                    });
                }

                if (completion.isReadOnly && isWriteRequest && !isAllowedPath) {
                    return res.status(403).json({
                        message: `Access Denied: Write Permissions Restricted. Your profile is incomplete (${completion.percentage}%). Please complete all mandatory fields in Employee KYC to restore full write access.`
                    });
                }
            }
        }

        // Fetch authorized branches for non-admin users
        if (verified.role !== 'Admin') {
            try {
                const userId = verified.username || verified._id;
                const assignments = await UserBranchModel.find({ user_id: userId });
                req.user.authorizedBranchIds = assignments.map(a => a.branch_id.toString());
            } catch (err) {
                console.error("Error fetching branch assignments in authMiddleware:", err);
                req.user.authorizedBranchIds = [];
            }
        }

        // Run subsequent middleware and controller in the user context
        context.run({ user: req.user, req }, next);
    } catch (err) {
        console.error("Auth token verification failed:", err);
        return res.status(403).json({ message: "Invalid Token" });
    }
};

export default verifyToken;
