import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const verifyToken = (req, res, next) => {
    const token = req.cookies.token;
    console.log("DEBUG: verifyToken called. Token present:", !!token);

    if (!token) {
        console.log("DEBUG: verifyToken - No token, returning 401");
        return res.status(401).json({ message: "Access Denied: No Token Provided" });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_do_not_use_in_prod");
        console.log("DEBUG: verifyToken - Token verified for user ID:", verified._id);
        req.user = verified;
        next();
    } catch (err) {
        console.log("DEBUG: verifyToken - Token verification failed:", err.message);
        return res.status(403).json({ message: "Invalid Token" });
    }
};

export default verifyToken;
