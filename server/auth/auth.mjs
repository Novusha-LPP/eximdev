import jwt from "jsonwebtoken";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Authentication Middleware (Cookie-based)
export const authenticateJWT = (req, res, next) => {
  // Check for token in cookies
  // console.log("Cookies received:", req.cookies);
  const token = req.cookies.exim_token;

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user information to the request
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(403).json({ message: "Invalid token" });
  }
};

// Role-based Authorization Middleware (unchanged)
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // Check if user is authenticated first
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    // Check if user's role is in the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied",
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
};

// Token Generation Utility (unchanged)
export const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      username: user.username,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRATION || "24h",
      algorithm: "HS256",
    }
  );
};

// Token Refresh Utility
export const refreshToken = (token) => {
  try {
    // Decode (not verify) the existing token to get user info
    const decoded = jwt.decode(token);

    if (!decoded) {
      throw new Error("Invalid token");
    }

    // Generate a new token with the same payload
    return generateToken({
      _id: decoded.userId,
      username: decoded.username,
      role: decoded.role,
    });
  } catch (error) {
    throw new Error("Token refresh failed");
  }
};

// Sanitize User Data Utility (unchanged)
export const sanitizeUserData = (user) => {
  return {
    username: user.username,
    role: user.role,
    modules: user.modules,
    first_name: user.first_name,
    middle_name: user.middle_name,
    last_name: user.last_name,
    company: user.company,
    employee_photo: user.employee_photo,
    designation: user.designation,
    department: user.department,
    employment_type: user.employment_type,
    email: user.email,
    assigned_importer: user.assigned_importer,
    assigned_importer_name: user.assigned_importer_name,
  };
};
