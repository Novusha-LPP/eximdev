import React, { useState, useEffect } from 'react';
import axios from 'axios';
import OpportunityDetailModal from './components/OpportunityDetailModal';
import FilterBar from './components/FilterBar';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { message } from 'antd';

const PIPELINE_STAGES = [
  { id: 'lead', name: 'Lead', color: '#4f8ef7' },
  { id: 'qualified', name: 'Qualified', color: '#7b8ef7' },
  { id: 'opportunity', name: 'Opportunity', color: '#a47af7' },
  { id: 'sales_visit', name: 'Sales Visit', color: '#d45af7' },
  { id: 'proposal', name: 'Proposal', color: '#c47af7' },
  { id: 'negotiation', name: 'Negotiation', color: '#f77ac4' },
  { id: 'won', name: 'Won', color: '#00d4aa' },
  { id: 'lost', name: 'Lost', color: '#f75a5a' }
];

export default function CRMKanbanBoard() {
  const getInitialParam = (name, fallback) => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get(name) || fallback;
    } catch (e) {
      return fallback;
    }
  };

  const [board, setBoard] = useState({});
  const [aggregates, setAggregates] = useState({});
  const [dealsList, setDealsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [draggedOpportunity, setDraggedOpportunity] = useState(null);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationDealName, setCelebrationDealName] = useState('');

  // CR-010 & CR-008 Filter States
  const [selectedStage, setSelectedStage] = useState(() => getInitialParam('stage', 'all'));
  const [selectedSource, setSelectedSource] = useState(() => getInitialParam('source', ''));
  const [selectedTimePeriod, setSelectedTimePeriod] = useState(() => getInitialParam('periodType', 'monthly'));
  const [selectedDate, setSelectedDate] = useState(() => getInitialParam('date', new Date().toISOString().substring(0, 10)));
  const [selectedWeek, setSelectedWeek] = useState(() => getInitialParam('week', new Date().toISOString().substring(0, 10)));
  const [selectedMonth, setSelectedMonth] = useState(() => getInitialParam('month', new Date().toISOString().substring(0, 7)));

  // Lost Reason Modal States
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [lostOpportunityId, setLostOpportunityId] = useState(null);
  const [lostFromStage, setLostFromStage] = useState(null);
  const [lostReason, setLostReason] = useState('');
  const [lostNotes, setLostNotes] = useState('');

  const [filters, setFilters] = useState(() => {
    try {
      const stored = localStorage.getItem('crm_filters_pipeline');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return {
      type: 'this_month',
      month: new Date().toISOString().substring(0, 7),
      startDate: '',
      endDate: ''
    };
  });

  const handleFilterChange = (newFilters) => {
    setFilters(prev => {
      if (
        prev &&
        prev.type === newFilters.type &&
        prev.month === newFilters.month &&
        prev.startDate === newFilters.startDate &&
        prev.endDate === newFilters.endDate
      ) {
        return prev;
      }
      return newFilters;
    });
  };

  const fetchBoard = async (activeFilters = filters) => {
    if (!activeFilters) return;
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (selectedSource) {
        params.source = selectedSource;
      }

      if (selectedStage !== 'all') {
        if (selectedTimePeriod === 'daily') {
          params.startDate = selectedDate;
          params.endDate = selectedDate;
        } else if (selectedTimePeriod === 'weekly') {
          const date = new Date(selectedWeek);
          const day = date.getDay();
          const diff = date.getDate() - day + (day === 0 ? -6 : 1);
          const monday = new Date(date.setDate(diff));
          const sunday = new Date(date.setDate(diff + 6));
          params.startDate = monday.toISOString().substring(0, 10);
          params.endDate = sunday.toISOString().substring(0, 10);
        } else {
          params.period = selectedMonth;
        }
      } else {
        if (activeFilters.startDate && activeFilters.endDate) {
          params.startDate = activeFilters.startDate;
          params.endDate = activeFilters.endDate;
        } else if (activeFilters.month) {
          params.period = activeFilters.month;
        }
      }

      if (selectedStage === 'all') {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/crm/opportunities/board`,
          { params, withCredentials: true }
        );
        
        const realBoard = res.data || {};
        const aggs = realBoard.aggregates || {};
        PIPELINE_STAGES.forEach(s => {
          if (!realBoard[s.id]) realBoard[s.id] = [];
          if (!aggs[s.id]) aggs[s.id] = { totalValue: 0, count: 0 };
        });
        
        setBoard(realBoard);
        setAggregates(aggs);
        setDealsList([]);
      } else {
        params.stage = selectedStage;
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/crm/opportunities`,
          { params, withCredentials: true }
        );
        setDealsList(Array.isArray(res.data) ? res.data : []);
        setBoard({});
        setAggregates({});
      }
    } catch (err) {
      console.error('Error fetching pipeline board/deals:', err);
      setError(err.response?.data?.message || 'Failed to load pipeline data');
      setBoard({});
      setAggregates({});
      setDealsList([]);
    } finally {
      setLoading(false);
    }
  };

  // Sync URL Params
  useEffect(() => {
    try {
      const params = new URLSearchParams();
      if (selectedStage !== 'all') params.set('stage', selectedStage);
      if (selectedSource) params.set('source', selectedSource);
      if (selectedTimePeriod !== 'monthly') params.set('periodType', selectedTimePeriod);
      if (selectedTimePeriod === 'daily') params.set('date', selectedDate);
      if (selectedTimePeriod === 'weekly') params.set('week', selectedWeek);
      if (selectedTimePeriod === 'monthly') params.set('month', selectedMonth);

      const newSearch = params.toString() ? `?${params.toString()}` : '';
      if (window.location.search !== newSearch) {
        window.history.pushState(null, '', window.location.pathname + newSearch);
      }
    } catch (e) {
      console.error('Error syncing URL params:', e);
    }
  }, [selectedStage, selectedSource, selectedTimePeriod, selectedDate, selectedWeek, selectedMonth]);

  useEffect(() => {
    fetchBoard();
  }, [filters, selectedStage, selectedSource, selectedTimePeriod, selectedDate, selectedWeek, selectedMonth]);

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
      if (toStage === 'lost') {
        setLostOpportunityId(draggedOpportunity.opportunity._id);
        setLostFromStage(draggedOpportunity.fromStage);
        setLostReason('');
        setLostNotes('');
        setIsLostModalOpen(true);
      } else {
        handleUpdateOpportunityStage(draggedOpportunity.opportunity._id, toStage);
      }
    }
    setDraggedOpportunity(null);
  };

  const handleConfirmLost = async () => {
    if (!lostReason) return;
    setIsLostModalOpen(false);
    setUpdating(true);
    try {
      await axios.put(
        `${process.env.REACT_APP_API_STRING}/crm/opportunities/${lostOpportunityId}`,
        {
          stage: 'lost',
          closeReason: lostReason,
          closeNotes: lostNotes
        },
        { withCredentials: true }
      );
      message.success('Opportunity marked as Lost');
      fetchBoard();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update opportunity');
      console.error(err);
    } finally {
      setUpdating(false);
      setLostOpportunityId(null);
      setLostFromStage(null);
    }
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

      // Trigger celebration if moved to 'won'
      if (newStage === 'won') {
        const dealName = opportunity?.name || 'Great Deal';
        setCelebrationDealName(dealName);
        setShowCelebration(true);
        
        // Intense confetti burst
        const duration = 6 * 1000;
        const end = Date.now() + duration;

        (function frame() {
          // Left Canon
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.6 },
            colors: ['#4f46e5', '#10b981', '#f59e0b']
          });
          // Right Canon
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.6 },
            colors: ['#ef4444', '#8b5cf6', '#10b981']
          });
          // Center Canon
          confetti({
            particleCount: 2,
            angle: 90,
            spread: 100,
            origin: { x: 0.5, y: 0.8 },
            colors: ['#ffffff', '#06b6d4', '#4f46e5']
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        }());

        // Auto-hide celebration message after 4 seconds
        setTimeout(() => {
          setShowCelebration(false);
        }, 3000);
      }
    } catch (error) {
      setBoard(oldBoard);
      setError(error.response?.data?.message || `Failed to move opportunity to ${newStage}`);
      console.error('Error moving opportunity:', error);
    } finally {
      setUpdating(false);
      setDraggedOpportunity(null);
    }
  };

  return (
    <>
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(10px)',
              zIndex: 10000,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              textAlign: 'center',
              pointerEvents: 'none'
            }}
          >
            <motion.div
              initial={{ scale: 0.5, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", damping: 12, stiffness: 200 }}
            >
              <div style={{ fontSize: '5rem', marginBottom: '20px' }}>🏆</div>
              <h1 style={{ fontSize: '4rem', fontWeight: 900, marginBottom: '10px', background: 'linear-gradient(to right, #4f46e5, #06b6d4, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textTransform: 'uppercase' }}>
                Congratulations!
              </h1>
              <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc' }}>
                {celebrationDealName}
              </h2>
              <p style={{ fontSize: '1.5rem', color: '#94a3b8', marginTop: '10px' }}>
                You've successfully won this deal!
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Custom Integrated Filters Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '16px 20px',
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        alignItems: 'center',
        marginBottom: '24px',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          {/* Stage Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Stage:</span>
            <select
              value={selectedStage}
              onChange={e => setSelectedStage(e.target.value)}
              style={{
                padding: '8px 14px',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '0.85rem',
                color: '#334155',
                background: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="all">All Stages (Kanban)</option>
              {PIPELINE_STAGES.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Lead Source Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Source:</span>
            <select
              value={selectedSource}
              onChange={e => setSelectedSource(e.target.value)}
              style={{
                padding: '8px 14px',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '0.85rem',
                color: '#334155',
                background: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="">All Lead Sources</option>
              <option value="Web / Own Generated Lead">Web / Own Generated Lead</option>
              <option value="IndiaMart Lead">IndiaMart Lead</option>
              <option value="Direct Sales Visit">Direct Sales Visit</option>
              <option value="Referral">Referral</option>
              <option value="Email Campaign">Email Campaign</option>
            </select>
          </div>
        </div>

        {selectedStage !== 'all' ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            {/* Time Period Toggles */}
            <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              {['daily', 'weekly', 'monthly'].map(p => (
                <button
                  key={p}
                  onClick={() => setSelectedTimePeriod(p)}
                  style={{
                    padding: '6px 12px', borderRadius: '8px', border: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    background: selectedTimePeriod === p ? '#ffffff' : 'transparent',
                    color: selectedTimePeriod === p ? '#1e293b' : '#64748b',
                    boxShadow: selectedTimePeriod === p ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
                  }}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>

            {/* dynamic picker for stage filtered view */}
            <div>
              {selectedTimePeriod === 'daily' && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  style={{ padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.85rem', color: '#334155', fontWeight: 600, outline: 'none' }}
                />
              )}
              {selectedTimePeriod === 'weekly' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Week of:</span>
                  <input
                    type="date"
                    value={selectedWeek}
                    onChange={e => setSelectedWeek(e.target.value)}
                    style={{ padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.85rem', color: '#334155', fontWeight: 600, outline: 'none' }}
                  />
                </div>
              )}
              {selectedTimePeriod === 'monthly' && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  style={{ padding: '8px 14px', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '0.85rem', color: '#334155', fontWeight: 600, outline: 'none' }}
                />
              )}
            </div>
          </div>
        ) : (
          <FilterBar moduleName="pipeline" onChange={handleFilterChange} />
        )}
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', margin: '24px' }}>
          <div>
            <div style={{ fontSize: '18px', marginBottom: '12px' }}>⏳ Loading CRM Pipeline...</div>
            <div style={{ fontSize: '14px', color: '#94a3b8' }}>Fetching your opportunities</div>
          </div>
        </div>
      ) : selectedStage !== 'all' ? (
        /* CR-010 Single Stage List/Table View */
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: '#1e293b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'capitalize' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: PIPELINE_STAGES.find(s => s.id === selectedStage)?.color }}></span>
              {selectedStage} Stage Deals
            </h3>
            <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
              {dealsList.length} {dealsList.length === 1 ? 'Deal' : 'Deals'} found
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 16px' }}>Deal Name</th>
                  <th style={{ padding: '12px 16px' }}>Company</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Value</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center' }}>Probability</th>
                  <th style={{ padding: '12px 16px' }}>Crate Size</th>
                  <th style={{ padding: '12px 16px' }}>Lead Source</th>
                  <th style={{ padding: '12px 16px' }}>Created Date</th>
                  <th style={{ padding: '12px 16px' }}>Last Updated</th>
                  <th style={{ padding: '12px 16px' }}>Assigned To</th>
                </tr>
              </thead>
              <tbody>
                {dealsList.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ padding: '48px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                      No deals found matching the active stage and period filter.
                    </td>
                  </tr>
                ) : (
                  dealsList.map(deal => (
                    <tr 
                      key={deal._id} 
                      onClick={() => {
                        setSelectedOpportunity(deal);
                        setIsDetailOpen(true);
                      }}
                      style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem', cursor: 'pointer', transition: 'background 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '16px', fontWeight: 600, color: '#1e293b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {deal.name}
                          {deal.carry_forward && (
                            <span style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                              🔄 Carried
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px', color: '#475569' }}>
                        {typeof deal.accountId === 'object' ? (deal.accountId?.name || 'N/A') : (deal.accountId || 'N/A')}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                        ₹{deal.value ? deal.value.toLocaleString('en-IN') : '0'}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center', color: '#4f46e5', fontWeight: 700 }}>
                        {deal.probability}%
                      </td>
                      <td style={{ padding: '16px', color: '#475569' }}>
                        {deal.crateSize || '—'}
                      </td>
                      <td style={{ padding: '16px' }}>
                        {deal.source ? (
                          <span style={{ 
                            fontSize: '0.7rem', 
                            background: deal.source === 'IndiaMart Lead' ? '#ffedd5' 
                                        : deal.source === 'Referral' ? '#dcfce7' 
                                        : deal.source === 'Direct Sales Visit' ? '#f3e8ff'
                                        : deal.source === 'Email Campaign' ? '#fce7f3'
                                        : deal.source === 'Web / Own Generated Lead' ? '#e0f2fe'
                                        : '#f1f5f9', 
                            color: deal.source === 'IndiaMart Lead' ? '#c2410c' 
                                   : deal.source === 'Referral' ? '#15803d' 
                                   : deal.source === 'Direct Sales Visit' ? '#6b21a8'
                                   : deal.source === 'Email Campaign' ? '#be185d'
                                   : deal.source === 'Web / Own Generated Lead' ? '#0369a1'
                                   : '#475569',
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            fontWeight: 700,
                            border: '1px solid',
                            borderColor: deal.source === 'IndiaMart Lead' ? '#fed7aa' 
                                         : deal.source === 'Referral' ? '#bbf7d0' 
                                         : deal.source === 'Direct Sales Visit' ? '#e9d5ff'
                                         : deal.source === 'Email Campaign' ? '#fbcfe8'
                                         : deal.source === 'Web / Own Generated Lead' ? '#bae6fd'
                                         : '#e2e8f0',
                          }}>
                            {deal.source}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '16px', color: '#64748b' }}>
                        {new Date(deal.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ padding: '16px', color: '#64748b' }}>
                        {new Date(deal.updatedAt).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ padding: '16px', color: '#475569', fontWeight: 500 }}>
                        {deal.ownerId?.first_name ? `${deal.ownerId.first_name} ${deal.ownerId.last_name || ''}` : deal.ownerId?.username || 'Unassigned'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Standard Kanban Board */
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', fontWeight: 700, color: '#334155' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: stage.color }}></div>
                  <span>{stage.name}</span>
                </div>
                <span style={{ 
                   background: '#ffffff', color: '#64748b', padding: '2px 10px', 
                   borderRadius: '6px', fontSize: '0.75rem', border: '1px solid #e2e8f0'
                }}>{opps.length}</span>
              </div>

              {/* CR-007 Stage Value Totals Header Summary */}
              <div style={{ 
                background: '#ffffff', padding: '8px 12px', borderRadius: '8px', 
                marginBottom: '16px', border: '1px solid #e2e8f0', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem',
                fontWeight: 600, color: '#475569'
              }}>
                <span style={{ color: '#10b981', fontWeight: 800 }}>
                  ₹{aggregates[stage.id] ? (aggregates[stage.id].totalValue / 100000).toFixed(2) + 'L' : '0.00L'}
                </span>
                <span style={{ color: '#64748b' }}>
                  {aggregates[stage.id] ? aggregates[stage.id].count : 0} {aggregates[stage.id]?.count === 1 ? 'deal' : 'deals'}
                </span>
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
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>
                      {typeof opp.accountId === 'object' ? (opp.accountId?.name || 'No Account') : (opp.accountId || 'No Account')}
                    </div>
                    
                    {opp.services && opp.services.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                        {opp.services.slice(0, 3).map((service, i) => (
                          <span key={i} style={{ 
                            fontSize: '0.65rem', background: '#f1f5f9', color: '#475569', 
                            padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0',
                            whiteSpace: 'nowrap', textTransform: 'capitalize'
                          }}>
                            {service}
                          </span>
                        ))}
                        {opp.services.length > 3 && (
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>+{opp.services.length - 3}</span>
                        )}
                      </div>
                    )}

                    {opp.crateSize && (
                      <div style={{ 
                        fontSize: '0.7rem', color: '#64748b', marginBottom: '12px', 
                        display: 'flex', alignItems: 'center', gap: '4px',
                        background: '#f8fafc', padding: '4px 8px', borderRadius: '6px',
                        border: '1px solid #e2e8f0', width: 'fit-content'
                      }}>
                        <span>📦</span>
                        <strong style={{ color: '#475569' }}>Crate Size:</strong>
                        <span>{opp.crateSize}</span>
                      </div>
                    )}

                    {/* CR-008 Source badge on deal card */}
                    {opp.source && (
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          background: opp.source === 'IndiaMart Lead' ? '#ffedd5' 
                                      : opp.source === 'Referral' ? '#dcfce7' 
                                      : opp.source === 'Direct Sales Visit' ? '#f3e8ff'
                                      : opp.source === 'Email Campaign' ? '#fce7f3'
                                      : opp.source === 'Web / Own Generated Lead' ? '#e0f2fe'
                                      : '#f1f5f9', 
                          color: opp.source === 'IndiaMart Lead' ? '#c2410c' 
                                 : opp.source === 'Referral' ? '#15803d' 
                                 : opp.source === 'Direct Sales Visit' ? '#6b21a8'
                                 : opp.source === 'Email Campaign' ? '#be185d'
                                 : opp.source === 'Web / Own Generated Lead' ? '#0369a1'
                                 : '#475569',
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          fontWeight: 700,
                          border: '1px solid',
                          borderColor: opp.source === 'IndiaMart Lead' ? '#fed7aa' 
                                       : opp.source === 'Referral' ? '#bbf7d0' 
                                       : opp.source === 'Direct Sales Visit' ? '#e9d5ff'
                                       : opp.source === 'Email Campaign' ? '#fbcfe8'
                                       : opp.source === 'Web / Own Generated Lead' ? '#bae6fd'
                                       : '#e2e8f0',
                        }}>
                          {opp.source}
                        </span>
                      </div>
                    )}

                    {/* CR-009 Carry Forward labeled badge on deal card */}
                    {opp.carry_forward && opp.origin_month && (
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          background: '#fef3c7', 
                          color: '#b45309', 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          fontWeight: 700,
                          border: '1px solid #fde68a',
                          display: 'inline-block'
                        }}>
                          🔄 Carried from: {opp.origin_month}
                        </span>
                      </div>
                    )}
                    
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
      )}
      {/* Lost Reason Modal */}
      {isLostModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            width: '100%',
            maxWidth: '500px',
            borderRadius: '16px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            padding: '24px',
            border: '1px solid #e2e8f0',
            animation: 'modalSlideIn 0.3s ease-out'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem', color: '#1e293b', fontWeight: 700 }}>
              Mark Deal as Lost
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.875rem', color: '#64748b' }}>
              Please provide a reason for losing this opportunity. This data helps us improve our sales performance.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: 600, fontSize: '0.875rem' }}>
                Reason for Loss <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  color: '#1e293b',
                  background: '#ffffff'
                }}
              >
                <option value="">-- Select a Reason --</option>
                <option value="Price Lost">Price Lost — Lost due to competitor offering lower price</option>
                <option value="Product Lost">Product Lost — Product did not meet client specifications</option>
                <option value="No Reply / No Response">No Reply / No Response — Client became unresponsive</option>
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#475569', fontWeight: 600, fontSize: '0.875rem' }}>
                Additional Notes
              </label>
              <textarea
                value={lostNotes}
                onChange={(e) => setLostNotes(e.target.value)}
                placeholder="Enter any additional details or context here..."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  outline: 'none',
                  minHeight: '100px',
                  resize: 'vertical',
                  transition: 'border-color 0.2s',
                  color: '#1e293b'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setIsLostModalOpen(false);
                  setLostOpportunityId(null);
                  setLostFromStage(null);
                }}
                style={{
                  padding: '10px 18px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  transition: 'all 0.2s'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLost}
                disabled={!lostReason}
                style={{
                  padding: '10px 18px',
                  background: lostReason ? '#ef4444' : '#fca5a5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: lostReason ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  transition: 'all 0.2s'
                }}
              >
                Confirm Lost
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
