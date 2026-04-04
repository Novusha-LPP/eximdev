import React, { useState } from 'react';
import CRMKanbanBoard from './CRMKanbanBoard';
import LeadList from './LeadList';
import AccountsList from './components/AccountsList';
import ContactsList from './components/ContactsList';
import TasksList from './components/TasksList';
import CRMDashboard from './CRMDashboard';
import SalesTeamManagement from './components/SalesTeamManagement';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', description: 'View key metrics & pipeline health' },
  { key: 'pipeline', label: 'Pipeline', description: 'Kanban board for deal stages' },
  { key: 'leads', label: 'Leads', description: 'Manage and convert leads' },
  { key: 'accounts', label: 'Accounts', description: 'Company information' },
  { key: 'contacts', label: 'Contacts', description: 'People at organizations' },
  { key: 'teams', label: 'Teams', description: 'Sales team structure' },
  { key: 'tasks', label: 'Tasks', description: 'Action items & follow-ups' }
];

const CRM_WORKFLOW = {
  beginner: [
    'dashboard', // Understand current state
    'leads',      // Create and manage leads
    'pipeline',   // View pipeline
    'accounts'    // Manage companies
  ],
  workflow: [
    'Dashboard → See metrics',
    'Leads → Create/import leads',
    'Lead Scoring → Identify hot prospects (A grade)',
    'Leads → Convert to account + opportunity',
    'Pipeline → Drag through stages (lead → qualified → won)',
    'Tasks → Set follow-ups',
    'Dashboard → Monitor progress'
  ]
};

export default function CRMModule() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showWorkflowGuide, setShowWorkflowGuide] = useState(false);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <CRMDashboard />;
      case 'pipeline': return <CRMKanbanBoard />;
      case 'leads': return <LeadList />;
      case 'accounts': return <AccountsList />;
      case 'contacts': return <ContactsList />;
      case 'teams': return <SalesTeamManagement />;
      case 'tasks': return <TasksList />;
      default: return <CRMDashboard />;
    }
  };

  const currentTab = TABS.find(t => t.key === activeTab);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', background: '#f8fafc' }}>
      {/* Header */}
      <header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '0 2rem', 
        height: '72px', 
        background: 'rgba(255, 255, 255, 0.8)', 
        borderBottom: '1px solid #e2e8f0', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        backdropFilter: 'blur(8px)'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', fontFamily: 'Inter, sans-serif' }}>
             CRM Management
          </h1>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            {currentTab?.description || 'Sales, Accounts & Tasks'}
          </span>
        </div>
        {/* <button
          onClick={() => setShowWorkflowGuide(!showWorkflowGuide)}
          style={{
            padding: '8px 14px',
            background: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.85rem',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.background = '#4338ca'}
          onMouseLeave={(e) => e.target.style.background = '#4f46e5'}
        >
          {showWorkflowGuide ? '✕ Close Guide' : '❓ Workflow Guide'}
        </button> */}
      </header>

      {/* Workflow Guide */}
      {/* {showWorkflowGuide && (
        <div style={{
          background: '#eff6ff',
          borderBottom: '1px solid #bfdbfe',
          padding: '16px 2rem',
          color: '#0c4a6e',
          borderRadius: '0 0 12px 12px'
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 700 }}>
            📖 Recommended CRM Workflow:
          </h3>
          <ol style={{ margin: 0, paddingLeft: '20px' }}>
            {CRM_WORKFLOW.workflow.map((step, idx) => (
              <li key={idx} style={{ margin: '6px 0', fontSize: '0.85rem' }}>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )} */}

      {/* Tab Navigation */}
      <nav style={{ 
        display: 'flex', 
        gap: '8px', 
        background: '#f1f5f9', 
        padding: '12px 2rem',
        overflowX: 'auto',
        borderBottom: '1px solid #e2e8f0',
        flexWrap: 'wrap'
      }}>
        {TABS.map(tab => (
          <button 
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            title={tab.description}
            style={{ 
              padding: '10px 14px', 
              border: 'none', 
              background: activeTab === tab.key ? '#ffffff' : 'transparent', 
              color: activeTab === tab.key ? '#4f46e5' : '#475569', 
              borderRadius: '6px', 
              fontWeight: 600, 
              cursor: 'pointer',
              boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              fontSize: '0.85rem',
              border: activeTab === tab.key ? '1px solid #e2e8f0' : '1px solid transparent'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.key) {
                e.target.style.background = '#e2e8f0';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.key) {
                e.target.style.background = 'transparent';
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        {renderContent()}
      </div>
    </div>
  );
}
