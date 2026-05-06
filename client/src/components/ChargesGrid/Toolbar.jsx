import React from 'react';
import './charges.css';

const Toolbar = ({ onAddCharge, onAddHeading, onDeleteSelected, onBulkPB, readOnly, isDeleteDisabled, isBulkPBDisabled }) => {
  if (readOnly) return null;

  return (
    <div className="charges-toolbar" style={{ marginBottom: 0 }}>
      <button type="button" className="charges-toolbar-btn" onClick={onAddCharge}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add Charge
      </button>
      
      <div className="charges-toolbar-sep"></div>

      <button 
         type="button"
         className="charges-toolbar-btn" 
         onClick={onBulkPB} 
         disabled={isBulkPBDisabled}
         style={{ color: '#1976d2' }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="9" y1="21" x2="9" y2="9" />
        </svg>
        Bulk Purchase Book
      </button>

      <div className="charges-toolbar-sep"></div>

      <button 
         type="button"
         className="charges-toolbar-btn charges-del-btn" 
         onClick={onDeleteSelected} 
         disabled={isDeleteDisabled}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M9 6V4h6v2" />
        </svg>
        Delete Selected
      </button>
    </div>
  );
};

export default Toolbar;
