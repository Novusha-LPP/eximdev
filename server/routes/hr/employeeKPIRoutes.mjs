import express from "express";
import verifyToken from "../../middleware/authMiddleware.mjs";
import auditMiddleware from "../../middleware/auditTrail.mjs";
import EmployeeKPI from "../../model/hr/employeeKPIModel.mjs";
import UserModel from "../../model/userModel.mjs";
import AttendanceRecord from "../../model/attendance/AttendanceRecord.js";
import KPISheet from "../../model/kpi/kpiSheetModel.mjs";
import OpenPoint from "../../model/openPoints/openPointModel.mjs";
import TeamModel from "../../model/teamModel.mjs";
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
    const { year, month, team: teamId, rag_status, score_min, score_max } = req.query;

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

    // If team is filtered, we first find users in that team
    let employeeIds = [];
    if (teamId) {
      const teamObj = await TeamModel.findById(teamId).select("members");
      if (teamObj) {
        employeeIds = teamObj.members.map((m) => m.userId);
        kpiQuery.employee = { $in: employeeIds };
      } else {
        kpiQuery.employee = { $in: [] };
      }
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

// 3. GET /api/hr/kpi/stats - Get team averages and RAG distributions
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
      .populate("employee", "first_name last_name username")
      .lean();

    const teams = await TeamModel.find({ isActive: { $ne: false } }).lean();

    const teamStats = {};
    let greenCount = 0;
    let amberCount = 0;
    let redCount = 0;

    kpiRecords.forEach((rec) => {
      // Track overall RAG distribution
      if (rec.rag_status === "GREEN") greenCount++;
      else if (rec.rag_status === "AMBER") amberCount++;
      else if (rec.rag_status === "RED") redCount++;

      if (!rec.employee) return;

      const empTeams = teams.filter(t => 
        t.members.some(m => m.userId?.toString() === rec.employee._id.toString())
      );

      if (empTeams.length > 0) {
        empTeams.forEach(team => {
          if (!teamStats[team.name]) {
            teamStats[team.name] = { sum: 0, count: 0 };
          }
          teamStats[team.name].sum += rec.total_kpi_score;
          teamStats[team.name].count += 1;
        });
      } else {
        if (!teamStats["Unassigned"]) {
          teamStats["Unassigned"] = { sum: 0, count: 0 };
        }
        teamStats["Unassigned"].sum += rec.total_kpi_score;
        teamStats["Unassigned"].count += 1;
      }
    });

    // Calculate team averages
    const teamAverages = Object.keys(teamStats).map((teamName) => ({
      team: teamName,
      average: parseFloat((teamStats[teamName].sum / teamStats[teamName].count).toFixed(2)),
      count: teamStats[teamName].count,
    }));

    res.json({
      teamAverages,
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
        attendanceScore,
        qualityScore,
        quantityScore,
        sopComplianceScore,
        openTaskScore,
        businessLossScore,
        comments,
      } = req.body;

      if (!employee || !year || !month) {
        return res.status(400).json({ error: "Employee, year, and month are required" });
      }

      // Parse raw scores (direct or nested fallback)
      const rawQty = parseFloat(quantityScore !== undefined ? quantityScore : (req.body.quantity_of_work?.raw_score ?? req.body.productivity?.raw_score ?? 0));
      const rawQual = parseFloat(qualityScore !== undefined ? qualityScore : (req.body.quality_of_work?.raw_score ?? 0));
      
      let rawAtt = 0;
      let workingDays = parseFloat(req.body.attendance?.working_days) || 0;
      let presentDays = parseFloat(req.body.attendance?.present_days) || 0;
      if (attendanceScore !== undefined) {
        rawAtt = parseFloat(attendanceScore);
      } else if (req.body.attendance?.raw_score !== undefined) {
        rawAtt = parseFloat(req.body.attendance.raw_score);
      } else {
        rawAtt = workingDays > 0 ? parseFloat(((presentDays / workingDays) * 10).toFixed(2)) : 0;
      }

      const rawSop = parseFloat(sopComplianceScore !== undefined ? sopComplianceScore : (req.body.sop_compliance?.raw_score ?? 0));

      let rawOpen = 0;
      let openItems = parseFloat(req.body.open_tasks?.open_items) || 0;
      let openDeduction = parseFloat(req.body.open_tasks?.deduction_per_item) || 1.0;
      if (openTaskScore !== undefined) {
        rawOpen = parseFloat(openTaskScore);
      } else if (req.body.open_tasks?.raw_score !== undefined) {
        rawOpen = parseFloat(req.body.open_tasks.raw_score);
      } else {
        rawOpen = Math.max(0, parseFloat((10 - openItems * openDeduction).toFixed(2)));
      }

      let rawLoss = 0;
      let lossIncidents = parseFloat(req.body.business_loss?.incidents) || 0;
      let lossDeduction = parseFloat(req.body.business_loss?.deduction_per_incident) || 1.0;
      if (businessLossScore !== undefined) {
        rawLoss = parseFloat(businessLossScore);
      } else if (req.body.business_loss?.raw_score !== undefined) {
        rawLoss = parseFloat(req.body.business_loss.raw_score);
      } else {
        rawLoss = Math.max(0, parseFloat((10 - lossIncidents * lossDeduction).toFixed(2)));
      }

      // Calculate weighted scores
      const qtyWeighted = parseFloat((rawQty * 0.25).toFixed(3));
      const qualWeighted = parseFloat((rawQual * 0.25).toFixed(3));
      const attWeighted = parseFloat((rawAtt * 0.15).toFixed(3));
      const sopWeighted = parseFloat((rawSop * 0.15).toFixed(3));
      const openWeighted = parseFloat((rawOpen * 0.10).toFixed(3));
      const lossWeighted = parseFloat((rawLoss * 0.10).toFixed(3));

      // Calculate Total KPI Score
      const totalScore = parseFloat(
        (attWeighted + qualWeighted + qtyWeighted + sopWeighted + openWeighted + lossWeighted).toFixed(2)
      );

      // Determine RAG Status
      let rag = "RED";
      if (totalScore >= 8.0) {
        rag = "GREEN";
      } else if (totalScore >= 5.0) {
        rag = "AMBER";
      }

      // Find if record already exists
      let kpiRecord = await EmployeeKPI.findOne({
        employee,
        year: parseInt(year),
        month: parseInt(month),
      });

      const updateData = {
        attendance: {
          present_days: presentDays,
          working_days: workingDays,
          raw_score: rawAtt,
          weighted_score: attWeighted,
        },
        quality_of_work: {
          raw_score: rawQual,
          weighted_score: qualWeighted,
        },
        quantity_of_work: {
          raw_score: rawQty,
          weighted_score: qtyWeighted,
        },
        productivity: {
          completed_tasks: rawQty,
          assigned_targets: 10,
          raw_score: rawQty,
          weighted_score: qtyWeighted,
        },
        sop_compliance: {
          raw_score: rawSop,
          weighted_score: sopWeighted,
        },
        business_loss: {
          incidents: lossIncidents,
          deduction_per_incident: lossDeduction,
          raw_score: rawLoss,
          weighted_score: lossWeighted,
        },
        open_tasks: {
          open_items: openItems,
          deduction_per_item: openDeduction,
          raw_score: rawOpen,
          weighted_score: openWeighted,
        },
        total_kpi_score: totalScore,
        rag_status: rag,
        reviewed_by: req.user._id,
        comments: comments || "",
      };

      if (kpiRecord) {
        Object.assign(kpiRecord, updateData);
        await kpiRecord.save();
      } else {
        kpiRecord = new EmployeeKPI({
          employee,
          year: parseInt(year),
          month: parseInt(month),
          ...updateData
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
    }

    // 4. Open Points Metrics (Open Tasks)
    const openItems = await OpenPoint.countDocuments({
      responsible_person: employeeId,
      status: { $ne: "Green" },
    });

    // Auto-calculate direct scores (out of 10)
    const calculatedAttScore = working_days > 0 ? parseFloat(((present_days / working_days) * 10).toFixed(2)) : 0;
    const calculatedQtyScore = assignedTargets > 0 ? parseFloat(((completedTasks / assignedTargets) * 10).toFixed(2)) : 0;
    const calculatedLossScore = Math.max(0, parseFloat((10 - incidents * 1.0).toFixed(2)));
    const calculatedOpenScore = Math.max(0, parseFloat((10 - openItems * 1.0).toFixed(2)));

    res.json({
      attendance: {
        present_days,
        working_days,
        raw_score: calculatedAttScore,
      },
      quality_of_work: {
        raw_score: qualityScore,
      },
      quantity_of_work: {
        raw_score: calculatedQtyScore,
      },
      productivity: {
        completed_tasks: completedTasks,
        assigned_targets: assignedTargets || 10,
        raw_score: calculatedQtyScore,
      },
      sop_compliance: {
        raw_score: 10, // Default to 10
      },
      business_loss: {
        incidents,
        deduction_per_incident: 1.0,
        raw_score: calculatedLossScore,
      },
      open_tasks: {
        open_items: openItems,
        deduction_per_item: 1.0,
        raw_score: calculatedOpenScore,
      },
      attendanceScore: calculatedAttScore,
      qualityScore: qualityScore,
      quantityScore: calculatedQtyScore,
      sopComplianceScore: 10,
      openTaskScore: calculatedOpenScore,
      businessLossScore: calculatedLossScore
    });
  } catch (error) {
    console.error("Error auto-populating KPI metrics:", error);
    res.status(500).json({ error: "Failed to auto-populate metrics" });
  }
});

// 6. GET /api/hr/kpi/dashboard-analytics - Advanced analytics for HR
router.get("/api/hr/kpi/dashboard-analytics", verifyToken, async (req, res) => {
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
      .populate("employee", "first_name last_name username designation employee_code email")
      .lean();

    const teams = await TeamModel.find({ isActive: { $ne: false } }).lean();

    // 1. Top Performers (Top 5)
    const topPerformers = [...kpiRecords]
      .sort((a, b) => b.total_kpi_score - a.total_kpi_score)
      .slice(0, 5)
      .map(rec => {
        const empTeams = teams.filter(t => 
          t.members.some(m => m.userId?.toString() === rec.employee?._id?.toString())
        );
        return {
          id: rec._id,
          name: rec.employee ? `${rec.employee.first_name} ${rec.employee.last_name || ""}` : "Unknown",
          team: empTeams.map(t => t.name).join(", ") || "N/A",
          score: rec.total_kpi_score,
          rag: rec.rag_status
        };
      });

    // 2. Bottom Performers (Bottom 5)
    const bottomPerformers = [...kpiRecords]
      .sort((a, b) => a.total_kpi_score - b.total_kpi_score)
      .slice(0, 5)
      .map(rec => {
        const empTeams = teams.filter(t => 
          t.members.some(m => m.userId?.toString() === rec.employee?._id?.toString())
        );
        return {
          id: rec._id,
          name: rec.employee ? `${rec.employee.first_name} ${rec.employee.last_name || ""}` : "Unknown",
          team: empTeams.map(t => t.name).join(", ") || "N/A",
          score: rec.total_kpi_score,
          rag: rec.rag_status
        };
      });

    // 3. Team Averages
    const teamStats = {};
    let greenCount = 0;
    let amberCount = 0;
    let redCount = 0;

    kpiRecords.forEach((rec) => {
      if (rec.rag_status === "GREEN") greenCount++;
      else if (rec.rag_status === "AMBER") amberCount++;
      else if (rec.rag_status === "RED") redCount++;

      if (!rec.employee) return;

      const empTeams = teams.filter(t => 
        t.members.some(m => m.userId?.toString() === rec.employee._id.toString())
      );

      if (empTeams.length > 0) {
        empTeams.forEach(team => {
          if (!teamStats[team.name]) {
            teamStats[team.name] = { sum: 0, count: 0 };
          }
          teamStats[team.name].sum += rec.total_kpi_score;
          teamStats[team.name].count += 1;
        });
      } else {
        if (!teamStats["Unassigned"]) {
          teamStats["Unassigned"] = { sum: 0, count: 0 };
        }
        teamStats["Unassigned"].sum += rec.total_kpi_score;
        teamStats["Unassigned"].count += 1;
      }
    });

    const teamAverages = Object.keys(teamStats).map((teamName) => ({
      team: teamName,
      average: parseFloat((teamStats[teamName].sum / teamStats[teamName].count).toFixed(2)),
      count: teamStats[teamName].count,
    }));

    // 4. Monthly Trend (last 6 months)
    const trendData = [];
    for (let i = 5; i >= 0; i--) {
      let tMonth = queryMonth - i;
      let tYear = queryYear;
      if (tMonth <= 0) {
        tMonth += 12;
        tYear -= 1;
      }
      
      const records = await EmployeeKPI.find({ year: tYear, month: tMonth }).select("total_kpi_score").lean();
      const avgScore = records.length > 0 
        ? parseFloat((records.reduce((sum, r) => sum + r.total_kpi_score, 0) / records.length).toFixed(2))
        : 0;
      
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      trendData.push({
        period: `${monthNames[tMonth - 1]} ${tYear}`,
        average: avgScore
      });
    }

    // 5. Correlation Data (Attendance & Open Tasks vs Performance)
    const correlationData = kpiRecords.map(rec => ({
      name: rec.employee ? `${rec.employee.first_name} ${rec.employee.last_name || ""}` : "Unknown",
      attendance: rec.attendance?.raw_score || 0,
      openTasks: rec.open_tasks?.raw_score || 0,
      performance: rec.total_kpi_score
    }));

    res.json({
      topPerformers,
      bottomPerformers,
      teamAverages,
      monthlyTrend: trendData,
      correlationData,
      ragDistribution: [
        { name: "GREEN", value: greenCount },
        { name: "AMBER", value: amberCount },
        { name: "RED", value: redCount },
      ],
      totalRecords: kpiRecords.length,
    });
  } catch (error) {
    console.error("Error fetching dashboard analytics:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
