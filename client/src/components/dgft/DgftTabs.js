import React, { useState,  useCallback } from "react";
import "./dgft.scss";
import DgftRegisterList from "./DgftRegisterList";
import AuthorizationRegistrationList from "./AuthorizationRegistrationList";

// --- Clean Enterprise Styles ---
const s = {
  wrapper: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
    backgroundColor: "#ffffff",
    padding: "0 20px 20px 20px",
    minHeight: "100vh",
    color: "#333",
    fontSize: "12px",
  },
  container: {
    width: "100%",
    margin: "0 auto",
  },
  headerRow: {
    marginBottom: "10px",
    paddingBottom: "0",
  },
  pageTitle: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#111",
    margin: "0",
  },
  tabContainer: {
    display: "flex",
    borderBottom: "1px solid #e5e7eb",
    marginBottom: "15px",
  },
  tab: {
    padding: "8px 20px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    color: "#6b7280",
    borderBottom: "3px solid transparent",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "transparent",
    border: "none",
    outline: "none",
    marginBottom: "-1px",
  },
  activeTab: {
    color: "#2563eb",
    borderBottom: "3px solid #2563eb",
  },
  badge: {
    padding: "1px 6px",
    borderRadius: "10px",
    fontSize: "10px",
    fontWeight: "700",
    backgroundColor: "#f3f4f6",
    color: "#4b5563",
  },
  activeBadge: {
    backgroundColor: "#eff6ff",
    color: "#2563eb",
  },
};

const TABS = [
  { label: "Register Format", key: "register" },
  { label: "Authorization Registration", key: "authorization" },
];

function DgftTabs() {
  const [activeTab, setActiveTab] = useState(0);
  const [counts, setCounts] = useState({ register: 0, authorization: 0 });

  const handleCountUpdate = useCallback((tab, count) => {
    setCounts((prev) => ({ ...prev, [tab]: count }));
  }, []);

  return (
    <div style={s.wrapper}>
      <div style={s.container}>
        <div style={s.headerRow}>
          <h1 style={s.pageTitle}>DGFT Module</h1>
        </div>

        {/* Tabs */}
        <div style={s.tabContainer}>
          {TABS.map((tab, idx) => (
            <button
              key={tab.key}
              style={{
                ...s.tab,
                ...(activeTab === idx ? s.activeTab : {}),
              }}
              onClick={() => setActiveTab(idx)}
            >
              {tab.label}
              <span
                style={{
                  ...s.badge,
                  ...(activeTab === idx ? s.activeBadge : {}),
                }}
              >
                {tab.key === "register" ? counts.register : counts.authorization}
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 0 && (
          <DgftRegisterList
            onCountChange={(c) => handleCountUpdate("register", c)}
          />
        )}
        {activeTab === 1 && (
          <AuthorizationRegistrationList
            onCountChange={(c) => handleCountUpdate("authorization", c)}
          />
        )}
      </div>
    </div>
  );
}

export default React.memo(DgftTabs);
