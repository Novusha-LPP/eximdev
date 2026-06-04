import express from "express";
import verifyToken from "../../middleware/authMiddleware.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import EmployeeKPI from "../../model/hr/employeeKPIModel.mjs";
import UserModel from "../../model/userModel.mjs";
import AttendanceRecord from "../../model/attendance/AttendanceRecord.js";
import KPISheet from "../../model/kpi/kpiSheetModel.mjs";
import OpenPoint from "../../model/openPoints/openPointModel.mjs";
import moment from "moment";

const router = express.Router();

// Helper to calculate previous month and year
const getPreviousMonthAndYear = (month, year) => {
  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear = year - 1;
  }
  return { month: prevMonth, year: prevYear };
};

// 1. GET /api/hr/employees - Get list of active employees
router.get("/api/hr/employees", verifyToken, async (req, res) => {
  try {
    const employees = await UserModel.find({ isActive: { $ne: false } })
      .select("first_name last_name username department designation employee_code email")
      .sort({ first_name: 1 });
    res.json(employees);
  } catch (error) {
    console.error("Error fetching employees for HR:", error);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

// 2. GET /api/hr/kpi - Get KPI list with filters and trend calculation
router.get("/api/hr/kpi", verifyToken, async (req, res) => {
  try {
    const { year, month, department, rag_status, score_min, score_max } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: "Year and month are required" });
    }

    const queryYear = parseInt(year);
    const queryMonth = parseInt(month);

    // Build the query
    const kpiQuery = {
      year: queryYear,
      month: queryMonth,
    };

    // If department is filtered, we first find users in that department
    let employeeIds = [];
    if (department) {
      const usersInDept = await UserModel.find({ department }).select("_id");
      employeeIds = usersInDept.map((u) => u._id);
      kpiQuery.employee = { $in: employeeIds };
    }

    if (rag_status) {
      kpiQuery.rag_status = rag_status.toUpperCase();
    }

    if (score_min || score_max) {
      kpiQuery.total_kpi_score = {};
      if (score_min) kpiQuery.total_kpi_score.$gte = parseFloat(score_min);
      if (score_max) kpiQuery.total_kpi_score.$lte = parseFloat(score_max);
    }

    // Fetch current month's KPI records
    const kpiRecords = await EmployeeKPI.find(kpiQuery)
      .populate("employee", "first_name last_name username department designation employee_code email")
      .populate("reviewed_by", "first_name last_name username")
      .lean();

    // Fetch previous month's KPI records to calculate trends
    const { month: prevMonth, year: prevYear } = getPreviousMonthAndYear(queryMonth, queryYear);
    const prevKpiRecords = await EmployeeKPI.find({
      year: prevYear,
      month: prevMonth,
    }).select("employee total_kpi_score").lean();

    // Create a mapping of employee ID to previous score for quick lookup
    const prevScoreMap = new Map();
    prevKpiRecords.forEach((rec) => {
      prevScoreMap.set(rec.employee.toString(), rec.total_kpi_score);
    });

    // Map trends
    const enrichedRecords = kpiRecords.map((rec) => {
      if (!rec.employee) return rec;

      const prevScore = prevScoreMap.get(rec.employee._id.toString());
      let trend = "stable"; // Default trend

      if (prevScore !== undefined) {
        if (rec.total_kpi_score > prevScore) {
          trend = "up";
        } else if (rec.total_kpi_score < prevScore) {
          trend = "down";
        }
      }

      return {
        ...rec,
        trend,
        prev_score: prevScore !== undefined ? prevScore : null,
      };
    });

    res.json(enrichedRecords);
  } catch (error) {
    console.error("Error fetching HR KPIs:", error);
    res.status(500).json({ error: "Failed to fetch KPI records" });
  }
});

// 3. GET /api/hr/kpi/stats - Get department averages and RAG distributions
router.get("/api/hr/kpi/stats", verifyToken, async (req, res) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: "Year and month are required" });
    }

    const queryYear = parseInt(year);
    const queryMonth = parseInt(month);

    const kpiRecords = await EmployeeKPI.find({
      year: queryYear,
      month: queryMonth,
    })
      .populate("employee", "department")
      .lean();

    const departmentStats = {};
    let greenCount = 0;
    let amberCount = 0;
    let redCount = 0;

    kpiRecords.forEach((rec) => {
      // Track overall RAG distribution
      if (rec.rag_status === "GREEN") greenCount++;
      else if (rec.rag_status === "AMBER") amberCount++;
      else if (rec.rag_status === "RED") redCount++;

      // Track department performance
      const deptName = rec.employee?.department || "Unassigned";
      if (!departmentStats[deptName]) {
        departmentStats[deptName] = {
          sum: 0,
          count: 0,
        };
      }
      departmentStats[deptName].sum += rec.total_kpi_score;
      departmentStats[deptName].count += 1;
    });

    // Calculate department averages
    const departmentAverages = Object.keys(departmentStats).map((dept) => ({
      department: dept,
      average: parseFloat((departmentStats[dept].sum / departmentStats[dept].count).toFixed(2)),
      count: departmentStats[dept].count,
    }));

    res.json({
      departmentAverages,
      ragDistribution: [
        { name: "GREEN", value: greenCount },
        { name: "AMBER", value: amberCount },
        { name: "RED", value: redCount },
      ],
      totalRecords: kpiRecords.length,
    });
  } catch (error) {
    console.error("Error fetching KPI stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// 4. POST /api/hr/kpi - Create or update employee KPI score
router.post(
  "/api/hr/kpi",
  verifyToken,
  auditMiddleware("Employee_KPI"),
  async (req, res) => {
    try {
      const {
        employee,
        year,
        month,
        attendance,
        quality_of_work,
        productivity,
        business_loss,
        open_tasks,
        comments,
      } = req.body;

      if (!employee || !year || !month) {
        return res.status(400).json({ error: "Employee, year, and month are required" });
      }

      // 1. Calculate Attendance Score (weight: 20%)
      const workingDays = parseFloat(attendance?.working_days) || 0;
      const presentDays = parseFloat(attendance?.present_days) || 0;
      const attRaw = workingDays > 0 ? parseFloat(((presentDays / workingDays) * 10).toFixed(2)) : 0;
      const attWeighted = parseFloat((attRaw * 0.20).toFixed(3));

      // 2. Quality Score (weight: 25%)
      const qualRaw = parseFloat(quality_of_work?.raw_score) || 0;
      const qualWeighted = parseFloat((qualRaw * 0.25).toFixed(3));

      // 3. Productivity Score (weight: 30%)
      const assignedTargets = parseFloat(productivity?.assigned_targets) || 0;
      const completedTasks = parseFloat(productivity?.completed_tasks) || 0;
      const prodRaw = assignedTargets > 0 ? parseFloat(((completedTasks / assignedTargets) * 10).toFixed(2)) : 0;
      const prodWeighted = parseFloat((prodRaw * 0.30).toFixed(3));

      // 4. Business Loss Score (weight: 15%)
      const lossIncidents = parseFloat(business_loss?.incidents) || 0;
      const lossDeduction = parseFloat(business_loss?.deduction_per_incident) || 1.0;
      const lossRaw = Math.max(0, parseFloat((10 - lossIncidents * lossDeduction).toFixed(2)));
      const lossWeighted = parseFloat((lossRaw * 0.15).toFixed(3));

      // 5. Open Tasks Score (weight: 10%)
      const openItems = parseFloat(open_tasks?.open_items) || 0;
      const openDeduction = parseFloat(open_tasks?.deduction_per_item) || 1.0;
      const openRaw = Math.max(0, parseFloat((10 - openItems * openDeduction).toFixed(2)));
      const openWeighted = parseFloat((openRaw * 0.10).toFixed(3));

      // Calculate Total KPI Score
      const totalScore = parseFloat(
        (attWeighted + qualWeighted + prodWeighted + lossWeighted + openWeighted).toFixed(2)
      );

      // Determine RAG Status
      let rag = "RED";
      if (totalScore >= 8.0) {
        rag = "GREEN";
      } else if (totalScore >= 6.0) {
        rag = "AMBER";
      }

      // Find if record already exists
      let kpiRecord = await EmployeeKPI.findOne({
        employee,
        year: parseInt(year),
        month: parseInt(month),
      });

      if (kpiRecord) {
        // Update existing record
        kpiRecord.attendance = {
          present_days: presentDays,
          working_days: workingDays,
          raw_score: attRaw,
          weighted_score: attWeighted,
        };
        kpiRecord.quality_of_work = {
          raw_score: qualRaw,
          weighted_score: qualWeighted,
        };
        kpiRecord.productivity = {
          completed_tasks: completedTasks,
          assigned_targets: assignedTargets,
          raw_score: prodRaw,
          weighted_score: prodWeighted,
        };
        kpiRecord.business_loss = {
          incidents: lossIncidents,
          deduction_per_incident: lossDeduction,
          raw_score: lossRaw,
          weighted_score: lossWeighted,
        };
        kpiRecord.open_tasks = {
          open_items: openItems,
          deduction_per_item: openDeduction,
          raw_score: openRaw,
          weighted_score: openWeighted,
        };
        kpiRecord.total_kpi_score = totalScore;
        kpiRecord.rag_status = rag;
        kpiRecord.reviewed_by = req.user._id;
        kpiRecord.comments = comments || "";

        await kpiRecord.save();
      } else {
        // Create new record
        kpiRecord = new EmployeeKPI({
          employee,
          year: parseInt(year),
          month: parseInt(month),
          attendance: {
            present_days: presentDays,
            working_days: workingDays,
            raw_score: attRaw,
            weighted_score: attWeighted,
          },
          quality_of_work: {
            raw_score: qualRaw,
            weighted_score: qualWeighted,
          },
          productivity: {
            completed_tasks: completedTasks,
            assigned_targets: assignedTargets,
            raw_score: prodRaw,
            weighted_score: prodWeighted,
          },
          business_loss: {
            incidents: lossIncidents,
            deduction_per_incident: lossDeduction,
            raw_score: lossRaw,
            weighted_score: lossWeighted,
          },
          open_tasks: {
            open_items: openItems,
            deduction_per_item: openDeduction,
            raw_score: openRaw,
            weighted_score: openWeighted,
          },
          total_kpi_score: totalScore,
          rag_status: rag,
          reviewed_by: req.user._id,
          comments: comments || "",
        });

        await kpiRecord.save();
      }

      // Populate response before returning
      const populatedRecord = await EmployeeKPI.findById(kpiRecord._id)
        .populate("employee", "first_name last_name username department designation employee_code email")
        .populate("reviewed_by", "first_name last_name username")
        .lean();

      res.json(populatedRecord);
    } catch (error) {
      console.error("Error creating/updating employee KPI:", error);
      res.status(500).json({ error: "Failed to save KPI score" });
    }
  }
);

// 5. GET /api/hr/kpi/auto-populate - Auto-fetch metrics from attendance, KPI sheet, and open points
router.get("/api/hr/kpi/auto-populate", verifyToken, async (req, res) => {
  try {
    const { employeeId, year, month } = req.query;

    if (!employeeId || !year || !month) {
      return res.status(400).json({ error: "employeeId, year, and month are required" });
    }

    const queryYear = parseInt(year);
    const queryMonth = parseInt(month);

    // 1. Fetch User to ensure they exist
    const employee = await UserModel.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // 2. Attendance Metrics
    const monthStr = `${queryYear}-${String(queryMonth).padStart(2, '0')}`;
    const attendanceRecords = await AttendanceRecord.find({
      employee_id: employeeId,
      year_month: monthStr,
    });

    let present_days = 0;
    let weekly_off_count = 0;
    let holiday_count = 0;

    attendanceRecords.forEach((rec) => {
      const status = rec.status;
      if (status === "weekly_off" || rec.is_weekly_off) {
        weekly_off_count++;
      } else if (status === "holiday" || rec.is_holiday) {
        holiday_count++;
      } else if (["present", "on_duty", "leave", "late"].includes(status)) {
        present_days += 1;
      } else if (status === "half_day" || rec.is_half_day) {
        present_days += 0.5;
      } else if (status === "incomplete" || rec.missed_punch) {
        present_days += 0.5;
      }
    });

    const daysInMonth = moment(`${queryYear}-${String(queryMonth).padStart(2, '0')}-01`, "YYYY-MM-DD").daysInMonth();
    let working_days = daysInMonth - (weekly_off_count + holiday_count);

    if (working_days <= 0 || attendanceRecords.length === 0) {
      // Fallback: days in month minus sundays
      let sundays = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const dayOfWeek = moment(`${queryYear}-${String(queryMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`, "YYYY-MM-DD").day();
        if (dayOfWeek === 0) {
          sundays++;
        }
      }
      working_days = daysInMonth - sundays;
    }

    // 3. KPI Sheet Metrics (Quality of Work & Productivity & Business Loss)
    const kpiSheet = await KPISheet.findOne({
      user: employeeId,
      year: queryYear,
      month: queryMonth,
    });

    let qualityScore = 0;
    let completedTasks = 0;
    let assignedTargets = 0;
    let incidents = 0;

    if (kpiSheet) {
      // Quality: overall_percentage / 10
      qualityScore = kpiSheet.summary?.overall_percentage
        ? parseFloat((kpiSheet.summary.overall_percentage / 10).toFixed(2))
        : (kpiSheet.summary?.average_complexity
          ? parseFloat((kpiSheet.summary.average_complexity * 2).toFixed(2))
          : 0);

      // Productivity: total_quantity
      completedTasks = kpiSheet.summary?.total_quantity || 0;
      assignedTargets = completedTasks; // Default target to match completed tasks

      // Business Loss: business_loss count
      incidents = kpiSheet.summary?.business_loss || 0;
    }

    // 4. Open Points Metrics (Open Tasks)
    const openItems = await OpenPoint.countDocuments({
      responsible_person: employeeId,
      status: { $ne: "Green" },
    });

    res.json({
      attendance: {
        present_days,
        working_days,
      },
      quality_of_work: {
        raw_score: qualityScore,
      },
      productivity: {
        completed_tasks: completedTasks,
        assigned_targets: assignedTargets || 10, // Avoid 0 target if possible, fallback to 10
      },
      business_loss: {
        incidents,
        deduction_per_incident: 1.0,
      },
      open_tasks: {
        open_items: openItems,
        deduction_per_item: 1.0,
      },
    });
  } catch (error) {
    console.error("Error auto-populating KPI metrics:", error);
    res.status(500).json({ error: "Failed to auto-populate metrics" });
  }
});

export default router;
