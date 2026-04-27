import React from 'react';
import './charges.css';

const TabBar = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'particulars', label: 'Particulars' },
    { id: 'cost', label: 'Cost' },
    { id: 'revenue', label: 'Revenue' }
  ];

  return (
    <div className="charges-tab-bar">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`charges-tab ${activeTab === tab.id ? 'charges-active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </div>
      ))}
    </div>
  );
};

export default TabBar;
