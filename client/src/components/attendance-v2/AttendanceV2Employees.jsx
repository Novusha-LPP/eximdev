import React, { useState, useEffect, useMemo } from "react";
import {
  FiUsers, FiSearch, FiFilter, FiRefreshCw, FiCheckCircle, FiAlertCircle,
  FiArrowLeft, FiCalendar, FiClock, FiFileText, FiCheck, FiX, FiEdit3,
  FiShield, FiDatabase, FiLayers, FiActivity, FiUser, FiMail, FiBriefcase,
  FiChevronRight, FiPlus, FiExternalLink, FiGrid, FiList, FiTrendingUp,
  FiAward, FiMapPin, FiPhone, FiInfo
} from "react-icons/fi";
import toast from "react-hot-toast";
import attendanceV2API from "../../api/attendance/attendanceV2.api";
import AttendanceV2Ledger from "./AttendanceV2Ledger";

// Curated modern pastel avatar palettes matching Attendance V2 design system
const AVATAR_PALETTES = [
  { bg: "#eef2ff", color: "#4338ca", border: "#c7d2fe" }, // Indigo (Primary)
  { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" }, // Emerald (Subtle)
  { bg: "#f0f9ff", color: "#0369a1", border: "#bae6fd" }, // Sky
  { bg: "#faf5ff", color: "#6b21a8", border: "#e9d5ff" }, // Violet
  { bg: "#f8fafc", color: "#334155", border: "#cbd5e1" }, // Slate
  { bg: "#fff7ed", color: "#9a3412", border: "#fed7aa" }, // Warm Amber
];

const getAvatarStyle = (str) => {
  if (!str) {
    return {
      background: AVATAR_PALETTES[0].bg,
      color: AVATAR_PALETTES[0].color,
      border: `1px solid ${AVATAR_PALETTES[0].border}`,
    };
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const p = AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
  return {
    background: p.bg,
    color: p.color,
    border: `1px solid ${p.border}`,
  };
};

const getInitials = (name) => {
  if (!name) return "EM";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const AttendanceV2Employees = ({ onBack, currentUser }) => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'table'

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("ALL");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL"); // ALL | LINKED | UNLINKED

  // Dedicated Modals State
  const [markModalEmp, setMarkModalEmp] = useState(null);
  const [leaveModalEmp, setLeaveModalEmp] = useState(null);
  const [drawerEmp, setDrawerEmp] = useState(null);

  // Quick Mark Attendance Form State
  const [attDate, setAttDate] = useState(new Date().toISOString().split("T")[0]);
  const [attStatus, setAttStatus] = useState("PRESENT"); // PRESENT | HALF_DAY | ABSENT
  const [attPunchIn, setAttPunchIn] = useState("09:30");
  const [attPunchOut, setAttPunchOut] = useState("18:30");
  const [attReason, setAttReason] = useState("");
  const [submittingAtt, setSubmittingAtt] = useState(false);

  // Quick Apply Leave Form State
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [leaveFromDate, setLeaveFromDate] = useState(new Date().toISOString().split("T")[0]);
  const [leaveToDate, setLeaveToDate] = useState(new Date().toISOString().split("T")[0]);
  const [leaveHalfDay, setLeaveHalfDay] = useState("NONE");
  const [leaveReason, setLeaveReason] = useState("");
  const [submittingLeave, setSubmittingLeave] = useState(false);

  // Drawer / Context State (Leave Balances & Edit Placement)
  const [drawerTab, setDrawerTab] = useState("ledger"); // ledger | profile | quotas
  const [drawerBalances, setDrawerBalances] = useState([]);
  const [drawerLeaveTypes, setDrawerLeaveTypes] = useState([]);
  const [loadingBalances, setLoadingBalances] = useState(false);

  const [editDept, setEditDept] = useState("");
  const [editDesig, setEditDesig] = useState("");
  const [savingPlacement, setSavingPlacement] = useState(false);
  const [syncingEmpId, setSyncingEmpId] = useState(null);

  // Load Employees List
  const fetchEmployeesList = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await attendanceV2API.getEmployees(forceRefresh);
      const list = Array.isArray(res) ? res : Array.isArray(res?.employees) ? res.employees : [];
      setEmployees(list);
    } catch (err) {
      toast.error("Failed to load employees: " + (err.message || "Error"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmployeesList();
  }, []);

  // Compute Unique Companies and Departments with counts
  const companies = useMemo(() => {
    const counts = {};
    employees.forEach((e) => {
      const c = (typeof e.company === "string" ? e.company : e.company?.name || e.company?.code || "SFPL").trim();
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [employees]);

  const departments = useMemo(() => {
    const counts = {};
    employees.forEach((e) => {
      const d = (typeof e.department === "string" ? e.department : e.department?.name || e.department?.code || "General").trim();
      counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [employees]);

  // Filtered Roster
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = searchQuery.toLowerCase().trim();
      const name = String(emp.name || "").toLowerCase();
      const code = String(emp.employeeCode || emp.username || "").toLowerCase();
      const email = String(emp.email || "").toLowerCase();
      const matchesSearch = !q || name.includes(q) || code.includes(q) || email.includes(q);

      const compName = (typeof emp.company === "string" ? emp.company : emp.company?.name || emp.company?.code || "SFPL").trim();
      const matchesComp = selectedCompany === "ALL" || compName === selectedCompany;

      const deptName = (typeof emp.department === "string" ? emp.department : emp.department?.name || emp.department?.code || "General").trim();
      const matchesDept = selectedDept === "ALL" || deptName === selectedDept;

      const matchesStatus =
        selectedStatus === "ALL" ||
        (selectedStatus === "LINKED" && emp.isHrmsLinked) ||
        (selectedStatus === "UNLINKED" && !emp.isHrmsLinked);

      return matchesSearch && matchesComp && matchesDept && matchesStatus;
    });
  }, [employees, searchQuery, selectedCompany, selectedDept, selectedStatus]);

  const linkedCount = useMemo(() => employees.filter((e) => e.isHrmsLinked).length, [employees]);
  const unlinkedCount = useMemo(() => employees.filter((e) => !e.isHrmsLinked).length, [employees]);

  // Load Leave Balances & Types when an employee is opened in Drawer or Leave Modal
  const loadEmployeeBalances = async (targetUser) => {
    if (!targetUser?.userId) return;
    try {
      setLoadingBalances(true);
      const [balRes, typesRes] = await Promise.all([
        attendanceV2API.getLeaveBalances({ user_id: targetUser.userId }).catch(() => []),
        attendanceV2API.getLeaveTypes().catch(() => []),
      ]);
      setDrawerBalances(Array.isArray(balRes) ? balRes : []);
      setDrawerLeaveTypes(Array.isArray(typesRes) ? typesRes : []);
      if (Array.isArray(typesRes) && typesRes.length > 0 && !leaveTypeId) {
        setLeaveTypeId(typesRes[0].id);
      }
    } catch (err) {
      console.warn("Failed to load leave context:", err);
    } finally {
      setLoadingBalances(false);
    }
  };

  // Open Quick Mark Attendance Modal
  const openMarkModal = (emp) => {
    setMarkModalEmp(emp);
    setAttDate(new Date().toISOString().split("T")[0]);
    setAttStatus("PRESENT");
    setAttPunchIn("09:30");
    setAttPunchOut("18:30");
    setAttReason("");
  };

  // Open Quick Apply Leave Modal
  const openLeaveModal = (emp) => {
    setLeaveModalEmp(emp);
    setLeaveFromDate(new Date().toISOString().split("T")[0]);
    setLeaveToDate(new Date().toISOString().split("T")[0]);
    setLeaveHalfDay("NONE");
    setLeaveReason("");
    loadEmployeeBalances(emp);
  };

  // Open Drawer Detail
  const openDrawer = (emp) => {
    setDrawerEmp(emp);
    setDrawerTab("ledger");
    setEditDept(emp.department || "");
    setEditDesig(emp.designation || "");
    loadEmployeeBalances(emp);
  };

  // Handle Mark Attendance Submit
  const handleMarkAttendance = async (e) => {
    e?.preventDefault();
    if (!markModalEmp?.userId) {
      toast.error("Employee does not have a valid User ID");
      return;
    }

    try {
      setSubmittingAtt(true);
      const res = await attendanceV2API.markAttendanceAdmin({
        user_id: markModalEmp.userId,
        work_date: attDate,
        status: attStatus,
        punch_in: attStatus === "ABSENT" ? null : attPunchIn,
        punch_out: attStatus === "ABSENT" ? null : attPunchOut,
        reason: attReason || `Marked ${attStatus} by Admin (${currentUser?.username || "Admin"})`,
      });

      toast.success(res.message || `Successfully marked ${attStatus} for ${markModalEmp.name}!`);
      setMarkModalEmp(null);
      setAttReason("");
    } catch (err) {
      toast.error(err.message || "Failed to mark attendance");
    } finally {
      setSubmittingAtt(false);
    }
  };

  // Handle Apply Leave Submit
  const handleApplyLeave = async (e) => {
    e?.preventDefault();
    if (!leaveModalEmp?.userId) {
      toast.error("Employee does not have a valid User ID");
      return;
    }
    if (!leaveTypeId || !leaveFromDate || !leaveToDate) {
      toast.error("Please fill all required leave fields");
      return;
    }

    try {
      setSubmittingLeave(true);
      await attendanceV2API.applyLeave({
        user_id: leaveModalEmp.userId,
        leave_type_id: leaveTypeId,
        from_date: leaveFromDate,
        to_date: leaveToDate,
        half_day_option: leaveHalfDay,
        reason: leaveReason || `Applied by HR on behalf of ${leaveModalEmp.name}`,
      });

      toast.success(`Leave applied successfully for ${leaveModalEmp.name}!`);
      setLeaveModalEmp(null);
      setLeaveReason("");
    } catch (err) {
      toast.error(err.message || "Failed to submit leave application");
    } finally {
      setSubmittingLeave(false);
    }
  };

  // Handle Placement Update
  const handleSavePlacement = async () => {
    if (!drawerEmp?.userId) return;
    try {
      setSavingPlacement(true);
      await attendanceV2API.updateEmployee(drawerEmp.userId, {
        department: editDept,
        designation: editDesig,
      });
      toast.success("Updated placement and synced with HRMS!");
      setDrawerEmp((prev) => ({
        ...prev,
        department: editDept,
        designation: editDesig,
      }));
      fetchEmployeesList(true);
    } catch (err) {
      toast.error("Failed to update: " + err.message);
    } finally {
      setSavingPlacement(false);
    }
  };

  // Handle 1-Click Force Sync
  const handleSyncUser = async (userId) => {
    try {
      setSyncingEmpId(userId);
      await attendanceV2API.syncUser(userId, false);
      toast.success("Successfully synchronized employee with HRMS!");
      fetchEmployeesList(true);
      if (drawerEmp && drawerEmp.userId === userId) {
        setDrawerEmp((prev) => ({ ...prev, isHrmsLinked: true }));
      }
    } catch (err) {
      toast.error("Sync failed: " + err.message);
    } finally {
      setSyncingEmpId(null);
    }
  };

  return (
    <div className="att-v2-card" style={{ padding: 0, overflow: "hidden", border: "1px solid var(--att-border)", boxShadow: "var(--att-shadow-sm)" }}>
      {/* CARD HEADER */}
      <div
        className="att-v2-card-header"
        style={{
          padding: "20px 26px",
          background: "#ffffff",
          borderBottom: "1px solid var(--att-border)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {onBack && (
            <button
              type="button"
              className="att-v2-btn-back-overview"
              onClick={onBack}
              title="Back to Overview"
            >
              <FiArrowLeft size={14} />
              <span>Back</span>
            </button>
          )}
          <div>
            <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px", fontSize: "19px", fontWeight: 800, color: "var(--att-text)" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--att-primary-subtle)", color: "var(--att-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FiUsers size={17} />
              </div>
              <span>Staff Directory & Attendance Hub</span>
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--att-text-muted)" }}>
              Manage workforce records, view monthly attendance, mark attendance overrides, and apply leaves on behalf of employees.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* View Mode Switcher */}
          <div className="att-v2-view-switcher">
            <button
              type="button"
              className={`att-v2-view-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              title="Card Grid View"
            >
              <FiGrid size={14} />
              <span>Cards</span>
            </button>
            <button
              type="button"
              className={`att-v2-view-btn ${viewMode === "table" ? "active" : ""}`}
              onClick={() => setViewMode("table")}
              title="Table View"
            >
              <FiList size={14} />
              <span>Table</span>
            </button>
          </div>

          <button
            className="att-v2-btn-secondary"
            onClick={() => fetchEmployeesList(true)}
            disabled={refreshing || loading}
            style={{ padding: "8px 14px", display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: 700 }}
          >
            <FiRefreshCw size={14} className={refreshing ? "spinning" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh Feed"}</span>
          </button>
        </div>
      </div>

      <div style={{ padding: "26px" }}>
        {/* KPI SUMMARY CARDS (CLEAN ATTENDANCE V2 STYLE) */}
        <div className="att-v2-kpi-grid" style={{ marginBottom: "22px" }}>
          <div className="att-v2-kpi-card status-hours">
            <div className="att-v2-kpi-icon blue">
              <FiUsers size={20} />
            </div>
            <div className="att-v2-kpi-info">
              <h4>Total Staff</h4>
              <p>{employees.length}</p>
              <span className="att-v2-kpi-sub">Registered workforce</span>
            </div>
          </div>

          <div className="att-v2-kpi-card status-active">
            <div className="att-v2-kpi-icon green">
              <FiCheckCircle size={20} />
            </div>
            <div className="att-v2-kpi-info">
              <h4>HRMS Linked</h4>
              <p style={{ color: "var(--att-success-text)" }}>{linkedCount}</p>
              <span className="att-v2-kpi-sub" style={{ color: "var(--att-success-text)" }}>
                Bi-directional sync active
              </span>
            </div>
          </div>

          <div className="att-v2-kpi-card status-break">
            <div className="att-v2-kpi-icon amber">
              <FiAlertCircle size={20} />
            </div>
            <div className="att-v2-kpi-info">
              <h4>Pending Sync</h4>
              <p style={{ color: "var(--att-warning-text)" }}>{unlinkedCount}</p>
              <span className="att-v2-kpi-sub" style={{ color: "var(--att-warning-text)" }}>
                Local records to push
              </span>
            </div>
          </div>

          <div className="att-v2-kpi-card status-leaves">
            <div className="att-v2-kpi-icon purple">
              <FiLayers size={20} />
            </div>
            <div className="att-v2-kpi-info">
              <h4>Companies</h4>
              <p style={{ color: "var(--att-purple-text)" }}>{companies.length}</p>
              <span className="att-v2-kpi-sub">Multi-tenant coverage</span>
            </div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & INSTANT PILL FILTERS */}
        <div className="att-v2-emp-toolbar">
          {/* Row 1: Search + Department Dropdown */}
          <div className="att-v2-emp-search-row">
            <div className="att-v2-emp-search-box">
              <FiSearch className="search-icon" size={16} />
              <input
                type="text"
                placeholder="Search by name, employee code, username, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="att-v2-emp-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="att-v2-emp-clear-btn"
                  onClick={() => setSearchQuery("")}
                  title="Clear search"
                >
                  <FiX size={14} />
                </button>
              )}
            </div>

            {/* Department Selector */}
            <div style={{ minWidth: "190px" }}>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="att-v2-select"
                style={{ padding: "10px 14px", fontSize: "13px", fontWeight: 600 }}
              >
                <option value="ALL">All Departments ({departments.reduce((acc, d) => acc + d[1], 0)})</option>
                {departments.map(([d, count]) => (
                  <option key={d} value={d}>
                    {d} ({count})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Company Filter Pills */}
          <div className="att-v2-emp-pills-row">
            <span className="att-v2-filter-label">Company:</span>
            <button
              type="button"
              className={`att-v2-pill-btn ${selectedCompany === "ALL" ? "active" : ""}`}
              onClick={() => setSelectedCompany("ALL")}
            >
              All <span className="count">{employees.length}</span>
            </button>
            {companies.map(([compName, count]) => (
              <button
                key={compName}
                type="button"
                className={`att-v2-pill-btn ${selectedCompany === compName ? "active" : ""}`}
                onClick={() => setSelectedCompany(compName)}
              >
                {compName} <span className="count">{count}</span>
              </button>
            ))}
          </div>

          {/* Row 3: Sync State Filter Pills */}
          <div className="att-v2-emp-pills-row" style={{ borderTop: "none", paddingTop: 0 }}>
            <span className="att-v2-filter-label">Sync State:</span>
            <button
              type="button"
              className={`att-v2-pill-btn ${selectedStatus === "ALL" ? "active" : ""}`}
              onClick={() => setSelectedStatus("ALL")}
            >
              All Status
            </button>
            <button
              type="button"
              className={`att-v2-pill-btn ${selectedStatus === "LINKED" ? "active" : ""}`}
              onClick={() => setSelectedStatus("LINKED")}
              style={
                selectedStatus === "LINKED"
                  ? { background: "var(--att-success)", borderColor: "var(--att-success)", color: "#ffffff" }
                  : { color: "var(--att-success-text)", borderColor: "var(--att-success-border)", background: "var(--att-success-subtle)" }
              }
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: selectedStatus === "LINKED" ? "#ffffff" : "var(--att-success)" }} />
              <span>Linked to HRMS</span>
              <span className="count">{linkedCount}</span>
            </button>
            <button
              type="button"
              className={`att-v2-pill-btn ${selectedStatus === "UNLINKED" ? "active" : ""}`}
              onClick={() => setSelectedStatus("UNLINKED")}
              style={
                selectedStatus === "UNLINKED"
                  ? { background: "var(--att-warning)", borderColor: "var(--att-warning)", color: "#ffffff" }
                  : { color: "var(--att-warning-text)", borderColor: "var(--att-warning-border)", background: "var(--att-warning-subtle)" }
              }
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: selectedStatus === "UNLINKED" ? "#ffffff" : "var(--att-warning)" }} />
              <span>Needs Sync</span>
              <span className="count">{unlinkedCount}</span>
            </button>

            {(searchQuery || selectedCompany !== "ALL" || selectedDept !== "ALL" || selectedStatus !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCompany("ALL");
                  setSelectedDept("ALL");
                  setSelectedStatus("ALL");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--att-danger)",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  marginLeft: "auto",
                  padding: "4px 8px",
                }}
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>

        {/* LOADING & EMPTY STATES */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <FiClock className="spinning" size={32} style={{ color: "var(--att-primary)" }} />
            <p style={{ marginTop: "14px", color: "var(--att-text-muted)" }}>
              Loading employee roster & HRMS live status...
            </p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "var(--att-surface-muted)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--att-text-disabled)",
                marginBottom: "12px",
              }}
            >
              <FiUsers size={28} />
            </div>
            <h4 style={{ margin: "0 0 6px", color: "var(--att-text)" }}>No matching employees found</h4>
            <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--att-text-muted)" }}>
              Try searching with a different name or clearing company/status filters.
            </p>
            <button
              className="att-v2-btn-secondary"
              onClick={() => {
                setSearchQuery("");
                setSelectedCompany("ALL");
                setSelectedDept("ALL");
                setSelectedStatus("ALL");
              }}
            >
              Clear All Filters
            </button>
          </div>
        ) : viewMode === "grid" ? (
          /* ==============================================================
             1. VISUAL CARD GRID VIEW (CLEAN EXECUTIVE ATTENDANCE V2 DESIGN)
             ============================================================== */
          <div className="att-v2-emp-grid">
            {filteredEmployees.map((emp) => {
              const initials = getInitials(emp.name || emp.username);
              const avatarStyle = getAvatarStyle(emp.name || emp.username || "emp");

              return (
                <div
                  key={emp.userId || emp.employmentId}
                  className="att-v2-emp-card"
                >
                  {/* Top Avatar & Name Header */}
                  <div className="att-v2-emp-header-row">
                    <div className="att-v2-emp-avatar-wrapper">
                      {emp.photo ? (
                        <img src={emp.photo} alt={emp.name} className="att-v2-emp-avatar" />
                      ) : (
                        <div className="att-v2-emp-avatar" style={avatarStyle}>
                          {initials}
                        </div>
                      )}
                      <span
                        className={`att-v2-emp-sync-dot ${emp.isHrmsLinked ? "linked" : "unlinked"}`}
                        title={emp.isHrmsLinked ? "Linked to HRMS" : "Local only - Pending sync"}
                      />
                    </div>

                    <div className="att-v2-emp-name-block">
                      <h4 className="att-v2-emp-name" title={emp.name}>
                        {emp.name}
                      </h4>
                      <div className="att-v2-emp-code-row">
                        <span className="att-v2-emp-code-badge">{emp.employeeCode || emp.username}</span>
                        {emp.isHrmsLinked ? (
                          <span className="att-v2-status-pill synced">
                            <span className="dot" />
                            <span>Synced</span>
                          </span>
                        ) : (
                          <span className="att-v2-status-pill pending">
                            <span className="dot" />
                            <span>Pending</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Placement Tags */}
                  <div className="att-v2-emp-placement-row">
                    <span className="att-v2-emp-tag company">
                      <FiBriefcase size={11} />
                      <span>{typeof emp.company === "string" ? emp.company : emp.company?.name || "SFPL"}</span>
                    </span>

                    <span className="att-v2-emp-tag">
                      <FiLayers size={11} />
                      <span>{typeof emp.department === "string" ? emp.department : emp.department?.name || "General"}</span>
                    </span>

                    <span className="att-v2-emp-tag designation">
                      <span>{typeof emp.designation === "string" ? emp.designation : emp.designation?.name || "Staff"}</span>
                    </span>
                  </div>

                  {/* Quick Action Buttons (Harmonious V2 Theme) */}
                  <div className="att-v2-emp-actions-row">
                    <button
                      type="button"
                      className="att-v2-action-btn-sm mark-btn"
                      onClick={() => openMarkModal(emp)}
                      title="Directly mark attendance"
                    >
                      <FiClock size={13} color="var(--att-success)" />
                      <span>Mark</span>
                    </button>

                    <button
                      type="button"
                      className="att-v2-action-btn-sm leave-btn"
                      onClick={() => openLeaveModal(emp)}
                      title="Apply leave on behalf"
                    >
                      <FiFileText size={13} color="var(--att-primary)" />
                      <span>Leave</span>
                    </button>

                    <button
                      type="button"
                      className="att-v2-action-btn-sm ledger-btn"
                      onClick={() => openDrawer(emp)}
                      title="Open full attendance calendar and profile"
                    >
                      <FiCalendar size={13} />
                      <span>Ledger</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ==============================================================
             2. DENSE EXECUTIVE TABLE VIEW
             ============================================================== */
          <div className="att-v2-table-wrapper" style={{ maxHeight: "650px", overflowY: "auto" }}>
            <table className="att-v2-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Company & Dept</th>
                  <th>Designation</th>
                  <th>HRMS Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => {
                  const initials = getInitials(emp.name || emp.username);
                  const avatarStyle = getAvatarStyle(emp.name || emp.username || "emp");

                  return (
                    <tr key={emp.userId || emp.employmentId}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div
                            style={{
                              width: "38px",
                              height: "38px",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "13px",
                              flexShrink: 0,
                              ...avatarStyle
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: "var(--att-text)", fontSize: "14px" }}>
                              {emp.name}
                            </div>
                            <div style={{ fontSize: "12px", color: "var(--att-text-muted)" }}>
                              <code>{emp.employeeCode || emp.username}</code>
                              {emp.email && <span> • {emp.email}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 700, color: "var(--att-text)", fontSize: "13px" }}>
                          {typeof emp.company === "string" ? emp.company : emp.company?.name || "SFPL"}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--att-text-muted)" }}>
                          {typeof emp.department === "string" ? emp.department : emp.department?.name || "General"}
                        </div>
                      </td>

                      <td>
                        <span className="att-v2-chip" style={{ fontSize: "12px", fontWeight: 600 }}>
                          {typeof emp.designation === "string" ? emp.designation : emp.designation?.name || "Staff"}
                        </span>
                      </td>

                      <td>
                        {emp.isHrmsLinked ? (
                          <span className="att-v2-status-pill synced">
                            <span className="dot" />
                            <span>Linked to HRMS</span>
                          </span>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span className="att-v2-status-pill pending">
                              <span className="dot" />
                              <span>Pending Sync</span>
                            </span>
                            {emp.userId && (
                              <button
                                className="att-v2-btn"
                                style={{ padding: "2px 8px", fontSize: "11px", background: "var(--att-primary-subtle)", color: "var(--att-primary)" }}
                                onClick={() => handleSyncUser(emp.userId)}
                                disabled={syncingEmpId === emp.userId}
                              >
                                {syncingEmpId === emp.userId ? "..." : "Sync"}
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                          <button
                            type="button"
                            className="att-v2-action-btn-sm mark-btn"
                            style={{ padding: "6px 12px" }}
                            onClick={() => openMarkModal(emp)}
                          >
                            <FiClock size={12} color="var(--att-success)" />
                            <span>Mark</span>
                          </button>

                          <button
                            type="button"
                            className="att-v2-action-btn-sm leave-btn"
                            style={{ padding: "6px 12px" }}
                            onClick={() => openLeaveModal(emp)}
                          >
                            <FiFileText size={12} color="var(--att-primary)" />
                            <span>Leave</span>
                          </button>

                          <button
                            type="button"
                            className="att-v2-action-btn-sm ledger-btn"
                            style={{ padding: "6px 14px" }}
                            onClick={() => openDrawer(emp)}
                          >
                            <FiCalendar size={12} />
                            <span>Ledger</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ====================================================================
          MODAL 1: QUICK MARK ATTENDANCE
          ==================================================================== */}
      {markModalEmp && (
        <div className="att-v2-modal-overlay" onClick={() => setMarkModalEmp(null)}>
          <div className="att-v2-modal" style={{ maxWidth: "490px" }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="att-v2-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    background: "var(--att-primary-subtle)",
                    color: "var(--att-primary)",
                    border: "1px solid var(--att-primary-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                  }}
                >
                  <FiClock size={19} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "var(--att-text)" }}>Mark Attendance</h3>
                  <div style={{ fontSize: "12px", color: "var(--att-text-muted)" }}>
                    Employee: <strong>{markModalEmp.name}</strong> ({markModalEmp.employeeCode || markModalEmp.username})
                  </div>
                </div>
              </div>

              <button className="att-v2-modal-close" onClick={() => setMarkModalEmp(null)}>
                <FiX size={16} />
              </button>
            </div>

            <form onSubmit={handleMarkAttendance}>
              {/* Date Selector with Quick-Buttons */}
              <div className="att-v2-form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ margin: 0 }}>Work Date *</label>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => setAttDate(new Date().toISOString().split("T")[0])}
                      style={{
                        background: attDate === new Date().toISOString().split("T")[0] ? "var(--att-primary-subtle)" : "var(--att-surface-muted)",
                        color: attDate === new Date().toISOString().split("T")[0] ? "var(--att-primary)" : "var(--att-text-secondary)",
                        border: attDate === new Date().toISOString().split("T")[0] ? "1px solid var(--att-primary-border)" : "1px solid var(--att-border)",
                        borderRadius: "4px",
                        padding: "2px 8px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const y = new Date();
                        y.setDate(y.getDate() - 1);
                        setAttDate(y.toISOString().split("T")[0]);
                      }}
                      style={{
                        background: "var(--att-surface-muted)",
                        color: "var(--att-text-muted)",
                        border: "1px solid var(--att-border)",
                        borderRadius: "4px",
                        padding: "2px 8px",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Yesterday
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  value={attDate}
                  onChange={(e) => setAttDate(e.target.value)}
                  className="att-v2-input"
                  required
                />
              </div>

              {/* Status Selector Choice Cards */}
              <div className="att-v2-form-group">
                <label>Attendance Status *</label>
                <div className="att-v2-status-cards-row">
                  <div
                    className={`att-v2-status-choice ${attStatus === "PRESENT" ? "selected present" : ""}`}
                    onClick={() => {
                      setAttStatus("PRESENT");
                      setAttPunchIn("09:30");
                      setAttPunchOut("18:30");
                    }}
                  >
                    <FiCheckCircle size={20} color="var(--att-success)" />
                    <h5 style={{ color: "var(--att-success-text)" }}>Present</h5>
                    <p>Full Day</p>
                  </div>

                  <div
                    className={`att-v2-status-choice ${attStatus === "HALF_DAY" ? "selected halfday" : ""}`}
                    onClick={() => {
                      setAttStatus("HALF_DAY");
                      setAttPunchIn("09:30");
                      setAttPunchOut("13:30");
                    }}
                  >
                    <FiClock size={20} color="var(--att-warning)" />
                    <h5 style={{ color: "var(--att-warning-text)" }}>Half Day</h5>
                    <p>4 Hours</p>
                  </div>

                  <div
                    className={`att-v2-status-choice ${attStatus === "ABSENT" ? "selected absent" : ""}`}
                    onClick={() => setAttStatus("ABSENT")}
                  >
                    <FiX size={20} color="var(--att-danger)" />
                    <h5 style={{ color: "var(--att-danger-text)" }}>Absent</h5>
                    <p>No Punches</p>
                  </div>
                </div>
              </div>

              {/* Punch Timestamps if Present or Half Day */}
              {attStatus !== "ABSENT" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--att-text-secondary)" }}>
                      Punch IN Time
                    </label>
                    <input
                      type="time"
                      value={attPunchIn}
                      onChange={(e) => setAttPunchIn(e.target.value)}
                      className="att-v2-input"
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--att-text-secondary)" }}>
                      Punch OUT Time
                    </label>
                    <input
                      type="time"
                      value={attPunchOut}
                      onChange={(e) => setAttPunchOut(e.target.value)}
                      className="att-v2-input"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Reason / Quick Tags */}
              <div className="att-v2-form-group">
                <label>Reason / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Field duty, regularized by HR, biometric punch missed"
                  value={attReason}
                  onChange={(e) => setAttReason(e.target.value)}
                  className="att-v2-input"
                />
                <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
                  {["On Duty", "Field Assignment", "Missed Punch", "Regularized by HR"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setAttReason(tag)}
                      style={{
                        background: "var(--att-surface-muted)",
                        border: "1px solid var(--att-border)",
                        borderRadius: "4px",
                        padding: "2px 8px",
                        fontSize: "11px",
                        color: "var(--att-text-secondary)",
                        cursor: "pointer",
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="att-v2-modal-actions">
                <button type="button" className="att-v2-btn-secondary" onClick={() => setMarkModalEmp(null)}>
                  Cancel
                </button>
                <button type="submit" className="att-v2-btn-primary" disabled={submittingAtt}>
                  {submittingAtt ? "Applying..." : `Mark ${attStatus === "HALF_DAY" ? "Half Day" : attStatus}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 2: QUICK APPLY LEAVE ON BEHALF
          ==================================================================== */}
      {leaveModalEmp && (
        <div className="att-v2-modal-overlay" onClick={() => setLeaveModalEmp(null)}>
          <div className="att-v2-modal" style={{ maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <div className="att-v2-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "10px",
                    background: "var(--att-primary-subtle)",
                    color: "var(--att-primary)",
                    border: "1px solid var(--att-primary-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                  }}
                >
                  <FiFileText size={19} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 800, color: "var(--att-text)" }}>Apply Leave on Behalf</h3>
                  <div style={{ fontSize: "12px", color: "var(--att-text-muted)" }}>
                    Employee: <strong>{leaveModalEmp.name}</strong> ({leaveModalEmp.employeeCode || leaveModalEmp.username})
                  </div>
                </div>
              </div>

              <button className="att-v2-modal-close" onClick={() => setLeaveModalEmp(null)}>
                <FiX size={16} />
              </button>
            </div>

            <form onSubmit={handleApplyLeave}>
              {/* Leave Policy Selection */}
              <div className="att-v2-form-group">
                <label>Leave Policy / Category *</label>
                {loadingBalances ? (
                  <div style={{ fontSize: "12px", color: "var(--att-text-muted)" }}>Loading policies...</div>
                ) : (
                  <select
                    value={leaveTypeId}
                    onChange={(e) => setLeaveTypeId(e.target.value)}
                    className="att-v2-select"
                    required
                  >
                    <option value="">Select a Leave Policy...</option>
                    {drawerLeaveTypes.map((t) => {
                      const bal = drawerBalances.find((b) => b.id === t.id || b.leave_type_code === t.code);
                      const avail = bal ? (bal.available_days ?? bal.balance ?? 0) : null;
                      return (
                        <option key={t.id} value={t.id}>
                          {t.name || t.code} {avail !== null ? `(${avail} days available)` : ""}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Date Range Selection */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--att-text-secondary)" }}>
                    From Date *
                  </label>
                  <input
                    type="date"
                    value={leaveFromDate}
                    onChange={(e) => setLeaveFromDate(e.target.value)}
                    className="att-v2-input"
                    required
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--att-text-secondary)" }}>
                    To Date *
                  </label>
                  <input
                    type="date"
                    value={leaveToDate}
                    onChange={(e) => setLeaveToDate(e.target.value)}
                    className="att-v2-input"
                    required
                  />
                </div>
              </div>

              {/* Half Day Option */}
              <div className="att-v2-form-group">
                <label>Day Option</label>
                <select
                  value={leaveHalfDay}
                  onChange={(e) => setLeaveHalfDay(e.target.value)}
                  className="att-v2-select"
                >
                  <option value="NONE">Full Day</option>
                  <option value="FIRST_HALF">First Half Only</option>
                  <option value="SECOND_HALF">Second Half Only</option>
                </select>
              </div>

              {/* Reason */}
              <div className="att-v2-form-group">
                <label>Reason *</label>
                <textarea
                  rows={3}
                  placeholder="State reason for leave application..."
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="att-v2-textarea"
                  required
                />
              </div>

              <div className="att-v2-modal-actions">
                <button type="button" className="att-v2-btn-secondary" onClick={() => setLeaveModalEmp(null)}>
                  Cancel
                </button>
                <button type="submit" className="att-v2-btn-primary" disabled={submittingLeave}>
                  {submittingLeave ? "Submitting..." : "Submit Leave Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL 3: WIDE SLIDE-OVER DRAWER (EXECUTIVE LIGHT SURFACE THEME)
          Width: 92vw / Max-Width 1240px for rich desktop experience
          ==================================================================== */}
      {drawerEmp && (
        <div className="att-v2-drawer-backdrop" onClick={() => setDrawerEmp(null)}>
          <div className="att-v2-drawer" onClick={(e) => e.stopPropagation()}>
            {/* Executive Light Header Matching Attendance V2 */}
            <div className="att-v2-drawer-header">
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: "18px",
                    flexShrink: 0,
                    ...getAvatarStyle(drawerEmp.name || drawerEmp.username),
                  }}
                >
                  {getInitials(drawerEmp.name || drawerEmp.username)}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <h3 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "var(--att-text)" }}>
                      {drawerEmp.name}
                    </h3>
                    {drawerEmp.isHrmsLinked ? (
                      <span className="att-v2-status-pill synced">
                        <span className="dot" />
                        <span>HRMS Synced</span>
                      </span>
                    ) : (
                      <span className="att-v2-status-pill pending">
                        <span className="dot" />
                        <span>Pending Sync</span>
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px", fontSize: "13px", color: "var(--att-text-muted)" }}>
                    <span className="att-v2-emp-code-badge">
                      {drawerEmp.employeeCode || drawerEmp.username}
                    </span>
                    <span>• {typeof drawerEmp.company === "string" ? drawerEmp.company : drawerEmp.company?.name || "SFPL"} ({typeof drawerEmp.department === "string" ? drawerEmp.department : drawerEmp.department?.name || "General"})</span>
                    {drawerEmp.designation && <span>• {typeof drawerEmp.designation === "string" ? drawerEmp.designation : drawerEmp.designation?.name}</span>}
                  </div>
                </div>
              </div>

              {/* Action Buttons & Close in Drawer Header */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  className="att-v2-btn-secondary"
                  onClick={() => openMarkModal(drawerEmp)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px", padding: "7px 14px", fontWeight: 600 }}
                >
                  <FiClock size={13} color="var(--att-success)" />
                  <span>Mark Attendance</span>
                </button>

                <button
                  type="button"
                  className="att-v2-btn-secondary"
                  onClick={() => openLeaveModal(drawerEmp)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "12.5px", padding: "7px 14px", fontWeight: 600 }}
                >
                  <FiFileText size={13} color="var(--att-primary)" />
                  <span>Apply Leave</span>
                </button>

                <button
                  className="att-v2-drawer-close-btn"
                  onClick={() => setDrawerEmp(null)}
                  title="Close Drawer"
                >
                  <FiX size={17} />
                </button>
              </div>
            </div>

            {/* Sticky Segmented Sub-Navigation Tabs */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                padding: "10px 32px",
                borderBottom: "1px solid var(--att-border)",
                background: "#ffffff",
                position: "sticky",
                top: "73px",
                zIndex: 9,
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
              }}
            >
              <button
                className={`att-v2-tab-btn ${drawerTab === "ledger" ? "active" : ""}`}
                onClick={() => setDrawerTab("ledger")}
                style={{ padding: "8px 18px", fontWeight: 700 }}
              >
                <FiCalendar size={15} />
                <span>Monthly Attendance Ledger</span>
              </button>

              <button
                className={`att-v2-tab-btn ${drawerTab === "profile" ? "active" : ""}`}
                onClick={() => setDrawerTab("profile")}
                style={{ padding: "8px 18px", fontWeight: 700 }}
              >
                <FiUser size={15} />
                <span>Profile & Placement</span>
              </button>

              <button
                className={`att-v2-tab-btn ${drawerTab === "quotas" ? "active" : ""}`}
                onClick={() => setDrawerTab("quotas")}
                style={{ padding: "8px 18px", fontWeight: 700 }}
              >
                <FiLayers size={15} />
                <span>Leave Quotas</span>
              </button>
            </div>

            {/* Wide Drawer Body Content */}
            <div className="att-v2-drawer-body">
              {/* TAB 1: ATTENDANCE LEDGER */}
              {drawerTab === "ledger" && (
                <div>
                  <div
                    style={{
                      background: "var(--att-primary-subtle)",
                      border: "1px solid var(--att-primary-border)",
                      borderRadius: "12px",
                      padding: "12px 18px",
                      marginBottom: "18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <FiInfo color="var(--att-primary)" size={18} />
                      <span style={{ fontSize: "13px", color: "var(--att-primary)", fontWeight: 600 }}>
                        Viewing monthly punch ledger for <strong>{drawerEmp.name}</strong>. Admins can audit check-ins, approve punch corrections, or export monthly reports.
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        className="att-v2-btn-secondary"
                        onClick={() => openMarkModal(drawerEmp)}
                        style={{ padding: "5px 12px", fontSize: "12px", background: "#ffffff" }}
                      >
                        <FiClock size={12} color="var(--att-success)" />
                        <span>Override Punch</span>
                      </button>
                      <button
                        type="button"
                        className="att-v2-btn-secondary"
                        onClick={() => openLeaveModal(drawerEmp)}
                        style={{ padding: "5px 12px", fontSize: "12px", background: "#ffffff" }}
                      >
                        <FiFileText size={12} color="var(--att-primary)" />
                        <span>Apply Leave</span>
                      </button>
                    </div>
                  </div>

                  {/* Render the Ledger Component scoped to this employee */}
                  <AttendanceV2Ledger
                    targetUserId={drawerEmp.userId}
                    employeeName={drawerEmp.name}
                  />
                </div>
              )}

              {/* TAB 2: PROFILE & PLACEMENT */}
              {drawerTab === "profile" && (
                <div style={{ background: "#ffffff", borderRadius: "16px", padding: "28px", border: "1px solid var(--att-border)", maxWidth: "800px" }}>
                  <h4 style={{ margin: "0 0 20px", fontSize: "16px", fontWeight: 800, color: "var(--att-text)", display: "flex", alignItems: "center", gap: "8px" }}>
                    <FiUser color="var(--att-primary)" />
                    <span>Employee Identification & Mapping</span>
                  </h4>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                    <div className="att-v2-form-group" style={{ margin: 0 }}>
                      <label>Employee Code</label>
                      <input
                        type="text"
                        value={drawerEmp.employeeCode || drawerEmp.username || ""}
                        disabled
                        className="att-v2-input"
                        style={{ background: "var(--att-surface-muted)", color: "var(--att-text-secondary)", fontWeight: 700 }}
                      />
                    </div>

                    <div className="att-v2-form-group" style={{ margin: 0 }}>
                      <label>User Role</label>
                      <input
                        type="text"
                        value={drawerEmp.role || "User"}
                        disabled
                        className="att-v2-input"
                        style={{ background: "var(--att-surface-muted)", color: "var(--att-text-secondary)", fontWeight: 700 }}
                      />
                    </div>
                  </div>

                  <div className="att-v2-form-group">
                    <label>Official Email</label>
                    <input
                      type="text"
                      value={drawerEmp.email || "No email registered"}
                      disabled
                      className="att-v2-input"
                      style={{ background: "var(--att-surface-muted)", color: "var(--att-text-secondary)" }}
                    />
                  </div>

                  <div style={{ borderTop: "1px solid var(--att-border)", margin: "22px 0 18px", paddingTop: "18px" }}>
                    <h5 style={{ margin: "0 0 14px", fontSize: "14px", fontWeight: 800, color: "var(--att-text)" }}>
                      Placement & Organization Hierarchy
                    </h5>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "18px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--att-text-secondary)" }}>
                          Department
                        </label>
                        <input
                          type="text"
                          value={editDept}
                          onChange={(e) => setEditDept(e.target.value)}
                          className="att-v2-input"
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--att-text-secondary)" }}>
                          Designation
                        </label>
                        <input
                          type="text"
                          value={editDesig}
                          onChange={(e) => setEditDesig(e.target.value)}
                          className="att-v2-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--att-border)" }}>
                    {drawerEmp.userId && (
                      <button
                        type="button"
                        className="att-v2-btn-secondary"
                        onClick={() => handleSyncUser(drawerEmp.userId)}
                        disabled={syncingEmpId === drawerEmp.userId}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                      >
                        <FiRefreshCw className={syncingEmpId === drawerEmp.userId ? "spinning" : ""} size={13} />
                        <span>Force Re-sync with HRMS</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="att-v2-btn-primary"
                      onClick={handleSavePlacement}
                      disabled={savingPlacement}
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      <FiCheck size={14} />
                      <span>{savingPlacement ? "Saving..." : "Save Placement"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: LEAVE QUOTAS */}
              {drawerTab === "quotas" && (
                <div>
                  <h4 style={{ margin: "0 0 18px", fontSize: "15px", fontWeight: 800, textTransform: "uppercase", color: "var(--att-text)", letterSpacing: "0.5px" }}>
                    Annual Leave Buckets & Balance Summary
                  </h4>

                  {loadingBalances ? (
                    <div style={{ padding: "40px", textAlign: "center", color: "var(--att-text-muted)" }}>
                      <FiClock className="spinning" size={24} style={{ color: "var(--att-primary)", marginBottom: "8px" }} />
                      <div>Fetching real-time balances from HRMS...</div>
                    </div>
                  ) : drawerBalances.length === 0 ? (
                    <div style={{ padding: "24px", background: "var(--att-surface-muted)", borderRadius: "10px", color: "var(--att-text-muted)", fontSize: "13px" }}>
                      No active leave policies assigned to this employee.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                      {drawerBalances.map((b) => (
                        <div
                          key={b.id || b.name}
                          style={{
                            background: "#ffffff",
                            border: "1px solid var(--att-border)",
                            borderRadius: "14px",
                            padding: "20px",
                            boxShadow: "var(--att-shadow-xs)",
                            borderTop: "3px solid var(--att-primary)",
                          }}
                        >
                          <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--att-text-muted)", textTransform: "uppercase" }}>
                            {b.name || b.leave_type_code}
                          </div>
                          <div style={{ fontSize: "32px", fontWeight: 900, color: "var(--att-primary)", marginTop: "6px" }}>
                            {b.balance ?? b.available_days ?? 0}
                            <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--att-text-muted)", marginLeft: "4px" }}>days left</span>
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--att-text-secondary)", marginTop: "8px", display: "flex", justifyContent: "space-between" }}>
                            <span>Allocated: <strong>{b.accrued ?? b.allocated ?? 0}</strong></span>
                            <span>Consumed: <strong>{b.consumed ?? b.used_days ?? 0}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceV2Employees;
