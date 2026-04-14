import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { context } from "../utils/context.mjs";
import UserBranchModel from "../model/userBranchModel.mjs";

dotenv.config();

const verifyToken = async (req, res, next) => {
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
        return res.status(403).json({ message: "Invalid Token" });
    }
};

export default verifyToken;
