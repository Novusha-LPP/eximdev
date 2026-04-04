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
  const role = String(eximRole || '').trim();
  const upper = role.toUpperCase();
  const normalized = upper.replace(/[^A-Z]/g, '');

  if (upper === "ADMIN") return "ADMIN";
  // Accept Head_of_Department in any case/separator variant.
  if (upper === "HOD" || normalized === "HEADOFDEPARTMENT") return "HOD";
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

    // Always fetch fresh user data from DB to ensure attendance-critical
    // fields (company_id, shift_id, department_id) are current.
    // This prevents stale JWT payloads from causing "Company not found" errors.
    const freshUser = await UserModel.findById(verified._id)
      .select('_id username first_name last_name role company_id department_id shift_id current_status last_punch_date last_punch_type employment_type gender')
      .lean();

    if (!freshUser) {
      return res.status(401).json({ message: "User not found" });
    }

    // Map EXIM role to attendance role
    const userPlain = {
      ...freshUser,
      _id: freshUser._id,
      role: mapRole(freshUser.role),
      name: freshUser.first_name ? `${freshUser.first_name} ${freshUser.last_name || ''}`.trim() : freshUser.username
    };

    req.user = userPlain;

    // Also run context for EXIM's audit trail compatibility
    context.run({ user: verified, req }, next);
  } catch (err) {
    return res.status(403).json({ message: "Invalid Token" });
  }
};

export default attendanceAuthBridge;
