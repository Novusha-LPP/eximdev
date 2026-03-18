import React, { useState } from 'react';
import CRMKanbanBoard from './CRMKanbanBoard';
import LeadList from './LeadList';
import AccountsList from './components/AccountsList';
import ContactsList from './components/ContactsList';
import TasksList from './components/TasksList';
import TaskBoard from './components/TaskBoard';
import CRMDashboard from './CRMDashboard';
import LeadScoringModule from './components/LeadScoringModule';
import TerritoryManagement from './components/TerritoryManagement';
import SalesTeamManagement from './components/SalesTeamManagement';

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'leads', label: 'Leads' },
  { key: 'lead-scoring', label: 'Lead Scoring' },
  { key: 'accounts', label: 'Accounts' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'territories', label: 'Territories' },
  { key: 'teams', label: 'Teams' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'task-board', label: 'Task Board' }
];

export default function CRMModule() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <CRMDashboard />;
      case 'pipeline': return <CRMKanbanBoard />;
      case 'leads': return <LeadList />;
      case 'lead-scoring': return <LeadScoringModule />;
      case 'accounts': return <AccountsList />;
      case 'contacts': return <ContactsList />;
      case 'territories': return <TerritoryManagement />;
      case 'teams': return <SalesTeamManagement />;
      case 'tasks': return <TasksList />;
      case 'task-board': return <TaskBoard />;
      default: return <CRMDashboard />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', background: '#f8fafc' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', height: '72px', background: 'rgba(255, 255, 255, 0.8)', borderBottom: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
         <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', fontFamily: 'Inter, sans-serif' }}>CRM Management</h1>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Sales, Accounts & Tasks</span>
         </div>
         <nav style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '8px', overflowX: 'auto' }}>
            {TABS.map(tab => (
              <button 
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{ 
                  padding: '8px 14px', 
                  border: 'none', 
                  background: activeTab === tab.key ? '#ffffff' : 'transparent', 
                  color: activeTab === tab.key ? '#4f46e5' : '#475569', 
                  borderRadius: '6px', 
                  fontWeight: 600, 
                  cursor: 'pointer',
                  boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap',
                  fontSize: '0.85rem'
                }}
              >
                {tab.label}
              </button>
            ))}
         </nav>
      </header>
      <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        {renderContent()}
      </div>
    </div>
  );
}
