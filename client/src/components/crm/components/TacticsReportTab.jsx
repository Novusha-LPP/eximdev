import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  BarChart2,
  Download,
  Filter,
  Layers,
  Users,
  Building2,
  Grid,
  Star,
  Award,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  Percent
} from 'lucide-react';
import { Spin, Tooltip, Tag, message } from 'antd';

const VIEWS = [
  { key: 'by_tactic', label: 'By Tactic', icon: Layers },
  { key: 'by_line', label: 'By Business Line', icon: Building2 },
  { key: 'by_salesperson', label: 'By Salesperson', icon: Users },
  { key: 'matrix', label: 'Tactic × Line Matrix', icon: Grid }
];

const FAMILIAR_LINES = [
  { key: 'all', label: 'All Business Lines' },
  { key: 'freight forwarding', label: 'Freight Forwarding' },
  { key: 'customs clearance', label: 'Novusha / Customs Clearance' },
  { key: 'dgft', label: 'DGFT' },
  { key: 'e-lock', label: 'E-Lock' },
  { key: 'paramount', label: 'Paramount' },
  { key: 'autorack', label: 'Autorack' },
  { key: 'transportation', label: 'Transportation' },
  { key: 'export', label: 'Export' },
  { key: 'import', label: 'Import' },
  { key: 'client', label: 'AIVision / Software' },
  { key: 'rabs', label: 'RABS' }
];

export default function TacticsReportTab() {
  const [activeView, setActiveView] = useState('by_tactic');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [matrixLines, setMatrixLines] = useState([]);

  // Filter states
  const [tacticsList, setTacticsList] = useState([]);
  const [salespeopleList, setSalespeopleList] = useState([]);
  const [selectedTactic, setSelectedTactic] = useState('all');
  const [selectedLine, setSelectedLine] = useState('all');
  const [selectedSalesperson, setSelectedSalesperson] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('');

  // Sorting
  const [sortField, setSortField] = useState('dealsTagged');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [activeView, selectedTactic, selectedLine, selectedSalesperson, selectedMonth]);

  const loadFilterOptions = async () => {
    try {
      const [tacticsRes, usersRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_STRING}/crm/tactics`, { withCredentials: true }),
        axios.get(`${process.env.REACT_APP_API_STRING}/crm/users`, { withCredentials: true }).catch(() => ({ data: [] }))
      ]);

      if (tacticsRes.data?.data) {
        setTacticsList(tacticsRes.data.data);
      }
      const rawUsers = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.users || []);
      setSalespeopleList(rawUsers);
    } catch (err) {
      console.error('Error loading tactic report filter options:', err);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = {
        view: activeView
      };

      if (selectedTactic && selectedTactic !== 'all') {
        params.tactic_code = selectedTactic;
      }
      if (selectedLine && selectedLine !== 'all') {
        params.business_line = selectedLine;
      }
      if (selectedSalesperson && selectedSalesperson !== 'all') {
        params.salesperson_id = selectedSalesperson;
      }
      if (selectedMonth) {
        params.month = selectedMonth;
      }

      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/tactics/report`,
        { params, withCredentials: true }
      );

      if (res.data?.success) {
        setReportData(res.data.data || []);
        setSummary(res.data.summary || null);
        if (res.data.lines) {
          setMatrixLines(res.data.lines);
        }
      }
    } catch (err) {
      console.error('Error fetching tactic report:', err);
    } finally {
      setLoading(false);
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const params = {
        view: activeView,
        format: 'csv'
      };

      if (selectedTactic && selectedTactic !== 'all') params.tactic_code = selectedTactic;
      if (selectedLine && selectedLine !== 'all') params.business_line = selectedLine;
      if (selectedSalesperson && selectedSalesperson !== 'all') params.salesperson_id = selectedSalesperson;
      if (selectedMonth) params.month = selectedMonth;

      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/tactics/report`,
        {
          params,
          responseType: 'blob',
          withCredentials: true
        }
      );

      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const dateStr = new Date().toISOString().substring(0, 10);
      link.setAttribute('download', `tactics_${activeView}_report_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      message.success('Tactics report CSV downloaded successfully');
    } catch (err) {
      console.error('Failed to export tactics CSV:', err);
      message.error('Failed to export tactics report CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!Array.isArray(reportData)) return [];
    if (activeView === 'matrix') return reportData;

    return [...reportData].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }

      valA = valA || 0;
      valB = valB || 0;
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  }, [reportData, sortField, sortOrder, activeView]);

  const getStageColor = (stage) => {
    switch ((stage || '').toLowerCase()) {
      case 'discovery': return { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' };
      case 'solution & proposal': return { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' };
      case 'negotiation & closing': return { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' };
      case 'expansion & strategic': return { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' };
      default: return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
    }
  };

  const getWinRateColor = (winRate, dealsTagged) => {
    if (dealsTagged === 0) return { bg: '#f8fafc', text: '#94a3b8' };
    if (winRate >= 60) return { bg: '#dcfce7', text: '#15803d' };
    if (winRate >= 40) return { bg: '#fef3c7', text: '#b45309' };
    return { bg: '#fee2e2', text: '#b91c1c' };
  };

  return (
    <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      {/* Header & View Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              🎯 Sales Tactics Playbook Analytics
            </span>
            <Tag color="purple" style={{ fontWeight: 700, borderRadius: '10px' }}>Playbook T01–T30</Tag>
          </div>
          <p style={{ margin: 0, fontSize: '0.825rem', color: '#64748b' }}>
            Performance attribution across Suraj Group business lines, win rates, and salesperson execution
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* View Switcher Pills */}
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
            {VIEWS.map(v => {
              const Icon = v.icon;
              const isSelected = activeView === v.key;
              return (
                <button
                  key={v.key}
                  onClick={() => setActiveView(v.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: isSelected ? '#ffffff' : 'transparent',
                    color: isSelected ? '#4338ca' : '#64748b',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <Icon size={14} />
                  {v.label}
                </button>
              );
            })}
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: '8px',
              color: isExporting ? '#94a3b8' : '#334155',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              opacity: isExporting ? 0.7 : 1,
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { if (!isExporting) { e.currentTarget.style.borderColor = '#4f46e5'; e.currentTarget.style.color = '#4f46e5'; } }}
            onMouseOut={(e) => { if (!isExporting) { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#334155'; } }}
          >
            {isExporting ? <Spin size="small" /> : <Download size={14} />}
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        background: '#f8fafc',
        padding: '14px 16px',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px'
      }}>
        {/* Tactic Filter */}
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
            Tactic
          </label>
          <select
            value={selectedTactic}
            onChange={(e) => setSelectedTactic(e.target.value)}
            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', background: '#fff' }}
          >
            <option value="all">All 30 Tactics</option>
            {tacticsList.map(t => (
              <option key={t.code} value={t.code}>
                {t.code} — {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Business Line Filter */}
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
            Business Line
          </label>
          <select
            value={selectedLine}
            onChange={(e) => setSelectedLine(e.target.value)}
            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', background: '#fff' }}
          >
            {FAMILIAR_LINES.map(l => (
              <option key={l.key} value={l.key}>{l.label}</option>
            ))}
          </select>
        </div>

        {/* Salesperson Filter */}
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
            Salesperson
          </label>
          <select
            value={selectedSalesperson}
            onChange={(e) => setSelectedSalesperson(e.target.value)}
            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', background: '#fff' }}
          >
            <option value="all">All Salespeople</option>
            {salespeopleList.map(u => (
              <option key={u._id} value={u._id}>
                {u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.username}
              </option>
            ))}
          </select>
        </div>

        {/* Month Filter */}
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
            Month
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{ width: '100%', padding: '5px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.825rem', background: '#fff' }}
          />
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Deals Tagged</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {summary.totalDealsTagged || 0}
            </div>
          </div>
          <div style={{ background: '#f0fdf4', padding: '12px 16px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Won Deals</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#166534', marginTop: '2px' }}>
              {summary.totalWon || 0}
            </div>
          </div>
          <div style={{ background: '#fef2f2', padding: '12px 16px', borderRadius: '8px', border: '1px solid #fecaca' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Lost Deals</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#991b1b', marginTop: '2px' }}>
              {summary.totalLost || 0}
            </div>
          </div>
          <div style={{ background: '#eff6ff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Overall Win Rate</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e40af', marginTop: '2px' }}>
              {summary.overallWinRate || 0}%
            </div>
          </div>
          <div style={{ background: '#faf5ff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#7e22ce', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tactics Utilized</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#6b21a8', marginTop: '2px' }}>
              {summary.tacticsUsedCount || 0} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#9333ea' }}>/ 30</span>
            </div>
          </div>
        </div>
      )}

      {/* Small Sample Size Warning Banner */}
      {summary && summary.totalDealsTagged > 0 && summary.totalDealsTagged < 5 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '8px',
          color: '#92400e',
          fontSize: '0.825rem',
          marginBottom: '20px'
        }}>
          <AlertTriangle size={16} color="#d97706" />
          <span>
            <strong>Small sample size alert:</strong> Fewer than 5 closed deals match the active filters. Win rates and outcome percentages may fluctuate until more volume accumulates.
          </span>
        </div>
      )}

      {/* Table / Content Area */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 0' }}>
          <Spin size="large" tip="Generating Playbook Analytics..." />
        </div>
      ) : sortedData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <Layers size={40} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <h4 style={{ margin: 0, color: '#64748b' }}>No tactic data found for selected filters</h4>
          <p style={{ margin: '6px 0 0', fontSize: '0.85rem' }}>
            New deals created in the CRM with playbook tactics will automatically appear here.
          </p>
        </div>
      ) : activeView === 'by_tactic' ? (
        /* 1. By Tactic View */
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', cursor: 'pointer' }} onClick={() => handleSort('code')}>Tactic {sortField === 'code' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={{ padding: '10px 12px', cursor: 'pointer' }} onClick={() => handleSort('stage')}>Stage {sortField === 'stage' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('dealsTagged')}>Deals Tagged {sortField === 'dealsTagged' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Won</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Lost</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Open</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('winRate')}>Win Rate {sortField === 'winRate' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('workedRate')}>Worked Rate {sortField === 'workedRate' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('avgDiscount')}>Avg Discount {sortField === 'avgDiscount' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}</th>
                <th style={{ padding: '10px 12px' }}>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map(row => {
                const stageStyle = getStageColor(row.stage);
                const winStyle = getWinRateColor(row.winRate, row.dealsTagged);
                const isSmallSample = (row.wonCount + row.lostCount) < 5;

                return (
                  <tr key={row.code} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, color: '#4338ca', fontFamily: 'monospace' }}>{row.code}</span>
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{row.name}</span>
                        {row.is_starred && (
                          <Tooltip title="Starred Playbook line fit for filtered service">
                            <Star size={13} fill="#eab308" color="#ca8a04" />
                          </Tooltip>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        background: stageStyle.bg,
                        color: stageStyle.text,
                        border: `1px solid ${stageStyle.border}`
                      }}>
                        {row.stage}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                      {row.dealsTagged || 0}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>
                      {row.wonCount || 0}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>
                      {row.lostCount || 0}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>
                      {row.openCount || 0}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: winStyle.bg,
                        color: winStyle.text
                      }}>
                        {row.winRate || 0}%
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#475569', fontWeight: 600 }}>
                      {row.workedRate !== undefined ? `${row.workedRate}%` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#475569' }}>
                      {row.avgDiscount ? `${row.avgDiscount}%` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {isSmallSample ? (
                        <Tooltip title="Sample size < 5 closed deals. Confidence will increase with deal volume.">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#d97706', fontWeight: 600 }}>
                            <AlertTriangle size={12} /> Low sample
                          </span>
                        </Tooltip>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>
                          <CheckCircle2 size={12} /> High confidence
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : activeView === 'by_line' ? (
        /* 2. By Business Line View */
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', cursor: 'pointer' }} onClick={() => handleSort('label')}>Business Line</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('dealsTagged')}>Deals Tagged</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Won</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Lost</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('winRate')}>Win Rate</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Avg Won Deal Value</th>
                <th style={{ padding: '10px 12px' }}>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map(row => {
                const winStyle = getWinRateColor(row.winRate, row.dealsTagged);
                const isSmallSample = (row.wonCount + row.lostCount) < 5;

                return (
                  <tr key={row.familiar || row.code} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1e293b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building2 size={15} color="#6366f1" />
                        <span>{row.label}</span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>({row.code})</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                      {row.dealsTagged || 0}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>
                      {row.wonCount || 0}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>
                      {row.lostCount || 0}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: winStyle.bg,
                        color: winStyle.text
                      }}>
                        {row.winRate || 0}%
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', color: '#0f172a', fontWeight: 600 }}>
                      {row.avgDealValue ? `₹${Number(row.avgDealValue).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {isSmallSample ? (
                        <Tooltip title="Sample size < 5 closed deals. Confidence will increase with deal volume.">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#d97706', fontWeight: 600 }}>
                            <AlertTriangle size={12} /> Low sample
                          </span>
                        </Tooltip>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>
                          <CheckCircle2 size={12} /> High confidence
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : activeView === 'by_salesperson' ? (
        /* 3. By Salesperson View */
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', cursor: 'pointer' }} onClick={() => handleSort('name')}>Sales Representative</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('dealsTagged')}>Deals Tagged</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Won</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Lost</th>
                <th style={{ padding: '10px 12px', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('winRate')}>Win Rate</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Tactics Used</th>
                <th style={{ padding: '10px 12px' }}>Most Used Tactic</th>
                <th style={{ padding: '10px 12px' }}>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map(row => {
                const winStyle = getWinRateColor(row.winRate, row.dealsTagged);
                const isSmallSample = (row.wonCount + row.lostCount) < 5;

                return (
                  <tr key={row.userId || row.name} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#1e293b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={15} color="#0284c7" />
                        <span>{row.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                      {row.dealsTagged || 0}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>
                      {row.wonCount || 0}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>
                      {row.lostCount || 0}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: winStyle.bg,
                        color: winStyle.text
                      }}>
                        {row.winRate || 0}%
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>
                      {row.distinctTacticsUsed || 0} / 30
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {row.mostUsedTactic ? (
                        <Tag color="blue" style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          {row.mostUsedTactic}
                        </Tag>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {isSmallSample ? (
                        <Tooltip title="Sample size < 5 closed deals. Confidence will increase with deal volume.">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#d97706', fontWeight: 600 }}>
                            <AlertTriangle size={12} /> Low sample
                          </span>
                        </Tooltip>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>
                          <CheckCircle2 size={12} /> High confidence
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* 4. Matrix View (30 Tactics x 9 Lines) */
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{
                  padding: '10px 12px',
                  position: 'sticky',
                  left: 0,
                  background: '#f8fafc',
                  zIndex: 2,
                  minWidth: '220px',
                  boxShadow: '2px 0 5px rgba(0,0,0,0.04)'
                }}>
                  Tactic (T01–T30)
                </th>
                {matrixLines.map(line => (
                  <th key={line.code} style={{ padding: '10px 8px', textAlign: 'center', minWidth: '105px' }}>
                    <div>{line.label}</div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 500 }}>({line.code})</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.map(row => (
                <tr key={row.code} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{
                    padding: '8px 12px',
                    position: 'sticky',
                    left: 0,
                    background: '#ffffff',
                    zIndex: 1,
                    boxShadow: '2px 0 5px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 800, color: '#4338ca', fontFamily: 'monospace' }}>{row.code}</span>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{row.name}</span>
                    </div>
                  </td>
                  {matrixLines.map(line => {
                    const cell = row.lines?.[line.familiar] || { dealsTagged: 0, winRate: 0, isStarred: false };
                    const winStyle = getWinRateColor(cell.winRate, cell.dealsTagged);

                    return (
                      <td key={line.code} style={{ padding: '6px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{
                          padding: '4px',
                          borderRadius: '6px',
                          background: cell.dealsTagged > 0 ? winStyle.bg : 'transparent',
                          color: cell.dealsTagged > 0 ? winStyle.text : '#cbd5e1',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                            {cell.isStarred && (
                              <Tooltip title="Starred Playbook line fit">
                                <Star size={11} fill="#eab308" color="#ca8a04" />
                              </Tooltip>
                            )}
                            <span style={{ fontWeight: cell.dealsTagged > 0 ? 800 : 500, fontSize: '0.75rem' }}>
                              {cell.dealsTagged > 0 ? `${cell.winRate}%` : '—'}
                            </span>
                          </div>
                          {cell.dealsTagged > 0 && (
                            <div style={{ fontSize: '0.65rem', opacity: 0.85 }}>
                              {cell.dealsTagged} deal{cell.dealsTagged > 1 ? 's' : ''}
                              {cell.isSmallSample && (
                                <Tooltip title="<5 deals: small sample">
                                  <span style={{ color: '#d97706', marginLeft: '2px' }}>*</span>
                                </Tooltip>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
