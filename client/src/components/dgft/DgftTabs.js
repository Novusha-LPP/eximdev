import React, { useState, useCallback, useEffect } from "react";
import axios from "axios";

import "./dgft.scss";
import DgftRegisterList from "./DgftRegisterList";
import AuthorizationRegistrationList from "./AuthorizationRegistrationList";
import { useParams, useNavigate } from "react-router-dom";

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
    borderTop: "none",
    borderLeft: "none",
    borderRight: "none",
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
  { label: "Authorization Registration", key: "auth-reg" },
  { label: "Register Format", key: "reg-format" },
];

function DgftTabs() {
  const { tab } = useParams();
  const navigate = useNavigate();
  
  // Default to first tab if none specified in URL
  const activeTabKey = tab || TABS[0].key;
  const activeIdx = TABS.findIndex(t => t.key === activeTabKey);
  const validIdx = activeIdx === -1 ? 0 : activeIdx;

  const [counts, setCounts] = useState({ "auth-reg": 0, "reg-format": 0 });

  const fetchCounts = useCallback(async () => {
    try {
      const api = process.env.REACT_APP_API_STRING;
      const [res1, res2] = await Promise.all([
        axios.get(`${api}/get-dgft-registers`),
        axios.get(`${api}/get-authorization-registrations`)
      ]);
      setCounts({
        "auth-reg": res1.data.length,
        "reg-format": res2.data.length
      });
    } catch (err) {
      console.error("Error fetching DGFT counts:", err);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const handleAuthRegCount = useCallback((c) => {
    setCounts(prev => ({ ...prev, "auth-reg": c }));
  }, []);

  const handleRegFormatCount = useCallback((c) => {
    setCounts(prev => ({ ...prev, "reg-format": c }));
  }, []);

  return (
    <div style={s.wrapper}>
      <div style={s.container}>
        <div style={s.headerRow}>
          <h1 style={s.pageTitle}>DGFT Module</h1>
        </div>

        {/* Tabs */}
        <div style={s.tabContainer}>
          {TABS.map((tabItem, idx) => (
            <button
              key={tabItem.key}
              style={{
                ...s.tab,
                ...(validIdx === idx ? s.activeTab : {}),
              }}
              onClick={() => navigate(`/dgft/${tabItem.key}`)}
            >
              {tabItem.label}
              <span
                style={{
                  ...s.badge,
                  ...(validIdx === idx ? s.activeBadge : {}),
                }}
              >
                {counts[tabItem.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {validIdx === 0 && (
          <DgftRegisterList
            onCountChange={handleAuthRegCount}
          />
        )}
        {validIdx === 1 && (
          <AuthorizationRegistrationList
            onCountChange={handleRegFormatCount}
          />
        )}
      </div>
    </div>
  );
}

export default React.memo(DgftTabs);
