import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BranchContext } from '../../../contexts/BranchContext';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';
import { exportImportPendingProductivityExcel } from './nucleusExcelExporter';

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');

.fleet-root {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    display: flex; flex-direction: column; gap: 24px; padding: 0; background: transparent;
    color: #1e293b;
}

/* Glass Tabs from Out of Charge */
.fleet-tabs { display: flex; gap: 10px; padding: 8px; background: rgba(255,255,255,0.5); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-radius: 20px; width: fit-content; box-shadow: 0 4px 24px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.6); }
.fleet-tab { padding: 12px 26px; border-radius: 14px; font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 14.5px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4,0,0.2,1); border: none; background: transparent; color: #64748b; display: flex; align-items: center; gap: 8px; }
.fleet-tab[data-active="true"] { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #fff; box-shadow: 0 8px 20px rgba(99,102,241,0.3); font-weight: 700; }
.fleet-tab[data-active="false"]:hover { background: rgba(99,102,241,0.08); color: #1e293b; transform: translateY(-1px); }

/* Glass Card with Glowing Orb */
.fleet-card {
    background: var(--fc-bg, rgba(255, 255, 255, 0.85));
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    border-radius: 28px 8px 28px 28px;
    border: var(--fc-border, 1px solid rgba(226, 232, 240, 0.8));
    box-shadow: 0 8px 20px -2px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.9);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
    position: relative;
}
.fleet-card::before {
    content: '';
    position: absolute;
    top: -24px;
    right: -24px;
    width: 110px;
    height: 110px;
    border-radius: 50%;
    background: var(--fc-accent, #cbd5e1);
    filter: blur(35px);
    opacity: 0.22;
    transition: all 0.4s ease;
    pointer-events: none;
    z-index: 0;
}
.fleet-card:hover {
    transform: translateY(-4px) scale(1.003);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 1);
    border-color: rgba(226, 232, 240, 1);
    z-index: 4;
}
.fleet-card:hover::before {
    transform: scale(1.3);
    opacity: 0.3;
}

/* Hero KPI Grid matching Out of Charge */
.fleet-hero-grid {
    display: grid;
    grid-template-columns: minmax(480px, 2fr) minmax(260px, 1.1fr) minmax(260px, 1.1fr);
    gap: 18px;
    margin-bottom: 24px;
    align-items: stretch;
}
@media (max-width: 1280px) {
    .fleet-hero-grid {
        grid-template-columns: 1fr 1fr;
    }
    .fleet-hero-grid > :first-child {
        grid-column: span 2;
    }
}
@media (max-width: 768px) {
    .fleet-hero-grid {
        grid-template-columns: 1fr;
    }
    .fleet-hero-grid > :first-child {
        grid-column: span 1;
    }
}

/* Header Glass Container */
.fleet-header-glass {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03);
    padding: 22px 28px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    position: relative;
    z-index: 50;
}

/* Table Wrapper */
.fleet-table-wrap {
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.6);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.03);
    overflow: hidden;
}
.fleet-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
}
.fleet-table th {
    background: linear-gradient(180deg, rgba(248, 250, 252, 0.97) 0%, rgba(241, 245, 249, 0.97) 100%);
    color: #0f172a;
    font-family: 'Outfit', sans-serif;
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 13px 14px;
    border-bottom: 1px solid rgba(226, 232, 240, 0.8);
    white-space: nowrap;
}
.fleet-table td {
    color: #1e293b;
    font-weight: 500;
    font-size: 13px;
    padding: 11px 14px;
    border-bottom: 1px solid rgba(226, 232, 240, 0.45);
    transition: background 0.15s;
    vertical-align: middle;
}
.fleet-table tr:hover td {
    background: rgba(79, 70, 229, 0.035);
}
.fleet-table tr:last-child td {
    border-bottom: none;
}
.fleet-table tr.highlight-row td {
    background: rgba(79, 70, 229, 0.06);
}
.fleet-table tr.total-row td {
    background: #f8fafc;
    font-weight: 800;
    border-top: 2px solid #0f172a;
    border-bottom: 2px solid #0f172a;
    font-family: 'Outfit', sans-serif;
}

/* Status Pills */
.status-pill-v2 {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 999px;
    font-weight: 600;
    font-size: 11px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    transition: all 0.2s;
    font-family: 'Outfit', sans-serif;
    white-space: nowrap;
}
.status-pill-v2[data-variant="neutral"] { background: rgba(148,163,184,0.15); color: #475569; border: 1px solid rgba(148,163,184,0.2); }
.status-pill-v2[data-variant="success"] { background: rgba(16,185,129,0.15); color: #059669; border: 1px solid rgba(16,185,129,0.2); box-shadow: 0 0 10px rgba(16,185,129,0.1); }
.status-pill-v2[data-variant="warning"] { background: rgba(245,158,11,0.15); color: #d97706; border: 1px solid rgba(245,158,11,0.2); box-shadow: 0 0 10px rgba(245,158,11,0.1); }
.status-pill-v2[data-variant="info"]    { background: rgba(14,165,233,0.15); color: #0284c7; border: 1px solid rgba(14,165,233,0.2); box-shadow: 0 0 10px rgba(14,165,233,0.1); }
.status-pill-v2[data-variant="error"]   { background: rgba(239,68,68,0.15); color: #dc2626; border: 1px solid rgba(239,68,68,0.2); box-shadow: 0 0 10px rgba(239,68,68,0.1); }

/* Buttons */
.fleet-export-btn {
    display: inline-flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 12px;
    font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 13px; cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4,0,0.2,1); border: 1px solid #10b981;
    background: rgba(16, 185, 129, 0.08); color: #059669; box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}
.fleet-export-btn:hover:not(:disabled) {
    background: #10b981; color: #fff; transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(16,185,129,0.25);
}
.fleet-export-btn:disabled { opacity: 0.65; cursor: not-allowed; }

.modern-refresh-btn {
    display: inline-flex; align-items: center; gap: 7px;
    background: rgba(79, 70, 229, 0.08); color: #4f46e5;
    border: 1px solid rgba(79, 70, 229, 0.2); padding: 10px 16px;
    border-radius: 12px; font-family: 'Outfit', sans-serif;
    font-weight: 600; font-size: 13px; cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.modern-refresh-btn:hover {
    background: #4f46e5; color: #ffffff; transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(79, 70, 229, 0.25);
}

.mono { font-family: 'Outfit', sans-serif; letter-spacing: -0.02em; }
.mini-custom-scroll::-webkit-scrollbar { width: 5px; height: 5px; }
.mini-custom-scroll::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.03); border-radius: 4px; }
.mini-custom-scroll::-webkit-scrollbar-thumb { background: rgba(79, 70, 229, 0.25); border-radius: 4px; }
.mini-custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(79, 70, 229, 0.5); }

/* KPI Info Tooltip Flyout */
.kpi-info-wrap { position: relative; display: inline-flex; align-items: center; justify-content: center; cursor: help; z-index: 101; }
.kpi-info-tip {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    transform: translateY(6px);
    background: #ffffff;
    border: 1px solid rgba(226,232,240,0.95);
    box-shadow: 0 20px 45px -5px rgba(15, 23, 42, 0.22), 0 8px 16px -4px rgba(15, 23, 42, 0.12);
    border-radius: 16px;
    padding: 16px 20px;
    opacity: 0;
    visibility: hidden;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 99999;
    width: 330px;
    pointer-events: none;
    text-align: left;
}
.kpi-info-wrap:hover .kpi-info-tip { opacity: 1; visibility: visible; transform: translateY(0); pointer-events: auto; }

/* Filter Chips */
.filter-chip {
    padding: 5px 12px;
    border-radius: 8px;
    font-size: 11.5px;
    font-weight: 700;
    cursor: pointer;
    font-family: 'Outfit', sans-serif;
    transition: all 0.2s;
    border: 1px solid #e2e8f0;
    background: #ffffff;
    color: #475569;
}
.filter-chip[data-active="true"] {
    background: #4f46e5;
    color: #ffffff;
    border-color: #4f46e5;
    box-shadow: 0 2px 8px rgba(79,70,229,0.25);
}

/* Modal */
.modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
}
.modal-content-wrap {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    border-radius: 28px;
    max-width: 900px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.8);
    font-family: 'Inter', sans-serif;
}
`;

const ImportPendingSummaryReport = ({
    filterType = 'month',
    selectedMonth = new Date().getMonth(),
    selectedYear = new Date().getFullYear(),
    selectedQuarter = Math.ceil((new Date().getMonth() + 1) / 3),
    dateRange = null,
    selectedFinancialYear = '26-27',
    selectedDay = new Date().toISOString().slice(0, 10),
    category = 'all',
    branchId = '',
    selectedBranch = 'all',
    selectedBranchGroup = 'all'
}) => {
    const navigate = useNavigate();

    // ─── Branch Context Integration (Use Existing Global Branch) ───
    const {
        branches = [],
        selectedBranchGroup: contextBranchGroup,
        selectedCategory: contextCategory,
        setSelectedBranchGroup
    } = useContext(BranchContext) || {};

    const initialBranch = (selectedBranchGroup !== undefined && selectedBranchGroup !== '') ? selectedBranchGroup : ((branchId && branchId !== '') ? branchId : (contextBranchGroup || 'all'));
    const [localBranch, setLocalBranch] = useState(initialBranch);

    useEffect(() => {
        if (selectedBranchGroup !== undefined && selectedBranchGroup !== '') {
            setLocalBranch(selectedBranchGroup);
        } else if (branchId !== undefined && branchId !== '') {
            setLocalBranch(branchId);
        } else if (selectedBranchGroup === 'all' || branchId === 'all') {
            setLocalBranch('all');
        } else if (contextBranchGroup) {
            setLocalBranch(contextBranchGroup);
        }
    }, [branchId, selectedBranchGroup, contextBranchGroup]);

    const effectiveBranchCode = localBranch && localBranch !== 'all' && localBranch !== 'ALL' ? localBranch : '';
    const effectiveCategory = category && category !== 'all' ? category : (contextCategory || 'all');

    // Branch Name / Label helper
    const activeBranchName = useMemo(() => {
        if (!effectiveBranchCode || effectiveBranchCode === 'all') {
            return 'All Branches (Overall)';
        }
        const found = branches.find(b => b._id === effectiveBranchCode || b.branch_code === effectiveBranchCode || b.branch_name === effectiveBranchCode);
        return found ? `${found.branch_name} (${found.branch_code})` : effectiveBranchCode;
    }, [effectiveBranchCode, branches]);

    // ─── Standard Centralized Date Derivation ─────────────────────
    const computedDate = useMemo(() => {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (filterType === 'day') {
            return selectedDay || todayStr;
        }
        if (filterType === 'week') {
            return selectedDay || todayStr;
        }
        if (filterType === 'date-range' && dateRange?.end) {
            return dateRange.end;
        }
        if (filterType === 'month' && selectedMonth !== undefined && selectedYear) {
            const m = parseInt(selectedMonth, 10);
            const y = parseInt(selectedYear, 10);
            const now = new Date();
            if (now.getFullYear() === y && now.getMonth() === m) {
                return todayStr;
            } else {
                const lastDay = new Date(y, m + 1, 0).getDate();
                return `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            }
        }
        if (filterType === 'quarter') {
            const q = parseInt(selectedQuarter, 10) || Math.ceil((new Date().getMonth() + 1) / 3);
            const y = parseInt(selectedYear, 10) || new Date().getFullYear();
            const endMonth = q * 3;
            const lastDay = new Date(y, endMonth, 0).getDate();
            const qEnd = `${y}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            return qEnd > todayStr ? todayStr : qEnd;
        }
        if (filterType === 'year') {
            const y = parseInt(selectedYear, 10) || new Date().getFullYear();
            const now = new Date();
            if (now.getFullYear() === y) return todayStr;
            return `${y}-12-31`;
        }
        if (filterType === 'fin-year') {
            return selectedDay || todayStr;
        }
        return selectedDay || todayStr;
    }, [filterType, selectedDay, selectedMonth, selectedYear, selectedQuarter, dateRange]);

    // Active selected day (user can click any row in the daily table to inspect that day)
    const [activeRowDate, setActiveRowDate] = useState(computedDate);

    useEffect(() => {
        setActiveRowDate(computedDate);
    }, [computedDate]);

    // ─── Tab & Target Benchmark States ────────────────────────────
    const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'month-projections' | 'trends'
    const [targetBenchmark, setTargetBenchmark] = useState(35); // Standard 35/day benchmark
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    // ─── Table Search & Filter States ────────────────────────────
    const [tableSearch, setTableSearch] = useState('');
    const [tableStatusFilter, setTableStatusFilter] = useState('all'); // 'all' | 'GREEN' | 'RED' | 'OFF'

    // ─── Data States ─────────────────────────────────────────────
    const [dashboardData, setDashboardData] = useState(null);
    const [monthProjectionsData, setMonthProjectionsData] = useState([]);
    const [errorMsg, setErrorMsg] = useState(null);

    // ─── Modal States ────────────────────────────────────────────
    const [showExceptionModal, setShowExceptionModal] = useState(false);
    const [exceptionForm, setExceptionForm] = useState({
        date: '2026-09-03',
        branch_code: 'ALL',
        exception_reason: 'Target achieved',
        justification: '',
        status: 'GREEN'
    });
    const [savingException, setSavingException] = useState(false);

    const [showDrilldownModal, setShowDrilldownModal] = useState(false);
    const [drilldownConfig, setDrilldownConfig] = useState({
        title: 'Affected Jobs',
        exceptionType: null,
        branch: null
    });
    const [drilldownJobs, setDrilldownJobs] = useState([]);
    const [loadingDrilldown, setLoadingDrilldown] = useState(false);

    // ─── Fetch Dashboard Data ────────────────────────────────────
    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const endpoint = `${process.env.REACT_APP_API_STRING}/project-nucleus/import-pending/productivity-dashboard`;
            const res = await axios.get(endpoint, {
                params: {
                    filterType,
                    month: selectedMonth,
                    year: selectedYear,
                    quarter: selectedQuarter,
                    startDate: dateRange?.start,
                    endDate: dateRange?.end,
                    day: selectedDay,
                    date: activeRowDate || computedDate,
                    branchId: effectiveBranchCode,
                    branchCode: effectiveBranchCode,
                    category: effectiveCategory,
                    selectedFinancialYear,
                    targetOverride: targetBenchmark
                },
                withCredentials: true
            });

            if (res.data) {
                setDashboardData(res.data);
                // Pre-fill exception form
                setExceptionForm({
                    date: res.data.date || activeRowDate || computedDate,
                    branch_code: effectiveBranchCode || 'ALL',
                    exception_reason: res.data.todaySummary?.exceptionReason || 'Target achieved',
                    justification: res.data.todaySummary?.justification || '',
                    status: res.data.kpis?.ragStatus || 'GREEN'
                });
            }
        } catch (err) {
            console.error('Error fetching productivity dashboard:', err);
            setErrorMsg('Failed to load productivity dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [filterType, selectedMonth, selectedYear, selectedQuarter, dateRange, selectedDay, activeRowDate, computedDate, effectiveBranchCode, effectiveCategory, selectedFinancialYear, targetBenchmark]);

    // ─── Fetch Monthly Projections ───────────────────────────────
    const fetchMonthProjections = useCallback(async () => {
        try {
            const endpoint = `${process.env.REACT_APP_API_STRING}/project-nucleus/import-pending/month-projections`;
            const res = await axios.get(endpoint, {
                params: {
                    date: activeRowDate || computedDate,
                    branchId: effectiveBranchCode,
                    branchCode: effectiveBranchCode,
                    category: effectiveCategory,
                    targetOverride: targetBenchmark
                },
                withCredentials: true
            });
            if (res.data && res.data.months) {
                setMonthProjectionsData(res.data.months);
            }
        } catch (err) {
            console.error('Error fetching month projections:', err);
        }
    }, [activeRowDate, computedDate, effectiveBranchCode, effectiveCategory, targetBenchmark]);

    useEffect(() => {
        fetchDashboardData();
        fetchMonthProjections();
    }, [fetchDashboardData, fetchMonthProjections]);

    // ─── Handle Exception Save ───────────────────────────────────
    const handleSaveException = async (e) => {
        e.preventDefault();
        setSavingException(true);
        try {
            const endpoint = `${process.env.REACT_APP_API_STRING}/project-nucleus/import-pending/exception-reason`;
            await axios.post(endpoint, exceptionForm, { withCredentials: true });
            setShowExceptionModal(false);
            await fetchDashboardData();
        } catch (err) {
            console.error('Error saving exception reason:', err);
            alert('Failed to save exception reason.');
        } finally {
            setSavingException(false);
        }
    };

    // ─── Handle Drilldown to Affected Jobs ───────────────────────
    const handleOpenDrilldown = async (title, exceptionType = null, branch = null) => {
        setDrilldownConfig({ title, exceptionType, branch: branch || effectiveBranchCode });
        setShowDrilldownModal(true);
        setLoadingDrilldown(true);
        try {
            const endpoint = `${process.env.REACT_APP_API_STRING}/project-nucleus/import-pending/affected-jobs`;
            const res = await axios.get(endpoint, {
                params: {
                    date: activeRowDate || computedDate,
                    exceptionType,
                    branch: branch || effectiveBranchCode,
                    branchId: branch || effectiveBranchCode,
                    category: effectiveCategory,
                    limit: 100
                },
                withCredentials: true
            });
            setDrilldownJobs(res.data?.jobs || []);
        } catch (err) {
            console.error('Error fetching affected jobs:', err);
            setDrilldownJobs([]);
        } finally {
            setLoadingDrilldown(false);
        }
    };

    // ─── Handle Excel Export ─────────────────────────────────────
    const handleExportExcel = async () => {
        if (!dashboardData) return;
        setExporting(true);
        try {
            await exportImportPendingProductivityExcel({
                dashboardData,
                monthData: monthProjectionsData,
                filterMeta: {
                    date: activeRowDate || computedDate,
                    filterType,
                    branch: activeBranchName,
                    category: effectiveCategory,
                    benchmarkTarget: targetBenchmark
                }
            });
        } catch (err) {
            console.error('Excel Export Error:', err);
            alert('Failed to export Excel report.');
        } finally {
            setExporting(false);
        }
    };

    const kpis = dashboardData?.kpis || {};
    const projection = dashboardData?.projection || {};
    const todaySummary = dashboardData?.todaySummary || {};
    const branchBreakdown = dashboardData?.branchBreakdown || [];
    const branchTotals = dashboardData?.branchTotals || {};
    const queryMonitoring = dashboardData?.queryMonitoring || {};
    const activeExceptions = dashboardData?.activeExceptions || [];
    const historyDays = dashboardData?.historyDays || [];

    const filteredHistoryDays = useMemo(() => {
        return historyDays.filter(row => {
            if (tableStatusFilter === 'GREEN' && row.ragStatus !== 'GREEN') return false;
            if (tableStatusFilter === 'RED' && row.ragStatus !== 'RED') return false;
            if (tableStatusFilter === 'OFF' && !row.isOffDay) return false;
            if (tableSearch.trim()) {
                const q = tableSearch.toLowerCase();
                const dateMatch = (row.date || '').toLowerCase().includes(q) || (row.rawDate || '').toLowerCase().includes(q);
                const reasonMatch = (row.exceptionReason || '').toLowerCase().includes(q) || (row.justification || '').toLowerCase().includes(q);
                const statusMatch = (row.ragStatus || '').toLowerCase().includes(q);
                if (!dateMatch && !reasonMatch && !statusMatch) return false;
            }
            return true;
        });
    }, [historyDays, tableStatusFilter, tableSearch]);

    const tableTotals = useMemo(() => {
        const res = {
            opening: historyDays[0]?.openingPending || 0,
            newJobs: 0,
            workload: 0,
            invoiced: 0,
            target: 0,
            dailyShortfallSum: 0,
            netShortfall: 0,
            closing: historyDays[historyDays.length - 1]?.closingPending || 0,
            queries: historyDays[historyDays.length - 1]?.queriesPending || 0
        };
        historyDays.forEach(r => {
            res.newJobs += (r.newJobs || 0);
            res.invoiced += (r.invoicedToday || 0);
            res.target += (r.benchmarkTarget || 0);
            res.dailyShortfallSum += (r.shortfall || 0);
        });
        res.workload = res.opening + res.newJobs;
        // Cumulative net shortfall for period = max(0, target - invoiced)
        res.netShortfall = Math.max(0, res.target - res.invoiced);
        return res;
    }, [historyDays]);

    const getRAGVariant = (status) => {
        if (status === 'GREEN') return 'success';
        if (status === 'YELLOW') return 'warning';
        return 'error';
    };

    // Filter label display
    const periodDisplayLabel = useMemo(() => {
        if (filterType === 'day') return `Day Wise (${selectedDay})`;
        if (filterType === 'week') return `Week Wise (${selectedDay})`;
        if (filterType === 'month') {
            const mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return `Month Wise (${mNames[selectedMonth] || ''} ${selectedYear})`;
        }
        if (filterType === 'quarter') return `Quarter ${selectedQuarter} (${selectedYear})`;
        if (filterType === 'fin-year') return `FY ${selectedFinancialYear}`;
        if (filterType === 'year') return `Year ${selectedYear}`;
        if (filterType === 'date-range' && dateRange?.start && dateRange?.end) {
            return `${dateRange.start} to ${dateRange.end}`;
        }
        return 'All Time';
    }, [filterType, selectedDay, selectedMonth, selectedYear, selectedQuarter, selectedFinancialYear, dateRange]);

    return (
        <div className="fleet-root">
            <style>{STYLES}</style>

            {/* ─── TOP GLASS HEADER: TITLE, APPLIED FILTERS & ACTIONS ────────── */}
            <div className="fleet-header-glass">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        boxShadow: '0 8px 16px rgba(79, 70, 229, 0.25)',
                        color: '#fff'
                    }}>
                        ⏱️
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <h2 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: '22px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                                Import Pending Job — Productivity & Backlog
                            </h2>
                            <span className="status-pill-v2" data-variant="info">
                                3-Month Rolling Benchmark
                            </span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>
                            Daily invoice productivity monitoring, pending jobs, branch reconciliation, query pipeline & projections.
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    {/* Active Context Indicators (Connected to shared central filters) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.9)', padding: '6px 14px', borderRadius: '14px', border: '1px solid rgba(226, 232, 240, 0.9)', flexWrap: 'wrap' }}>
                        <span className="status-pill-v2" data-variant="neutral" style={{ fontSize: '12px' }}>
                            📅 {periodDisplayLabel}
                        </span>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, color: '#334155', fontSize: '12.5px', fontFamily: "'Outfit', sans-serif" }}>Branch:</span>
                            <select
                                value={localBranch}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setLocalBranch(val);
                                    if (setSelectedBranchGroup) {
                                        setSelectedBranchGroup(val);
                                    }
                                }}
                                style={{
                                    fontSize: '12.5px',
                                    fontWeight: localBranch !== 'all' && localBranch !== 'ALL' ? 700 : 600,
                                    borderRadius: '999px',
                                    padding: '3px 24px 3px 10px',
                                    border: localBranch !== 'all' && localBranch !== 'ALL' ? '1px solid #4f46e5' : '1px solid #cbd5e1',
                                    background: localBranch !== 'all' && localBranch !== 'ALL' ? 'rgba(79, 70, 229, 0.08)' : '#ffffff',
                                    color: localBranch !== 'all' && localBranch !== 'ALL' ? '#4f46e5' : '#1e293b',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    fontFamily: "'Outfit', sans-serif"
                                }}
                            >
                                <option value="all">ALL BRANCHES</option>
                                <option value="AMD">Ahmedabad (AMD)</option>
                                <option value="GIM">Gandhidham (GIM)</option>
                                <option value="BRD">Baroda (BRD)</option>
                                <option value="HZR">Hazira (HZR)</option>
                                <option value="COK">Cochin (COK)</option>
                            </select>
                        </div>
                        {effectiveCategory && effectiveCategory !== 'all' && (
                            <span className="status-pill-v2" data-variant="neutral" style={{ fontSize: '12px' }}>
                                🚢 {effectiveCategory}
                            </span>
                        )}
                    </div>

                    {/* Benchmark Target Input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', padding: '7px 14px', borderRadius: '14px', border: '1px solid rgba(226, 232, 240, 0.9)' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', fontFamily: "'Outfit', sans-serif" }}>Target:</span>
                        <input
                            type="number"
                            value={targetBenchmark}
                            onChange={(e) => setTargetBenchmark(Number(e.target.value) || 35)}
                            style={{ width: '45px', border: 'none', fontWeight: 800, fontSize: '15px', color: '#0f172a', textAlign: 'center', outline: 'none', fontFamily: "'Outfit', sans-serif" }}
                            min={1}
                            max={500}
                        />
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>/day</span>
                    </div>

                    {/* Refresh Button */}
                    <button onClick={fetchDashboardData} className="modern-refresh-btn" title="Refresh Live Data">
                        <span>🔄</span> Refresh
                    </button>

                    {/* Excel Export Button */}
                    <button
                        onClick={handleExportExcel}
                        disabled={exporting}
                        className="fleet-export-btn"
                    >
                        <span>📥</span> {exporting ? 'Exporting...' : 'Excel Export'}
                    </button>

                    {/* KPI Info Tooltip Flyout */}
                    <div className="kpi-info-wrap">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(24px)', borderRadius: '50%', border: '1px solid rgba(226,232,240,0.8)', cursor: 'pointer', width: '38px', height: '38px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                        </div>
                        <div className="kpi-info-tip">
                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9', fontFamily: "'Outfit', sans-serif" }}>
                                💡 Productivity & Backlog Rules
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#64748b' }}>
                                <div><strong style={{ color: '#0f172a' }}>3-Month Benchmark:</strong> Total invoices in last 3 completed months ÷ actual working days (excludes Sundays & 2nd Saturdays).</div>
                                <div><strong style={{ color: '#0f172a' }}>Backlog Continuity:</strong> Opening(t) = Closing(t-1). Closing(t) = Opening + New - Invoiced.</div>
                                <div><strong style={{ color: '#059669' }}>● GREEN:</strong> Invoiced Today ≥ Standard Target ({targetBenchmark}/day).</div>
                                <div><strong style={{ color: '#d97706' }}>● YELLOW:</strong> Within 5 invoices of target ({targetBenchmark - 5}–{targetBenchmark - 1}).</div>
                                <div><strong style={{ color: '#dc2626' }}>● RED:</strong> Shortfall &gt; 5 invoices (&lt; {targetBenchmark - 5}).</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── GLASS TABS BAR (from Out of Charge Summary) ─────────────── */}
            <div className="fleet-tabs">
                <button
                    className="fleet-tab"
                    data-active={activeTab === 'daily'}
                    onClick={() => setActiveTab('daily')}
                >
                    <span>📋</span> Daily Monitoring & Reconciliation
                </button>
                <button
                    className="fleet-tab"
                    data-active={activeTab === 'month-projections'}
                    onClick={() => setActiveTab('month-projections')}
                >
                    <span>📅</span> Month-wise KPI Cards & Invoicing Projections
                </button>
                <button
                    className="fleet-tab"
                    data-active={activeTab === 'trends'}
                    onClick={() => setActiveTab('trends')}
                >
                    <span>📈</span> Workload & Backlog Trend Analytics
                </button>
            </div>

            {loading ? (
                <div className="fleet-card" style={{ padding: '80px 20px', textAlign: 'center' }}>
                    <div style={{ width: '48px', height: '48px', border: '3px solid rgba(79, 70, 229, 0.2)', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'fleet-spin 0.8s linear infinite', margin: '0 auto' }}></div>
                    <div style={{ marginTop: '16px', color: '#64748b', fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>Loading productivity and backlog metrics...</div>
                </div>
            ) : errorMsg ? (
                <div className="fleet-card" style={{ padding: '24px', background: '#fef2f2', borderColor: '#fca5a5', color: '#b91c1c' }}>
                    {errorMsg}
                </div>
            ) : (
                <>
                    {/* ─── HERO KPI GRID (Clean 3-Block Layout from Out of Charge Summary) ─── */}
                    <div className="fleet-hero-grid">
                        
                        {/* Block 1 (Featured Card, Left - 2fr): Operational Pacing & Branch Breakdown */}
                        <div
                            className="fleet-card"
                            style={{
                                padding: '24px 28px',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                                gap: '24px',
                                minHeight: '260px',
                                '--fc-accent': kpis.ragStatus === 'GREEN' ? '#10b981' : (kpis.ragStatus === 'YELLOW' ? '#f59e0b' : '#ef4444')
                            }}
                        >
                            {/* Left Half: Today's Invoicing Pace vs Daily Target */}
                            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px', zIndex: 1 }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                        <div>
                                            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                                                Today's Invoicing Pacing
                                            </div>
                                            <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px', fontWeight: 600 }}>
                                                Target Benchmark: <strong style={{ color: '#0f172a' }}>{kpis.dailyTarget || targetBenchmark}/day</strong>
                                            </div>
                                        </div>
                                        <span className="status-pill-v2" data-variant={getRAGVariant(kpis.ragStatus)}>
                                            ● {kpis.ragStatus}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '10px' }}>
                                        <span className="mono" style={{ fontSize: '42px', fontWeight: 900, color: kpis.ragStatus === 'GREEN' ? '#059669' : (kpis.ragStatus === 'YELLOW' ? '#d97706' : '#dc2626'), lineHeight: 1 }}>
                                            {kpis.todayInvoiced || 0}
                                        </span>
                                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Invoiced Today</span>
                                        {kpis.todayInvoiced >= (kpis.dailyTarget || targetBenchmark) ? (
                                            <span style={{ marginLeft: 'auto', fontSize: '11.5px', fontWeight: 700, color: '#059669', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                                                +{kpis.todayInvoiced - (kpis.dailyTarget || targetBenchmark)} vs target
                                            </span>
                                        ) : (
                                            <span style={{ marginLeft: 'auto', fontSize: '11.5px', fontWeight: 700, color: '#dc2626', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '6px' }}>
                                                Shortfall: {kpis.shortfall}
                                            </span>
                                        )}
                                    </div>

                                    {/* Progress Bar */}
                                    <div style={{ marginTop: '14px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#64748b', marginBottom: '5px' }}>
                                            <span>Target Completion</span>
                                            <span>{Math.min(100, Math.round(((kpis.todayInvoiced || 0) / (kpis.dailyTarget || targetBenchmark || 35)) * 100))}%</span>
                                        </div>
                                        <div style={{ height: '6px', background: 'rgba(226, 232, 240, 0.8)', borderRadius: '999px', overflow: 'hidden' }}>
                                            <div
                                                style={{
                                                    width: `${Math.min(100, Math.max(2, Math.round(((kpis.todayInvoiced || 0) / (kpis.dailyTarget || targetBenchmark || 35)) * 100)))}%`,
                                                    height: '100%',
                                                    background: kpis.ragStatus === 'GREEN' ? 'linear-gradient(90deg, #10b981, #059669)' : (kpis.ragStatus === 'YELLOW' ? '#f59e0b' : '#ef4444'),
                                                    borderRadius: '999px',
                                                    transition: 'width 0.4s ease'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Micro Stats Bar */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', borderTop: '1px solid rgba(226, 232, 240, 0.7)', paddingTop: '10px' }}>
                                    <div onClick={() => handleOpenDrilldown('Open Jobs (Import Billing)', 'OPENING_PENDING', effectiveBranchCode)} style={{ cursor: 'pointer' }} title="Click to view Open Jobs in Import Billing">
                                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Opening</div>
                                        <div className="mono" style={{ fontSize: '16px', fontWeight: 800, color: '#2563eb' }}>{kpis.openingPending != null ? kpis.openingPending : (todaySummary.openingPending || 0)}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>New</div>
                                        <div className="mono" style={{ fontSize: '16px', fontWeight: 800, color: '#0284c7' }}>+{todaySummary.newJobsToday || 0}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Workload</div>
                                        <div className="mono" style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{kpis.totalWorkload || 0}</div>
                                    </div>
                                    <div onClick={() => handleOpenDrilldown('Closing Pending Jobs', null, effectiveBranchCode)} style={{ cursor: 'pointer' }} title="Click to view Closing Backlog">
                                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Closing</div>
                                        <div className="mono" style={{ fontSize: '16px', fontWeight: 800, color: '#b45309' }}>{kpis.closingPending || 0}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Half: Branch Pending Summary List */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '10px',
                                borderLeft: '1px solid rgba(226, 232, 240, 0.85)',
                                paddingLeft: '22px',
                                zIndex: 1
                            }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '12px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>
                                            🏢 Branch Reconciliation
                                        </span>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 7px', borderRadius: '6px' }}>
                                            ✓ {branchTotals.closingPending || 0} Closing
                                        </span>
                                    </div>

                                    <div className="mini-custom-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto', paddingRight: '4px' }}>
                                        {branchBreakdown.map(b => {
                                            const maxP = Math.max(...branchBreakdown.map(x => x.closingPending || 0), 1);
                                            const pct = Math.round(((b.closingPending || 0) / maxP) * 100);
                                            const isSelected = effectiveBranchCode && effectiveBranchCode.toUpperCase() === b.code.toUpperCase();
                                            return (
                                                <div
                                                    key={b.code}
                                                    onClick={() => {
                                                        const next = isSelected ? 'all' : b.code;
                                                        setLocalBranch(next);
                                                        if (setSelectedBranchGroup) setSelectedBranchGroup(next);
                                                    }}
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '3px',
                                                        padding: '5px 10px',
                                                        background: isSelected ? 'rgba(79, 70, 229, 0.1)' : 'rgba(241, 245, 249, 0.75)',
                                                        borderRadius: '8px',
                                                        border: isSelected ? '1px solid #4f46e5' : '1px solid rgba(226, 232, 240, 0.7)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    title="Click to filter by branch"
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontWeight: 700, color: isSelected ? '#4f46e5' : '#1e293b', fontSize: '12px', fontFamily: "'Outfit', sans-serif" }}>
                                                            {b.branch} <span style={{ color: '#94a3b8', fontSize: '10px' }}>({b.code})</span>
                                                        </span>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span className="mono" style={{ fontWeight: 800, color: '#0f172a', fontSize: '12px' }}>
                                                                {b.closingPending}
                                                            </span>
                                                            <span style={{ fontSize: '10.5px', color: '#64748b' }}>pending</span>
                                                        </div>
                                                    </div>
                                                    <div style={{ height: '3px', background: 'rgba(226, 232, 240, 0.8)', borderRadius: '999px' }}>
                                                        <div style={{ width: `${Math.max(b.closingPending > 0 ? 5 : 0, pct)}%`, height: '100%', background: isSelected ? '#4f46e5' : '#6366f1', borderRadius: '999px' }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(226, 232, 240, 0.7)', paddingTop: '6px' }}>
                                    <span>Opening: <strong>{branchTotals.openingPending}</strong></span>
                                    <span>•</span>
                                    <span>Invoiced: <strong style={{ color: '#059669' }}>{branchTotals.invoiced}</strong></span>
                                    <span>•</span>
                                    <span>Queries: <strong style={{ color: '#dc2626' }}>{branchTotals.queriesPending}</strong></span>
                                </div>
                            </div>
                        </div>

                        {/* Block 2 (Middle - 1.1fr): Quality & Queries Bottleneck Pipeline */}
                        <div
                            className="fleet-card"
                            style={{
                                padding: '24px 26px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                '--fc-accent': '#ef4444'
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                                            Query & Pipeline Bottlenecks
                                        </div>
                                        <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px', fontWeight: 600 }}>
                                            Unresolved queries blocking invoice
                                        </div>
                                    </div>
                                    <span className="status-pill-v2" data-variant={kpis.queriesPending > 0 ? 'error' : 'success'}>
                                        {kpis.queriesPending > 0 ? 'Action Required' : 'All Clear'}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
                                    <span className="mono" style={{ fontSize: '42px', fontWeight: 900, color: '#dc2626', lineHeight: 1 }}>
                                        {kpis.queriesPending || 0}
                                    </span>
                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Active Queries</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(241, 245, 249, 0.7)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px' }}>
                                        <span style={{ color: '#64748b', fontWeight: 600 }}>Accounts Queries</span>
                                        <span className="mono" style={{ fontWeight: 800, color: '#dc2626' }}>{queryMonitoring.closingQueries || kpis.queriesPending || 0}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(241, 245, 249, 0.7)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px' }}>
                                        <span style={{ color: '#64748b', fontWeight: 600 }}>Critical Ageing (&gt; 7d)</span>
                                        <span className="status-pill-v2" data-variant="warning" style={{ fontSize: '10px', padding: '1px 7px' }}>Monitored</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => handleOpenDrilldown('Jobs with Unresolved Queries', 'QUERY_PENDING', effectiveBranchCode)}
                                className="status-pill-v2"
                                data-variant="info"
                                style={{
                                    width: '100%',
                                    justifyContent: 'center',
                                    padding: '9px 14px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    marginTop: '16px'
                                }}
                            >
                                Inspect Unresolved Queries →
                            </button>
                        </div>

                        {/* Block 3 (Right - 1.1fr): Benchmark & Month-End Projection */}
                        <div
                            className="fleet-card"
                            style={{
                                padding: '24px 26px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                '--fc-accent': '#38bdf8'
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                                            3-Month Benchmark & Run-Rate
                                        </div>
                                        <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px', fontWeight: 600 }}>
                                            {projection.currentMonth || 'Current Month'} Month-End Pace
                                        </div>
                                    </div>
                                    <span className="status-pill-v2" data-variant={projection.status === 'SURPLUS' ? 'success' : 'error'}>
                                        {projection.status === 'SURPLUS' ? `+${projection.projectedVarianceVsTarget} Ahead` : `${projection.projectedVarianceVsTarget} Shortfall`}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '12px' }}>
                                    <span className="mono" style={{ fontSize: '42px', fontWeight: 900, color: '#0284c7', lineHeight: 1 }}>
                                        {projection.projectedMonthEndInvoices || 0}
                                    </span>
                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Projected Invoices</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(241, 245, 249, 0.7)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px' }}>
                                        <span style={{ color: '#64748b', fontWeight: 600 }}>3-Month Rolling Benchmark</span>
                                        <span className="mono" style={{ fontWeight: 800, color: '#4f46e5' }}>{kpis.threeMonthRollingAvg || targetBenchmark} / day</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(241, 245, 249, 0.7)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px' }}>
                                        <span style={{ color: '#64748b', fontWeight: 600 }}>Current Month Daily Avg</span>
                                        <span className="mono" style={{ fontWeight: 800, color: '#0284c7' }}>{kpis.currentMonthAvg || 0} / day</span>
                                    </div>
                                </div>
                            </div>

                            <div style={{ fontSize: '11px', color: '#64748b', borderTop: '1px solid rgba(226, 232, 240, 0.7)', paddingTop: '8px', marginTop: '14px', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Working Days Done: <strong>{projection.workingDaysCompleted || 0}</strong></span>
                                <span>Remaining: <strong>{projection.workingDaysRemaining || 0}d</strong></span>
                            </div>
                        </div>
                    </div>

                    {/* ─── TAB 1: DAILY MONITORING & RECONCILIATION ─────────────── */}
                    {activeTab === 'daily' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                            
                            {/* SECTION 8: CURRENT MONTH INVOICE PROJECTION BANNER */}
                            <div className="fleet-card" style={{ padding: '18px 24px', '--fc-accent': '#38bdf8' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '20px' }}>📈</span>
                                        <div>
                                            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '15.5px', fontWeight: 800, color: '#0f172a' }}>
                                                Current Month Invoice Pace & Month-End Projection ({projection.currentMonth})
                                            </div>
                                            <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 500 }}>
                                                Month-End Projected = Invoices completed ({projection.invoicesCompletedSoFar}) + ({projection.currentMonthDailyAvg}/day × {projection.workingDaysRemaining} working days remaining)
                                            </div>
                                        </div>
                                    </div>
                                    <span className="status-pill-v2" data-variant={projection.status === 'SURPLUS' ? 'success' : 'error'} style={{ fontSize: '12px', padding: '5px 14px' }}>
                                        {projection.status === 'SURPLUS' ? `Projected Surplus: +${projection.projectedVarianceVsTarget}` : `Projected Shortfall: ${projection.projectedVarianceVsTarget}`}
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                                    <div style={{ background: 'rgba(255, 255, 255, 0.85)', padding: '12px 16px', borderRadius: '14px', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                                        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '10.5px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invoices Completed</div>
                                        <div className="mono" style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>{projection.invoicesCompletedSoFar}</div>
                                        <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 600 }}>Month-to-date actual</div>
                                    </div>

                                    <div style={{ background: 'rgba(255, 255, 255, 0.85)', padding: '12px 16px', borderRadius: '14px', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                                        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '10.5px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Working Days Done</div>
                                        <div className="mono" style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>{projection.workingDaysCompleted} <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>/ {projection.totalWorkingDaysInMonth}d</span></div>
                                        <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 600 }}>Excludes OFF days</div>
                                    </div>

                                    <div style={{ background: 'rgba(255, 255, 255, 0.85)', padding: '12px 16px', borderRadius: '14px', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                                        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '10.5px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Daily Avg</div>
                                        <div className="mono" style={{ fontSize: '24px', fontWeight: 900, color: '#0284c7', marginTop: '2px' }}>{projection.currentMonthDailyAvg}</div>
                                        <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 600 }}>Invoices / working day</div>
                                    </div>

                                    <div style={{ background: 'rgba(255, 255, 255, 0.85)', padding: '12px 16px', borderRadius: '14px', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                                        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '10.5px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Days Remaining</div>
                                        <div className="mono" style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>{projection.workingDaysRemaining}</div>
                                        <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 600 }}>Expected working days</div>
                                    </div>

                                    <div style={{ background: 'rgba(255, 255, 255, 0.85)', padding: '12px 16px', borderRadius: '14px', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                                        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '10.5px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Projected Remaining</div>
                                        <div className="mono" style={{ fontSize: '24px', fontWeight: 900, color: '#4f46e5', marginTop: '2px' }}>{projection.projectedRemainingInvoices}</div>
                                        <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 600 }}>{projection.currentMonthDailyAvg} × {projection.workingDaysRemaining}</div>
                                    </div>

                                    <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '12px 16px', borderRadius: '14px', color: '#ffffff', boxShadow: '0 4px 16px rgba(15, 23, 42, 0.2)' }}>
                                        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '10.5px', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Projected Month-End</div>
                                        <div className="mono" style={{ fontSize: '26px', fontWeight: 900, color: '#38bdf8', marginTop: '2px' }}>{projection.projectedMonthEndInvoices}</div>
                                        <div style={{ fontSize: '10.5px', color: '#cbd5e1', fontWeight: 600 }}>Monthly Target: {projection.expectedMonthlyTarget}</div>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 1: DAILY MONITORING TABLE */}
                            <div className="fleet-table-wrap">
                                {/* Table Toolbar */}
                                <div style={{ padding: '18px 24px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid rgba(226, 232, 240, 0.7)' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: '16.5px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>📋</span> 1. Daily Invoice Productivity & Backlog Continuity
                                        </h3>
                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                                            Strict continuity: Closing Pending(t) carries forward into Opening Pending(t+1)
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                        {/* Quick Search */}
                                        <input
                                            type="text"
                                            placeholder="🔍 Search date, reason, status..."
                                            value={tableSearch}
                                            onChange={e => setTableSearch(e.target.value)}
                                            style={{
                                                padding: '7px 14px',
                                                borderRadius: '10px',
                                                border: '1px solid #cbd5e1',
                                                fontSize: '12.5px',
                                                outline: 'none',
                                                fontFamily: "'Outfit', sans-serif",
                                                minWidth: '220px'
                                            }}
                                        />

                                        {/* Status Filter Chips */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <button
                                                className="filter-chip"
                                                data-active={tableStatusFilter === 'all'}
                                                onClick={() => setTableStatusFilter('all')}
                                            >
                                                All ({historyDays.length})
                                            </button>
                                            <button
                                                className="filter-chip"
                                                data-active={tableStatusFilter === 'GREEN'}
                                                onClick={() => setTableStatusFilter('GREEN')}
                                            >
                                                🟢 Achieved ({historyDays.filter(h => h.ragStatus === 'GREEN').length})
                                            </button>
                                            <button
                                                className="filter-chip"
                                                data-active={tableStatusFilter === 'RED'}
                                                onClick={() => setTableStatusFilter('RED')}
                                            >
                                                🔴 Shortfall ({historyDays.filter(h => h.ragStatus === 'RED').length})
                                            </button>
                                            <button
                                                className="filter-chip"
                                                data-active={tableStatusFilter === 'OFF'}
                                                onClick={() => setTableStatusFilter('OFF')}
                                            >
                                                Off Days ({historyDays.filter(h => h.isOffDay).length})
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => setShowExceptionModal(true)}
                                            className="modern-refresh-btn"
                                            style={{ padding: '7px 14px', fontSize: '12px' }}
                                        >
                                            <span>✏️</span> Record Exception
                                        </button>
                                    </div>
                                </div>

                                <div className="mini-custom-scroll" style={{ overflowX: 'auto', maxHeight: '460px', overflowY: 'auto' }}>
                                    <table className="fleet-table">
                                        <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                                            <tr>
                                                <th style={{ width: '135px' }}>Date</th>
                                                <th style={{ textAlign: 'right', width: '95px' }}>Opening</th>
                                                <th style={{ textAlign: 'right', width: '90px' }}>New Jobs</th>
                                                <th style={{ textAlign: 'right', width: '95px' }}>Workload</th>
                                                <th style={{ textAlign: 'right', width: '105px' }}>Invoiced</th>
                                                <th style={{ textAlign: 'right', width: '95px' }}>3-M Target</th>
                                                <th style={{ textAlign: 'right', width: '85px' }}>Shortfall</th>
                                                <th style={{ textAlign: 'right', width: '105px' }}>Closing</th>
                                                <th style={{ textAlign: 'right', width: '80px' }}>Queries</th>
                                                <th style={{ textAlign: 'center', width: '110px' }}>RAG Status</th>
                                                <th style={{ minWidth: '160px' }}>Exception / Reason</th>
                                                <th style={{ textAlign: 'center', width: '75px' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredHistoryDays.map((row, idx) => {
                                                const isSelectedRow = row.rawDate === (activeRowDate || computedDate);
                                                return (
                                                    <tr
                                                        key={row.rawDate || idx}
                                                        className={isSelectedRow ? 'highlight-row' : ''}
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => setActiveRowDate(row.rawDate)}
                                                    >
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                                                <span style={{ fontWeight: isSelectedRow ? 800 : 600, fontSize: '12.5px', color: isSelectedRow ? '#4f46e5' : '#1e293b' }}>
                                                                    {row.date}
                                                                </span>
                                                                {isSelectedRow && (
                                                                    <span style={{ fontSize: '9px', background: '#4f46e5', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: 800, letterSpacing: '0.04em', marginLeft: '4px' }}>
                                                                        ACTIVE
                                                                    </span>
                                                                )}
                                                                {row.isOffDay && (
                                                                    <span style={{ fontSize: '9px', background: '#f1f5f9', color: '#64748b', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                                                        OFF
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{row.openingPending}</td>
                                                        <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: '#0284c7' }}>+{row.newJobs}</td>
                                                        <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{row.totalWorkload}</td>
                                                        <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: row.invoicedToday >= row.benchmarkTarget ? '#059669' : '#dc2626' }}>
                                                            {row.invoicedToday}
                                                        </td>
                                                        <td className="mono" style={{ textAlign: 'right', color: '#64748b', fontWeight: 600 }}>{row.benchmarkTarget}</td>
                                                        <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: row.shortfall > 0 ? '#dc2626' : '#94a3b8' }}>
                                                            {row.shortfall > 0 ? row.shortfall : '-'}
                                                        </td>
                                                        <td className="mono" style={{ textAlign: 'right', fontWeight: 900, color: '#b45309' }}>{row.closingPending}</td>
                                                        <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: row.queriesPending > 0 ? '#dc2626' : '#94a3b8' }}>
                                                            {row.queriesPending > 0 ? row.queriesPending : '-'}
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span className="status-pill-v2" data-variant={getRAGVariant(row.ragStatus)}>
                                                                ● {row.ragStatus}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div style={{ fontWeight: 700, fontSize: '12px', fontFamily: "'Outfit', sans-serif" }}>{row.exceptionReason || 'Target achieved'}</div>
                                                            {row.justification && (
                                                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>{row.justification}</div>
                                                            )}
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setExceptionForm({
                                                                        date: row.rawDate,
                                                                        branch_code: effectiveBranchCode || 'ALL',
                                                                        exception_reason: row.exceptionReason || 'Target achieved',
                                                                        justification: row.justification || '',
                                                                        status: row.ragStatus || 'GREEN'
                                                                    });
                                                                    setShowExceptionModal(true);
                                                                }}
                                                                style={{
                                                                    padding: '4px 9px',
                                                                    borderRadius: '8px',
                                                                    border: '1px solid rgba(226, 232, 240, 0.9)',
                                                                    background: '#ffffff',
                                                                    fontSize: '11px',
                                                                    fontWeight: 700,
                                                                    color: '#4f46e5',
                                                                    cursor: 'pointer',
                                                                    fontFamily: "'Outfit', sans-serif",
                                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                                title="Edit Exception Reason"
                                                            >
                                                                ✏️ Edit
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        {/* Sticky Summary Totals Row */}
                                        <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 2 }}>
                                            <tr className="total-row">
                                                <td style={{ fontSize: '13px' }}>TOTAL / SUMMARY</td>
                                                <td className="mono" style={{ textAlign: 'right' }}>{tableTotals.opening}</td>
                                                <td className="mono" style={{ textAlign: 'right', color: '#0284c7' }}>+{tableTotals.newJobs}</td>
                                                <td className="mono" style={{ textAlign: 'right' }}>{tableTotals.workload}</td>
                                                <td className="mono" style={{ textAlign: 'right', color: '#059669' }}>{tableTotals.invoiced}</td>
                                                <td className="mono" style={{ textAlign: 'right' }}>{tableTotals.target}</td>
                                                <td className="mono" style={{ textAlign: 'right', color: tableTotals.netShortfall > 0 ? '#dc2626' : '#64748b' }} title={`Net Period Shortfall: ${tableTotals.netShortfall} (Daily Gross Sum: ${tableTotals.dailyShortfallSum})`}>
                                                    {tableTotals.netShortfall > 0 ? tableTotals.netShortfall : '-'}
                                                </td>
                                                <td className="mono" style={{ textAlign: 'right', color: '#b45309' }}>{tableTotals.closing}</td>
                                                <td className="mono" style={{ textAlign: 'right', color: tableTotals.queries > 0 ? '#dc2626' : '#64748b' }} title="Current Active Unresolved Queries">
                                                    {tableTotals.queries}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className="status-pill-v2" data-variant="neutral">
                                                        Period Total
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
                                                    {filteredHistoryDays.length} days displayed
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span style={{ fontSize: '11px', color: '#059669', fontWeight: 800 }}>✓ Live</span>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* SECTION 6: BRANCH-WISE PENDING JOBS RECONCILIATION */}
                            <div className="fleet-table-wrap">
                                <div style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid rgba(226, 232, 240, 0.7)' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: '16.5px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>🏢</span> 6. Branch-wise Pending Jobs Reconciliation — Date: {todaySummary.date || activeRowDate || computedDate}
                                        </h3>
                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                                            Reconciles 5 operating branches directly to the overall dashboard KPI row.
                                        </div>
                                    </div>
                                    <span className="status-pill-v2" data-variant="success" style={{ fontSize: '12px', padding: '4px 12px' }}>
                                        ✓ Reconciled Total: {branchTotals.closingPending || 0} Closing Pending
                                    </span>
                                </div>

                                <div className="mini-custom-scroll" style={{ overflowX: 'auto' }}>
                                    <table className="fleet-table">
                                        <thead>
                                            <tr>
                                                <th>Branch</th>
                                                <th style={{ width: '140px' }}>Backlog Share</th>
                                                <th style={{ textAlign: 'right' }}>Opening</th>
                                                <th style={{ textAlign: 'right' }}>New Jobs</th>
                                                <th style={{ textAlign: 'right' }}>Invoiced</th>
                                                <th style={{ textAlign: 'right' }}>Closing</th>
                                                <th style={{ textAlign: 'right' }}>Queries</th>
                                                <th style={{ textAlign: 'center' }}>RAG / Exception</th>
                                                <th style={{ textAlign: 'center' }}>Drill-down</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {branchBreakdown.map((b) => {
                                                const totalCl = branchTotals.closingPending || 1;
                                                const share = totalCl > 0 ? Math.round(((b.closingPending || 0) / totalCl) * 100) : 0;
                                                return (
                                                    <tr
                                                        key={b.code || b.branch}
                                                        className={effectiveBranchCode && effectiveBranchCode.toUpperCase() === b.code.toUpperCase() ? 'highlight-row' : ''}
                                                    >
                                                        <td style={{ fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
                                                            {b.branch} <span style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 600 }}>({b.code})</span>
                                                            {effectiveBranchCode && effectiveBranchCode.toUpperCase() === b.code.toUpperCase() && (
                                                                <span className="status-pill-v2" data-variant="info" style={{ marginLeft: '8px', fontSize: '10px', padding: '2px 8px' }}>Active</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <div style={{ flex: 1, height: '5px', background: 'rgba(226, 232, 240, 0.8)', borderRadius: '999px', overflow: 'hidden' }}>
                                                                    <div style={{ width: `${Math.max(b.closingPending > 0 ? 5 : 0, share)}%`, height: '100%', background: '#6366f1', borderRadius: '999px' }} />
                                                                </div>
                                                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, minWidth: '32px' }}>{share}%</span>
                                                            </div>
                                                        </td>
                                                        <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{b.openingPending}</td>
                                                        <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: '#0284c7' }}>+{b.newJobs}</td>
                                                        <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{b.invoiced}</td>
                                                        <td className="mono" style={{ textAlign: 'right', fontWeight: 900, color: '#b45309' }}>{b.closingPending}</td>
                                                        <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: b.queriesPending > 0 ? '#dc2626' : '#64748b' }}>
                                                            {b.queriesPending}
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span className="status-pill-v2" data-variant={getRAGVariant(b.ragStatus)}>
                                                                ● {b.exception}
                                                            </span>
                                                        </td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <button
                                                                onClick={() => handleOpenDrilldown(`${b.branch} Branch Pending Jobs`, null, b.code)}
                                                                className="status-pill-v2"
                                                                data-variant="info"
                                                                style={{ cursor: 'pointer', padding: '4px 10px' }}
                                                            >
                                                                View Jobs →
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}

                                            {/* RECONCILED TOTAL ROW */}
                                            <tr className="total-row">
                                                <td style={{ fontSize: '14px' }}>TOTAL</td>
                                                <td>
                                                    <div style={{ fontSize: '11px', color: '#059669', fontWeight: 800 }}>100% Accounted</div>
                                                </td>
                                                <td className="mono" style={{ textAlign: 'right' }}>{branchTotals.openingPending}</td>
                                                <td className="mono" style={{ textAlign: 'right', color: '#0284c7' }}>+{branchTotals.newJobs}</td>
                                                <td className="mono" style={{ textAlign: 'right' }}>{branchTotals.invoiced}</td>
                                                <td className="mono" style={{ textAlign: 'right', color: '#b45309' }}>{branchTotals.closingPending}</td>
                                                <td className="mono" style={{ textAlign: 'right', color: branchTotals.queriesPending > 0 ? '#dc2626' : '#64748b' }}>
                                                    {branchTotals.queriesPending}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className="status-pill-v2" data-variant={getRAGVariant(kpis.ragStatus)}>
                                                        ● {kpis.ragStatus}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>✓ Reconciled</span>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* SECTION 5: QUERY MONITORING & EXCEPTIONS DUAL PANEL */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                                
                                {/* 5. Query Monitoring */}
                                <div className="fleet-card" style={{ padding: '24px', '--fc-accent': '#8b5cf6' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                                                5. Query Pipeline Monitoring
                                            </h3>
                                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                                                Queries preventing jobs from being invoiced
                                            </div>
                                        </div>
                                        <span className="status-pill-v2" data-variant={queryMonitoring.closingQueries > 0 ? 'error' : 'neutral'}>
                                            {queryMonitoring.queryStatus}
                                        </span>
                                    </div>

                                    <table className="fleet-table" style={{ marginTop: '8px' }}>
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th style={{ textAlign: 'right' }}>Opening</th>
                                                <th style={{ textAlign: 'right' }}>New</th>
                                                <th style={{ textAlign: 'right' }}>Resolved</th>
                                                <th style={{ textAlign: 'right' }}>Closing</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td style={{ fontWeight: 700 }}>{queryMonitoring.date || activeRowDate || computedDate}</td>
                                                <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{queryMonitoring.openingQueries}</td>
                                                <td className="mono" style={{ textAlign: 'right', color: '#64748b' }}>{queryMonitoring.newQueries}</td>
                                                <td className="mono" style={{ textAlign: 'right', color: '#059669', fontWeight: 600 }}>{queryMonitoring.queriesResolved}</td>
                                                <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>{queryMonitoring.closingQueries}</td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    <div style={{ background: 'rgba(241, 245, 249, 0.7)', padding: '12px 14px', borderRadius: '12px', marginTop: '14px', border: '1px solid rgba(226, 232, 240, 0.8)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                                            Equation: Closing ({queryMonitoring.closingQueries}) = Opening ({queryMonitoring.openingQueries}) + New (0) - Resolved (0)
                                        </div>
                                        <button
                                            onClick={() => handleOpenDrilldown('Jobs with Active Queries', 'QUERY_PENDING')}
                                            className="status-pill-v2"
                                            data-variant="info"
                                            style={{ cursor: 'pointer', padding: '4px 10px' }}
                                        >
                                            View Queries →
                                        </button>
                                    </div>
                                </div>

                                {/* 4. Exception Handling & Triggers */}
                                <div className="fleet-card" style={{ padding: '24px', '--fc-accent': '#ef4444' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                                                4. Exception Handling & Triggers
                                            </h3>
                                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                                                Automatic flags for productivity, backlog, queries & ageing
                                            </div>
                                        </div>
                                        <span className="status-pill-v2" data-variant="neutral">
                                            {activeExceptions.length} Active Triggers
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {activeExceptions.map((ex, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '12px', background: ex.severity === 'CRITICAL' ? '#fef2f2' : (ex.severity === 'WARNING' ? '#fffbeb' : '#f8fafc'), border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                                                <div>
                                                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '13px', fontWeight: 800, color: ex.severity === 'CRITICAL' ? '#dc2626' : (ex.severity === 'WARNING' ? '#b45309' : '#0f172a') }}>
                                                        {ex.type}
                                                    </div>
                                                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                                                        {ex.trigger} — {ex.action}
                                                    </div>
                                                </div>
                                                {ex.type === 'Ageing Exception' ? (
                                                    <button onClick={() => handleOpenDrilldown('Ageing Jobs (> 7 days)', 'AGEING_EXCEPTION')} className="status-pill-v2" data-variant="warning" style={{ cursor: 'pointer', padding: '3px 8px' }}>
                                                        Inspect
                                                    </button>
                                                ) : ex.type === 'Query Pending' ? (
                                                    <button onClick={() => handleOpenDrilldown('Query Pending Jobs', 'QUERY_PENDING')} className="status-pill-v2" data-variant="error" style={{ cursor: 'pointer', padding: '3px 8px' }}>
                                                        Inspect
                                                    </button>
                                                ) : (
                                                    <button onClick={() => setShowExceptionModal(true)} className="status-pill-v2" data-variant="info" style={{ cursor: 'pointer', padding: '3px 8px' }}>
                                                        Record
                                                    </button>
                                                )}
                                            </div>
                                        ))}

                                        {activeExceptions.length === 0 && (
                                            <div style={{ padding: '20px', textAlign: 'center', color: '#059669', fontWeight: 700, background: '#f0fdf4', borderRadius: '12px', fontFamily: "'Outfit', sans-serif" }}>
                                                ✓ No active exceptions. Productivity target achieved without blockers.
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>

                        </div>
                    )}

                    {/* ─── TAB 2: MONTH-WISE KPI CARDS & INVOICE PROJECTIONS (Section 11) */}
                    {activeTab === 'month-projections' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="fleet-table-wrap">
                                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(226, 232, 240, 0.6)' }}>
                                    <h3 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                                        11. Month-wise Performance & Projections Matrix
                                    </h3>
                                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>
                                        Comparing completed historical months (actual month-end) with the current ongoing month (projected from actual current-month daily average).
                                    </div>
                                </div>

                                <div style={{ overflowX: 'auto' }}>
                                    <table className="fleet-table">
                                        <thead>
                                            <tr>
                                                <th>Month</th>
                                                <th>Status / Mode</th>
                                                <th style={{ textAlign: 'right' }}>Invoices Completed</th>
                                                <th style={{ textAlign: 'right' }}>Working Days Done</th>
                                                <th style={{ textAlign: 'right' }}>Daily Avg</th>
                                                <th style={{ textAlign: 'right' }}>Total Working Days</th>
                                                <th style={{ textAlign: 'right' }}>Projected / Actual Month-End</th>
                                                <th style={{ textAlign: 'right' }}>3-Month Benchmark</th>
                                                <th style={{ textAlign: 'right' }}>Variance vs Target</th>
                                                <th style={{ textAlign: 'center' }}>RAG Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {monthProjectionsData.map((m) => (
                                                <tr key={m.month} className={m.isCurrent ? 'highlight-row' : ''}>
                                                    <td style={{ fontWeight: 800, fontSize: '14px', fontFamily: "'Outfit', sans-serif" }}>{m.month}</td>
                                                    <td>
                                                        <span className="status-pill-v2" data-variant={m.isCurrent ? 'info' : 'neutral'}>
                                                            {m.isCurrent ? 'Ongoing (Projected)' : 'Completed (Actual)'}
                                                        </span>
                                                    </td>
                                                    <td className="mono" style={{ textAlign: 'right', fontWeight: 700 }}>{m.invoicesCompleted}</td>
                                                    <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{m.workingDaysCompleted}</td>
                                                    <td className="mono" style={{ textAlign: 'right', fontWeight: 800, color: '#0284c7' }}>{m.dailyAvg}</td>
                                                    <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{m.totalWorkingDays}</td>
                                                    <td className="mono" style={{ textAlign: 'right', fontWeight: 900, fontSize: '15px', color: '#0f172a' }}>
                                                        {m.projectedMonthEnd}
                                                    </td>
                                                    <td className="mono" style={{ textAlign: 'right', color: '#64748b', fontWeight: 600 }}>{m.threeMonthBenchmark}</td>
                                                    <td className="mono" style={{ textAlign: 'right', fontWeight: 700, color: m.varianceVsBenchmark >= 0 ? '#059669' : '#dc2626' }}>
                                                        {m.varianceVsBenchmark > 0 ? `+${m.varianceVsBenchmark}` : m.varianceVsBenchmark}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span className="status-pill-v2" data-variant={getRAGVariant(m.status)}>
                                                            ● {m.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Month Cards Visual Grid (Fleet Card theme) */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                                {monthProjectionsData.map((m) => (
                                    <div key={`card-${m.month}`} className="fleet-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', '--fc-accent': m.isCurrent ? '#38bdf8' : '#cbd5e1' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>{m.month}</div>
                                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>{m.isCurrent ? 'Current Month Projection' : 'Completed Month Performance'}</div>
                                            </div>
                                            <span className="status-pill-v2" data-variant={m.isCurrent ? 'info' : 'neutral'}>
                                                {m.isCurrent ? 'Projected' : 'Actual'}
                                            </span>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: '14px', borderTop: '1px solid rgba(226, 232, 240, 0.8)' }}>
                                            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontFamily: "'Outfit', sans-serif" }}>Month-End Invoices</span>
                                            <span className="mono" style={{ fontSize: '34px', fontWeight: 900, color: '#0f172a' }}>{m.projectedMonthEnd}</span>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <div style={{ background: 'rgba(255, 255, 255, 0.9)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Daily Avg</div>
                                                <div className="mono" style={{ fontWeight: 800, color: '#0284c7', fontSize: '17px' }}>{m.dailyAvg} / day</div>
                                            </div>
                                            <div style={{ background: 'rgba(255, 255, 255, 0.9)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(226, 232, 240, 0.8)' }}>
                                                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Working Days</div>
                                                <div className="mono" style={{ fontWeight: 800, color: '#0f172a', fontSize: '17px' }}>{m.workingDaysCompleted} / {m.totalWorkingDays}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ─── TAB 3: TREND ANALYTICS & VELOCITY ─────────────────────── */}
                    {activeTab === 'trends' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div className="fleet-card" style={{ padding: '24px 28px', '--fc-accent': '#6366f1' }}>
                                <div style={{ marginBottom: '18px' }}>
                                    <h3 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                                        Daily Invoicing, Workload & Backlog Trajectory
                                    </h3>
                                    <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 500 }}>
                                        Month-to-date tracking of Total Workload vs Invoiced Today vs Closing Backlog
                                    </div>
                                </div>

                                <div style={{ height: '360px', width: '100%' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={historyDays} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} fontFamily="'Outfit', sans-serif" />
                                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} fontFamily="'Outfit', sans-serif" />
                                            <RechartsTooltip contentStyle={{ borderRadius: '14px', border: '1px solid rgba(226, 232, 240, 0.9)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', fontFamily: "'Outfit', sans-serif" }} />
                                            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600 }} />
                                            <Bar dataKey="totalWorkload" name="Total Workload" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
                                            <Bar dataKey="invoicedToday" name="Invoiced Today" fill="#10b981" radius={[6, 6, 0, 0]} />
                                            <Bar dataKey="closingPending" name="Closing Pending" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ─── MODAL: RECORD EXCEPTION REASON & JUSTIFICATION ─────────── */}
            {showExceptionModal && (
                <div className="modal-overlay" onClick={() => setShowExceptionModal(false)}>
                    <div className="modal-content-wrap" style={{ maxWidth: '560px', padding: '28px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid rgba(226, 232, 240, 0.8)', paddingBottom: '14px' }}>
                            <h3 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                                Record Exception Reason
                            </h3>
                            <button onClick={() => setShowExceptionModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                        </div>

                        <form onSubmit={handleSaveException} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: "'Outfit', sans-serif" }}>Date</label>
                                <input
                                    type="text"
                                    disabled
                                    value={exceptionForm.date}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: "'Outfit', sans-serif" }}>Branch Scope</label>
                                <select
                                    value={exceptionForm.branch_code}
                                    onChange={(e) => setExceptionForm({ ...exceptionForm, branch_code: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#ffffff', fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}
                                >
                                    <option value="ALL">All Branches (Overall)</option>
                                    <option value="AMD">Ahmedabad</option>
                                    <option value="GIM">Gandhidham</option>
                                    <option value="BRD">Baroda</option>
                                    <option value="HZR">Hazira</option>
                                    <option value="COK">Cochin</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: "'Outfit', sans-serif" }}>Exception Reason</label>
                                <select
                                    value={exceptionForm.exception_reason}
                                    onChange={(e) => setExceptionForm({ ...exceptionForm, exception_reason: e.target.value })}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#ffffff', fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}
                                >
                                    <option value="Target achieved">Target achieved (No Exception)</option>
                                    <option value="Exception – Justified">Exception – Justified</option>
                                    <option value="Query">Query Pending / Clarification Block</option>
                                    <option value="Document Pending">Document Pending (Client / Customs)</option>
                                    <option value="Client Dependency">Client Dependency</option>
                                    <option value="System Issue">System Issue / Downtime</option>
                                    <option value="Other">Other Operational Cause</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: "'Outfit', sans-serif" }}>Justification & Operational Notes</label>
                                <textarea
                                    rows={3}
                                    value={exceptionForm.justification}
                                    onChange={(e) => setExceptionForm({ ...exceptionForm, justification: e.target.value })}
                                    placeholder="Explain root cause, affected party, or expected resolution timeline..."
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '13.5px', fontFamily: "'Inter', sans-serif" }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '16px', borderTop: '1px solid rgba(226, 232, 240, 0.8)' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowExceptionModal(false)}
                                    style={{ padding: '9px 18px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: 600, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingException}
                                    style={{ padding: '9px 22px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)' }}
                                >
                                    {savingException ? 'Saving...' : 'Save Exception'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─── MODAL: DRILLDOWN TO AFFECTED JOBS ───────────────────────── */}
            {showDrilldownModal && (
                <div className="modal-overlay" onClick={() => setShowDrilldownModal(false)}>
                    <div className="modal-content-wrap" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px 28px', borderBottom: '1px solid rgba(226, 232, 240, 0.8)' }}>
                            <div>
                                <h3 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                                    {drilldownConfig.title}
                                </h3>
                                <div style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                                    Showing up to 100 affected jobs requiring follow-up or billing action
                                </div>
                            </div>
                            <button onClick={() => setShowDrilldownModal(false)} style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>✕</button>
                        </div>

                        <div style={{ padding: '24px 28px' }}>
                            {loadingDrilldown ? (
                                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                    <div style={{ width: '40px', height: '40px', border: '3px solid rgba(79, 70, 229, 0.2)', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'fleet-spin 0.8s linear infinite', margin: '0 auto' }}></div>
                                    <div style={{ marginTop: '12px', color: '#64748b', fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>Fetching affected jobs...</div>
                                </div>
                            ) : drilldownJobs.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>
                                    No affected jobs found for this criteria.
                                </div>
                            ) : (
                                <div className="mini-custom-scroll" style={{ overflowX: 'auto', maxHeight: '55vh' }}>
                                    <table className="fleet-table">
                                        <thead>
                                            <tr>
                                                <th>Job Number</th>
                                                <th>Importer</th>
                                                <th>Custom House</th>
                                                <th>Branch</th>
                                                <th>Sent to Accounts</th>
                                                <th style={{ textAlign: 'center' }}>Ageing Days</th>
                                                <th>Queries / Remarks</th>
                                                <th style={{ textAlign: 'center' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {drilldownJobs.map((j) => (
                                                <tr key={j._id}>
                                                    <td className="mono" style={{ fontWeight: 800, color: '#0f172a' }}>{j.job_number}</td>
                                                    <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                                                        {j.importer}
                                                    </td>
                                                    <td>{j.custom_house}</td>
                                                    <td>
                                                        <span className="status-pill-v2" data-variant="neutral">
                                                            {j.standardBranch}
                                                        </span>
                                                    </td>
                                                    <td className="mono" style={{ fontSize: '12.5px', color: '#64748b' }}>
                                                        {j.bill_document_sent_to_accounts?.slice(0, 10) || '—'}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span className="status-pill-v2" data-variant={j.isAgeingAlert ? 'error' : 'neutral'}>
                                                            {j.ageingDays}d {j.isAgeingAlert && '⚠️'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {j.unresolvedQueries && j.unresolvedQueries.length > 0 ? (
                                                            <div style={{ fontSize: '11.5px', color: '#dc2626', fontWeight: 600 }}>
                                                                {j.unresolvedQueries[0].query}
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: '#94a3b8', fontSize: '12px' }}>Normal Flow</span>
                                                        )}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button
                                                            onClick={() => navigate(`/import-billing?search=${encodeURIComponent(j.job_no || j.job_number)}`)}
                                                            className="status-pill-v2"
                                                            data-variant="info"
                                                            style={{ cursor: 'pointer', padding: '5px 12px' }}
                                                        >
                                                            Open Billing
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ImportPendingSummaryReport;
