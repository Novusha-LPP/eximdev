import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  RefreshCw,
  Boxes,
  Laptop,
  Ticket,
  Wrench,
  Users,
  HardDrive,
  Key,
  BarChart3,
  Bell,
  ShieldCheck,
  Settings,
  ArrowRight,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import { useModuleAuditLogs } from "./AuditLogs";
import "../../styles/scorecard.scss";

const getAssetStatusBadgeClass = (status) => {
  switch (status) {
    case "Available":
      return "badge-excellent";
    case "Assigned":
      return "badge-good";
    case "In Repair":
      return "badge-warning";
    case "Retired":
    case "Lost":
      return "badge-danger";
    default:
      return "badge-secondary";
  }
};

const getTicketStatusBadgeClass = (status) => {
  switch (status) {
    case "Closed":
    case "Resolved":
      return "badge-excellent";
    case "In Progress":
      return "badge-good";
    case "Pending":
      return "badge-warning";
    case "New":
    case "Open":
      return "badge-danger";
    default:
      return "badge-secondary";
  }
};

const getPriorityBadgeClass = (priority) => {
  switch (priority) {
    case "High":
    case "Urgent":
    case "Critical":
      return "badge-danger";
    case "Medium":
      return "badge-warning";
    case "Low":
      return "badge-good";
    default:
      return "badge-secondary";
  }
};

const MODULES = [
  {
    title: "Asset Management",
    desc: "Computers, Laptops, Printers & Peripherals",
    icon: Laptop,
    to: "/it-helpdesk/assets",
    color: "#059669",
    bgColor: "#ecfdf5",
  },
  {
    title: "Helpdesk & Tickets",
    desc: "Raise, Assign & Track IT Support Tickets",
    icon: Wrench,
    to: "/it-helpdesk/tickets",
    color: "#2563eb",
    bgColor: "#eff6ff",
  },
  {
    title: "Vendors & AMC",
    desc: "Supplier & AMC Contract Tracking",
    icon: Users,
    to: "/it-helpdesk/vendors",
    color: "#7c3aed",
    bgColor: "#f5f3ff",
  },
  {
    title: "Inventory & Spares",
    desc: "Stock, Spare Parts & Components",
    icon: HardDrive,
    to: "/it-helpdesk/inventory",
    color: "#db2777",
    bgColor: "#fdf2f8",
  },
  {
    title: "License Management",
    desc: "Software & SaaS Subscriptions",
    icon: Key,
    to: "/it-helpdesk/licenses",
    color: "#0284c7",
    bgColor: "#f0f9ff",
  },
  {
    title: "Reports & Analytics",
    desc: "Asset & Ticket Operational Reports",
    icon: BarChart3,
    to: "/it-helpdesk/reports",
    color: "#0d9488",
    bgColor: "#f0fdfa",
  },
  {
    title: "Notifications",
    desc: "Warranty, AMC & License Expiry Alerts",
    icon: Bell,
    to: "/it-helpdesk/notifications",
    color: "#ea580c",
    bgColor: "#fff7ed",
  },
  {
    title: "Audit Logs",
    desc: "System Activity Tracking & Security Logs",
    icon: ShieldCheck,
    to: "/it-helpdesk/administration/audit",
    color: "#d97706",
    bgColor: "#fffbeb",
  },
  {
    title: "System Settings",
    desc: "Helpdesk Config & Mail Setup",
    icon: Settings,
    to: "/it-helpdesk/administration/settings",
    color: "#475569",
    bgColor: "#f1f5f9",
  },
];

export default function ITHHelpdeskHome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    assigned: 0,
    inRepair: 0,
    ticketNew: 0,
    ticketAssigned: 0,
    ticketInProgress: 0,
    ticketPending: 0,
    ticketResolved: 0,
    ticketClosed: 0,
    ticketOpen: 0,
  });
  const [recentAssets, setRecentAssets] = useState([]);
  const [recentTickets, setRecentTickets] = useState([]);

  // Audit logs
  const { logCreate, logRead } = useModuleAuditLogs("IT Helpdesk Home");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      if (typeof logRead === "function") {
        logRead("dashboard-view", "Accessed IT Helpdesk Dashboard", "info");
      }

      const [assetsRes, ticketsRes, ticketStatsRes, assetStatsRes] =
        await Promise.all([
          itHelpdeskAPI.assets.getAll({ limit: 5 }),
          itHelpdeskAPI.tickets.getAll({ limit: 5 }),
          itHelpdeskAPI.tickets.getStats(),
          itHelpdeskAPI.assets.getStats(),
        ]);

      const assetData = assetsRes?.data || [];
      const ticketData = ticketsRes?.data || [];
      const ticketStats = ticketStatsRes?.data || ticketStatsRes || {};
      const assetStats = assetStatsRes?.data || assetStatsRes || {};

      setRecentAssets(assetData);
      setRecentTickets(ticketData);

      const newCount = ticketStats?.newCount || 0;
      const assignedCount = ticketStats?.assigned || 0;
      const inProgressCount = ticketStats?.inProgress || 0;
      const pendingCount = ticketStats?.pending || 0;
      const resolvedCount = ticketStats?.resolved || 0;
      const closedCount = ticketStats?.closed || 0;
      const openTickets = newCount + assignedCount + inProgressCount;

      const updatedStats = {
        total: assetStats?.total || 0,
        available: assetStats?.available || 0,
        assigned: assetStats?.assigned || 0,
        inRepair: assetStats?.inRepair || 0,
        ticketNew: newCount,
        ticketAssigned: assignedCount,
        ticketInProgress: inProgressCount,
        ticketPending: pendingCount,
        ticketResolved: resolvedCount,
        ticketClosed: closedCount,
        ticketOpen: openTickets,
      };

      setStats(updatedStats);
    } catch (e) {
      console.error("Failed to load dashboard data:", e?.message, e);
      const errorMsg = e?.response?.data?.message || e?.message || "Failed to load dashboard";
      setError(errorMsg);

      if (typeof logCreate === "function") {
        logCreate("dashboard-error", `Failed to load dashboard data: ${e?.message}`, "error");
      }

      // Sample fallback data if API returns an error
      const dummyAssets = [
        { _id: "1", asset_tag: "1023456", asset_type: "Desktop", status: "Available" },
        { _id: "2", asset_tag: "LAP-2026-001", asset_type: "Laptop", status: "Available" },
        { _id: "3", asset_tag: "AST-2026-001", asset_type: "Desktop", status: "Retired" },
        { _id: "4", asset_tag: "455443", asset_type: "Laptop", status: "Available" },
        { _id: "5", asset_tag: "RACK-0001234", asset_type: "Rack", status: "Available" },
      ];

      const dummyTickets = [
        { _id: "1", ticket_id: "TK-20260617-0001", priority: "Medium", status: "Open" },
        { _id: "2", ticket_id: "TK-20260612-0003", priority: "Medium", status: "Open" },
      ];

      setRecentAssets(dummyAssets);
      setRecentTickets(dummyTickets);
      setStats({
        total: 6,
        available: 5,
        assigned: 1,
        inRepair: 0,
        ticketNew: 2,
        ticketAssigned: 1,
        ticketInProgress: 1,
        ticketPending: 0,
        ticketResolved: 0,
        ticketClosed: 0,
        ticketOpen: 4,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Listen for ticket data updates from other components
  useEffect(() => {
    const handleRefresh = () => {
      fetchData();
    };
    window.addEventListener("ticketDataUpdated", handleRefresh);
    return () => window.removeEventListener("ticketDataUpdated", handleRefresh);
  }, []);

  const totalTickets = (stats.ticketOpen || 0) + (stats.ticketClosed || 0);
  const retiredLostCount = Math.max(
    (stats.total || 0) - (stats.available || 0) - (stats.assigned || 0) - (stats.inRepair || 0),
    0
  );

  return (
    <>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .it-module-card {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .it-module-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 20px -3px rgba(0, 0, 0, 0.08);
          border-color: #cbd5e1;
        }
        .it-module-card:hover .it-module-arrow {
          transform: translateX(3px);
          color: #4f46e5;
        }
      `}</style>

      {/* ── Topbar ─────────────────────────────────────────────────── */}
      <div className="topbar">
        <div className="topbar-left">
          <button
            className="btn btn-icon"
            onClick={() => navigate("/")}
            title="Back to Home"
            style={{
              border: "1px solid #e2e8f0",
              background: "white",
              borderRadius: "50%",
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 18,
              fontWeight: "bold",
              color: "#334155",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              transition: "all 0.2s ease",
            }}
          >
            ←
          </button>
          <div>
            <div className="topbar-title">IT Helpdesk Dashboard</div>
            <div className="topbar-breadcrumb" style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
              IT Asset Tracking, Support Tickets &amp; Infrastructure Operations
            </div>
          </div>
        </div>
        <div className="topbar-actions" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fetchData}
            disabled={loading}
            title="Refresh Dashboard"
          >
            <RefreshCw
              size={15}
              style={{
                animation: loading ? "spin 1s linear infinite" : "none",
              }}
            />
            <span>Refresh</span>
          </button>
          <Link
            to="/it-helpdesk/tickets"
            className="btn btn-primary"
            style={{ textDecoration: "none" }}
          >
            <Plus size={15} /> <span>Raise Ticket</span>
          </Link>
        </div>
      </div>

      <div className="page-body">
        {/* ── Optional Error Notice ───────────────────────────────────── */}
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "#fef2f2",
              border: "1px solid #fee2e2",
              borderRadius: "8px",
              padding: "10px 16px",
              marginBottom: "14px",
              color: "#991b1b",
              fontSize: "13px",
            }}
          >
            <AlertTriangle size={16} color="#ef4444" />
            <span style={{ flex: 1 }}>{error} (Displaying cached/sample metrics)</span>
          </div>
        )}

        {/* ── Top Stats Grid (Ticket KPIs) ────────────────────────────── */}
        <div className="card mb-16">
          <div className="card-body">
            <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#0f172a" }}>
                  {totalTickets}
                </div>
                <div className="stat-lbl">Total Tickets</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#ef4444" }}>
                  {stats.ticketNew || 0}
                </div>
                <div className="stat-lbl">New Tickets</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#3b82f6" }}>
                  {stats.ticketAssigned || 0}
                </div>
                <div className="stat-lbl">Assigned</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#f59e0b" }}>
                  {stats.ticketInProgress || 0}
                </div>
                <div className="stat-lbl">In Progress</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#8b5cf6" }}>
                  {stats.ticketPending || 0}
                </div>
                <div className="stat-lbl">Pending</div>
              </div>
              <div className="stat-card">
                <div className="stat-val" style={{ color: "#10b981" }}>
                  {stats.ticketClosed || 0}
                </div>
                <div className="stat-lbl">Closed</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Middle Row (Asset Summary, Recent Assets, Recent Tickets) ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "14px",
            marginBottom: "16px",
          }}
        >
          {/* Card 1: Asset Status Breakdown */}
          <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div
              className="card-header"
              style={{
                padding: "10px 16px",
                background: "linear-gradient(to right, #f8fafc, #ffffff)",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                className="card-title"
                style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Boxes size={17} color="#10b981" /> Asset Status Summary
              </div>
              <span
                style={{
                  fontSize: "11.5px",
                  fontWeight: 600,
                  color: "#475569",
                  background: "#f1f5f9",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                }}
              >
                {stats.total} Total Devices
              </span>
            </div>

            <div
              className="card-body"
              style={{
                padding: "14px 16px",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "12px",
              }}
            >
              {/* Visual Multi-Segment Bar */}
              <div>
                <div
                  style={{
                    height: "8px",
                    width: "100%",
                    background: "#f1f5f9",
                    borderRadius: "4px",
                    overflow: "hidden",
                    display: "flex",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{
                      width: `${stats.total > 0 ? (stats.available / stats.total) * 100 : 0}%`,
                      background: "#10b981",
                      transition: "width 0.4s ease",
                    }}
                    title={`Available: ${stats.available}`}
                  />
                  <div
                    style={{
                      width: `${stats.total > 0 ? (stats.assigned / stats.total) * 100 : 0}%`,
                      background: "#3b82f6",
                      transition: "width 0.4s ease",
                    }}
                    title={`Assigned: ${stats.assigned}`}
                  />
                  <div
                    style={{
                      width: `${stats.total > 0 ? (stats.inRepair / stats.total) * 100 : 0}%`,
                      background: "#f59e0b",
                      transition: "width 0.4s ease",
                    }}
                    title={`In Repair: ${stats.inRepair}`}
                  />
                  <div
                    style={{
                      width: `${stats.total > 0 ? (retiredLostCount / stats.total) * 100 : 0}%`,
                      background: "#94a3b8",
                      transition: "width 0.4s ease",
                    }}
                    title={`Retired / Lost: ${retiredLostCount}`}
                  />
                </div>

                {/* Status breakdown items */}
                <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 10px",
                      background: "#f8fafc",
                      borderRadius: "6px",
                      border: "1px solid #f1f5f9",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Available</span>
                    </div>
                    <span className="score-badge badge-excellent" style={{ minWidth: "32px", padding: "2px 8px", fontSize: "11.5px" }}>
                      {stats.available}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 10px",
                      background: "#f8fafc",
                      borderRadius: "6px",
                      border: "1px solid #f1f5f9",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6" }} />
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Assigned</span>
                    </div>
                    <span className="score-badge badge-good" style={{ minWidth: "32px", padding: "2px 8px", fontSize: "11.5px" }}>
                      {stats.assigned}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 10px",
                      background: "#f8fafc",
                      borderRadius: "6px",
                      border: "1px solid #f1f5f9",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }} />
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>In Repair</span>
                    </div>
                    <span className="score-badge badge-warning" style={{ minWidth: "32px", padding: "2px 8px", fontSize: "11.5px" }}>
                      {stats.inRepair}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 10px",
                      background: "#f8fafc",
                      borderRadius: "6px",
                      border: "1px solid #f1f5f9",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#94a3b8" }} />
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>Retired / Lost</span>
                    </div>
                    <span className="score-badge badge-secondary" style={{ minWidth: "32px", padding: "2px 8px", fontSize: "11.5px" }}>
                      {retiredLostCount}
                    </span>
                  </div>
                </div>
              </div>

              <Link
                to="/it-helpdesk/assets"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: "#4f46e5",
                  textDecoration: "none",
                  padding: "6px",
                  borderRadius: "6px",
                  background: "#f5f3ff",
                  border: "1px solid #ede9fe",
                  transition: "all 0.15s ease",
                }}
              >
                Manage Hardware Assets <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Card 2: Recent Assets Table */}
          <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div
              className="card-header"
              style={{
                padding: "10px 16px",
                background: "linear-gradient(to right, #f8fafc, #ffffff)",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                className="card-title"
                style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Laptop size={17} color="#059669" /> Recent Assets
              </div>
              <Link
                to="/it-helpdesk/assets"
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#4f46e5",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                View All <ArrowRight size={13} />
              </Link>
            </div>

            <div className="card-body" style={{ padding: 0, flex: 1, overflowX: "auto" }}>
              <div className="table-wrap">
                <table style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        Asset Tag
                      </th>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        Type
                      </th>
                      <th style={{ padding: "8px 12px", textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentAssets.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ padding: "28px 16px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                          No assets recorded yet
                        </td>
                      </tr>
                    ) : (
                      recentAssets.map((a, idx) => (
                        <tr
                          key={a._id || idx}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            background: idx % 2 === 0 ? "#ffffff" : "#fcfdfd",
                          }}
                        >
                          <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                            <Link
                              to="/it-helpdesk/assets"
                              style={{ color: "#4f46e5", textDecoration: "none" }}
                              title={a.asset_tag}
                            >
                              {a.asset_tag}
                            </Link>
                          </td>
                          <td style={{ padding: "8px 12px", color: "#475569", fontSize: "13px" }}>
                            {a.asset_type || "—"}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            <span className={`score-badge ${getAssetStatusBadgeClass(a.status)}`}>
                              {a.status || "Available"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Card 3: Recent Tickets Table */}
          <div className="card" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div
              className="card-header"
              style={{
                padding: "10px 16px",
                background: "linear-gradient(to right, #f8fafc, #ffffff)",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                className="card-title"
                style={{ fontSize: "14px", fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Ticket size={17} color="#2563eb" /> Recent Tickets
              </div>
              <Link
                to="/it-helpdesk/tickets"
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#4f46e5",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                View All <ArrowRight size={13} />
              </Link>
            </div>

            <div className="card-body" style={{ padding: 0, flex: 1, overflowX: "auto" }}>
              <div className="table-wrap">
                <table style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "8px 12px", textAlign: "left", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        Ticket ID
                      </th>
                      <th style={{ padding: "8px 12px", textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        Priority
                      </th>
                      <th style={{ padding: "8px 12px", textAlign: "center", fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTickets.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ padding: "28px 16px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                          No tickets recorded yet
                        </td>
                      </tr>
                    ) : (
                      recentTickets.map((t, idx) => (
                        <tr
                          key={t._id || idx}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            background: idx % 2 === 0 ? "#ffffff" : "#fcfdfd",
                          }}
                        >
                          <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                            <Link
                              to="/it-helpdesk/tickets"
                              style={{ color: "#4f46e5", textDecoration: "none" }}
                              title={t.ticket_id}
                            >
                              {t.ticket_id}
                            </Link>
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            <span className={`score-badge ${getPriorityBadgeClass(t.priority)}`}>
                              {t.priority || "Medium"}
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            <span className={`score-badge ${getTicketStatusBadgeClass(t.status)}`}>
                              {t.status || "New"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom Section: Modules Grid ────────────────────────────── */}
        <div style={{ marginTop: "24px", marginBottom: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
                🗂️ IT Helpdesk Modules &amp; Tools
              </h3>
              <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "#64748b" }}>
                Quick navigation to IT hardware, ticketing queues, inventory, licensing, and administration
              </p>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: "14px",
            marginBottom: "28px",
          }}
        >
          {MODULES.map((mod) => {
            const IconComponent = mod.icon;
            return (
              <Link
                key={mod.title}
                to={mod.to}
                className="it-module-card"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  padding: "16px 18px",
                  background: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  textDecoration: "none",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    background: mod.bgColor,
                    color: mod.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <IconComponent size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "14.5px",
                      fontWeight: 700,
                      color: "#0f172a",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{mod.title}</span>
                    <ArrowRight size={14} className="it-module-arrow" style={{ color: "#94a3b8", transition: "all 0.2s ease" }} />
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      marginTop: "4px",
                      lineHeight: "1.4",
                    }}
                  >
                    {mod.desc}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
