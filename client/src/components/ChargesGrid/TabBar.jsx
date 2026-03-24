import React from 'react';
import './charges.css';

const TabBar = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'particulars', label: 'Particulars' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'cost', label: 'Cost' }
  ];

  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </div>
      ))}
    </div>
  );
};

export default TabBar;
