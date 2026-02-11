import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const verifyToken = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ message: "Access Denied: No Token Provided" });
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || "fallback_secret_do_not_use_in_prod");
        req.user = verified;
        next();
    } catch (err) {
        return res.status(403).json({ message: "Invalid Token" });
    }
};

export default verifyToken;
