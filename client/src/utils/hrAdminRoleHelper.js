/**
 * Frontend helper to identify HR Admin department users with designation
 * HARDWARE AND NETWORK ENGINEER, or Administrators.
 *
 * @param {Object} user - User object from UserContext
 * @returns {boolean}
 */
export function isHRAdminUser(user) {
  if (!user) return false;

  const role = String(user.role || "").trim().toLowerCase();
  const username = String(user.username || "").trim().toLowerCase();
  const dept = String(user.department || "").trim().toLowerCase();
  const desig = String(user.designation || "").trim().toLowerCase();

  // 1. Admin / Administrator / Operator
  if (
    role === "admin" ||
    role === "administrator" ||
    username === "admin" ||
    Boolean(user.is_operator)
  ) {
    return true;
  }

  // 2. Designation: HARDWARE AND NETWORK ENGINEER
  const isHardwareAndNetworkEngineer =
    desig.includes("hardware and network engineer") ||
    desig.includes("hardware & network engineer") ||
    (dept.includes("hr admin") && desig.includes("hardware"));

  if (isHardwareAndNetworkEngineer) {
    return true;
  }

  // 3. Invoice Approver Users (manu_pillai, shalini_arun)
  if (username === "manu_pillai" || username === "shalini_arun") {
    return true;
  }

  // 4. Users assigned the IT Helpdesk module
  const modules = Array.isArray(user.modules) ? user.modules.map((m) => String(m).toLowerCase()) : [];
  if (modules.includes("it helpdesk") || modules.includes("it-helpdesk") || modules.includes("it")) {
    return true;
  }

  return false;
}

export default isHRAdminUser;
