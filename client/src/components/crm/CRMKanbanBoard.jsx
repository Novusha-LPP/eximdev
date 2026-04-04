import React, { useState, useEffect } from 'react';
import axios from 'axios';
import OpportunityDetailModal from './components/OpportunityDetailModal';

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
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [draggedOpportunity, setDraggedOpportunity] = useState(null);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  const fetchBoard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/opportunities/board`,
        { withCredentials: true }
      );
      
      const realBoard = res.data || {};
      // Ensure all stages exist in the object
      PIPELINE_STAGES.forEach(s => {
        if (!realBoard[s.id]) realBoard[s.id] = [];
      });
      
      setBoard(realBoard);
    } catch (err) {
      console.error('Error fetching pipeline board:', err);
      setError(err.response?.data?.message || 'Failed to load pipeline');
      setBoard({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, []);

  const handleDragStart = (e, opportunity, fromStage) => {
    setDraggedOpportunity({ opportunity, fromStage });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropStage = (e, toStage) => {
    e.preventDefault();
    if (draggedOpportunity && draggedOpportunity.fromStage !== toStage) {
      handleUpdateOpportunityStage(draggedOpportunity.opportunity._id, toStage);
    }
    setDraggedOpportunity(null);
  };

  const handleUpdateOpportunityStage = async (opportunityId, newStage) => {
    if (!draggedOpportunity) return;
    
    const fromStage = draggedOpportunity.fromStage;
    if (fromStage === newStage) {
      setDraggedOpportunity(null);
      return;
    }

    // Optimistic update
    const oldBoard = JSON.parse(JSON.stringify(board));
    const updatedBoard = { ...board };
    const opportunity = updatedBoard[fromStage].find(o => o._id === opportunityId);
    
    if (opportunity) {
      updatedBoard[fromStage] = updatedBoard[fromStage].filter(o => o._id !== opportunityId);
      if (!updatedBoard[newStage]) updatedBoard[newStage] = [];
      updatedBoard[newStage].push({ ...opportunity, stage: newStage });
      setBoard(updatedBoard);
    }

    setUpdating(true);
    try {
      await axios.put(
        `${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunityId}`,
        { stage: newStage },
        { withCredentials: true }
      );
    } catch (error) {
      setBoard(oldBoard);
      setError(error.response?.data?.message || `Failed to move opportunity to ${newStage}`);
      console.error('Error moving opportunity:', error);
    } finally {
      setUpdating(false);
      setDraggedOpportunity(null);
    }
  };

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div>
        <div style={{ fontSize: '18px', marginBottom: '12px' }}>⏳ Loading CRM Pipeline...</div>
        <div style={{ fontSize: '14px', color: '#94a3b8' }}>Fetching your opportunities</div>
      </div>
    </div>
  );

  return (
    <>
      <OpportunityDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedOpportunity(null);
        }}
        opportunity={selectedOpportunity}
        onRefresh={fetchBoard}
      />

      {/* Error notification */}
      {error && (
        <div style={{
          background: '#fee2e2', color: '#991b1b', padding: '12px 16px', borderRadius: '8px',
          marginBottom: '16px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', border: '1px solid #fca5a5'
        }}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} style={{ background: 'transparent', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: '18px' }}>×</button>
        </div>
      )}

      {/* Updating indicator */}
      {updating && (
        <div style={{ background: '#dbeafe', color: '#1e40af', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⏳ Updating...</span>
        </div>
      )}

      <div style={{ 
        display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '24px', 
        minHeight: 'calc(100vh - 200px)', background: '#f8fafc', padding: '24px'
      }}>
        {PIPELINE_STAGES.map(stage => {
          const opps = board[stage.id] || [];
          return (
            <div key={stage.id} style={{ 
              width: '320px', flexShrink: 0, background: '#ebf1f7', borderRadius: '12px', 
              padding: '16px', display: 'flex', flexDirection: 'column',
              border: '2px dashed transparent', transition: 'border-color 0.2s'
            }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropStage(e, stage.id)}
            onDragEnter={(e) => e.currentTarget.style.borderColor = '#4f46e5'}
            onDragLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', fontWeight: 700, color: '#334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: stage.color }}></div>
                  <span>{stage.name}</span>
                </div>
                <span style={{ 
                   background: '#ffffff', color: '#64748b', padding: '2px 10px', 
                   borderRadius: '6px', fontSize: '0.75rem', border: '1px solid #e2e8f0'
                }}>{opps.length}</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '300px' }}>
                {opps.map(opp => (
                  <div 
                    key={opp._id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, opp, stage.id)}
                    onClick={() => {
                      setSelectedOpportunity(opp);
                      setIsDetailOpen(true);
                    }}
                    style={{ 
                      background: '#ffffff', padding: '16px', borderRadius: '10px', 
                      border: '1px solid #e2e8f0', cursor: 'grab', transition: 'all 0.2s',
                      position: 'relative', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      opacity: draggedOpportunity?.opportunity._id === opp._id ? 0.5 : 1
                    }} 
                    onMouseEnter={e => {
                      if (draggedOpportunity?.opportunity._id !== opp._id) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.07)';
                      }
                    }} 
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                    }}
                  >
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '3px', height: '100%', background: stage.color }}></div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: '#1e293b', fontWeight: 600 }}>{opp.name}</h4>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '12px' }}>
                      {typeof opp.accountId === 'object' ? (opp.accountId?.name || 'No Account') : (opp.accountId || 'No Account')}
                    </div>
                    
                    <div style={{ 
                      marginTop: 'auto', display: 'flex', justifyContent: 'space-between', 
                      alignItems: 'baseline', borderTop: '1px solid #f1f5f9', paddingTop: '12px'
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
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', border: '1px dashed #cbd5e1', borderRadius: '10px' }}>
                    No deals
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </>
  );
}
