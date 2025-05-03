import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

//* GENERATE JWT
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

//* gENERATE REFRESH TOKEN
export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      username: user.username,
      role: user.role,
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

//* AUTH MIDDLEWARE: verifies token in cookie
export const authenticateJWT = (req, res, next) => {
  const token = req.cookies.access_token;
  token ||
    (req.headers.authorization && req.headers.authorization.split(" ")[1]);
  if (!token) {
    // console.log("No token found in cookies");
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // console.error("JWT verification error:", error.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

//* Optional: Role-based access
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};
//* Sanitize user object (no password, _id, etc.)
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
