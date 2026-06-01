import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart2, Download, Table, TrendingUp, AlertTriangle, ChevronDown, ChevronRight, PieChart } from 'lucide-react';
import FilterBar from './components/FilterBar';

export default function CRMReportsDashboard() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(null);
  const [activeTab, setActiveTab] = useState('month'); // 'month' | 'week' | 'stage_analysis'

  // Stage Analysis Tab States
  const [analysisStage, setAnalysisStage] = useState('all');
  const [analysisData, setAnalysisData] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [expandedStages, setExpandedStages] = useState({}); // For 'all' stages expandable list

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

  const fetchReport = async (activeFilters = filters) => {
    if (!activeFilters) return;
    setLoading(true);
    try {
      const params = {};
      if (activeFilters.startDate && activeFilters.endDate) {
        params.startDate = activeFilters.startDate;
        params.endDate = activeFilters.endDate;
      } else if (activeFilters.month) {
        params.period = activeFilters.month;
      }

      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/reports/performance`,
        { params, withCredentials: true }
      );
      setReportData(res.data);
    } catch (err) {
      console.error('Error fetching performance reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalysisReport = async (activeFilters = filters) => {
    if (!activeFilters) return;
    setAnalysisLoading(true);
    try {
      const params = { stage: analysisStage };
      if (activeFilters.startDate && activeFilters.endDate) {
        params.startDate = activeFilters.startDate;
        params.endDate = activeFilters.endDate;
      } else if (activeFilters.month) {
        params.period = activeFilters.month;
      }

      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/reports/stage-analysis`,
        { params, withCredentials: true }
      );
      setAnalysisData(res.data);
    } catch (err) {
      console.error('Error fetching stage analysis reports:', err);
    } finally {
      setAnalysisLoading(false);
    }
  };

  useEffect(() => {
    if (filters) {
      fetchReport(filters);
    }
  }, [filters]);

  useEffect(() => {
    if (filters && activeTab === 'stage_analysis') {
      fetchAnalysisReport(filters);
    }
  }, [filters, activeTab, analysisStage]);

  const handleExportCSV = () => {
    if (!reportData) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    
    if (activeTab === 'month') {
      csvContent += "Stage Name,Deals Count,Total Value (INR),Weighted Value (INR)\n";
      reportData.performanceData.forEach(row => {
        csvContent += `${row.stage.toUpperCase()},${row.count},${row.value},${row.weightedValue}\n`;
      });
    } else {
      csvContent += "Week Name,Deals Count,Total Value (INR)\n";
      reportData.weekWise.forEach(row => {
        csvContent += `${row.name},${row.count},${row.value}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `crm_report_${activeTab}_wise_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAnalysis = () => {
    if (!analysisData || !analysisData.deals) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Deal Name,Company,Contact Person,Lead Source,Crate Size,Deal Value (INR),Probability (%),Weighted Value (INR),Stage Entry Date,Days in Stage,Assigned To,Status,Lost Reason\n";
    
    analysisData.deals.forEach(deal => {
      const contact = deal.primaryContactId ? `${deal.primaryContactId.firstName} ${deal.primaryContactId.lastName || ''}`.trim() : 'N/A';
      const assigned = deal.ownerId ? `${deal.ownerId.first_name || ''} ${deal.ownerId.last_name || ''}`.trim() || deal.ownerId.username : 'Unassigned';
      const entryDate = new Date(deal.stageEntryDate).toLocaleDateString('en-IN');
      const status = deal.carry_forward ? 'Carried Forward' : 'Active';
      const lostReason = deal.stage === 'lost' ? (deal.closeReason || 'N/A') : 'N/A';
      const companyName = typeof deal.accountId === 'object' ? (deal.accountId?.name || 'N/A') : (deal.accountId || 'N/A');
      
      const dName = `"${(deal.name || '').replace(/"/g, '""')}"`;
      const cName = `"${companyName.replace(/"/g, '""')}"`;
      const source = `"${(deal.source || 'N/A').replace(/"/g, '""')}"`;
      const crate = `"${(deal.crateSize || 'N/A').replace(/"/g, '""')}"`;
      
      csvContent += `${dName},${cName},"${contact}",${source},${crate},${deal.value || 0},${deal.probability || 0},${deal.weightedValue || 0},${entryDate},${deal.daysInStage || 0},"${assigned}",${status},"${lostReason}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `crm_stage_analysis_report_${analysisStage}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleStageExpand = (stageId) => {
    setExpandedStages(prev => ({
      ...prev,
      [stageId]: !prev[stageId]
    }));
  };

  const summary = reportData?.summary || { totalValue: 0, totalDeals: 0, weightedPipelineValue: 0 };
  const performanceData = reportData?.performanceData || [];
  const weekWise = reportData?.weekWise || [];

  const lostSummary = performanceData.find(p => p.stage === 'lost')?.lostBreakdown || { price: 0, product: 0, noReply: 0, total: 0 };

  const PIPELINE_STAGES = [
    { id: 'lead', name: 'Lead', color: '#4f8ef7' },
    { id: 'qualified', name: 'Qualified', color: '#7b8ef7' },
    { id: 'opportunity', name: 'Opportunity', color: '#a47af7' },
    { id: 'proposal', name: 'Proposal', color: '#c47af7' },
    { id: 'negotiation', name: 'Negotiation', color: '#f77ac4' },
    { id: 'won', name: 'Won', color: '#00d4aa' },
    { id: 'lost', name: 'Lost', color: '#f75a5a' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Filters */}
      <FilterBar moduleName="reports" onChange={handleFilterChange} />

      {loading || !reportData ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <div>
            <div style={{ fontSize: '18px', marginBottom: '12px' }}>⏳ Loading Sales Reports...</div>
            <div style={{ fontSize: '14px', color: '#94a3b8' }}>Aggregating deal statistics and trends</div>
          </div>
        </div>
      ) : (
        <>
          {/* Quick Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '5px solid #4f46e5' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Total Active Pipeline</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>₹{(summary.totalValue / 100000).toFixed(1)}L</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Across {summary.totalDeals} deals</div>
            </div>

            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '5px solid #10b981' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Weighted Revenue Forecast</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>₹{(summary.weightedPipelineValue / 100000).toFixed(1)}L</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Based on win probabilities</div>
            </div>

            <div style={{ background: '#ffffff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderLeft: '5px solid #ef4444' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Deals Lost This Period</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1e293b' }}>{lostSummary.total} Deals</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>Requires conversion reviews</div>
            </div>
          </div>

          {/* Main Panel */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {/* Header Tabs */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '4px', background: '#e2e8f0', padding: '4px', borderRadius: '10px' }}>
                <button
                  onClick={() => setActiveTab('month')}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    background: activeTab === 'month' ? '#ffffff' : 'transparent',
                    color: activeTab === 'month' ? '#1e293b' : '#64748b',
                    boxShadow: activeTab === 'month' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <BarChart2 size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} /> Stage-wise (Month)
                </button>
                <button
                  onClick={() => setActiveTab('week')}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    background: activeTab === 'week' ? '#ffffff' : 'transparent',
                    color: activeTab === 'week' ? '#1e293b' : '#64748b',
                    boxShadow: activeTab === 'week' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <TrendingUp size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} /> Week-wise Breakdown
                </button>
                <button
                  onClick={() => setActiveTab('stage_analysis')}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                    background: activeTab === 'stage_analysis' ? '#ffffff' : 'transparent',
                    color: activeTab === 'stage_analysis' ? '#1e293b' : '#64748b',
                    boxShadow: activeTab === 'stage_analysis' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  <Table size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} /> Stage Analysis (Granular)
                </button>
              </div>

              {activeTab === 'stage_analysis' ? (
                <button
                  onClick={handleExportAnalysis}
                  disabled={!analysisData || !analysisData.deals || analysisData.deals.length === 0}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px',
                    fontSize: '0.85rem', fontWeight: 600, color: '#475569', cursor: 'pointer', transition: 'all 0.2s', opacity: (!analysisData || !analysisData.deals || analysisData.deals.length === 0) ? 0.5 : 1
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#ffffff'; }}
                >
                  <Download size={16} /> Export Analysis CSV
                </button>
              ) : (
                <button
                  onClick={handleExportCSV}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px',
                    fontSize: '0.85rem', fontWeight: 600, color: '#475569', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#ffffff'; }}
                >
                  <Download size={16} /> Export CSV
                </button>
              )}
            </div>

            {/* Tab Content */}
            <div style={{ padding: '24px' }}>
              {activeTab === 'month' && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', flexWrap: 'wrap' }}>
                  {/* Metrics Table */}
                  <div>
                    <h4 style={{ margin: '0 0 16px', color: '#334155', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Table size={18} /> Stage Summary
                    </h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <th style={{ padding: '12px 8px' }}>Stage</th>
                            <th style={{ padding: '12px 8px', textAlign: 'center' }}>Count</th>
                            <th style={{ padding: '12px 8px', textAlign: 'right' }}>Total Value</th>
                            <th style={{ padding: '12px 8px', textAlign: 'right' }}>Weighted Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {performanceData.map(row => (
                            <tr key={row.stage} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>
                              <td style={{ padding: '14px 8px', fontWeight: 600, color: '#334155', textTransform: 'capitalize' }}>{row.stage}</td>
                              <td style={{ padding: '14px 8px', textAlign: 'center', color: '#475569', fontWeight: 700 }}>{row.count}</td>
                              <td style={{ padding: '14px 8px', textAlign: 'right', color: '#10b981', fontWeight: 700, fontFamily: 'monospace' }}>₹{row.value.toLocaleString('en-IN')}</td>
                              <td style={{ padding: '14px 8px', textAlign: 'right', color: '#4f46e5', fontWeight: 700, fontFamily: 'monospace' }}>₹{row.weightedValue.toLocaleString('en-IN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Chart & Lost Breakdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* CSS Bar Chart */}
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 16px', color: '#334155', fontWeight: 700 }}>Stage Counts Chart</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {performanceData.map(row => {
                          const maxVal = Math.max(...performanceData.map(p => p.count), 1);
                          const widthPercent = (row.count / maxVal) * 100;
                          return (
                            <div key={row.stage}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'capitalize' }}>
                                <span>{row.stage}</span>
                                <span>{row.count}</span>
                              </div>
                              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${widthPercent}%`, height: '100%', background: '#4f46e5', borderRadius: '4px', transition: 'width 0.5s ease-out' }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Lost Deals Breakdown */}
                    <div style={{ background: '#fef2f2', padding: '20px', borderRadius: '16px', border: '1px solid #fee2e2' }}>
                      <h4 style={{ margin: '0 0 12px', color: '#991b1b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={18} /> Lost Reasons breakdown
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7f1d1d' }}>
                          <span>Price Lost:</span>
                          <strong>{lostSummary.price} deals</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7f1d1d' }}>
                          <span>Product Lost:</span>
                          <strong>{lostSummary.product} deals</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7f1d1d' }}>
                          <span>No Response:</span>
                          <strong>{lostSummary.noReply} deals</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'week' && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 16px', color: '#334155', fontWeight: 700 }}>Weekly Performance Grid</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #f1f5f9', textAlign: 'left', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          <th style={{ padding: '12px 8px' }}>Week Period</th>
                          <th style={{ padding: '12px 8px', textAlign: 'center' }}>Total Deals</th>
                          <th style={{ padding: '12px 8px', textAlign: 'right' }}>Total Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weekWise.map(row => (
                          <tr key={row.name} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>
                            <td style={{ padding: '14px 8px', fontWeight: 600, color: '#334155' }}>{row.name}</td>
                            <td style={{ padding: '14px 8px', textAlign: 'center', color: '#475569', fontWeight: 700 }}>{row.count}</td>
                            <td style={{ padding: '14px 8px', textAlign: 'right', color: '#10b981', fontWeight: 700, fontFamily: 'monospace' }}>₹{row.value.toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 16px', color: '#334155', fontWeight: 700 }}>Weekly Value Breakdown</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {weekWise.map(row => {
                        const maxVal = Math.max(...weekWise.map(w => w.value), 1);
                        const heightPercent = (row.value / maxVal) * 100;
                        return (
                          <div key={row.name}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                              <span>{row.name}</span>
                              <span>₹{(row.value / 100000).toFixed(1)}L</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${heightPercent}%`, height: '100%', background: '#10b981', borderRadius: '4px' }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'stage_analysis' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Stage analysis sub header filter */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Select Stage for Analysis:</span>
                      <select
                        value={analysisStage}
                        onChange={e => setAnalysisStage(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        <option value="all">All Stages (Grouped / Expandable)</option>
                        {PIPELINE_STAGES.map(st => (
                          <option key={st.id} value={st.id}>{st.name}</option>
                        ))}
                      </select>
                    </div>

                    {analysisData && analysisStage !== 'all' && (
                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.85rem' }}>
                        <span style={{ color: '#64748b' }}>
                          Conversion Rate: <strong style={{ color: '#10b981' }}>{analysisData.summary?.conversionRate || 0}%</strong>
                        </span>
                        <span style={{ color: '#64748b' }}>
                          Avg Days in Stage: <strong style={{ color: '#4f46e5' }}>{analysisData.summary?.averageDaysInStage || 0} days</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {analysisLoading ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
                      ⏳ Loading Granular Stage Reports...
                    </div>
                  ) : !analysisData ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      No data loaded. Apply filters or change analysis stage selection.
                    </div>
                  ) : analysisStage === 'all' ? (
                    /* Collapsed Stage Summary Rows expandable to show list */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ overflowX: 'auto', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                          <thead>
                            <tr style={{ borderBottom: '2px solid #f1f5f9', background: '#f8fafc', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              <th style={{ padding: '12px 16px', width: '40px' }}></th>
                              <th style={{ padding: '12px 16px' }}>Stage</th>
                              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Deals Count</th>
                              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Value</th>
                              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Weighted Forecast</th>
                              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Avg Days in Stage</th>
                              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Pipeline Share</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analysisData.allStagesSummary?.map(stRow => {
                              const isExpanded = !!expandedStages[stRow.stage];
                              const stageColor = PIPELINE_STAGES.find(s => s.id === stRow.stage)?.color || '#64748b';
                              const matchingDeals = analysisData.deals?.filter(d => d.stage === stRow.stage) || [];
                              
                              return (
                                <React.Fragment key={stRow.stage}>
                                  <tr 
                                    onClick={() => toggleStageExpand(stRow.stage)}
                                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s', background: isExpanded ? '#f8fafc' : 'transparent' }}
                                    onMouseEnter={e => { if(!isExpanded) e.currentTarget.style.background = '#fafafa'; }}
                                    onMouseLeave={e => { if(!isExpanded) e.currentTarget.style.background = 'transparent'; }}
                                  >
                                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#94a3b8' }}>
                                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                    </td>
                                    <td style={{ padding: '14px 16px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'capitalize', color: '#1e293b' }}>
                                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: stageColor }}></span>
                                      {stRow.stage}
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>
                                      {stRow.count} {stRow.count === 1 ? 'deal' : 'deals'}
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                                      ₹{stRow.value ? (stRow.value / 100000).toFixed(2) + 'L' : '0.00L'}
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#4f46e5', fontFamily: 'monospace' }}>
                                      ₹{stRow.weightedValue ? (stRow.weightedValue / 100000).toFixed(2) + 'L' : '0.00L'}
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                                      {stRow.avgDaysInStage} days
                                    </td>
                                    <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#475569' }}>
                                      {stRow.percentage}%
                                    </td>
                                  </tr>

                                  {isExpanded && (
                                    <tr>
                                      <td colSpan="7" style={{ padding: '0 0 16px 0', background: '#f8fafc' }}>
                                        <div style={{ padding: '16px 24px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', margin: '0 24px 12px 48px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                                          <h5 style={{ margin: '0 0 12px 0', color: '#475569', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                                            Granular list: {stRow.stage.toUpperCase()}
                                          </h5>
                                          {matchingDeals.length === 0 ? (
                                            <div style={{ color: '#94a3b8', fontSize: '0.85rem', padding: '8px 0' }}>
                                              No deal records found under this stage for selected filters.
                                            </div>
                                          ) : (
                                            <div style={{ overflowX: 'auto' }}>
                                              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                                                <thead>
                                                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 700 }}>
                                                    <th style={{ padding: '8px' }}>Deal Name</th>
                                                    <th style={{ padding: '8px' }}>Company</th>
                                                    <th style={{ padding: '8px', textAlign: 'right' }}>Value</th>
                                                    <th style={{ padding: '8px', textAlign: 'center' }}>Prob (%)</th>
                                                    <th style={{ padding: '8px' }}>Source</th>
                                                    <th style={{ padding: '8px', textAlign: 'center' }}>Days In Stage</th>
                                                    <th style={{ padding: '8px' }}>Assigned salesperson</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {matchingDeals.map(d => {
                                                    const assignedName = d.ownerId ? `${d.ownerId.first_name || ''} ${d.ownerId.last_name || ''}`.trim() || d.ownerId.username : 'Unassigned';
                                                    const comp = typeof d.accountId === 'object' ? (d.accountId?.name || 'N/A') : (d.accountId || 'N/A');
                                                    
                                                    return (
                                                      <tr key={d._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                        <td style={{ padding: '10px 8px', fontWeight: 600, color: '#1e293b' }}>
                                                          {d.name} {d.carry_forward && '🔄'}
                                                        </td>
                                                        <td style={{ padding: '10px 8px', color: '#475569' }}>{comp}</td>
                                                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                                                          ₹{d.value ? d.value.toLocaleString('en-IN') : '0'}
                                                        </td>
                                                        <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: '#4f46e5' }}>{d.probability}%</td>
                                                        <td style={{ padding: '10px 8px', color: '#64748b' }}>{d.source || 'N/A'}</td>
                                                        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#eab308', fontWeight: 600 }}>{d.daysInStage} days</td>
                                                        <td style={{ padding: '10px 8px', color: '#475569' }}>{assignedName}</td>
                                                      </tr>
                                                    );
                                                  })}
                                                </tbody>
                                              </table>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    /* Single Stage Granular Reports Table View */
                    <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '24px', flexWrap: 'wrap' }}>
                      {/* Deal records list table */}
                      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', overflowX: 'auto' }}>
                        <h4 style={{ margin: '0 0 16px', color: '#334155', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Table size={18} /> Deal-Level Records list
                        </h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                          <thead>
                            <tr style={{ borderBottom: '2px solid #f1f5f9', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              <th style={{ padding: '12px 10px' }}>Deal Name</th>
                              <th style={{ padding: '12px 10px' }}>Company Name</th>
                              <th style={{ padding: '12px 10px' }}>Source</th>
                              <th style={{ padding: '12px 10px', textAlign: 'right' }}>Value</th>
                              <th style={{ padding: '12px 10px', textAlign: 'center' }}>Prob</th>
                              <th style={{ padding: '12px 10px', textAlign: 'right' }}>Weighted (₹)</th>
                              <th style={{ padding: '12px 10px', textAlign: 'center' }}>Days in Stage</th>
                              <th style={{ padding: '12px 10px' }}>Assigned salesperson</th>
                              {analysisStage === 'lost' && <th style={{ padding: '12px 10px' }}>Lost Reason</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {analysisData.deals?.length === 0 ? (
                              <tr>
                                <td colSpan={analysisStage === 'lost' ? 9 : 8} style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                                  No deal records found in this stage for selected filters.
                                </td>
                              </tr>
                            ) : (
                              analysisData.deals?.map(deal => {
                                const assigned = deal.ownerId ? `${deal.ownerId.first_name || ''} ${deal.ownerId.last_name || ''}`.trim() || deal.ownerId.username : 'Unassigned';
                                const compName = typeof deal.accountId === 'object' ? (deal.accountId?.name || 'N/A') : (deal.accountId || 'N/A');
                                return (
                                  <tr key={deal._id} style={{ borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                                    <td style={{ padding: '12px 10px', fontWeight: 600, color: '#1e293b' }}>
                                      {deal.name} {deal.carry_forward && '🔄'}
                                    </td>
                                    <td style={{ padding: '12px 10px', color: '#475569' }}>{compName}</td>
                                    <td style={{ padding: '12px 10px', color: '#64748b' }}>{deal.source || 'N/A'}</td>
                                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, color: '#10b981', fontFamily: 'monospace' }}>
                                      ₹{(deal.value || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700, color: '#4f46e5' }}>{deal.probability}%</td>
                                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, color: '#00d4aa', fontFamily: 'monospace' }}>
                                      ₹{(deal.weightedValue || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td style={{ padding: '12px 10px', textAlign: 'center', color: '#eab308', fontWeight: 600 }}>{deal.daysInStage} days</td>
                                    <td style={{ padding: '12px 10px', color: '#475569' }}>{assigned}</td>
                                    {analysisStage === 'lost' && (
                                      <td style={{ padding: '12px 10px', color: '#ef4444', fontWeight: 600 }}>
                                        {deal.closeReason || 'N/A'}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                          {/* CR-011 Aggregated Summary Row */}
                          {analysisData.deals?.length > 0 && (
                            <tfoot>
                              <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0', fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>
                                <td colSpan="3" style={{ padding: '14px 10px' }}>Total stage Aggregates:</td>
                                <td style={{ padding: '14px 10px', textAlign: 'right', color: '#10b981', fontFamily: 'monospace' }}>
                                  ₹{(analysisData.summary?.totalValue || 0).toLocaleString('en-IN')}
                                </td>
                                <td style={{ padding: '14px 10px' }}></td>
                                <td style={{ padding: '14px 10px', textAlign: 'right', color: '#00d4aa', fontFamily: 'monospace' }}>
                                  ₹{(analysisData.summary?.totalWeightedValue || 0).toLocaleString('en-IN')}
                                </td>
                                <td style={{ padding: '14px 10px', textAlign: 'center', color: '#eab308' }}>
                                  {analysisData.summary?.averageDaysInStage} days (avg)
                                </td>
                                <td colSpan={analysisStage === 'lost' ? 2 : 1} style={{ padding: '14px 10px', color: '#64748b' }}>
                                  Total: {analysisData.summary?.totalDeals} deals
                                </td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>

                      {/* Lead Source breakdown details widget */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                          <h4 style={{ margin: '0 0 16px', color: '#334155', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <PieChart size={18} /> Lead Source share
                          </h4>
                          {analysisData.sourceBreakdown?.length === 0 ? (
                            <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
                              No source tag records.
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                              {analysisData.sourceBreakdown?.map(srcRow => {
                                const maxPercent = Math.max(...analysisData.sourceBreakdown.map(s => s.percentage), 1);
                                const progressWidth = srcRow.percentage;
                                return (
                                  <div key={srcRow.source}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                      <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={srcRow.source}>
                                        {srcRow.source}
                                      </span>
                                      <span>{srcRow.count} deals | {srcRow.percentage}%</span>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                      <div style={{ 
                                        width: `${progressWidth}%`, 
                                        height: '100%', 
                                        background: srcRow.source === 'IndiaMart Lead' ? '#f97316' 
                                                    : srcRow.source === 'Referral' ? '#22c55e' 
                                                    : srcRow.source === 'Direct Sales Visit' ? '#a855f7'
                                                    : srcRow.source === 'Email Campaign' ? '#ec4899'
                                                    : srcRow.source === 'Web / Own Generated Lead' ? '#3b82f6'
                                                    : '#64748b', 
                                        borderRadius: '4px' 
                                      }}></div>
                                    </div>
                                    <div style={{ textAlign: 'right', fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px', fontWeight: 600 }}>
                                      ₹{(srcRow.value / 100000).toFixed(1)}L
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
