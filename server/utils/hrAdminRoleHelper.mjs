import User from "../model/userModel.mjs";
import logger from "../logger.js";

/**
 * Checks if a user belongs to the HR Admin department,
 * has designation "HARDWARE AND NETWORK ENGINEER", or is an Admin.
 *
 * @param {Object} user - User object from req.user (or token)
 * @returns {Promise<boolean>}
 */
export async function isHRAdminUser(user) {
  if (!user) return false;

  const role = String(user.role || "").trim().toLowerCase();
  const username = String(user.username || "").trim().toLowerCase();

  // 1. Super Admin / Admin check
  if (
    role === "admin" ||
    role === "administrator" ||
    username === "admin" ||
    Boolean(user.is_operator)
  ) {
    return true;
  }

  // 2. Direct checks from user object if available
  const directDesig = String(user.designation || "").trim().toLowerCase();
  const directDept = String(user.department || "").trim().toLowerCase();

  const isHardwareAndNetworkEngineer =
    directDesig.includes("hardware and network engineer") ||
    directDesig.includes("hardware & network engineer") ||
    (directDept.includes("hr admin") && directDesig.includes("hardware"));

  if (isHardwareAndNetworkEngineer) {
    return true;
  }

  // 3. Database lookup for fresh profile fields
  const userId = user._id || user.id;
  if (userId) {
    try {
      const userDoc = await User.findById(userId)
        .select("role department designation is_operator username")
        .lean();

      if (userDoc) {
        const docRole = String(userDoc.role || "").trim().toLowerCase();
        const docUsername = String(userDoc.username || "").trim().toLowerCase();
        const docDept = String(userDoc.department || "").trim().toLowerCase();
        const docDesig = String(userDoc.designation || "").trim().toLowerCase();

        if (
          docRole === "admin" ||
          docRole === "administrator" ||
          docUsername === "admin" ||
          Boolean(userDoc.is_operator)
        ) {
          return true;
        }

        const isDocHardwareEngineer =
          docDesig.includes("hardware and network engineer") ||
          docDesig.includes("hardware & network engineer") ||
          (docDept.includes("hr admin") && docDesig.includes("hardware"));

        if (isDocHardwareEngineer) {
          return true;
        }
      }
    } catch (err) {
      logger.error(`Error in isHRAdminUser lookup: ${err.message}`);
    }
  }

  return false;
}

export default isHRAdminUser;
