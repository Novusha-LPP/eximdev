import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { format, getDaysInMonth } from 'date-fns';
import {
    ResponsiveContainer, ComposedChart, AreaChart, Area, Bar, Line, BarChart,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts';
import MuiTooltip from '@mui/material/Tooltip';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { getTransportDates, TRANSPORT_BASE, TRANSPORT_HEADERS } from './reports-helper';

// ─── Constants ──────────────────────────────────────────────────────────────────

const TABS = [
    { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
    { id: 'trend', label: '📈 Trend', icon: '📈' },
    { id: 'transactions', label: '📋 Transactions', icon: '📋' }
];

const DONUT_COLORS = {
    used: '#06b6d4',
    returnPending: '#f59e0b',
    idle: '#10b981',
    maintenance: '#ef4444'
};

const FLEET_COLORS = {
    srcc: '#6366f1',
    others: '#f59e0b'
};

// ─── Utility Functions ──────────────────────────────────────────────────────────

const normalizeDateStr = (dateStr) => {
    if (!dateStr) return '';
    const cleanStr = String(dateStr).trim();
    const datePart = cleanStr.split('T')[0].split(' ')[0];

    if (datePart.includes('-')) {
        const parts = datePart.split('-');
        if (parts[0].length === 4) {
            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else if (parts[2].length === 4) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }

    if (datePart.includes('.')) {
        const parts = datePart.split('.');
        if (parts[2].length === 4) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }

    if (datePart.includes('/')) {
        const parts = datePart.split('/');
        if (parts[2].length === 4) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (parts[0].length === 4) {
            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
    }

    try {
        const parsed = new Date(cleanStr);
        if (!isNaN(parsed.getTime())) {
            const y = parsed.getFullYear();
            const m = String(parsed.getMonth() + 1).padStart(2, '0');
            const d = String(parsed.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
    } catch (e) {}

    return datePart;
};

const parseDate = (dateStr) => {
    if (!dateStr) return new Date();
    const normalized = normalizeDateStr(dateStr);
    if (normalized) return new Date(normalized);
    return new Date(dateStr);
};

const formatDateSafe = (dateStr, fmt = 'dd-MM-yyyy') => {
    if (!dateStr) return '—';
    try {
        return format(new Date(dateStr), fmt);
    } catch (e) {
        return dateStr;
    }
};

const getUtilColor = (val) => {
    const n = parseFloat(val);
    if (n > 60) return '#10b981'; // Green
    if (n >= 50) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
};

const getInverseUtilColor = (val) => {
    const n = parseFloat(val);
    if (n > 60) return '#ef4444'; // Red
    if (n >= 40) return '#f59e0b'; // Yellow
    return '#10b981'; // Green
};

const getTatSeverityColor = (hours, limit) => {
    if (hours >= limit * 2) return '#dc2626'; // Critical
    if (hours >= limit) return '#f59e0b';     // Warning
    return '#10b981';                          // OK
};

// ─── Sub-Components ─────────────────────────────────────────────────────────────

const SubBadge = ({ text }) => (
    <div style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', background: 'rgba(255,255,255,0.7)', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '10.5px', fontWeight: 600, color: '#475569' }}>
        {text}
    </div>
);

/** Donut center label */
const DonutCenterLabel = ({ viewBox, total }) => {
    if (!viewBox) return null;
    const { cx, cy } = viewBox;
    return (
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
            <tspan x={cx} dy="-8" style={{ fontSize: '26px', fontWeight: 900, fill: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>{total}</tspan>
            <tspan x={cx} dy="22" style={{ fontSize: '10px', fontWeight: 700, fill: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Locks</tspan>
        </text>
    );
};

/** Donut tooltip */
const DonutTooltip = ({ active, payload }) => {
    if (active && payload?.[0]) {
        const d = payload[0];
        return (
            <div className="elock-tooltip">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.payload.fill, display: 'inline-block' }} />
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{d.name}</span>
                </div>
                <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', marginTop: '4px', fontFamily: "'Outfit', sans-serif" }}>
                    {d.value} <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>locks</span>
                </div>
            </div>
        );
    }
    return null;
};

/** Trend chart tooltip */
const TrendTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
        const data = payload[0].payload;
        return (
            <div className="elock-tooltip">
                <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                    {formatDateSafe(data.date, 'dd MMMM yyyy')}
                </div>
                {payload.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                        <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>{p.name}:</span>
                        <span style={{ fontSize: '13px', color: '#0f172a', fontWeight: 700 }}>{p.value}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

// ─── CSS ────────────────────────────────────────────────────────────────────────

const STYLES = `

@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');

.elock-root {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    display: flex; flex-direction: column; gap: 32px; padding: 0; background: transparent;
}

/* Tab Bar */
.elock-tabs { display: flex; gap: 10px; padding: 8px; background: rgba(255,255,255,0.5); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-radius: 20px; width: fit-content; box-shadow: 0 4px 24px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.6); }
.elock-tab { padding: 12px 26px; border-radius: 14px; font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 14.5px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4,0,0.2,1); border: none; background: transparent; color: #64748b; display: flex; align-items: center; gap: 8px; }
.elock-tab[data-active="true"] { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #fff; box-shadow: 0 8px 20px rgba(99,102,241,0.3); font-weight: 700; }
.elock-tab[data-active="false"]:hover { background: rgba(99,102,241,0.08); color: #1e293b; transform: translateY(-1px); }

/* Glass Card */
.elock-card {
    background: var(--ec-bg, rgba(255, 255, 255, 0.85));
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    border-radius: 28px 8px 28px 28px;
    border: var(--ec-border, 1px solid rgba(226, 232, 240, 0.8));
    box-shadow: 0 8px 20px -2px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.9);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
    position: relative;
}
.elock-card::before {
    content: '';
    position: absolute;
    top: -24px;
    right: -24px;
    width: 110px;
    height: 110px;
    border-radius: 50%;
    background: var(--ec-accent, #cbd5e1);
    filter: blur(35px);
    opacity: 0.22;
    transition: all 0.4s ease;
    pointer-events: none;
    z-index: 0;
}
.elock-card:hover {
    transform: translateY(-6px) scale(1.005);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 1);
    border-color: rgba(226, 232, 240, 1);
    z-index: 10;
}
.elock-card:hover::before {
    transform: scale(1.3);
    opacity: 0.3;
}
.elock-card[data-hl="true"] {
    background: rgba(254, 242, 242, 0.8);
    border-color: rgba(239, 68, 68, 0.15);
}
.elock-card[data-hl-blue="true"] {
    background: rgba(239, 246, 255, 0.8);
    border-color: rgba(59, 130, 246, 0.15);
}
.elock-card[data-hl="true"]:hover {
    box-shadow: 0 16px 36px rgba(239, 68, 68, 0.1), inset 0 1px 0 rgba(255, 255, 255, 1);
}
.elock-card[data-hl-blue="true"]:hover {
    box-shadow: 0 16px 36px rgba(59, 130, 246, 0.1), inset 0 1px 0 rgba(255, 255, 255, 1);
}

/* Table Wrapper */
.elock-table-wrap { background: rgba(255,255,255,0.9); backdrop-filter: blur(20px); border-radius: 24px; border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 12px 40px rgba(0,0,0,0.03); overflow: hidden; }
.elock-table { width: 100%; border-collapse: separate; border-spacing: 0; }
.elock-table th { background: linear-gradient(180deg, rgba(248,250,252,0.95) 0%, rgba(241,245,249,0.95) 100%); color: #0f172a; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; padding: 18px 24px; border-bottom: 1px solid rgba(226,232,240,0.6); white-space: nowrap; }
.elock-table td { color: #1e293b; font-weight: 500; font-size: 14.5px; padding: 16px 24px; border-bottom: 1px solid rgba(226,232,240,0.4); transition: background 0.2s; }
.elock-table tr:hover td { background: rgba(79,70,229,0.03); }
.elock-table tr:last-child td { border-bottom: none; }

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
.elock-chart-card { background: rgba(255,255,255,0.9); backdrop-filter: blur(24px); border-radius: 24px; border: 1px solid rgba(255,255,255,0.6); padding: 32px; box-shadow: 0 12px 40px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.9); }
.elock-chart-card h3 { color: #0f172a; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 17px; margin-bottom: 4px; }
.elock-chart-card .sub { color: #64748b; font-weight: 500; font-size: 13.5px; }

/* Tooltip */
.elock-tooltip-v2 { background: rgba(255,255,255,0.95) !important; backdrop-filter: blur(10px) !important; border: 1px solid rgba(226,232,240,0.6) !important; border-radius: 16px !important; padding: 16px 20px !important; box-shadow: 0 12px 40px rgba(0,0,0,0.08) !important; font-family: 'Inter', sans-serif !important; }

/* Spreadsheet */
.elock-excel-wrap { background: rgba(255,255,255,0.95); backdrop-filter: blur(20px); border-radius: 24px; border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 12px 40px rgba(0,0,0,0.03); overflow: auto; max-width: 100%; }
.elock-excel-wrap::-webkit-scrollbar { height: 8px; }
.elock-excel-wrap::-webkit-scrollbar-track { background: transparent; }
.elock-excel-wrap::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.3); border-radius: 4px; }
.elock-excel-wrap::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.5); }

/* Branch Card */
.elock-branch-card { background: rgba(255,255,255,0.85); backdrop-filter: blur(20px); border-radius: 20px; border: 1px solid rgba(226,232,240,0.8); box-shadow: 0 8px 24px -4px rgba(0,0,0,0.03); transition: all 0.3s; }
.elock-branch-card:hover { transform: translateY(-2px); box-shadow: 0 12px 32px -4px rgba(0,0,0,0.06); }

`;

// ─── Main Component ─────────────────────────────────────────────────────────────

const ElockUtilizationReport = ({
    filterType, selectedMonth, selectedYear, selectedQuarter, dateRange, selectedDay
}) => {
    // ── State ───────────────────────────────────────────────────────────────────
    const [elockData, setElockData] = useState({ summary: {}, rows: [] });
    const [elockMeta, setElockMeta] = useState({});
    const [loading, setLoading] = useState(true);
    const [tatLimitHours, setTatLimitHours] = useState(24);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });

    const isSingleDay = filterType === 'day' || (filterType === 'custom' && dateRange?.start && dateRange?.end && dateRange.start === dateRange.end);

    // ── Data Fetching ───────────────────────────────────────────────────────────

    useEffect(() => {
        const fetchElock = async () => {
            setLoading(true);
            try {
                const { startDate, endDate } = getTransportDates(
                    filterType, selectedDay, selectedYear, selectedMonth, selectedQuarter, dateRange
                );
                const params = {};
                if (startDate) params.startDate = startDate;
                if (endDate) params.endDate = endDate;
                const res = await axios.get(`${TRANSPORT_BASE}/api/elock/utilization-report`, {
                    params, headers: TRANSPORT_HEADERS, withCredentials: true
                });
                if (res.data && res.data.success) {
                    setElockData(res.data.data || { summary: {}, rows: [] });
                    setElockMeta(res.data.meta || {});
                }
            } catch (err) {
                console.error("Error fetching elock report:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchElock();
    }, [filterType, selectedMonth, selectedYear, selectedQuarter, dateRange, selectedDay]);

    // ── Daily Trend Data ────────────────────────────────────────────────────────

    const displayedRows = useMemo(() => {
        const validRows = (elockData.rows || []).filter(row => {
            const status = row.elock_assign_status ? row.elock_assign_status.toUpperCase() : '';
            return status === 'ACTIVE' || status === 'ASSIGNED' || status === 'RETURNED';
        }).map(row => {
            // Add computed TAT hours
            let tatHours = null;
            const status = row.elock_assign_status ? row.elock_assign_status.toUpperCase() : '';
            if (status === 'RETURNED' && row.elock_return_date && row.date && row.elock_return_date !== 'N/A') {
                const start = parseDate(row.date);
                const end = parseDate(row.elock_return_date);
                tatHours = Math.round((end - start) / (1000 * 60 * 60));
            } else if ((status === 'ACTIVE' || status === 'ASSIGNED') && row.date) {
                const start = parseDate(row.date);
                tatHours = Math.round((new Date() - start) / (1000 * 60 * 60));
            }
            return { ...row, _tatHours: tatHours };
        });

        let filtered = validRows;

        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(row =>
                (row.lock_number || '').toLowerCase().includes(q) ||
                (row.container_number || '').toLowerCase().includes(q) ||
                (row.tr_no || '').toLowerCase().includes(q) ||
                (row.lr_no || '').toLowerCase().includes(q) ||
                (row.customer_name || '').toLowerCase().includes(q) ||
                (row.location || '').toLowerCase().includes(q) ||
                (row.elock_assign || '').toLowerCase().includes(q) ||
                (row.elock_assign_others || '').toLowerCase().includes(q)
            );
        }

        // Sort
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                // Handle numeric sort keys
                if (sortConfig.key === '_tatHours') {
                    aVal = aVal ?? -1;
                    bVal = bVal ?? -1;
                    return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
                }

                // Date sort
                if (sortConfig.key === 'date' || sortConfig.key === 'elock_return_date') {
                    aVal = aVal ? new Date(aVal).getTime() : 0;
                    bVal = bVal ? new Date(bVal).getTime() : 0;
                    return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
                }

                // String sort
                aVal = String(aVal || '').toLowerCase();
                bVal = String(bVal || '').toLowerCase();
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return filtered;
    }, [elockData.rows, filterType, selectedDay, searchQuery, sortConfig]);

    const elockDailyTrendData = useMemo(() => {
        let { startDate, endDate } = getTransportDates(filterType, selectedDay, selectedYear, selectedMonth, selectedQuarter, dateRange);
        const result = [];
        const totalLocks = elockMeta.totalAssets || 17;
        const maintenanceCount = elockMeta.maintenanceCount || 0; // Assume constant as no historical history is provided

        // For 'all' or unfiltered mode, derive date range from actual row data
        if (!startDate || !endDate) {
            const dates = displayedRows
                .map(r => normalizeDateStr(r.date))
                .filter(d => d)
                .sort();
            if (dates.length > 0) {
                if (!startDate) startDate = dates[0];
                if (!endDate) endDate = dates[dates.length - 1];
            }
        }

        if (startDate && endDate) {
            let current = new Date(startDate);
            const end = new Date(endDate);
            
            while (current <= end) {
                const yyyy = current.getFullYear();
                const mm = String(current.getMonth() + 1).padStart(2, '0');
                const dd = String(current.getDate()).padStart(2, '0');
                const dateStr = `${yyyy}-${mm}-${dd}`;
                const normDate = normalizeDateStr(dateStr);
                
                let activeLocks = new Set();
                
                displayedRows.forEach(row => {
                    const status = row.elock_assign_status ? row.elock_assign_status.toUpperCase() : '';
                    if (status === 'ACTIVE' || status === 'ASSIGNED' || status === 'RETURNED' || row.is_returned) {
                        const tripStart = new Date(normalizeDateStr(row.date));
                        let tripEnd = new Date(); // default to today if still active
                        if ((status === 'RETURNED' || row.is_returned) && row.elock_return_date && row.elock_return_date !== 'N/A') {
                            tripEnd = new Date(normalizeDateStr(row.elock_return_date));
                        }
                        
                        // Check if the current date falls between tripStart and tripEnd (inclusive)
                        if (current >= tripStart && current <= tripEnd) {
                            const lockId = row.elock_id || row.lock_number;
                            if (lockId) {
                                activeLocks.add(lockId);
                            }
                        }
                    }
                });
                
                const activeCount = activeLocks.size;
                const avail = Math.max(0, totalLocks - activeCount - maintenanceCount);
                const util = totalLocks > 0 ? parseFloat(((activeCount / totalLocks) * 100).toFixed(1)) : 0;
                
                result.push({
                    date: normDate,
                    locksUsed: activeCount,
                    availableLocks: avail,
                    maintenanceLocks: maintenanceCount,
                    totalLocks: totalLocks,
                    utilPercent: util
                });
                
                current.setDate(current.getDate() + 1);
            }
        }
        return result;
    }, [displayedRows, filterType, selectedDay, selectedYear, selectedMonth, selectedQuarter, dateRange, elockMeta]);

    // ── Calculated KPIs ─────────────────────────────────────────────────────────

    const calculatedKPIs = useMemo(() => {
        const rows = displayedRows || [];
        const totalLocks = elockMeta.totalAssets || 17;

        // Inventory Status from API meta
        const maintenanceLocks = elockMeta.maintenanceCount || 0;
        const idleLocks = elockMeta.availableCount || 0;

        // Always use the table's actual data to ensure the KPI cards match the table exactly.
        const activeLocksMap = {};
        rows.forEach(row => {
            const status = row.elock_assign_status ? row.elock_assign_status.toUpperCase() : '';
            if (status === 'ACTIVE' || status === 'ASSIGNED' || status === 'RETURNED' || row.is_returned) {
                const lockId = row.elock_id || row.lock_number;
                if (lockId) activeLocksMap[lockId] = row;
            }
        });

        const totalAssignedLocks = Object.keys(activeLocksMap).length;

        let assignedReturnPendingLocks = 0;
        let usedLocks = 0;
        const tatAlertDetails = [];

        Object.values(activeLocksMap).forEach(row => {
            if (row.is_placeholder) {
                assignedReturnPendingLocks++;
                tatAlertDetails.push({ ...row, elapsedHours: null, severity: 'placeholder' });
            } else {
                const start = parseDate(row.date);
                const elapsedHours = (new Date() - start) / (1000 * 60 * 60);
                if (elapsedHours > tatLimitHours) {
                    assignedReturnPendingLocks++;
                    tatAlertDetails.push({ ...row, elapsedHours: Math.round(elapsedHours), severity: elapsedHours >= tatLimitHours * 2 ? 'critical' : 'warning' });
                } else {
                    usedLocks++;
                }
            }
        });

        // Guarantee match with API count
        if (totalAssignedLocks > 0) {
            assignedReturnPendingLocks = Math.min(assignedReturnPendingLocks, totalAssignedLocks);
            usedLocks = totalAssignedLocks - assignedReturnPendingLocks;
        }

        const assetUtilizationPercent = totalLocks > 0
            ? (usedLocks / totalLocks * 100).toFixed(1)
            : '0.0';

        // Average Daily Locks Used
        const { startDate, endDate } = getTransportDates(
            filterType, selectedDay, selectedYear, selectedMonth, selectedQuarter, dateRange
        );
        let diffDays = 1;
        if (startDate && endDate) {
            const startD = new Date(startDate);
            const endD = new Date(endDate);
            diffDays = Math.ceil(Math.abs(endD - startD) / (1000 * 60 * 60 * 24)) + 1 || 1;
        }

        const actualTripRows = rows.filter(row => {
            const status = row.elock_assign_status ? row.elock_assign_status.toUpperCase() : '';
            return status === 'ACTIVE' || status === 'ASSIGNED' || status === 'RETURNED';
        });

        const totalLocksUsedDuringPeriod = actualTripRows.length;
        
        // Calculate true daily average using the exact daily trend table data
        const sumDailyLocksUsed = elockDailyTrendData.reduce((sum, d) => sum + d.locksUsed, 0);
        const averageDailyLocksUsed = elockDailyTrendData.length > 0 ? Math.round(sumDailyLocksUsed / elockDailyTrendData.length) : 0;

        // Average Daily Utilization %
        const averageDailyUtilizationPercent = totalLocks > 0 ? ((averageDailyLocksUsed / totalLocks) * 100).toFixed(1) : '0.0';

        // Highest Single Day Utilization %
        const maxLocksUsedSingleDay = elockDailyTrendData.length > 0 ? Math.max(...elockDailyTrendData.map(d => d.locksUsed)) : 0;
        const highestSingleDayUtilizationPercent = totalLocks > 0 ? ((maxLocksUsedSingleDay / totalLocks) * 100).toFixed(1) : '0.0';

        // Projected Volume (Monthly)
        let daysInMonth = 30;
        if (selectedMonth && selectedYear) {
            daysInMonth = new Date(selectedYear, parseInt(selectedMonth) + 1, 0).getDate();
        } else if (startDate) {
            const startD = new Date(startDate);
            daysInMonth = new Date(startD.getFullYear(), startD.getMonth() + 1, 0).getDate();
        }
        
        let daysInPeriod = elockDailyTrendData.length || 1;
        const averageTripsPerDay = totalLocksUsedDuringPeriod / daysInPeriod;
        const projectedVolume = Math.round(averageTripsPerDay * daysInMonth);

        // Projected Lock Requirement
        let totalRetentionDays = 0;
        let returnedCount = 0;
        rows.forEach(row => {
            const status = row.elock_assign_status ? row.elock_assign_status.toUpperCase() : '';
            if ((status === 'RETURNED' || row.is_returned) && row.elock_return_date && row.date && row.elock_return_date !== 'N/A') {
                const start = parseDate(row.date);
                const end = parseDate(row.elock_return_date);
                const diffDaysVal = (end - start) / (1000 * 60 * 60 * 24);
                if (diffDaysVal >= 0) {
                    totalRetentionDays += diffDaysVal;
                    returnedCount++;
                }
            }
        });
        const averageLockRetentionDays = returnedCount > 0 ? (totalRetentionDays / returnedCount) : 2.25;
        // steady-state Little's Law: L = lambda * W
        const projectedLockRequirement = Math.ceil(averageTripsPerDay * averageLockRetentionDays);

        // Fleet-wise Analysis
        let srccLocksUsed = 0;
        let otherFleetLocksUsed = 0;
        actualTripRows.forEach(row => {
            const assign = (row.elock_assign || '').trim().toUpperCase();
            const others = (row.elock_assign_others || '').trim().toUpperCase();
            const isSrcc = assign === 'SRCC' || (assign === '' && others === '');
            if (isSrcc) srccLocksUsed++;
            else otherFleetLocksUsed++;
        });
        const srccUtilizationPercent = totalLocksUsedDuringPeriod > 0 ? ((srccLocksUsed / totalLocksUsedDuringPeriod) * 100).toFixed(1) : '0.0';
        const otherFleetUtilizationPercent = totalLocksUsedDuringPeriod > 0 ? ((otherFleetLocksUsed / totalLocksUsedDuringPeriod) * 100).toFixed(1) : '0.0';

        const srccRatio = totalLocksUsedDuringPeriod > 0 ? (srccLocksUsed / totalLocksUsedDuringPeriod) : 0;
        const srccProjectedVolume = Math.round(projectedVolume * srccRatio);
        const othersProjectedVolume = projectedVolume - srccProjectedVolume;
        
        const srccProjectedLockRequirement = Math.round(projectedLockRequirement * srccRatio);
        const othersProjectedLockRequirement = projectedLockRequirement - srccProjectedLockRequirement;

        return {
            totalLocks, usedLocks, assignedReturnPendingLocks, idleLocks, maintenanceLocks,
            assetUtilizationPercent, averageDailyLocksUsed, averageDailyUtilizationPercent,
            highestSingleDayUtilizationPercent, projectedVolume, projectedLockRequirement,
            srccProjectedVolume, othersProjectedVolume, srccProjectedLockRequirement, othersProjectedLockRequirement,
            elockTatAlerts: assignedReturnPendingLocks, tatAlertDetails,
            srccLocksUsed, srccUtilizationPercent, otherFleetLocksUsed, otherFleetUtilizationPercent,
            averageLockRetentionDays, totalLocksUsedDuringPeriod, maxLocksUsedSingleDay
        };
    }, [displayedRows, elockMeta, elockDailyTrendData, filterType, selectedDay, selectedYear, selectedMonth, selectedQuarter, dateRange, tatLimitHours]);

    // ── Displayed Rows (searchable, sortable, filtered) ─────────────────────────



    // ── Inventory Donut Chart Data ──────────────────────────────────────────────

    const inventoryDonutData = useMemo(() => {
        const data = [];
        if (isSingleDay) {
            if (calculatedKPIs.usedLocks > 0) data.push({ name: 'Used / Active', value: calculatedKPIs.usedLocks, fill: DONUT_COLORS.used });
            if (calculatedKPIs.assignedReturnPendingLocks > 0) data.push({ name: 'Return Pending', value: calculatedKPIs.assignedReturnPendingLocks, fill: DONUT_COLORS.returnPending });
            if (calculatedKPIs.idleLocks > 0) data.push({ name: 'Idle / Available', value: calculatedKPIs.idleLocks, fill: DONUT_COLORS.idle });
            if (calculatedKPIs.maintenanceLocks > 0) data.push({ name: 'Maintenance', value: calculatedKPIs.maintenanceLocks, fill: DONUT_COLORS.maintenance });
        } else {
            const avgUsed = parseFloat(calculatedKPIs.averageDailyLocksUsed) || 0;
            const avgMaint = calculatedKPIs.maintenanceLocks || 0;
            const avgIdle = Math.max(0, calculatedKPIs.totalLocks - avgUsed - avgMaint);
            
            if (avgUsed > 0) data.push({ name: 'Avg Used', value: avgUsed, fill: DONUT_COLORS.used });
            if (avgIdle > 0) data.push({ name: 'Avg Idle', value: parseFloat(avgIdle.toFixed(1)), fill: DONUT_COLORS.idle });
            if (avgMaint > 0) data.push({ name: 'Maintenance', value: avgMaint, fill: DONUT_COLORS.maintenance });
        }
        
        if (data.length === 0) data.push({ name: 'No Data', value: 1, fill: '#e2e8f0' });
        return data;
    }, [calculatedKPIs, isSingleDay]);

    // ── Fleet Breakdown Data ────────────────────────────────────────────────────

    const fleetDonutData = useMemo(() => {
        const data = [];
        if (calculatedKPIs.srccLocksUsed > 0) data.push({ name: 'SRCC', value: calculatedKPIs.srccLocksUsed, fill: FLEET_COLORS.srcc });
        if (calculatedKPIs.otherFleetLocksUsed > 0) data.push({ name: 'Others / Hired', value: calculatedKPIs.otherFleetLocksUsed, fill: FLEET_COLORS.others });
        if (data.length === 0) data.push({ name: 'No Data', value: 1, fill: '#e2e8f0' });
        return data;
    }, [calculatedKPIs]);


    // ── Location Breakdown Data ───────────────────────────────────────────────────

    const locationSummary = useMemo(() => {
        if (!displayedRows || displayedRows.length === 0) return { list: [], grandTotals: {} };
        const locMap = {};
        displayedRows.forEach(r => {
            const status = r.elock_assign_status ? r.elock_assign_status.toUpperCase() : '';
            if (status !== 'ACTIVE' && status !== 'ASSIGNED' && status !== 'RETURNED') return;
            const loc = (r.location || 'Unknown').trim();
            if (!locMap[loc]) locMap[loc] = { name: loc, trips: 0, days: new Set() };
            locMap[loc].trips += 1;
            if (r.date) locMap[loc].days.add(normalizeDateStr(r.date));
        });

        // The number of days in the period
        let { startDate, endDate } = getTransportDates(filterType, selectedDay, selectedYear, selectedMonth, selectedQuarter, dateRange);
        // Derive date range from data when not available (e.g., 'all' filter)
        if (!startDate || !endDate) {
            const dates = displayedRows
                .map(r => normalizeDateStr(r.date))
                .filter(d => d)
                .sort();
            if (dates.length > 0) {
                if (!startDate) startDate = dates[0];
                if (!endDate) endDate = dates[dates.length - 1];
            }
        }
        let daysInPeriod = 1;
        if (startDate && endDate) {
            daysInPeriod = Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1);
        }

        const list = Object.values(locMap).map(v => {
            const avgTripsPerDay = (v.trips / daysInPeriod).toFixed(1);
            let projection = 0;
            if (filterType !== 'day') {
                const daysInMonth = getDaysInMonth(startDate ? new Date(startDate) : new Date());
                projection = Math.round((v.trips / daysInPeriod) * daysInMonth);
            }
            return {
                name: v.name,
                total: v.trips,
                avgTripsPerDay,
                projection
            };
        }).sort((a, b) => b.total - a.total);

        const totalTrips = list.reduce((sum, item) => sum + item.total, 0);
        const grandAvg = (totalTrips / daysInPeriod).toFixed(1);
        let grandProj = 0;
        if (filterType !== 'day') {
            const daysInMonth = getDaysInMonth(startDate ? new Date(startDate) : new Date());
            grandProj = Math.round((totalTrips / daysInPeriod) * daysInMonth);
        }

        return {
            list,
            grandTotals: {
                total: totalTrips,
                avgTripsPerDay: grandAvg,
                projection: grandProj
            }
        };
    }, [displayedRows, filterType, selectedDay, selectedYear, selectedMonth, selectedQuarter, dateRange]);

    // ── Sort Handler ────────────────────────────────────────────────────────────

    const requestSort = useCallback((key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    }, []);

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return ' ↕';
        return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    };

    // ── Excel Export ────────────────────────────────────────────────────────────

    const exportToExcel = async () => {
        if (!displayedRows?.length) { alert("No data available to export."); return; }
        try {
            const ExcelJS = await import('exceljs');
            const { saveAs } = await import('file-saver');
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Exim Application';
            const ws = workbook.addWorksheet('E-Lock Transactions');

            const { startDate, endDate } = getTransportDates(filterType, selectedDay, selectedYear, selectedMonth, selectedQuarter, dateRange);
            const dateRangeStr = startDate && endDate ? `${startDate} to ${endDate}` : startDate || endDate || 'Selected Period';

            // Title
            ws.addRow([`E-Lock Utilization Transactions (${dateRangeStr})`]);
            ws.mergeCells('A1:J1');
            const titleRow = ws.getRow(1);
            titleRow.height = 35;
            titleRow.getCell(1).font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
            titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
            titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            ws.addRow([]);

            // Headers
            const headers = ['S.No', 'TR No', 'Container No', 'Lock No', 'LR No', 'Assign Date', 'Return Date', 'Status', 'TAT (Hrs)', 'Location', 'Customer', 'Assignee'];
            ws.addRow(headers);
            const headerRow = ws.getRow(3);
            headerRow.height = 25;
            headerRow.eachCell(cell => {
                cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
                cell.border = { top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, left: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }, right: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            // Data rows
            displayedRows.forEach((r, idx) => {
                ws.addRow([
                    idx + 1,
                    r.tr_no || '—',
                    r.container_number || '—',
                    r.lock_number || '—',
                    r.lr_no || '—',
                    r.date ? formatDateSafe(r.date) : '—',
                    r.elock_return_date ? formatDateSafe(r.elock_return_date) : '—',
                    r.elock_assign_status || '—',
                    r._tatHours !== null ? r._tatHours : '—',
                    r.location || '—',
                    r.customer_name || '—',
                    r.elock_assign || '—'
                ]);
                const row = ws.getRow(4 + idx);
                row.height = 20;
                const bgArgb = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
                row.eachCell(cell => {
                    cell.font = { name: 'Arial', size: 10, color: { argb: 'FF334155' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
                    cell.border = { top: { style: 'thin', color: { argb: 'FFE2E8F0' } }, left: { style: 'thin', color: { argb: 'FFE2E8F0' } }, bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }, right: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });
            });

            ws.columns.forEach(col => { let max = 0; col.eachCell((cell, rn) => { if (rn > 2) { const l = cell.value ? String(cell.value).length : 0; if (l > max) max = l; } }); col.width = Math.max(max + 4, 12); });

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `ELock_Transactions_${dateRangeStr.replace(/\s+/g, '_')}.xlsx`);
        } catch (error) {
            console.error("Failed to export:", error);
            alert("An error occurred while exporting.");
        }
    };

    // ── Progress Circle ─────────────────────────────────────────────────────────

    const ProgressCircle = ({ pct, color }) => {
        const radius = 18;
        const strokeWidth = 3.5;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (Math.min(pct, 100) / 100) * circumference;
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

    // ── KPI Card Component ──────────────────────────────────────────────────────

    const KpiCard = ({ label, subtitle, value, extra, footer, color, gradient, border, badgeBg, large, accentColor, hl, hlBlue, pct }) => {
        const defaultAccent = accentColor || color || '#cbd5e1';
        const isHl = hl || hlBlue;
        const textColor = hl ? '#991b1b' : hlBlue ? '#1e40af' : '#64748b';
        const valColor = hl ? '#991b1b' : hlBlue ? '#1e40af' : '#0f172a';

        // pct is now directly passed in Elock, but we still handle it gracefully
        return (
            <div className="elock-card" data- data-hl-blue={hlBlue ? 'true' : 'false'} style={{
                padding: large ? '28px 32px' : '24px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: large ? '12px' : '10px',
                '--ec-bg': gradient,
                '--ec-border': border,
                '--ec-accent': defaultAccent
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', zIndex: 1 }}>
                    <div>
                        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: large ? '14.5px' : '13.5px', color: textColor, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: large ? 800 : 700 }}>{label}</div>
                        {subtitle && <div style={{ fontSize: '12px', color: hl ? '#b91c1c' : '#8091a7', marginTop: '4px', fontWeight: 600, letterSpacing: '0.01em', lineHeight: 1.3 }}>{subtitle}</div>}
                    </div>
                    {pct !== undefined && pct !== null && (
                        <div style={{ flexShrink: 0, marginTop: '-4px' }}>
                            <ProgressCircle pct={parseFloat(pct)} color={defaultAccent} />
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
                {footer && (
                    <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: `1px dashed ${color}33`, zIndex: 1 }}>
                        {footer}
                    </div>
                )}
            </div>
        );
    };

    // ── Status Pill ─────────────────────────────────────────────────────────────

    const getStatusVariant = (status) => {
        if (!status) return 'neutral';
        const s = status.toUpperCase();
        if (s === 'ACTIVE' || s === 'ASSIGNED') return 'success';
        if (s === 'RETURNED' || s === 'AVAILABLE') return 'info';
        if (s === 'MAINTENANCE') return 'error';
        return 'warning';
    };

    // ── Render: Loading ─────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="elock-root">
                <style>{STYLES}</style>
                <div className="elock-loading">
                    <div className="elock-spinner"></div>
                    <div style={{ marginTop: '1.5rem', color: '#1e293b', fontWeight: 600, fontFamily: "'Outfit', sans-serif" }}>Loading E-Lock Utilization Data...</div>
                </div>
            </div>
        );
    }

    // ── Render: Dashboard Tab ───────────────────────────────────────────────────

    const renderDashboard = () => (
        <>
            {/* Row 1: Core KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <KpiCard label="Total Locks" value={calculatedKPIs.totalLocks} color="#667eea" />
                {isSingleDay ? (
                    <>
                        <KpiCard label="Used / Active" subtitle="In trips right now" value={`${calculatedKPIs.usedLocks}`} pct={`${calculatedKPIs.assetUtilizationPercent}%`} color={getUtilColor(calculatedKPIs.assetUtilizationPercent)} />
                        <KpiCard label="Idle / Available" value={`${calculatedKPIs.idleLocks}`} pct={calculatedKPIs.totalLocks ? ((calculatedKPIs.idleLocks / calculatedKPIs.totalLocks) * 100).toFixed(1) : '0'} subtitle="Ready to assign" color="#10b981" />
                        <KpiCard label="Asset Utilization" value={`${calculatedKPIs.assetUtilizationPercent}%`} color={getUtilColor(calculatedKPIs.assetUtilizationPercent)} />
                    </>
                ) : (
                    <>
                        <KpiCard label="Avg Daily Locks Used" subtitle="Active per day" value={`${calculatedKPIs.averageDailyLocksUsed}`} pct={`${calculatedKPIs.averageDailyUtilizationPercent}%`} color={getUtilColor(calculatedKPIs.averageDailyUtilizationPercent)} />
                        <KpiCard label="Avg Idle Locks" value={`${Math.round(Math.max(0, calculatedKPIs.totalLocks - calculatedKPIs.averageDailyLocksUsed - calculatedKPIs.maintenanceLocks))}`} pct={calculatedKPIs.totalLocks ? ((Math.max(0, calculatedKPIs.totalLocks - calculatedKPIs.averageDailyLocksUsed - calculatedKPIs.maintenanceLocks) / calculatedKPIs.totalLocks) * 100).toFixed(1) : '0'} subtitle="Available per day" color="#10b981" />
                        <KpiCard label="Avg Utilization" value={`${calculatedKPIs.averageDailyUtilizationPercent}%`} color={getUtilColor(calculatedKPIs.averageDailyUtilizationPercent)} />
                    </>
                )}
            </div>

            {/* Row 2: KPI with comparison badges (only for ranges) */}
            {!isSingleDay && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                        <KpiCard label="Peak Day Used" value={`${calculatedKPIs.maxLocksUsedSingleDay || 0}`} subtitle="Max used in one day" color={getInverseUtilColor(calculatedKPIs.highestSingleDayUtilizationPercent)} large />
                        <KpiCard 
                            label="Projected Volume" 
                            value={`${calculatedKPIs.projectedVolume}`} 
                            subtitle="Expected monthly usage" 
                            color="#8b5cf6" large 
                            footer={<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}><span style={{ color: '#4f46e5' }}>SRCC: {calculatedKPIs.srccProjectedVolume}</span><span style={{ color: '#d97706' }}>Others: {calculatedKPIs.othersProjectedVolume}</span></div>} 
                        />
                        <KpiCard 
                            label="Projected Lock Need" 
                            value={`${calculatedKPIs.projectedLockRequirement}`} 
                            subtitle={`Avg Retention: ${calculatedKPIs.averageLockRetentionDays.toFixed(1)} days`} 
                            color="#10b981" large 
                            footer={<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700 }}><span style={{ color: '#10b981' }}>SRCC: {calculatedKPIs.srccProjectedLockRequirement}</span><span style={{ color: '#d97706' }}>Others: {calculatedKPIs.othersProjectedLockRequirement}</span></div>} 
                        />
                    </div>
                </div>
            )}

            {/* Row 3: Locks Not Available breakdown cards */}
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '24px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>⚠️</span> Locks Not Available 
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <KpiCard label="Locks Not Available" value={`${calculatedKPIs.assignedReturnPendingLocks + calculatedKPIs.maintenanceLocks}`} pct={calculatedKPIs.totalLocks ? (((calculatedKPIs.assignedReturnPendingLocks + calculatedKPIs.maintenanceLocks) / calculatedKPIs.totalLocks) * 100).toFixed(1) : '0'} color="#f59e0b" accentColor="#f59e0b" large border="1px solid #f59e0b33" />
                <KpiCard label="Return Pending" value={`${calculatedKPIs.assignedReturnPendingLocks}`} pct={calculatedKPIs.totalLocks ? ((calculatedKPIs.assignedReturnPendingLocks / calculatedKPIs.totalLocks) * 100).toFixed(1) : '0'} color="#f59e0b" accentColor="#f59e0b" />
                <KpiCard label="Maintenance" value={`${calculatedKPIs.maintenanceLocks}`} pct={calculatedKPIs.totalLocks ? ((calculatedKPIs.maintenanceLocks / calculatedKPIs.totalLocks) * 100).toFixed(1) : '0'} color="#ef4444" accentColor="#ef4444" />
            </div>

            <div style={{ fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '24px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🚨</span> Turnaround Time (TAT) Monitoring
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <KpiCard 
                    label="TAT Alerts" 
                    value={`${calculatedKPIs.elockTatAlerts}`} 
                    pct={calculatedKPIs.totalLocks ? ((calculatedKPIs.elockTatAlerts / calculatedKPIs.totalLocks) * 100).toFixed(1) : '0'}
                    color={calculatedKPIs.elockTatAlerts > 0 ? '#ef4444' : '#10b981'} 
                    accentColor={calculatedKPIs.elockTatAlerts > 0 ? '#ef4444' : '#10b981'} 
                    subtitle={`Exceeding ${tatLimitHours}h`} 
                />
            </div>

            {/* Status Distribution Donut */}
            <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
                <div className="elock-chart-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '300px' }}>
                    <div style={{ width: '100%' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>🔵 Status Distribution</h3>
                        <span className="sub">Current lock status breakdown</span>
                    </div>
                    <div style={{ width: 200, height: 200, marginTop: '12px', position: 'relative' }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={inventoryDonutData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" nameKey="name" strokeWidth={0}>
                                    {inventoryDonutData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                </Pie>
                                <Pie data={[{ value: 1 }]} cx="50%" cy="50%" innerRadius={0} outerRadius={0} dataKey="value">
                                    <DonutCenterLabel total={calculatedKPIs.totalLocks} viewBox={{ cx: 100, cy: 100 }} />
                                </Pie>
                                <Tooltip content={<DonutTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '16px' }}>
                        {inventoryDonutData.filter(d => d.name !== 'No Data').map((d, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#475569', background: 'rgba(0,0,0,0.02)', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.03)' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.fill, display: 'inline-block' }} />
                                {d.name} ({d.value})
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🏢</span> Operations Summary
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                        {/* SR Container Carriers Card */}
                        <div className="elock-branch-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '16px', fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}>📦 SR Container Carriers</span>
                                <span className="status-pill-v2" data-variant="success">{calculatedKPIs.srccLocksUsed} trips</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid rgba(226,232,240,0.4)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(5,150,105,0.05)', padding: '10px 16px', borderRadius: '8px' }}>
                                    <span style={{ fontSize: '12px', color: '#047857', fontWeight: 700 }}>SRCC Locks Used</span>
                                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#059669' }}>{calculatedKPIs.srccLocksUsed}<span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginLeft: '4px' }}>{calculatedKPIs.srccUtilizationPercent}%</span></span>
                                </div>
                            </div>
                        </div>

                        {/* Others / Hired Card */}
                        <div className="elock-branch-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '16px', fontWeight: 800, color: '#d97706', display: 'flex', alignItems: 'center', gap: '8px' }}>🚛 Others / Hired</span>
                                <span className="status-pill-v2" data-variant="warning">{calculatedKPIs.otherFleetLocksUsed} trips</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid rgba(226,232,240,0.4)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(245,158,11,0.05)', padding: '10px 16px', borderRadius: '8px' }}>
                                    <span style={{ fontSize: '12px', color: '#b45309', fontWeight: 700 }}>Other Locks Used</span>
                                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#d97706' }}>{calculatedKPIs.otherFleetLocksUsed}<span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginLeft: '4px' }}>{calculatedKPIs.otherFleetUtilizationPercent}%</span></span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Branch Table */}
            <div className="elock-table-wrap" style={{ marginTop: '24px' }}>
                <table className="elock-table">
                    <thead>
                        <tr>
                            <th>Location / Branch</th>
                            <th>Avg Trips / Day</th>
                            {!isSingleDay && <th>Projection</th>}
                            <th style={{ textAlign: 'right' }}>Total Trips</th>
                        </tr>
                    </thead>
                    <tbody>
                        {locationSummary.list.length > 0 ? (
                            <>
                                {locationSummary.list.map((loc, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{loc.name}</td>
                                        <td style={{ color: '#3b82f6', fontWeight: 700 }} className="mono">{loc.avgTripsPerDay}</td>
                                        {!isSingleDay && <td style={{ color: '#10b981', fontWeight: 700 }} className="mono">{loc.projection}</td>}
                                        <td style={{ fontWeight: 800, textAlign: 'right', color: '#0f172a' }}>{loc.total}</td>
                                    </tr>
                                ))}
                                <tr style={{ background: 'rgba(102,126,234,0.08)', fontWeight: 800 }}>
                                    <td style={{ color: '#0f172a' }}>Total</td>
                                    <td style={{ color: '#3b82f6' }} className="mono">{locationSummary.grandTotals.avgTripsPerDay}</td>
                                    {!isSingleDay && <td style={{ color: '#10b981' }} className="mono">{locationSummary.grandTotals.projection}</td>}
                                    <td style={{ fontWeight: 900, textAlign: 'right', color: '#0f172a' }}>{locationSummary.grandTotals.total}</td>
                                </tr>
                            </>
                        ) : (
                            <tr><td colSpan={isSingleDay ? 3 : 4} style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No location data available</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Location Chart */}
            {locationSummary.list.length > 0 && (
                <div className="elock-card" style={{ padding: '24px', background: 'rgba(255,255,255,0.85)', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📊 {isSingleDay ? "Location Wise Performance" : "Location Wise Performance & Projection"}
                    </div>
                    <div style={{ width: '100%', height: 320 }}>
                        <ResponsiveContainer>
                            <BarChart data={locationSummary.list} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                                {!isSingleDay && <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />}
                                <Tooltip content={<DonutTooltip />} cursor={{ fill: 'rgba(99,102,241,0.04)' }} />
                                <Bar yAxisId="left" dataKey="total" name="Total Trips" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                {!isSingleDay && <Bar yAxisId="right" dataKey="projection" name="Projection" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
            
            {/* Daily Breakdown Table */}
            {elockDailyTrendData.length > 0 && (
                <div className="elock-table-wrap" style={{ marginTop: '32px' }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid rgba(226,232,240,0.6)' }}>
                        <h4 style={{ margin: 0, color: '#0f172a', fontSize: '16px', fontWeight: 600 }}>📅 Daily Breakdown</h4>
                        <span style={{ color: '#64748b', fontSize: '13px' }}>Complete data according to filter</span>
                    </div>
                    <div style={{ overflowX: 'auto', maxHeight: '500px' }}>
                        <table className="elock-table">
                            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                <tr>
                                    <th>Sr No.</th>
                                    <th>Date</th>
                                    <th style={{ textAlign: 'center' }}>Idle Locks</th>
                                    <th style={{ textAlign: 'center' }}>Maintenance Locks</th>
                                    <th style={{ textAlign: 'center' }}>Used Locks</th>
                                    <th style={{ textAlign: 'right' }}>Utilization %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {elockDailyTrendData.map((row, index) => (
                                    <tr key={index}>
                                        <td style={{ color: '#64748b' }}>{index + 1}</td>
                                        <td className="mono" style={{ fontWeight: 600 }}>{formatDateSafe(row.date, 'dd-MM-yyyy')}</td>
                                        <td className="mono" style={{ textAlign: 'center', color: '#10b981' }}>{row.availableLocks}</td>
                                        <td className="mono" style={{ textAlign: 'center', color: '#ef4444' }}>{row.maintenanceLocks}</td>
                                        <td className="mono" style={{ textAlign: 'center', color: '#06b6d4', fontWeight: 600 }}>{row.locksUsed}</td>
                                        <td className="mono" style={{ textAlign: 'right', color: getUtilColor(row.utilPercent), fontWeight: 700 }}>
                                            {row.utilPercent}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
    );

    // ── Render: Trend Tab ────────────────────────────────────────────────────────

    const renderTrend = () => (
        <>
            {/* Utilization Trend Chart */}
            <div className="elock-chart-card">
                <div style={{ marginBottom: '20px' }}>
                    <h3>Daily E-Lock Utilization Trend</h3>
                    <span className="sub">Lock usage, availability, and utilization % over the selected period</span>
                </div>
                {elockDailyTrendData.length > 0 ? (
                    <div style={{ width: '100%', height: 360 }}>
                        <ResponsiveContainer>
                            <ComposedChart data={elockDailyTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradUsed" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05} />
                                    </linearGradient>
                                    <linearGradient id="gradAvail" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                                    </linearGradient>
                                    <linearGradient id="gradMaint" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226,232,240,0.5)" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(str) => formatDateSafe(str, 'dd MMM')}
                                    stroke="#94a3b8" fontSize={11} tickLine={false}
                                />
                                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} tickLine={false} />
                                <YAxis yAxisId="right" orientation="right" stroke="#8b5cf6" fontSize={11} tickLine={false}
                                    tickFormatter={v => `${v}%`} domain={[0, 100]} />
                                <Tooltip content={<TrendTooltip />} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Area yAxisId="left" type="monotone" name="Used Locks" dataKey="locksUsed" stackId="1" stroke="#06b6d4" strokeWidth={2} fill="url(#gradUsed)" />
                                <Area yAxisId="left" type="monotone" name="Available" dataKey="availableLocks" stackId="1" stroke="#10b981" strokeWidth={2} fill="url(#gradAvail)" />
                                <Area yAxisId="left" type="monotone" name="Maintenance" dataKey="maintenanceLocks" stackId="1" stroke="#ef4444" strokeWidth={2} fill="url(#gradMaint)" />
                                <Line yAxisId="right" type="monotone" name="Utilization %" dataKey="utilPercent" stroke="#8b5cf6" strokeWidth={2.5} dot={false} strokeDasharray="6 3" />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '60px 20px', fontWeight: 500 }}>
                        No trend data available for the selected period.
                    </div>
                )}
                
                {/* Daily Breakdown Table moved to Dashboard tab */}
            </div>
        </>
    );

    // ── Render: Transactions Tab ─────────────────────────────────────────────────

    const renderTransactions = () => (
        <>
            {/* Search & Export Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
                        📋 E-Lock Transactions
                    </div>
                    <span className="elock-pill" data-v="info" style={{ fontSize: '12px' }}>
                        {displayedRows.length} record{displayedRows.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                        type="text"
                        placeholder="🔍 Search lock, container, customer, route..."
                        className="elock-search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button className="elock-export-btn" onClick={exportToExcel}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                        Export Excel
                    </button>
                </div>
            </div>

            {/* Transaction Table */}
            <div className="elock-table-wrap" style={{ overflowX: 'auto' }}>
                <table className="elock-table" style={{ minWidth: '1200px' }}>
                    <thead>
                        <tr>
                            <th style={{ width: '55px' }}>#</th>
                            <th onClick={() => requestSort('tr_no')}>TR No{getSortIndicator('tr_no')}</th>
                            <th onClick={() => requestSort('container_number')}>Container{getSortIndicator('container_number')}</th>
                            <th onClick={() => requestSort('lock_number')}>Lock No{getSortIndicator('lock_number')}</th>
                            <th onClick={() => requestSort('lr_no')}>LR No{getSortIndicator('lr_no')}</th>
                            <th onClick={() => requestSort('date')}>Assign Date{getSortIndicator('date')}</th>
                            <th onClick={() => requestSort('elock_return_date')}>Return Date{getSortIndicator('elock_return_date')}</th>
                            <th onClick={() => requestSort('elock_assign_status')}>Status{getSortIndicator('elock_assign_status')}</th>
                            <th onClick={() => requestSort('_tatHours')} style={{ textAlign: 'right' }}>TAT (Hrs){getSortIndicator('_tatHours')}</th>
                            <th onClick={() => requestSort('location')}>Route{getSortIndicator('location')}</th>
                            <th onClick={() => requestSort('customer_name')}>Customer{getSortIndicator('customer_name')}</th>
                            <th onClick={() => requestSort('elock_assign')}>Assignee{getSortIndicator('elock_assign')}</th>
                            <th onClick={() => requestSort('elock_assign_others')}>Transporter{getSortIndicator('elock_assign_others')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedRows.length > 0 ? (
                            displayedRows.map((row, index) => {
                                const status = row.elock_assign_status ? row.elock_assign_status.toUpperCase() : '';
                                const tatColor = row._tatHours !== null
                                    ? (status === 'RETURNED' ? '#475569' : getTatSeverityColor(row._tatHours, tatLimitHours))
                                    : '#94a3b8';

                                return (
                                    <tr key={row._id || index}>
                                        <td style={{ fontWeight: 500, color: '#64748b' }} className="mono">{index + 1}</td>
                                        <td style={{ color: '#3b82f6', fontWeight: 500 }} className="mono">{row.tr_no ?? '—'}</td>
                                        <td style={{ fontWeight: 700, color: '#0f172a' }} className="mono">{row.container_number ?? '—'}</td>
                                        <td className="mono" style={{ fontWeight: 600 }}>{row.lock_number ?? '—'}</td>
                                        <td className="mono" style={{ color: '#64748b' }}>{row.lr_no ?? '—'}</td>
                                        <td className="mono">{formatDateSafe(row.date)}</td>
                                        <td className="mono">{formatDateSafe(row.elock_return_date)}</td>
                                        <td>
                                            <span className="elock-pill" data-v={getStatusVariant(row.elock_assign_status)}>
                                                {row.elock_assign_status ?? '—'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, color: tatColor }} className="mono">
                                            {row._tatHours !== null ? `${row._tatHours}h` : '—'}
                                        </td>
                                        <td style={{ color: '#475569', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.location ?? '—'}</td>
                                        <td style={{ fontWeight: 500 }}>{row.customer_name ?? '—'}</td>
                                        <td>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', padding: '4px 10px',
                                                borderRadius: '8px', fontWeight: 700, fontSize: '11.5px',
                                                background: (row.elock_assign || '').toUpperCase() === 'SRCC' ? 'rgba(99,102,241,0.08)' : 'rgba(245,158,11,0.08)',
                                                color: (row.elock_assign || '').toUpperCase() === 'SRCC' ? '#4f46e5' : '#d97706',
                                                border: (row.elock_assign || '').toUpperCase() === 'SRCC' ? '1px solid rgba(99,102,241,0.15)' : '1px solid rgba(245,158,11,0.15)',
                                                fontFamily: "'Outfit', sans-serif"
                                            }}>
                                                {row.elock_assign || '—'}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 500, color: '#0f172a' }}>{row.elock_assign_others || '—'}</td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="12" style={{ textAlign: 'center', color: '#94a3b8', padding: '60px 20px', fontWeight: 500 }}>
                                    {searchQuery ? 'No records match your search.' : 'No E-Lock transaction data found for the selected period.'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );

    // ── Main Render ─────────────────────────────────────────────────────────────

    return (
        <div className="elock-root">
            <style>{STYLES}</style>

            {/* Tab Bar */}
            
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div className="elock-tabs">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className="elock-tab"
                        data-active={activeTab === tab.id ? 'true' : 'false'}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            
            <div className="kpi-info-wrap">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.6)', cursor: 'pointer', boxShadow: '0 4px 24px rgba(0,0,0,0.03)', width: '36px', height: '36px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                </div>
                <div className="kpi-info-tip" style={{ width: '400px', bottom: 'auto', top: '100%', right: '0', transform: 'translateY(-10px)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>Average Daily SR E-Lock Utilisation</div>
                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', marginBottom: '16px' }}>
                        <thead>
                            <tr style={{ color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '6px 0', fontWeight: 700 }}>Status</th>
                                <th style={{ padding: '6px 0', fontWeight: 700 }}>Utilisation</th>
                                <th style={{ padding: '6px 0', fontWeight: 700 }}>Average Locks/Day</th>
                            </tr>
                        </thead>
                        <tbody style={{ color: '#64748b', fontWeight: 600 }}>
                            <tr><td style={{ padding: '4px 0', color: '#10b981' }}>🟢 Green</td><td>&gt; 60%</td><td>11 or more locks/day</td></tr>
                            <tr><td style={{ padding: '4px 0', color: '#f59e0b' }}>🟡 Yellow</td><td>50% – 60%</td><td>9–10 locks/day</td></tr>
                            <tr><td style={{ padding: '4px 0', color: '#ef4444' }}>🔴 Red</td><td>&lt; 50%</td><td>8 or fewer locks/day</td></tr>
                        </tbody>
                    </table>

                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>Highest Single-Day Utilisation</div>
                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '6px 0', fontWeight: 700 }}>Status</th>
                                <th style={{ padding: '6px 0', fontWeight: 700 }}>Utilisation</th>
                            </tr>
                        </thead>
                        <tbody style={{ color: '#64748b', fontWeight: 600 }}>
                            <tr><td style={{ padding: '4px 0', color: '#10b981' }}>🟢 Green</td><td>&lt; 40%</td></tr>
                            <tr><td style={{ padding: '4px 0', color: '#f59e0b' }}>🟡 Yellow</td><td>40% – 60%</td></tr>
                            <tr><td style={{ padding: '4px 0', color: '#ef4444' }}>🔴 Red</td><td>&gt; 60%</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'trend' && renderTrend()}
        {activeTab === 'transactions' && renderTransactions()}
    </div>
    );
};

export default ElockUtilizationReport;
