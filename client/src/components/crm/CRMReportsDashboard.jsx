import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart2, Download, Table, TrendingUp, AlertTriangle } from 'lucide-react';
import FilterBar from './components/FilterBar';

export default function CRMReportsDashboard() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(null);
  const [activeTab, setActiveTab] = useState('month'); // 'month' | 'week'

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

  useEffect(() => {
    if (filters) {
      fetchReport(filters);
    }
  }, [filters]);

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

  const summary = reportData?.summary || { totalValue: 0, totalDeals: 0, weightedPipelineValue: 0 };
  const performanceData = reportData?.performanceData || [];
  const weekWise = reportData?.weekWise || [];

  // Calculate lost reason totals
  const lostSummary = performanceData.find(p => p.stage === 'lost')?.lostBreakdown || { price: 0, product: 0, noReply: 0, total: 0 };

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
          </div>

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
        </div>

        {/* Tab Content */}
        <div style={{ padding: '24px' }}>
          {activeTab === 'month' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px', flexWrap: 'wrap' }}>
              {/* Metrics Table */}
              <div>
                <h4 style={{ margin: '0 0 16px', color: '#334155', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Table size={18} /> Stage Analysis
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
          ) : (
            <div>
              {/* Week-wise Metrics */}
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
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
