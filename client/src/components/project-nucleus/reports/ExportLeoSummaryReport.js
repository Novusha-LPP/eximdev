import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import axios from 'axios';
import { BranchContext } from '../../../contexts/BranchContext';
import {
    ResponsiveContainer, ComposedChart, Cell, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, Area, PieChart, Pie, ReferenceLine
} from 'recharts';
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

// ─── Styles from Fleet Utilization ──────────────────────────────────────────────

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');

.fleet-root {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    display: flex; flex-direction: column; gap: 28px; padding: 0; background: transparent;
    color: #1e293b;
}

/* Glass Tabs */
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
    transform: translateY(-6px) scale(1.005);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 1);
    border-color: rgba(226, 232, 240, 1);
    z-index: 4;
}
.fleet-card:hover::before {
    transform: scale(1.3);
    opacity: 0.3;
}
.fleet-card[data-hl="true"] {
    background: rgba(254, 242, 242, 0.8);
    border-color: rgba(239, 68, 68, 0.15);
}
.fleet-card[data-hl-blue="true"] {
    background: rgba(239, 246, 255, 0.8);
    border-color: rgba(59, 130, 246, 0.15);
}

/* Hero KPI Grid */
.fleet-hero-grid {
    display: grid;
    grid-template-columns: minmax(480px, 2fr) minmax(240px, 1fr) minmax(240px, 1fr);
    gap: 18px;
    margin-bottom: 28px;
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
    padding: 24px 28px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    position: relative;
    z-index: 100;
}

/* Table Wrapper */
.fleet-table-wrap { background: rgba(255,255,255,0.9); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 24px; border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 12px 40px rgba(0,0,0,0.03); overflow: hidden; }
.fleet-table { width: 100%; border-collapse: separate; border-spacing: 0; }
.fleet-table th { background: linear-gradient(180deg, rgba(248,250,252,0.95) 0%, rgba(241,245,249,0.95) 100%); color: #0f172a; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; padding: 16px 20px; border-bottom: 1px solid rgba(226,232,240,0.6); white-space: nowrap; }
.fleet-table td { color: #1e293b; font-weight: 500; font-size: 14px; padding: 14px 20px; border-bottom: 1px solid rgba(226,232,240,0.4); transition: background 0.2s; }
.fleet-table tr:hover td { background: rgba(79,70,229,0.03); }
.fleet-table tr:last-child td { border-bottom: none; }

/* Status Pills */
.status-pill-v2 { display: inline-flex; align-items: center; padding: 5px 12px; border-radius: 999px; font-weight: 600; font-size: 11.5px; letter-spacing: 0.02em; text-transform: uppercase; transition: all 0.2s; font-family: 'Outfit', sans-serif; }
.status-pill-v2[data-variant="neutral"] { background: rgba(148,163,184,0.15); color: #475569; border: 1px solid rgba(148,163,184,0.2); }
.status-pill-v2[data-variant="success"] { background: rgba(16,185,129,0.15); color: #059669; border: 1px solid rgba(16,185,129,0.2); box-shadow: 0 0 10px rgba(16,185,129,0.1); }
.status-pill-v2[data-variant="warning"] { background: rgba(245,158,11,0.15); color: #d97706; border: 1px solid rgba(245,158,11,0.2); box-shadow: 0 0 10px rgba(245,158,11,0.1); }
.status-pill-v2[data-variant="info"]    { background: rgba(14,165,233,0.15); color: #0284c7; border: 1px solid rgba(14,165,233,0.2); box-shadow: 0 0 10px rgba(14,165,233,0.1); }
.status-pill-v2[data-variant="error"]   { background: rgba(239,68,68,0.15); color: #dc2626; border: 1px solid rgba(239,68,68,0.2); box-shadow: 0 0 10px rgba(239,68,68,0.1); }

/* KPI Info Tooltip */
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
    width: 320px;
    pointer-events: none;
}
.kpi-info-wrap:hover .kpi-info-tip { opacity: 1; visibility: visible; transform: translateY(0); pointer-events: auto; }

/* Chart */
.fleet-chart-card { background: rgba(255,255,255,0.9); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-radius: 24px; border: 1px solid rgba(255,255,255,0.6); padding: 28px; box-shadow: 0 12px 40px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.9); }
.fleet-chart-card h3 { color: #0f172a; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 17px; margin-bottom: 4px; }
.fleet-chart-card .sub { color: #64748b; font-weight: 500; font-size: 13.5px; }

/* Tooltip */
.fleet-tooltip-v2 { background: rgba(255,255,255,0.95) !important; backdrop-filter: blur(10px) !important; border: 1px solid rgba(226,232,240,0.6) !important; border-radius: 16px !important; padding: 14px 18px !important; box-shadow: 0 12px 40px rgba(0,0,0,0.08) !important; font-family: 'Inter', sans-serif !important; }

/* Action Buttons */
.fleet-export-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 12px; font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 13.5px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4,0,0.2,1); border: 1px solid #10b981; background: rgba(16, 185, 129, 0.08); color: #059669; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
.fleet-export-btn:hover:not(:disabled) { background: #10b981; color: #fff; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(16,185,129,0.25); }
.fleet-export-btn:disabled { opacity: 0.65; cursor: not-allowed; }

.modern-refresh-btn { display: inline-flex; align-items: center; gap: 7px; background: rgba(79, 70, 229, 0.08); color: #4f46e5; border: 1px solid rgba(79, 70, 229, 0.2); padding: 10px 18px; border-radius: 12px; font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 13.5px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.modern-refresh-btn:hover { background: #4f46e5; color: #ffffff; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(79, 70, 229, 0.25); }

.mono { font-family: 'Outfit', sans-serif; letter-spacing: -0.02em; }

.mini-custom-scroll::-webkit-scrollbar { width: 4px; }
.mini-custom-scroll::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.03); border-radius: 4px; }
.mini-custom-scroll::-webkit-scrollbar-thumb { background: rgba(79, 70, 229, 0.25); border-radius: 4px; }
.mini-custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(79, 70, 229, 0.5); }

/* Loading */
.fleet-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px 20px; background: rgba(255,255,255,0.7); backdrop-filter: blur(24px); border-radius: 24px; border: 1px solid rgba(255,255,255,0.6); }
.fleet-spinner { width: 56px; height: 56px; border: 3px solid rgba(79,70,229,0.15); border-top-color: #4f46e5; border-radius: 50%; animation: fleet-spin 0.8s cubic-bezier(0.4,0,0.2,1) infinite; }
@keyframes fleet-spin { to { transform: rotate(360deg); } }
`;

// ─── Utility Functions ──────────────────────────────────────────────────────────

const computeElapsedDays = (filterType, selectedYear, selectedMonth, selectedQuarter, dateRange, selectedDay, dailyDataLen, selectedFinancialYear) => {
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();
    const selYear = parseInt(selectedYear) || todayYear;

    let totalDays = 30, elapsedDays = 30;

    if (filterType === 'day') {
        totalDays = 1; elapsedDays = 1;
    } else if (filterType === 'week') {
        totalDays = 7;
        const refDate = selectedDay ? new Date(selectedDay) : today;
        const dayOfWeek = refDate.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(refDate);
        monday.setDate(refDate.getDate() + mondayOffset);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        if (today >= monday && today <= sunday) {
            const todayDayOfWeek = today.getDay();
            const daysFromMon = todayDayOfWeek === 0 ? 7 : todayDayOfWeek;
            elapsedDays = Math.max(1, Math.min(7, daysFromMon));
        } else if (today < monday) {
            elapsedDays = 0;
        } else {
            elapsedDays = 7;
        }
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
    } else if (filterType === 'fin-year' || filterType === 'financial-year') {
        const fy = selectedFinancialYear || '26-27';
        const startY = 2000 + parseInt(fy.split('-')[0]);
        const fyStart = new Date(Date.UTC(startY, 3, 1, 0, 0, 0, 0));
        const fyEnd = new Date(Date.UTC(startY + 1, 2, 31, 23, 59, 59, 999));
        totalDays = Math.round((fyEnd - fyStart) / 86400000) + 1;
        if (today >= fyStart && today <= fyEnd) {
            elapsedDays = Math.max(1, Math.round((today - fyStart) / 86400000) + 1);
        } else if (today < fyStart) {
            elapsedDays = 0;
        } else {
            elapsedDays = totalDays;
        }
    } else {
        if (dateRange?.start && dateRange?.end) {
            const sDate = new Date(dateRange.start);
            const eDate = new Date(dateRange.end);

            // Check if the range falls within a single month (e.g. Aug 1 to Aug 24)
            const isSameMonth = sDate.getFullYear() === eDate.getFullYear() && sDate.getMonth() === eDate.getMonth();
            const daysInSelectedMonth = new Date(sDate.getFullYear(), sDate.getMonth() + 1, 0).getDate();

            // If the date range is within the same month, totalDays for monthly projection is the full month's days (e.g. 31)
            // Otherwise, totalDays is the full date range span
            totalDays = isSameMonth ? daysInSelectedMonth : Math.max(1, Math.round((eDate - sDate) / 86400000) + 1);

            if (today >= sDate && today <= eDate) {
                elapsedDays = Math.max(1, Math.round((today - sDate) / 86400000) + 1);
            } else if (today < sDate) {
                elapsedDays = 0;
            } else {
                elapsedDays = Math.max(1, Math.round((eDate - sDate) / 86400000) + 1);
            }
        } else if (dailyDataLen > 0) {
            const daysInCurrentMonth = new Date(todayYear, todayMonth + 1, 0).getDate();
            totalDays = daysInCurrentMonth;
            elapsedDays = Math.min(todayDate, dailyDataLen);
        }
    }
    return { totalDays, elapsedDays };
};

/** Performance color theme based on percentage vs previous month/benchmark */
const getColorTheme = (perfVal) => {
    if (perfVal === null || perfVal === undefined || isNaN(perfVal)) return {
        color: '#64748b', bg: 'rgba(255, 255, 255, 0.85)', border: '1px solid rgba(226, 232, 240, 0.8)', badgeBg: null, performanceLabel: null
    };
    const rawChange = perfVal - 100;
    const absChange = Math.abs(rawChange);
    const arrow = perfVal >= 100 ? '▲' : '▼';
    const displayChange = absChange < 1 && absChange > 0 ? absChange.toFixed(1) : Math.round(absChange);
    const performanceLabel = `${arrow} ${perfVal >= 100 ? '+' : '-'}${displayChange}%`;

    if (perfVal >= 100) return {
        color: '#059669', bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, transparent 100%)',
        border: '1px solid rgba(16, 185, 129, 0.25)', badgeBg: 'rgba(16, 185, 129, 0.12)', performanceLabel
    };
    if (perfVal >= 90) return {
        color: '#d97706', bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, transparent 100%)',
        border: '1px solid rgba(245, 158, 11, 0.25)', badgeBg: 'rgba(245, 158, 11, 0.12)', performanceLabel
    };
    return {
        color: '#dc2626', bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, transparent 100%)',
        border: '1px solid rgba(239, 68, 68, 0.25)', badgeBg: 'rgba(239, 68, 68, 0.12)', performanceLabel
    };
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
    const { branches: contextBranches = [] } = useContext(BranchContext) || {};
    const allDiscoveredBranchesRef = useRef(new Set());
    const activeCat = String(category !== 'all' ? category : (selectedCategory || 'all')).toUpperCase();
    const isSeaMode = activeCat === 'SEA';
    const isAirMode = activeCat === 'AIR';
    const isAllModes = !isSeaMode && !isAirMode;

    // Single-day / daywise check: ONLY daywise hides projection; every other filter shows projection
    const isDayWise = filterType === 'day' || (filterType === 'custom' && Boolean(dateRange?.start && dateRange?.end && dateRange.start === dateRange.end));

    // Tab state
    const [activeTab, setActiveTab] = useState('dashboard');

    // If daywise selected while on projection tab, fall back to dashboard
    useEffect(() => {
        if (isDayWise && activeTab === 'projection') {
            setActiveTab('dashboard');
        }
    }, [isDayWise, activeTab]);

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
    const [importerBranchFilter, setImporterBranchFilter] = useState('all');
    const [monthlySearch, setMonthlySearch] = useState('');
    const [monthlySortField, setMonthlySortField] = useState('total');
    const [monthlySortDir, setMonthlySortDir] = useState('desc');
    const [monthlyVolumeFilter, setMonthlyVolumeFilter] = useState('all');
    const [exceptionFilter, setExceptionFilter] = useState('all');
    const [exceptionBranchFilter, setExceptionBranchFilter] = useState('all');
    const [exceptionLocationFilter, setExceptionLocationFilter] = useState('all');
    const [exceptionModeFilter, setExceptionModeFilter] = useState('all');
    const [exceptionSearch, setExceptionSearch] = useState('');
    const [kpiSelectedBranch, setKpiSelectedBranch] = useState('all');

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
                    setError(res.data?.message || 'Failed to load Let Export Order (LEO) report data.');
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

    // ─── Calculations & Projections ─────────────────────────────────────────────

    const { totalDays, elapsedDays } = useMemo(() => {
        return computeElapsedDays(
            filterType,
            selectedYear,
            selectedMonth,
            selectedQuarter,
            dateRange,
            selectedDay,
            reportData?.dailyData?.length || 0,
            selectedFinancialYear
        );
    }, [filterType, selectedYear, selectedMonth, selectedQuarter, dateRange, selectedDay, reportData, selectedFinancialYear]);

    const totalLeo = reportData?.totalLeo || reportData?.totalOoc || 0;
    const totalTeus = reportData?.totalTeus || 0;
    const stats = reportData?.stats || {};
    const prevStats = reportData?.prevStats || {};

    const avgDaily = useMemo(() => {
        if (!elapsedDays || elapsedDays <= 0) return 0;
        return Math.round((totalLeo / elapsedDays) * 10) / 10;
    }, [totalLeo, elapsedDays]);

    const prevTotal = prevStats.totalLeo || prevStats.totalOoc || 0;
    const prevAvgDaily = prevStats.avgDaily || 0;

    // Projection for all non-daywise filters (week, month, quarter, year, fin-year, custom multi-day)
    const projectedTotal = useMemo(() => {
        if (isDayWise) return totalLeo;
        if (!elapsedDays || elapsedDays <= 0) return 0;
        const rate = totalLeo / elapsedDays;
        return Math.round(rate * totalDays);
    }, [isDayWise, totalLeo, elapsedDays, totalDays]);

    const totalGrowthPct = useMemo(() => {
        if (!prevTotal || prevTotal <= 0) return totalLeo > 0 ? '▲ +100%' : '0%';
        const comparisonBase = isDayWise ? totalLeo : projectedTotal;
        const diff = comparisonBase - prevTotal;
        const pct = Math.round((diff / prevTotal) * 100);
        return `${pct >= 0 ? '▲ +' : '▼ '}${pct}%`;
    }, [isDayWise, totalLeo, projectedTotal, prevTotal]);

    // Projection performance theme vs prev
    const projectionPerfVal = useMemo(() => {
        if (!prevTotal || prevTotal <= 0) return 100;
        return (projectedTotal / prevTotal) * 100;
    }, [projectedTotal, prevTotal]);

    const projectionTheme = useMemo(() => getColorTheme(projectionPerfVal), [projectionPerfVal]);

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

    // Available branches across context, reportData and detailed jobs
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

    // Branch table data with projections and ▲ Up / ▼ Down arrows for all filters except daywise
    const branchTableData = useMemo(() => {
        const list = reportData?.branchWise || [];
        const map = new Map();

        list.forEach(b => {
            const bName = String(b.name || b.branch || b.branch_code || 'Unassigned').trim();
            map.set(bName.toUpperCase(), { ...b, name: bName });
        });

        (availableBranches || []).forEach(ab => {
            const abKey = String(ab).trim().toUpperCase();
            if (!map.has(abKey) && abKey !== 'ALL') {
                map.set(abKey, {
                    name: ab,
                    total: 0,
                    c20: 0,
                    c40: 0,
                    lcl: 0,
                    air: 0,
                    teus: 0,
                    prevTotal: 0
                });
            }
        });

        return Array.from(map.values()).map(b => {
            const bTotal = b.total || 0;
            const bAvg = elapsedDays > 0 ? Math.round((bTotal / elapsedDays) * 10) / 10 : 0;
            const bProj = isDayWise
                ? bTotal
                : (elapsedDays > 0 ? Math.round((bTotal / elapsedDays) * totalDays) : 0);

            const prev = b.prevTotal || 0;
            const diff = bProj - prev;
            let pct = 0;
            let arrow = '—';
            let label = '0%';
            let status = 'On Track';
            let statusVariant = 'neutral';

            if (prev > 0) {
                pct = Math.round((diff / prev) * 100);
                arrow = pct >= 0 ? '▲' : '▼';
                label = `${arrow} ${pct >= 0 ? '+' : ''}${pct}%`;
                if (pct >= 0) {
                    status = 'Exceeding Target';
                    statusVariant = 'success';
                } else if (pct >= -10) {
                    status = 'Near Target';
                    statusVariant = 'warning';
                } else {
                    status = 'Behind Pace';
                    statusVariant = 'error';
                }
            } else if (bProj > 0) {
                pct = 100;
                arrow = '▲';
                label = '▲ +100%';
                status = 'New Volume';
                statusVariant = 'success';
            } else {
                label = '0%';
                status = 'No Clearances';
                statusVariant = 'neutral';
            }

            return {
                ...b,
                total: bTotal,
                c20: b.c20 || 0,
                c40: b.c40 || 0,
                lcl: b.lcl || 0,
                air: b.air || 0,
                teus: b.teus || 0,
                avgDaily: bAvg,
                projection: bProj,
                prevTotal: prev,
                variance: diff,
                changePct: pct,
                changeArrow: arrow,
                changeLabel: label,
                status,
                statusVariant
            };
        }).sort((a, b) => (b.total || 0) - (a.total || 0));
    }, [reportData, availableBranches, elapsedDays, totalDays, isDayWise]);

    // Location & Station bifurcation grouped by branch and as flat list with containers / modes
    const branchLocationBifurcation = useMemo(() => {
        const jobs = reportData?.detailedJobs || [];
        const branchMap = {};
        const allLocations = [];

        (availableBranches || []).forEach(ab => {
            const br = String(ab).toUpperCase().trim();
            if (br && br !== 'ALL') {
                branchMap[br] = {
                    branch: br,
                    total: 0,
                    locations: {},
                    sortedLocations: []
                };
            }
        });

        jobs.forEach(j => {
            const br = String(j.branch_code || j.branch || 'Unassigned').toUpperCase().trim();
            const loc = String(j.custom_house || j.location || j.port_of_loading || 'Unassigned').trim();
            const m = String(j.mode || '').toLowerCase();
            const cType = String(j.consignment_type || '').toUpperCase();
            const isAir = m.includes('air');
            const isLcl = cType === 'LCL';

            let c20 = 0, c40 = 0;
            if (Array.isArray(j.container_nos)) {
                j.container_nos.forEach(c => {
                    const s = String(c?.size || '');
                    if (s.startsWith('20')) c20++;
                    else if (s.startsWith('40')) c40++;
                });
            } else if (j.sizeCounts) {
                c20 = j.sizeCounts.ft20 || 0;
                c40 = j.sizeCounts.ft40 || 0;
            }
            const teus = Number(j.total_teus) || Number(j.teus) || (c20 + c40 * 2) || (isLcl || isAir ? 0 : 1);

            if (!branchMap[br]) {
                branchMap[br] = {
                    branch: br,
                    total: 0,
                    locations: {},
                    sortedLocations: []
                };
            }
            branchMap[br].total += 1;

            if (!branchMap[br].locations[loc]) {
                branchMap[br].locations[loc] = {
                    name: loc,
                    branch: br,
                    cleared: 0,
                    c20: 0,
                    c40: 0,
                    lcl: 0,
                    air: 0,
                    teus: 0
                };
            }
            branchMap[br].locations[loc].cleared += 1;
            branchMap[br].locations[loc].c20 += c20;
            branchMap[br].locations[loc].c40 += c40;
            if (isAir) branchMap[br].locations[loc].air += 1;
            else if (isLcl) branchMap[br].locations[loc].lcl += 1;
            branchMap[br].locations[loc].teus += teus;
        });

        Object.keys(branchMap).forEach(br => {
            const locs = Object.values(branchMap[br].locations);
            if (locs.length === 0) {
                const defaultLoc = {
                    name: `${br} Station`,
                    branch: br,
                    cleared: 0,
                    c20: 0,
                    c40: 0,
                    lcl: 0,
                    air: 0,
                    teus: 0
                };
                branchMap[br].sortedLocations = [defaultLoc];
                allLocations.push(defaultLoc);
            } else {
                const sorted = locs.sort((a, b) => b.cleared - a.cleared);
                branchMap[br].sortedLocations = sorted;
                sorted.forEach(l => allLocations.push(l));
            }
        });

        allLocations.sort((a, b) => (b.cleared || 0) - (a.cleared || 0));

        return {
            branchMap,
            allLocations
        };
    }, [reportData, availableBranches]);

    // Detailed Location / ICD Station Projections for Projection Report
    const locationProjectionDetails = useMemo(() => {
        if (isDayWise || !elapsedDays || elapsedDays <= 0) return [];
        const jobs = reportData?.detailedJobs || [];
        const map = {};
        jobs.forEach(j => {
            const loc = String(j.custom_house || j.location || j.port_of_loading || 'Unassigned').trim();
            const br = String(j.branch_code || j.branch || 'Unassigned').toUpperCase().trim();
            const m = String(j.mode || '').toLowerCase();
            const cType = String(j.consignment_type || '').toUpperCase();

            if (!map[loc]) {
                map[loc] = {
                    location: loc,
                    branch: br,
                    cleared: 0,
                    seaFcl: 0,
                    seaLcl: 0,
                    air: 0,
                    teus: 0
                };
            }
            map[loc].cleared += 1;
            if (m.includes('air')) map[loc].air += 1;
            else if (cType === 'LCL') map[loc].seaLcl += 1;
            else map[loc].seaFcl += 1;
            map[loc].teus += (Number(j.total_teus) || Number(j.teus) || (cType === 'LCL' ? 0 : 1));
        });

        return Object.values(map).map(locItem => {
            const proj = Math.round((locItem.cleared / elapsedDays) * totalDays);
            const projFcl = Math.round((locItem.seaFcl / elapsedDays) * totalDays);
            const projLcl = Math.round((locItem.seaLcl / elapsedDays) * totalDays);
            const projAir = Math.round((locItem.air / elapsedDays) * totalDays);
            const projTeus = Math.round((locItem.teus / elapsedDays) * totalDays);
            const avgDailyRate = (locItem.cleared / elapsedDays).toFixed(1);
            const sharePct = projectedTotal > 0 ? Math.round((proj / projectedTotal) * 100) : 0;

            return {
                ...locItem,
                projection: proj,
                projFcl,
                projLcl,
                projAir,
                projTeus,
                avgDaily: avgDailyRate,
                sharePct
            };
        }).sort((a, b) => b.projection - a.projection);
    }, [reportData, isDayWise, elapsedDays, totalDays, projectedTotal]);

    // Available branches in customerWise data
    const exporterBranches = useMemo(() => {
        const raw = reportData?.customerWise || [];
        const set = new Set();
        raw.forEach(c => {
            if (c.branch && c.branch !== 'All' && c.branch !== 'Unassigned') {
                set.add(c.branch);
            }
        });
        if (set.size === 0 && reportData?.branchWise) {
            reportData.branchWise.forEach(b => { if (b.name) set.add(b.name); });
        }
        return Array.from(set).sort();
    }, [reportData]);

    // Sorted & filtered customers
    const filteredCustomers = useMemo(() => {
        const list = reportData?.customerWise || [];
        return list
            .filter(c => {
                if (importerBranchFilter !== 'all' && c.branch && c.branch.toUpperCase() !== importerBranchFilter.toUpperCase()) {
                    return false;
                }
                if (customerSearch) {
                    const q = customerSearch.toLowerCase();
                    const matchName = c.customer?.toLowerCase().includes(q);
                    const matchBranch = c.branch?.toLowerCase().includes(q);
                    const matchLoc = c.location?.toLowerCase().includes(q);
                    const matchPort = c.port?.toLowerCase().includes(q);
                    if (!matchName && !matchBranch && !matchLoc && !matchPort) return false;
                }
                return true;
            })
            .sort((a, b) => {
                let vA = a[customerSortField];
                let vB = b[customerSortField];
                if (typeof vA === 'string') {
                    return customerSortDir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
                }
                return customerSortDir === 'asc' ? (vA || 0) - (vB || 0) : (vB || 0) - (vA || 0);
            });
    }, [reportData, customerSearch, customerSortField, customerSortDir, importerBranchFilter]);

    // Sorted & filtered monthly trends customers
    const filteredMonthlyCustomers = useMemo(() => {
        const raw = reportData?.customerMonthlySummary || [];
        return raw
            .filter(row => {
                if (monthlySearch && !row.customer?.toLowerCase().includes(monthlySearch.toLowerCase())) {
                    return false;
                }
                const total = row.total || 0;
                if (monthlyVolumeFilter === 'high' && total < 50) return false;
                if (monthlyVolumeFilter === 'med' && (total < 10 || total >= 50)) return false;
                if (monthlyVolumeFilter === 'low' && (total < 1 || total >= 10)) return false;
                return true;
            })
            .sort((a, b) => {
                let vA, vB;
                if (monthlySortField === 'customer') {
                    vA = a.customer || '';
                    vB = b.customer || '';
                    return monthlySortDir === 'asc' ? vA.localeCompare(vB) : vB.localeCompare(vA);
                } else if (monthlySortField === 'total') {
                    vA = a.total || 0;
                    vB = b.total || 0;
                } else {
                    vA = a.months?.[monthlySortField] || 0;
                    vB = b.months?.[monthlySortField] || 0;
                }
                return monthlySortDir === 'asc' ? vA - vB : vB - vA;
            });
    }, [reportData, monthlySearch, monthlySortField, monthlySortDir, monthlyVolumeFilter]);

    // Daily trend data with 7-day moving avg
    const dailyTrendData = useMemo(() => {
        const raw = reportData?.dailyData || [];
        return raw.map((d, i, arr) => {
            const windowSlice = arr.slice(Math.max(0, i - 6), i + 1);
            const sum = windowSlice.reduce((acc, curr) => acc + (curr.totalOoc || curr.totalLeo || 0), 0);
            const mAvg = Math.round((sum / windowSlice.length) * 10) / 10;
            return {
                ...d,
                displayDate: d.date?.slice(5),
                totalLeo: d.totalOoc || d.totalLeo || 0,
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

    // Active exception summary analytics & branch/station drill-down stats (LEO Missing Only)
    const activeExceptionStats = useMemo(() => {
        const baseList = reportData?.exceptionsList || [];
        const totalCount = baseList.length;
        const branchCounts = {};
        let totalFines = 0;

        baseList.forEach(item => {
            const br = String(item.branch_code || item.branch || 'Unassigned').toUpperCase().trim();
            branchCounts[br] = (branchCounts[br] || 0) + 1;
            totalFines += (Number(item.fine_amount) || 0) + (Number(item.penalty_amount) || 0);
        });

        const sortedBranches = Object.entries(branchCounts).sort((a, b) => b[1] - a[1]);

        // Branch-scoped items for Level 2 drilldown
        const branchScopedList = baseList.filter(item => {
            if (exceptionBranchFilter && exceptionBranchFilter !== 'all') {
                const br = String(item.branch_code || item.branch || 'Unassigned').toUpperCase().trim();
                if (br !== exceptionBranchFilter) return false;
            }
            return true;
        });

        const branchScopedCount = branchScopedList.length;
        const locationCounts = {};
        const clientCounts = {};
        let seaFcl = 0, seaLcl = 0, airCount = 0;

        branchScopedList.forEach(item => {
            const loc = String(item.location || item.custom_house || item.port_of_loading || 'Unassigned').trim();
            locationCounts[loc] = (locationCounts[loc] || 0) + 1;

            const client = item.exporter || item.importer || 'Unknown';
            clientCounts[client] = (clientCounts[client] || 0) + 1;

            const m = String(item.mode || '').toLowerCase();
            const cType = String(item.consignment_type || '').toUpperCase();
            if (m.includes('air')) airCount++;
            else if (cType === 'LCL') seaLcl++;
            else seaFcl++;
        });

        const sortedLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]);
        const sortedTopClients = Object.entries(clientCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);

        return {
            totalCount,
            sortedBranches,
            branchScopedCount,
            sortedLocations,
            sortedTopClients,
            seaFcl,
            seaLcl,
            airCount,
            seaCount: seaFcl + seaLcl,
            totalFines
        };
    }, [reportData, exceptionBranchFilter]);

    // Filtered exceptions (LEO Missing Only)
    const filteredExceptions = useMemo(() => {
        const list = reportData?.exceptionsList || [];
        return list.filter(item => {
            if (exceptionBranchFilter && exceptionBranchFilter !== 'all') {
                const itemBranch = String(item.branch_code || item.branch || 'Unassigned').toUpperCase().trim();
                if (itemBranch !== exceptionBranchFilter) return false;
            }

            if (exceptionLocationFilter && exceptionLocationFilter !== 'all') {
                const itemLoc = String(item.location || item.custom_house || item.port_of_loading || 'Unassigned').trim();
                if (itemLoc !== exceptionLocationFilter) return false;
            }

            if (exceptionModeFilter && exceptionModeFilter !== 'all') {
                const m = String(item.mode || '').toLowerCase();
                const cType = String(item.consignment_type || '').toUpperCase();
                if (exceptionModeFilter === 'air' && !m.includes('air')) return false;
                if (exceptionModeFilter === 'sea' && m.includes('air')) return false;
                if (exceptionModeFilter === 'fcl' && (m.includes('air') || cType === 'LCL')) return false;
                if (exceptionModeFilter === 'lcl' && (m.includes('air') || cType !== 'LCL')) return false;
            }

            if (exceptionSearch) {
                const q = exceptionSearch.toLowerCase();
                const matchJob = item.job_no?.toLowerCase().includes(q);
                const matchBe = (item.be_no || item.sb_no)?.toLowerCase().includes(q);
                const matchImp = (item.importer || item.exporter)?.toLowerCase().includes(q);
                const matchBr = item.branch_code?.toLowerCase().includes(q);
                const matchLoc = (item.location || item.custom_house || item.port_of_loading)?.toLowerCase().includes(q);
                if (!matchJob && !matchBe && !matchImp && !matchBr && !matchLoc) return false;
            }
            return true;
        });
    }, [reportData, exceptionBranchFilter, exceptionLocationFilter, exceptionModeFilter, exceptionSearch]);

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

    // ─── Navigation Tabs ────────────────────────────────────────────────────────

    const navTabs = useMemo(() => [
        { id: 'dashboard', label: '📊 Operations Dashboard' },
        ...(!isDayWise ? [
            { id: 'projection', label: '🎯 Projection Report' }
        ] : []),
        { id: 'trend', label: '📈 Trend & Analytics' },
        { id: 'exceptions', label: `⚠️ LEO Missing (${reportData?.exceptionsSummary?.total || reportData?.exceptionsSummary?.leoMissing || 0})` },
        { id: 'detailed', label: `📑 Detailed Jobs (${reportData?.detailedJobs?.length || 0})` }
    ], [isDayWise, reportData]);

    // ─── Render States ──────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="fleet-loading">
                <style>{STYLES}</style>
                <div className="fleet-spinner" />
                <div style={{ marginTop: '1.5rem', color: '#1e293b', fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>
                    Loading Let Export Order (LEO) Summary & Projections...
                </div>
                <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
                    Aggregating export clearances, volumes, and projections
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fleet-card" style={{ padding: '28px', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(254, 242, 242, 0.8)' }}>
                <style>{STYLES}</style>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px' }}>⚠️</span>
                        <h4 style={{ margin: 0, fontWeight: 800, color: '#991b1b', fontFamily: "'Outfit', sans-serif" }}>Report Loading Error</h4>
                    </div>
                    <button onClick={() => setRetryCount(c => c + 1)} className="modern-refresh-btn">
                        🔄 Retry Loading
                    </button>
                </div>
                <p style={{ marginTop: '12px', color: '#b91c1c', fontSize: '14px' }}>{error}</p>
            </div>
        );
    }

    // ─── Main Render ────────────────────────────────────────────────────

    return (
        <div className="fleet-root">
            <style>{STYLES}</style>

            {/* ── Header Glass Strip ────────────────────────────────────────── */}
            <div className="fleet-header-glass">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '26px' }}>{isAirMode ? '✈️' : isSeaMode ? '🚢' : '🛫'}</span>
                        <h3 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '22px', color: '#0f172a', letterSpacing: '-0.02em' }}>
                            {isAirMode ? 'Air Let Export Order (LEO) Summary' : isSeaMode ? 'Sea Let Export Order (LEO) Summary' : 'Let Export Order (LEO) Summary & Projections'}
                        </h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', color: '#64748b', fontSize: '13px', marginTop: '6px', fontWeight: 500 }}>
                        <span>Export customs clearance metrics for <strong style={{ color: '#4f46e5' }}>{selectedFinancialYear ? `FY ${selectedFinancialYear}` : `${selectedMonth}/${selectedYear}`}</strong></span>
                        <span>•</span>
                        <span style={{ fontWeight: 700, color: isAirMode ? '#0284c7' : isSeaMode ? '#2563eb' : '#4f46e5' }}>
                            Mode: {isAirMode ? '✈️ AIR ONLY' : isSeaMode ? '🚢 SEA ONLY' : '🌐 ALL MODES'}
                        </span>
                        <span>•</span>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, color: '#334155' }}>Branch:</span>
                            <select
                                value={localBranch}
                                onChange={(e) => setLocalBranch(e.target.value)}
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
                                <option value="all">ALL</option>
                                {availableBranches.map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={() => setRetryCount(c => c + 1)} className="modern-refresh-btn" title="Refresh report data">
                        <span>🔄</span>
                        <span>Refresh</span>
                    </button>
                    <button onClick={handleExportFullExcel} disabled={exportingExcel} className="fleet-export-btn" title="Download complete Excel workbook">
                        {exportingExcel ? (
                            <>
                                <span className="fleet-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                                <span>Generating...</span>
                            </>
                        ) : (
                            <>
                                <span>📥</span>
                                <span>Download Excel</span>
                            </>
                        )}
                    </button>

                    {/* KPI Info Tooltip Flyout */}
                    <div className="kpi-info-wrap">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(24px)', borderRadius: '50%', border: '1px solid rgba(226,232,240,0.8)', cursor: 'pointer', width: '38px', height: '38px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                        </div>
                        <div className="kpi-info-tip">
                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9', fontFamily: "'Outfit', sans-serif" }}>
                                💡 Let Export Order (LEO) Metrics
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#64748b' }}>
                                <div><strong style={{ color: '#0f172a' }}>Run-Rate:</strong> Daily average clearances = Total LEO ÷ {elapsedDays} elapsed days.</div>
                                <div><strong style={{ color: '#0f172a' }}>Projection:</strong> Projected monthly/period volume = Run-rate × {totalDays} total period days.</div>
                                <div><strong style={{ color: '#059669' }}>▲ Green (≥ Last Month):</strong> Pace exceeds or meets prior benchmark.</div>
                                <div><strong style={{ color: '#dc2626' }}>▼ Red (&lt; 90%):</strong> Pace lagging behind prior benchmark.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Navigation Tabs Bar ────────────────────────────────────────── */}
            <div className="fleet-tabs">
                {navTabs.map(tab => (
                    <button
                        key={tab.id}
                        className="fleet-tab"
                        data-active={String(activeTab === tab.id)}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                TAB 1: OPERATIONS DASHBOARD
                ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'dashboard' && (
                <>
                    {/* Row 1: Core Hero KPI Cards (Glowing Orbs + Progress Rings) */}
                    <div className="fleet-hero-grid">
                        {/* Total LEO Cleared: Left Half (Total + Branch-Wise) & Right Half (Location/Station Bifurcation) */}
                        <div
                            className="fleet-card"
                            style={{
                                padding: '24px 28px',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                                gap: '22px',
                                minHeight: '280px',
                                '--fc-accent': '#4f46e5'
                            }}
                        >
                            {/* Left Half: Total LEO Overview & Branch-Wise Clearance List */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', zIndex: 1 }}>
                                {/* Top section: Hero Numbers */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                        <div>
                                            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                                                Total LEO Cleared
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#8091a7', marginTop: '3px', fontWeight: 600, letterSpacing: '0.01em', lineHeight: 1.3 }}>
                                                ⏱️ {elapsedDays} days elapsed • Prev: {prevTotal.toLocaleString()}
                                            </div>
                                        </div>
                                        <div style={{
                                            display: 'inline-flex',
                                            padding: '4px 10px',
                                            borderRadius: '8px',
                                            background: totalGrowthPct.startsWith('▼') ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                                            color: totalGrowthPct.startsWith('▼') ? '#dc2626' : '#059669',
                                            fontWeight: 800,
                                            fontSize: '12px'
                                        }}>
                                            {totalGrowthPct}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
                                        <span style={{ fontSize: '36px', fontWeight: 900, color: '#0f172a' }} className="mono">
                                            {totalLeo.toLocaleString()}
                                        </span>
                                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Total Jobs</span>
                                        {localBranch && localBranch !== 'all' && localBranch !== 'ALL' && (
                                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', background: 'rgba(79, 70, 229, 0.08)', padding: '3px 8px', borderRadius: '6px', marginLeft: 'auto' }}>
                                                📍 {localBranch}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Bottom section: Branch-Wise Breakdown */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(226, 232, 240, 0.7)', paddingTop: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '12px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>
                                            🏢 Branch-Wise Summary
                                        </span>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', background: 'rgba(79, 70, 229, 0.08)', padding: '2px 7px', borderRadius: '6px' }}>
                                            {branchTableData.length} {branchTableData.length === 1 ? 'Branch' : 'Branches'}
                                        </span>
                                    </div>

                                    <div
                                        className="mini-custom-scroll"
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px',
                                            maxHeight: '140px',
                                            overflowY: 'auto',
                                            paddingRight: '4px'
                                        }}
                                    >
                                        {branchTableData.map(b => {
                                            const share = totalLeo > 0 ? ((b.total / totalLeo) * 100).toFixed(0) : 0;
                                            const isSelected = kpiSelectedBranch === b.name.toUpperCase();
                                            return (
                                                <div
                                                    key={b.name}
                                                    onClick={() => setKpiSelectedBranch(prev => prev === b.name.toUpperCase() ? 'all' : b.name.toUpperCase())}
                                                    title={`Click to filter right-side locations to ${b.name}`}
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '4px',
                                                        padding: '6px 10px',
                                                        background: isSelected ? 'rgba(79, 70, 229, 0.1)' : 'rgba(241, 245, 249, 0.75)',
                                                        borderRadius: '8px',
                                                        border: isSelected ? '1px solid #4f46e5' : '1px solid rgba(226, 232, 240, 0.7)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontWeight: 700, color: isSelected ? '#4f46e5' : '#1e293b', fontSize: '12px' }}>
                                                            {b.name}
                                                        </span>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '12px' }} className="mono">
                                                                {b.total?.toLocaleString() || 0}
                                                            </span>
                                                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                                                                ({share}%)
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {/* Visual Progress Bar */}
                                                    <div style={{ height: '4px', background: 'rgba(226, 232, 240, 0.8)', borderRadius: '999px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${Math.min(100, Math.max(2, share))}%`, height: '100%', background: isSelected ? '#4f46e5' : '#6366f1', borderRadius: '999px' }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {branchTableData.length === 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {(availableBranches.length > 0 ? availableBranches : ['All Branches']).map(b => (
                                                    <div
                                                        key={b}
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '4px',
                                                            padding: '6px 10px',
                                                            background: 'rgba(241, 245, 249, 0.75)',
                                                            borderRadius: '8px',
                                                            border: '1px solid rgba(226, 232, 240, 0.7)'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '12px' }}>{b}</span>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '12px' }} className="mono">0</span>
                                                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>(0%)</span>
                                                            </div>
                                                        </div>
                                                        <div style={{ height: '4px', background: 'rgba(226, 232, 240, 0.8)', borderRadius: '999px' }}>
                                                            <div style={{ width: '0%', height: '100%', background: '#6366f1', borderRadius: '999px' }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Half: Customs Stations & Ports Bifurcation */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                borderLeft: '1px solid rgba(226, 232, 240, 0.85)',
                                paddingLeft: '20px',
                                zIndex: 1
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                    <div>
                                        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '12.5px', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>
                                            📍 Location & Station
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                                            {kpiSelectedBranch === 'all' ? 'All Customs Stations & Ports' : `Filtered: ${kpiSelectedBranch} Stations`}
                                        </div>
                                    </div>
                                    {kpiSelectedBranch !== 'all' && (
                                        <button
                                            onClick={() => setKpiSelectedBranch('all')}
                                            style={{
                                                fontSize: '10.5px',
                                                fontWeight: 700,
                                                color: '#4f46e5',
                                                background: 'rgba(79, 70, 229, 0.08)',
                                                border: '1px solid rgba(79, 70, 229, 0.2)',
                                                borderRadius: '6px',
                                                padding: '2px 7px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Reset Filter ✕
                                        </button>
                                    )}
                                </div>

                                <div
                                    className="mini-custom-scroll"
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px',
                                        maxHeight: '235px',
                                        overflowY: 'auto',
                                        paddingRight: '4px'
                                    }}
                                >
                                    {(((kpiSelectedBranch === 'all'
                                        ? branchLocationBifurcation.allLocations
                                        : (branchLocationBifurcation.branchMap[kpiSelectedBranch]?.sortedLocations || [])
                                    ))).map((loc, idx) => {
                                        const locShare = totalLeo > 0 ? (((loc.cleared || 0) / totalLeo) * 100).toFixed(0) : 0;
                                        return (
                                            <div
                                                key={`${loc.branch}-${loc.name}-${idx}`}
                                                style={{
                                                    padding: '8px 10px',
                                                    background: 'rgba(255, 255, 255, 0.9)',
                                                    borderRadius: '10px',
                                                    border: '1px solid rgba(226, 232, 240, 0.8)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '5px',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                                        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '12.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={loc.name}>
                                                            {loc.name}
                                                        </span>
                                                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#0284c7', background: 'rgba(2, 132, 199, 0.08)', padding: '1px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                                            {loc.branch}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                                        <span style={{ fontWeight: 900, color: '#4f46e5', fontSize: '13px' }} className="mono">
                                                            {loc.cleared || 0}
                                                        </span>
                                                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                                                            ({locShare}%)
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Sub-badges for container & mode breakdown */}
                                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                    {!isAirMode && (
                                                        <>
                                                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#0284c7', background: '#f0f9ff', padding: '1px 5px', borderRadius: '4px' }}>
                                                                20': {loc.c20 || 0}
                                                            </span>
                                                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#6366f1', background: '#eef2ff', padding: '1px 5px', borderRadius: '4px' }}>
                                                                40': {loc.c40 || 0}
                                                            </span>
                                                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#d97706', background: '#fffbeb', padding: '1px 5px', borderRadius: '4px' }}>
                                                                LCL: {loc.lcl || 0}
                                                            </span>
                                                        </>
                                                    )}
                                                    {!isSeaMode && (
                                                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#0ea5e9', background: '#f0fdf4', padding: '1px 5px', borderRadius: '4px' }}>
                                                            Air: {loc.air || 0}
                                                        </span>
                                                    )}
                                                    {!isAirMode && (
                                                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '1px 5px', borderRadius: '4px' }}>
                                                            {loc.teus || 0} TEU
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Card 2: Containers & Volume */}
                        <div
                            className="fleet-card"
                            style={{
                                padding: '24px 24px 28px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '16px',
                                minHeight: '280px',
                                '--fc-accent': '#06b6d4'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                                <div>
                                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                                        {isSeaMode ? 'Sea Containers & Volume' : isAirMode ? 'Air Cargo Volume' : 'Containers & Volume'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#8091a7', marginTop: '3px', fontWeight: 600 }}>
                                        {isAirMode ? 'Airway Consignments' : 'Total 20\', 40\', LCL Volume'}
                                    </div>
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#0891b2', background: 'rgba(6, 182, 212, 0.1)', padding: '3px 8px', borderRadius: '6px' }}>
                                    {isAirMode ? '✈️ Air Mode' : '📦 Total TEUs'}
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', zIndex: 1 }}>
                                <span style={{ fontSize: '36px', fontWeight: 900, color: '#0f172a' }} className="mono">
                                    {isAirMode ? (stats.airJobs || totalLeo || 0).toLocaleString() : (totalTeus || 0).toLocaleString()}
                                </span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0891b2' }}>
                                    {isAirMode ? 'Air Jobs' : 'TEUs'}
                                </span>
                            </div>

                            {/* Breakdown Sub-chips Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(68px, 1fr))', gap: '6px', zIndex: 1, marginTop: 'auto' }}>
                                {!isAirMode && (
                                    <>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 4px', background: 'rgba(240, 249, 255, 0.8)', border: '1px solid rgba(2, 132, 199, 0.2)', borderRadius: '8px' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>20' FCL</span>
                                            <span style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }} className="mono">{stats.fcl20 || 0}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 4px', background: 'rgba(238, 242, 255, 0.8)', border: '1px solid rgba(99, 102, 241, 0.2)', borderRadius: '8px' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 800, color: '#6366f1', textTransform: 'uppercase' }}>40' FCL</span>
                                            <span style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }} className="mono">{stats.fcl40 || 0}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 4px', background: 'rgba(255, 251, 235, 0.8)', border: '1px solid rgba(217, 119, 6, 0.2)', borderRadius: '8px' }}>
                                            <span style={{ fontSize: '10px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase' }}>LCL</span>
                                            <span style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }} className="mono">{stats.lclJobs || 0}</span>
                                        </div>
                                    </>
                                )}
                                {isAllModes && (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 4px', background: 'rgba(240, 253, 244, 0.8)', border: '1px solid rgba(14, 165, 233, 0.2)', borderRadius: '8px' }}>
                                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#0ea5e9', textTransform: 'uppercase' }}>Air</span>
                                        <span style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }} className="mono">{stats.airJobs || 0}</span>
                                    </div>
                                )}
                                {isAirMode && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(240, 249, 255, 0.8)', border: '1px solid rgba(2, 132, 199, 0.2)', borderRadius: '8px', gridColumn: 'span 3' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7' }}>Airport Customs Gate-Out</span>
                                        <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }} className="mono">{stats.airJobs || totalLeo || 0}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Card 3: Clearance Channel / Mode Split */}
                        {isAirMode ? (
                            <div
                                className="fleet-card"
                                style={{
                                    padding: '24px 24px 28px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    gap: '16px',
                                    minHeight: '280px',
                                    '--fc-accent': '#0ea5e9'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                                    <div>
                                        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                                            Air Clearance Channel
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#8091a7', marginTop: '3px', fontWeight: 600 }}>
                                            Airport Customs Channel
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#0284c7', background: 'rgba(2, 132, 199, 0.1)', padding: '3px 8px', borderRadius: '6px' }}>
                                        100% Air
                                    </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', zIndex: 1 }}>
                                    <span style={{ fontSize: '36px', fontWeight: 900, color: '#0f172a' }} className="mono">
                                        {(stats.airJobs || totalLeo || 0).toLocaleString()}
                                    </span>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0284c7' }}>Air Consignments</span>
                                </div>

                                <div style={{ zIndex: 1, marginTop: 'auto', paddingTop: '8px' }}>
                                    <div style={{ height: '8px', background: 'rgba(2, 132, 199, 0.15)', borderRadius: '999px', overflow: 'hidden' }}>
                                        <div style={{ width: '100%', height: '100%', background: '#0284c7', borderRadius: '999px' }} />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', marginTop: '8px', fontWeight: 700, color: '#64748b' }}>
                                        <span>✈️ Airport Customs Channel</span>
                                        <span style={{ color: '#0284c7' }}>100%</span>
                                    </div>
                                </div>
                            </div>
                        ) : isSeaMode ? (() => {
                            const fclTotal = (stats.fcl20 || 0) + (stats.fcl40 || 0);
                            const lclTotal = stats.lclJobs || 0;
                            const seaSum = fclTotal + lclTotal;
                            const fclPct = seaSum > 0 ? ((fclTotal / seaSum) * 100).toFixed(0) : (totalLeo > 0 ? 100 : 0);
                            const lclPct = seaSum > 0 ? ((lclTotal / seaSum) * 100).toFixed(0) : 0;
                            return (
                                <div
                                    className="fleet-card"
                                    style={{
                                        padding: '24px 24px 28px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        gap: '16px',
                                        minHeight: '280px',
                                        '--fc-accent': '#3b82f6'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                                        <div>
                                            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                                                Sea Clearance Types
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#8091a7', marginTop: '3px', fontWeight: 600 }}>
                                                FCL Full Container vs LCL Consolidation
                                            </div>
                                        </div>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', background: 'rgba(37, 99, 235, 0.1)', padding: '3px 8px', borderRadius: '6px' }}>
                                            {seaSum.toLocaleString()} Sea Total
                                        </span>
                                    </div>

                                    {/* Split Hero Numbers */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', zIndex: 1 }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', padding: '6px 10px', background: 'rgba(239, 246, 255, 0.7)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase' }}>📦 FCL</span>
                                            <span style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '1px' }} className="mono">
                                                {fclTotal.toLocaleString()}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', padding: '6px 10px', background: 'rgba(255, 251, 235, 0.7)', borderRadius: '8px', border: '1px solid rgba(217, 119, 6, 0.2)' }}>
                                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase' }}>📦 LCL</span>
                                            <span style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '1px' }} className="mono">
                                                {lclTotal.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Segmented Distribution Bar */}
                                    <div style={{ zIndex: 1, marginTop: 'auto', paddingTop: '8px' }}>
                                        <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
                                            <div style={{ width: `${fclPct}%`, background: '#3b82f6', transition: 'width 0.6s ease' }} />
                                            <div style={{ width: `${lclPct}%`, background: '#d97706', transition: 'width 0.6s ease' }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '8px', fontWeight: 700, color: '#64748b' }}>
                                            <span style={{ color: '#2563eb' }}>📦 FCL ({fclPct}%)</span>
                                            <span style={{ color: '#d97706' }}>📦 LCL ({lclPct}%)</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })() : (
                            <div
                                className="fleet-card"
                                style={{
                                    padding: '24px 24px 28px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    gap: '16px',
                                    minHeight: '280px',
                                    '--fc-accent': '#f59e0b'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                                    <div>
                                        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                                            Transport Mode Split
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#8091a7', marginTop: '3px', fontWeight: 600 }}>
                                            Sea Freight vs Air Cargo Volume
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', background: 'rgba(245, 158, 11, 0.1)', padding: '3px 8px', borderRadius: '6px' }}>
                                        {((stats.seaJobs || 0) + (stats.airJobs || 0)).toLocaleString()} Total Jobs
                                    </span>
                                </div>

                                {/* Split Hero Numbers */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', zIndex: 1 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', padding: '6px 10px', background: 'rgba(239, 246, 255, 0.7)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase' }}>🚢 Sea</span>
                                        <span style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '1px' }} className="mono">
                                            {(stats.seaJobs || 0).toLocaleString()}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', padding: '6px 10px', background: 'rgba(240, 253, 250, 0.7)', borderRadius: '8px', border: '1px solid rgba(6, 182, 212, 0.2)' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#0891b2', textTransform: 'uppercase' }}>✈️ Air</span>
                                        <span style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', marginTop: '1px' }} className="mono">
                                            {(stats.airJobs || 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Segmented Distribution Bar */}
                                <div style={{ zIndex: 1, marginTop: 'auto', paddingTop: '8px' }}>
                                    <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
                                        <div style={{ width: `${totalLeo > 0 ? (((stats.seaJobs || 0) / totalLeo) * 100).toFixed(0) : 0}%`, background: '#3b82f6', transition: 'width 0.6s ease' }} />
                                        <div style={{ width: `${totalLeo > 0 ? (((stats.airJobs || 0) / totalLeo) * 100).toFixed(0) : 0}%`, background: '#06b6d4', transition: 'width 0.6s ease' }} />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '8px', fontWeight: 700, color: '#64748b' }}>
                                        <span style={{ color: '#2563eb' }}>🚢 Sea ({totalLeo > 0 ? (((stats.seaJobs || 0) / totalLeo) * 100).toFixed(0) : 0}%)</span>
                                        <span style={{ color: '#0891b2' }}>✈️ Air ({totalLeo > 0 ? (((stats.airJobs || 0) / totalLeo) * 100).toFixed(0) : 0}%)</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Row 5: Exporter Clearance Dynamics (Top Gainers & Fallers + Matrix) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Outfit', sans-serif" }}>
                            <span>🚀</span> Exporter Clearance Dynamics (Volume Movers)
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                            {/* Gainers */}
                            <div className="fleet-card" style={{ padding: '22px', border: '1px solid rgba(16, 185, 129, 0.25)', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, transparent 100%)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                    <span style={{ fontSize: '18px' }}>📈</span>
                                    <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, color: '#059669', fontSize: '15px' }}>Top Volume Gainers (Ups)</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {(reportData?.customerGainers || []).slice(0, 5).map((g, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.85)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(226,232,240,0.6)', fontSize: '13px', gap: '10px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, flex: 1 }}>
                                                <span style={{ fontWeight: 800, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }} title={g.customer}>
                                                    {g.customer}
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', flexWrap: 'wrap' }}>
                                                    {g.branch && g.branch !== 'All' && (
                                                        <span style={{
                                                            fontWeight: 800,
                                                            color: '#4f46e5',
                                                            background: 'rgba(79, 70, 229, 0.08)',
                                                            padding: '1px 6px',
                                                            borderRadius: '4px'
                                                        }}>
                                                            {g.branch}
                                                        </span>
                                                    )}
                                                    <span style={{ color: '#64748b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        📍 {g.location && g.location !== 'Unassigned' ? g.location : (g.port || '—')}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                                                <span style={{ color: '#64748b' }} className="mono">{g.prev} → <strong>{g.current}</strong></span>
                                                <span className="status-pill-v2" data-variant="success">▲ +{g.diff} ({g.pct}%)</span>
                                            </div>
                                        </div>
                                    ))}
                                    {(!reportData?.customerGainers || reportData.customerGainers.length === 0) && (
                                        <div style={{ color: '#64748b', fontSize: '13px', padding: '10px 0' }}>No volume gainers in this period.</div>
                                    )}
                                </div>
                            </div>

                            {/* Fallers */}
                            <div className="fleet-card" style={{ padding: '22px', border: '1px solid rgba(239, 68, 68, 0.25)', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, transparent 100%)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                    <span style={{ fontSize: '18px' }}>📉</span>
                                    <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, color: '#dc2626', fontSize: '15px' }}>Top Volume Fallers (Downs)</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {(reportData?.customerFallers || []).slice(0, 5).map((f, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.85)', padding: '10px 14px', borderRadius: '10px', border: '1px solid rgba(226,232,240,0.6)', fontSize: '13px', gap: '10px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0, flex: 1 }}>
                                                <span style={{ fontWeight: 800, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }} title={f.customer}>
                                                    {f.customer}
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', flexWrap: 'wrap' }}>
                                                    {f.branch && f.branch !== 'All' && (
                                                        <span style={{
                                                            fontWeight: 800,
                                                            color: '#4f46e5',
                                                            background: 'rgba(79, 70, 229, 0.08)',
                                                            padding: '1px 6px',
                                                            borderRadius: '4px'
                                                        }}>
                                                            {f.branch}
                                                        </span>
                                                    )}
                                                    <span style={{ color: '#64748b', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        📍 {f.location && f.location !== 'Unassigned' ? f.location : (f.port || '—')}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                                                <span style={{ color: '#64748b' }} className="mono">{f.prev} → <strong>{f.current}</strong></span>
                                                <span className="status-pill-v2" data-variant="error">▼ {f.diff} ({f.pct}%)</span>
                                            </div>
                                        </div>
                                    ))}
                                    {(!reportData?.customerFallers || reportData.customerFallers.length === 0) && (
                                        <div style={{ color: '#64748b', fontSize: '13px', padding: '10px 0' }}>No volume fallers in this period.</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Searchable Exporters Matrix with Branch Filter */}
                        <div className="fleet-table-wrap">
                            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(226,232,240,0.6)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                    <div>
                                        <h4 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '16.5px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>🏢</span> Branch-Wise Exporter Clearance Performance
                                        </h4>
                                        <span style={{ color: '#64748b', fontSize: '12.5px' }}>
                                            Volume, container distribution, and period-over-period growth by exporter and branch
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <input
                                            type="text"
                                            placeholder="🔍 Search Exporters..."
                                            value={customerSearch}
                                            onChange={e => setCustomerSearch(e.target.value)}
                                            style={{
                                                minWidth: '240px',
                                                padding: '8px 16px',
                                                borderRadius: '12px',
                                                border: '1px solid #cbd5e1',
                                                fontSize: '13px',
                                                outline: 'none',
                                                fontFamily: "'Outfit', sans-serif"
                                            }}
                                        />
                                        <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                            <strong>{filteredCustomers.length}</strong> Exporters
                                        </span>
                                    </div>
                                </div>

                                {/* Branch Selector Pills */}
                                {exporterBranches.length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            Branch:
                                        </span>
                                        <button
                                            onClick={() => setImporterBranchFilter('all')}
                                            style={{
                                                padding: '5px 12px',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                border: importerBranchFilter === 'all' ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                                                background: importerBranchFilter === 'all' ? '#4f46e5' : '#ffffff',
                                                color: importerBranchFilter === 'all' ? '#ffffff' : '#475569',
                                                transition: 'all 0.2s',
                                                boxShadow: importerBranchFilter === 'all' ? '0 2px 8px rgba(79,70,229,0.25)' : 'none'
                                            }}
                                        >
                                            All Branches ({(reportData?.customerWise || []).length})
                                        </button>
                                        {exporterBranches.map(b => {
                                            const count = (reportData?.customerWise || []).filter(c => c.branch && c.branch.toUpperCase() === b.toUpperCase()).length;
                                            const isActive = importerBranchFilter.toUpperCase() === b.toUpperCase();
                                            return (
                                                <button
                                                    key={b}
                                                    onClick={() => setImporterBranchFilter(b)}
                                                    style={{
                                                        padding: '5px 12px',
                                                        borderRadius: '8px',
                                                        fontSize: '12px',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        border: isActive ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                                                        background: isActive ? '#4f46e5' : '#ffffff',
                                                        color: isActive ? '#ffffff' : '#475569',
                                                        transition: 'all 0.2s',
                                                        boxShadow: isActive ? '0 2px 8px rgba(79,70,229,0.25)' : 'none'
                                                    }}
                                                >
                                                    {b} ({count})
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div style={{ maxHeight: '440px', overflowY: 'auto' }}>
                                <table className="fleet-table">
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                                        <tr>
                                            {importerBranchFilter === 'all' && (
                                                <th onClick={() => { setCustomerSortField('branch'); setCustomerSortDir(customerSortDir === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer', width: '85px' }}>
                                                    Branch {customerSortField === 'branch' && (customerSortDir === 'asc' ? '↑' : '↓')}
                                                </th>
                                            )}
                                            <th onClick={() => { setCustomerSortField('location'); setCustomerSortDir(customerSortDir === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer', minWidth: '140px' }}>
                                                Location / Port {customerSortField === 'location' && (customerSortDir === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th onClick={() => { setCustomerSortField('customer'); setCustomerSortDir(customerSortDir === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer' }}>
                                                Exporter Name {customerSortField === 'customer' && (customerSortDir === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => { setCustomerSortField('current'); setCustomerSortDir(customerSortDir === 'asc' ? 'desc' : 'asc'); }}>
                                                Current LEO {customerSortField === 'current' && (customerSortDir === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => { setCustomerSortField('prev'); setCustomerSortDir(customerSortDir === 'asc' ? 'desc' : 'asc'); }}>
                                                Previous LEO {customerSortField === 'prev' && (customerSortDir === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => { setCustomerSortField('diff'); setCustomerSortDir(customerSortDir === 'asc' ? 'desc' : 'asc'); }}>
                                                Delta {customerSortField === 'diff' && (customerSortDir === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => { setCustomerSortField('pct'); setCustomerSortDir(customerSortDir === 'asc' ? 'desc' : 'asc'); }}>
                                                Growth % {customerSortField === 'pct' && (customerSortDir === 'asc' ? '↑' : '↓')}
                                            </th>
                                            {!isAirMode && <th style={{ textAlign: 'center' }}>20'</th>}
                                            {!isAirMode && <th style={{ textAlign: 'center' }}>40'</th>}
                                            {!isSeaMode && <th style={{ textAlign: 'center' }}>Air</th>}
                                            {!isAirMode && <th style={{ textAlign: 'center', color: '#4f46e5' }}>TEUs</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredCustomers.map((c, i) => (
                                            <tr key={`${c.branch}-${c.location}-${c.port}-${c.customer}-${i}`}>
                                                {importerBranchFilter === 'all' && (
                                                    <td>
                                                        <span style={{
                                                            fontSize: '11px',
                                                            fontWeight: 800,
                                                            color: '#4f46e5',
                                                            background: 'rgba(79, 70, 229, 0.08)',
                                                            padding: '2px 7px',
                                                            borderRadius: '6px'
                                                        }}>
                                                            {c.branch || '—'}
                                                        </span>
                                                    </td>
                                                )}
                                                <td>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                                                            {c.location && c.location !== 'Unassigned' ? c.location : (c.port || '—')}
                                                        </span>
                                                        {c.port && c.port !== 'Unassigned' && c.port !== c.location && (
                                                            <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                                                                {c.port}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ fontWeight: 700, color: '#0f172a', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.customer}>
                                                    {c.customer}
                                                </td>
                                                <td style={{ textAlign: 'center', fontWeight: 800, color: '#0f172a' }} className="mono">{c.current}</td>
                                                <td style={{ textAlign: 'center', color: '#64748b' }} className="mono">{c.prev}</td>
                                                <td style={{ textAlign: 'center', fontWeight: 700, color: c.diff > 0 ? '#059669' : c.diff < 0 ? '#dc2626' : '#64748b' }} className="mono">
                                                    {c.diff > 0 ? `+${c.diff}` : c.diff}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span className="status-pill-v2" data-variant={c.diff > 0 ? 'success' : c.diff < 0 ? 'error' : 'neutral'}>
                                                        {c.diff > 0 ? `▲ +${c.pct}%` : `▼ ${c.pct}%`}
                                                    </span>
                                                </td>
                                                {!isAirMode && <td style={{ textAlign: 'center', color: '#64748b' }} className="mono">{c.c20 || 0}</td>}
                                                {!isAirMode && <td style={{ textAlign: 'center', color: '#64748b' }} className="mono">{c.c40 || 0}</td>}
                                                {!isSeaMode && <td style={{ textAlign: 'center', color: '#64748b' }} className="mono">{c.air || 0}</td>}
                                                {!isAirMode && <td style={{ textAlign: 'center', fontWeight: 800, color: '#4f46e5' }} className="mono">{c.teus || 0}</td>}
                                            </tr>
                                        ))}
                                        {filteredCustomers.length === 0 && (
                                            <tr>
                                                <td colSpan={importerBranchFilter === 'all' ? (isAirMode ? 8 : isSeaMode ? 10 : 11) : (isAirMode ? 7 : isSeaMode ? 9 : 10)} style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>
                                                    No exporters found matching search / filter.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                TAB 2: PROJECTION REPORT (Dedicated Projection & Benchmark Analysis)
                ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'projection' && !isDayWise && (
                <>
                    {/* Unified Projection & Branch Run-Rate Card */}
                    <div
                        className="fleet-card"
                        style={{
                            padding: '24px 28px',
                            display: 'grid',
                            gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(320px, 1fr)',
                            gap: '24px',
                            marginBottom: '24px',
                            '--fc-accent': '#4f46e5',
                            alignItems: 'stretch'
                        }}
                    >
                        {/* Left Half: Overall Period Forecast Summary */}
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px', zIndex: 1 }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                    <div>
                                        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                                            Projected Period LEO Volume
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#8091a7', marginTop: '3px', fontWeight: 600, letterSpacing: '0.01em', lineHeight: 1.3 }}>
                                            ⏱️ Estimated {totalDays}-day volume • Benchmark: {prevTotal.toLocaleString()} LEO
                                        </div>
                                    </div>
                                    <div style={{
                                        display: 'inline-flex',
                                        padding: '4px 10px',
                                        borderRadius: '8px',
                                        background: projectionTheme.badgeBg || (projectionTheme.performanceLabel?.startsWith('▼') ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)'),
                                        color: projectionTheme.color || (projectionTheme.performanceLabel?.startsWith('▼') ? '#dc2626' : '#059669'),
                                        fontWeight: 800,
                                        fontSize: '12px'
                                    }}>
                                        {projectionTheme.performanceLabel}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '10px' }}>
                                    <span style={{ fontSize: '36px', fontWeight: 900, color: '#0f172a' }} className="mono">
                                        {projectedTotal.toLocaleString()}
                                    </span>
                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Projected LEO</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Half: Branch-Wise Projection Breakdown */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            borderLeft: '1px solid rgba(226, 232, 240, 0.85)',
                            paddingLeft: '20px',
                            zIndex: 1
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '12.5px', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>
                                        🏢 Branch-Wise Breakdown
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                                        {totalDays} Days Projection
                                    </div>
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', background: 'rgba(79, 70, 229, 0.08)', padding: '3px 8px', borderRadius: '6px' }}>
                                    {branchTableData.length} {branchTableData.length === 1 ? 'Branch' : 'Branches'}
                                </span>
                            </div>

                            <div
                                className="mini-custom-scroll"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    maxHeight: '180px',
                                    overflowY: 'auto',
                                    paddingRight: '4px'
                                }}
                            >
                                {branchTableData.map(b => {
                                    const share = projectedTotal > 0 ? ((b.projection / projectedTotal) * 100).toFixed(0) : 0;
                                    const perfVal = b.prevTotal > 0 ? (b.projection / b.prevTotal) * 100 : (b.projection > 0 ? 100 : 0);
                                    const theme = getColorTheme(perfVal);
                                    return (
                                        <div
                                            key={b.name}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px',
                                                padding: '6px 10px',
                                                background: 'rgba(241, 245, 249, 0.75)',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(226, 232, 240, 0.7)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '12px' }}>
                                                    {b.name}
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '12px' }} className="mono">
                                                        {b.projection?.toLocaleString() || 0}
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                                                        ({share}%)
                                                    </span>
                                                    <span style={{
                                                        fontSize: '10.5px',
                                                        fontWeight: 800,
                                                        color: theme.color,
                                                        background: theme.badgeBg || '#f1f5f9',
                                                        padding: '1px 5px',
                                                        borderRadius: '4px',
                                                        marginLeft: '2px'
                                                    }}>
                                                        {b.changeLabel}
                                                    </span>
                                                </div>
                                            </div>
                                            {/* Visual Progress Bar */}
                                            <div style={{ height: '4px', background: 'rgba(226, 232, 240, 0.8)', borderRadius: '999px', overflow: 'hidden' }}>
                                                <div style={{ width: `${Math.min(100, Math.max(2, share))}%`, height: '100%', background: theme.color || '#6366f1', borderRadius: '999px' }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Detailed Location & ICD Station Projection Matrix Table */}
                    {locationProjectionDetails.length > 0 && (
                        <div className="fleet-table-wrap" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid rgba(226,232,240,0.6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '17px', color: '#0f172a' }}>
                                        📍 Customs Ports & ICD Stations Location-Wise Projection Matrix
                                    </h4>
                                    <span style={{ color: '#64748b', fontSize: '13px' }}>
                                        Terminal-level clearance pace, full-period forecast, and cargo mode distribution
                                    </span>
                                </div>
                                <span className="status-pill-v2" data-variant="info">{locationProjectionDetails.length} Stations Active</span>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="fleet-table">
                                    <thead>
                                        <tr>
                                            <th>Customs Port / ICD Location</th>
                                            <th style={{ textAlign: 'center' }}>Branch</th>
                                            <th style={{ textAlign: 'center' }}>Actual Cleared</th>
                                            <th style={{ textAlign: 'center' }}>Avg LEO / Day</th>
                                            <th style={{ textAlign: 'center', color: '#4f46e5' }}>Projected Output</th>
                                            <th style={{ textAlign: 'center' }}>Volume Share %</th>
                                            {!isAirMode && <th style={{ textAlign: 'center' }}>Proj FCL</th>}
                                            {!isAirMode && <th style={{ textAlign: 'center' }}>Proj LCL</th>}
                                            {!isSeaMode && <th style={{ textAlign: 'center' }}>Proj Air</th>}
                                            {!isAirMode && <th style={{ textAlign: 'center', color: '#4f46e5' }}>Proj TEUs</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {locationProjectionDetails.map(loc => (
                                            <tr key={loc.location}>
                                                <td style={{ fontWeight: 800, color: '#0f172a' }}>{loc.location}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <span style={{ background: '#f1f5f9', color: '#334155', padding: '2px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 700 }}>
                                                        {loc.branch}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'center', fontWeight: 700 }} className="mono">{loc.cleared?.toLocaleString() || 0}</td>
                                                <td style={{ textAlign: 'center', color: '#64748b' }} className="mono">{loc.avgDaily || 0}</td>
                                                <td style={{ textAlign: 'center', fontWeight: 800, color: '#4f46e5', fontSize: '15px' }} className="mono">
                                                    {loc.projection?.toLocaleString() || 0}
                                                </td>
                                                <td style={{ textAlign: 'center', fontWeight: 700, color: '#0f172a' }} className="mono">
                                                    {loc.sharePct}%
                                                </td>
                                                {!isAirMode && <td style={{ textAlign: 'center', color: '#64748b' }} className="mono">{loc.projFcl || 0}</td>}
                                                {!isAirMode && <td style={{ textAlign: 'center', color: '#64748b' }} className="mono">{loc.projLcl || 0}</td>}
                                                {!isSeaMode && <td style={{ textAlign: 'center', color: '#64748b' }} className="mono">{loc.projAir || 0}</td>}
                                                {!isAirMode && <td style={{ textAlign: 'center', fontWeight: 800, color: '#4f46e5' }} className="mono">{loc.projTeus || 0}</td>}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                TAB 3: TREND & ANALYTICS
                ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'trend' && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
                        {/* Daily Trend Area Chart */}
                        <div className="fleet-chart-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <div>
                                    <h3 style={{ margin: 0 }}>📈 Daily LEO Trend & 7-Day Moving Avg</h3>
                                    <span className="sub">Daily clearance pace with smoothing baseline</span>
                                </div>
                                <span className="status-pill-v2" data-variant="info">{dailyTrendData.length} Days Recorded</span>
                            </div>
                            <div style={{ height: '360px', width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={dailyTrendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="leoGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(226,232,240,0.6)" vertical={false} />
                                        <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={11} tickLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                        <Tooltip content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="fleet-tooltip-v2">
                                                        <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '6px', fontFamily: "'Outfit', sans-serif" }}>Date: {label}</div>
                                                        {payload.map((p, i) => (
                                                            <div key={i} style={{ color: p.color, fontSize: '13px', fontWeight: 600 }}>
                                                                {p.name}: <strong>{p.value}</strong>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }} />
                                        <Legend
                                            verticalAlign="bottom"
                                            content={() => (
                                                <div style={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    gap: '16px',
                                                    paddingTop: '10px',
                                                    fontFamily: "'Outfit', sans-serif",
                                                    fontSize: '12px',
                                                    fontWeight: 700
                                                }}>
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#4f46e5' }}>
                                                        <span style={{ width: '12px', height: '4px', background: '#4f46e5', borderRadius: '2px', display: 'inline-block' }} />
                                                        <span>Daily LEO</span>
                                                    </div>
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#d97706' }}>
                                                        <span style={{ width: '12px', height: '2px', background: '#f59e0b', display: 'inline-block', borderTop: '2px dashed #f59e0b' }} />
                                                        <span>7-Day Moving Avg</span>
                                                    </div>
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#059669' }}>
                                                        <span style={{ width: '12px', height: '2px', background: '#10b981', display: 'inline-block', borderTop: '2px dotted #10b981' }} />
                                                        <span>Period Avg Baseline ({avgDaily}/day)</span>
                                                    </div>
                                                </div>
                                            )}
                                        />
                                        <Area type="monotone" dataKey="totalLeo" name="Daily LEO" stroke="#4f46e5" strokeWidth={2.5} fill="url(#leoGradient)" />
                                        <Line type="monotone" dataKey="movingAvg" name="7-Day Moving Avg" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                                        <ReferenceLine y={avgDaily} stroke="#10b981" strokeDasharray="3 3" label={{ value: `Avg: ${avgDaily}`, fill: '#10b981', fontSize: 11 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Branch Share Donut Chart */}
                        <div className="fleet-chart-card">
                            <h3 style={{ margin: '0 0 4px 0' }}>🏢 Branch Volume Share</h3>
                            <span className="sub">Proportionate breakdown by clearance station</span>
                            <div style={{ height: '360px', width: '100%', position: 'relative', marginTop: '12px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={branchDonutData}
                                            cx="50%"
                                            cy="38%"
                                            innerRadius={55}
                                            outerRadius={88}
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
                                                    <div className="fleet-tooltip-v2">
                                                        <div style={{ fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>{d.name}</div>
                                                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Total: <strong>{d.value?.toLocaleString()}</strong> ({pct}%)</div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }} />
                                        <Legend
                                            verticalAlign="bottom"
                                            content={() => (
                                                <div style={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    paddingTop: '12px',
                                                    fontFamily: "'Outfit', sans-serif"
                                                }}>
                                                    {branchDonutData.map((item, idx) => {
                                                        const pct = totalLeo > 0 ? ((item.value / totalLeo) * 100).toFixed(1) : '0.0';
                                                        return (
                                                            <div
                                                                key={idx}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '5px',
                                                                    padding: '3px 8px',
                                                                    borderRadius: '6px',
                                                                    background: 'rgba(241, 245, 249, 0.9)',
                                                                    border: '1px solid rgba(226, 232, 240, 0.8)',
                                                                    fontSize: '11.5px',
                                                                    fontWeight: 700
                                                                }}
                                                            >
                                                                <span style={{
                                                                    width: '8px',
                                                                    height: '8px',
                                                                    borderRadius: '50%',
                                                                    background: item.color,
                                                                    display: 'inline-block'
                                                                }} />
                                                                <span style={{ color: '#1e293b' }}>{item.name}:</span>
                                                                <span style={{ color: '#0f172a', fontWeight: 800 }} className="mono">{(item.value || 0).toLocaleString()}</span>
                                                                <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>({pct}%)</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ position: 'absolute', top: '38%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>{(totalLeo || 0).toLocaleString()}</div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Total LEO</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Exporter Monthly Trends Matrix */}
                    <div className="fleet-table-wrap" style={{ marginTop: '24px' }}>
                        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(226,232,240,0.6)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '16.5px', color: '#0f172a' }}>
                                        📅 Exporter Monthly Clearance Trend Matrix (Apr – Mar)
                                    </h4>
                                    <span style={{ color: '#64748b', fontSize: '12.5px' }}>
                                        Month-by-month clearance distribution across the financial year
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <input
                                        type="text"
                                        placeholder="🔍 Search Exporters..."
                                        value={monthlySearch}
                                        onChange={e => setMonthlySearch(e.target.value)}
                                        style={{
                                            minWidth: '240px',
                                            padding: '8px 16px',
                                            borderRadius: '12px',
                                            border: '1px solid #cbd5e1',
                                            fontSize: '13px',
                                            outline: 'none',
                                            fontFamily: "'Outfit', sans-serif"
                                        }}
                                    />
                                    <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                        <strong>{filteredMonthlyCustomers.length}</strong> Exporters
                                    </span>
                                </div>
                            </div>

                            {/* Monthly Volume Tier Filters */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Volume Filter:
                                    </span>
                                    <button
                                        onClick={() => setMonthlyVolumeFilter('all')}
                                        style={{
                                            padding: '5px 12px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            border: monthlyVolumeFilter === 'all' ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                                            background: monthlyVolumeFilter === 'all' ? '#4f46e5' : '#ffffff',
                                            color: monthlyVolumeFilter === 'all' ? '#ffffff' : '#475569',
                                            transition: 'all 0.2s',
                                            boxShadow: monthlyVolumeFilter === 'all' ? '0 2px 8px rgba(79,70,229,0.25)' : 'none'
                                        }}
                                    >
                                        All Volumes ({(reportData?.customerMonthlySummary || []).length})
                                    </button>
                                    <button
                                        onClick={() => setMonthlyVolumeFilter('high')}
                                        style={{
                                            padding: '5px 12px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            border: monthlyVolumeFilter === 'high' ? '1px solid #059669' : '1px solid #e2e8f0',
                                            background: monthlyVolumeFilter === 'high' ? '#059669' : '#ffffff',
                                            color: monthlyVolumeFilter === 'high' ? '#ffffff' : '#475569',
                                            transition: 'all 0.2s',
                                            boxShadow: monthlyVolumeFilter === 'high' ? '0 2px 8px rgba(5,150,105,0.25)' : 'none'
                                        }}
                                    >
                                        🔥 High Count (≥ 50)
                                    </button>
                                    <button
                                        onClick={() => setMonthlyVolumeFilter('med')}
                                        style={{
                                            padding: '5px 12px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            border: monthlyVolumeFilter === 'med' ? '1px solid #d97706' : '1px solid #e2e8f0',
                                            background: monthlyVolumeFilter === 'med' ? '#d97706' : '#ffffff',
                                            color: monthlyVolumeFilter === 'med' ? '#ffffff' : '#475569',
                                            transition: 'all 0.2s',
                                            boxShadow: monthlyVolumeFilter === 'med' ? '0 2px 8px rgba(217,119,6,0.25)' : 'none'
                                        }}
                                    >
                                        ⚡ Medium Count (10 - 49)
                                    </button>
                                    <button
                                        onClick={() => setMonthlyVolumeFilter('low')}
                                        style={{
                                            padding: '5px 12px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            border: monthlyVolumeFilter === 'low' ? '1px solid #64748b' : '1px solid #e2e8f0',
                                            background: monthlyVolumeFilter === 'low' ? '#64748b' : '#ffffff',
                                            color: monthlyVolumeFilter === 'low' ? '#ffffff' : '#475569',
                                            transition: 'all 0.2s',
                                            boxShadow: monthlyVolumeFilter === 'low' ? '0 2px 8px rgba(100,116,139,0.25)' : 'none'
                                        }}
                                    >
                                        🌱 Low Count (&lt; 10)
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div style={{ maxHeight: '440px', overflowY: 'auto' }}>
                            <table className="fleet-table">
                                <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                                    <tr>
                                        <th
                                            onClick={() => {
                                                setMonthlySortField('customer');
                                                setMonthlySortDir(monthlySortField === 'customer' && monthlySortDir === 'asc' ? 'desc' : 'asc');
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            Exporter Name {monthlySortField === 'customer' && (monthlySortDir === 'asc' ? '↑' : '↓')}
                                        </th>
                                        {MONTH_NAMES.map(m => (
                                            <th
                                                key={m.key}
                                                onClick={() => {
                                                    setMonthlySortField(m.key);
                                                    setMonthlySortDir(monthlySortField === m.key && monthlySortDir === 'desc' ? 'asc' : 'desc');
                                                }}
                                                style={{ textAlign: 'center', minWidth: '48px', cursor: 'pointer' }}
                                            >
                                                {m.name} {monthlySortField === m.key && (monthlySortDir === 'asc' ? '↑' : '↓')}
                                            </th>
                                        ))}
                                        <th
                                            onClick={() => {
                                                setMonthlySortField('total');
                                                setMonthlySortDir(monthlySortField === 'total' && monthlySortDir === 'desc' ? 'asc' : 'desc');
                                            }}
                                            style={{ textAlign: 'center', fontWeight: 800, color: '#4f46e5', cursor: 'pointer', background: 'rgba(79,70,229,0.04)' }}
                                        >
                                            FY Total {monthlySortField === 'total' && (monthlySortDir === 'asc' ? '↑' : '↓')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMonthlyCustomers.map((row, idx) => (
                                        <tr key={idx}>
                                            <td style={{ fontWeight: 700, color: '#0f172a', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.customer}>
                                                {row.customer}
                                            </td>
                                            {MONTH_NAMES.map(m => (
                                                <td key={m.key} style={{ textAlign: 'center' }} className="mono">
                                                    {row.months?.[m.key] ? (
                                                        <span className="status-pill-v2" data-variant="info">{row.months[m.key]}</span>
                                                    ) : (
                                                        <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 600 }}>0</span>
                                                    )}
                                                </td>
                                            ))}
                                            <td style={{ textAlign: 'center', fontWeight: 800, color: '#4f46e5', background: 'rgba(79,70,229,0.02)' }} className="mono">
                                                {row.total || 0}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredMonthlyCustomers.length === 0 && (
                                        <tr>
                                            <td colSpan={14} style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>
                                                No exporters found matching criteria.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                TAB 4: EXCEPTIONS MANAGEMENT
                ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'exceptions' && (
                <>
                    {/* Hero KPI Grid (Dashboard Theme - 2 Cards) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(480px, 1.85fr) minmax(300px, 1.15fr)', gap: '18px', marginBottom: '28px' }}>
                        {/* Card 1: Operational Exceptions Overview & Branch/Station Drill-Down */}
                        <div
                            className="fleet-card"
                            style={{
                                padding: '24px 28px',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                                gap: '22px',
                                minHeight: '280px',
                                '--fc-accent': '#dc2626'
                            }}
                        >
                            {/* Left Half: Exceptions Hero & Branch-Wise Summary */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', zIndex: 1 }}>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                        <div>
                                            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                                                Export Operational Exceptions
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#8091a7', marginTop: '3px', fontWeight: 600, letterSpacing: '0.01em', lineHeight: 1.3 }}>
                                                Cleared LEO export jobs requiring operational follow-up
                                            </div>
                                        </div>
                                        <div style={{
                                            display: 'inline-flex',
                                            padding: '4px 10px',
                                            borderRadius: '8px',
                                            background: 'rgba(239, 68, 68, 0.12)',
                                            color: '#dc2626',
                                            fontWeight: 800,
                                            fontSize: '12px'
                                        }}>
                                            {filteredExceptions.length} Flagged Jobs
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
                                        <span style={{ fontSize: '36px', fontWeight: 900, color: '#0f172a' }} className="mono">
                                            {activeExceptionStats.totalCount.toLocaleString()}
                                        </span>
                                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Exceptions</span>
                                        {exceptionBranchFilter !== 'all' && (
                                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', background: 'rgba(239, 68, 68, 0.08)', padding: '3px 8px', borderRadius: '6px', marginLeft: 'auto' }}>
                                                📍 {exceptionBranchFilter}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Branch-Wise Breakdown with Progress Bars */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(226, 232, 240, 0.7)', paddingTop: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '12px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>
                                            🏢 Branch-Wise Summary
                                        </span>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', background: 'rgba(239, 68, 68, 0.08)', padding: '2px 7px', borderRadius: '6px' }}>
                                            {activeExceptionStats.sortedBranches.length} {activeExceptionStats.sortedBranches.length === 1 ? 'Branch' : 'Branches'}
                                        </span>
                                    </div>

                                    <div
                                        className="mini-custom-scroll"
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '6px',
                                            maxHeight: '140px',
                                            overflowY: 'auto',
                                            paddingRight: '4px'
                                        }}
                                    >
                                        {activeExceptionStats.sortedBranches.map(([br, count]) => {
                                            const share = activeExceptionStats.totalCount > 0 ? ((count / activeExceptionStats.totalCount) * 100).toFixed(0) : 0;
                                            const isSelected = exceptionBranchFilter === br;
                                            return (
                                                <div
                                                    key={br}
                                                    onClick={() => {
                                                        setExceptionBranchFilter(prev => prev === br ? 'all' : br);
                                                        setExceptionLocationFilter('all');
                                                        setExceptionModeFilter('all');
                                                    }}
                                                    title={`Click to isolate ${br} exceptions`}
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '4px',
                                                        padding: '6px 10px',
                                                        background: isSelected ? 'rgba(239, 68, 68, 0.1)' : 'rgba(241, 245, 249, 0.75)',
                                                        borderRadius: '8px',
                                                        border: isSelected ? '1px solid #dc2626' : '1px solid rgba(226, 232, 240, 0.7)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontWeight: 700, color: isSelected ? '#dc2626' : '#1e293b', fontSize: '12px' }}>
                                                            {br}
                                                        </span>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '12px' }} className="mono">
                                                                {count.toLocaleString()}
                                                            </span>
                                                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                                                                ({share}%)
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div style={{ height: '4px', background: 'rgba(226, 232, 240, 0.8)', borderRadius: '999px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${Math.min(100, Math.max(2, share))}%`, height: '100%', background: isSelected ? '#dc2626' : '#ef4444', borderRadius: '999px' }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {activeExceptionStats.sortedBranches.length === 0 && (
                                            <div style={{ color: '#94a3b8', fontSize: '12px', padding: '8px' }}>No branch exceptions</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Half: Customs Stations & Ports List */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                borderLeft: '1px solid rgba(226, 232, 240, 0.85)',
                                paddingLeft: '20px',
                                zIndex: 1
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                    <div>
                                        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '12.5px', color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>
                                            📍 Location & Station
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                                            {exceptionBranchFilter === 'all' ? 'All Customs Stations & Ports' : `Filtered: ${exceptionBranchFilter} Stations`}
                                        </div>
                                    </div>
                                    {(exceptionBranchFilter !== 'all' || exceptionLocationFilter !== 'all' || exceptionModeFilter !== 'all' || exceptionFilter !== 'all') && (
                                        <button
                                            onClick={() => {
                                                setExceptionFilter('all');
                                                setExceptionBranchFilter('all');
                                                setExceptionLocationFilter('all');
                                                setExceptionModeFilter('all');
                                            }}
                                            style={{
                                                fontSize: '10.5px',
                                                fontWeight: 700,
                                                color: '#dc2626',
                                                background: 'rgba(239, 68, 68, 0.08)',
                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                                borderRadius: '6px',
                                                padding: '2px 7px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Reset Filter ✕
                                        </button>
                                    )}
                                </div>

                                <div
                                    className="mini-custom-scroll"
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px',
                                        maxHeight: '235px',
                                        overflowY: 'auto',
                                        paddingRight: '4px'
                                    }}
                                >
                                    {activeExceptionStats.sortedLocations.map(([loc, count], idx) => {
                                        const locShare = activeExceptionStats.totalCount > 0 ? ((count / activeExceptionStats.totalCount) * 100).toFixed(0) : 0;
                                        const isLocSelected = exceptionLocationFilter === loc;
                                        return (
                                            <div
                                                key={`${loc}-${idx}`}
                                                onClick={() => setExceptionLocationFilter(prev => prev === loc ? 'all' : loc)}
                                                style={{
                                                    padding: '8px 10px',
                                                    background: isLocSelected ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.9)',
                                                    borderRadius: '10px',
                                                    border: isLocSelected ? '1px solid #dc2626' : '1px solid rgba(226, 232, 240, 0.8)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '5px',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                                        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '12.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={loc}>
                                                            {loc}
                                                        </span>
                                                        {exceptionBranchFilter !== 'all' && (
                                                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#dc2626', background: 'rgba(239, 68, 68, 0.08)', padding: '1px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                                                {exceptionBranchFilter}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                                        <span style={{ fontWeight: 900, color: '#dc2626', fontSize: '13px' }} className="mono">
                                                            {count}
                                                        </span>
                                                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                                                            ({locShare}%)
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {activeExceptionStats.sortedLocations.length === 0 && (
                                        <div style={{ color: '#64748b', fontSize: '12px', padding: '16px', textAlign: 'center' }}>No station exceptions found.</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Card 2: LEO Missing Focus Card */}
                        <div
                            className="fleet-card"
                            style={{
                                padding: '24px 24px 28px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: '16px',
                                minHeight: '280px',
                                '--fc-accent': '#dc2626'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                                <div>
                                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '13px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                                        Exception Categories
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#8091a7', marginTop: '3px', fontWeight: 600 }}>
                                        Let Export Order (LEO) Date Missing Tracking
                                    </div>
                                </div>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', background: 'rgba(239, 68, 68, 0.1)', padding: '3px 8px', borderRadius: '6px' }}>
                                    ⚠️ LEO Missing Only
                                </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', zIndex: 1 }}>
                                <span style={{ fontSize: '36px', fontWeight: 900, color: '#0f172a' }} className="mono">
                                    {(reportData?.exceptionsSummary?.total || 0).toLocaleString()}
                                </span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626' }}>
                                    Total LEO Missing
                                </span>
                            </div>

                            {/* LEO Missing Focus Card */}
                            <div style={{ zIndex: 1, marginTop: 'auto' }}>
                                <div
                                    onClick={() => { setExceptionBranchFilter('all'); setExceptionLocationFilter('all'); }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '14px 18px',
                                        background: 'rgba(254, 242, 242, 0.9)',
                                        border: '1.5px solid #dc2626',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '20px' }}>⚠️</span>
                                        <div>
                                            <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.04em' }}>LEO MISSING</div>
                                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Let Export Order date missing or pending</div>
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '20px', fontWeight: 900, color: '#dc2626' }} className="mono">
                                        {(reportData?.exceptionsSummary?.total || 0).toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="fleet-table-wrap" style={{ padding: '20px 24px' }}>

                    {/* Search Input */}
                    <div style={{ marginBottom: '16px' }}>
                        <input
                            type="text"
                            placeholder="🔍 Filter by Job No, SB No, Exporter, or Branch..."
                            value={exceptionSearch}
                            onChange={e => setExceptionSearch(e.target.value)}
                            style={{
                                maxWidth: '380px',
                                padding: '8px 16px',
                                borderRadius: '12px',
                                border: '1px solid #cbd5e1',
                                fontSize: '13.5px',
                                outline: 'none',
                                fontFamily: "'Outfit', sans-serif"
                            }}
                        />
                    </div>

                    {/* Exceptions Table */}
                    <div style={{ overflowX: 'auto' }}>
                        <table className="fleet-table">
                            <thead>
                                <tr>
                                    <th>Job No</th>
                                    <th>SB No & Date</th>
                                    <th>LEO Date</th>
                                    <th>Exporter</th>
                                    <th>Branch</th>
                                    <th>Mode & Type</th>
                                    <th>Identified Issue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredExceptions.map(item => (
                                    <tr key={item._id}>
                                        <td style={{ fontWeight: 800, color: '#1e293b' }} className="mono">
                                            {item.job_no || item.job_number}
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 700, color: '#0f172a' }} className="mono">{item.be_no || item.sb_no || '—'}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }} className="mono">{item.be_date || item.sb_date || ''}</div>
                                        </td>
                                        <td style={{ fontWeight: 700, color: '#dc2626' }} className="mono">
                                            <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '11.5px', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 7px', borderRadius: '4px' }}>
                                                LEO Missing
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600, color: '#1e293b', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.importer || item.exporter}>
                                            {item.importer || item.exporter}
                                        </td>
                                        <td><span className="status-pill-v2" data-variant="neutral">{item.branch_code}</span></td>
                                        <td>
                                            <span className="status-pill-v2" data-variant="info" style={{ marginRight: '4px' }}>{item.mode}</span>
                                            <span className="status-pill-v2" data-variant="neutral">{item.consignment_type}</span>
                                        </td>
                                        <td>
                                            <span className="status-pill-v2" data-variant="error">LEO Missing</span>
                                        </td>
                                    </tr>
                                ))}
                                {filteredExceptions.length === 0 && (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>No LEO missing exceptions found under selected filter.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </>
        )}

            {/* ═══════════════════════════════════════════════════════════════════
                TAB 5: DETAILED JOBS GRID
                ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'detailed' && (
                <div className="fleet-table-wrap" style={{ padding: '24px' }}>
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
