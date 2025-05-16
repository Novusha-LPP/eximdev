// In auth.mjs - modified authenticateJWT function

import jwt from "jsonwebtoken";

// Authenticate JWT from Authorization header
export const authenticateJWT = (req, res, next) => {
  try {
    // Check for token in Authorization header
    let token = null;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Authentication error:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }

    return res.status(401).json({ message: "Authentication required" });
  }
};

// Generate JWT token
export const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRATION } // 15 minutes
  );
};

// Generate refresh token
export const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: "7d" } // 7 days
  );
};

// Sanitize user object (no password, _id, etc.)
export const sanitizeUserData = (user) => ({
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
});
