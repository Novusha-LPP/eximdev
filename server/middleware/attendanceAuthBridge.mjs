/**
 * Attendance Auth Bridge Middleware
 *
 * Bridges EXIM's cookie-based JWT auth with the attendance module's
 * req.user expectations. The attendance controllers need a fully-populated
 * Mongoose User document (with company_id, shift_id, department_id populated).
 *
 * Role Mapping:
 *   EXIM "Admin"              → Attendance "ADMIN"
 *   EXIM "Head_of_Department" → Attendance "HOD"
 *   Everything else           → Attendance "EMPLOYEE"
 */

import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { context } from "../utils/context.mjs";
import UserModel from "../model/userModel.mjs";

dotenv.config();

/**
 * Map EXIM roles to attendance module roles
 */
function mapRole(eximRole) {
  if (eximRole === "Admin") return "ADMIN";
  if (eximRole === "Head_of_Department") return "HOD";
  return "EMPLOYEE";
}

const attendanceAuthBridge = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access Denied: No Token Provided" });
  }

  try {
    const verified = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback_secret_do_not_use_in_prod"
    );

    // We skip fetching the user document here since `login.mjs` embeds
    // `company_id`, `department_id`, and `shift_id` directly in the JWT.
    
    // Map EXIM role to attendance role
    const userPlain = {
      ...verified,
      _id: verified._id,
      role: mapRole(verified.role)
    };

    req.user = userPlain;

    // Also run context for EXIM's audit trail compatibility
    context.run({ user: verified, req }, next);
  } catch (err) {
    return res.status(403).json({ message: "Invalid Token" });
  }
};

export default attendanceAuthBridge;
