import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiClock, FiCalendar, FiFileText, FiAlertTriangle, FiCheckCircle, FiUsers,
  FiRefreshCw, FiAward, FiActivity, FiUserCheck, FiDatabase,
  FiBriefcase, FiLayers, FiShield, FiPlus, FiArrowLeft, FiChevronLeft, FiHome
} from "react-icons/fi";
import toast from "react-hot-toast";
import { UserContext } from "../../contexts/UserContext";
import attendanceV2API from "../../api/attendance/attendanceV2.api";
import AttendanceV2Clock from "./AttendanceV2Clock";
import AttendanceV2Ledger from "./AttendanceV2Ledger";
import AttendanceV2Leaves from "./AttendanceV2Leaves";
import AttendanceV2Corrections from "./AttendanceV2Corrections";
import AttendanceV2Approvals from "./AttendanceV2Approvals";
import AttendanceV2IntegrationAdmin from "./AttendanceV2IntegrationAdmin";
import AttendanceV2Employees from "./AttendanceV2Employees";
import "./AttendanceV2.css";

const AttendanceV2Dashboard = () => {
  const navigate = useNavigate();
  const [tabHistory, setTabHistory] = useState(["overview"]);

  const switchTab = (newTab) => {
    if (newTab === activeTab) return;
    setTabHistory((prev) => [...prev, newTab]);
    setActiveTab(newTab);
  };

  const handleBack = () => {
    if (tabHistory.length > 1) {
      const nextHistory = [...tabHistory];
      nextHistory.pop();
      const prevTab = nextHistory[nextHistory.length - 1];
      setTabHistory(nextHistory);
      setActiveTab(prevTab);
      return;
    }
    if (activeTab !== "overview") {
      setActiveTab("overview");
      setTabHistory(["overview"]);
      return;
    }
    if (window.history && window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const handleExitToErp = () => {
    if (window.history && window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };
  const { user } = useContext(UserContext);

  const [activeTab, setActiveTab] = useState("overview");
  const [sessionData, setSessionData] = useState(null);
  const [todayData, setTodayData] = useState(null);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [inboxCount, setInboxCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [regularizeDate, setRegularizeDate] = useState(null);
  const [leaveDate, setLeaveDate] = useState(null);
  const [hrmsOffline, setHrmsOffline] = useState(false);
  const [linking, setLinking] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date());

  // Live second clock for the header
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setHrmsOffline(false);
    try {
      const [meRes, todayRes, balRes] = await Promise.all([
        attendanceV2API.getMe().catch((err) => {
          const status = err?.response?.status;
          const code = err?.response?.data?.code;
          if (status === 530 || status === 503 || status === 502 || code === "HRMS_SERVICE_OFFLINE") {
            setHrmsOffline(true);
          }
          return null;
        }),
        attendanceV2API.getTodayStatus().catch((err) => {
          const status = err?.response?.status;
          const code = err?.response?.data?.code;
          if (status === 530 || status === 503 || status === 502 || code === "HRMS_SERVICE_OFFLINE") {
            setHrmsOffline(true);
          }
          return null;
        }),
        attendanceV2API.getLeaveBalances().catch(() => []),
      ]);

      setSessionData(meRes);
      setTodayData(todayRes);
      setLeaveBalances(Array.isArray(balRes) ? balRes : []);

      // Check approvals inbox count if manager or admin
      const isMgr = meRes?.hrms?.roles?.includes("MANAGER") || user?.role === "Admin" || user?.isHod;
      if (isMgr) {
        attendanceV2API
          .getApprovalsInbox()
          .then((inbox) => {
            if (Array.isArray(inbox)) setInboxCount(inbox.length);
          })
          .catch(() => {});
      }
    } catch (err) {
      console.error("Failed to load Attendance V2 dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleAutoLink = async () => {
    setLinking(true);
    try {
      const res = await attendanceV2API.autoLink();
      if (res?.success) {
        toast.success(res.message || "Profile linked successfully!");
        loadDashboardData();
      } else {
        toast.error(res?.message || "Unable to auto-link profile.");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Auto-link failed");
    } finally {
      setLinking(false);
    }
  };

  const isManagerOrAdmin =
    sessionData?.hrms?.roles?.includes("MANAGER") ||
    sessionData?.hrms?.roles?.includes("ADMIN") ||
    user?.role === "Admin" ||
    user?.isHod;

  const isAdmin = user?.role === "Admin" || sessionData?.hrms?.roles?.includes("ADMIN");

  const totalLeaveAvail = leaveBalances.reduce((sum, b) => sum + (b.available_days || 0), 0);

  const handleRequestCorrectionFromLedger = (workDate) => {
    setRegularizeDate(workDate);
    switchTab("corrections");
  };

  const handleApplyLeaveFromLedger = (workDate) => {
    setLeaveDate(workDate);
    switchTab("leaves");
  };

  return (
    <div className="attendance-v2-container">
      {/* TOP NAVIGATION / BREADCRUMB BAR */}
      <div className="att-v2-top-nav">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {activeTab !== "overview" ? (
            <>
              <button
                type="button"
                className="att-v2-btn-back"
                onClick={handleBack}
                id="att-v2-back-button"
                title="Back to Overview Tab"
              >
                <FiArrowLeft size={16} />
                <span>Back to Overview</span>
              </button>
              <button
                type="button"
                className="att-v2-btn-exit"
                onClick={handleExitToErp}
                title="Exit"
              >
                <FiHome size={14} />
                <span>Exit</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="att-v2-btn-back"
              onClick={handleExitToErp}
              id="att-v2-back-button"
              title="Exit Attendance V2"
            >
              <FiArrowLeft size={16} />
              <span>Exit</span>
            </button>
          )}
        </div>

        <div className="att-v2-breadcrumbs">
          <span className="att-v2-breadcrumb-item clickable" onClick={() => navigate("/")} title="Go to ERP Home">
            <FiHome size={14} />
            <span>ERP Home</span>
          </span>
          <span className="att-v2-breadcrumb-sep">/</span>
          <span
            className={`att-v2-breadcrumb-item ${activeTab === "overview" ? "active" : "clickable"}`}
            onClick={() => switchTab("overview")}
          >
            Attendance V2
          </span>
          {activeTab !== "overview" && (
            <>
              <span className="att-v2-breadcrumb-sep">/</span>
              <span className="att-v2-breadcrumb-item active">
                {activeTab === "clock" && "Punch Terminal"}
                {activeTab === "ledger" && "Attendance Ledger"}
                {activeTab === "leaves" && "Leaves Center"}
                {activeTab === "corrections" && "Regularization"}
                {activeTab === "approvals" && "Approvals Inbox"}
                {activeTab === "admin" && "Integration Control"}
                {activeTab === "employees" && "Employee Management"}
              </span>
            </>
          )}
        </div>
      </div>
      {/* EXECUTIVE COCKPIT HEADER */}
      <div className="att-v2-header">
        <div className="att-v2-title-area">
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="att-v2-hero-back-btn"
              onClick={handleBack}
              title={activeTab !== "overview" ? "Back to Overview" : "Exit"}
            >
              <FiArrowLeft size={13} />
              <span>{activeTab !== "overview" ? "Back to Overview" : "Exit"}</span>
            </button>
            <div className="att-v2-hero-badge" style={{ marginBottom: 0 }}>
              <span className="att-v2-hero-badge-dot" />
              <span>Attendance V2 • Live Connected</span>
            </div>
          </div>
          <h1>
            <span>Enterprise Attendance & Time</span>
          </h1>
          <div className="att-v2-subtitle">
            <span>Welcome, <strong>{user?.first_name || user?.username || "Employee"}</strong></span>
            <span>•</span>
            <span className="att-v2-chip">
              <FiBriefcase size={12} />
              <span>{sessionData?.employment?.legal_entity_name || user?.company || "Suraj Group"}</span>
            </span>
            <span className="att-v2-chip">
              <FiLayers size={12} />
              <span>{sessionData?.employment?.department || user?.department || "Operations"}</span>
            </span>
          </div>
        </div>

        <div className="att-v2-header-meta">
          <button
            className="att-v2-btn-sync"
            onClick={loadDashboardData}
            disabled={loading}
            title="Sync live status with HRMS"
          >
            <FiRefreshCw className={loading ? "spinning" : ""} size={15} />
            <span>{loading ? "Syncing..." : "Sync Live"}</span>
          </button>

          <div className="att-v2-time-display">
            <div className="att-v2-live-clock">
              {currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
            <div className="att-v2-live-date">
              <FiCalendar size={13} />
              <span>{currentTime.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* UNLINKED PROFILE ALERT BANNER */}
      {sessionData?.unlinked && (
        <div className="att-v2-link-banner">
          <div className="att-v2-link-banner-left">
            <div className="att-v2-link-banner-icon">
              <FiUserCheck size={26} />
            </div>
            <div>
              <h4 style={{ margin: "0 0 4px 0", color: "#1e1b4b", fontSize: "16px", fontWeight: 800 }}>
                Employee Profile Linking Required
              </h4>
              <p style={{ margin: 0, color: "#4338ca", fontSize: "13.5px" }}>
                Your account (<strong>{user?.username}</strong>) is not yet mapped to an active HRMS employment record.
                Click <strong>Auto-Link</strong> to immediately connect and enable live biometric sync.
              </p>
            </div>
          </div>
          <div>
            <button
              className="att-v2-btn-primary"
              onClick={handleAutoLink}
              disabled={linking}
            >
              <FiRefreshCw className={linking ? "spinning" : ""} size={15} />
              <span>{linking ? "Linking Profile..." : "Auto-Link Profile Now"}</span>
            </button>
          </div>
        </div>
      )}

      {/* OFFLINE WARNING BANNER */}
      {hrmsOffline && (
        <div className="att-v2-offline-banner">
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div className="att-v2-offline-icon">
              <FiAlertTriangle size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: "#9f1239", fontSize: "15px" }}>
                Live Attendance Connection Paused
              </div>
              <div style={{ color: "#881337", fontSize: "13px", marginTop: "3px" }}>
                The background sync channel is temporarily offline. Local records remain safe and will reconcile automatically when the connection restores.
              </div>
            </div>
          </div>
          <div>
            <button
              className="att-v2-btn-secondary"
              onClick={loadDashboardData}
              style={{ background: "#ffffff", color: "#e11d48", borderColor: "#fecdd3" }}
            >
              Retry Reconnect
            </button>
          </div>
        </div>
      )}

      {/* SEGMENTED NAVIGATION TABS */}
      <div className="att-v2-nav-tabs">
        <button
          className={`att-v2-tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => switchTab("overview")}
        >
          <FiClock size={16} />
          <span>Clock & Overview</span>
        </button>

        <button
          className={`att-v2-tab-btn ${activeTab === "ledger" ? "active" : ""}`}
          onClick={() => switchTab("ledger")}
        >
          <FiCalendar size={16} />
          <span>Monthly Ledger</span>
        </button>

        <button
          className={`att-v2-tab-btn ${activeTab === "leaves" ? "active" : ""}`}
          onClick={() => switchTab("leaves")}
        >
          <FiFileText size={16} />
          <span>Leaves & Quota</span>
        </button>

        <button
          className={`att-v2-tab-btn ${activeTab === "corrections" ? "active" : ""}`}
          onClick={() => switchTab("corrections")}
        >
          <FiAlertTriangle size={16} />
          <span>Regularization</span>
        </button>

        {isManagerOrAdmin && (
          <button
            className={`att-v2-tab-btn ${activeTab === "approvals" ? "active" : ""}`}
            onClick={() => switchTab("approvals")}
          >
            <FiCheckCircle size={16} />
            <span>Approvals</span>
            {inboxCount > 0 && <span className="att-v2-tab-count">{inboxCount}</span>}
          </button>
        )}

        {isManagerOrAdmin && (
          <button
            className={`att-v2-tab-btn ${activeTab === "employees" ? "active" : ""}`}
            onClick={() => switchTab("employees")}
          >
            <FiUsers size={16} />
            <span>Employees</span>
          </button>
        )}

        {isAdmin && (
          <button
            className={`att-v2-tab-btn ${activeTab === "integration" ? "active" : ""}`}
            onClick={() => switchTab("integration")}
          >
            <FiDatabase size={16} />
            <span>HRMS Integration</span>
          </button>
        )}
      </div>

      {/* TAB 1: OVERVIEW & PUNCH CLOCK */}
      {activeTab === "overview" && (
        <>
          {/* 4 EXECUTIVE KPI CARDS */}
          <div className="att-v2-kpi-grid">
            {(() => {
              const punches = todayData?.punches || [];
              const sorted = [...punches].sort((a, b) => new Date(a.punched_at) - new Date(b.punched_at));
              const lastPunch = sorted.length > 0 ? sorted[sorted.length - 1] : null;
              const isOnBreak = Boolean(
                todayData?.is_on_break ||
                todayData?.status === "ON_BREAK" ||
                (lastPunch && lastPunch.punch_type === "BREAK_START")
              );
              const isWorking = Boolean(
                !isOnBreak && (
                  todayData?.is_punched_in ||
                  (lastPunch && (lastPunch.punch_type === "IN" || lastPunch.punch_type === "BREAK_END"))
                )
              );

              return (
                <div className={`att-v2-kpi-card ${isWorking ? "status-active" : isOnBreak ? "status-break" : ""}`}>
                  <div className={`att-v2-kpi-icon ${isWorking ? "green" : isOnBreak ? "amber" : "blue"}`}>
                    <FiClock />
                  </div>
                  <div className="att-v2-kpi-info">
                    <h4>Today's State</h4>
                    <p style={{ color: isWorking ? "#059669" : isOnBreak ? "#d97706" : "var(--att-text)" }}>
                      {isWorking ? "Clocked In" : isOnBreak ? "On Break" : todayData?.status || "Not Checked In"}
                    </p>
                    <div className="att-v2-kpi-sub">
                      <span>{isWorking ? "In Office · Active" : isOnBreak ? "Break in progress" : "Shift: 09:30 AM – 06:30 PM"}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="att-v2-kpi-card status-hours">
              <div className="att-v2-kpi-icon purple">
                <FiActivity />
              </div>
              <div className="att-v2-kpi-info">
                <h4>Effective Work Time</h4>
                <p>
                  {Math.floor((todayData?.effective_minutes || 0) / 60)}h{" "}
                  {String((todayData?.effective_minutes || 0) % 60).padStart(2, "0")}m
                </p>
                <div className="att-v2-progress-track">
                  <div
                    className="att-v2-progress-fill"
                    style={{
                      width: `${Math.min(100, Math.round(((todayData?.effective_minutes || 0) / 480) * 100))}%`,
                    }}
                  />
                </div>
                <div className="att-v2-kpi-sub">
                  <span>
                    {Math.min(100, Math.round(((todayData?.effective_minutes || 0) / 480) * 100))}% of 8h standard shift
                  </span>
                </div>
              </div>
            </div>

            <div className="att-v2-kpi-card status-leaves" onClick={() => switchTab("leaves")} style={{ cursor: "pointer" }} title="View Leave Quotas & Balances">
              <div className="att-v2-kpi-icon blue">
                <FiFileText />
              </div>
              <div className="att-v2-kpi-info">
                <h4>Leave Balance</h4>
                <p>{totalLeaveAvail} Days</p>
                <div className="att-v2-kpi-sub">
                  <span>{leaveBalances.length} leave types available</span>
                </div>
              </div>
            </div>

            <div className="att-v2-kpi-card">
              <div className="att-v2-kpi-icon amber">
                <FiShield />
              </div>
              <div className="att-v2-kpi-info">
                <h4>Access Role</h4>
                <p style={{ fontSize: "20px" }}>
                  {sessionData?.hrms?.roles?.join(", ") || user?.role || "Employee"}
                </p>
                <div className="att-v2-kpi-sub">
                  <span>Biometric & Web Terminal Enabled</span>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN TWO-COLUMN DASHBOARD */}
          <div className="att-v2-grid-dashboard">
            {/* Live Clock Chronograph */}
            <AttendanceV2Clock todayData={todayData} onRefresh={loadDashboardData} />

            {/* Attendance Monthly Calendar View */}
            <AttendanceV2Ledger
              defaultView="calendar"
              onRequestCorrection={handleRequestCorrectionFromLedger}
              onApplyLeave={handleApplyLeaveFromLedger}
            />
          </div>
        </>
      )}

      {/* TAB 2: MONTHLY LEDGER */}
      {activeTab === "ledger" && (
        <AttendanceV2Ledger
          defaultView="table"
          onRequestCorrection={handleRequestCorrectionFromLedger}
          onApplyLeave={handleApplyLeaveFromLedger}
          onBack={handleBack}
        />
      )}

      {/* TAB 3: LEAVES & BALANCES */}
      {activeTab === "leaves" && <AttendanceV2Leaves initialDate={leaveDate} initialBalances={leaveBalances} onBack={handleBack} />}

      {/* TAB 4: REGULARIZATION & CORRECTIONS */}
      {activeTab === "corrections" && (
        <AttendanceV2Corrections initialDate={regularizeDate} onBack={handleBack} />
      )}

      {/* TAB 5: APPROVALS */}
      {activeTab === "approvals" && isManagerOrAdmin && <AttendanceV2Approvals onBack={handleBack} />}

      {/* TAB: EMPLOYEES DIRECTORY & CONTROL */}
      {activeTab === "employees" && isManagerOrAdmin && (
        <AttendanceV2Employees onBack={handleBack} currentUser={user} />
      )}

      {/* TAB 6: ADMIN HRMS INTEGRATION */}
      {activeTab === "integration" && isAdmin && <AttendanceV2IntegrationAdmin onBack={handleBack} />}
    </div>
  );
};

export default AttendanceV2Dashboard;
