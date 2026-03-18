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

  const dummyBoard = {
    lead: [
      { _id: '1', name: 'TechCorp Initial Contact', accountId: { name: 'TechCorp Inc' }, value: 45000, probability: 10, daysInStage: 5, owner: 'John Doe' },
      { _id: '2', name: 'StartupHub Inquiry', accountId: { name: 'StartupHub' }, value: 32000, probability: 10, daysInStage: 3, owner: 'Sarah Smith' },
      { _id: '3', name: 'GlobalSys Interest', accountId: { name: 'Global Systems' }, value: 55000, probability: 10, daysInStage: 8, owner: 'Michael Chen' }
    ],
    qualified: [
      { _id: '4', name: 'Enterprise Corp - Requirements Analysis', accountId: { name: 'Enterprise Inc' }, value: 125000, probability: 40, daysInStage: 12, owner: 'John Doe' },
      { _id: '5', name: 'BigBank - Needs Assessment', accountId: { name: 'BigBank Financial' }, value: 185000, probability: 35, daysInStage: 15, owner: 'Emily Davis' }
    ],
    opportunity: [
      { _id: '6', name: 'MegaCorp - Solution Design', accountId: { name: 'MegaCorp Solutions' }, value: 280000, probability: 60, daysInStage: 18, owner: 'Robert Wilson' },
      { _id: '7', name: 'DataDrive - Platform Implementation', accountId: { name: 'DataDrive Analytics' }, value: 195000, probability: 55, daysInStage: 10, owner: 'Lisa Anderson' },
      { _id: '8', name: 'CloudNet - Infrastructure Deal', accountId: { name: 'CloudNet Services' }, value: 320000, probability: 65, daysInStage: 22, owner: 'John Doe' }
    ],
    proposal: [
      { _id: '9', name: 'FinanceFirst - Proposal Sent', accountId: { name: 'FinanceFirst Bank' }, value: 425000, probability: 75, daysInStage: 8, owner: 'Sarah Smith' },
      { _id: '10', name: 'RetailMax - Quote Pending', accountId: { name: 'RetailMax Corp' }, value: 285000, probability: 70, daysInStage: 5, owner: 'Michael Chen' }
    ],
    negotiation: [
      { _id: '11', name: 'IndustrialCo - Final Terms', accountId: { name: 'IndustrialCo' }, value: 520000, probability: 85, daysInStage: 12, owner: 'Emily Davis' },
      { _id: '12', name: 'HealthPlus - Contract Review', accountId: { name: 'HealthPlus Inc' }, value: 385000, probability: 80, daysInStage: 7, owner: 'Robert Wilson' }
    ],
    won: [
      { _id: '13', name: 'TelecomGlobal - Deal Closed', accountId: { name: 'TelecomGlobal Ltd' }, value: 650000, probability: 100, daysInStage: 0, owner: 'Lisa Anderson' },
      { _id: '14', name: 'EnergyPlus - Contract Signed', accountId: { name: 'EnergyPlus Corp' }, value: 580000, probability: 100, daysInStage: 0, owner: 'John Doe' }
    ],
    lost: [
      { _id: '15', name: 'SmallBiz - Budget Cut', accountId: { name: 'SmallBiz LLC' }, value: 75000, probability: 0, daysInStage: 45, owner: 'Sarah Smith' },
      { _id: '16', name: 'StartupX - Competitor Won', accountId: { name: 'StartupX' }, value: 125000, probability: 0, daysInStage: 30, owner: 'Michael Chen' }
    ]
  };

  const fetchBoard = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/crm/opportunities/board`, { withCredentials: true });
      if (res.data && Object.keys(res.data).length > 0) {
        setBoard(res.data);
      } else {
        setBoard(dummyBoard);
      }
    } catch (err) {
      setBoard(dummyBoard);
      console.error(err);
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
    try {
      const oldBoard = board;
      const updatedBoard = { ...board };
      const opportunity = updatedBoard[draggedOpportunity.fromStage].find(o => o._id === opportunityId);
      
      if (opportunity) {
        updatedBoard[draggedOpportunity.fromStage] = updatedBoard[draggedOpportunity.fromStage].filter(o => o._id !== opportunityId);
        if (!updatedBoard[newStage]) updatedBoard[newStage] = [];
        updatedBoard[newStage].push(opportunity);
        setBoard(updatedBoard);
      }

      await axios.put(
        `${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunityId}`,
        { stage: newStage },
        { withCredentials: true }
      );
    } catch (error) {
      console.error('Error moving opportunity:', error);
      fetchBoard();
    }
  };

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
      Loading CRM Pipeline...
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

      <div style={{ 
        display: 'flex', 
        gap: '20px', 
        overflowX: 'auto', 
        paddingBottom: '24px', 
        minHeight: 'calc(100vh - 200px)',
        background: '#f8fafc',
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
              border: '2px dashed transparent',
              transition: 'border-color 0.2s'
            }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDropStage(e, stage.id)}
            onDragEnter={(e) => e.currentTarget.style.borderColor = '#4f46e5'}
            onDragLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
            >
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
                      background: '#ffffff', 
                      padding: '16px', 
                      borderRadius: '10px', 
                      border: '1px solid #e2e8f0',
                      cursor: 'grab', 
                      transition: 'all 0.2s',
                      position: 'relative',
                      overflow: 'hidden',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
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
    </>
  );
}
