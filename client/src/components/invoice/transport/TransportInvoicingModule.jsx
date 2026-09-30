import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { saveAs } from "file-saver";
import { UserContext } from "../../../contexts/UserContext";
import TransportDashboard from "./TransportDashboard";
import DailyInvoicingTab from "./DailyInvoicingTab";
import SundryDebtorsTab from "./SundryDebtorsTab";
import DirectIncomeTab from "./DirectIncomeTab";
import MonthlyReportTab from "./MonthlyReportTab";
import AuditTrailTab from "./AuditTrailTab";
import DailyEntryModal from "./DailyEntryModal";
import ExcelUploadModal from "./ExcelUploadModal";
import ShareModal from "./ShareModal";
import toast from "react-hot-toast";
import "../../../styles/transport-invoicing.scss";

export default function TransportInvoicingModule() {
  const { user } = useContext(UserContext);
  const isAdmin = user?.role === "Admin";

  const [activeTab, setActiveTab] = useState("dashboard");
  const [activeSubmodule, setActiveSubmodule] = useState("transport");

  // Admin user selector
  const [adminSelectedUserId, setAdminSelectedUserId] = useState("");
  const [transportUsers, setTransportUsers] = useState([]);

  // Modals state
  const [dailyModalOpen, setDailyModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Shared report data for share modal
  const [currentReportData, setCurrentReportData] = useState(null);

  // Fetch transport users list for Admin
  useEffect(() => {
    if (isAdmin) {
      axios
        .get(`${process.env.REACT_APP_API_STRING}/transport-invoicing/users`, { withCredentials: true })
        .then((res) => {
          if (res.data?.success && res.data.users) {
            setTransportUsers(res.data.users);
            // Default to Ayan Chauhan if available
            const ayan = res.data.users.find((u) => u.username === "ayan_chauhan");
            if (ayan) {
              setAdminSelectedUserId(ayan._id);
            }
          }
        })
        .catch((err) => console.error("Could not fetch transport users:", err));
    }
  }, [isAdmin]);

  const activeUserId = isAdmin ? adminSelectedUserId : user?._id;

  const handleDownloadFile = async (endpoint, filename) => {
    const toastId = toast.loading(`Downloading ${filename}...`);
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/transport-invoicing/${endpoint}`,
        {
          responseType: "blob",
          withCredentials: true
        }
      );
      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });
      saveAs(blob, filename);
      toast.success(`Downloaded ${filename}`, { id: toastId });
    } catch (err) {
      console.warn("Blob download error, trying direct fallback:", err);
      try {
        const fileUrl = `${process.env.REACT_APP_API_STRING}/transport-invoicing/${endpoint}`;
        const link = document.createElement("a");
        link.href = fileUrl;
        link.setAttribute("download", filename);
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Downloading ${filename}`, { id: toastId });
      } catch (fallbackErr) {
        console.error("Direct download failed:", fallbackErr);
        toast.error(`Failed to download ${filename}`, { id: toastId });
      }
    }
  };

  const handleDownloadDailyTemplate = () => {
    handleDownloadFile("template/daily", "Daily_Invoicing_Template.xlsx");
  };

  const handleDownloadSundryTemplate = () => {
    handleDownloadFile("template/sundry-debtors", "Sundry_Debtors_Template.xlsx");
  };

  const handleDownloadMasterTemplate = () => {
    handleDownloadFile("template/master", "Ayan_Invoicing_Template.xlsx");
  };

  return (
    <div className="transport-invoicing-container">
      {/* Module Header Banner */}
      <div className="ti-header">
        <div className="ti-title-area">
          <div className="ti-title-left">
            <div className="ti-icon-badge">🚚</div>
            <div>
              <h2>AYAN — TRANSPORT INVOICING MODULE</h2>
              <div className="ti-subtitle">
                <span>Daily Sales Format</span>
                <span>•</span>
                <span>7 Branches (ICD Khodiyar, Sanand, Mundra, Airport, Hazira, Sachana, Baroda)</span>
                <span>•</span>
                <span>Sundry Debtors & Direct Income</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="ti-actions">
            {isAdmin && transportUsers.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginRight: "0.5rem" }}>
                <span style={{ fontSize: "0.78rem", color: "#94a3b8", fontWeight: 700 }}>
                  VIEW USER:
                </span>
                <select
                  className="ti-input"
                  style={{
                    width: "auto",
                    background: "rgba(255, 255, 255, 0.12)",
                    color: "#ffffff",
                    borderColor: "rgba(255, 255, 255, 0.25)",
                    fontSize: "0.82rem",
                    padding: "0.3rem 0.6rem"
                  }}
                  value={adminSelectedUserId}
                  onChange={(e) => setAdminSelectedUserId(e.target.value)}
                >
                  <option value="" style={{ color: "#000" }}>All Users (Global)</option>
                  {transportUsers.map((u) => (
                    <option key={u._id} value={u._id} style={{ color: "#000" }}>
                      {u.first_name ? `${u.first_name} ${u.last_name || ""}` : u.username} ({u.username})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              className="ti-btn ti-btn-ghost"
              onClick={handleDownloadDailyTemplate}
              title="Download pre-filled Excel template for 7 branches"
            >
              📄 Daily Template
            </button>
            <button
              type="button"
              className="ti-btn ti-btn-ghost"
              onClick={handleDownloadSundryTemplate}
              title="Download Sundry Debtors Excel template"
            >
              📄 Sundry Template
            </button>
            <button
              type="button"
              className="ti-btn ti-btn-ghost"
              onClick={handleDownloadMasterTemplate}
              title="Download full multi-sheet master template (Ayan_Invoicing_Template.xlsx)"
            >
              📊 Master Workbook
            </button>
            <button
              type="button"
              className="ti-btn ti-btn-ghost"
              onClick={() => setUploadModalOpen(true)}
            >
              📥 Upload Excel
            </button>
            <button
              type="button"
              className="ti-btn ti-btn-ghost"
              onClick={() => setShareModalOpen(true)}
            >
              🔗 Share
            </button>
            <button
              type="button"
              className="ti-btn"
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#ffffff",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.35)"
              }}
              onClick={() => setDailyModalOpen(true)}
            >
              ⚡ + Daily Entry
            </button>
          </div>
        </div>

        {/* Sub-module Switcher Bar (Section: Invoice Category sub-modules) */}
        <div className="ti-submodule-bar">
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
            Invoice Sub-Module:
          </span>
          <div
            className={`ti-submodule-pill ${activeSubmodule === "transport" ? "active" : ""}`}
            onClick={() => setActiveSubmodule("transport")}
          >
            <span>🚚</span> Transport Invoicing (Ayan)
          </div>
          <div
            className="ti-submodule-pill disabled"
            title="Sharanga sub-module will be added soon"
          >
            <span>📦</span> Sharanga Invoicing (Coming Soon)
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="ti-nav-tabs">
        <button
          type="button"
          className={`ti-tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
          onClick={() => setActiveTab("dashboard")}
        >
          <span>📊</span> Transport Dashboard
        </button>
        <button
          type="button"
          className={`ti-tab-btn ${activeTab === "daily" ? "active" : ""}`}
          onClick={() => setActiveTab("daily")}
        >
          <span>📅</span> Daily Invoicing
        </button>
        <button
          type="button"
          className={`ti-tab-btn ${activeTab === "sundry" ? "active" : ""}`}
          onClick={() => setActiveTab("sundry")}
        >
          <span>👥</span> Sundry Debtors
        </button>
        <button
          type="button"
          className={`ti-tab-btn ${activeTab === "direct" ? "active" : ""}`}
          onClick={() => setActiveTab("direct")}
        >
          <span>💰</span> Direct Income
        </button>
        <button
          type="button"
          className={`ti-tab-btn ${activeTab === "monthly" ? "active" : ""}`}
          onClick={() => setActiveTab("monthly")}
        >
          <span>📈</span> Monthly Report
        </button>
        <button
          type="button"
          className={`ti-tab-btn ${activeTab === "audit" ? "active" : ""}`}
          onClick={() => setActiveTab("audit")}
        >
          <span>📜</span> Audit Trail
        </button>
      </div>

      {/* Tab Content Display */}
      {activeTab === "dashboard" && (
        <TransportDashboard
          activeUserId={activeUserId}
          onOpenDailyModal={() => setDailyModalOpen(true)}
          onOpenUploadModal={() => setUploadModalOpen(true)}
          onOpenShareModal={(report) => {
            if (report) setCurrentReportData(report);
            setShareModalOpen(true);
          }}
        />
      )}

      {activeTab === "daily" && (
        <DailyInvoicingTab
          activeUserId={activeUserId}
          onOpenDailyModal={() => setDailyModalOpen(true)}
        />
      )}

      {activeTab === "sundry" && (
        <SundryDebtorsTab activeUserId={activeUserId} />
      )}

      {activeTab === "direct" && (
        <DirectIncomeTab activeUserId={activeUserId} />
      )}

      {activeTab === "monthly" && (
        <MonthlyReportTab
          activeUserId={activeUserId}
          onOpenShareModal={(report) => {
            if (report) setCurrentReportData(report);
            setShareModalOpen(true);
          }}
        />
      )}

      {activeTab === "audit" && (
        <AuditTrailTab activeUserId={activeUserId} />
      )}

      {/* Modals */}
      <DailyEntryModal
        isOpen={dailyModalOpen}
        onClose={() => setDailyModalOpen(false)}
        activeUserId={activeUserId}
        onSuccess={() => {
          // Trigger refresh by re-setting tab or event
          setActiveTab((prev) => prev);
        }}
      />

      <ExcelUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        activeUserId={activeUserId}
        onSuccess={() => {
          setActiveTab("dashboard");
        }}
      />

      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        reportData={currentReportData}
        username={user?.first_name || user?.username || "Ayan"}
      />
    </div>
  );
}
