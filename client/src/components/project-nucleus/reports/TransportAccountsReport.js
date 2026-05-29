import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

const TransportAccountsReport = ({
    filterType,
    selectedMonth,
    selectedYear,
    selectedQuarter,
    dateRange,
    selectedDay
}) => {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'branch', 'ledger'

    // Local filter state for ledger
    const [ledgerSearch, setLedgerSearch] = useState('');
    const [ledgerTypeFilter, setLedgerTypeFilter] = useState('all'); // 'all', 'credit', 'debit'

    // Branch expand/collapse state
    const [expandedBranch, setExpandedBranch] = useState(null);

    // Map filters to API parameters
    const getReportParams = () => {
        let params = { filterType };
        if (filterType === 'day') {
            params.date = selectedDay;
        } else if (filterType === 'month') {
            const monthStr = String(Number(selectedMonth) + 1).padStart(2, '0');
            params.date = `${selectedYear}-${monthStr}-01`;
        } else if (filterType === 'quarter') {
            const firstMonthOfQuarter = String((Number(selectedQuarter) - 1) * 3 + 1).padStart(2, '0');
            params.date = `${selectedYear}-${firstMonthOfQuarter}-01`;
        } else if (filterType === 'year') {
            params.filterType = 'yearly';
            params.date = `${selectedYear}-01-01`;
        } else if (filterType === 'date-range') {
            params.filterType = 'custom';
            params.startDate = dateRange.start;
            params.endDate = dateRange.end;
        } else if (filterType === 'all') {
            params.filterType = 'yearly';
            params.date = `${new Date().getFullYear()}-01-01`;
        }
        return params;
    };

    useEffect(() => {
        const fetchReport = async () => {
            const params = getReportParams();
            // Do not query custom filter if dates are missing
            if (params.filterType === 'custom' && (!params.startDate || !params.endDate)) {
                return;
            }

            setLoading(true);
            setError(null);
            try {
                const res = await axios.get('https://eximbot.alvision.in/transport/api/daily-report', {
                    params,
                    headers: { 'x-api-key': '1234567890' },
                    withCredentials: true
                });
                if (res.data?.success) {
                    setReportData(res.data);
                } else {
                    setError('Failed to fetch daily report details');
                }
            } catch (err) {
                console.error("Error fetching daily report:", err);
                setError(err.message || 'Error occurred while loading report');
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [filterType, selectedMonth, selectedYear, selectedQuarter, dateRange, selectedDay]);

    // Helpers
    const formatCurrency = (val) => {
        if (val === undefined || val === null || isNaN(val)) return '₹0';
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val);
    };

    const formatBalanceTypeName = (name) => {
        const mapping = {
            totalCash: 'Cash',
            totalHpDiesel: 'HP Diesel',
            totalHappay: 'Happay',
            totalVisatPump: 'Visat Pump',
            totalUpi: 'UPI'
        };
        return mapping[name] || name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    };

    // Combine & process transactions
    const allTransactions = useMemo(() => {
        if (!reportData?.details) return [];
        const credits = (reportData.details.creditTransactions || []).map(t => ({ ...t, type: 'credit' }));
        const debits = (reportData.details.debitTransactions || []).map(t => ({ ...t, type: 'debit' }));
        
        return [...credits, ...debits].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [reportData]);

    const filteredTransactions = useMemo(() => {
        return allTransactions.filter(t => {
            const matchesSearch = 
                (t.description || '').toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                (t.remarks || '').toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                (t.branchName || '').toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                (t.branchCode || '').toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                (t.performedBy?.userName || '').toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                String(t.amount).includes(ledgerSearch);

            const matchesType = ledgerTypeFilter === 'all' || t.type === ledgerTypeFilter;

            return matchesSearch && matchesType;
        });
    }, [allTransactions, ledgerSearch, ledgerTypeFilter]);

    if (loading) {
        return (
            <div className="nucleus-loading-container">
                <div className="nucleus-loader"></div>
                <div style={{ marginTop: '1rem', color: '#6b7280' }}>Loading transport daily ledger...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="nucleus-stats-card" style={{ borderLeft: '4px solid #ef4444', background: 'rgba(239, 68, 68, 0.05)' }}>
                <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '15px' }}>Error Loading Report</div>
                <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '4px' }}>{error}</div>
            </div>
        );
    }

    const kpi = reportData?.kpi || { openingBalance: 0, creditAmount: 0, debitAmount: 0, closingBalance: 0 };
    const breakdownTypes = reportData?.breakdown?.byBalanceType || {};
    const branches = reportData?.breakdown?.byBranch || [];

    return (
        <div className="report-root-container">
            <style>{`
                .report-root-container {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                    font-family: 'Inter', sans-serif;
                    color: #1e293b;
                    padding-bottom: 40px;
                    animation: slideUp 0.3s ease-out;
                }

                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .report-header {
                    position: sticky;
                    top: 0;
                    background: rgba(255, 255, 255, 0.85);
                    backdrop-filter: blur(20px);
                    border-bottom: 1px solid rgba(226, 232, 240, 0.6);
                    padding: 14px 20px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    z-index: 99;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
                }

                .report-title-section h2 {
                    font-size: 18px;
                    font-weight: 800;
                    color: #0f172a;
                    margin: 0;
                    letter-spacing: -0.02em;
                }

                .report-title-section p {
                    font-size: 12px;
                    color: #64748b;
                    margin: 4px 0 0 0;
                }

                .nucleus-tab-container {
                    display: flex;
                    background: rgba(241, 245, 249, 0.8);
                    padding: 4px;
                    border-radius: 999px;
                    gap: 4px;
                    border: 1px solid rgba(226, 232, 240, 0.8);
                }

                .nucleus-tab-btn {
                    border: none;
                    background: transparent;
                    padding: 8px 18px;
                    font-size: 13px;
                    font-weight: 600;
                    color: #64748b;
                    border-radius: 999px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .nucleus-tab-btn:hover {
                    color: #0f172a;
                }

                .nucleus-tab-btn.active {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                }

                /* KPI Dashboard Cards */
                .kpi-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 16px;
                }

                .nucleus-stats-card {
                    background: rgba(255, 255, 255, 0.8);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    border-radius: 16px;
                    padding: 20px 24px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04), 0 1px 4px rgba(0, 0, 0, 0.02);
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                }

                .nucleus-stats-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
                }

                .nucleus-stats-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 4px;
                    height: 100%;
                    background: var(--card-accent, #667eea);
                }

                .nucleus-stats-card.opening::before { --card-accent: #3b82f6; }
                .nucleus-stats-card.credit::before { --card-accent: #10b981; }
                .nucleus-stats-card.debit::before { --card-accent: #ef4444; }
                .nucleus-stats-card.closing::before { --card-accent: #8b5cf6; }

                .stats-label {
                    font-size: 11.5px;
                    font-weight: 600;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .stats-value {
                    font-size: 24px;
                    font-weight: 800;
                    color: #0f172a;
                    margin-top: 10px;
                    font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
                    letter-spacing: -0.03em;
                }

                /* Balance Type Breakdown Grid */
                .balance-type-section-title {
                    font-size: 15px;
                    font-weight: 800;
                    color: #0f172a;
                    margin: 12px 0 4px 0;
                    letter-spacing: -0.01em;
                }

                .balance-type-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 16px;
                }

                .balance-card {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    border-radius: 12px;
                    padding: 16px 20px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
                    transition: all 0.2s ease;
                }

                .balance-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
                    background: rgba(255, 255, 255, 0.9);
                }

                .balance-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid rgba(226, 232, 240, 0.6);
                    padding-bottom: 8px;
                    margin-bottom: 12px;
                }

                .balance-card-title {
                    font-size: 13.5px;
                    font-weight: 700;
                    color: #0f172a;
                    text-transform: capitalize;
                }

                .balance-card-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 12.5px;
                    margin-bottom: 6px;
                }

                .balance-card-row:last-child {
                    margin-bottom: 0;
                    border-top: 1px dashed rgba(226, 232, 240, 0.8);
                    padding-top: 6px;
                    font-weight: 700;
                }

                .balance-label {
                    color: #64748b;
                }

                .balance-val {
                    font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
                    color: #1e293b;
                }

                .balance-val.closing-val {
                    color: #0f172a;
                    font-weight: 800;
                }

                .balance-val.credit-val {
                    color: #10b981;
                }

                .balance-val.debit-val {
                    color: #ef4444;
                }

                /* Tables */
                .nucleus-table-wrapper {
                    background: rgba(255, 255, 255, 0.8);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(226, 232, 240, 0.6);
                    border-radius: 16px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.02);
                    overflow: hidden;
                }

                .nucleus-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 13px;
                    text-align: left;
                }

                .nucleus-table th {
                    background: linear-gradient(180deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.9) 100%);
                    padding: 12px 18px;
                    font-weight: 700;
                    font-size: 11px;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    border-bottom: 1px solid rgba(226, 232, 240, 0.8);
                }

                .nucleus-table td {
                    padding: 12px 18px;
                    color: #1e293b;
                    border-bottom: 1px solid rgba(226, 232, 240, 0.6);
                }

                .nucleus-table tr.expanded-details-row td {
                    padding: 0;
                    background: rgba(248, 250, 252, 0.4);
                }

                .nucleus-table tr:hover:not(.expanded-details-row) {
                    background: rgba(248, 250, 252, 0.6);
                }

                /* Status Pills */
                .status-pill {
                    display: inline-flex;
                    align-items: center;
                    padding: 4px 10px;
                    border-radius: 999px;
                    text-transform: uppercase;
                    font-size: 10.5px;
                    font-weight: 600;
                    letter-spacing: 0.02em;
                    line-height: 1;
                }

                .status-pill.credit {
                    background: rgba(16, 185, 129, 0.1);
                    color: #10b981;
                }

                .status-pill.debit {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                }

                /* Custom UI Elements */
                .ledger-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 16px;
                    margin-bottom: 16px;
                    flex-wrap: wrap;
                }

                .search-input-wrapper {
                    position: relative;
                    flex: 1;
                    min-width: 250px;
                    max-width: 400px;
                }

                .ledger-search {
                    width: 100%;
                    padding: 8px 16px;
                    padding-left: 36px;
                    font-size: 13px;
                    border-radius: 99px;
                    border: 1px solid rgba(226, 232, 240, 0.8);
                    background: white;
                    outline: none;
                    transition: all 0.2s ease;
                }

                .ledger-search:focus {
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .search-icon-svg {
                    position: absolute;
                    left: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #94a3b8;
                    pointer-events: none;
                }

                .ledger-filter-select {
                    padding: 8px 16px;
                    border-radius: 99px;
                    border: 1px solid rgba(226, 232, 240, 0.8);
                    background: white;
                    font-size: 13px;
                    font-weight: 600;
                    color: #475569;
                    outline: none;
                    cursor: pointer;
                }

                .ledger-filter-select:focus {
                    border-color: #667eea;
                }

                .timestamp-val {
                    color: #64748b;
                    font-size: 12px;
                }

                .remarks-text {
                    max-width: 250px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    color: #64748b;
                    font-size: 12px;
                }

                .nested-expense-container {
                    padding: 16px 24px;
                    animation: slideDown 0.2s ease-out;
                }

                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .nested-expense-title {
                    font-size: 12px;
                    font-weight: 700;
                    color: #475569;
                    text-transform: uppercase;
                    margin-bottom: 10px;
                    letter-spacing: 0.05em;
                }

                .expense-badges-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                    gap: 12px;
                }

                .expense-badge-item {
                    background: white;
                    border: 1px solid rgba(226, 232, 240, 0.8);
                    border-radius: 8px;
                    padding: 8px 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .expense-badge-label {
                    font-size: 11px;
                    color: #64748b;
                    font-weight: 600;
                    text-transform: capitalize;
                }

                .expense-badge-val {
                    font-size: 13px;
                    font-weight: 700;
                    color: #0f172a;
                    font-family: 'SF Mono', monospace;
                }
            `}</style>

            {/* Custom Report Sub-Header & Pill Tabs */}
            <div className="report-header">
                <div className="report-title-section">
                    <h2>Transport Accounts Report</h2>
                    <p>Financial ledger overview for fleet, cash-flows, and branch operations</p>
                </div>
                <div className="nucleus-tab-container">
                    <button 
                        className={`nucleus-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        📊 Overview
                    </button>
                    <button 
                        className={`nucleus-tab-btn ${activeTab === 'branch' ? 'active' : ''}`}
                        onClick={() => setActiveTab('branch')}
                    >
                        🏢 Branches
                    </button>
                    <button 
                        className={`nucleus-tab-btn ${activeTab === 'ledger' ? 'active' : ''}`}
                        onClick={() => setActiveTab('ledger')}
                    >
                        📝 Ledger ({allTransactions.length})
                    </button>
                </div>
            </div>

            {/* Tab 1: Overview */}
            {activeTab === 'overview' && (
                <>
                    {/* Executive KPI Grid */}
                    <div className="kpi-grid">
                        <div className="nucleus-stats-card opening">
                            <div className="stats-label">Opening Balance</div>
                            <div className="stats-value" style={{ color: kpi.openingBalance < 0 ? '#ef4444' : '#3b82f6' }}>
                                {formatCurrency(kpi.openingBalance)}
                            </div>
                        </div>
                        <div className="nucleus-stats-card credit">
                            <div className="stats-label">Total Credit (+)</div>
                            <div className="stats-value" style={{ color: '#10b981' }}>
                                {formatCurrency(kpi.creditAmount)}
                            </div>
                        </div>
                        <div className="nucleus-stats-card debit">
                            <div className="stats-label">Total Debit (-)</div>
                            <div className="stats-value" style={{ color: '#ef4444' }}>
                                {formatCurrency(kpi.debitAmount)}
                            </div>
                        </div>
                        <div className="nucleus-stats-card closing">
                            <div className="stats-label">Closing Balance</div>
                            <div className="stats-value" style={{ color: kpi.closingBalance < 0 ? '#ef4444' : '#8b5cf6' }}>
                                {formatCurrency(kpi.closingBalance)}
                            </div>
                        </div>
                    </div>

                    {/* Balance Type Breakdowns */}
                    <div>
                        <div className="balance-type-section-title">Breakdown by Balance Asset Type</div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '14px' }}>Asset allocation, deposits, and fluid cash states</div>
                        
                        <div className="balance-type-grid">
                            {Object.entries(breakdownTypes).map(([typeKey, values]) => (
                                <div key={typeKey} className="balance-card">
                                    <div className="balance-card-header">
                                        <div className="balance-card-title">{formatBalanceTypeName(typeKey)}</div>
                                        <span className={`status-pill ${values.closing >= 0 ? 'credit' : 'debit'}`} style={{ fontSize: '10px', padding: '2px 8px' }}>
                                            {values.closing >= 0 ? 'Healthy' : 'Overdrawn'}
                                        </span>
                                    </div>
                                    <div className="balance-card-row">
                                        <span className="balance-label">Opening</span>
                                        <span className="balance-val">{formatCurrency(values.opening)}</span>
                                    </div>
                                    <div className="balance-card-row">
                                        <span className="balance-label">Credit (+)</span>
                                        <span className="balance-val credit-val">+{formatCurrency(values.credit)}</span>
                                    </div>
                                    <div className="balance-card-row">
                                        <span className="balance-label">Debit (-)</span>
                                        <span className="balance-val debit-val">-{formatCurrency(values.debit)}</span>
                                    </div>
                                    <div className="balance-card-row">
                                        <span className="balance-label">Closing</span>
                                        <span className="balance-val closing-val">{formatCurrency(values.closing)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Tab 2: Branch Wise Breakdown */}
            {activeTab === 'branch' && (
                <div className="nucleus-table-wrapper">
                    <table className="nucleus-table">
                        <thead>
                            <tr>
                                <th style={{ width: '40px' }}></th>
                                <th>Branch Name</th>
                                <th>Branch Code</th>
                                <th style={{ textAlign: 'right' }}>Opening</th>
                                <th style={{ textAlign: 'right' }}>Credit (+)</th>
                                <th style={{ textAlign: 'right' }}>Debit (-)</th>
                                <th style={{ textAlign: 'right' }}>Closing</th>
                            </tr>
                        </thead>
                        <tbody>
                            {branches.length > 0 ? (
                                branches.map((br) => {
                                    const isExpanded = expandedBranch === br.branch;
                                    return (
                                        <React.Fragment key={br.branch}>
                                            <tr 
                                                onClick={() => setExpandedBranch(isExpanded ? null : br.branch)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 'bold' }}>
                                                    {isExpanded ? '▾' : '▸'}
                                                </td>
                                                <td style={{ fontWeight: 700 }}>{br.branchName}</td>
                                                <td>
                                                    <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>
                                                        {br.branchCode}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>{formatCurrency(br.opening)}</td>
                                                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#10b981', fontWeight: 600 }}>{formatCurrency(br.credit)}</td>
                                                <td style={{ textAlign: 'right', fontFamily: 'monospace', color: '#ef4444', fontWeight: 600 }}>{formatCurrency(br.debit)}</td>
                                                <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: br.closing < 0 ? '#ef4444' : '#0f172a' }}>
                                                    {formatCurrency(br.closing)}
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="expanded-details-row">
                                                    <td colSpan="7">
                                                        <div className="nested-expense-container">
                                                            <div className="nested-expense-title">Detailed Expense Breakdown ({br.branchCode})</div>
                                                            <div className="expense-badges-grid">
                                                                {Object.entries(br.expenses || {}).map(([expKey, expVal]) => (
                                                                    <div key={expKey} className="expense-badge-item">
                                                                        <span className="expense-badge-label">
                                                                            {expKey === 'mr' ? 'Material Receipt (MR)' : expKey === 'hpDiesel' ? 'HP Diesel' : expKey === 'visatPump' ? 'Visat Pump' : expKey}
                                                                        </span>
                                                                        <span className="expense-badge-val" style={{ color: expVal > 0 ? '#ef4444' : '#64748b' }}>
                                                                            {formatCurrency(expVal)}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>
                                        No branch wise balance records available.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Tab 3: Ledger / Transaction List */}
            {activeTab === 'ledger' && (
                <>
                    <div className="ledger-header">
                        <div className="search-input-wrapper">
                            <svg className="search-icon-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                            <input 
                                type="text"
                                className="ledger-search"
                                placeholder="Search ledger by transaction details, remarks, performer..."
                                value={ledgerSearch}
                                onChange={(e) => setLedgerSearch(e.target.value)}
                            />
                        </div>
                        <select 
                            className="ledger-filter-select"
                            value={ledgerTypeFilter}
                            onChange={(e) => setLedgerTypeFilter(e.target.value)}
                        >
                            <option value="all">🔄 All Transactions</option>
                            <option value="credit">🟢 Credits Only</option>
                            <option value="debit">🔴 Debits Only</option>
                        </select>
                    </div>

                    <div className="nucleus-table-wrapper">
                        <table className="nucleus-table">
                            <thead>
                                <tr>
                                    <th>Timestamp</th>
                                    <th>Branch</th>
                                    <th>Performer</th>
                                    <th>Flow Type</th>
                                    <th style={{ textAlign: 'right' }}>Amount</th>
                                    <th>Balance Type</th>
                                    <th>Description</th>
                                    <th>Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.length > 0 ? (
                                    filteredTransactions.map((tx, idx) => (
                                        <tr key={tx.transactionId + '-' + idx}>
                                            <td className="timestamp-val">
                                                {new Date(tx.timestamp).toLocaleString('en-IN', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: true
                                                })}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{tx.branchCode || tx.branchName || '—'}</td>
                                            <td style={{ fontSize: '12px', color: '#475569' }}>
                                                {tx.performedBy?.userName || '—'}
                                            </td>
                                            <td>
                                                <span className={`status-pill ${tx.type === 'credit' ? 'credit' : 'debit'}`}>
                                                    {tx.type}
                                                </span>
                                            </td>
                                            <td style={{ 
                                                textAlign: 'right', 
                                                fontFamily: 'monospace', 
                                                fontWeight: 700, 
                                                color: tx.type === 'credit' ? '#10b981' : '#ef4444' 
                                            }}>
                                                {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                                            </td>
                                            <td style={{ fontSize: '12.5px', textTransform: 'capitalize' }}>
                                                {formatBalanceTypeName(tx.balanceType)}
                                            </td>
                                            <td style={{ fontSize: '12.5px' }} title={tx.description}>{tx.description || '—'}</td>
                                            <td>
                                                <div className="remarks-text" title={tx.remarks}>
                                                    {tx.remarks || '—'}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>
                                            No matching transactions found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
};

export default TransportAccountsReport;
