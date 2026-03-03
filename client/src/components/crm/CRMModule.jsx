import React, { useState, useContext, useEffect } from 'react';
import '../customerKyc/customerKyc.css';
import { UserContext } from '../../contexts/UserContext';
import { useKyc } from './hooks/useKyc';
import CRMDashboard  from './CRMDashboard';
import SuspectList   from './SuspectList';
import AddSuspectKYC from './AddSuspectKYC';
import ProspectList  from './ProspectList';
import EditProspectKYC from './EditProspectKYC';
import CustomerList    from './CustomerList';
import CompleteCustomerKYC from './CompleteCustomerKYC';

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'suspects',  label: 'Suspects'  },
  { key: 'prospects', label: 'Prospects' },
  { key: 'customers', label: 'Customers' },
];

function CRMModule() {
  const { user } = useContext(UserContext);
  const { getStats } = useKyc();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [counts, setCounts] = useState({ suspects: 0, prospects: 0, customers: 0 });
  const [nav, setNav]       = useState({ view: 'list', record: null });

  useEffect(() => {
    getStats().then(s => setCounts({ suspects: s.suspects||0, prospects: s.prospects||0, customers: s.customers||0 })).catch(()=>{});
  }, []);

  const handleTabChange = (key) => {
    setActiveTab(key);
    setNav({ view: 'list', record: null });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <CRMDashboard />;

      case 'suspects':
        if (nav.view === 'addSuspect')
          return <AddSuspectKYC
            onNavigate={(view, rec) => { setNav({ view, record: rec }); if (view !== 'addSuspect') setActiveTab(view === 'prospects' ? 'prospects' : 'suspects'); }}
            editRecord={nav.record}
          />;
        return <SuspectList onNavigate={(view, rec) => { if (view === 'addSuspect') setNav({ view, record: rec }); else setActiveTab(view); }} />;

      case 'prospects':
        if (nav.view === 'editProspect')
          return <EditProspectKYC
            onNavigate={(view) => { if (view === 'prospects') setNav({ view: 'list', record: null }); else setActiveTab(view); }}
            record={nav.record}
          />;
        return <ProspectList onNavigate={(view, rec) => { if (view === 'editProspect') setNav({ view, record: rec }); else setActiveTab(view); }} />;

      case 'customers':
        if (nav.view === 'completeCustomer')
          return <CompleteCustomerKYC
            onNavigate={(view) => { if (view === 'customers') setNav({ view: 'list', record: null }); else setActiveTab(view); }}
            record={nav.record}
          />;
        return <CustomerList onNavigate={(view, rec) => { if (view === 'completeCustomer') setNav({ view, record: rec }); else setActiveTab(view); }} />;

      default: return <CRMDashboard />;
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
          justifyContent: "space-between",
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
          <div>
            <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "var(--primary-900)", fontFamily: "var(--font-display)" }}>CRM Pipeline</h1>
            <span style={{ fontSize: "0.85rem", color: "var(--slate-500)" }}>Enterprise Customer Management</span>
          </div>

          <nav
            style={{
              display: "flex",
              gap: "0.25rem",
              background: "var(--slate-100)",
              padding: "0.25rem",
              borderRadius: "var(--radius-lg)",
            }}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              const pillCount = counts[tab.key];
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "var(--radius-md)",
                    border: "none",
                    background: isActive ? "var(--surface-1)" : "transparent",
                    color: isActive ? "var(--primary-700)" : "var(--slate-600)",
                    fontWeight: isActive ? 600 : 500,
                    fontSize: "0.875rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    boxShadow: isActive ? "var(--shadow-sm)" : "none",
                    fontFamily: "var(--font-display)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                  onMouseOver={(e) => {
                    if (!isActive) e.currentTarget.style.color = "var(--primary-600)";
                  }}
                  onMouseOut={(e) => {
                    if (!isActive) e.currentTarget.style.color = "var(--slate-600)";
                  }}
                >
                  {tab.label}
                  {pillCount > 0 && (
                    <span style={{
                      background: isActive ? "var(--primary-100)" : "var(--slate-200)",
                      color: isActive ? "var(--primary-700)" : "var(--slate-500)",
                      padding: "2px 6px",
                      borderRadius: "10px",
                      fontSize: "0.7rem",
                      fontWeight: 700
                    }}>
                      {pillCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <div style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
        {renderContent()}
      </div>
    </div>
  );
}

export default React.memo(CRMModule);
