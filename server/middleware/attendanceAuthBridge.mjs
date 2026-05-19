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
import Company from "../model/attendance/Company.js";

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

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function resolveLegacyCompany(user) {
  if (user?.company_id || !user?.company) return user?.company_id;

  const companyName = String(user.company).trim();
  if (!companyName) return null;

  const company = await Company.findOne({
    $or: [
      { company_name_lower: companyName.toLowerCase() },
      { company_name: new RegExp(`^${escapeRegex(companyName)}$`, 'i') }
    ]
  }).select('_id').lean();

  if (!company?._id) return null;

  await UserModel.updateOne(
    { _id: user._id, $or: [{ company_id: { $exists: false } }, { company_id: null }] },
    { $set: { company_id: company._id } }
  );

  return company._id;
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
      .select('_id username first_name last_name role company company_id department_id shift_id weekoff_policy_id holiday_policy_id attendance_settings current_status last_punch_date last_punch_type employment_type gender leave_settings')
      .lean();

    if (!freshUser) {
      return res.status(401).json({ message: "User not found" });
    }

    const resolvedCompanyId = await resolveLegacyCompany(freshUser);

    // Map EXIM role to attendance role
    const userPlain = {
      ...freshUser,
      _id: freshUser._id,
      company_id: resolvedCompanyId || freshUser.company_id,
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
