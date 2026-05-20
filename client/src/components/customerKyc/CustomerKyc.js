import * as React from "react";
import { useSearchParams } from "react-router-dom";
import CustomerKycForm from "./CustomerKycForm";
import CompletedKyc from "./CompletedKyc";
import CustomerKycStatus from "./CustomerKycStatus";
import useTabs from "../../customHooks/useTabs"; // Keeping for logic if needed, but UI is custom
import ViewDrafts from "./ViewDrafts";
import RevisionList from "./RevisionList";
import { UserContext } from "../../contexts/UserContext";
import { useNavigation } from "../../contexts/NavigationContext";
import HodApprovalPending from "./HodApprovalPending";
import FinancialApprovalPending from "./FinancialApprovalPending";
import BackButton from "./BackButton";
import TrainingManagement from "./TrainingManagement";
import "./customerKyc.css";

function CustomerKyc() {
  const { user } = React.useContext(UserContext);
  const { saveTabState, getTabState } = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize value from URL param 'tab' (1-indexed) or stored state
  const [value, setValue] = React.useState(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab) {
      const parsed = parseInt(urlTab, 10) - 1;
      if (!isNaN(parsed) && parsed >= 0) return parsed;
    }
    return getTabState("/customer-kyc") || 0;
  });

  // Sync state if URL changes (e.g. back button)
  React.useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab) {
      const parsed = parseInt(urlTab, 10) - 1;
      if (!isNaN(parsed) && parsed >= 0 && parsed !== value) {
        setValue(parsed);
      }
    }
  }, [searchParams, value]);

  const handleTabChange = (newValue) => {
    setValue(newValue);
    saveTabState("/customer-kyc", newValue);
    // Update URL with 1-indexed tab
    setSearchParams({ tab: newValue + 1 }, { replace: true });
  };

  // Save scroll position when component unmounts
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      saveTabState("/customer-kyc", value);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      saveTabState("/customer-kyc", value);
    };
  }, [value, saveTabState]);

  const isAdmin = user.role === "Admin";
  const isHOD = user.role === "HOD";
  const isAccounts = Array.isArray(user.modules) && user.modules.includes("Accounts");

  const tabs = React.useMemo(() => {
    if (isAdmin) {
      return [
        { label: "Dashboard" },
        { label: "New Application" },
        { label: "Draft Applications" },
        { label: "Revisions Required" },
        { label: "Pending Approval" },
        { label: "Completed KYC" },
        { label: "Training Management" },
      ];
    }
    
    const baseTabs = [
      { label: "New Application" },
      { label: "My Drafts" },
      { label: "Revisions" },
    ];

    if (isHOD || isAccounts) {
      baseTabs.push({ label: "Pending Approval" });
    }

    baseTabs.push({ label: "Completed KYC" });
    baseTabs.push({ label: "Training Management" });
    return baseTabs;
  }, [isAdmin, isHOD, isAccounts]);


  const renderPendingApproval = () => {
    return (
      <div className="sub-tab-content">
        <HodApprovalPending />
      </div>
    );
  };

  const renderContent = () => {
    const activeTabLabel = tabs[value]?.label;

    switch (activeTabLabel) {
      case "Dashboard":
        return <CustomerKycStatus />;
      case "New Application":
        return <CustomerKycForm />;
      case "Draft Applications":
      case "My Drafts":
        return <ViewDrafts />;
      case "Revisions Required":
      case "Revisions":
        return <RevisionList />;
      case "Pending Approval":
        return renderPendingApproval();
      case "Completed KYC":
        return <CompletedKyc />;
      case "Training Management":
        return <TrainingManagement />;
      default:
        return isAdmin ? <CustomerKycStatus /> : <CustomerKycForm />;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        width: "100%",
        background: "var(--slate-50)",
      }}
    >
      {/* Top Header Navigation */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          padding: "0 2rem",
          height: "72px",
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.3)",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.02)",
          flexShrink: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "3rem" }}>
          <nav
            style={{
              display: "flex",
              gap: "0.25rem",
              background: "var(--slate-100)",
              padding: "0.25rem",
              borderRadius: "var(--radius-lg)",
            }}
          >
            {tabs.map((tab, index) => (
              <button
                key={index}
                onClick={() => handleTabChange(index)}
                style={{
                  padding: "0.5rem 1.25rem",
                  borderRadius: "calc(var(--radius-lg) - 2px)",
                  border: "1px solid transparent",
                  background: value === index ? "white" : "transparent",
                  color:
                    value === index ? "var(--primary-700)" : "var(--slate-500)",
                  fontWeight: value === index ? 600 : 500,
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontFamily: "var(--font-display)",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow:
                    value === index
                      ? "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                      : "none",
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        <div className="fade-in-up">{renderContent()}</div>
      </main>
    </div>
  );
}

export default React.memo(CustomerKyc);
