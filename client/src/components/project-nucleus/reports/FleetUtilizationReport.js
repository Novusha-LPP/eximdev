import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import {
    ResponsiveContainer, ComposedChart, BarChart, Bar, Cell, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, Area, PieChart, Pie, ReferenceLine
} from 'recharts';
import { getTransportDates, TRANSPORT_BASE, TRANSPORT_HEADERS } from './reports-helper';

// ─── Constants ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
    { key: '4', name: 'Apr' }, { key: '5', name: 'May' }, { key: '6', name: 'Jun' },
    { key: '7', name: 'Jul' }, { key: '8', name: 'Aug' }, { key: '9', name: 'Sep' },
    { key: '10', name: 'Oct' }, { key: '11', name: 'Nov' }, { key: '12', name: 'Dec' },
    { key: '1', name: 'Jan' }, { key: '2', name: 'Feb' }, { key: '3', name: 'Mar' }
];

const STATUS_COLORS = {
    'Breakdown':       { fill: '#ef4444', label: 'Breakdown' },
    'Accident':        { fill: '#dc2626', label: 'Accident' },
    'Maintenance':     { fill: '#0ea5e9', label: 'Maintenance' },
    'Driver on Leave':  { fill: '#f59e0b', label: 'Driver on Leave' },
    'No Driver':       { fill: '#d97706', label: 'No Driver' },
    'Under detention': { fill: '#8b5cf6', label: 'Under Detention' },
    'Under trip':      { fill: '#10b981', label: 'Under Trip' },
    'IDLE':            { fill: '#94a3b8', label: 'Idle' },
    'Others':          { fill: '#64748b', label: 'Others' }
};

const UTIL_COLOR = (pct) => pct >= 90 ? '#10b981' : pct >= 75 ? '#f59e0b' : '#ef4444';

// ─── Utility Functions ──────────────────────────────────────────────────────────

const normalizeVehicleNo = (v) => v ? String(v).replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : '';

const getLRKey = (lr) => lr ? (lr.tr_no || lr.lr_no || lr.container_id || lr._id || lr.job_no || (lr.lr_date ? (normalizeVehicleNo(lr.vehicle_no) + '_' + lr.lr_date) : '')) : '';

const deduplicateArray = (arr, keyFn) => {
    const map = new Map();
    const noKeyItems = [];
    arr.forEach(item => {
        const key = keyFn(item);
        if (key) { map.set(key, item); } else { noKeyItems.push(item); }
    });
    return [...Array.from(map.values()), ...noKeyItems];
};

const hasStatus = (status, target) => {
    if (!status) return false;
    const targets = Array.isArray(target) ? target.map(t => t.toLowerCase()) : [target.toLowerCase()];
    const check = (val) => targets.includes(String(val || '').trim().toLowerCase());
    return Array.isArray(status) ? status.some(check) : check(status);
};

const getPrimaryCategory = (status) => {
    if (hasStatus(status, 'Breakdown')) return 'Breakdown';
    if (hasStatus(status, ['Accident', 'Accidents'])) return 'Accident';
    if (hasStatus(status, 'Maintenance')) return 'Maintenance';
    if (hasStatus(status, 'Driver on Leave')) return 'Driver on Leave';
    if (hasStatus(status, 'No Driver')) return 'No Driver';
    if (hasStatus(status, 'Under detention')) return 'Under detention';
    if (hasStatus(status, 'Under trip')) return 'Under trip';
    return 'Others';
};

const getCategoriesForVehicle = (v) => {
    const cat = getPrimaryCategory(v.status);
    if (cat !== 'Others') return cat;
    if (Array.isArray(v.status)) {
        const nonIdle = v.status.find(s => String(s).toUpperCase() !== 'IDLE');
        return nonIdle ? String(nonIdle).trim() : 'Others';
    }
    if (v.status) {
        const cleaned = String(v.status).trim();
        if (cleaned.toUpperCase() !== 'IDLE') return cleaned;
    }
    return 'Others';
};

/** Compute elapsed days for any filter type */
const computeElapsedDays = (filterType, selectedYear, selectedMonth, selectedQuarter, dateRange, dailyDataLen) => {
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();
    const selYear = parseInt(selectedYear) || todayYear;

    let totalDays = 30, elapsedDays = 30;

    if (filterType === 'month') {
        const selMonth = parseInt(selectedMonth);
        totalDays = new Date(selYear, selMonth + 1, 0).getDate();
        if (selYear === todayYear && selMonth === todayMonth) elapsedDays = Math.max(1, todayDate);
        else if (selYear > todayYear || (selYear === todayYear && selMonth > todayMonth)) elapsedDays = 0;
        else elapsedDays = totalDays;
    } else if (filterType === 'quarter') {
        const q = parseInt(selectedQuarter) || 2;
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
    } else if (filterType === 'day') {
        totalDays = 1; elapsedDays = 1;
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

/** Performance color theme based on percentage vs previous month */
const getColorTheme = (perfVal) => {
    const rawChange = perfVal - 100;
    const absChange = Math.abs(rawChange);
    const arrow = perfVal >= 100 ? '↑' : '↓';
    const displayChange = absChange < 1 && absChange > 0 ? absChange.toFixed(1) : Math.round(absChange);
    const performanceLabel = `${arrow} ${displayChange}%`;

    if (perfVal >= 100) return {
        color: '#059669', bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, transparent 100%)',
        border: '1px solid rgba(16, 185, 129, 0.2)', badgeBg: 'rgba(16, 185, 129, 0.1)', performanceLabel
    };
    if (perfVal >= 90) return {
        color: '#d97706', bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, transparent 100%)',
        border: '1px solid rgba(245, 158, 11, 0.2)', badgeBg: 'rgba(245, 158, 11, 0.1)', performanceLabel
    };
    return {
        color: '#dc2626', bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, transparent 100%)',
        border: '1px solid rgba(239, 68, 68, 0.2)', badgeBg: 'rgba(239, 68, 68, 0.1)', performanceLabel
    };
};

// ─── Sub-Components ─────────────────────────────────────────────────────────────

const StatusPill = ({ status, otherText }) => {
    const renderOne = (st, idx) => {
        const s = String(st || '').trim();
        const map = { 'No Driver': 'warning', 'Driver on Leave': 'error', 'Maintenance': 'info', 'Accident': 'error' };
        const cls = map[s] || 'neutral';
        return <span key={idx} className="status-pill-v2" data-variant={cls} style={{ marginRight: '4px' }}>{s || '—'}</span>;
    };
    if (Array.isArray(status)) return <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>{status.map((st, i) => renderOne(st, i))}</div>;
    if (otherText) return <span className="status-pill-v2" data-variant="neutral">{otherText}</span>;
    return renderOne(status, 0);
};

const IePill = ({ type }) => {
    const v = type === 'Import' ? 'info' : type === 'Export' ? 'success' : 'neutral';
    return <span className="status-pill-v2" data-variant={v}>{type || '—'}</span>;
};

const OwnPill = ({ ownHired }) => {
    const isOwn = String(ownHired || '').toLowerCase().trim() === 'own';
    return <span className="status-pill-v2" data-variant={isOwn ? 'success' : 'neutral'}>{isOwn ? 'Own' : 'Hired'}</span>;
};

/** Donut chart custom label */
const DonutLabel = ({ viewBox, total }) => {
    const { cx, cy } = viewBox;
    return (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
            <tspan x={cx} dy="-8" style={{ fontSize: '28px', fontWeight: 900, fill: '#0f172a', fontFamily: "'SF Mono', 'Cascadia Code', monospace" }}>{total}</tspan>
            <tspan x={cx} dy="22" style={{ fontSize: '11px', fontWeight: 700, fill: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vehicles</tspan>
        </text>
    );
};

/** Tooltip for donut chart */
const DonutTooltip = ({ active, payload }) => {
    if (active && payload?.[0]) {
        const d = payload[0];
        return (
            <div className="fleet-tooltip-v2">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.payload.fill, display: 'inline-block' }} />
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{d.name}</span>
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', marginTop: '4px', fontFamily: "'SF Mono', monospace" }}>
                    {d.value} <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>vehicles</span>
                </div>
            </div>
        );
    }
    return null;
};

// ─── CSS ────────────────────────────────────────────────────────────────────────

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');

.fleet-root {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    display: flex; flex-direction: column; gap: 32px; padding: 0; background: transparent;
}

/* Tab Bar */
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
.fleet-card[data-hl="true"]:hover {
    box-shadow: 0 16px 36px rgba(239, 68, 68, 0.1), inset 0 1px 0 rgba(255, 255, 255, 1);
}
.fleet-card[data-hl-blue="true"]:hover {
    box-shadow: 0 16px 36px rgba(59, 130, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 1);
}

/* Table Wrapper */
.fleet-table-wrap { background: rgba(255,255,255,0.9); backdrop-filter: blur(20px); border-radius: 24px; border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 12px 40px rgba(0,0,0,0.03); overflow: hidden; }
.fleet-table { width: 100%; border-collapse: separate; border-spacing: 0; }
.fleet-table th { background: linear-gradient(180deg, rgba(248,250,252,0.95) 0%, rgba(241,245,249,0.95) 100%); color: #0f172a; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; padding: 18px 24px; border-bottom: 1px solid rgba(226,232,240,0.6); white-space: nowrap; }
.fleet-table td { color: #1e293b; font-weight: 500; font-size: 14.5px; padding: 16px 24px; border-bottom: 1px solid rgba(226,232,240,0.4); transition: background 0.2s; }
.fleet-table tr:hover td { background: rgba(79,70,229,0.03); }
.fleet-table tr:last-child td { border-bottom: none; }

/* Status Pills */
.status-pill-v2 { display: inline-flex; align-items: center; padding: 6px 14px; border-radius: 999px; font-weight: 600; font-size: 11.5px; letter-spacing: 0.02em; text-transform: uppercase; transition: all 0.2s; font-family: 'Outfit', sans-serif; }
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
.fleet-chart-card { background: rgba(255,255,255,0.9); backdrop-filter: blur(24px); border-radius: 24px; border: 1px solid rgba(255,255,255,0.6); padding: 32px; box-shadow: 0 12px 40px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.9); }
.fleet-chart-card h3 { color: #0f172a; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 17px; margin-bottom: 4px; }
.fleet-chart-card .sub { color: #64748b; font-weight: 500; font-size: 13.5px; }

/* Tooltip */
.fleet-tooltip-v2 { background: rgba(255,255,255,0.95) !important; backdrop-filter: blur(10px) !important; border: 1px solid rgba(226,232,240,0.6) !important; border-radius: 16px !important; padding: 16px 20px !important; box-shadow: 0 12px 40px rgba(0,0,0,0.08) !important; font-family: 'Inter', sans-serif !important; }

/* Spreadsheet */
.fleet-excel-wrap { background: rgba(255,255,255,0.95); backdrop-filter: blur(20px); border-radius: 24px; border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 12px 40px rgba(0,0,0,0.03); overflow: auto; max-width: 100%; }
.fleet-excel-wrap::-webkit-scrollbar { height: 8px; }
.fleet-excel-wrap::-webkit-scrollbar-track { background: transparent; }
.fleet-excel-wrap::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.3); border-radius: 4px; }
.fleet-excel-wrap::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.5); }

.fleet-excel { border-collapse: separate; border-spacing: 0; width: 100%; min-width: 1400px; }
.fleet-excel th { background: linear-gradient(180deg, rgba(248,250,252,0.98) 0%, rgba(241,245,249,0.98) 100%); color: #0f172a; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 12px; padding: 16px 14px; border-right: 1px solid rgba(226,232,240,0.4); border-bottom: 1px solid rgba(226,232,240,0.6); text-align: center; letter-spacing: 0.03em; white-space: nowrap; }
.fleet-excel td { color: #334155; font-weight: 500; font-size: 13.5px; padding: 14px; border-right: 1px solid rgba(226,232,240,0.3); border-bottom: 1px solid rgba(226,232,240,0.3); text-align: center; }
.fleet-excel tr:nth-child(even) td { background: rgba(248,250,252,0.6); }
.fleet-excel tr:hover td { background: rgba(79,70,229,0.04) !important; }
.fleet-excel td.num { font-family: 'Outfit', monospace; font-weight: 600; font-size: 14.5px; }

.mono { font-family: 'Outfit', sans-serif; letter-spacing: -0.02em; }

/* Loading */
.fleet-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px 20px; background: rgba(255,255,255,0.7); backdrop-filter: blur(24px); border-radius: 24px; border: 1px solid rgba(255,255,255,0.6); }
.fleet-spinner { width: 56px; height: 56px; border: 3px solid rgba(79,70,229,0.15); border-top-color: #4f46e5; border-radius: 50%; animation: fleet-spin 0.8s cubic-bezier(0.4,0,0.2,1) infinite; }
@keyframes fleet-spin { to { transform: rotate(360deg); } }

/* Export Button */
.fleet-export-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 12px; font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 13.5px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4,0,0.2,1); border: 1px solid #10b981; background: transparent; color: #10b981; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
.fleet-export-btn:hover { background: #10b981; color: #fff; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(16,185,129,0.25); }
.fleet-export-btn:active { transform: translateY(0); }
`;

// ─── Main Component ─────────────────────────────────────────────────────────────

const FleetUtilizationReport = ({
    filterType, selectedMonth, selectedYear, selectedQuarter, dateRange, selectedDay
}) => {
    const isSingleDay = filterType === 'day' || (filterType === 'custom' && dateRange?.start && dateRange?.end && dateRange.start === dateRange.end);

    // ── State ───────────────────────────────────────────────────────────────────
    const [reportData, setReportData] = useState({ totalFleet: 'NA', dispatch: [] });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');

    // Fleet Summary tab state
    const [fleetSummaryData, setFleetSummaryData] = useState(null);
    const [fleetSummaryLoading, setFleetSummaryLoading] = useState(false);
    const [fleetSummaryError, setFleetSummaryError] = useState(null);
    const [fleetSearchQuery, setFleetSearchQuery] = useState('');
    const [fleetSortConfig, setFleetSortConfig] = useState({ key: 'total', direction: 'desc' });

    // Previous month comparison data
    const [comparisonData, setComparisonData] = useState({
        prevTotalTrips: 0, prevMundraTrips: 0, prevAvgTrips: 0, prevMundraAvg: 0, prevBranchTrips: {}
    });

    // ── Data Fetching ───────────────────────────────────────────────────────────

    useEffect(() => {
        const fetchReport = async () => {
            setLoading(true);
            try {
                const { startDate, endDate } = getTransportDates(filterType, selectedDay, selectedYear, selectedMonth, selectedQuarter, dateRange);
                const params = { limit: 999999 };
                if (startDate) params.startDate = startDate;
                if (endDate) params.endDate = endDate;

                let rawDispatch = null;
                let totalFleet = 'NA';

                // Previous month comparison
                let prevTotalTrips = 0, prevMundraTrips = 0, prevAvgTrips = 0, prevMundraAvg = 0, prevBranchTrips = {};
                try {
                    let refYear, refMonth;
                    if (startDate) { const [y, m] = startDate.split('-').map(Number); refYear = y; refMonth = m - 1; }
                    else { const t = new Date(); refYear = t.getFullYear(); refMonth = t.getMonth(); }
                    const prevYear = refMonth === 0 ? refYear - 1 : refYear;
                    const prevMonth = refMonth === 0 ? 11 : refMonth - 1;
                    const prevDays = new Date(prevYear, prevMonth + 1, 0).getDate();
                    const prevStart = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`;
                    const prevEnd = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(prevDays).padStart(2, '0')}`;

                    const resPrev = await axios.get(`${TRANSPORT_BASE}/api/vehicle-dsr/dispatch-range`, {
                        params: { startDate: prevStart, endDate: prevEnd, limit: 999999 }, headers: TRANSPORT_HEADERS, withCredentials: true
                    });
                    if (resPrev?.data?.success) {
                        const prevClosed = resPrev.data.closedLRs || [];
                        prevTotalTrips = prevClosed.length;
                        prevMundraTrips = prevClosed.filter(r => (r.branch || '').toLowerCase().includes('mundra')).length;
                        prevClosed.forEach(r => { const br = r.branch || 'Unknown'; prevBranchTrips[br] = (prevBranchTrips[br] || 0) + 1; });
                        prevAvgTrips = prevTotalTrips / prevDays;
                        prevMundraAvg = prevMundraTrips / prevDays;
                    }
                } catch (e) { console.error("[FleetUtil] Error fetching prev month:", e); }
                setComparisonData({ prevTotalTrips, prevMundraTrips, prevAvgTrips, prevMundraAvg, prevBranchTrips });

                // Main dispatch data
                try {
                    const dsStart = params.startDate ? new Date(params.startDate) : null;
                    const dsEnd = params.endDate ? new Date(params.endDate) : null;
                    
                    if (dsStart && dsEnd && Math.round((dsEnd - dsStart) / (1000 * 60 * 60 * 24)) > 60) {
                        let currentStart = new Date(dsStart);
                        let combined = { fleetStatus: [], activeLRs: [], closedLRs: [], exceptions: [] };
                        while (currentStart <= dsEnd) {
                            let currentEnd = new Date(currentStart);
                            currentEnd.setDate(currentStart.getDate() + 50); // 50 days chunk
                            if (currentEnd > dsEnd) currentEnd = new Date(dsEnd);
                            
                            const chunkParams = {
                                ...params,
                                startDate: currentStart.toISOString().slice(0, 10),
                                endDate: currentEnd.toISOString().slice(0, 10)
                            };
                            const res = await axios.get(`${TRANSPORT_BASE}/api/vehicle-dsr/dispatch-range`, {
                                params: chunkParams, headers: TRANSPORT_HEADERS, withCredentials: true
                            });
                            if (res?.data?.success) {
                                const d = res.data;
                                if (d.fleetStatus) combined.fleetStatus.push(...d.fleetStatus);
                                if (d.activeLRs) combined.activeLRs.push(...d.activeLRs);
                                if (d.closedLRs) combined.closedLRs.push(...d.closedLRs);
                                if (d.exceptions) combined.exceptions.push(...d.exceptions);
                            }
                            
                            currentStart = new Date(currentEnd);
                            currentStart.setDate(currentStart.getDate() + 1);
                        }
                        rawDispatch = combined;
                    } else {
                        const res = await axios.get(`${TRANSPORT_BASE}/api/vehicle-dsr/dispatch-range`, {
                            params, headers: TRANSPORT_HEADERS, withCredentials: true
                        });
                        if (res?.data?.success) rawDispatch = res.data;
                    }
                } catch (e) { console.error("Error fetching dispatch range:", e); }

                // Fleet size from old API
                try {
                    const res = await axios.get(`${TRANSPORT_BASE}/api/fleet/utilization-report`, {
                        params, headers: TRANSPORT_HEADERS, withCredentials: true
                    });
                    if (res?.data?.success && res.data.data) totalFleet = res.data.data.totalFleet || 'NA';
                } catch (e) { console.error("Error fetching fleet size:", e); }

                if (totalFleet === 'NA' && rawDispatch?.totalFleet && rawDispatch.totalFleet !== 'NA') totalFleet = rawDispatch.totalFleet;

                // Build daily dispatches
                let dailyDispatches = [];
                if (rawDispatch) {
                    let datesList = [];
                    if (params.startDate && params.endDate) {
                        try {
                            let cur = new Date(params.startDate);
                            const end = new Date(params.endDate);
                            const today = new Date();
                            const maxEnd = end < today ? end : today;
                            cur.setHours(12, 0, 0, 0);
                            maxEnd.setHours(12, 0, 0, 0);
                            while (cur <= maxEnd) {
                                datesList.push(cur.toISOString().slice(0, 10));
                                cur.setDate(cur.getDate() + 1);
                            }
                        } catch (e) { console.error("Error generating dates", e); }
                    }

                    const rawFleet = rawDispatch.fleetStatus || [];
                    const rawClosed = rawDispatch.closedLRs || [];
                    const rawActive = rawDispatch.activeLRs || [];
                    const rawExceptions = rawDispatch.exceptions || [];

                    if (datesList.length === 0) {
                        const uniq = new Set();
                        const todayStr = new Date().toISOString().slice(0, 10);
                        if (params.startDate && params.startDate <= todayStr) uniq.add(params.startDate);
                        if (params.endDate && params.endDate <= todayStr) uniq.add(params.endDate);
                        rawFleet.forEach(x => { if (x.date) uniq.add(x.date.slice(0, 10)); });
                        rawClosed.forEach(x => { if (x.dispatchClosedDate) uniq.add(x.dispatchClosedDate.slice(0, 10)); });
                        rawActive.forEach(x => { if (x.lr_date) uniq.add(x.lr_date.slice(0, 10)); });
                        rawExceptions.forEach(x => { if (x.date) uniq.add(x.date.slice(0, 10)); });
                        datesList = Array.from(uniq).sort();
                    }
                    if (datesList.length === 0) datesList = [new Date().toISOString().slice(0, 10)];

                    const first = datesList[0], last = datesList[datesList.length - 1];

                    const fleetMap = {};
                    const fleetUpdatesByDate = {};
                    const sortedFleet = [...rawFleet].sort((a, b) => new Date(a.date) - new Date(b.date));
                    sortedFleet.forEach(x => {
                        if (!x.date) return;
                        const d = x.date.slice(0, 10);
                        if (!fleetUpdatesByDate[d]) fleetUpdatesByDate[d] = [];
                        fleetUpdatesByDate[d].push(x);
                    });

                    const allTrips = [...rawActive, ...rawClosed];

                    dailyDispatches = datesList.map(ds => {
                        const datesToApply = Object.keys(fleetUpdatesByDate).filter(d => 
                            (ds === first && d <= ds) || (d === ds)
                        );
                        datesToApply.forEach(d => {
                            fleetUpdatesByDate[d].forEach(v => {
                                const n = normalizeVehicleNo(v.vehicleNumber);
                                if (n) fleetMap[n] = v;
                            });
                        });
                        
                        let dayFleet = Object.values(fleetMap);

                        let dayActive = allTrips.filter(lr => {
                            const start = lr.lr_date ? lr.lr_date.slice(0, 10) : null;
                            if (!start || start > ds) return false;
                            const closed = lr.dispatchClosedDate ? lr.dispatchClosedDate.slice(0, 10) : null;
                            if (closed && closed <= ds) return false;
                            return true;
                        });
                        dayActive = deduplicateArray(dayActive, getLRKey);
                        
                        let dayClosed = rawClosed.filter(x => {
                            if (!x.dispatchClosedDate) return false;
                            const cd = x.dispatchClosedDate.slice(0, 10);
                            return cd === ds || (ds === first && cd < first) || (ds === last && cd > last);
                        });
                        dayClosed = deduplicateArray(dayClosed, getLRKey);

                        let dayExceptions = rawExceptions.filter(x => {
                            if (!x.date) return false;
                            const cd = x.date.slice(0, 10);
                            return cd === ds || (ds === first && cd < first) || (ds === last && cd > last);
                        });

                        return { date: `${ds}T00:00:00.000Z`, fleetStatus: dayFleet, activeLRs: dayActive, closedLRs: dayClosed, exceptions: dayExceptions };
                    });
                }

                setReportData({ totalFleet, dispatch: dailyDispatches });
            } catch (err) { console.error("Error fetching fleet utilization report:", err); }
            finally { setLoading(false); }
        };
        fetchReport();
    }, [filterType, selectedMonth, selectedYear, selectedQuarter, dateRange, selectedDay]);

    // Fetch Fleet Summary (Trend tab)
    useEffect(() => {
        if (activeTab !== 'fleet-summary' && activeTab !== 'trend') return;
        const fetchFleetSummary = async () => {
            setFleetSummaryLoading(true); setFleetSummaryError(null);
            try {
                const res = await axios.get(`${TRANSPORT_BASE}/api/vehicle-dsr/fleet-summary`, {
                    params: { fyStartYear: selectedYear || 2026, limit: 999999 }, headers: TRANSPORT_HEADERS, withCredentials: true
                });
                if (res.data?.success) setFleetSummaryData(res.data.data);
                else setFleetSummaryError("Failed to fetch fleet summary details");
            } catch (e) { setFleetSummaryError(e.message || "An error occurred"); }
            finally { setFleetSummaryLoading(false); }
        };
        fetchFleetSummary();
    }, [selectedYear, activeTab]);

    // ── Computed Data ────────────────────────────────────────────────────────────

    const dispatches = useMemo(() => {
        if (!reportData.dispatch) return [];
        return Array.isArray(reportData.dispatch) ? reportData.dispatch : [reportData.dispatch];
    }, [reportData.dispatch]);

    const totalFleetNum = useMemo(() => parseInt(reportData.totalFleet) || 0, [reportData.totalFleet]);

    // Daily aggregation for trend & spreadsheet
    const dailyData = useMemo(() => {
        const raw = dispatches.map(d => {
            const dateStr = d.date ? d.date.slice(0, 10) : '—';
            const fleet = d.fleetStatus || [];
            const active = d.activeLRs || [];
            const closed = d.closedLRs || [];

            const getVehicleBranch = (vehicleNo) => {
                if (!vehicleNo) return 'Unknown';
                const a = active.find(r => r.vehicle_no === vehicleNo);
                if (a) return String(a.branch || '').toLowerCase().trim();
                const c = closed.filter(r => r.vehicle_no === vehicleNo).sort((x, y) => new Date(y.lr_date) - new Date(x.lr_date));
                if (c.length > 0) return String(c[0].branch || '').toLowerCase().trim();
                return 'Unknown';
            };

            const outOfService = fleet.filter(v => !hasStatus(v.status, 'IDLE'));

            // Automove OOS breakdown
            const automoveOOS = outOfService.filter(v => getVehicleBranch(v.vehicleNumber) === 'automove');
            const amBreakdown = automoveOOS.filter(v => getPrimaryCategory(v.status) === 'Breakdown').length;
            const amUnderDetention = automoveOOS.filter(v => getPrimaryCategory(v.status) === 'Under detention').length;
            const amUnderTrip = automoveOOS.filter(v => getPrimaryCategory(v.status) === 'Under trip').length;
            const amCustomCats = {};
            automoveOOS.forEach(v => { const cat = getCategoriesForVehicle(v); const std = ['Breakdown', 'Accident', 'Maintenance', 'Driver on Leave', 'No Driver', 'Under detention', 'Under trip']; if (!std.includes(cat)) amCustomCats[cat] = (amCustomCats[cat] || 0) + 1; });
            const amOthers = Object.values(amCustomCats).reduce((a, b) => a + b, 0);

            // Standard breakdowns
            const breakdown = outOfService.filter(v => getPrimaryCategory(v.status) === 'Breakdown').length;
            const maintenance = outOfService.filter(v => getPrimaryCategory(v.status) === 'Maintenance').length;
            const leave = outOfService.filter(v => getPrimaryCategory(v.status) === 'Driver on Leave').length;
            const accident = outOfService.filter(v => getPrimaryCategory(v.status) === 'Accident').length;
            const noDriver = outOfService.filter(v => getPrimaryCategory(v.status) === 'No Driver').length;
            const underDetention = outOfService.filter(v => getPrimaryCategory(v.status) === 'Under detention').length;
            const underTrip = outOfService.filter(v => getPrimaryCategory(v.status) === 'Under trip').length;

            const customCategories = {};
            outOfService.forEach(v => { const cat = getCategoriesForVehicle(v); const std = ['Breakdown', 'Accident', 'Maintenance', 'Driver on Leave', 'No Driver', 'Under detention', 'Under trip']; if (!std.includes(cat)) customCategories[cat] = (customCategories[cat] || 0) + 1; });
            const others = Object.values(customCategories).reduce((a, b) => a + b, 0);

            const notOnRoadTotal = breakdown + maintenance + leave + accident + noDriver;
            const idle = fleet.filter(v => hasStatus(v.status, 'IDLE')).length;
            const dayFleetSize = totalFleetNum > 0 ? totalFleetNum : (fleet.length || 0);
            const usedForTrips = Math.max(0, dayFleetSize - notOnRoadTotal - idle - underDetention - others);
            const oorPercentVal = dayFleetSize > 0 ? Math.round((usedForTrips / dayFleetSize) * 100) : 0;

            const automove = [...active, ...closed].filter(r => String(r.branch || '').toLowerCase().trim() === 'automove').length;
            const snContainer = [...active, ...closed].filter(r => String(r.branch || '').toLowerCase().trim() !== 'automove').length;

            const ownClosed20 = closed.filter(r => String(r.own_hired || '').toLowerCase().trim() === 'own' && (String(r.type_of_vehicle || '').includes('20'))).length;
            const ownClosed40 = closed.filter(r => String(r.own_hired || '').toLowerCase().trim() === 'own' && (String(r.type_of_vehicle || '').includes('40'))).length;
            const outsourced20 = closed.filter(r => String(r.own_hired || '').toLowerCase().trim() !== 'own' && (String(r.type_of_vehicle || '').includes('20'))).length;
            const outsourced40 = closed.filter(r => String(r.own_hired || '').toLowerCase().trim() !== 'own' && (String(r.type_of_vehicle || '').includes('40'))).length;
            const ownTrips = closed.filter(r => String(r.own_hired || '').toLowerCase().trim() === 'own').length;
            const hiredTrips = closed.filter(r => String(r.own_hired || '').toLowerCase().trim() !== 'own').length;

            return {
                date: d.date, dateStr, totalFleet: dayFleetSize, activeCount: usedForTrips,
                idleCount: idle, oosCount: notOnRoadTotal, utilPercent: oorPercentVal,
                breakdown, maintenance, leave, accident, noDriver, underDetention, underTrip,
                others, customCategories, amBreakdown, amUnderDetention, amUnderTrip, amOthers,
                usedForTrips, oorPercent: `${oorPercentVal}%`, automove, snContainer,
                activeLRs: active.length, ownClosed20, ownClosed40, ownTrips, hiredTrips,
                outsourced20, outsourced40, outsourcedTotal: hiredTrips,
                totalTrips: closed.length
            };
        }).sort((a, b) => new Date(a.date) - new Date(b.date));

        return raw.map((d, index) => {
            const start = Math.max(0, index - 6);
            const subset = raw.slice(start, index + 1);
            const avgUtil = subset.reduce((acc, x) => acc + x.utilPercent, 0) / subset.length;
            const avgTrips = subset.reduce((acc, x) => acc + x.totalTrips, 0) / subset.length;
            return {
                ...d,
                utilMovingAvg: parseFloat(avgUtil.toFixed(1)),
                tripsMovingAvg: parseFloat(avgTrips.toFixed(1))
            };
        });
    }, [dispatches, totalFleetNum]);

    // Active dispatch (merged for range views)
    const activeDispatch = useMemo(() => {
        if (!dispatches.length) return null;
        if (filterType === 'day' && selectedDay) {
            const found = dispatches.find(d => d.date && d.date.slice(0, 10) === selectedDay);
            if (found) return found;
        }
        if (dispatches.length === 1) return dispatches[0];

        const fleetMap = {}; const noKeyFleet = []; const activeLRs = []; const closedLRs = [];
        const sorted = [...dispatches].sort((a, b) => new Date(a.date) - new Date(b.date));
        sorted.forEach(d => {
            if (d.fleetStatus) d.fleetStatus.forEach(v => { const n = normalizeVehicleNo(v.vehicleNumber); if (n) fleetMap[n] = v; else noKeyFleet.push(v); });
            if (d.activeLRs) activeLRs.push(...d.activeLRs);
            if (d.closedLRs) closedLRs.push(...d.closedLRs);
        });
        return {
            date: dispatches[0].date,
            fleetStatus: [...Object.values(fleetMap), ...noKeyFleet],
            activeLRs: deduplicateArray(activeLRs, getLRKey),
            closedLRs: deduplicateArray(closedLRs, getLRKey)
        };
    }, [dispatches, filterType, selectedDay]);

    const fleetStatusList = useMemo(() => activeDispatch?.fleetStatus || [], [activeDispatch]);
    const notOnRoadList = useMemo(() => fleetStatusList.filter(v => ['Breakdown', 'Maintenance', 'Driver on Leave', 'No Driver', 'Accident'].includes(getPrimaryCategory(v.status))), [fleetStatusList]);
    const otherStatusList = useMemo(() => fleetStatusList.filter(v => ['Under trip', 'Under detention', 'Others'].includes(getPrimaryCategory(v.status))), [fleetStatusList]);
    const activeLRsList = useMemo(() => activeDispatch?.activeLRs || [], [activeDispatch]);
    const closedLRsList = useMemo(() => activeDispatch?.closedLRs || [], [activeDispatch]);

    // ── Status Distribution (for Donut Chart) ───────────────────────────────────

    const statusDistribution = useMemo(() => {
        const counts = {};
        fleetStatusList.forEach(v => {
            let cat;
            if (hasStatus(v.status, 'IDLE')) cat = 'IDLE';
            else cat = getPrimaryCategory(v.status);
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({
                name: STATUS_COLORS[name]?.label || name,
                value,
                fill: STATUS_COLORS[name]?.fill || '#64748b'
            }))
            .sort((a, b) => b.value - a.value);
    }, [fleetStatusList]);

    // ── Metrics ─────────────────────────────────────────────────────────────────

    const metrics = useMemo(() => {
        const totalTrips = closedLRsList.length;
        const computeMetrics = (fleetSize, outOfServiceVehicles, fleetList) => {
            const breakdown = outOfServiceVehicles.filter(v => getPrimaryCategory(v.status) === 'Breakdown').length;
            const noDriver = outOfServiceVehicles.filter(v => getPrimaryCategory(v.status) === 'No Driver').length;
            const onLeave = outOfServiceVehicles.filter(v => getPrimaryCategory(v.status) === 'Driver on Leave').length;
            const maint = outOfServiceVehicles.filter(v => getPrimaryCategory(v.status) === 'Maintenance').length;
            const accident = outOfServiceVehicles.filter(v => getPrimaryCategory(v.status) === 'Accident').length;
            const underDetention = outOfServiceVehicles.filter(v => getPrimaryCategory(v.status) === 'Under detention').length;
            const underTrip = outOfServiceVehicles.filter(v => getPrimaryCategory(v.status) === 'Under trip').length;

            const customCategories = {};
            outOfServiceVehicles.forEach(v => { const cat = getCategoriesForVehicle(v); const std = ['Breakdown', 'Accident', 'Maintenance', 'Driver on Leave', 'No Driver', 'Under detention', 'Under trip']; if (!std.includes(cat)) customCategories[cat] = (customCategories[cat] || 0) + 1; });
            const others = Object.values(customCategories).reduce((a, b) => a + b, 0);

            const notOnRoad = breakdown + maint + onLeave + accident + noDriver;
            const otherStatusTotal = underDetention + others;
            const idleVal = fleetSize > 0 ? (fleetList ? fleetList.filter(v => hasStatus(v.status, 'IDLE')).length : 0) : 'NA';
            const idleCount = idleVal === 'NA' ? 0 : idleVal;
            const onRoadCount = fleetSize > 0 ? Math.max(0, fleetSize - notOnRoad - idleCount - underDetention - others) : closedLRsList.filter(r => (r.own_hired || '').toLowerCase().trim() === 'own').length;

            const getPctStr = (val) => fleetSize <= 0 ? '' : `(${((val / fleetSize) * 100).toFixed(0)}%)`;
            const onRoadPct = fleetSize > 0 ? (onRoadCount / fleetSize) * 100 : 0;
            const onRoadColor = UTIL_COLOR(onRoadPct);

            let idleColor = '#374151';
            if (idleVal !== 'NA') { const n = parseInt(idleVal); idleColor = n === 0 ? '#10b981' : n <= 2 ? '#f59e0b' : '#ef4444'; }

            const customCategoriesList = Object.entries(customCategories).map(([label, count]) => ({
                label, value: count, extra: getPctStr(count), color: '#64748b',
                gradient: 'linear-gradient(135deg, rgba(100,116,139,0.08) 0%, rgba(100,116,139,0.02) 100%)',
                border: '1px solid rgba(100,116,139,0.2)'
            }));

            return {
                fleetSize: fleetSize || 'NA', onRoadCount, onRoadPct: getPctStr(onRoadCount), onRoadColor,
                idleVal, idlePct: idleVal !== 'NA' ? getPctStr(idleVal) : '', idleColor,
                notOnRoad, notOnRoadPct: getPctStr(notOnRoad),
                breakdown, breakdownPct: getPctStr(breakdown), noDriver, noDriverPct: getPctStr(noDriver),
                onLeave, onLeavePct: getPctStr(onLeave), maint, maintPct: getPctStr(maint),
                accident, accidentPct: getPctStr(accident),
                underDetention, underDetentionPct: getPctStr(underDetention),
                underTrip, underTripPct: getPctStr(underTrip),
                others, othersPct: getPctStr(others),
                otherStatusTotal, otherStatusTotalPct: getPctStr(otherStatusTotal),
                customCategoriesList, totalTrips
            };
        };

        if (filterType === 'day' || dailyData.length <= 1) {
            const oos = fleetStatusList.filter(v => !hasStatus(v.status, 'IDLE'));
            return computeMetrics(totalFleetNum, oos, fleetStatusList);
        } else {
            // Range: average daily values
            let sFS = 0, sOR = 0, sIdle = 0, sNOR = 0, sBrk = 0, sND = 0, sLv = 0, sMt = 0, sAcc = 0, sUD = 0, sUT = 0;
            const rangeCC = {};
            dailyData.forEach(d => {
                sFS += d.totalFleet; sOR += d.usedForTrips; sIdle += d.idleCount;
                sNOR += d.oosCount; sBrk += d.breakdown; sND += d.noDriver;
                sLv += d.leave; sMt += d.maintenance; sAcc += d.accident;
                sUD += d.underDetention; sUT += d.underTrip;
                if (d.customCategories) Object.entries(d.customCategories).forEach(([c, v]) => { rangeCC[c] = (rangeCC[c] || 0) + v; });
            });
            
            const numDays = dailyData.length || 1;
            const sumFS = sFS; // keep for exact percentages if needed, but we'll calculate pct from averages

            sFS = Math.round(sFS / numDays);
            sOR = Math.round(sOR / numDays);
            sIdle = Math.round(sIdle / numDays);
            sNOR = Math.round(sNOR / numDays);
            sBrk = Math.round(sBrk / numDays);
            sND = Math.round(sND / numDays);
            sLv = Math.round(sLv / numDays);
            sMt = Math.round(sMt / numDays);
            sAcc = Math.round(sAcc / numDays);
            sUD = Math.round(sUD / numDays);
            sUT = Math.round(sUT / numDays);
            Object.keys(rangeCC).forEach(k => { rangeCC[k] = Math.round(rangeCC[k] / numDays); });

            const sOthers = Object.values(rangeCC).reduce((a, b) => a + b, 0);
            const sOtherTotal = sUD + sOthers;
            const pct = (val) => sFS <= 0 ? '' : `(${((val / sFS) * 100).toFixed(0)}%)`;
            const orPct = sFS > 0 ? (sOR / sFS) * 100 : 0;

            const ccList = Object.entries(rangeCC).map(([label, count]) => ({
                label, value: count, extra: pct(count), color: '#64748b',
                gradient: 'linear-gradient(135deg, rgba(100,116,139,0.08) 0%, rgba(100,116,139,0.02) 100%)',
                border: '1px solid rgba(100,116,139,0.2)'
            }));

            return {
                fleetSize: sFS || 'NA', onRoadCount: sOR, onRoadPct: pct(sOR), onRoadColor: UTIL_COLOR(orPct),
                idleVal: sIdle, idlePct: pct(sIdle), idleColor: sIdle === 0 ? '#10b981' : '#f59e0b',
                notOnRoad: sNOR, notOnRoadPct: pct(sNOR),
                breakdown: sBrk, breakdownPct: pct(sBrk), noDriver: sND, noDriverPct: pct(sND),
                onLeave: sLv, onLeavePct: pct(sLv), maint: sMt, maintPct: pct(sMt),
                accident: sAcc, accidentPct: pct(sAcc),
                underDetention: sUD, underDetentionPct: pct(sUD),
                underTrip: sUT, underTripPct: pct(sUT),
                others: sOthers, othersPct: pct(sOthers),
                otherStatusTotal: sOtherTotal, otherStatusTotalPct: pct(sOtherTotal),
                customCategoriesList: ccList, totalTrips
            };
        }
    }, [fleetStatusList, closedLRsList, totalFleetNum, filterType, dailyData]);

    // ── KPI Metrics (Avg Trips/Day, Projections) ────────────────────────────────

    const kpiMetricsObj = useMemo(() => {
        const { elapsedDays } = computeElapsedDays(filterType, selectedYear, selectedMonth, selectedQuarter, dateRange, dailyData.length);
        const totalTrips = closedLRsList.length;
        const mundraTrips = closedLRsList.filter(r => (r.branch || '').toLowerCase().includes('mundra')).length;
        const avgTripsPerDay = elapsedDays > 0 ? totalTrips / elapsedDays : 0;

        const { startDate } = getTransportDates(filterType, selectedDay, selectedYear, selectedMonth, selectedQuarter, dateRange);
        let daysInMonth = 30;
        if (startDate) { const sd = new Date(startDate); daysInMonth = new Date(sd.getFullYear(), sd.getMonth() + 1, 0).getDate(); }
        else { const t = new Date(); daysInMonth = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(); }

        let projAll = 0, projMundra = 0;
        if (elapsedDays > 0) {
            const branchCounts = {};
            closedLRsList.forEach(r => { const br = r.branch || 'Unknown'; branchCounts[br] = (branchCounts[br] || 0) + 1; });
            Object.entries(branchCounts).forEach(([br, count]) => {
                const proj = Math.round((count / elapsedDays) * daysInMonth);
                projAll += proj;
                if (br.toLowerCase().includes('mundra')) projMundra += proj;
            });
        }

        const avgPerf = comparisonData.prevAvgTrips > 0 ? (avgTripsPerDay / comparisonData.prevAvgTrips) * 100 : 100;
        const projAllPerf = comparisonData.prevTotalTrips > 0 ? (projAll / comparisonData.prevTotalTrips) * 100 : 100;
        const projMundraPerf = comparisonData.prevMundraTrips > 0 ? (projMundra / comparisonData.prevMundraTrips) * 100 : 100;

        return {
            avgTripsPerDay: Math.round(avgTripsPerDay), projectionAllPorts: projAll, projectionMundra: projMundra,
            avgTripsTheme: getColorTheme(avgPerf), projectionAllTheme: getColorTheme(projAllPerf),
            projectionMundraTheme: getColorTheme(projMundraPerf)
        };
    }, [filterType, selectedYear, selectedMonth, selectedQuarter, dateRange, closedLRsList, comparisonData, dailyData, selectedDay]);

    // ── Spreadsheet Totals ──────────────────────────────────────────────────────

    const spreadsheetTotals = useMemo(() => {
        if (dailyData.length === 0) return null;
        const sums = { fleet: 0, used: 0, idle: 0, nor: 0, brk: 0, mnt: 0, lv: 0, acc: 0, nd: 0, det: 0, trip: 0, oth: 0, auto: 0, snc: 0, alr: 0, o20: 0, o40: 0, ot: 0, ht: 0, os20: 0, os40: 0, ost: 0 };
        dailyData.forEach(d => {
            sums.fleet += d.totalFleet || 0; sums.used += d.usedForTrips || 0; sums.idle += d.idleCount || 0;
            sums.nor += d.oosCount || 0; sums.brk += d.breakdown || 0; sums.mnt += d.maintenance || 0;
            sums.lv += d.leave || 0; sums.acc += d.accident || 0; sums.nd += d.noDriver || 0;
            sums.det += d.underDetention || 0; sums.trip += d.underTrip || 0; sums.oth += d.others || 0;
            sums.auto += d.automove || 0; sums.snc += d.snContainer || 0; sums.alr += d.activeLRs || 0;
            sums.o20 += d.ownClosed20 || 0; sums.o40 += d.ownClosed40 || 0; sums.ot += d.ownTrips || 0;
            sums.ht += d.hiredTrips || 0; sums.os20 += d.outsourced20 || 0; sums.os40 += d.outsourced40 || 0;
            sums.ost += d.outsourcedTotal || 0;
        });
        return {
            avgFleetSize: Math.round(sums.fleet / dailyData.length),
            usedForTrips: sums.used, oorPercent: sums.fleet > 0 ? Math.round((sums.used / sums.fleet) * 100) + '%' : '0%',
            idleCount: sums.idle, oosCount: sums.nor,
            breakdown: sums.brk, maintenance: sums.mnt, leave: sums.lv, accident: sums.acc, noDriver: sums.nd,
            underDetention: sums.det, underTrip: sums.trip, others: sums.oth,
            automove: sums.auto, snContainer: sums.snc, activeLRs: sums.alr,
            ownClosed20: sums.o20, ownClosed40: sums.o40, ownTrips: sums.ot, hiredTrips: sums.ht,
            outsourced20: sums.os20, outsourced40: sums.os40, outsourcedTotal: sums.ost
        };
    }, [dailyData]);

    // ── Branch Summary ──────────────────────────────────────────────────────────

    const branchSummary = useMemo(() => {
        const branches = {};
        closedLRsList.forEach(r => {
            const br = r.branch || 'Unknown';
            if (!branches[br]) branches[br] = { name: br, c20: 0, c40: 0, other: 0, own20: 0, own40: 0, hired20: 0, hired40: 0, ownOther: 0, hiredOther: 0, total: 0 };
            const veh = String(r.type_of_vehicle || '').toLowerCase();
            const oh = String(r.own_hired || '').toLowerCase().trim();
            const is20 = veh.includes('20'), is40 = veh.includes('40');
            branches[br].total++;
            if (is20) { branches[br].c20++; if (oh === 'own') branches[br].own20++; else branches[br].hired20++; }
            else if (is40) { branches[br].c40++; if (oh === 'own') branches[br].own40++; else branches[br].hired40++; }
            else { branches[br].other++; if (oh === 'own') branches[br].ownOther++; else branches[br].hiredOther++; }
        });

        const list = Object.values(branches);
        const { elapsedDays } = computeElapsedDays(filterType, selectedYear, selectedMonth, selectedQuarter, dateRange, dailyData.length);
        const { startDate } = getTransportDates(filterType, selectedDay, selectedYear, selectedMonth, selectedQuarter, dateRange);
        const today = new Date();
        let daysInMonth = 30;
        if (startDate) { const sd = new Date(startDate); daysInMonth = new Date(sd.getFullYear(), sd.getMonth() + 1, 0).getDate(); }
        else daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

        let g20 = 0, go20 = 0, gh20 = 0, g40 = 0, go40 = 0, gh40 = 0, gO = 0, goO = 0, ghO = 0, gT = 0, rawAvg = 0, rawProj = 0;
        list.forEach(b => {
            const avg = elapsedDays > 0 ? b.total / elapsedDays : 0;
            b.avgTripsPerDay = Math.round(avg);
            b.projection = Math.round(avg * daysInMonth);
            rawAvg += avg; rawProj += avg * daysInMonth;
            g20 += b.c20; go20 += b.own20; gh20 += b.hired20;
            g40 += b.c40; go40 += b.own40; gh40 += b.hired40;
            gO += b.other; goO += b.ownOther || 0; ghO += b.hiredOther || 0;
            gT += b.total;
        });

        const pct = (p, t) => t > 0 ? ((p / t) * 100).toFixed(0) : 0;
        const automoveData = branches['Automove'] || branches['automove'] || { c20: 0, own20: 0, hired20: 0, c40: 0, own40: 0, hired40: 0, other: 0, ownOther: 0, hiredOther: 0, total: 0 };
        const othersData = { c20: 0, own20: 0, hired20: 0, c40: 0, own40: 0, hired40: 0, other: 0, ownOther: 0, hiredOther: 0, total: 0 };
        Object.keys(branches).forEach(br => {
            if (br.toLowerCase() !== 'automove') {
                const b = branches[br];
                othersData.c20 += b.c20; othersData.own20 += b.own20; othersData.hired20 += b.hired20;
                othersData.c40 += b.c40; othersData.own40 += b.own40; othersData.hired40 += b.hired40;
                othersData.other += b.other; othersData.ownOther += b.ownOther || 0; othersData.hiredOther += b.hiredOther || 0;
                othersData.total += b.total;
            }
        });

        const amOwn = automoveData.own20 + automoveData.own40 + automoveData.ownOther;
        const amHired = automoveData.hired20 + automoveData.hired40 + automoveData.hiredOther;
        const oOwn = othersData.own20 + othersData.own40 + othersData.ownOther;
        const oHired = othersData.hired20 + othersData.hired40 + othersData.hiredOther;
        const overallOwn = go20 + go40 + goO, overallHired = gh20 + gh40 + ghO;

        return {
            list,
            grandTotals: {
                c20: g20, own20: go20, hired20: gh20, c40: g40, own40: go40, hired40: gh40,
                other: gO, ownOther: goO, hiredOther: ghO, total: gT,
                overallOwn, overallHired, overallOwnPct: pct(overallOwn, gT), overallHiredPct: pct(overallHired, gT),
                avgTripsPerDay: Math.round(rawAvg), projection: Math.round(rawProj)
            },
            cards: {
                automove: { total: automoveData.total, own: amOwn, hired: amHired, ownPct: pct(amOwn, automoveData.total), hiredPct: pct(amHired, automoveData.total) },
                srCarriers: {
                    total: othersData.total, own: oOwn, hired: oHired, ownPct: pct(oOwn, othersData.total), hiredPct: pct(oHired, othersData.total),
                    c20: othersData.c20, own20: othersData.own20, hired20: othersData.hired20,
                    own20Pct: pct(othersData.own20, othersData.c20), hired20Pct: pct(othersData.hired20, othersData.c20),
                    c40: othersData.c40, own40: othersData.own40, hired40: othersData.hired40,
                    own40Pct: pct(othersData.own40, othersData.c40), hired40Pct: pct(othersData.hired40, othersData.c40)
                }
            }
        };
    }, [closedLRsList, filterType, selectedDay, selectedYear, selectedMonth, selectedQuarter, dateRange, dailyData]);

    // ── Fleet Summary Tab Computations ──────────────────────────────────────────

    const filteredSummaryRows = useMemo(() => {
        if (!fleetSummaryData?.rows) return [];
        let result = [...fleetSummaryData.rows];
        if (fleetSearchQuery) {
            const q = fleetSearchQuery.toLowerCase().trim();
            result = result.filter(r => String(r.vehicleNo || '').toLowerCase().includes(q));
        }
        if (fleetSortConfig.key) {
            result.sort((a, b) => {
                if (fleetSortConfig.key === 'vehicleNo') {
                    return fleetSortConfig.direction === 'asc' ? (a.vehicleNo || '').localeCompare(b.vehicleNo || '') : (b.vehicleNo || '').localeCompare(a.vehicleNo || '');
                }
                const av = parseFloat(a[fleetSortConfig.key]) || 0, bv = parseFloat(b[fleetSortConfig.key]) || 0;
                return fleetSortConfig.direction === 'asc' ? av - bv : bv - av;
            });
        }
        return result;
    }, [fleetSummaryData, fleetSearchQuery, fleetSortConfig]);

    const avgOorVal = useMemo(() => {
        if (!spreadsheetTotals) return null;
        return parseFloat(spreadsheetTotals.oorPercent);
    }, [spreadsheetTotals]);

    const avgTripsVal = useMemo(() => {
        if (dailyData.length === 0) return null;
        const total = dailyData.reduce((acc, d) => acc + d.totalTrips, 0);
        return parseFloat((total / dailyData.length).toFixed(1));
    }, [dailyData]);

    const requestFleetSort = (key) => {
        setFleetSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' }));
    };

    // ── Excel Export ────────────────────────────────────────────────────────────

    const exportCompletedTripsExcel = async () => {
        if (!closedLRsList?.length) { alert("No completed trips data available to export."); return; }
        try {
            const ExcelJS = await import('exceljs');
            const { saveAs } = await import('file-saver');
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Exim Application';
            const ws = workbook.addWorksheet('Completed Trips');

            const { startDate, endDate } = getTransportDates(filterType, selectedDay, selectedYear, selectedMonth, selectedQuarter, dateRange);
            const dateRangeStr = startDate && endDate ? `${startDate} to ${endDate}` : startDate || endDate || 'Selected Period';

            // Title
            ws.addRow([`Completed Trips Report (${dateRangeStr})`]);
            ws.mergeCells('A1:I1');
            const titleRow = ws.getRow(1);
            titleRow.height = 35;
            titleRow.getCell(1).font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
            titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
            titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            ws.addRow([]);

            // Headers
            const headers = ['LR No', 'Type', 'Branch', 'Consignee', 'Consignor', 'Vehicle', 'Container', 'Own/Hired', 'Closed Date'];
            ws.addRow(headers);
            const headerRow = ws.getRow(3);
            headerRow.height = 25;
            headerRow.eachCell(cell => {
                cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
                cell.border = { top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, left: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }, right: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            // Data rows
            closedLRsList.forEach((r, idx) => {
                ws.addRow([r.tr_no || '—', r.import_export || '—', r.branch || '—', r.consignee || '—', r.consignor || '—', r.vehicle_no || '—', r.container_number || '—', r.own_hired || '—', r.dispatchClosedDate ? r.dispatchClosedDate.slice(0, 10) : '—']);
                const row = ws.getRow(4 + idx);
                row.height = 20;
                const bgArgb = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
                row.eachCell((cell, colNum) => {
                    cell.font = { name: 'Arial', size: 10, color: { argb: 'FF334155' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
                    cell.border = { top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, left: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }, right: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
                    cell.alignment = { horizontal: (colNum === 4 || colNum === 5) ? 'left' : 'center', vertical: 'middle', wrapText: true };
                });
            });

            ws.columns.forEach(col => { let max = 0; col.eachCell((cell, rn) => { if (rn > 2) { const l = cell.value ? String(cell.value).length : 0; if (l > max) max = l; } }); col.width = Math.max(max + 4, 12); });

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `Completed_Trips_${dateRangeStr.replace(/\s+/g, '_')}.xlsx`);
        } catch (error) { console.error("Failed to export:", error); alert("An error occurred while exporting data to Excel."); }
    };

    // ── Render Helpers ──────────────────────────────────────────────────────────

    const ProgressCircle = ({ pct, color }) => {
        const radius = 18;
        const strokeWidth = 3.5;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (pct / 100) * circumference;
        return (
            <div style={{ position: 'relative', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="44" height="44" style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
                    <circle cx="22" cy="22" r={radius} fill="transparent" stroke="rgba(0,0,0,0.03)" strokeWidth={strokeWidth} />
                    <circle cx="22" cy="22" r={radius} fill="transparent" stroke={color} strokeWidth={strokeWidth}
                        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }} />
                </svg>
                <span style={{ fontSize: '10px', fontWeight: 800, color: color, fontFamily: "'Outfit', sans-serif" }}>{pct}%</span>
            </div>
        );
    };

    const KpiCard = ({ label, subtext, value, extra, color, gradient, border, badgeBg, large, accentColor, hl, hlBlue }) => {
        const defaultAccent = accentColor || color || '#cbd5e1';
        const isHl = hl || hlBlue;
        const textColor = hl ? '#991b1b' : hlBlue ? '#1e40af' : '#64748b';
        const valColor = hl ? '#991b1b' : hlBlue ? '#1e40af' : '#0f172a';

        // Parse percentage from extra (e.g., "49%" or "(49%)")
        let pct = null;
        if (extra && typeof extra === 'string') {
            const match = extra.match(/(\d+)%/);
            if (match) {
                pct = parseFloat(match[1]);
            }
        } else if (typeof extra === 'number') {
            pct = extra;
        }

        return (
            <div className="fleet-card" data-hl={hl ? 'true' : 'false'} data-hl-blue={hlBlue ? 'true' : 'false'} style={{
                padding: large ? '28px 32px' : '24px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: large ? '12px' : '10px',
                '--fc-bg': gradient,
                '--fc-border': border,
                '--fc-accent': defaultAccent
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', zIndex: 1 }}>
                    <div>
                        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: large ? '14.5px' : '13.5px', color: textColor, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: large ? 800 : 700 }}>{label}</div>
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
                        <span style={{ fontSize: large ? '42px' : '38px', fontWeight: 900, color: valColor }} className="mono">{value}</span>
                        {extra && !badgeBg && pct === null && <span style={{ fontSize: '15px', fontWeight: 700, color: color }}>{extra}</span>}
                    </div>
                    {extra && badgeBg && (
                        <div style={{ display: 'inline-flex', padding: '6px 12px', borderRadius: '8px', background: badgeBg, color: color, fontWeight: 700, fontSize: '12.5px', width: 'fit-content' }}>{extra}</div>
                    )}
                </div>
            </div>
        );
    };

    const renderStatusDistribution = () => {
        if (statusDistribution.length === 0) return null;
        return (
            <div className="fleet-chart-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'space-between' }}>
                <div style={{ width: '100%' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>🔵 Status Distribution</h3>
                    <span className="sub">Current fleet status breakdown</span>
                </div>
                <div style={{ width: 280, height: 280, marginTop: '12px', position: 'relative' }}>
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={72} outerRadius={110}
                                paddingAngle={3} dataKey="value" nameKey="name" strokeWidth={0}>
                                {statusDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                            </Pie>
                            <Pie data={[{ value: 1 }]} cx="50%" cy="50%" innerRadius={0} outerRadius={0} dataKey="value">
                                <DonutLabel viewBox={{ cx: 140, cy: 140 }} total={fleetStatusList.length} />
                            </Pie>
                            <Tooltip content={<DonutTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
                    {statusDistribution.map((d, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#475569', background: 'rgba(0,0,0,0.02)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.03)' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.fill, display: 'inline-block' }} />
                            {d.name} ({d.value})
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const OwnHiredBar = ({ ownPct, hiredPct, ownColor, hiredColor }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ position: 'relative', height: '16px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${ownPct}%`, background: `linear-gradient(90deg, ${ownColor} 0%, ${ownColor} 100%)`, height: '100%' }} />
                <div style={{ width: `${hiredPct}%`, background: `linear-gradient(90deg, ${hiredColor} 0%, ${hiredColor} 100%)`, height: '100%' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: ownColor }} />Own ({ownPct}%)</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: hiredColor }} />Hired ({hiredPct}%)</span>
            </div>
        </div>
    );

    // ── Loading ─────────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="fleet-loading">
                <div className="fleet-spinner" />
                <div style={{ marginTop: '1.5rem', color: '#1e293b', fontWeight: 600 }}>Loading report details...</div>
            </div>
        );
    }

    // ── Own/Hired color logic ────────────────────────────────────────────────────

    const ownPctVal = parseInt(branchSummary.grandTotals.overallOwnPct) || 0;
    const ownColor = ownPctVal >= 85 ? '#10b981' : ownPctVal >= 70 ? '#f59e0b' : '#ef4444';
    const hiredPctVal = parseInt(branchSummary.grandTotals.overallHiredPct) || 0;
    const hiredColor = hiredPctVal <= 15 ? '#10b981' : hiredPctVal <= 30 ? '#f59e0b' : '#ef4444';

    // ── Build Subtext Labels ─────────────────────────────────────────────────────

    const todayOnRoadCount = Math.max(0, (metrics.onRoadCount || 0) - (metrics.underTrip || 0));
    const todayOnRoadPct = metrics.fleetSize > 0 ? `(${((todayOnRoadCount / metrics.fleetSize) * 100).toFixed(0)}%)` : '';
    const SubBadge = ({ text }) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)', padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, color: 'inherit', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
            {text}
        </span>
    );

    const onRoadParts = [];
    if (metrics.underTrip > 0) onRoadParts.push(`Under Trip: ${metrics.underTrip} ${metrics.underTripPct}`);
    if (metrics.underDetention > 0) onRoadParts.push(`Under Detention: ${metrics.underDetention} ${metrics.underDetentionPct}`);
    if (todayOnRoadCount > 0) onRoadParts.push(`Today On Road: ${todayOnRoadCount} ${todayOnRoadPct}`);
    const onRoadSubtext = onRoadParts.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
            {onRoadParts.map((txt, i) => <SubBadge key={i} text={txt} />)}
        </div>
    ) : null;

    const norParts = [];
    if (metrics.breakdown > 0) norParts.push(`Breakdown: ${metrics.breakdown} ${metrics.breakdownPct}`);
    
    const notOnRoadSubtext = norParts.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
            {norParts.map((txt, i) => <SubBadge key={i} text={txt} />)}
        </div>
    ) : null;



    // ═════════════════════════════════════════════════════════════════════════════
    //  RENDER
    // ═════════════════════════════════════════════════════════════════════════════

    return (
        <div className="fleet-root">
            <style>{STYLES}</style>

            {/* ── Tab Bar ──────────────────────────────────────────────────────── */}
            <div className="fleet-tabs">
                {[
                    { id: 'dashboard', label: '📊 Dashboard' },
                    { id: 'spreadsheet', label: '🗂️ Spreadsheet' },
                    { id: 'trend', label: '📈 Trend' }
                ].map(tab => (
                    <button key={tab.id} className="fleet-tab" data-active={String(activeTab === tab.id || (tab.id === 'trend' && activeTab === 'fleet-summary'))}
                        onClick={() => setActiveTab(tab.id)}>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                DASHBOARD TAB
                ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'dashboard' && (
                <>
                    {/* Row 1: Core KPI cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                        {[
                            { label: 'Fleet Size', value: metrics.fleetSize, color: '#667eea', gradient: 'linear-gradient(135deg, #667eea10, #764ba210)' },
                            { label: 'Vehicle On Road', subtext: onRoadSubtext, value: `${metrics.onRoadCount}`, extra: metrics.onRoadPct, color: metrics.onRoadColor, gradient: `linear-gradient(135deg, ${metrics.onRoadColor}15, transparent)` },
                            { label: 'Idle', value: `${metrics.idleVal}`, extra: metrics.idlePct, color: metrics.idleColor, gradient: `linear-gradient(135deg, ${metrics.idleColor}15, transparent)` },
                            { label: 'Total Trips', value: metrics.totalTrips, color: '#64748b', gradient: 'linear-gradient(135deg, #64748b10, transparent)' }
                        ].map((m, i) => <KpiCard key={i} {...m} />)}
                    </div>

                    {/* Row 2: KPI with comparison badges (only for ranges) */}
                    {!isSingleDay && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '4px' }}>
                                <div className="kpi-info-wrap">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                                    <div className="kpi-info-tip">
                                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>Color Coding Legend</div>
                                        {[{ c: '#059669', l: '≥ Last Month' }, { c: '#d97706', l: '90% - 99% of Last Month' }, { c: '#dc2626', l: '< 90% of Last Month' }].map((x, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: x.c, boxShadow: `0 0 0 2px ${x.c}33` }} />
                                                <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 600 }}>{x.l}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                                {[
                                    { label: 'Average Trips Per Day', value: kpiMetricsObj.avgTripsPerDay, ...kpiMetricsObj.avgTripsTheme, extra: kpiMetricsObj.avgTripsTheme.performanceLabel },
                                    { label: 'Projection Trips – All Ports', value: kpiMetricsObj.projectionAllPorts, ...kpiMetricsObj.projectionAllTheme, extra: kpiMetricsObj.projectionAllTheme.performanceLabel },
                                    { label: 'Projection Trips – Mundra', value: kpiMetricsObj.projectionMundra, ...kpiMetricsObj.projectionMundraTheme, extra: kpiMetricsObj.projectionMundraTheme.performanceLabel }
                                ].map((m, i) => <KpiCard key={i} large {...m} gradient={m.bg} />)}
                            </div>
                        </div>
                    )}

                    {/* Row 3: Not-on-Road breakdown cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
                        {[
                            { label: 'Vehicle Not on Road', subtext: notOnRoadSubtext, value: `${metrics.notOnRoad}`, extra: metrics.notOnRoadPct, color: '#ef4444', accentColor: '#ef4444', large: true, gradient: 'linear-gradient(135deg, rgba(254,226,226,0.8) 0%, rgba(254,242,242,0.6) 100%)', border: '1px solid rgba(239,68,68,0.3)', hl: true },
                            { label: 'No Driver', value: `${metrics.noDriver}`, extra: metrics.noDriverPct, color: '#f59e0b', accentColor: '#f59e0b' },
                            { label: 'Driver On Leave', value: `${metrics.onLeave}`, extra: metrics.onLeavePct, color: '#ef4444', accentColor: '#ef4444' },
                            { label: 'Maintenance', value: `${metrics.maint}`, extra: metrics.maintPct, color: '#0ea5e9', accentColor: '#0ea5e9' },
                            { label: 'Accidents', value: `${metrics.accident}`, extra: metrics.accidentPct, color: '#ef4444', accentColor: '#ef4444' }
                        ].map((m, i) => <KpiCard key={i} {...m} />)}
                    </div>

                    {/* Other Status Categories */}
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '24px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📋</span> Other Status Categories
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '8px' }}>
                        {[
                            { label: 'Other Status Total', value: `${metrics.otherStatusTotal}`, extra: metrics.otherStatusTotalPct, color: '#1e40af', accentColor: '#1e40af', gradient: 'linear-gradient(135deg, rgba(239,246,255,0.8) 0%, rgba(219,234,254,0.5) 100%)', border: '2px solid rgba(59,130,246,0.5)', hlBlue: true, large: true },
                            ...(metrics.breakdown > 0 ? [{ label: 'Breakdown', value: `${metrics.breakdown}`, extra: metrics.breakdownPct, color: '#ef4444', accentColor: '#ef4444' }] : []),
                            ...(metrics.underDetention > 0 ? [{ label: 'Under Detention', value: `${metrics.underDetention}`, extra: metrics.underDetentionPct, color: '#f59e0b', accentColor: '#f59e0b' }] : []),
                            ...(metrics.customCategoriesList || [])
                        ].map((m, i) => <KpiCard key={i} {...m} />)}
                    </div>

                    {/* Operations Summary */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>🏢</span> Operations Summary
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                            {/* Automove Card */}
                            <div className="fleet-branch-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '8px' }}>🚛 Automove</span>
                                    <span className="status-pill-v2" data-variant="info">{branchSummary.cards.automove.total} trips</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid rgba(226,232,240,0.4)' }}>
                                    {[{ label: 'OWN', val: branchSummary.cards.automove.own, pct: branchSummary.cards.automove.ownPct, bg: 'rgba(5,150,105,0.05)', lc: '#047857', vc: '#059669' },
                                      { label: 'HIRED', val: branchSummary.cards.automove.hired, pct: branchSummary.cards.automove.hiredPct, bg: 'rgba(245,158,11,0.05)', lc: '#b45309', vc: '#f59e0b' }
                                    ].map((x, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: x.bg, padding: '10px 16px', borderRadius: '8px' }}>
                                            <span style={{ fontSize: '12px', color: x.lc, fontWeight: 700 }}>{x.label}</span>
                                            <span style={{ fontSize: '18px', fontWeight: 800, color: x.vc }}>{x.val}<span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginLeft: '4px' }}>{x.pct}%</span></span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* SR Container Carriers Card */}
                            <div className="fleet-branch-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}>📦 SR Container Carriers</span>
                                    <span className="status-pill-v2" data-variant="success">{branchSummary.cards.srCarriers.total} trips</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingTop: '12px', borderTop: '1px solid rgba(226,232,240,0.4)' }}>
                                    {[{ label: '20 FEET', count: branchSummary.cards.srCarriers.c20, own: branchSummary.cards.srCarriers.own20, hired: branchSummary.cards.srCarriers.hired20, ownPct: branchSummary.cards.srCarriers.own20Pct, hiredPct: branchSummary.cards.srCarriers.hired20Pct },
                                      { label: '40 FEET', count: branchSummary.cards.srCarriers.c40, own: branchSummary.cards.srCarriers.own40, hired: branchSummary.cards.srCarriers.hired40, ownPct: branchSummary.cards.srCarriers.own40Pct, hiredPct: branchSummary.cards.srCarriers.hired40Pct }
                                    ].map((x, i) => (
                                        <div key={i}>
                                            <div style={{ fontSize: '13px', color: '#475569', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{x.label} ({x.count})</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {[{ l: 'OWN', v: x.own, p: x.ownPct, bg: 'rgba(5,150,105,0.05)', lc: '#047857', vc: '#059669' },
                                                  { l: 'HIRED', v: x.hired, p: x.hiredPct, bg: 'rgba(245,158,11,0.05)', lc: '#b45309', vc: '#f59e0b' }
                                                ].map((s, j) => (
                                                    <div key={j} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: s.bg, padding: '6px 10px', borderRadius: '8px' }}>
                                                        <span style={{ fontSize: '11px', color: s.lc, fontWeight: 700 }}>{s.l}</span>
                                                        <span style={{ fontSize: '15px', fontWeight: 800, color: s.vc }}>{s.v}<span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginLeft: '4px' }}>{s.p}%</span></span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Branch Table */}
                    <div className="fleet-table-wrap">
                        <table className="fleet-table">
                            <thead>
                                <tr>
                                    <th>Branch</th><th>20 Feet</th><th>40 Feet</th><th>Automove</th><th>Avg/Day</th>
                                    {!isSingleDay && <th>Projection</th>}
                                    <th style={{ textAlign: 'right' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {branchSummary.list.length > 0 ? (
                                    <>
                                        {branchSummary.list.map((b, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 700, color: '#0f172a' }}>{b.name}</td>
                                                <td style={{ color: '#2563eb' }}>{b.c20} <span style={{ fontSize: '12.5px', color: '#64748b' }}>(Own: {b.own20} Hired: {b.hired20})</span></td>
                                                <td style={{ color: '#d97706' }}>{b.c40} <span style={{ fontSize: '12.5px', color: '#64748b' }}>(Own: {b.own40} Hired: {b.hired40})</span></td>
                                                <td>{b.other} <span style={{ fontSize: '12.5px', color: '#64748b' }}>(Own: {b.ownOther} Hired: {b.hiredOther})</span></td>
                                                <td style={{ color: '#3b82f6', fontWeight: 700 }} className="mono">{b.avgTripsPerDay}</td>
                                                {!isSingleDay && <td style={{ color: (comparisonData.prevBranchTrips?.[b.name] > 0 && b.projection < comparisonData.prevBranchTrips[b.name]) ? '#ef4444' : '#10b981', fontWeight: 700 }} className="mono">{b.projection}</td>}
                                                <td style={{ fontWeight: 800, textAlign: 'right', color: '#0f172a' }}>{b.total}</td>
                                            </tr>
                                        ))}
                                        <tr style={{ background: 'rgba(102,126,234,0.08)', fontWeight: 800 }}>
                                            <td style={{ color: '#0f172a' }}>Total</td>
                                            <td style={{ color: '#2563eb' }}>{branchSummary.grandTotals.c20}</td>
                                            <td style={{ color: '#d97706' }}>{branchSummary.grandTotals.c40}</td>
                                            <td>{branchSummary.grandTotals.other}</td>
                                            <td style={{ color: '#3b82f6' }} className="mono">{branchSummary.grandTotals.avgTripsPerDay}</td>
                                            {!isSingleDay && <td style={{ color: (comparisonData.prevTotalTrips > 0 && branchSummary.grandTotals.projection < comparisonData.prevTotalTrips) ? '#ef4444' : '#10b981' }} className="mono">{branchSummary.grandTotals.projection}</td>}
                                            <td style={{ fontWeight: 900, textAlign: 'right', color: '#0f172a' }}>{branchSummary.grandTotals.total}</td>
                                        </tr>
                                    </>
                                ) : (
                                    <tr><td colSpan={isSingleDay ? 6 : 7} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No branch data available</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Branch Chart */}
                    {branchSummary.list.length > 0 && (
                        <div className="fleet-card" style={{ padding: '24px', background: 'rgba(255,255,255,0.85)', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '4px' }}>
                            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                📊 {isSingleDay ? "Branch Wise Performance" : "Branch Wise Performance & Projection"}
                            </div>
                            <div style={{ width: '100%', height: 320, paddingTop: '10px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={branchSummary.list}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226,232,240,0.6)" />
                                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                                        <YAxis yAxisId="left" stroke="#3b82f6" fontSize={11} tickLine={false} axisLine={false} />
                                        {!isSingleDay && <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={11} tickLine={false} axisLine={false} />}
                                        <Tooltip cursor={{ fill: 'rgba(102,126,234,0.04)' }} />
                                        <Legend verticalAlign="top" height={36} iconType="circle" />
                                        <Bar yAxisId="left" dataKey="avgTripsPerDay" name="Avg Trips Per Day" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={25} />
                                        {!isSingleDay && (
                                            <Bar yAxisId="right" dataKey="projection" name="Projected Monthly Trips" radius={[4, 4, 0, 0]} barSize={25}>
                                                {branchSummary.list.map((entry, i) => (
                                                    <Cell key={i} fill={(comparisonData.prevBranchTrips?.[entry.name] > 0 && entry.projection < comparisonData.prevBranchTrips[entry.name]) ? '#ef4444' : '#10b981'} />
                                                ))}
                                            </Bar>
                                        )}
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Own vs Hired Progress */}
                    <div className="fleet-branch-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>📊 Our Vehicles vs Outsource Vehicles Percentage</span>
                            <span className="status-pill-v2" data-variant="neutral" style={{ fontWeight: 700 }}>{branchSummary.grandTotals.total} Total Trips</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '24px' }}>
                                <div>
                                    <div style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Our Vehicles (Own)</div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                        <span style={{ fontSize: '28px', fontWeight: 900, color: ownColor }}>{branchSummary.grandTotals.overallOwn}</span>
                                        <span style={{ fontSize: '14px', color: ownColor, fontWeight: 700 }}>{branchSummary.grandTotals.overallOwnPct}%</span>
                                    </div>
                                </div>
                                <div style={{ borderLeft: '1px solid rgba(226,232,240,0.8)', paddingLeft: '24px' }}>
                                    <div style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Outsource Vehicles (Hired)</div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                        <span style={{ fontSize: '28px', fontWeight: 900, color: hiredColor }}>{branchSummary.grandTotals.overallHired}</span>
                                        <span style={{ fontSize: '14px', color: hiredColor, fontWeight: 700 }}>{branchSummary.grandTotals.overallHiredPct}%</span>
                                    </div>
                                </div>
                            </div>
                            <OwnHiredBar ownPct={branchSummary.grandTotals.overallOwnPct} hiredPct={branchSummary.grandTotals.overallHiredPct} ownColor={ownColor} hiredColor={hiredColor} />
                        </div>
                    </div>

                    {/* Not-on-Road Vehicle Table */}
                    <div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>⚠️ Vehicles Not on road ({notOnRoadList.length})</div>
                        <div className="fleet-table-wrap">
                            <table className="fleet-table">
                                <thead><tr><th>Vehicle No</th><th>Type</th><th>Status</th><th>Last Update</th></tr></thead>
                                <tbody>
                                    {notOnRoadList.length > 0 ? notOnRoadList.map((v, i) => (
                                        <tr key={i}>
                                            <td className="mono" style={{ fontWeight: 700, color: '#0f172a' }}>{v.vehicleNumber}</td>
                                            <td style={{ color: '#334155', fontWeight: 600 }}>{v.vehicleType || '—'}</td>
                                            <td><StatusPill status={v.status} otherText={v.otherStatusText} /></td>
                                            <td style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>{v.lastSummary || '—'}</td>
                                        </tr>
                                    )) : <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>All vehicles are operational 🎉</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Other Status Vehicle Table */}
                    <div style={{ marginTop: '20px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>📋 Other Status Vehicles ({otherStatusList.length})</div>
                        <div className="fleet-table-wrap">
                            <table className="fleet-table">
                                <thead><tr><th>Vehicle No</th><th>Type</th><th>Status</th><th>Last Update</th></tr></thead>
                                <tbody>
                                    {otherStatusList.length > 0 ? otherStatusList.map((v, i) => (
                                        <tr key={i}>
                                            <td className="mono" style={{ fontWeight: 700, color: '#0f172a' }}>{v.vehicleNumber}</td>
                                            <td style={{ color: '#334155', fontWeight: 600 }}>{v.vehicleType || '—'}</td>
                                            <td><StatusPill status={v.status} otherText={v.otherStatusText} /></td>
                                            <td style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>{v.lastSummary || '—'}</td>
                                        </tr>
                                    )) : <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No vehicles in other categories</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Completed Trips Table */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>✅ Completed Trips ({closedLRsList.length})</div>
                            {closedLRsList.length > 0 && (
                                <button onClick={exportCompletedTripsExcel} className="fleet-export-btn">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                    Export Excel
                                </button>
                            )}
                        </div>
                        <div className="fleet-table-wrap">
                            <table className="fleet-table">
                                <thead><tr><th>LR No</th><th>Type</th><th>Branch</th><th>Consignee</th><th>Consignor</th><th>Vehicle</th><th>Container</th><th>Own/Hired</th><th>Closed</th></tr></thead>
                                <tbody>
                                    {closedLRsList.length > 0 ? closedLRsList.map((r, i) => (
                                        <tr key={i}>
                                            <td className="mono" style={{ fontWeight: 600, color: '#667eea' }}>{r.tr_no}</td>
                                            <td><IePill type={r.import_export} /></td>
                                            <td style={{ color: '#475569', fontSize: '12.5px' }}>{r.branch || '—'}</td>
                                            <td style={{ fontWeight: 500 }}>{r.consignee || '—'}</td>
                                            <td style={{ color: '#64748b', fontSize: '12.5px' }}>{r.consignor || '—'}</td>
                                            <td className="mono" style={{ fontWeight: 500 }}>{r.vehicle_no || '—'}</td>
                                            <td className="mono" style={{ fontWeight: 500 }}>{r.container_number || '—'}</td>
                                            <td><OwnPill ownHired={r.own_hired} /></td>
                                            <td style={{ fontSize: '12px', color: '#64748b' }}>{r.dispatchClosedDate ? r.dispatchClosedDate.slice(0, 10) : '—'}</td>
                                        </tr>
                                    )) : <tr><td colSpan="9" style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No completed trips found</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                SPREADSHEET TAB
                ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'spreadsheet' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', justifyContent: 'space-between', padding: '0 4px', fontWeight: 500 }}>
                        <span>📋 Detailed Dispatch Matrix</span>
                        <span><strong className="mono">{dailyData.length}</strong> records</span>
                    </div>
                    <div className="fleet-excel-wrap">
                        <table className="fleet-excel">
                            <thead>
                                <tr>
                                    <th rowSpan="2">Date</th>
                                    <th rowSpan="2" style={{ background: 'rgba(254,240,138,0.15)' }}>Fleet [{totalFleetNum}]</th>
                                    <th rowSpan="2">Used for Trips</th><th rowSpan="2">On Road %</th>
                                    <th rowSpan="2" style={{ background: 'rgba(254,240,138,0.1)' }}>Idle</th>
                                    <th rowSpan="2" style={{ background: 'rgba(254,202,202,0.15)' }}>Not on Road</th>
                                    <th colSpan="5" style={{ background: 'rgba(254,202,202,0.1)' }}>Breakdown Details</th>
                                    <th colSpan="3" style={{ background: 'rgba(203,213,225,0.15)' }}>Other Statuses</th>
                                    <th colSpan="2">Dispatched</th>
                                    <th rowSpan="2" style={{ background: 'rgba(220,252,231,0.15)' }}>Active LRs</th>
                                    <th colSpan="2">Own Closed</th><th colSpan="2">Trips</th>
                                    <th colSpan="3" style={{ background: 'rgba(254,240,138,0.1)' }}>Outsourced</th>
                                </tr>
                                <tr>
                                    <th>Brkdn</th><th>Maint</th><th>Leave</th><th>Acc</th><th>No Drv</th>
                                    <th>Detention</th><th>Trip</th><th>Other</th>
                                    <th>Automove</th><th>SN Carrier</th>
                                    <th>20ft</th><th>40ft</th><th>Own</th><th>Hired</th>
                                    <th>20ft</th><th>40ft</th><th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dailyData.length > 0 ? dailyData.map((d, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{d.dateStr}</td>
                                        <td className="num hl-y">{d.totalFleet}</td><td className="num">{d.usedForTrips}</td>
                                        <td className="num" style={{ color: '#059669', fontWeight: 600 }}>{d.oorPercent}</td>
                                        <td className="num hl-y">{d.idleCount}</td><td className="num hl-r">{d.oosCount}</td>
                                        <td className="num">{d.breakdown}</td><td className="num">{d.maintenance}</td>
                                        <td className="num">{d.leave}</td><td className="num">{d.accident}</td><td className="num">{d.noDriver}</td>
                                        <td className="num">{d.underDetention}</td><td className="num">{d.underTrip}</td><td className="num">{d.others}</td>
                                        <td className="num">{d.automove}</td><td className="num">{d.snContainer}</td>
                                        <td className="num hl-g">{d.activeLRs}</td>
                                        <td className="num" style={{ color: '#2563eb' }}>{d.ownClosed20}</td>
                                        <td className="num" style={{ color: '#d97706' }}>{d.ownClosed40}</td>
                                        <td className="num">{d.ownTrips}</td><td className="num">{d.hiredTrips}</td>
                                        <td className="num">{d.outsourced20}</td><td className="num">{d.outsourced40}</td>
                                        <td className="num hl-y">{d.outsourcedTotal}</td>
                                    </tr>
                                )) : null}
                                {dailyData.length > 0 && spreadsheetTotals && (
                                    <tr style={{ background: 'rgba(102,126,234,0.08)', fontWeight: 800, borderTop: '2px solid rgba(102,126,234,0.3)' }}>
                                        <td style={{ fontWeight: 800, color: '#0f172a' }}>Total / Avg</td>
                                        <td className="num hl-y" style={{ fontWeight: 800 }}>{spreadsheetTotals.avgFleetSize}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.usedForTrips}</td>
                                        <td className="num" style={{ color: '#059669', fontWeight: 800 }}>{spreadsheetTotals.oorPercent}</td>
                                        <td className="num hl-y" style={{ fontWeight: 800 }}>{spreadsheetTotals.idleCount}</td>
                                        <td className="num hl-r" style={{ fontWeight: 800 }}>{spreadsheetTotals.oosCount}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.breakdown}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.maintenance}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.leave}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.accident}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.noDriver}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.underDetention}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.underTrip}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.others}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.automove}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.snContainer}</td>
                                        <td className="num hl-g" style={{ fontWeight: 800 }}>{spreadsheetTotals.activeLRs}</td>
                                        <td className="num" style={{ color: '#2563eb', fontWeight: 800 }}>{spreadsheetTotals.ownClosed20}</td>
                                        <td className="num" style={{ color: '#d97706', fontWeight: 800 }}>{spreadsheetTotals.ownClosed40}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.ownTrips}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.hiredTrips}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.outsourced20}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.outsourced40}</td>
                                        <td className="num hl-y" style={{ fontWeight: 800 }}>{spreadsheetTotals.outsourcedTotal}</td>
                                    </tr>
                                )}
                                {dailyData.length === 0 && (
                                    <tr><td colSpan="22" style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>No data available for the selected period</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                TREND TAB
                ═══════════════════════════════════════════════════════════════════ */}
            {(activeTab === 'trend' || activeTab === 'fleet-summary') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                    {/* KPI Metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {[
                            { label: 'Fleet Size', value: metrics.fleetSize, color: '#6366f1', gradient: 'linear-gradient(135deg, rgba(99,102,241,0.1), transparent)' },
                            { label: 'Total Trips', value: metrics.totalTrips, color: '#8b5cf6', gradient: 'linear-gradient(135deg, rgba(139,92,246,0.1), transparent)' }
                        ].map((m, i) => <KpiCard key={i} {...m} />)}
                    </div>

                    {/* Trend Charts */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
                        {renderStatusDistribution()}
                        {/* Utilization % Trend */}
                        <div className="fleet-chart-card">
                            <h3>📈 Fleet Utilization % Trend</h3>
                            <span className="sub">Daily stock utilization percentage rate over time</span>
                            <div style={{ width: '100%', height: 320, marginTop: '20px' }}>
                                <ResponsiveContainer>
                                    <ComposedChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorUtilTrend" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226,232,240,0.4)" />
                                        <XAxis dataKey="dateStr" stroke="#94a3b8" fontSize={11} tickLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                                        <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid rgba(226,232,240,0.6)', borderRadius: '16px', boxShadow: '0 12px 40px rgba(0,0,0,0.08)', backdropFilter: 'blur(10px)' }} formatter={v => [`${v}%`, 'Utilization']} />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                                        <Area type="monotone" name="Utilization Rate" dataKey="utilPercent" stroke="#0ea5e9" strokeWidth={2} fill="url(#colorUtilTrend)" />
                                        <Line type="monotone" name="7-Day Moving Avg (Trend)" dataKey="utilMovingAvg" stroke="#2563eb" strokeWidth={3} strokeDasharray="5 5" dot={false} activeDot={{ r: 6 }} />
                                        {avgOorVal !== null && !isNaN(avgOorVal) && (
                                            <ReferenceLine y={avgOorVal} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 3"
                                                label={{ value: `Avg: ${avgOorVal}%`, fill: '#ef4444', fontSize: '10px', fontWeight: 700, position: 'insideTopRight' }} />
                                        )}
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Total Trips Trend */}
                        <div className="fleet-chart-card">
                            <h3>📈 Total Trips Trend</h3>
                            <span className="sub">Daily completed dispatches count trend</span>
                            <div style={{ width: '100%', height: 320, marginTop: '20px' }}>
                                <ResponsiveContainer>
                                    <ComposedChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorTripsTrend" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226,232,240,0.4)" />
                                        <XAxis dataKey="dateStr" stroke="#94a3b8" fontSize={11} tickLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                                        <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid rgba(226,232,240,0.6)', borderRadius: '16px', boxShadow: '0 12px 40px rgba(0,0,0,0.08)', backdropFilter: 'blur(10px)' }} formatter={v => [v, 'Trips']} />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                                        <Area type="monotone" name="Trips Count" dataKey="totalTrips" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorTripsTrend)" />
                                        <Line type="monotone" name="7-Day Moving Avg (Trend)" dataKey="tripsMovingAvg" stroke="#6d28d9" strokeWidth={3} strokeDasharray="5 5" dot={false} activeDot={{ r: 6 }} />
                                        {avgTripsVal !== null && !isNaN(avgTripsVal) && (
                                            <ReferenceLine y={avgTripsVal} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="3 3"
                                                label={{ value: `Avg: ${avgTripsVal}`, fill: '#ef4444', fontSize: '10px', fontWeight: 700, position: 'insideTopRight' }} />
                                        )}
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>

                    {/* Fleet Summary Vehicle Table */}
                    {fleetSummaryData && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '8px' }}>📋 Vehicle Monthly Trip Summary</div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <input type="text" placeholder="🔍 Search vehicle number..." value={fleetSearchQuery} onChange={e => setFleetSearchQuery(e.target.value)}
                                        style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(226,232,240,0.8)', fontSize: '13.5px', fontWeight: 600, outline: 'none', width: '240px', background: 'rgba(255,255,255,0.8)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }} />
                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                                        Showing <strong className="mono">{filteredSummaryRows.length}</strong> of <strong className="mono">{fleetSummaryData.rows?.length || 0}</strong> vehicles
                                    </span>
                                </div>
                            </div>
                            <div className="fleet-excel-wrap">
                                <table className="fleet-excel">
                                    <thead>
                                        <tr>
                                            <th onClick={() => requestFleetSort('vehicleNo')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                                Vehicle No {fleetSortConfig.key === 'vehicleNo' ? (fleetSortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                                            </th>
                                            {MONTH_NAMES.map(m => <th key={m.key}>{m.name}</th>)}
                                            <th onClick={() => requestFleetSort('total')} style={{ cursor: 'pointer', userSelect: 'none', background: 'rgba(220,252,231,0.2)' }}>
                                                Total Trips {fleetSortConfig.key === 'total' ? (fleetSortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSummaryRows.length > 0 ? filteredSummaryRows.map((row, i) => (
                                            <tr key={i}>
                                                <td className="mono" style={{ fontWeight: 700, color: '#0f172a', textAlign: 'left', paddingLeft: '20px' }}>{row.vehicleNo}</td>
                                                {MONTH_NAMES.map(m => {
                                                    const val = row.months?.[m.key] || 0;
                                                    return <td key={m.key} className={`num ${val > 0 ? 'hl-b' : ''}`} style={{ fontWeight: val > 0 ? 700 : 500 }}>{val || '—'}</td>;
                                                })}
                                                <td className="num hl-g" style={{ fontWeight: 800, fontSize: '14px' }}>{row.total || 0}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="14" style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>No matching vehicles found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FleetUtilizationReport;