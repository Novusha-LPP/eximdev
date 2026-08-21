import React, { useState, useEffect, useMemo, useRef, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { BranchContext } from '../../../contexts/BranchContext';
import {
    ResponsiveContainer, ComposedChart, BarChart, Bar, Cell, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, Area, PieChart, Pie, ReferenceLine
} from 'recharts';
import { getTransportDates } from './reports-helper';
import ImportDetailedSummaryTab from './ImportDetailedSummaryTab';
import { exportNucleusReportToExcel } from './nucleusExcelExporter';
import DataSciencePredictiveTab from './DataSciencePredictiveTab';

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
    z-index: 10;
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
.kpi-info-wrap { position: relative; display: inline-flex; align-items: center; justify-content: center; cursor: help; }
.kpi-info-tip { position: absolute; bottom: 120%; right: 0; transform: translateY(10px); background: rgba(255,255,255,0.98); backdrop-filter: blur(10px); border: 1px solid rgba(226,232,240,0.8); box-shadow: 0 20px 40px -5px rgba(0,0,0,0.1); border-radius: 16px; padding: 16px 20px; opacity: 0; visibility: hidden; transition: all 0.3s cubic-bezier(0.4,0,0.2,1); z-index: 100; width: max-content; pointer-events: none; }
.kpi-info-wrap:hover .kpi-info-tip { opacity: 1; visibility: visible; transform: translateY(0); }

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
            totalDays = Math.max(1, Math.round((eDate - sDate) / 86400000) + 1);
            if (today >= sDate && today <= eDate) {
                elapsedDays = Math.max(1, Math.round((today - sDate) / 86400000) + 1);
            } else if (today < sDate) {
                elapsedDays = 0;
            } else {
                elapsedDays = totalDays;
            }
        } else if (dailyDataLen > 0) {
            totalDays = dailyDataLen;
            elapsedDays = totalDays;
        }
    }
    return { totalDays, elapsedDays };
};

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

// ─── Sub-Components ─────────────────────────────────────────────────────────────

const ProgressCircle = ({ pct, color }) => {
    const radius = 18;
    const strokeWidth = 3.5;
    const circumference = 2 * Math.PI * radius;
    const safePct = Math.min(Math.max(Number(pct) || 0, 0), 100);
    const offset = circumference - (safePct / 100) * circumference;
    return (
        <div style={{ position: 'relative', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="44" height="44" style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
                <circle cx="22" cy="22" r={radius} fill="transparent" stroke="rgba(0,0,0,0.04)" strokeWidth={strokeWidth} />
                <circle cx="22" cy="22" r={radius} fill="transparent" stroke={color} strokeWidth={strokeWidth}
                    strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }} />
            </svg>
            <span style={{ fontSize: '10px', fontWeight: 800, color: color, fontFamily: "'Outfit', sans-serif" }}>{safePct}%</span>
        </div>
    );
};

const KpiCard = ({ label, subtext, value, extra, color, gradient, border, badgeBg, large, accentColor, hl, hlBlue, progressPct, onClick }) => {
    const defaultAccent = accentColor || color || '#cbd5e1';
    const textColor = hl ? '#991b1b' : hlBlue ? '#1e40af' : '#64748b';
    const valColor = hl ? '#991b1b' : hlBlue ? '#1e40af' : '#0f172a';

    let pct = progressPct !== undefined ? progressPct : null;
    if (pct === null && !badgeBg) {
        if (extra && typeof extra === 'string') {
            const match = extra.match(/(\d+)%/);
            if (match) pct = parseFloat(match[1]);
        } else if (typeof extra === 'number') {
            pct = extra;
        }
    }

    return (
        <div
            className="fleet-card"
            data-hl={hl ? 'true' : 'false'}
            data-hl-blue={hlBlue ? 'true' : 'false'}
            onClick={onClick}
            style={{
                padding: large ? '26px 30px' : '22px 26px',
                display: 'flex',
                flexDirection: 'column',
                gap: large ? '12px' : '10px',
                cursor: onClick ? 'pointer' : 'default',
                '--fc-bg': gradient,
                '--fc-border': border,
                '--fc-accent': defaultAccent
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', zIndex: 1 }}>
                <div>
                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: large ? '14px' : '13px', color: textColor, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: large ? 800 : 700 }}>
                        {label}
                    </div>
                    {subtext && <div style={{ fontSize: '12px', color: hl ? '#b91c1c' : '#8091a7', marginTop: '4px', fontWeight: 600, letterSpacing: '0.01em', lineHeight: 1.3 }}>{subtext}</div>}
                </div>
                {pct !== null && (
                    <div style={{ flexShrink: 0, marginTop: '-4px' }}>
                        <ProgressCircle pct={pct} color={defaultAccent} />
                    </div>
                )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: large ? '40px' : '34px', fontWeight: 900, color: valColor }} className="mono">{value}</span>
                    {extra && !badgeBg && pct === null && <span style={{ fontSize: '14.5px', fontWeight: 700, color: color }}>{extra}</span>}
                </div>
                {extra && badgeBg && (
                    <div style={{ display: 'inline-flex', padding: '5px 10px', borderRadius: '8px', background: badgeBg, color: color, fontWeight: 700, fontSize: '12px', width: 'fit-content' }}>
                        {extra}
                    </div>
                )}
            </div>
        </div>
    );
};

const SubBadge = ({ text, color = 'inherit' }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)', padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, color, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
        {text}
    </span>
);

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
    const activeCat = String(category !== 'all' ? category : (selectedCategory || 'all')).toUpperCase();
    const isSeaMode = activeCat === 'SEA';
    const isAirMode = activeCat === 'AIR';
    const isAllModes = !isSeaMode && !isAirMode;

    // Single-day / daywise check: ONLY daywise hides projection; every other filter shows projection
    const isDayWise = filterType === 'day' || (filterType === 'custom' && Boolean(dateRange?.start && dateRange?.end && dateRange.start === dateRange.end));

    // Tab state
    const [activeTab, setActiveTab] = useState('dashboard');

    // If daywise selected while on projection or predictive tab, fall back to dashboard
    useEffect(() => {
        if (isDayWise && (activeTab === 'projection' || activeTab === 'predictive')) {
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
    const [exceptionFilter, setExceptionFilter] = useState('all');
    const [exceptionBranchFilter, setExceptionBranchFilter] = useState('all');
    const [exceptionLocationFilter, setExceptionLocationFilter] = useState('all');
    const [exceptionModeFilter, setExceptionModeFilter] = useState('all');
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

    // Projection for all non-daywise filters
    const projectedTotal = useMemo(() => {
        if (isDayWise) return totalLeo;
        if (!elapsedDays || elapsedDays <= 0) return 0;
        const rate = totalLeo / elapsedDays;
        return Math.round(rate * totalDays);
    }, [isDayWise, totalLeo, elapsedDays, totalDays]);

    const totalGrowthPct = useMemo(() => {
        if (!prevTotal) return totalLeo > 0 ? '▲ +100%' : '— 0%';
        const comparisonBase = isDayWise ? totalLeo : projectedTotal;
        const diff = comparisonBase - prevTotal;
        const pct = Math.round((diff / prevTotal) * 100);
        return `${pct >= 0 ? '▲ +' : '▼ '}${pct}%`;
    }, [isDayWise, totalLeo, projectedTotal, prevTotal]);

    const projectionPerfVal = useMemo(() => {
        if (!prevTotal || prevTotal <= 0) return 100;
        return (projectedTotal / prevTotal) * 100;
    }, [projectedTotal, prevTotal]);

    const avgRunRatePerfVal = useMemo(() => {
        if (!prevAvgDaily || prevAvgDaily <= 0) return 100;
        return (avgDaily / prevAvgDaily) * 100;
    }, [avgDaily, prevAvgDaily]);

    const projectionTheme = useMemo(() => getColorTheme(projectionPerfVal), [projectionPerfVal]);
    const avgRunRateTheme = useMemo(() => getColorTheme(avgRunRatePerfVal), [avgRunRatePerfVal]);

    // Branch table data with projections and ▲ Up / ▼ Down arrows for all filters except daywise
    const branchTableData = useMemo(() => {
        const list = reportData?.branchWise || [];
        return list.map(b => {
            const bAvg = elapsedDays > 0 ? Math.round((b.total / elapsedDays) * 10) / 10 : 0;
            const bProj = isDayWise
                ? b.total
                : (elapsedDays > 0 ? Math.round((b.total / elapsedDays) * totalDays) : 0);

            const prev = b.prevTotal || 0;
            const diff = bProj - prev;
            let pct = 0;
            let arrow = '—';
            let label = '— 0%';
            let status = 'On Track';
            let statusVariant = 'success';

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
            }

            return {
                ...b,
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
        });
    }, [reportData, elapsedDays, totalDays, isDayWise]);

    // Top branch projection
    const topBranch = useMemo(() => {
        if (!branchTableData.length) return null;
        return [...branchTableData].sort((a, b) => b.total - a.total)[0];
    }, [branchTableData]);

    const topBranchPerfVal = useMemo(() => {
        if (!topBranch || !topBranch.avgDaily) return 100;
        const prev = topBranch.prevTotal || 1;
        return (topBranch.projection / prev) * 100;
    }, [topBranch]);
    const topBranchTheme = useMemo(() => getColorTheme(topBranchPerfVal), [topBranchPerfVal]);

    // Detailed Location / ICD Station Projections for Projection Report
    const locationProjectionDetails = useMemo(() => {
        if (isDayWise || !elapsedDays || elapsedDays <= 0) return [];
        const jobs = reportData?.detailedJobs || [];
        const map = {};
        jobs.forEach(j => {
            const loc = String(j.custom_house || j.location || j.port_of_reporting || 'Unassigned').trim();
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
            map[loc].teus += (Number(j.total_teus) || (cType === 'LCL' ? 0 : 1));
        });

        return Object.values(map).map(locItem => {
            const proj = Math.round((locItem.cleared / elapsedDays) * totalDays);
            const projFcl = Math.round((locItem.seaFcl / elapsedDays) * totalDays);
            const projLcl = Math.round((locItem.seaLcl / elapsedDays) * totalDays);
            const projAir = Math.round((locItem.air / elapsedDays) * totalDays);
            const projTeus = Math.round((locItem.teus / elapsedDays) * totalDays);
            const avgDaily = (locItem.cleared / elapsedDays).toFixed(1);
            const sharePct = projectedTotal > 0 ? Math.round((proj / projectedTotal) * 100) : 0;

            return {
                ...locItem,
                projection: proj,
                projFcl,
                projLcl,
                projAir,
                projTeus,
                avgDaily,
                sharePct
            };
        }).sort((a, b) => b.projection - a.projection);
    }, [reportData, isDayWise, elapsedDays, totalDays, projectedTotal]);

    // Cargo Mode level projections
    const modeProjections = useMemo(() => {
        if (isDayWise || !elapsedDays || elapsedDays <= 0) return { fclProj: 0, lclProj: 0, airProj: 0, fclCleared: 0, lclCleared: 0, airCleared: 0 };
        const jobs = reportData?.detailedJobs || [];
        let fcl = 0, lcl = 0, air = 0;
        jobs.forEach(j => {
            const m = String(j.mode || '').toLowerCase();
            const cType = String(j.consignment_type || '').toUpperCase();
            if (m.includes('air')) air++;
            else if (cType === 'LCL') lcl++;
            else fcl++;
        });
        return {
            fclProj: Math.round((fcl / elapsedDays) * totalDays),
            fclCleared: fcl,
            lclProj: Math.round((lcl / elapsedDays) * totalDays),
            lclCleared: lcl,
            airProj: Math.round((air / elapsedDays) * totalDays),
            airCleared: air
        };
    }, [reportData, isDayWise, elapsedDays, totalDays]);

    // Sorted & filtered customers / exporters
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
            const sum = windowSlice.reduce((acc, curr) => acc + (curr.totalLeo || curr.totalOoc || 0), 0);
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

    // Active exception summary analytics & branch/station drill-down stats
    const activeExceptionStats = useMemo(() => {
        const rawList = reportData?.exceptionsList || [];
        const baseList = rawList.filter(item => {
            if (exceptionFilter === 'detention' && !item.isDetentionRisk) return false;
            if (exceptionFilter === 'doExpired' && !item.isDoExpired) return false;
            if (exceptionFilter === 'billing' && !item.isBillingPending) return false;
            if (exceptionFilter === 'delivery' && !item.isDeliveryPending) return false;
            if (exceptionFilter === 'fines' && !item.hasFineOrPenalty) return false;
            return true;
        });

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
            const loc = String(item.location || item.custom_house || item.port_of_reporting || 'Unassigned').trim();
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
    }, [reportData, exceptionFilter, exceptionBranchFilter]);

    // Filtered exceptions
    const filteredExceptions = useMemo(() => {
        const list = reportData?.exceptionsList || [];
        return list.filter(item => {
            if (exceptionFilter === 'detention' && !item.isDetentionRisk) return false;
            if (exceptionFilter === 'doExpired' && !item.isDoExpired) return false;
            if (exceptionFilter === 'billing' && !item.isBillingPending) return false;
            if (exceptionFilter === 'delivery' && !item.isDeliveryPending) return false;
            if (exceptionFilter === 'fines' && !item.hasFineOrPenalty) return false;

            if (exceptionBranchFilter && exceptionBranchFilter !== 'all') {
                const itemBranch = String(item.branch_code || item.branch || 'Unassigned').toUpperCase().trim();
                if (itemBranch !== exceptionBranchFilter) return false;
            }

            if (exceptionLocationFilter && exceptionLocationFilter !== 'all') {
                const itemLoc = String(item.location || item.custom_house || item.port_of_reporting || 'Unassigned').trim();
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
                const matchLoc = (item.location || item.custom_house || item.port_of_reporting)?.toLowerCase().includes(q);
                if (!matchJob && !matchBe && !matchImp && !matchBr && !matchLoc) return false;
            }
            return true;
        });
    }, [reportData, exceptionFilter, exceptionBranchFilter, exceptionLocationFilter, exceptionModeFilter, exceptionSearch]);

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
            { id: 'projection', label: '🎯 Projection Report' },
            { id: 'predictive', label: '🎯 Target Planner & Smart Forecast' }
        ] : []),
        { id: 'trend', label: '📈 Trend & Analytics' },
        { id: 'exceptions', label: `⚠️ Exceptions (${reportData?.exceptionsSummary?.total || 0})` },
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
                        <div className="kpi-info-tip" style={{ width: '320px', top: '115%', bottom: 'auto' }}>
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
                    {/* Row 1: Core Hero KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                        <KpiCard
                            label="Total LEO Cleared"
                            value={totalLeo.toLocaleString()}
                            extra={totalGrowthPct}
                            badgeBg={totalGrowthPct.startsWith('▼') ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)'}
                            color={totalGrowthPct.startsWith('▼') ? '#dc2626' : '#059669'}
                            accentColor="#4f46e5"
                            subtext={`⏱️ ${elapsedDays} days elapsed • Prev: ${prevTotal.toLocaleString()}`}
                            large
                        />

                        {isAirMode ? (
                            <KpiCard
                                label="Air Export Shipments"
                                value={(stats.airJobs || totalLeo || 0).toLocaleString()}
                                extra="Air Jobs"
                                accentColor="#0ea5e9"
                                subtext={(
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                                        <SubBadge text="Air Consignments Cleared" color="#0284c7" />
                                    </div>
                                )}
                                large
                            />
                        ) : (
                            <KpiCard
                                label={isSeaMode ? "Sea Containers & Volume" : "Containers & Volume"}
                                value={totalTeus.toLocaleString()}
                                extra="TEUs"
                                accentColor="#06b6d4"
                                subtext={(
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
                                        <SubBadge text={`20': ${stats.fcl20 || 0}`} color="#0284c7" />
                                        <SubBadge text={`40': ${stats.fcl40 || 0}`} color="#6366f1" />
                                        <SubBadge text={`LCL: ${stats.lclJobs || 0}`} color="#d97706" />
                                        {isAllModes && stats.airJobs > 0 && <SubBadge text={`Air: ${stats.airJobs}`} color="#0ea5e9" />}
                                    </div>
                                )}
                                large
                            />
                        )}

                        <KpiCard
                            label="Daily LEO Pace"
                            value={avgDaily}
                            extra="/ day"
                            accentColor="#10b981"
                            subtext={`Benchmark: ${prevAvgDaily} / day`}
                            large
                        />

                        {isAirMode ? (
                            <KpiCard
                                label="Air Clearance Channel"
                                value={`${stats.airJobs || totalLeo || 0} Air`}
                                extra="100%"
                                accentColor="#0ea5e9"
                                subtext={<div style={{ color: '#0284c7', fontWeight: 600, fontSize: '12px', marginTop: '4px' }}>✈️ Airport Customs Channel (100% Air)</div>}
                                large
                            />
                        ) : isSeaMode ? (() => {
                            const fclTotal = (stats.fcl20 || 0) + (stats.fcl40 || 0);
                            const lclTotal = stats.lclJobs || 0;
                            const seaSum = fclTotal + lclTotal;
                            const fclPct = seaSum > 0 ? ((fclTotal / seaSum) * 100).toFixed(0) : 100;
                            const lclPct = seaSum > 0 ? ((lclTotal / seaSum) * 100).toFixed(0) : 0;
                            return (
                                <KpiCard
                                    label="Sea Clearance Types"
                                    value={`${fclTotal.toLocaleString()} FCL`}
                                    extra={`${lclTotal.toLocaleString()} LCL`}
                                    accentColor="#3b82f6"
                                    subtext={(
                                        <div style={{ marginTop: '4px' }}>
                                            <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
                                                <div style={{ width: `${fclPct}%`, background: '#3b82f6' }} />
                                                <div style={{ width: `${lclPct}%`, background: '#d97706' }} />
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '3px', fontWeight: 600, color: '#64748b' }}>
                                                <span>📦 FCL ({fclPct}%)</span>
                                                <span>📦 LCL ({lclPct}%)</span>
                                            </div>
                                        </div>
                                    )}
                                    large
                                />
                            );
                        })() : (
                            <KpiCard
                                label="Transport Mode Split"
                                value={`${stats.seaJobs || 0} Sea`}
                                extra={`${stats.airJobs || 0} Air`}
                                accentColor="#f59e0b"
                                subtext={(
                                    <div style={{ marginTop: '4px' }}>
                                        <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
                                            <div style={{ width: `${totalLeo > 0 ? ((stats.seaJobs || 0) / totalLeo) * 100 : 50}%`, background: '#3b82f6' }} />
                                            <div style={{ width: `${totalLeo > 0 ? ((stats.airJobs || 0) / totalLeo) * 100 : 50}%`, background: '#06b6d4' }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '3px', fontWeight: 600, color: '#64748b' }}>
                                            <span>🚢 Sea ({totalLeo > 0 ? (((stats.seaJobs || 0) / totalLeo) * 100).toFixed(0) : 0}%)</span>
                                            <span>✈️ Air ({totalLeo > 0 ? (((stats.airJobs || 0) / totalLeo) * 100).toFixed(0) : 0}%)</span>
                                        </div>
                                    </div>
                                )}
                                large
                            />
                        )}
                    </div>

                    {/* Row 2: Projections & Performance Benchmark Cards (Shown for EVERY filter except daywise) */}
                    {!isDayWise && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>🎯</span> Run-Rate Projections & Benchmarks ({totalDays} Days Period)
                                </div>
                                <button
                                    onClick={() => setActiveTab('projection')}
                                    style={{ background: 'transparent', border: 'none', color: '#4f46e5', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                                >
                                    Open Full Projection Report →
                                </button>
                            </div>

                            {/* Macro KPI Row */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                                <KpiCard
                                    label="Average LEO Per Day"
                                    value={avgDaily}
                                    extra={avgRunRateTheme.performanceLabel}
                                    color={avgRunRateTheme.color}
                                    gradient={avgRunRateTheme.bg}
                                    border={avgRunRateTheme.border}
                                    badgeBg={avgRunRateTheme.badgeBg}
                                    accentColor={avgRunRateTheme.color}
                                    subtext={`Paced over ${elapsedDays} elapsed days`}
                                    large
                                />
                                <KpiCard
                                    label="Projection LEO – All Branches"
                                    value={projectedTotal.toLocaleString()}
                                    extra={projectionTheme.performanceLabel}
                                    color={projectionTheme.color}
                                    gradient={projectionTheme.bg}
                                    border={projectionTheme.border}
                                    badgeBg={projectionTheme.badgeBg}
                                    accentColor={projectionTheme.color}
                                    subtext={`Estimated full-period volume (${totalDays} days)`}
                                    large
                                />
                                <KpiCard
                                    label="Previous Period Delta"
                                    value={totalLeo >= prevTotal ? `+${(totalLeo - prevTotal).toLocaleString()}` : `-${(prevTotal - totalLeo).toLocaleString()}`}
                                    extra={totalGrowthPct}
                                    color={totalLeo >= prevTotal ? '#059669' : '#dc2626'}
                                    badgeBg={totalLeo >= prevTotal ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)'}
                                    accentColor={totalLeo >= prevTotal ? '#10b981' : '#ef4444'}
                                    subtext={`Benchmark: ${prevTotal.toLocaleString()} total LEO`}
                                    large
                                />
                                <div style={{
                                    background: '#ffffff',
                                    borderRadius: '16px',
                                    border: '1px solid #e2e8f0',
                                    padding: '16px 18px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    boxShadow: '0 4px 12px -2px rgba(0,0,0,0.03)'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            🚢 / ✈️ Projected Cargo Split
                                        </div>
                                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', marginTop: '6px', fontFamily: "'Outfit', sans-serif" }}>
                                            {modeProjections.fclProj + modeProjections.lclProj} Sea • {modeProjections.airProj} Air
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ background: '#eff6ff', color: '#1e40af', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                                            📦 FCL: {modeProjections.fclProj}
                                        </span>
                                        <span style={{ background: '#fffbeb', color: '#b45309', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                                            📦 LCL: {modeProjections.lclProj}
                                        </span>
                                        <span style={{ background: '#f0fdf4', color: '#166534', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                                            ✈️ Air: {modeProjections.airProj}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Row 3: Operational Exceptions Radar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>⚠️</span> Operational Exceptions & Clearance Bottlenecks
                            </div>
                            <button
                                onClick={() => setActiveTab('exceptions')}
                                style={{ background: 'transparent', border: 'none', color: '#dc2626', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                            >
                                Open Exception Manager ({reportData?.exceptionsSummary?.total || 0}) →
                            </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                            <KpiCard
                                label="Total Flagged"
                                value={reportData?.exceptionsSummary?.total || 0}
                                color="#1e293b"
                                accentColor="#64748b"
                                subtext="Cleared with pending actions"
                                onClick={() => { setActiveTab('exceptions'); setExceptionFilter('all'); }}
                            />
                            <KpiCard
                                label="Detention Risk"
                                value={reportData?.exceptionsSummary?.detentionRisk || 0}
                                color="#dc2626"
                                accentColor="#ef4444"
                                subtext="Container detention active"
                                hl={Boolean(reportData?.exceptionsSummary?.detentionRisk > 0)}
                                onClick={() => { setActiveTab('exceptions'); setExceptionFilter('detention'); }}
                            />
                            <KpiCard
                                label="DO / Gate Pass Expired"
                                value={reportData?.exceptionsSummary?.doExpired || 0}
                                color="#d97706"
                                accentColor="#f59e0b"
                                subtext="Pass expired before dispatch"
                                onClick={() => { setActiveTab('exceptions'); setExceptionFilter('doExpired'); }}
                            />
                            <KpiCard
                                label="Billing Pending"
                                value={reportData?.exceptionsSummary?.billingPending || 0}
                                color="#0284c7"
                                accentColor="#0ea5e9"
                                subtext="Export invoice pending"
                                onClick={() => { setActiveTab('exceptions'); setExceptionFilter('billing'); }}
                            />
                            <KpiCard
                                label="Dispatch Pending"
                                value={reportData?.exceptionsSummary?.deliveryPending || 0}
                                color="#475569"
                                accentColor="#94a3b8"
                                subtext="Awaiting vessel handover"
                                onClick={() => { setActiveTab('exceptions'); setExceptionFilter('delivery'); }}
                            />
                            <KpiCard
                                label="Fines / Penalties"
                                value={reportData?.exceptionsSummary?.finesOrPenalties || 0}
                                color="#dc2626"
                                accentColor="#ef4444"
                                subtext="Customs penalties levied"
                                onClick={() => { setActiveTab('exceptions'); setExceptionFilter('fines'); }}
                            />
                        </div>
                    </div>

                    {/* Row 4: Branch Performance Table & Dual Axis Chart */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
                        {/* Left: Branch Performance Table */}
                        <div className="fleet-table-wrap" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid rgba(226,232,240,0.6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h4 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '16px', color: '#0f172a' }}>
                                    🏢 {isDayWise ? 'Branch Performance' : 'Branch Performance & Projections'}
                                </h4>
                                <span className="status-pill-v2" data-variant="info">{branchTableData.length} Branches</span>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="fleet-table">
                                    <thead>
                                        <tr>
                                            <th>Branch</th>
                                            {!isAirMode && <th style={{ textAlign: 'center' }}>20'</th>}
                                            {!isAirMode && <th style={{ textAlign: 'center' }}>40'</th>}
                                            {!isSeaMode && <th style={{ textAlign: 'center' }}>Air</th>}
                                            {!isAirMode && <th style={{ textAlign: 'center' }}>TEUs</th>}
                                            <th style={{ textAlign: 'center' }}>Avg/Day</th>
                                            <th style={{ textAlign: 'center' }}>Prev Month</th>
                                            {!isDayWise && <th style={{ textAlign: 'center' }}>Projection</th>}
                                            {!isDayWise && <th style={{ textAlign: 'center' }}>Change vs Prev</th>}
                                            <th style={{ textAlign: 'right' }}>Total LEO</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {branchTableData.map(b => (
                                            <tr key={b.name}>
                                                <td style={{ fontWeight: 700, color: '#0f172a' }}>{b.name}</td>
                                                {!isAirMode && <td style={{ textAlign: 'center', color: '#64748b' }} className="mono">{b.c20 || 0}</td>}
                                                {!isAirMode && <td style={{ textAlign: 'center', color: '#64748b' }} className="mono">{b.c40 || 0}</td>}
                                                {!isSeaMode && <td style={{ textAlign: 'center', color: '#64748b' }} className="mono">{b.air || 0}</td>}
                                                {!isAirMode && <td style={{ textAlign: 'center', fontWeight: 700, color: '#4f46e5' }} className="mono">{b.teus || 0}</td>}
                                                <td style={{ textAlign: 'center' }} className="mono">{b.avgDaily || 0}</td>
                                                <td style={{ textAlign: 'center', color: '#64748b' }} className="mono">{b.prevTotal || 0}</td>
                                                {!isDayWise && (
                                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#059669' }} className="mono">
                                                        {b.projection?.toLocaleString() || 0}
                                                    </td>
                                                )}
                                                {!isDayWise && (
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span className="status-pill-v2" data-variant={b.changePct >= 0 ? 'success' : 'error'}>
                                                            {b.changeLabel}
                                                        </span>
                                                    </td>
                                                )}
                                                <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }} className="mono">
                                                    {b.total?.toLocaleString() || 0}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Right: Dual Axis Chart */}
                        <div className="fleet-chart-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <div>
                                    <h3 style={{ margin: 0 }}>📊 {isDayWise ? 'Branch Clearance Output' : 'Branch Run-Rate vs Projections'}</h3>
                                    <span className="sub">{isDayWise ? 'Actual clearance volume by station' : 'Actual clearances vs estimated full-period output'}</span>
                                </div>
                            </div>
                            <div style={{ height: '320px', width: '100%', flex: 1 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={branchTableData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12, fontFamily: "'Outfit', sans-serif" }} />
                                        <YAxis yAxisId="left" tick={{ fill: '#64748b', fontSize: 12 }} />
                                        {!isDayWise && <YAxis yAxisId="right" orientation="right" tick={{ fill: '#64748b', fontSize: 12 }} />}
                                        <Tooltip content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="fleet-tooltip-v2">
                                                        <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px', fontFamily: "'Outfit', sans-serif" }}>{label} Branch</div>
                                                        {payload.map((p, i) => (
                                                            <div key={i} style={{ color: p.color, fontSize: '13px', fontWeight: 600 }}>
                                                                {p.name}: <strong>{p.value?.toLocaleString()}</strong>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }} />
                                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px', fontFamily: "'Outfit', sans-serif" }} />
                                        <Bar yAxisId="left" dataKey="total" name="Total LEO" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                                        {!isDayWise && <Line yAxisId="right" type="monotone" dataKey="projection" name="Projected LEO" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: '#10b981' }} />}
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
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
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.85)', padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(226,232,240,0.6)', fontSize: '13px' }}>
                                            <span style={{ fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }} title={g.customer}>
                                                {g.customer}
                                            </span>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.85)', padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(226,232,240,0.6)', fontSize: '13px' }}>
                                            <span style={{ fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }} title={f.customer}>
                                                {f.customer}
                                            </span>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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

                        {/* Searchable Exporters Matrix */}
                        <div className="fleet-table-wrap">
                            <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(226,232,240,0.6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <input
                                    type="text"
                                    placeholder="🔍 Search Exporters..."
                                    value={customerSearch}
                                    onChange={e => setCustomerSearch(e.target.value)}
                                    style={{
                                        maxWidth: '320px',
                                        padding: '8px 16px',
                                        borderRadius: '12px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '13.5px',
                                        outline: 'none',
                                        fontFamily: "'Outfit', sans-serif"
                                    }}
                                />
                                <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>Showing <strong>{filteredCustomers.length}</strong> exporters</span>
                            </div>
                            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                                <table className="fleet-table">
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                                        <tr>
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
                                            <tr key={i}>
                                                <td style={{ fontWeight: 700, color: '#0f172a', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.customer}>
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
                                                <td colSpan={isAirMode ? 6 : isSeaMode ? 8 : 9} style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>No exporters found matching search.</td>
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
                TAB 2: PROJECTION REPORT
                ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'projection' && !isDayWise && (
                <>
                    {/* Projection KPI Summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                        <KpiCard
                            label="Projected Period Volume"
                            value={projectedTotal.toLocaleString()}
                            extra={projectionTheme.performanceLabel}
                            color={projectionTheme.color}
                            gradient={projectionTheme.bg}
                            border={projectionTheme.border}
                            badgeBg={projectionTheme.badgeBg}
                            accentColor={projectionTheme.color}
                            subtext={`Estimated ${totalDays}-day volume • Benchmark: ${prevTotal.toLocaleString()}`}
                            large
                        />

                        <KpiCard
                            label="Daily Clearance Run-Rate"
                            value={avgDaily}
                            extra={avgRunRateTheme.performanceLabel}
                            color={avgRunRateTheme.color}
                            gradient={avgRunRateTheme.bg}
                            border={avgRunRateTheme.border}
                            badgeBg={avgRunRateTheme.badgeBg}
                            accentColor={avgRunRateTheme.color}
                            subtext={`Current ${elapsedDays}-day pace • Benchmark: ${prevAvgDaily}/day`}
                            large
                        />

                        <KpiCard
                            label={`Top Station (${topBranch?.name || '—'})`}
                            value={topBranch?.projection?.toLocaleString() || '0'}
                            extra={topBranchTheme.performanceLabel}
                            color={topBranchTheme.color}
                            gradient={topBranchTheme.bg}
                            border={topBranchTheme.border}
                            badgeBg={topBranchTheme.badgeBg}
                            accentColor={topBranchTheme.color}
                            subtext={`Cleared ${topBranch?.total || 0} LEO • Prev: ${topBranch?.prevTotal || 0}`}
                            large
                        />

                        <KpiCard
                            label="Previous Month Actual"
                            value={prevTotal.toLocaleString()}
                            extra="Baseline"
                            color="#64748b"
                            badgeBg="rgba(148, 163, 184, 0.15)"
                            accentColor="#64748b"
                            subtext="Full previous period volume"
                            large
                        />
                    </div>

                    {/* Branch-Wise Run-Rate & Projections Breakdown Cards */}
                    {branchTableData.length > 0 && (
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            padding: '18px 20px',
                            boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Outfit', sans-serif" }}>
                                    <span>🏢</span> Branch-Wise Projection Breakdown ({totalDays} Days Period)
                                </div>
                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                                    {branchTableData.length} Operational Branches
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                                {branchTableData.map(b => {
                                    const perfVal = b.prevTotal > 0 ? (b.projection / b.prevTotal) * 100 : (b.projection > 0 ? 100 : 0);
                                    const theme = getColorTheme(perfVal);
                                    return (
                                        <div
                                            key={b.name}
                                            style={{
                                                background: '#f8fafc',
                                                borderRadius: '12px',
                                                border: `1px solid ${theme.border || '#e2e8f0'}`,
                                                padding: '14px 16px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
                                                    Projection – {b.name}
                                                </span>
                                                <span style={{
                                                    fontSize: '11px',
                                                    fontWeight: 800,
                                                    color: theme.color,
                                                    background: theme.badgeBg || '#f1f5f9',
                                                    padding: '2px 7px',
                                                    borderRadius: '6px'
                                                }}>
                                                    {b.changeLabel}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '8px' }}>
                                                <span style={{ fontSize: '24px', fontWeight: 900, color: theme.color, fontFamily: "'Outfit', sans-serif" }}>
                                                    {b.projection?.toLocaleString()}
                                                </span>
                                                <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
                                                    Projected LEO
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '6px', fontWeight: 500 }}>
                                                Cleared {b.total?.toLocaleString()} LEO • {b.avgDaily}/day
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                                Prev Month: {b.prevTotal?.toLocaleString() || 0} LEO
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

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

                    {/* Branch-Wise Projection Comparison Matrix */}
                    <div className="fleet-table-wrap" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid rgba(226,232,240,0.6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                            <div>
                                <h4 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '17px', color: '#0f172a' }}>
                                    🎯 Branch-Wise Projection & Variance Matrix
                                </h4>
                                <span style={{ color: '#64748b', fontSize: '13px' }}>
                                    Comparing current run-rate projection vs previous month actual output
                                </span>
                            </div>
                            <span className="status-pill-v2" data-variant="info">{branchTableData.length} Branch Stations</span>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="fleet-table">
                                <thead>
                                    <tr>
                                        <th>Branch Station</th>
                                        <th style={{ textAlign: 'center' }}>Actual Cleared</th>
                                        <th style={{ textAlign: 'center' }}>Avg LEO / Day</th>
                                        <th style={{ textAlign: 'center' }}>Prev Month LEO</th>
                                        <th style={{ textAlign: 'center', color: '#4f46e5' }}>Projected LEO</th>
                                        <th style={{ textAlign: 'center' }}>Variance</th>
                                        <th style={{ textAlign: 'center' }}>% Change (vs Prev)</th>
                                        <th style={{ textAlign: 'center' }}>Performance Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {branchTableData.map(b => (
                                        <tr key={b.name}>
                                            <td style={{ fontWeight: 800, color: '#0f172a' }}>{b.name}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 700 }} className="mono">{b.total?.toLocaleString() || 0}</td>
                                            <td style={{ textAlign: 'center', color: '#64748b' }} className="mono">{b.avgDaily || 0}</td>
                                            <td style={{ textAlign: 'center', color: '#64748b' }} className="mono">{b.prevTotal?.toLocaleString() || 0}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 800, color: '#4f46e5', fontSize: '15px' }} className="mono">
                                                {b.projection?.toLocaleString() || 0}
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: 700, color: b.variance >= 0 ? '#059669' : '#dc2626' }} className="mono">
                                                {b.variance >= 0 ? `+${b.variance?.toLocaleString()}` : b.variance?.toLocaleString()}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span
                                                    className="status-pill-v2"
                                                    data-variant={b.changePct >= 0 ? 'success' : 'error'}
                                                    style={{ fontWeight: 800, fontSize: '12px' }}
                                                >
                                                    {b.changeLabel}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className="status-pill-v2" data-variant={b.statusVariant}>
                                                    {b.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Visual Comparison Bar Chart */}
                    <div className="fleet-chart-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div>
                                <h3 style={{ margin: 0 }}>📊 Previous Month Actual vs Current Period Projected LEO</h3>
                                <span className="sub">Station-level performance benchmark comparison</span>
                            </div>
                        </div>
                        <div style={{ height: '340px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={branchTableData} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12, fontFamily: "'Outfit', sans-serif" }} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <Tooltip content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="fleet-tooltip-v2">
                                                    <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '6px', fontFamily: "'Outfit', sans-serif" }}>{label} Branch</div>
                                                    {payload.map((p, i) => (
                                                        <div key={i} style={{ color: p.color, fontSize: '13px', fontWeight: 600 }}>
                                                            {p.name}: <strong>{p.value?.toLocaleString()}</strong>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }
                                        return null;
                                    }} />
                                    <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px', fontFamily: "'Outfit', sans-serif" }} />
                                    <Bar dataKey="prevTotal" name="Previous Month Actual" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="projection" name="Current Projected LEO" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                TAB: PREDICTIVE & VISUAL ANALYTICS
                ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'predictive' && (
                <DataSciencePredictiveTab
                    type="LEO"
                    reportData={reportData}
                    totalCleared={totalLeo}
                    totalTeus={totalTeus}
                    stats={stats}
                    prevStats={prevStats}
                    elapsedDays={elapsedDays}
                    totalDays={totalDays}
                    avgDaily={avgDaily}
                    prevAvgDaily={prevAvgDaily}
                    prevTotal={prevTotal}
                    projectedTotal={projectedTotal}
                    branchTableData={branchTableData}
                    isSeaMode={isSeaMode}
                    isAirMode={isAirMode}
                    isAllModes={isAllModes}
                    isDayWise={isDayWise}
                />
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
                            </div>
                            <div style={{ height: '320px', width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={dailyTrendData} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                                        <defs>
                                            <linearGradient id="leoGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="displayDate" tick={{ fill: '#64748b', fontSize: 11, fontFamily: "'Outfit', sans-serif" }} />
                                        <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                                        <Tooltip content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="fleet-tooltip-v2">
                                                        <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px', fontFamily: "'Outfit', sans-serif" }}>{label}</div>
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
                                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px', fontFamily: "'Outfit', sans-serif" }} />
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
                            <div style={{ height: '320px', width: '100%', position: 'relative', marginTop: '12px' }}>
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
                                                    <div className="fleet-tooltip-v2">
                                                        <div style={{ fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>{d.name}</div>
                                                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Total: <strong>{d.value?.toLocaleString()}</strong> ({pct}%)</div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }} />
                                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px', fontFamily: "'Outfit', sans-serif" }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                                    <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>{(totalLeo || 0).toLocaleString()}</div>
                                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Total LEO</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Exporter Monthly Matrix (Apr to Mar) */}
                    <div className="fleet-table-wrap">
                        <div style={{ padding: '18px 24px', borderBottom: '1px solid rgba(226,232,240,0.6)' }}>
                            <h4 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '16px', color: '#0f172a' }}>
                                📊 Exporter Monthly Trends (Apr – Mar)
                            </h4>
                        </div>
                        <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                            <table className="fleet-table">
                                <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                                    <tr>
                                        <th>Exporter Name</th>
                                        {MONTH_NAMES.map(m => (
                                            <th key={m.key} style={{ textAlign: 'center', minWidth: '48px' }}>{m.name}</th>
                                        ))}
                                        <th style={{ textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>FY Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(reportData?.customerMonthlySummary || []).map((row, idx) => (
                                        <tr key={idx}>
                                            <td style={{ fontWeight: 700, color: '#0f172a', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.customer}>
                                                {row.customer}
                                            </td>
                                            {MONTH_NAMES.map(m => (
                                                <td key={m.key} style={{ textAlign: 'center' }} className="mono">
                                                    {row.months?.[m.key] ? (
                                                        <span className="status-pill-v2" data-variant="info">{row.months[m.key]}</span>
                                                    ) : (
                                                        <span style={{ color: '#cbd5e1' }}>-</span>
                                                    )}
                                                </td>
                                            ))}
                                            <td style={{ textAlign: 'center', fontWeight: 800, color: '#0f172a' }} className="mono">{row.total || 0}</td>
                                        </tr>
                                    ))}
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
                <div className="fleet-table-wrap" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
                        <div>
                            <h4 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '18px', color: '#0f172a' }}>
                                ⚠️ Export Operational Exceptions Queue
                            </h4>
                            <span style={{ color: '#64748b', fontSize: '13px' }}>Cleared LEO export jobs requiring operational follow-up</span>
                        </div>
                        <span className="status-pill-v2" data-variant="error" style={{ fontSize: '13px', padding: '6px 14px' }}>
                            {filteredExceptions.length} Flagged Jobs
                        </span>
                    </div>

                    {/* 6 Interactive Sub-Tab Exception Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                        {[
                            {
                                id: 'all',
                                label: 'TOTAL FLAGGED',
                                value: reportData?.exceptionsSummary?.total || 0,
                                color: '#0f172a',
                                accentColor: '#4f46e5',
                                subtext: 'Cleared with pending actions',
                                bg: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)',
                                border: '1px solid rgba(226, 232, 240, 0.9)'
                            },
                            {
                                id: 'detention',
                                label: 'DETENTION RISK',
                                value: reportData?.exceptionsSummary?.detentionRisk || 0,
                                color: '#dc2626',
                                accentColor: '#ef4444',
                                subtext: 'Container detention active',
                                bg: 'linear-gradient(135deg, rgba(254, 242, 242, 0.95) 0%, rgba(254, 226, 226, 0.5) 100%)',
                                border: '1px solid rgba(254, 202, 202, 0.8)'
                            },
                            {
                                id: 'doExpired',
                                label: 'PASS EXPIRED',
                                value: reportData?.exceptionsSummary?.doExpired || 0,
                                color: '#d97706',
                                accentColor: '#f59e0b',
                                subtext: 'Shipping bill pass expired',
                                bg: 'linear-gradient(135deg, rgba(255, 251, 235, 0.95) 0%, rgba(254, 243, 199, 0.5) 100%)',
                                border: '1px solid rgba(253, 230, 138, 0.8)'
                            },
                            {
                                id: 'billing',
                                label: 'BILLING PENDING',
                                value: reportData?.exceptionsSummary?.billingPending || 0,
                                color: '#0284c7',
                                accentColor: '#0ea5e9',
                                subtext: 'Export billing document pending',
                                bg: 'linear-gradient(135deg, rgba(240, 249, 255, 0.95) 0%, rgba(224, 242, 254, 0.5) 100%)',
                                border: '1px solid rgba(186, 230, 253, 0.8)'
                            },
                            {
                                id: 'delivery',
                                label: 'DISPATCH PENDING',
                                value: reportData?.exceptionsSummary?.deliveryPending || 0,
                                color: '#475569',
                                accentColor: '#64748b',
                                subtext: 'Cargo not dispatched to vessel',
                                bg: 'linear-gradient(135deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.6) 100%)',
                                border: '1px solid rgba(226, 232, 240, 0.9)'
                            },
                            {
                                id: 'fines',
                                label: 'FINES / PENALTIES',
                                value: reportData?.exceptionsSummary?.finesOrPenalties || 0,
                                color: (reportData?.exceptionsSummary?.finesOrPenalties || 0) > 0 ? '#dc2626' : '#0f172a',
                                accentColor: '#ef4444',
                                subtext: 'Customs penalties levied',
                                bg: (reportData?.exceptionsSummary?.finesOrPenalties || 0) > 0
                                    ? 'linear-gradient(135deg, rgba(254, 242, 242, 0.85) 0%, rgba(254, 226, 226, 0.4) 100%)'
                                    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
                                border: '1px solid rgba(226, 232, 240, 0.9)'
                            }
                        ].map(card => {
                            const isSelected = exceptionFilter === card.id;
                            return (
                                <div
                                    key={card.id}
                                    onClick={() => { setExceptionFilter(card.id); setExceptionBranchFilter('all'); }}
                                    style={{
                                        padding: '14px 16px',
                                        borderRadius: '14px',
                                        background: card.bg,
                                        border: isSelected ? `2px solid ${card.accentColor}` : card.border,
                                        boxShadow: isSelected ? `0 8px 24px -4px ${card.accentColor}33, 0 0 0 2px ${card.accentColor}22` : '0 2px 8px rgba(0,0,0,0.02)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        transform: isSelected ? 'translateY(-2px)' : 'none',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        minHeight: '100px'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: card.color, fontFamily: "'Outfit', sans-serif" }}>
                                            {card.label}
                                        </div>
                                        <div style={{ fontSize: '11.5px', color: card.color === '#dc2626' ? '#b91c1c' : '#64748b', marginTop: '2px', lineHeight: 1.3, fontWeight: 500 }}>
                                            {card.subtext}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '24px', fontWeight: 900, color: card.color, marginTop: '8px', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}>
                                        {card.value.toLocaleString()}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Dynamic Multi-Level Branch, Station & Mode Drilldown */}
                    {activeExceptionStats.totalCount > 0 && (
                        <div style={{
                            background: '#ffffff',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            padding: '18px 20px',
                            marginBottom: '20px',
                            boxShadow: '0 4px 16px -2px rgba(0,0,0,0.03)'
                        }}>
                            {/* Header with Active Filters and Clear Button */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: "'Outfit', sans-serif" }}>
                                        🏢 Branch & Customs Station Drill-Down ({exceptionFilter === 'all' ? 'All Exceptions' : exceptionFilter.toUpperCase()})
                                    </span>
                                    <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 500 }}>
                                        • Click any branch or station to isolate
                                    </span>
                                </div>
                                {(exceptionBranchFilter !== 'all' || exceptionLocationFilter !== 'all' || exceptionModeFilter !== 'all') && (
                                    <button
                                        onClick={() => {
                                            setExceptionBranchFilter('all');
                                            setExceptionLocationFilter('all');
                                            setExceptionModeFilter('all');
                                        }}
                                        style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '4px 10px', fontSize: '11.5px', fontWeight: 700, color: '#dc2626', cursor: 'pointer' }}
                                    >
                                        ✕ Reset All Filters
                                    </button>
                                )}
                            </div>

                            {/* Level 1: Branch Selector Pills */}
                            <div style={{ marginBottom: '14px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.04em' }}>
                                    Level 1: Operational Branch
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    <div
                                        onClick={() => {
                                            setExceptionBranchFilter('all');
                                            setExceptionLocationFilter('all');
                                            setExceptionModeFilter('all');
                                        }}
                                        style={{
                                            padding: '7px 13px',
                                            borderRadius: '10px',
                                            background: exceptionBranchFilter === 'all' ? '#0f172a' : '#f8fafc',
                                            color: exceptionBranchFilter === 'all' ? '#ffffff' : '#334155',
                                            border: exceptionBranchFilter === 'all' ? '1px solid #0f172a' : '1px solid #e2e8f0',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '7px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <span>All Branches</span>
                                        <span style={{
                                            background: exceptionBranchFilter === 'all' ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                                            color: exceptionBranchFilter === 'all' ? '#ffffff' : '#0f172a',
                                            borderRadius: '6px',
                                            padding: '1px 6px',
                                            fontSize: '11px',
                                            fontWeight: 800
                                        }}>
                                            {activeExceptionStats.totalCount}
                                        </span>
                                    </div>

                                    {activeExceptionStats.sortedBranches.map(([br, count]) => {
                                        const isBrSelected = exceptionBranchFilter === br;
                                        const pct = Math.round((count / activeExceptionStats.totalCount) * 100);
                                        return (
                                            <div
                                                key={br}
                                                onClick={() => {
                                                    setExceptionBranchFilter(isBrSelected ? 'all' : br);
                                                    setExceptionLocationFilter('all');
                                                    setExceptionModeFilter('all');
                                                }}
                                                style={{
                                                    padding: '7px 13px',
                                                    borderRadius: '10px',
                                                    background: isBrSelected ? '#3b82f6' : '#f8fafc',
                                                    color: isBrSelected ? '#ffffff' : '#1e293b',
                                                    border: isBrSelected ? '1px solid #2563eb' : '1px solid #e2e8f0',
                                                    boxShadow: isBrSelected ? '0 4px 12px rgba(59,130,246,0.25)' : 'none',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '7px',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                <span>{br}</span>
                                                <span style={{
                                                    background: isBrSelected ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                                                    color: isBrSelected ? '#ffffff' : '#0f172a',
                                                    borderRadius: '6px',
                                                    padding: '1px 6px',
                                                    fontSize: '11px',
                                                    fontWeight: 800
                                                }}>
                                                    {count} ({pct}%)
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Level 2: Customs Ports / ICD Stations inside Selected Branch */}
                            {activeExceptionStats.sortedLocations.length > 0 && (
                                <div style={{ marginBottom: '14px', padding: '10px 12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>📍</span> Customs Ports & ICD Stations {exceptionBranchFilter !== 'all' ? `in ${exceptionBranchFilter}` : ''}:
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        <button
                                            onClick={() => setExceptionLocationFilter('all')}
                                            style={{
                                                padding: '4px 10px',
                                                borderRadius: '8px',
                                                background: exceptionLocationFilter === 'all' ? '#475569' : '#ffffff',
                                                color: exceptionLocationFilter === 'all' ? '#ffffff' : '#475569',
                                                border: '1px solid #cbd5e1',
                                                fontSize: '11.5px',
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            All Stations ({activeExceptionStats.branchScopedCount})
                                        </button>
                                        {activeExceptionStats.sortedLocations.map(([loc, count]) => {
                                            const isLocSelected = exceptionLocationFilter === loc;
                                            return (
                                                <button
                                                    key={loc}
                                                    onClick={() => setExceptionLocationFilter(isLocSelected ? 'all' : loc)}
                                                    style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '8px',
                                                        background: isLocSelected ? '#0284c7' : '#ffffff',
                                                        color: isLocSelected ? '#ffffff' : '#1e293b',
                                                        border: isLocSelected ? '1px solid #0284c7' : '1px solid #cbd5e1',
                                                        fontSize: '11.5px',
                                                        fontWeight: 700,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    <span>{loc}</span>
                                                    <span style={{ background: isLocSelected ? 'rgba(255,255,255,0.25)' : '#e2e8f0', padding: '1px 5px', borderRadius: '4px', fontSize: '10.5px' }}>
                                                        {count}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Level 3: Mode & Top Clients Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                                {/* Mode Split Filter */}
                                <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                                        🚢 / ✈️ Cargo Mode Split {exceptionBranchFilter !== 'all' ? `(${exceptionBranchFilter})` : ''}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        <span
                                            onClick={() => setExceptionModeFilter(exceptionModeFilter === 'fcl' ? 'all' : 'fcl')}
                                            style={{
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                background: exceptionModeFilter === 'fcl' ? '#3b82f6' : '#ffffff',
                                                color: exceptionModeFilter === 'fcl' ? '#ffffff' : '#1e293b',
                                                border: exceptionModeFilter === 'fcl' ? '1px solid #2563eb' : '1px solid #e2e8f0'
                                            }}
                                        >
                                            📦 FCL ({activeExceptionStats.seaFcl})
                                        </span>
                                        <span
                                            onClick={() => setExceptionModeFilter(exceptionModeFilter === 'lcl' ? 'all' : 'lcl')}
                                            style={{
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                background: exceptionModeFilter === 'lcl' ? '#d97706' : '#ffffff',
                                                color: exceptionModeFilter === 'lcl' ? '#ffffff' : '#1e293b',
                                                border: exceptionModeFilter === 'lcl' ? '1px solid #b45309' : '1px solid #e2e8f0'
                                            }}
                                        >
                                            📦 LCL ({activeExceptionStats.seaLcl})
                                        </span>
                                        <span
                                            onClick={() => setExceptionModeFilter(exceptionModeFilter === 'air' ? 'all' : 'air')}
                                            style={{
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                padding: '4px 8px',
                                                borderRadius: '6px',
                                                background: exceptionModeFilter === 'air' ? '#0284c7' : '#ffffff',
                                                color: exceptionModeFilter === 'air' ? '#ffffff' : '#1e293b',
                                                border: exceptionModeFilter === 'air' ? '1px solid #0284c7' : '1px solid #e2e8f0'
                                            }}
                                        >
                                            ✈️ Air ({activeExceptionStats.airCount})
                                        </span>
                                    </div>
                                </div>

                                {/* Top Impacted Clients in this Branch */}
                                <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                                    <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                                        🏢 Top Impacted Exporters {exceptionBranchFilter !== 'all' ? `(${exceptionBranchFilter})` : ''}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                        {activeExceptionStats.sortedTopClients.length > 0 ? activeExceptionStats.sortedTopClients.slice(0, 2).map(([c, cnt]) => (
                                            <div key={c} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#1e293b', fontWeight: 600 }}>
                                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }} title={c}>{c}</span>
                                                <span style={{ fontWeight: 800, color: '#4f46e5' }}>{cnt} jobs</span>
                                            </div>
                                        )) : (
                                            <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>None</span>
                                        )}
                                    </div>
                                </div>

                                {/* Total Fine Exposure if any */}
                                {activeExceptionStats.totalFines > 0 && (
                                    <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca' }}>
                                        <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#b91c1c', textTransform: 'uppercase' }}>
                                            ⚠️ Fine Exposure {exceptionBranchFilter !== 'all' ? `(${exceptionBranchFilter})` : ''}
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
                                            ₹{activeExceptionStats.totalFines.toLocaleString()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

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
                                    <th>Detailed Status</th>
                                    <th>Identified Issues</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredExceptions.map(item => (
                                    <tr key={item._id}>
                                        <td style={{ fontWeight: 800, color: '#4f46e5', cursor: 'pointer' }} className="mono" onClick={() => navigate(`/import-billing?search=${encodeURIComponent(item.job_no || item.job_number)}`)}>
                                            {item.job_no || item.job_number}
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 700, color: '#0f172a' }} className="mono">{item.be_no || item.sb_no || '—'}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }} className="mono">{item.be_date || item.sb_date || ''}</div>
                                        </td>
                                        <td style={{ fontWeight: 700, color: '#059669' }} className="mono">{item.out_of_charge || item.leo_date || '—'}</td>
                                        <td style={{ fontWeight: 600, color: '#1e293b', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.importer || item.exporter}>
                                            {item.importer || item.exporter}
                                        </td>
                                        <td><span className="status-pill-v2" data-variant="neutral">{item.branch_code}</span></td>
                                        <td>
                                            <span className="status-pill-v2" data-variant="info" style={{ marginRight: '4px' }}>{item.mode}</span>
                                            <span className="status-pill-v2" data-variant="neutral">{item.consignment_type}</span>
                                        </td>
                                        <td><span className="status-pill-v2" data-variant="warning">{item.detailed_status || item.status}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                {item.isDetentionRisk && <span className="status-pill-v2" data-variant="error">Detention Risk</span>}
                                                {item.isDoExpired && <span className="status-pill-v2" data-variant="warning">Pass Expired</span>}
                                                {item.isBillingPending && <span className="status-pill-v2" data-variant="info">Billing Pending</span>}
                                                {item.isDeliveryPending && <span className="status-pill-v2" data-variant="neutral">Dispatch Pending</span>}
                                                {item.hasFineOrPenalty && <span className="status-pill-v2" data-variant="error">Fine: ₹{item.fine_amount}</span>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredExceptions.length === 0 && (
                                    <tr>
                                        <td colSpan={8} style={{ textAlign: 'center', color: '#64748b', padding: '32px' }}>No exceptions found under selected filter.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
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
