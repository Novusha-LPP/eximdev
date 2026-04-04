import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { context } from "../utils/context.mjs";

dotenv.config();

const verifyToken = (req, res, next) => {
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

        // Run subsequent middleware and controller in the user context
        context.run({ user: verified, req }, next);
    } catch (err) {
        return res.status(403).json({ message: "Invalid Token" });
    }
};

export default verifyToken;
