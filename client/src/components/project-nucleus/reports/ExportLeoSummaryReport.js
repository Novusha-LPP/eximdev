import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BranchContext } from '../../../contexts/BranchContext';
import {
    ResponsiveContainer, ComposedChart, BarChart, Bar, Cell, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, Area, PieChart, Pie, ReferenceLine, Label
} from 'recharts';
import { getTransportDates } from './reports-helper';
import ImportDetailedSummaryTab from './ImportDetailedSummaryTab';
import { exportNucleusReportToExcel } from './nucleusExcelExporter';

// ─── Constants & Color Palette ──────────────────────────────────────────────────

const MONTH_NAMES = [
    { key: '4', name: 'Apr' }, { key: '5', name: 'May' }, { key: '6', name: 'Jun' },
    { key: '7', name: 'Jul' }, { key: '8', name: 'Aug' }, { key: '9', name: 'Sep' },
    { key: '10', name: 'Oct' }, { key: '11', name: 'Nov' }, { key: '12', name: 'Dec' },
    { key: '1', name: 'Jan' }, { key: '2', name: 'Feb' }, { key: '3', name: 'Mar' }
];

const PIE_COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f97316', '#64748b'];

// ─── Custom Styles ──────────────────────────────────────────────────────────────

const CUSTOM_CSS = `
.nucleus-report-root {
    background: #f8fafc;
    min-height: 100vh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #1e293b;
}

.report-header-card {
    background: #ffffff;
    border-radius: 14px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
}

.report-tab-pill {
    padding: 8px 18px;
    font-size: 13px;
    font-weight: 600;
    border-radius: 10px;
    border: none;
    background: transparent;
    color: #64748b;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.report-tab-pill:hover {
    background: #f1f5f9;
    color: #0f172a;
}

.report-tab-pill.active {
    background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
    color: #ffffff;
    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
}

.stat-hero-card {
    border-radius: 16px;
    background: linear-gradient(135deg, #172554 0%, #1e3a8a 60%, #1d4ed8 100%);
    color: #ffffff;
    box-shadow: 0 10px 25px -5px rgba(23, 37, 84, 0.35);
    position: relative;
    overflow: hidden;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-hero-card::after {
    content: '';
    position: absolute;
    top: -50%;
    right: -20%;
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.25) 0%, transparent 70%);
    border-radius: 50%;
    pointer-events: none;
}

.stat-hero-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 28px -5px rgba(37, 99, 235, 0.45);
}

.stat-white-card {
    border-radius: 16px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 15px -2px rgba(0, 0, 0, 0.04);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-white-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.08);
}

.card-title-sub {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    color: #64748b;
}

.stat-number-hero {
    font-size: 2.25rem;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.5px;
    font-variant-numeric: tabular-nums;
}

.exception-chip {
    padding: 12px 14px;
    border-radius: 12px;
    transition: all 0.2s ease;
    cursor: pointer;
    border: 1px solid transparent;
}

.exception-chip:hover {
    transform: translateY(-2px);
    filter: brightness(0.96);
}

.table-modern {
    border-collapse: separate;
    border-spacing: 0;
}

.table-modern thead th {
    background: #f8fafc;
    color: #475569;
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 10px 12px;
    border-bottom: 2px solid #e2e8f0;
}

.table-modern tbody td {
    padding: 10px 12px;
    font-size: 13px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
}

.table-modern tbody tr:hover td {
    background: rgba(241, 245, 249, 0.8);
}

.recharts-custom-tooltip {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 10px 14px;
    color: #0f172a;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    font-size: 12px;
}

.modern-download-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(135deg, #059669 0%, #10b981 100%);
    color: #ffffff;
    border: none;
    padding: 8px 18px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.25);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    letter-spacing: 0.2px;
}

.modern-download-btn:hover:not(:disabled) {
    transform: translateY(-1.5px);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35);
    filter: brightness(1.05);
    color: #ffffff;
}

.modern-download-btn:active:not(:disabled) {
    transform: translateY(0);
}

.modern-download-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.modern-download-badge {
    background: rgba(255, 255, 255, 0.22);
    padding: 2px 6px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.5px;
}

.modern-refresh-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: #eff6ff !important;
    color: #1d4ed8 !important;
    border: 1px solid #bfdbfe !important;
    padding: 8px 16px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.08) !important;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    letter-spacing: 0.2px;
}

.modern-refresh-btn:hover {
    background: #dbeafe !important;
    color: #1e40af !important;
    border-color: #93c5fd !important;
    transform: translateY(-1.5px);
    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.18) !important;
}

.modern-refresh-btn:active {
    transform: translateY(0);
}

/* Neutralize legacy global .btn styles from App.scss */
.nucleus-report-root .btn,
.stat-white-card .btn,
.stat-hero-card .btn {
    box-shadow: none !important;
    margin-top: 0 !important;
    padding: 0.25rem 0.75rem;
    border-radius: 8px;
    transition: all 0.15s ease-in-out;
}

.nucleus-report-root .btn-outline-primary,
.stat-white-card .btn-outline-primary {
    background-color: #eff6ff !important;
    color: #2563eb !important;
    border: 1px solid #bfdbfe !important;
    box-shadow: 0 1px 2px rgba(37, 99, 235, 0.05) !important;
    font-weight: 600;
}

.nucleus-report-root .btn-outline-primary:hover,
.stat-white-card .btn-outline-primary:hover {
    background-color: #2563eb !important;
    color: #ffffff !important;
    border-color: #2563eb !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25) !important;
}

.nucleus-report-root .btn-outline-danger,
.stat-white-card .btn-outline-danger {
    background-color: #fef2f2 !important;
    color: #dc2626 !important;
    border: 1px solid #fecaca !important;
    box-shadow: 0 1px 2px rgba(220, 38, 38, 0.05) !important;
    font-weight: 600;
}

.nucleus-report-root .btn-outline-danger:hover,
.stat-white-card .btn-outline-danger:hover {
    background-color: #dc2626 !important;
    color: #ffffff !important;
    border-color: #dc2626 !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25) !important;
}

.nucleus-report-root .btn-link,
.stat-white-card .btn-link {
    background-color: transparent !important;
    color: #2563eb !important;
    box-shadow: none !important;
    padding: 0 !important;
    border: none !important;
}

.nucleus-report-root .btn-light,
.stat-white-card .btn-light {
    background-color: #eff6ff !important;
    color: #1d4ed8 !important;
    border: 1px solid #bfdbfe !important;
    font-weight: 600;
}

.nucleus-report-root .btn-white,
.stat-white-card .btn-white {
    background-color: #ffffff !important;
    color: #1e293b !important;
    border: 1px solid #e2e8f0 !important;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
    font-weight: 600;
}
`;

// ─── Utility Functions ──────────────────────────────────────────────────────────

/** Compute elapsed days for any filter type */
const computeElapsedDays = (filterType, selectedYear, selectedMonth, selectedQuarter, dateRange, selectedDay, dailyDataLen) => {
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();
    const selYear = parseInt(selectedYear) || todayYear;

    let totalDays = 30, elapsedDays = 30;

    if (filterType === 'day') {
        totalDays = 1; elapsedDays = 1;
    } else if (filterType === 'week') {
        totalDays = 7; elapsedDays = 7;
    } else if (filterType === 'month') {
        const selMonth = parseInt(selectedMonth);
        totalDays = new Date(selYear, selMonth + 1, 0).getDate();
        if (selYear === todayYear && selMonth === todayMonth) elapsedDays = Math.max(1, todayDate);
        else if (selYear > todayYear || (selYear === todayYear && selMonth > todayMonth)) elapsedDays = 0;
        else elapsedDays = totalDays;
    } else if (filterType === 'quarter') {
        const q = parseInt(selectedQuarter) || 1;
        const startM = (q - 1) * 3, endM = startM + 2;
        const qStart = new Date(selYear, startM, 1);
        const qEnd = new Date(selYear, endM + 1, 0);
        totalDays = Math.round((qEnd - qStart) / 86400000) + 1;
        if (selYear === todayYear) {
            if (todayMonth >= startM && todayMonth <= endM) elapsedDays = Math.max(1, Math.round((today - qStart) / 86400000) + 1);
            else if (todayMonth < startM) elapsedDays = 0;
            else elapsedDays = totalDays;
        } else if (selYear > todayYear) elapsedDays = 0;
        else elapsedDays = totalDays;
    } else if (filterType === 'year') {
        const yStart = new Date(selYear, 0, 1);
        const yEnd = new Date(selYear, 12, 0);
        totalDays = Math.round((yEnd - yStart) / 86400000) + 1;
        if (selYear === todayYear) elapsedDays = Math.max(1, Math.round((today - yStart) / 86400000) + 1);
        else if (selYear > todayYear) elapsedDays = 0;
        else elapsedDays = totalDays;
    } else if (filterType === 'fin-year') {
        totalDays = 365;
        elapsedDays = 365;
    } else {
        if (dateRange?.start && dateRange?.end) {
            totalDays = Math.max(1, Math.round((new Date(dateRange.end) - new Date(dateRange.start)) / 86400000) + 1);
            elapsedDays = totalDays;
        } else if (dailyDataLen > 0) {
            totalDays = dailyDataLen; elapsedDays = totalDays;
        }
    }
    return { totalDays, elapsedDays };
};

// ─── Main Component ─────────────────────────────────────────────────────────────

const ExportLeoSummaryReport = ({
    branchId = '',
    selectedBranch = 'all',
    category = 'all',
    selectedCategory = 'all',
    filterType = 'month',
    selectedYear = new Date().getFullYear().toString(),
    selectedMonth = new Date().getMonth().toString(),
    selectedQuarter = '1',
    selectedFinancialYear = '26-27',
    selectedDay = new Date().toISOString().slice(0, 10),
    dateRange = null
}) => {
    const navigate = useNavigate();
    const { branches: contextBranches = [] } = useContext(BranchContext) || {};
    const allDiscoveredBranchesRef = useRef(new Set());

    // Tab state
    const [activeTab, setActiveTab] = useState('dashboard');

    // Data states
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState(null);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);

    // Filter & Search states
    const [localBranch, setLocalBranch] = useState(branchId || selectedBranch || 'all');
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerSortField, setCustomerSortField] = useState('current');
    const [customerSortDir, setCustomerSortDir] = useState('desc');
    const [exceptionFilter, setExceptionFilter] = useState('all');
    const [exceptionSearch, setExceptionSearch] = useState('');

    useEffect(() => {
        if (branchId || selectedBranch) {
            setLocalBranch(branchId || selectedBranch || 'all');
        }
    }, [branchId, selectedBranch]);

    // Fetch report data
    useEffect(() => {
        const fetchLeoData = async () => {
            setLoading(true);
            setError(null);
            try {
                const apiBase = (process.env.REACT_APP_API_STRING || 'http://localhost:9006/api').replace(/\/$/, '');
                const endpoint = `${apiBase}/project-nucleus/export-leo-summaries`;

                const effectiveBranch = (localBranch && localBranch !== 'all' && localBranch !== 'ALL') ? localBranch : '';
                const effectiveCategory = category !== 'all' ? category : selectedCategory;

                const params = {
                    filterType,
                    month: selectedMonth,
                    year: selectedYear,
                    quarter: selectedQuarter,
                    startDate: dateRange?.start || dateRange?.startDate,
                    endDate: dateRange?.end || dateRange?.endDate,
                    day: selectedDay,
                    category: effectiveCategory || 'all',
                    branchId: effectiveBranch || '',
                    selectedFinancialYear: selectedFinancialYear || '26-27'
                };

                const res = await axios.get(endpoint, {
                    params,
                    withCredentials: true
                });

                if (res.data?.success) {
                    setReportData(res.data);
                } else {
                    setError(res.data?.message || 'Failed to load Export LEO report data.');
                }
            } catch (err) {
                console.error('Error fetching Export LEO summaries:', err);
                setError(err.response?.data?.message || err.message || 'Error connecting to server.');
            } finally {
                setLoading(false);
            }
        };

        fetchLeoData();
    }, [localBranch, category, selectedCategory, filterType, selectedYear, selectedMonth, selectedQuarter, selectedFinancialYear, selectedDay, dateRange, retryCount]);

    // ─── Calculations ───────────────────────────────────────────────────────────

    const { totalDays, elapsedDays } = useMemo(() => {
        return computeElapsedDays(
            filterType,
            selectedYear,
            selectedMonth,
            selectedQuarter,
            dateRange,
            selectedDay,
            reportData?.dailyData?.length || 0
        );
    }, [filterType, selectedYear, selectedMonth, selectedQuarter, dateRange, selectedDay, reportData]);

    const totalLeo = reportData?.totalLeo || reportData?.totalOoc || 0;
    const totalTeus = reportData?.totalTeus || 0;
    const stats = reportData?.stats || {};
    const prevStats = reportData?.prevStats || {};

    const avgDaily = useMemo(() => {
        if (!elapsedDays || elapsedDays <= 0) return 0;
        return Math.round((totalLeo / elapsedDays) * 10) / 10;
    }, [totalLeo, elapsedDays]);

    const prevTotal = prevStats.totalLeo || prevStats.totalOoc || 0;
    const totalGrowthPct = useMemo(() => {
        if (!prevTotal) return totalLeo > 0 ? '+100%' : '0%';
        const diff = totalLeo - prevTotal;
        const pct = Math.round((diff / prevTotal) * 100);
        return `${pct >= 0 ? '+' : ''}${pct}%`;
    }, [totalLeo, prevTotal]);

    const projectedTotal = useMemo(() => {
        if (filterType === 'day' || filterType === 'week') return totalLeo;
        if (!elapsedDays || elapsedDays <= 0) return 0;
        const rate = totalLeo / elapsedDays;
        return Math.round(rate * totalDays);
    }, [filterType, totalLeo, elapsedDays, totalDays]);

    // Branch table data with projections
    const branchTableData = useMemo(() => {
        const list = reportData?.branchWise || [];
        return list.map(b => {
            const bAvg = elapsedDays > 0 ? Math.round((b.total / elapsedDays) * 10) / 10 : 0;
            const bProj = (filterType === 'day' || filterType === 'week')
                ? b.total
                : (elapsedDays > 0 ? Math.round((b.total / elapsedDays) * totalDays) : 0);
            return {
                ...b,
                avgDaily: bAvg,
                projection: bProj
            };
        });
    }, [reportData, elapsedDays, totalDays, filterType]);

    // Top branch projection
    const topBranch = useMemo(() => {
        if (!branchTableData.length) return null;
        return [...branchTableData].sort((a, b) => b.total - a.total)[0];
    }, [branchTableData]);

    // Sorted & filtered customers
    const filteredCustomers = useMemo(() => {
        const list = reportData?.customerWise || [];
        return list
            .filter(c => !customerSearch || c.customer?.toLowerCase().includes(customerSearch.toLowerCase()))
            .sort((a, b) => {
                let vA = a[customerSortField];
                let vB = b[customerSortField];
                if (typeof vA === 'string') {
                    return customerSortDir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
                }
                return customerSortDir === 'asc' ? (vA || 0) - (vB || 0) : (vB || 0) - (vA || 0);
            });
    }, [reportData, customerSearch, customerSortField, customerSortDir]);

    // Daily trend data with 7-day moving avg
    const dailyTrendData = useMemo(() => {
        const raw = reportData?.dailyData || [];
        return raw.map((d, i, arr) => {
            const windowSlice = arr.slice(Math.max(0, i - 6), i + 1);
            const sum = windowSlice.reduce((acc, curr) => acc + (curr.totalOoc || 0), 0);
            const mAvg = Math.round((sum / windowSlice.length) * 10) / 10;
            return {
                ...d,
                displayDate: d.date?.slice(5),
                movingAvg: mAvg
            };
        });
    }, [reportData]);

    // Branch donut data
    const branchDonutData = useMemo(() => {
        return (reportData?.branchWise || []).map((b, i) => ({
            name: b.name || 'Other',
            value: b.total,
            color: PIE_COLORS[i % PIE_COLORS.length]
        }));
    }, [reportData]);

    useEffect(() => {
        if (reportData?.branchWise && Array.isArray(reportData.branchWise)) {
            reportData.branchWise.forEach(b => {
                const name = b.branch || b.branch_code || b.name;
                if (name && String(name).trim()) allDiscoveredBranchesRef.current.add(String(name).trim());
            });
        }
        if (reportData?.detailedJobs && Array.isArray(reportData.detailedJobs)) {
            reportData.detailedJobs.forEach(j => {
                const b = j.branch || j.branch_code;
                if (b && String(b).trim()) allDiscoveredBranchesRef.current.add(String(b).trim());
            });
        }
    }, [reportData]);

    const availableBranches = useMemo(() => {
        const set = new Set(allDiscoveredBranchesRef.current);
        (contextBranches || []).forEach(b => {
            const code = b.branch_code || b.branch_name || b.name;
            if (code && String(code).trim()) set.add(String(code).trim());
        });
        (reportData?.branchWise || []).forEach(b => {
            const name = b.branch || b.branch_code || b.name;
            if (name && String(name).trim()) set.add(String(name).trim());
        });
        (reportData?.detailedJobs || []).forEach(j => {
            const b = j.branch || j.branch_code;
            if (b && String(b).trim()) set.add(String(b).trim());
        });
        return Array.from(set).sort();
    }, [contextBranches, reportData]);

    // Filtered exceptions
    const filteredExceptions = useMemo(() => {
        const list = reportData?.exceptionsList || [];
        return list.filter(item => {
            if (exceptionFilter === 'handover' && !item.isHandoverPending) return false;
            if (exceptionFilter === 'railOut' && !item.isRailOutPending) return false;
            if (exceptionFilter === 'billing' && !item.isBillingPending) return false;
            if (exceptionFilter === 'drawback' && !item.isDrawbackPending) return false;
            if (exceptionFilter === 'fines' && !item.hasFineOrPenalty) return false;

            if (exceptionSearch) {
                const q = exceptionSearch.toLowerCase();
                const matchJob = item.job_no?.toLowerCase().includes(q);
                const matchSb = item.sb_no?.toLowerCase().includes(q);
                const matchExp = item.exporter?.toLowerCase().includes(q);
                const matchBr = item.branch_code?.toLowerCase().includes(q);
                if (!matchJob && !matchSb && !matchExp && !matchBr) return false;
            }
            return true;
        });
    }, [reportData, exceptionFilter, exceptionSearch]);

    // ─── Export to Excel ─────────────────────────────────────────────────────────

    const [exportingExcel, setExportingExcel] = useState(false);

    const handleExportFullExcel = async () => {
        if (!reportData) return;
        setExportingExcel(true);
        try {
            await exportNucleusReportToExcel({
                reportType: 'export_leo_summary',
                reportData,
                filterMeta: {
                    filterType,
                    selectedFinancialYear,
                    selectedMonth,
                    selectedYear,
                    selectedQuarter,
                    selectedDay,
                    dateRange,
                    branchId,
                    selectedBranch,
                    category,
                    selectedCategory
                }
            });
        } catch (err) {
            console.error('Failed to export full Excel workbook:', err);
            alert('Failed to generate full Excel report. Please try again.');
        } finally {
            setExportingExcel(false);
        }
    };

    // ─── Render States ──────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="d-flex flex-column align-items-center justify-content-center py-5" style={{ minHeight: '400px' }}>
                <style>{CUSTOM_CSS}</style>
                <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <h5 className="text-secondary fw-semibold">Loading Export Let Export Order (LEO) Report...</h5>
                <p className="text-muted small">Aggregating live export clearance milestones and operational metrics</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger mx-3 my-4 p-4 shadow-sm rounded-4">
                <style>{CUSTOM_CSS}</style>
                <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="d-flex align-items-center">
                        <span className="fs-4 me-2">⚠️</span>
                        <h5 className="alert-heading mb-0 fw-bold">Report Loading Error</h5>
                    </div>
                    <button
                        onClick={() => setRetryCount(c => c + 1)}
                        className="btn btn-outline-danger btn-sm px-3 py-1 fw-semibold rounded-pill"
                    >
                        🔄 Retry Loading
                    </button>
                </div>
                <p className="mb-0">{error}</p>
            </div>
        );
    }

    // ─── Main Render ────────────────────────────────────────────────────────────

    return (
        <div className="container-fluid p-3 p-md-4 nucleus-report-root">
            <style>{CUSTOM_CSS}</style>

            {/* Header / Sub-title Bar */}
            <div className="report-header-card p-3 p-md-4 mb-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                        <span className="fs-4">🛫</span>
                        <h4 className="fw-bold text-dark mb-0" style={{ letterSpacing: '-0.3px' }}>
                            Let Export Order (LEO) Summary Report
                        </h4>
                    </div>
                    <div className="d-flex align-items-center gap-2 flex-wrap text-muted small mt-1">
                        <span>Export LEO clearance metrics for <strong className="text-primary">{selectedFinancialYear ? `FY ${selectedFinancialYear}` : `${selectedMonth}/${selectedYear}`}</strong></span>
                        <span>•</span>
                        <div className="d-inline-flex align-items-center gap-1">
                            <span className="fw-semibold text-dark">Branch:</span>
                            <select
                                value={localBranch}
                                onChange={(e) => setLocalBranch(e.target.value)}
                                className="form-select form-select-sm rounded-pill w-auto ps-2 pe-4 py-0.5"
                                style={{
                                    fontSize: '12px',
                                    fontWeight: localBranch !== 'all' && localBranch !== 'ALL' ? 700 : 500,
                                    borderColor: localBranch !== 'all' && localBranch !== 'ALL' ? '#2563eb' : '#cbd5e1',
                                    background: localBranch !== 'all' && localBranch !== 'ALL' ? '#eff6ff' : '#ffffff',
                                    color: localBranch !== 'all' && localBranch !== 'ALL' ? '#1d4ed8' : '#1e293b',
                                    height: '28px',
                                    minHeight: '28px',
                                    paddingRight: '32px'
                                }}
                            >
                                <option value="all">ALL</option>
                                {availableBranches.map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                    <button
                        onClick={() => setRetryCount(c => c + 1)}
                        className="modern-refresh-btn"
                        title="Refresh report data"
                    >
                        <span>🔄</span>
                        <span>Refresh</span>
                    </button>
                    <button
                        onClick={handleExportFullExcel}
                        disabled={exportingExcel}
                        className="modern-download-btn"
                        title="Download complete structured Excel workbook with active AutoFilters"
                    >
                        {exportingExcel ? (
                            <>
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: '13px', height: '13px' }}></span>
                                <span>Generating...</span>
                            </>
                        ) : (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                <span>Download Excel</span>
                                <span className="modern-download-badge">XLSX</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="bg-white p-1 rounded-3 shadow-sm border mb-4 d-inline-flex flex-wrap gap-1">
                {[
                    { id: 'dashboard', label: '📊 Dashboard' },
                    { id: 'trend', label: '📈 Trend & Analytics' },
                    { id: 'exceptions', label: `⚠️ Exceptions (${reportData?.exceptionsSummary?.total || 0})` },
                    { id: 'detailed', label: `📑 Detailed Jobs (${reportData?.detailedJobs?.length || 0})` }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`report-tab-pill ${activeTab === tab.id ? 'active' : ''}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ══════════════════════════════════════════════════════════════════════════ */}
            {/* TAB 1: EXECUTIVE DASHBOARD                                                */}
            {/* ══════════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'dashboard' && (
                <div>
                    {/* Row 1: Core 4 Hero KPI Cards */}
                    <div className="row g-3 mb-4">
                        {/* KPI 1: Total LEO (Royal Blue Hero Card) */}
                        <div className="col-12 col-sm-6 col-xl-3">
                            <div className="stat-hero-card p-3 p-md-4 h-100 d-flex flex-column justify-content-between">
                                <div>
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <span className="text-uppercase fw-bold" style={{ fontSize: '11px', letterSpacing: '0.8px', opacity: 0.9 }}>
                                            Total LEO Cleared
                                        </span>
                                        <span
                                            className="badge px-2 py-1 rounded-pill"
                                            style={{
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                letterSpacing: '0.3px',
                                                backgroundColor: totalGrowthPct.startsWith('-') ? '#dc2626' : totalGrowthPct.startsWith('+') ? '#059669' : '#1e3a8a',
                                                color: '#ffffff',
                                                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
                                            }}
                                        >
                                            {totalGrowthPct.startsWith('+') ? '▲ ' : totalGrowthPct.startsWith('-') ? '▼ ' : ''}{totalGrowthPct} vs Prev
                                        </span>
                                    </div>
                                    <div className="stat-number-hero mb-2">{totalLeo.toLocaleString()}</div>
                                </div>
                                <div className="d-flex align-items-center gap-2 pt-2 border-top border-white border-opacity-10 small" style={{ opacity: 0.9 }}>
                                    <span>⏱️ {elapsedDays} days elapsed</span>
                                    <span>•</span>
                                    <span>Prev: {prevTotal.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* KPI 2: Total TEUs & Containers */}
                        <div className="col-12 col-sm-6 col-xl-3">
                            <div className="stat-white-card p-3 p-md-4 h-100 d-flex flex-column justify-content-between">
                                <div>
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <span className="card-title-sub">Containers & Volume</span>
                                        <span className="badge bg-primary-subtle text-primary fw-bold px-2 py-1 rounded-pill" style={{ fontSize: '11px' }}>
                                            {totalTeus.toLocaleString()} TEUs
                                        </span>
                                    </div>
                                    <div className="stat-number-hero text-dark mb-2">
                                        {((stats.fcl20 || 0) + (stats.fcl40 || 0)).toLocaleString()}
                                        <span className="text-muted fw-normal fs-6 ms-1">Boxes</span>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center gap-1 flex-wrap pt-2 border-top">
                                    <span className="badge bg-light text-primary border" style={{ fontSize: '11px' }}>20': {stats.fcl20 || 0}</span>
                                    <span className="badge bg-light text-indigo border" style={{ fontSize: '11px', color: '#6366f1' }}>40': {stats.fcl40 || 0}</span>
                                    <span className="badge bg-light text-warning border" style={{ fontSize: '11px', color: '#d97706' }}>LCL: {stats.lclJobs || 0}</span>
                                </div>
                            </div>
                        </div>

                        {/* KPI 3: Daily Average Run-Rate */}
                        <div className="col-12 col-sm-6 col-xl-3">
                            <div className="stat-white-card p-3 p-md-4 h-100 d-flex flex-column justify-content-between">
                                <div>
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <span className="card-title-sub">Daily Run-Rate</span>
                                        <span className="badge bg-success-subtle text-success fw-bold px-2 py-1 rounded-pill" style={{ fontSize: '11px' }}>
                                            Clearance Pace
                                        </span>
                                    </div>
                                    <div className="stat-number-hero text-success mb-2">
                                        {avgDaily}
                                        <span className="text-muted fw-normal fs-6 ms-1">/ day</span>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center justify-content-between pt-2 border-top text-muted small">
                                    <span>Benchmark Pace:</span>
                                    <strong className="text-dark">{prevStats.avgDaily || 0} / day</strong>
                                </div>
                            </div>
                        </div>

                        {/* KPI 4: Transport Mode Split */}
                        <div className="col-12 col-sm-6 col-xl-3">
                            <div className="stat-white-card p-3 p-md-4 h-100 d-flex flex-column justify-content-between">
                                <div>
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <span className="card-title-sub">Transport Mode Split</span>
                                        <span className="badge bg-info-subtle text-info fw-bold px-2 py-1 rounded-pill" style={{ fontSize: '11px' }}>
                                            Sea / Air
                                        </span>
                                    </div>
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <div>
                                            <div className="text-muted small">🚢 Sea Cargo</div>
                                            <h4 className="fw-bold text-primary mb-0">{stats.seaJobs || 0}</h4>
                                        </div>
                                        <div className="text-end">
                                            <div className="text-muted small">✈️ Air Cargo</div>
                                            <h4 className="fw-bold text-info mb-0">{stats.airJobs || 0}</h4>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-2 border-top">
                                    <div className="progress rounded-pill" style={{ height: '8px', background: '#e2e8f0' }}>
                                        <div
                                            className="progress-bar bg-primary"
                                            style={{ width: `${totalLeo > 0 ? ((stats.seaJobs || 0) / totalLeo) * 100 : 50}%` }}
                                            title={`Sea: ${stats.seaJobs || 0}`}
                                        />
                                        <div
                                            className="progress-bar bg-info"
                                            style={{ width: `${totalLeo > 0 ? ((stats.airJobs || 0) / totalLeo) * 100 : 50}%` }}
                                            title={`Air: ${stats.airJobs || 0}`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Projections & Period Benchmark Cards */}
                    <div className="row g-3 mb-4">
                        {/* Projected Monthly LEO */}
                        <div className="col-12 col-md-4">
                            <div className="stat-white-card p-3 p-md-4 h-100">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="card-title-sub">Projected Monthly LEO</span>
                                    <span className={`badge px-2 py-1 rounded-pill ${projectedTotal >= prevTotal ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning-emphasis'}`}>
                                        {projectedTotal >= prevTotal ? 'Ahead of Target' : 'Behind Pace'}
                                    </span>
                                </div>
                                <h3 className="fw-bold text-dark mb-1 font-monospace">{projectedTotal.toLocaleString()}</h3>
                                <p className="text-muted small mb-0">
                                    Calculated at current run-rate of <strong>{avgDaily} LEO/day</strong> across full period ({totalDays} days).
                                </p>
                            </div>
                        </div>

                        {/* Top Branch Projection */}
                        <div className="col-12 col-md-4">
                            <div className="stat-white-card p-3 p-md-4 h-100">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="card-title-sub">Top Branch Performance</span>
                                    <span className="badge bg-primary text-white px-2 py-1 rounded-pill">{topBranch?.name || '—'}</span>
                                </div>
                                <h3 className="fw-bold text-primary mb-1 font-monospace">{topBranch?.projection?.toLocaleString() || 0}</h3>
                                <p className="text-muted small mb-0">
                                    {topBranch?.name} has cleared <strong>{topBranch?.total || 0}</strong> LEO ({topBranch?.avgDaily || 0}/day) with projected volume of <strong>{topBranch?.projection || 0}</strong>.
                                </p>
                            </div>
                        </div>

                        {/* Benchmark Comparison */}
                        <div className="col-12 col-md-4">
                            <div className="stat-white-card p-3 p-md-4 h-100">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="card-title-sub">Previous Period Delta</span>
                                    <span className="badge bg-secondary-subtle text-secondary px-2 py-1 rounded-pill">Benchmark</span>
                                </div>
                                <h3 className="fw-bold text-secondary mb-1 font-monospace">{prevTotal.toLocaleString()}</h3>
                                <p className="text-muted small mb-0">
                                    Net Difference: <strong className={totalLeo >= prevTotal ? 'text-success' : 'text-danger'}>
                                        {totalLeo >= prevTotal ? `+${(totalLeo - prevTotal).toLocaleString()}` : `-${(prevTotal - totalLeo).toLocaleString()}`}
                                    </strong> ({totalGrowthPct} growth).
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Operational Exceptions Banner */}
                    <div className="stat-white-card p-3 p-md-4 mb-4">
                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-3">
                            <div className="d-flex align-items-center gap-2">
                                <span className="fs-5">⚠️</span>
                                <h6 className="fw-bold mb-0 text-dark">Export Operational Exceptions & Logistics Bottlenecks</h6>
                            </div>
                            <button
                                onClick={() => setActiveTab('exceptions')}
                                className="btn btn-outline-danger btn-sm px-3 py-1 rounded-pill fw-semibold"
                                style={{ fontSize: '12px' }}
                            >
                                Open Exception Manager ({reportData?.exceptionsSummary?.total || 0}) →
                            </button>
                        </div>
                        <div className="row g-2 text-center">
                            <div className="col-6 col-md" onClick={() => { setActiveTab('exceptions'); setExceptionFilter('all'); }}>
                                <div className="exception-chip bg-light border">
                                    <div className="fw-bold fs-5 text-dark font-monospace">{reportData?.exceptionsSummary?.total || 0}</div>
                                    <div className="text-muted small fw-semibold">Total Flagged</div>
                                </div>
                            </div>
                            <div className="col-6 col-md" onClick={() => { setActiveTab('exceptions'); setExceptionFilter('handover'); }}>
                                <div className="exception-chip bg-danger-subtle border border-danger-subtle">
                                    <div className="fw-bold fs-5 text-danger font-monospace">{reportData?.exceptionsSummary?.handoverPending || 0}</div>
                                    <div className="text-danger small fw-semibold">Handover Pending</div>
                                </div>
                            </div>
                            <div className="col-6 col-md" onClick={() => { setActiveTab('exceptions'); setExceptionFilter('railOut'); }}>
                                <div className="exception-chip bg-warning-subtle border border-warning-subtle">
                                    <div className="fw-bold fs-5 text-warning-emphasis font-monospace">{reportData?.exceptionsSummary?.railOutPending || 0}</div>
                                    <div className="text-warning-emphasis small fw-semibold">Rail Out Pending</div>
                                </div>
                            </div>
                            <div className="col-6 col-md" onClick={() => { setActiveTab('exceptions'); setExceptionFilter('billing'); }}>
                                <div className="exception-chip bg-info-subtle border border-info-subtle">
                                    <div className="fw-bold fs-5 text-info-emphasis font-monospace">{reportData?.exceptionsSummary?.billingPending || 0}</div>
                                    <div className="text-info-emphasis small fw-semibold">Billing Pending</div>
                                </div>
                            </div>
                            <div className="col-6 col-md" onClick={() => { setActiveTab('exceptions'); setExceptionFilter('drawback'); }}>
                                <div className="exception-chip bg-secondary-subtle border">
                                    <div className="fw-bold fs-5 text-secondary font-monospace">{reportData?.exceptionsSummary?.drawbackPending || 0}</div>
                                    <div className="text-secondary small fw-semibold">Drawback Pending</div>
                                </div>
                            </div>
                            <div className="col-6 col-md" onClick={() => { setActiveTab('exceptions'); setExceptionFilter('fines'); }}>
                                <div className="exception-chip bg-danger-subtle border border-danger-subtle">
                                    <div className="fw-bold fs-5 text-danger font-monospace">{reportData?.exceptionsSummary?.finesOrPenalties || 0}</div>
                                    <div className="text-danger small fw-semibold">Fines / Penalties</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 4: Branch Performance Table & Dual Axis Chart */}
                    <div className="row g-4 mb-4">
                        {/* Branch Table */}
                        <div className="col-12 col-xl-6">
                            <div className="stat-white-card p-3 p-md-4 h-100">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h6 className="fw-bold mb-0 text-dark">🏢 Branch Performance & Monthly Projections</h6>
                                </div>
                                <div className="table-responsive">
                                    <table className="table table-modern align-middle mb-0">
                                        <thead>
                                            <tr>
                                                <th>Branch</th>
                                                <th className="text-center">20'</th>
                                                <th className="text-center">40'</th>
                                                <th className="text-center">LCL</th>
                                                <th className="text-center">Air</th>
                                                <th className="text-center">TEUs</th>
                                                <th className="text-center">Daily Avg</th>
                                                <th className="text-center">Projected</th>
                                                <th className="text-center fw-bold text-dark">Total LEO</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {branchTableData.map(b => (
                                                <tr key={b.name}>
                                                    <td className="fw-bold text-dark">{b.name}</td>
                                                    <td className="text-center text-muted font-monospace">{b.c20 || 0}</td>
                                                    <td className="text-center text-muted font-monospace">{b.c40 || 0}</td>
                                                    <td className="text-center text-muted font-monospace">{b.lcl || 0}</td>
                                                    <td className="text-center text-muted font-monospace">{b.air || 0}</td>
                                                    <td className="text-center fw-semibold text-primary font-monospace">{b.teus || 0}</td>
                                                    <td className="text-center font-monospace">{b.avgDaily || 0}</td>
                                                    <td className="text-center fw-bold text-success font-monospace">{b.projection?.toLocaleString() || 0}</td>
                                                    <td className="text-center fw-bold text-dark bg-light font-monospace">{b.total?.toLocaleString() || 0}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="table-light fw-bold">
                                                <td>Total</td>
                                                <td className="text-center font-monospace">{stats.fcl20 || 0}</td>
                                                <td className="text-center font-monospace">{stats.fcl40 || 0}</td>
                                                <td className="text-center font-monospace">{stats.lclJobs || 0}</td>
                                                <td className="text-center font-monospace">{stats.airJobs || 0}</td>
                                                <td className="text-center text-primary font-monospace">{totalTeus.toLocaleString()}</td>
                                                <td className="text-center font-monospace">{avgDaily}</td>
                                                <td className="text-center text-success font-monospace">{projectedTotal.toLocaleString()}</td>
                                                <td className="text-center text-dark font-monospace">{totalLeo.toLocaleString()}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Branch Dual Axis Chart */}
                        <div className="col-12 col-xl-6">
                            <div className="stat-white-card p-3 p-md-4 h-100">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h6 className="fw-bold mb-0 text-dark">📊 Branch Run-Rate vs Projections</h6>
                                    <span className="badge bg-light text-dark border">Dual Axis Chart</span>
                                </div>
                                <div style={{ height: '300px', width: '100%' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={branchTableData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                                            <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 12 }} />
                                            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 12 }} />
                                            <Tooltip content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="recharts-custom-tooltip">
                                                            <div className="fw-bold mb-1">{label} Branch</div>
                                                            {payload.map((p, i) => (
                                                                <div key={i} style={{ color: p.color || '#fff' }}>
                                                                    {p.name}: <strong>{p.value?.toLocaleString()}</strong>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }} />
                                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                            <Bar yAxisId="left" dataKey="total" name="Total LEO" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                            <Line yAxisId="right" type="monotone" dataKey="projection" name="Projected LEO" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: '#10b981' }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 5: Exporter Clearance Dynamics (Ups & Downs) */}
                    <div className="stat-white-card p-3 p-md-4 mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h6 className="fw-bold mb-0 text-dark">🚀 Exporter Clearance Dynamics (Volume Movers)</h6>
                        </div>

                        {/* Gainers & Fallers Cards */}
                        <div className="row g-3 mb-4">
                            {/* Gainers */}
                            <div className="col-12 col-md-6">
                                <div className="p-3 rounded-3 bg-success-subtle border border-success-subtle h-100">
                                    <h6 className="fw-bold text-success mb-2 d-flex align-items-center gap-1">
                                        <span>📈</span> Top Volume Gainers (Ups)
                                    </h6>
                                    <div className="d-flex flex-column gap-2">
                                        {(reportData?.customerGainers || []).slice(0, 5).map((g, idx) => (
                                            <div key={idx} className="d-flex justify-content-between align-items-center bg-white p-2 rounded shadow-sm" style={{ fontSize: '12px' }}>
                                                <span className="fw-semibold text-truncate" style={{ maxWidth: '240px' }} title={g.customer}>
                                                    {g.customer}
                                                </span>
                                                <div className="d-flex gap-2 align-items-center">
                                                    <span className="text-muted font-monospace">{g.prev} → <strong>{g.current}</strong></span>
                                                    <span className="badge bg-success font-monospace">+{g.diff} ({g.pct}%)</span>
                                                </div>
                                            </div>
                                        ))}
                                        {(!reportData?.customerGainers || reportData.customerGainers.length === 0) && (
                                            <div className="text-muted small py-2">No volume gainers in this period.</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Fallers */}
                            <div className="col-12 col-md-6">
                                <div className="p-3 rounded-3 bg-danger-subtle border border-danger-subtle h-100">
                                    <h6 className="fw-bold text-danger mb-2 d-flex align-items-center gap-1">
                                        <span>📉</span> Top Volume Fallers (Downs)
                                    </h6>
                                    <div className="d-flex flex-column gap-2">
                                        {(reportData?.customerFallers || []).slice(0, 5).map((f, idx) => (
                                            <div key={idx} className="d-flex justify-content-between align-items-center bg-white p-2 rounded shadow-sm" style={{ fontSize: '12px' }}>
                                                <span className="fw-semibold text-truncate" style={{ maxWidth: '240px' }} title={f.customer}>
                                                    {f.customer}
                                                </span>
                                                <div className="d-flex gap-2 align-items-center">
                                                    <span className="text-muted font-monospace">{f.prev} → <strong>{f.current}</strong></span>
                                                    <span className="badge bg-danger font-monospace">{f.diff} ({f.pct}%)</span>
                                                </div>
                                            </div>
                                        ))}
                                        {(!reportData?.customerFallers || reportData.customerFallers.length === 0) && (
                                            <div className="text-muted small py-2">No volume fallers in this period.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Exporters Table */}
                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-3">
                            <input
                                type="text"
                                className="form-control form-control-sm rounded-pill px-3"
                                placeholder="🔍 Search Exporters..."
                                value={customerSearch}
                                onChange={e => setCustomerSearch(e.target.value)}
                                style={{ maxWidth: '320px' }}
                            />
                            <span className="text-muted small">Showing <strong>{filteredCustomers.length}</strong> exporters</span>
                        </div>

                        <div className="table-responsive" style={{ maxHeight: '380px' }}>
                            <table className="table table-modern align-middle mb-0">
                                <thead className="sticky-top">
                                    <tr>
                                        <th onClick={() => { setCustomerSortField('customer'); setCustomerSortDir(customerSortDir === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer' }}>
                                            Exporter Name {customerSortField === 'customer' && (customerSortDir === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="text-center" onClick={() => { setCustomerSortField('current'); setCustomerSortDir(customerSortDir === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer' }}>
                                            Current LEO {customerSortField === 'current' && (customerSortDir === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="text-center" onClick={() => { setCustomerSortField('prev'); setCustomerSortDir(customerSortDir === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer' }}>
                                            Previous LEO {customerSortField === 'prev' && (customerSortDir === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="text-center" onClick={() => { setCustomerSortField('diff'); setCustomerSortDir(customerSortDir === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer' }}>
                                            Delta {customerSortField === 'diff' && (customerSortDir === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="text-center" onClick={() => { setCustomerSortField('pct'); setCustomerSortDir(customerSortDir === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer' }}>
                                            Growth % {customerSortField === 'pct' && (customerSortDir === 'asc' ? '↑' : '↓')}
                                        </th>
                                        <th className="text-center">20'</th>
                                        <th className="text-center">40'</th>
                                        <th className="text-center">Air</th>
                                        <th className="text-center fw-bold text-primary">TEUs</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCustomers.map((c, i) => (
                                        <tr key={i}>
                                            <td className="fw-semibold text-truncate text-dark" style={{ maxWidth: '300px' }} title={c.customer}>
                                                {c.customer}
                                            </td>
                                            <td className="text-center fw-bold text-dark font-monospace">{c.current}</td>
                                            <td className="text-center text-muted font-monospace">{c.prev}</td>
                                            <td className={`text-center fw-bold font-monospace ${c.diff > 0 ? 'text-success' : c.diff < 0 ? 'text-danger' : 'text-muted'}`}>
                                                {c.diff > 0 ? `+${c.diff}` : c.diff}
                                            </td>
                                            <td className="text-center">
                                                <span className={`badge rounded-pill font-monospace ${c.diff > 0 ? 'bg-success-subtle text-success' : c.diff < 0 ? 'bg-danger-subtle text-danger' : 'bg-light text-dark'}`}>
                                                    {c.diff > 0 ? `+${c.pct}%` : `${c.pct}%`}
                                                </span>
                                            </td>
                                            <td className="text-center font-monospace">{c.c20 || 0}</td>
                                            <td className="text-center font-monospace">{c.c40 || 0}</td>
                                            <td className="text-center font-monospace">{c.air || 0}</td>
                                            <td className="text-center fw-bold text-primary font-monospace">{c.teus || 0}</td>
                                        </tr>
                                    ))}
                                    {filteredCustomers.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="text-center text-muted py-4">No exporters found matching search.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════════ */}
            {/* TAB 2: TREND & ANALYTICS                                                  */}
            {/* ══════════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'trend' && (
                <div>
                    {/* Row 1: Charts (Daily Trend & Branch Donut) */}
                    <div className="row g-4 mb-4">
                        {/* Daily Trend Area Chart */}
                        <div className="col-12 col-xl-8">
                            <div className="stat-white-card p-3 p-md-4 h-100">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h6 className="fw-bold mb-0 text-dark">📈 Daily LEO Trend & 7-Day Moving Average</h6>
                                    <span className="badge bg-light text-dark border">Daily Clearance Rate</span>
                                </div>
                                <div style={{ height: '320px', width: '100%' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={dailyTrendData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                                            <defs>
                                                <linearGradient id="leoGradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="displayDate" tick={{ fill: '#64748b', fontSize: 11 }} />
                                            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                                            <Tooltip content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="recharts-custom-tooltip">
                                                            <div className="fw-bold mb-1">{label}</div>
                                                            {payload.map((p, i) => (
                                                                <div key={i} style={{ color: p.color || '#fff' }}>
                                                                    {p.name}: <strong>{p.value}</strong>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }} />
                                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                            <Area type="monotone" dataKey="totalOoc" name="Daily LEO" stroke="#3b82f6" strokeWidth={2.5} fill="url(#leoGradient)" />
                                            <Line type="monotone" dataKey="movingAvg" name="7-Day Moving Avg" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                                            <ReferenceLine y={avgDaily} stroke="#10b981" strokeDasharray="3 3" label={{ value: `Avg: ${avgDaily}`, fill: '#10b981', fontSize: 11 }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Branch Share Donut Chart */}
                        <div className="col-12 col-xl-4">
                            <div className="stat-white-card p-3 p-md-4 h-100">
                                <h6 className="fw-bold mb-3 text-dark">🏢 Branch Volume Share</h6>
                                <div style={{ height: '320px', width: '100%', position: 'relative' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={branchDonutData}
                                                cx="50%"
                                                cy="45%"
                                                innerRadius={65}
                                                outerRadius={100}
                                                paddingAngle={4}
                                                dataKey="value"
                                            >
                                                {branchDonutData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const d = payload[0];
                                                    const pct = totalLeo > 0 ? ((d.value / totalLeo) * 100).toFixed(1) : 0;
                                                    return (
                                                        <div className="recharts-custom-tooltip">
                                                            <div className="fw-bold">{d.name}</div>
                                                            <div>Total: <strong>{d.value?.toLocaleString()}</strong> ({pct}%)</div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }} />
                                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>

                                    {/* Absolute Centered Donut Badge */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: '45%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            textAlign: 'center',
                                            pointerEvents: 'none',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <span style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
                                            {(totalLeo || 0).toLocaleString()}
                                        </span>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: '2px' }}>
                                            Total LEO
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Exporter Monthly Matrix (Apr to Mar) */}
                    <div className="stat-white-card p-3 p-md-4">
                        <h6 className="fw-bold mb-3 text-dark">📊 Exporter Monthly Trends (Apr – Mar)</h6>
                        <div className="table-responsive" style={{ maxHeight: '420px' }}>
                            <table className="table table-modern align-middle mb-0">
                                <thead className="sticky-top">
                                    <tr>
                                        <th>Exporter Name</th>
                                        {MONTH_NAMES.map(m => (
                                            <th key={m.key} className="text-center" style={{ minWidth: '48px' }}>{m.name}</th>
                                        ))}
                                        <th className="text-center fw-bold text-dark bg-light">FY Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(reportData?.customerMonthlySummary || []).map((row, idx) => (
                                        <tr key={idx}>
                                            <td className="fw-semibold text-truncate text-dark" style={{ maxWidth: '260px' }} title={row.customer}>
                                                {row.customer}
                                            </td>
                                            {MONTH_NAMES.map(m => (
                                                <td key={m.key} className="text-center font-monospace">
                                                    {row.months?.[m.key] ? (
                                                        <span className="badge bg-primary-subtle text-primary rounded-pill px-2">{row.months[m.key]}</span>
                                                    ) : (
                                                        <span className="text-muted opacity-25">-</span>
                                                    )}
                                                </td>
                                            ))}
                                            <td className="text-center fw-bold text-dark bg-light font-monospace">{row.total || 0}</td>
                                        </tr>
                                    ))}
                                    {(!reportData?.customerMonthlySummary || reportData.customerMonthlySummary.length === 0) && (
                                        <tr>
                                            <td colSpan={14} className="text-center text-muted py-4">No monthly trends data available.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════════ */}
            {/* TAB 4: EXCEPTIONS MANAGEMENT                                              */}
            {/* ══════════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'exceptions' && (
                <div className="stat-white-card p-3 p-md-4">
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-3">
                        <div>
                            <h6 className="fw-bold mb-0 text-dark">⚠️ Export Operational Exceptions Queue</h6>
                            <span className="text-muted small">Cleared LEO export jobs requiring immediate operational follow-up</span>
                        </div>
                        <span className="badge bg-danger fs-6 rounded-pill px-3 py-2">{filteredExceptions.length} Flagged Jobs</span>
                    </div>

                    {/* Filter Pills */}
                    <div className="d-flex flex-wrap gap-2 mb-3">
                        {[
                            { id: 'all', label: `All Exceptions (${reportData?.exceptionsSummary?.total || 0})` },
                            { id: 'handover', label: `Handover Pending (${reportData?.exceptionsSummary?.handoverPending || 0})` },
                            { id: 'railOut', label: `Rail Out Pending (${reportData?.exceptionsSummary?.railOutPending || 0})` },
                            { id: 'billing', label: `Billing Pending (${reportData?.exceptionsSummary?.billingPending || 0})` },
                            { id: 'drawback', label: `Drawback Pending (${reportData?.exceptionsSummary?.drawbackPending || 0})` },
                            { id: 'fines', label: `Fines / Penalties (${reportData?.exceptionsSummary?.finesOrPenalties || 0})` }
                        ].map(pill => (
                            <button
                                key={pill.id}
                                onClick={() => setExceptionFilter(pill.id)}
                                className={`btn btn-sm rounded-pill px-3 fw-semibold ${
                                    exceptionFilter === pill.id
                                        ? 'btn-danger text-white shadow-sm'
                                        : 'btn-light border text-secondary shadow-sm'
                                }`}
                                style={{ fontSize: '12px' }}
                            >
                                {pill.label}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="mb-3">
                        <input
                            type="text"
                            className="form-control form-control-sm rounded-pill px-3"
                            placeholder="🔍 Filter by Job No, SB No, Exporter, or Branch..."
                            value={exceptionSearch}
                            onChange={e => setExceptionSearch(e.target.value)}
                            style={{ maxWidth: '360px' }}
                        />
                    </div>

                    {/* Table */}
                    <div className="table-responsive">
                        <table className="table table-modern align-middle mb-0">
                            <thead>
                                 <tr>
                                     <th>Job No</th>
                                     <th>SB No & Date</th>
                                     <th>LEO Date</th>
                                     <th>Exporter</th>
                                     <th>Branch</th>
                                     <th>Mode & Type</th>
                                     <th>Detailed Status</th>
                                     <th>Identified Issues</th>
                                 </tr>
                            </thead>
                            <tbody>
                                {filteredExceptions.map(item => (
                                    <tr key={item._id}>
                                        <td className="fw-bold text-primary font-monospace">
                                            <span
                                                onClick={() => navigate(`/export-jobs`)}
                                                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                title="Click to view job in Export Jobs"
                                            >
                                                {item.job_no || item.jobNumber}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="fw-semibold text-dark font-monospace">{item.sb_no || '—'}</div>
                                            <div className="text-muted small font-monospace">{item.sb_date || ''}</div>
                                        </td>
                                        <td className="fw-semibold text-success font-monospace">{item.leoDate || '—'}</td>
                                        <td className="text-truncate text-dark" style={{ maxWidth: '240px' }} title={item.exporter}>
                                            {item.exporter}
                                        </td>
                                        <td><span className="badge bg-light text-dark border">{item.branch_code}</span></td>
                                        <td>
                                            <span className="badge bg-primary-subtle text-primary me-1">{item.mode}</span>
                                            <span className="badge bg-secondary-subtle text-secondary">{item.consignmentType}</span>
                                        </td>
                                        <td><span className="badge bg-info-subtle text-info-emphasis">{item.detailedStatus || item.status}</span></td>
                                        <td>
                                            <div className="d-flex flex-wrap gap-1">
                                                {item.isHandoverPending && <span className="badge bg-danger rounded-pill">Handover Pending</span>}
                                                {item.isRailOutPending && <span className="badge bg-warning text-dark rounded-pill">Rail Out Pending</span>}
                                                {item.isBillingPending && <span className="badge bg-info text-dark rounded-pill">Billing Pending</span>}
                                                {item.isDrawbackPending && <span className="badge bg-secondary rounded-pill">Drawback Pending</span>}
                                                {item.hasFineOrPenalty && <span className="badge bg-danger rounded-pill">Fine: ₹{item.fine_amount}</span>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredExceptions.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="text-center text-muted py-4">No exceptions found under selected filter.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════════ */}
            {/* TAB 5: DETAILED JOBS GRID                                                 */}
            {/* ══════════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'detailed' && (
                <div className="stat-white-card p-3 p-md-4">
                    <ImportDetailedSummaryTab
                        detailedJobs={reportData?.detailedJobs || []}
                        reportType="export_leo_summary"
                    />
                </div>
            )}
        </div>
    );
};

export default ExportLeoSummaryReport;
