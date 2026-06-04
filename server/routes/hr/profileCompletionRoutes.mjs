import express from "express";
import verifyToken from "../../middleware/authMiddleware.mjs";
import UserModel from "../../model/userModel.mjs";
import {
  calculateProfileCompletion,
  sendEmployeeNotification,
  sendManagerNotification
} from "../../utils/profileCompletion.mjs";

const router = express.Router();

// 1. GET /api/hr/profile-completion - Fetch report data with filters
router.get("/api/hr/profile-completion", verifyToken, async (req, res) => {
  try {
    const { department, completionRange, blockingStatus } = req.query;

    // Fetch all active employees
    const users = await UserModel.find({ isActive: { $ne: false } })
      .populate("hod_id", "first_name last_name email username")
      .populate({
        path: "attendance_settings.manager_id",
        select: "first_name last_name email username"
      })
      .lean();

    const report = users.map((user) => {
      const completion = calculateProfileCompletion(user);

      // Days since last profile update
      const lastUpdate = user.updatedAt || (user.kyc_date ? new Date(user.kyc_date) : user.createdAt) || new Date();
      const daysSinceLastUpdate = Math.floor((Date.now() - new Date(lastUpdate).getTime()) / (24 * 60 * 60 * 1000));

      // Resolve manager details from Employee KYC (hod_id)
      const manager = user.hod_id;
      const managerName = manager
        ? `${manager.first_name || ""} ${manager.last_name || ""}`.trim() || manager.username
        : "Unassigned";
      const managerEmail = manager?.email || "";

      return {
        _id: user._id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        employee_code: user.employee_code,
        designation: user.designation,
        department: user.department,
        email: user.email || user.official_email,
        percentage: completion.percentage,
        missingMandatoryFields: completion.missingMandatoryFields,
        missingBlockingFields: completion.missingBlockingFields,
        isBlocked: completion.isBlocked,
        isReadOnly: completion.isReadOnly,
        hasCriticalMissing: completion.hasCriticalMissing,
        daysSinceLastUpdate: Math.max(0, daysSinceLastUpdate),
        profile_employee_notified_at: user.profile_employee_notified_at,
        profile_manager_notified_at: user.profile_manager_notified_at,
        managerName,
        managerEmail,
      };
    });

    // Apply filtering
    let filteredReport = report;

    if (department) {
      filteredReport = filteredReport.filter(
        (r) => r.department?.toLowerCase() === department.toLowerCase()
      );
    }

    if (blockingStatus) {
      const isBlocking = blockingStatus === "true";
      filteredReport = filteredReport.filter((r) => r.hasCriticalMissing === isBlocking);
    }

    if (completionRange) {
      if (completionRange === "locked") {
        // Below 70%
        filteredReport = filteredReport.filter((r) => r.percentage < 70);
      } else if (completionRange === "readonly") {
        // 70-99%
        filteredReport = filteredReport.filter((r) => r.percentage >= 70 && r.percentage < 100);
      } else if (completionRange === "complete") {
        // 100%
        filteredReport = filteredReport.filter((r) => r.percentage === 100);
      }
    }

    res.json(filteredReport);
  } catch (error) {
    console.error("Error fetching profile completion report:", error);
    res.status(500).json({ error: "Failed to fetch profile completion report" });
  }
});

// 2. POST /api/hr/profile-completion/notify-employee - Send manual reminder to employee
router.post("/api/hr/profile-completion/notify-employee", verifyToken, async (req, res) => {
  try {
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({ error: "employeeId is required" });
    }

    const employee = await UserModel.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const completion = calculateProfileCompletion(employee);
    if (completion.percentage === 100) {
      return res.status(400).json({ error: "Employee profile is already 100% complete" });
    }

    // Send email to employee
    await sendEmployeeNotification(employee, completion.missingMandatoryFields, completion.percentage);

    // Update notified date
    employee.profile_employee_notified_at = new Date();
    await employee.save();

    res.json({ success: true, message: "Reminder email sent to employee successfully" });
  } catch (error) {
    console.error("Error notifying employee:", error);
    res.status(500).json({ error: "Failed to send notification to employee" });
  }
});

// 3. POST /api/hr/profile-completion/notify-manager - Send manual alert to manager
router.post("/api/hr/profile-completion/notify-manager", verifyToken, async (req, res) => {
  try {
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({ error: "employeeId is required" });
    }

    const employee = await UserModel.findById(employeeId)
      .populate("hod_id")
      .populate("attendance_settings.manager_id");

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const completion = calculateProfileCompletion(employee);
    if (!completion.hasCriticalMissing) {
      return res.status(400).json({ error: "Employee is not missing any critical blocking fields" });
    }

    const manager = employee.hod_id || employee.attendance_settings?.manager_id;
    const managerEmail = manager?.email;

    if (!managerEmail) {
      return res.status(400).json({ error: "Reporting manager does not have a configured email address" });
    }

    // Send email to manager
    await sendManagerNotification(employee, managerEmail, completion.missingBlockingFields);

    // Update manager notified date
    employee.profile_manager_notified_at = new Date();
    await employee.save();

    res.json({ success: true, message: "Escalation email sent to manager successfully" });
  } catch (error) {
    console.error("Error notifying manager:", error);
    res.status(500).json({ error: "Failed to send notification to manager" });
  }
});

export default router;
