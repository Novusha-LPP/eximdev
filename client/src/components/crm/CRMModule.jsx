import React, { useState } from 'react';
import CRMKanbanBoard from './CRMKanbanBoard';
import LeadList from './LeadList';

const TABS = [
  { key: 'pipeline',  label: 'Pipeline'  },
  { key: 'leads',  label: 'Leads'  }
];

export default function CRMModule() {
  const [activeTab, setActiveTab] = useState('pipeline');

  const renderContent = () => {
    switch (activeTab) {
      case 'pipeline': return <CRMKanbanBoard />;
      case 'leads': return <LeadList />;
      default: return <CRMKanbanBoard />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', background: '#f8fafc' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', height: '72px', background: 'rgba(255, 255, 255, 0.8)', borderBottom: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
         <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', fontFamily: 'Inter, sans-serif' }}>Sales Pipeline</h1>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Multi-Tenant CRM</span>
         </div>
         <nav style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
            {TABS.map(tab => (
              <button 
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{ 
                  padding: '8px 16px', 
                  border: 'none', 
                  background: activeTab === tab.key ? '#ffffff' : 'transparent', 
                  color: activeTab === tab.key ? '#4f46e5' : '#475569', 
                  borderRadius: '6px', 
                  fontWeight: 600, 
                  cursor: 'pointer',
                  boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.2s'
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
