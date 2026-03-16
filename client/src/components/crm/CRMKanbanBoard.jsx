import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PIPELINE_STAGES = [
  { id: 'lead', name: 'Lead', color: '#4f8ef7' },
  { id: 'qualified', name: 'Qualified', color: '#7b8ef7' },
  { id: 'opportunity', name: 'Opportunity', color: '#a47af7' },
  { id: 'proposal', name: 'Proposal', color: '#c47af7' },
  { id: 'negotiation', name: 'Negotiation', color: '#f77ac4' },
  { id: 'won', name: 'Won', color: '#00d4aa' },
  { id: 'lost', name: 'Lost', color: '#f75a5a' }
];

export default function CRMKanbanBoard() {
  const [board, setBoard] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchBoard = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/crm/opportunities/board`, { withCredentials: true });
      setBoard(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, []);

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
      Loading CRM Pipeline...
    </div>
  );

  return (
    <div style={{ 
      display: 'flex', 
      gap: '20px', 
      overflowX: 'auto', 
      paddingBottom: '24px', 
      minHeight: 'calc(100vh - 200px)',
      background: '#f8fafc', // Light theme background
      padding: '24px'
    }}>
      {PIPELINE_STAGES.map(stage => {
        const opps = board[stage.id] || [];
        return (
          <div key={stage.id} style={{ 
            width: '320px', 
            flexShrink: 0, 
            background: '#ebf1f7', 
            borderRadius: '12px', 
            padding: '16px', 
            display: 'flex', 
            flexDirection: 'column',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px', 
              fontWeight: 700, 
              color: '#334155'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: stage.color }}></div>
                <span>{stage.name}</span>
              </div>
              <span style={{ 
                background: '#ffffff', 
                color: '#64748b',
                padding: '2px 10px', 
                borderRadius: '6px', 
                fontSize: '0.75rem',
                border: '1px solid #e2e8f0'
              }}>{opps.length}</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {opps.map(opp => (
                <div 
                  key={opp._id} 
                  style={{ 
                    background: '#ffffff', 
                    padding: '16px', 
                    borderRadius: '10px', 
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer', 
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }} 
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.07)';
                  }} 
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                  }}
                >
                  <div style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '3px', 
                    height: '100%', 
                    background: stage.color 
                  }}></div>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: '#1e293b', fontWeight: 600 }}>{opp.name}</h4>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '12px' }}>{opp.accountId?.name || 'No Account'}</div>
                  
                  <div style={{ 
                    marginTop: 'auto', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'baseline',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '12px'
                  }}>
                     <span style={{ fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                       ₹{opp.value ? (opp.value / 100000).toFixed(1) + 'L' : '0'}
                     </span>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700 }}>{opp.probability}%</span>
                        <div style={{ width: '40px', height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${opp.probability}%`, height: '100%', background: stage.color }}></div>
                        </div>
                     </div>
                  </div>
                </div>
              ))}
              {opps.length === 0 && (
                <div style={{ 
                  padding: '32px 16px', 
                  textAlign: 'center', 
                  color: '#94a3b8', 
                  fontSize: '0.8rem', 
                  border: '1px dashed #cbd5e1', 
                  borderRadius: '10px'
                }}>
                  No deals
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  );
}
