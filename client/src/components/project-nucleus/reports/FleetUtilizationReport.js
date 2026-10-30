import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import {
    ResponsiveContainer, ComposedChart, BarChart, Bar, Cell, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, PieChart, Pie
} from 'recharts';
import { getTransportDates, TRANSPORT_BASE, TRANSPORT_HEADERS } from './reports-helper';

// ─── Constants ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
    { key: '4', name: 'Apr', label: 'APR' }, { key: '5', name: 'May', label: 'MAY' }, { key: '6', name: 'Jun', label: 'JUN' },
    { key: '7', name: 'Jul', label: 'JUL' }, { key: '8', name: 'Aug', label: 'AUG' }, { key: '9', name: 'Sep', label: 'SEP' },
    { key: '10', name: 'Oct', label: 'OCT' }, { key: '11', name: 'Nov', label: 'NOV' }, { key: '12', name: 'Dec', label: 'DEC' },
    { key: '1', name: 'Jan', label: 'JAN' }, { key: '2', name: 'Feb', label: 'FEB' }, { key: '3', name: 'Mar', label: 'MAR' }
];

const UTIL_COLOR = (pct) => pct >= 90 ? '#10b981' : pct >= 80 ? '#f59e0b' : '#ef4444';

const KPI_COLOR = {
    notOnRoad: (pct) => pct <= 10 ? '#10b981' : pct <= 20 ? '#f59e0b' : '#ef4444',
    maintenance: (pct) => pct <= 3 ? '#10b981' : pct <= 5 ? '#f59e0b' : '#ef4444',
    accident: (pct) => pct <= 1 ? '#10b981' : pct <= 3 ? '#f59e0b' : '#ef4444',
    noDriver: (pct) => pct <= 2 ? '#10b981' : pct <= 5 ? '#f59e0b' : '#ef4444',
    driverOnLeave: (pct) => pct <= 5 ? '#10b981' : pct <= 10 ? '#f59e0b' : '#ef4444'
};

/** Monthly trip-count bands shared by the trend table, charts, vehicle modal and exports */
const HEAT_BANDS = [
    { key: 'high', label: 'High', range: '26+', bg: '#d1fae5', text: '#047857', solid: '#86efac', xlBg: 'FFD1FAE5', xlText: 'FF047857' },
    { key: 'medium', label: 'Medium', range: '10–25', bg: '#fef3c7', text: '#b45309', solid: '#fcd34d', xlBg: 'FFFEF3C7', xlText: 'FFB45309' },
    { key: 'low', label: 'Low', range: '1–9', bg: '#ffe4e6', text: '#be123c', solid: '#f43f5e', xlBg: 'FFFFE4E6', xlText: 'FFBE123C' },
    { key: 'idle', label: 'Idle', range: '0', bg: '#f1f5f9', text: '#94a3b8', solid: '#94a3b8', xlBg: 'FFF1F5F9', xlText: 'FF94A3B8' }
];
const HEAT_BAND_MAP = Object.fromEntries(HEAT_BANDS.map(b => [b.key, b]));

const getHeatBand = (value) => {
    const v = Number(value) || 0;
    if (v <= 0) return HEAT_BAND_MAP.idle;
    if (v < 10) return HEAT_BAND_MAP.low;
    if (v <= 25) return HEAT_BAND_MAP.medium;
    return HEAT_BAND_MAP.high;
};

/** Earliest financial year the fleet-summary API has data for (used for "All Time") */
const FIRST_SUMMARY_FY = 2023;

const parseYmd = (s) => {
    if (!s) return null;
    const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
    if (!y || !m) return null;
    return new Date(y, m - 1, d || 1);
};

/**
 * Turns the main Filter Period into vehicle-summary columns: one column per month,
 * or one per financial year when the period is longer than 12 months.
 * Each column lists the (financial year, month) parts it adds up.
 */
const buildPeriodColumns = (startDate, endDate, daily = false) => {
    const today = new Date();
    const start = parseYmd(startDate) || new Date(FIRST_SUMMARY_FY, 3, 1);
    const end = parseYmd(endDate) || new Date(today.getFullYear(), today.getMonth(), 1);
    if (start > end) return [];

    if (daily) {
        const days = [];
        for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const monthName = MONTH_NAMES.find(x => x.key === String(d.getMonth() + 1)).name;
            const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            days.push({
                key: `d-${date}`,
                date,
                label: `${d.getDate()} ${monthName}`,
                fullLabel: `${d.getDate()} ${monthName} ${d.getFullYear()}`,
                parts: [],
                future: d > today
            });
        }
        return days;
    }

    const months = [];
    let y = start.getFullYear();
    let mo = start.getMonth() + 1;
    while (y < end.getFullYear() || (y === end.getFullYear() && mo <= end.getMonth() + 1)) {
        const monthKey = String(mo);
        months.push({
            fy: mo >= 4 ? y : y - 1,
            year: y,
            m: MONTH_NAMES.find(x => x.key === monthKey),
            future: new Date(y, mo - 1, 1) > today
        });
        mo += 1;
        if (mo > 12) { mo = 1; y += 1; }
    }

    if (months.length <= 12) {
        return months.map(p => ({
            key: `${p.year}-${p.m.key}`,
            label: `${p.m.name} ${String(p.year).slice(-2)}`,
            fullLabel: `${p.m.name} ${p.year}`,
            parts: [p],
            future: p.future
        }));
    }

    const byFy = new Map();
    months.forEach(p => {
        if (!byFy.has(p.fy)) byFy.set(p.fy, []);
        byFy.get(p.fy).push(p);
    });
    return [...byFy.entries()].map(([fy, parts]) => {
        const label = `FY ${String(fy).slice(-2)}-${String(fy + 1).slice(-2)}`;
        return { key: `fy-${fy}`, label, fullLabel: label, parts, future: parts.every(p => p.future) };
    });
};

/** Day columns count as 1/30 of a month so their trips are projected to the monthly bands */
const DAYS_PER_MONTH = 30;

/** Months in a column that have already started (used for monthly averages) */
const getColumnElapsed = (col) => (col.date ? 1 / DAYS_PER_MONTH : Math.max(1, col.parts.filter(p => !p.future).length));

const extractSummaryRows = (payload) => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload.rows)) return payload.rows;
    if (Array.isArray(payload.data)) return payload.data;
    return [];
};

/** Outsourced trip count for one month from a fleet-summary payload, or null if the API didn't send it */
const getOutsourcedFromPayload = (payload, m) => {
    const keysToTry = [m.key, Number(m.key), String(m.key).padStart(2, '0'), m.name, m.name?.toLowerCase(), m.name?.toUpperCase(), m.label];
    const sources = [
        payload?.outsourced,
        payload?.outsourcedMonths,
        payload?.summary?.outsourced,
        payload?.summary?.outsourcedMonths,
        payload?.outsourcedRow?.months,
        payload?.totals?.outsourced
    ];
    for (const src of sources) {
        if (src && typeof src === 'object') {
            for (const k of keysToTry) {
                if (src[k] !== undefined && src[k] !== null && src[k] !== '') {
                    const n = Number(src[k]);
                    if (!isNaN(n)) return n;
                }
            }
        }
    }
    return null;
};

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
    if (!v || !v.status) return 'Others';
    const cat = getPrimaryCategory(v.status);
    if (cat !== 'Others') return cat;
    if (Array.isArray(v.status)) {
        const nonIdle = v.status.find(s => String(s).toUpperCase() !== 'IDLE');
        return nonIdle ? String(nonIdle).trim() : 'Others';
    }
    const cleaned = String(v.status).trim();
    if (cleaned.toUpperCase() !== 'IDLE') return cleaned;
    return 'Others';
};

/** Compute elapsed days for any filter type */
const computeElapsedDays = (filterType, selectedYear, selectedMonth, selectedQuarter, dateRange, dailyDataLen, selectedDay) => {
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
        const parsedM = parseInt(selectedMonth);
        const selMonth = !isNaN(parsedM) ? parsedM : todayMonth;
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
    } else if (filterType === 'fin-year' || filterType === 'financial-year') {
        totalDays = 365;
        const fyStart = new Date(selYear, 3, 1);
        const fyEnd = new Date(selYear + 1, 2, 31);
        if (today >= fyStart && today <= fyEnd) {
            elapsedDays = Math.max(1, Math.round((today - fyStart) / 86400000) + 1);
        } else if (today < fyStart) {
            elapsedDays = 0;
        } else {
            elapsedDays = 365;
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

/** Performance color theme based on percentage vs previous month */
const getColorTheme = (perfVal) => {
    if (perfVal === null || perfVal === undefined) return {
        color: '#64748b', bg: 'transparent', border: 'none', badgeBg: null, performanceLabel: null
    };
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

/** Compact tooltip for the trend-tab charts */
const FsChartTooltip = ({ active, payload, label, suffix = '' }) => {
    if (!active || !payload?.length) return null;
    const title = label ?? payload[0]?.name;
    return (
        <div className="fleet-tooltip-v2" style={{ padding: '10px 14px', minWidth: 150 }}>
            {title !== undefined && (
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 6, fontFamily: "'Outfit', sans-serif", fontSize: 13 }}>{title}</div>
            )}
            {payload.filter(p => p.value !== null && p.value !== undefined).map(p => (
                <div key={p.dataKey || p.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#475569', marginTop: 3 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.payload?.fill || p.color, flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{p.name}</span>
                    <strong style={{ color: '#0f172a' }}>{p.dataKey === 'share' ? `${p.value}%` : `${p.value}${suffix}`}</strong>
                </div>
            ))}
        </div>
    );
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

/* ── Trend tab: Vehicle Trip Summary ── */
.fs-section { display: flex; flex-direction: column; gap: 18px; }
.fs-section-head { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 14px; }
.fs-title { margin: 0; font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; }
.fs-subtitle { display: block; margin-top: 2px; font-size: 13px; color: #64748b; font-weight: 500; }
.fs-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.fs-select { height: 36px; padding: 0 32px 0 12px; border-radius: 10px; border: 1px solid #dbe2ea; background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2364748b' stroke-width='1.6' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 12px center; appearance: none; -webkit-appearance: none; color: #1e293b; font-weight: 600; font-size: 13px; cursor: pointer; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
.fs-select:hover { border-color: #a5b4fc; }
.fs-select:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }

.fs-btn { height: 36px; display: inline-flex; align-items: center; gap: 6px; padding: 0 14px; border-radius: 10px; font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid transparent; transition: all 0.15s ease; background: #fff; }
.fs-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.fs-btn-primary { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #fff; box-shadow: 0 4px 12px rgba(99,102,241,0.25); }
.fs-btn-primary:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(99,102,241,0.32); }
.fs-btn-excel { color: #047857; border-color: #a7f3d0; }
.fs-btn-excel:hover { background: #ecfdf5; border-color: #10b981; }
.fs-btn-pdf { color: #be123c; border-color: #fecdd3; }
.fs-btn-pdf:hover { background: #fff1f2; border-color: #f43f5e; }
.fs-btn-danger { background: #e11d48; color: #fff; height: 32px; }

.fs-error { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 16px; border-radius: 12px; background: #fff1f2; border: 1px solid #fecdd3; color: #9f1239; font-size: 13.5px; font-weight: 500; }

.fs-kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
.fs-kpi { position: relative; display: flex; flex-direction: column; gap: 4px; padding: 16px 18px 16px 20px; background: #fff; border: 1px solid #e8edf3; border-radius: 16px; box-shadow: 0 2px 10px rgba(15,23,42,0.03); overflow: hidden; }
.fs-kpi::before { content: ''; position: absolute; left: 0; top: 14px; bottom: 14px; width: 4px; border-radius: 0 4px 4px 0; background: var(--fs-accent); }
.fs-kpi-label { font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
.fs-kpi-value { font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 800; color: #0f172a; line-height: 1.15; }
.fs-kpi-hint { font-size: 12px; color: #94a3b8; font-weight: 500; }

.fs-card { background: #fff; border: 1px solid #e8edf3; border-radius: 18px; padding: 18px 20px; box-shadow: 0 2px 12px rgba(15,23,42,0.03); min-width: 0; }
.fs-card-head { margin-bottom: 12px; }
.fs-card-head h4 { margin: 0; font-family: 'Outfit', sans-serif; font-size: 15.5px; font-weight: 700; color: #0f172a; }
.fs-card-head span { display: block; margin-top: 2px; font-size: 12.5px; color: #64748b; }
.fs-chart-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr); gap: 16px; }
.fs-chart-wide { grid-column: 1 / -1; }
@media (max-width: 1100px) { .fs-chart-grid { grid-template-columns: minmax(0, 1fr); } }
.fs-empty { height: 100%; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 13px; font-weight: 500; }

.fs-donut-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; }
.fs-donut-value { font-family: 'Outfit', sans-serif; font-size: 28px; font-weight: 800; color: #0f172a; line-height: 1; }
.fs-donut-label { margin-top: 4px; font-size: 10.5px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; }
.fs-mix-legend { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; }
.fs-mix-item { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 10px; border: 1px solid transparent; background: #f8fafc; cursor: pointer; text-align: left; font-size: 12.5px; transition: all 0.15s; }
.fs-mix-item:hover { background: #f1f5f9; }
.fs-mix-item[data-active="true"] { background: #eef2ff; border-color: #c7d2fe; }
.fs-mix-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.fs-mix-name { font-weight: 700; color: #1e293b; }
.fs-mix-range { color: #94a3b8; font-size: 11px; }
.fs-mix-count { margin-left: auto; font-family: 'Outfit', sans-serif; font-weight: 800; color: #0f172a; }

.fs-table-card { display: flex; flex-direction: column; gap: 12px; padding: 16px 18px; }
.fs-filter-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.fs-search { position: relative; display: flex; align-items: center; color: #94a3b8; }
.fs-search svg { position: absolute; left: 11px; pointer-events: none; }
.fs-search input { height: 36px; width: 220px; padding: 0 30px 0 32px; border-radius: 10px; border: 1px solid #dbe2ea; font-size: 13px; font-weight: 500; color: #1e293b; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
.fs-search input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15); }
.fs-search-clear { position: absolute; right: 8px; border: none; background: none; color: #94a3b8; cursor: pointer; font-size: 12px; padding: 2px; }
.fs-search-clear:hover { color: #475569; }

.fs-chip-group { display: inline-flex; gap: 4px; padding: 3px; background: #f1f5f9; border-radius: 12px; flex-wrap: wrap; }
.fs-chip { height: 30px; display: inline-flex; align-items: center; gap: 6px; padding: 0 11px; border: none; border-radius: 9px; background: transparent; color: #475569; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: all 0.15s; }
.fs-chip:hover { color: #0f172a; background: rgba(255,255,255,0.6); }
.fs-chip[data-active="true"] { background: var(--chip-bg, #fff); color: var(--chip-text, #0f172a); box-shadow: 0 1px 3px rgba(15,23,42,0.1); font-weight: 700; }
.fs-chip-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--chip-dot); }
.fs-chip-count { min-width: 20px; padding: 1px 6px; border-radius: 999px; background: rgba(15,23,42,0.07); font-size: 11px; font-weight: 700; text-align: center; }
.fs-link-btn { border: none; background: none; color: #4f46e5; font-weight: 600; font-size: 12.5px; cursor: pointer; padding: 4px 6px; border-radius: 6px; }
.fs-link-btn:hover { background: #eef2ff; }

.fs-table-meta { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 12.5px; color: #64748b; }
.fs-table-meta strong { color: #0f172a; }
.fs-meta-sep { margin: 0 8px; color: #cbd5e1; }
.fs-legend { display: inline-flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.fs-legend-item { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; color: #475569; }
.fs-legend-item em { font-style: normal; color: #94a3b8; font-weight: 500; }
.fs-legend-swatch { width: 14px; height: 14px; border-radius: 4px; border: 1.5px solid; }

/* Vehicle summary table (sticky header, first columns and footer) */
.fleet-summary-scroll { max-height: min(620px, calc(100vh - 240px)); overflow: auto; border: 1px solid #e2e8f0; border-radius: 14px; position: relative; background: #fff; }
.fleet-summary-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
.fleet-summary-scroll::-webkit-scrollbar-track { background: #f8fafc; }
.fleet-summary-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.fleet-summary-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

.fleet-summary-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12.5px; background: #fff; }
.fleet-summary-table th { position: sticky; top: 0; z-index: 12; background: #f8fafc; color: #475569; border-bottom: 1px solid #e2e8f0; padding: 11px 6px; font-family: 'Outfit', sans-serif; font-size: 11.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; text-align: center; white-space: nowrap; user-select: none; cursor: pointer; transition: background 0.15s, color 0.15s; }
.fleet-summary-table th:hover { background: #eef2ff; color: #4338ca; }
.fleet-summary-table th[data-sorted="true"] { color: #4338ca; background: #eef2ff; }
.fleet-summary-table th[data-focus="true"] { background: #e0e7ff; color: #3730a3; }
.fleet-summary-table td { padding: 7px 4px; text-align: center; border-bottom: 1px solid #f1f5f9; color: #334155; transition: background 0.12s; }
.fleet-summary-table td[data-focus="true"] { background: #f5f7ff; }
.fleet-summary-table tbody tr:hover td { background: #f8faff; }
.fleet-summary-table tbody tr:hover td[data-focus="true"] { background: #eef2ff; }

.fleet-summary-table .col-sr { position: sticky; left: 0; z-index: 5; width: 44px; min-width: 44px; max-width: 44px; background: #fff; color: #94a3b8; font-weight: 600; font-size: 12px; }
.fleet-summary-table .col-vehicle { position: sticky; left: 44px; z-index: 5; width: 132px; min-width: 132px; text-align: left; padding-left: 12px; background: #fff; box-shadow: 1px 0 0 #e2e8f0, 4px 0 8px -4px rgba(15,23,42,0.08); }
.fleet-summary-table th.col-sr, .fleet-summary-table th.col-vehicle { z-index: 16; background: #f8fafc; }
.fleet-summary-table th.col-sr { cursor: default; }
.fleet-summary-table .col-total { width: 72px; min-width: 72px; font-family: 'Outfit', sans-serif; font-weight: 800; color: #0f172a; font-size: 13px; border-left: 1px solid #e2e8f0; }

.fs-vehicle-link { border: none; background: none; padding: 3px 8px; margin-left: -8px; border-radius: 7px; color: #4f46e5; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 13px; letter-spacing: 0.01em; cursor: pointer; white-space: nowrap; transition: background 0.15s; }
.fs-vehicle-link:hover { background: #eef2ff; color: #3730a3; }
.fs-heat { display: inline-block; min-width: 34px; padding: 3px 6px; border-radius: 7px; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 12.5px; }
.fs-heat-empty { color: #cbd5e1; font-weight: 500; }
.fs-no-rows { padding: 40px 12px !important; color: #94a3b8; font-size: 13.5px; }
.fs-no-rows div { margin-bottom: 6px; }

.fleet-summary-table tfoot { position: sticky; bottom: 0; z-index: 11; }
.fs-foot td { padding: 8px 4px; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 12.5px; background: #f8fafc; color: #475569; border-bottom: 1px solid #e2e8f0; }
.fs-foot:first-child td { border-top: 2px solid #cbd5e1; }
.fs-foot td.col-vehicle { font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 700; }
.fs-foot td.col-sr, .fs-foot td.col-vehicle { z-index: 14; }
.fs-foot[data-variant="total"] td { background: #eef2ff; color: #1e1b4b; font-weight: 800; }
.fs-foot[data-variant="srcc"] td { background: #ecfdf5; color: #047857; }
.fs-foot[data-variant="outsourced"] td { background: #fffbeb; color: #b45309; }

/* Vehicle monthly trend modal */
.fs-modal-backdrop { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(15,23,42,0.5); backdrop-filter: blur(6px); animation: fs-fade 0.15s ease-out; }
.fs-modal { width: 100%; max-width: 820px; max-height: 92vh; overflow-y: auto; background: #fff; border-radius: 22px; box-shadow: 0 30px 60px -12px rgba(15,23,42,0.35); animation: fs-pop 0.2s cubic-bezier(0.16,1,0.3,1); }
.fs-modal-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 22px 24px 18px; background: linear-gradient(135deg, #eef2ff 0%, #f5f3ff 60%, #fff 100%); border-bottom: 1px solid #e8edf3; position: sticky; top: 0; z-index: 2; }
.fs-modal-eyebrow { font-size: 11.5px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 0.07em; }
.fs-modal-title { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 4px; font-family: 'Outfit', sans-serif; font-size: 26px; font-weight: 800; color: #0f172a; letter-spacing: 0.01em; }
.fs-band-badge { font-family: 'Inter', sans-serif; font-size: 11.5px; font-weight: 700; padding: 4px 10px; border-radius: 999px; letter-spacing: 0.02em; }
.fs-modal-sub { display: block; margin-top: 4px; font-size: 12.5px; color: #64748b; }
.fs-modal-nav { display: flex; gap: 6px; }
.fs-icon-btn { width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; color: #475569; font-size: 16px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
.fs-icon-btn:not(:disabled):hover { background: #eef2ff; border-color: #c7d2fe; color: #4338ca; }
.fs-icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.fs-modal-body { padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 14px; }
.fs-modal-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 720px) { .fs-modal-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.fs-modal-kpi { display: flex; flex-direction: column; gap: 3px; padding: 12px 14px; border-radius: 14px; background: #f8fafc; border: 1px solid #eef2f7; }
.fs-modal-kpi-value { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.2; }
.fs-month-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; }
@media (max-width: 720px) { .fs-month-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
.fs-month-tile { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 6px; border-radius: 12px; background: var(--tile-bg); border: 1px solid #eef2f7; border-top: 3px solid var(--tile-accent); }
.fs-month-name { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
.fs-month-value { font-family: 'Outfit', sans-serif; font-size: 20px; font-weight: 800; line-height: 1.2; }
.fs-month-band { font-size: 10.5px; font-weight: 600; color: #94a3b8; }
@keyframes fs-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes fs-pop { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: none; } }
`;

// ─── Main Component ─────────────────────────────────────────────────────────────

const FleetUtilizationReport = ({
    filterType, selectedMonth, selectedYear, selectedQuarter, dateRange, selectedDay, selectedFinancialYear
}) => {
    const isSingleDay = filterType === 'day' || (filterType === 'custom' && dateRange?.start && dateRange?.end && dateRange.start === dateRange.end);

    // ── State ───────────────────────────────────────────────────────────────────
    const [reportData, setReportData] = useState({ totalFleet: 'NA', dispatch: [] });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');

    // Fleet Summary tab state
    const [fleetSummaryByFy, setFleetSummaryByFy] = useState({});
    const [fleetSummaryLoading, setFleetSummaryLoading] = useState(false);
    const [fleetSummaryError, setFleetSummaryError] = useState(null);
    const [fleetSearchQuery, setFleetSearchQuery] = useState('');
    const [fleetSortConfig, setFleetSortConfig] = useState({ key: 'total', direction: 'desc' });
    const [fleetBandFilter, setFleetBandFilter] = useState('all');
    const [fleetMonthFilter, setFleetMonthFilter] = useState('all');
    const [selectedVehicleTrend, setSelectedVehicleTrend] = useState(null);

    // Vehicle-summary columns follow the main Filter Period (day columns for Day/Week, month or FY columns otherwise)
    const isDailyPeriod = filterType === 'day' || filterType === 'week';
    const periodColumns = useMemo(() => {
        const { startDate, endDate } = getTransportDates(filterType, selectedDay, selectedYear, selectedMonth, selectedQuarter, dateRange);
        return buildPeriodColumns(startDate, endDate, filterType === 'day' || filterType === 'week');
    }, [filterType, selectedDay, selectedYear, selectedMonth, selectedQuarter, dateRange]);
    const periodFysKey = useMemo(
        () => [...new Set(periodColumns.flatMap(c => c.parts.map(p => p.fy)))].join(','),
        [periodColumns]
    );
    const periodColumnsKey = periodColumns.map(c => c.key).join('|');


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
    // The API returns one financial year per call, so fetch every FY the period touches
    const fetchFleetSummary = useCallback(async () => {
        const fys = periodFysKey ? periodFysKey.split(',').map(Number) : [];
        if (!fys.length) {
            setFleetSummaryByFy({});
            return;
        }
        setFleetSummaryLoading(true);
        setFleetSummaryError(null);
        try {
            const results = await Promise.all(fys.map(fy => axios.get(`${TRANSPORT_BASE}/api/vehicle-dsr/fleet-summary`, {
                params: { fyStartYear: fy, limit: 999999 },
                headers: TRANSPORT_HEADERS,
                withCredentials: true
            })));
            const byFy = {};
            results.forEach((res, i) => { byFy[fys[i]] = res.data?.data || res.data || null; });
            setFleetSummaryByFy(byFy);
        } catch (e) {
            setFleetSummaryError(e.message || "An error occurred");
        } finally {
            setFleetSummaryLoading(false);
        }
    }, [periodFysKey]);

    useEffect(() => {
        if (activeTab === 'fleet-summary' || activeTab === 'trend') {
            fetchFleetSummary();
        }
    }, [activeTab, fetchFleetSummary]);



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
                notOnRoad, notOnRoadPct: getPctStr(notOnRoad), notOnRoadColor: KPI_COLOR.notOnRoad(fleetSize > 0 ? (notOnRoad / fleetSize) * 100 : 0),
                breakdown, breakdownPct: getPctStr(breakdown), noDriver, noDriverPct: getPctStr(noDriver), noDriverColor: KPI_COLOR.noDriver(fleetSize > 0 ? (noDriver / fleetSize) * 100 : 0),
                onLeave, onLeavePct: getPctStr(onLeave), onLeaveColor: KPI_COLOR.driverOnLeave(fleetSize > 0 ? (onLeave / fleetSize) * 100 : 0), maint, maintPct: getPctStr(maint), maintColor: KPI_COLOR.maintenance(fleetSize > 0 ? (maint / fleetSize) * 100 : 0),
                accident, accidentPct: getPctStr(accident), accidentColor: KPI_COLOR.accident(fleetSize > 0 ? (accident / fleetSize) * 100 : 0),
                underDetention, underDetentionPct: getPctStr(underDetention),
                underTrip, underTripPct: getPctStr(underTrip),
                others, othersPct: getPctStr(others),
                otherStatusTotal, otherStatusTotalPct: getPctStr(otherStatusTotal),
                customCategoriesList, totalTrips, sumFS: fleetSize
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

            // We keep Fleet Size (sFS) as an average so it remains correct, 
            // but we leave the others as totals as requested by the user.
            sFS = Math.round(sFS / numDays);

            const sOthers = Object.values(rangeCC).reduce((a, b) => a + b, 0);
            const sOtherTotal = sUD + sOthers;

            // Calculate percentages based on sumFS (total vehicle days) to keep percentages correct
            const pct = (val) => sumFS <= 0 ? '' : `(${((val / sumFS) * 100).toFixed(0)}%)`;
            const orPct = sumFS > 0 ? (sOR / sumFS) * 100 : 0;

            const ccList = Object.entries(rangeCC).map(([label, count]) => ({
                label, value: count, extra: pct(count), color: '#64748b',
                gradient: 'linear-gradient(135deg, rgba(100,116,139,0.08) 0%, rgba(100,116,139,0.02) 100%)',
                border: '1px solid rgba(100,116,139,0.2)'
            }));

            return {
                fleetSize: sFS || 'NA', onRoadCount: sOR, onRoadPct: pct(sOR), onRoadColor: UTIL_COLOR(orPct),
                idleVal: sIdle, idlePct: pct(sIdle), idleColor: sIdle === 0 ? '#10b981' : '#f59e0b',
                notOnRoad: sNOR, notOnRoadPct: pct(sNOR), notOnRoadColor: KPI_COLOR.notOnRoad(sumFS > 0 ? (sNOR / sumFS) * 100 : 0),
                breakdown: sBrk, breakdownPct: pct(sBrk), noDriver: sND, noDriverPct: pct(sND), noDriverColor: KPI_COLOR.noDriver(sumFS > 0 ? (sND / sumFS) * 100 : 0),
                onLeave: sLv, onLeavePct: pct(sLv), onLeaveColor: KPI_COLOR.driverOnLeave(sumFS > 0 ? (sLv / sumFS) * 100 : 0), maint: sMt, maintPct: pct(sMt), maintColor: KPI_COLOR.maintenance(sumFS > 0 ? (sMt / sumFS) * 100 : 0),
                accident: sAcc, accidentPct: pct(sAcc), accidentColor: KPI_COLOR.accident(sumFS > 0 ? (sAcc / sumFS) * 100 : 0),
                underDetention: sUD, underDetentionPct: pct(sUD),
                underTrip: sUT, underTripPct: pct(sUT),
                others: sOthers, othersPct: pct(sOthers),
                otherStatusTotal: sOtherTotal, otherStatusTotalPct: pct(sOtherTotal),
                customCategoriesList: ccList, totalTrips, sumFS: sumFS
            };
        }
    }, [fleetStatusList, closedLRsList, totalFleetNum, filterType, dailyData]);

    // ── KPI Metrics (Avg Trips/Day, Projections) ────────────────────────────────

    const kpiMetricsObj = useMemo(() => {
        const { elapsedDays, totalDays } = computeElapsedDays(filterType, selectedYear, selectedMonth, selectedQuarter, dateRange, dailyData.length, selectedDay);
        const totalTrips = closedLRsList.length;
        const mundraTrips = closedLRsList.filter(r => (r.branch || '').toLowerCase().includes('mundra')).length;
        const avgTripsPerDay = elapsedDays > 0 ? totalTrips / elapsedDays : 0;
        const periodTotalDays = totalDays || 30;

        let projAll = 0, projMundra = 0;
        if (elapsedDays > 0) {
            const branchCounts = {};
            closedLRsList.forEach(r => { const br = r.branch || 'Unknown'; branchCounts[br] = (branchCounts[br] || 0) + 1; });
            let rawProjAll = 0, rawProjMundra = 0;
            Object.entries(branchCounts).forEach(([br, count]) => {
                const proj = (count / elapsedDays) * periodTotalDays;
                rawProjAll += proj;
                if (br.toLowerCase().includes('mundra')) rawProjMundra += proj;
            });
            projAll = Math.round(rawProjAll);
            projMundra = Math.round(rawProjMundra);
        }

        const avgPerf = comparisonData.prevAvgTrips > 0 ? (avgTripsPerDay / comparisonData.prevAvgTrips) * 100 : 100;
        const projAllPerf = comparisonData.prevTotalTrips > 0 ? (projAll / comparisonData.prevTotalTrips) * 100 : 100;
        const projMundraPerf = comparisonData.prevMundraTrips > 0 ? (projMundra / comparisonData.prevMundraTrips) * 100 : 100;

        return {
            avgTripsPerDay: Math.round(avgTripsPerDay),
            rawAvgTripsPerDay: avgTripsPerDay > 0 ? avgTripsPerDay.toFixed(2) : '0',
            projectionAllPorts: projAll,
            projectionMundra: projMundra,
            avgTripsTheme: getColorTheme(avgPerf),
            projectionAllTheme: getColorTheme(projAllPerf),
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
        const { elapsedDays, totalDays } = computeElapsedDays(filterType, selectedYear, selectedMonth, selectedQuarter, dateRange, dailyData.length, selectedDay);
        const periodTotalDays = totalDays || 30;

        let g20 = 0, go20 = 0, gh20 = 0, g40 = 0, go40 = 0, gh40 = 0, gO = 0, goO = 0, ghO = 0, gT = 0, rawAvg = 0, rawProj = 0;
        list.forEach(b => {
            const avg = elapsedDays > 0 ? b.total / elapsedDays : 0;
            b.avgTripsPerDay = Math.round(avg);
            b.projection = Math.round(avg * periodTotalDays);
            rawAvg += avg; rawProj += avg * periodTotalDays;
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

    const getVehicleNo = useCallback((row) => {
        if (!row) return '—';
        return row.vehicleNo || row.vehicle_no || row.vehicleNumber || row.truckNo || '—';
    }, []);

    const getVehicleMonthVal = useCallback((row, m) => {
        if (!row) return 0;
        const keys = [
            m.key,
            Number(m.key),
            String(m.key).padStart(2, '0'),
            m.name,
            m.name ? m.name.toLowerCase() : '',
            m.name ? m.name.toUpperCase() : '',
            m.label
        ];

        if (row.months && typeof row.months === 'object' && !Array.isArray(row.months)) {
            for (const k of keys) {
                if (row.months[k] !== undefined && row.months[k] !== null && row.months[k] !== '') {
                    const n = Number(row.months[k]);
                    if (!isNaN(n)) return n;
                }
            }
        }

        if (Array.isArray(row.months)) {
            const valByFiscal = row.months[MONTH_NAMES.findIndex(x => x.key === m.key)];
            if (valByFiscal !== undefined && valByFiscal !== null) {
                return Number(valByFiscal) || 0;
            }
            const valByCal = row.months[Number(m.key) - 1];
            if (valByCal !== undefined && valByCal !== null) {
                return Number(valByCal) || 0;
            }
        }

        for (const k of keys) {
            if (row[k] !== undefined && row[k] !== null && row[k] !== '') {
                const n = Number(row[k]);
                if (!isNaN(n)) return n;
            }
        }

        return 0;
    }, []);

    /**
     * One merged row per vehicle:
     * - Day/Week: { vehicleNo, byDay: { 'yyyy-MM-dd': ownTrips } } built from the dashboard's dispatch data
     * - otherwise: { vehicleNo, byFy: { [fyStartYear]: apiRow } } from the fleet-summary API
     */
    const rawSummaryRows = useMemo(() => {
        const map = new Map();
        if (isDailyPeriod) {
            const ensure = (vehicleNo) => {
                const key = normalizeVehicleNo(vehicleNo);
                if (!key) return null;
                if (!map.has(key)) map.set(key, { vehicleNo, byDay: {} });
                return map.get(key);
            };
            fleetStatusList.forEach(v => ensure(v.vehicleNumber));
            dispatches.forEach(d => {
                const date = d.date ? d.date.slice(0, 10) : null;
                if (!date) return;
                deduplicateArray(d.closedLRs || [], getLRKey).forEach(lr => {
                    if (String(lr.own_hired || '').toLowerCase().trim() !== 'own') return;
                    const row = ensure(lr.vehicle_no);
                    if (row) row.byDay[date] = (row.byDay[date] || 0) + 1;
                });
            });
            return [...map.values()];
        }
        const fys = periodFysKey ? periodFysKey.split(',').map(Number) : [];
        fys.forEach(fy => {
            extractSummaryRows(fleetSummaryByFy[fy]).forEach(r => {
                const vehicleNo = getVehicleNo(r);
                const key = normalizeVehicleNo(vehicleNo) || vehicleNo;
                if (!map.has(key)) map.set(key, { vehicleNo, byFy: {} });
                map.get(key).byFy[fy] = r;
            });
        });
        return [...map.values()];
    }, [isDailyPeriod, fleetStatusList, dispatches, fleetSummaryByFy, periodFysKey, getVehicleNo]);

    const getColumnVal = useCallback((row, col) => {
        if (col.date) return row?.byDay?.[col.date] || 0;
        return col.parts.reduce((sum, p) => sum + getVehicleMonthVal(row?.byFy?.[p.fy], p.m), 0);
    }, [getVehicleMonthVal]);

    const getVehicleTotal = useCallback((row) => (
        periodColumns.reduce((sum, col) => sum + getColumnVal(row, col), 0)
    ), [periodColumns, getColumnVal]);

    const isFyColumns = periodColumns.some(c => c.key.startsWith('fy-'));
    const periodLabel = periodColumns.length === 0
        ? '—'
        : periodColumns.length === 1
            ? periodColumns[0].fullLabel
            : `${periodColumns[0].fullLabel} – ${periodColumns[periodColumns.length - 1].fullLabel}`;

    const periodUnit = isDailyPeriod ? 'day' : isFyColumns ? 'year' : 'month';
    const periodAdjective = { day: 'Daily', month: 'Monthly', year: 'Yearly' }[periodUnit];

    const periodElapsedMonths = useMemo(() => {
        const elapsed = periodColumns.reduce((sum, c) => {
            if (c.date) return sum + (c.future ? 0 : 1 / DAYS_PER_MONTH);
            return sum + c.parts.filter(p => !p.future).length;
        }, 0);
        return Math.max(isDailyPeriod ? 1 / DAYS_PER_MONTH : 1, elapsed);
    }, [periodColumns, isDailyPeriod]);

    const focusColumn = useMemo(() => periodColumns.find(c => c.key === fleetMonthFilter) || null, [periodColumns, fleetMonthFilter]);

    // Value used to place a vehicle in a High/Medium/Low/Idle band (average trips per month)
    const getRowBandValue = useCallback((row) => {
        if (focusColumn) return getColumnVal(row, focusColumn) / getColumnElapsed(focusColumn);
        return getVehicleTotal(row) / periodElapsedMonths;
    }, [focusColumn, getColumnVal, getVehicleTotal, periodElapsedMonths]);

    const searchedSummaryRows = useMemo(() => {
        const q = fleetSearchQuery.toLowerCase().trim();
        if (!q) return rawSummaryRows;
        return rawSummaryRows.filter(r => String(getVehicleNo(r)).toLowerCase().includes(q));
    }, [rawSummaryRows, fleetSearchQuery, getVehicleNo]);

    const fleetBandCounts = useMemo(() => {
        const counts = { all: searchedSummaryRows.length, high: 0, medium: 0, low: 0, idle: 0 };
        searchedSummaryRows.forEach(r => { counts[getHeatBand(getRowBandValue(r)).key] += 1; });
        return counts;
    }, [searchedSummaryRows, getRowBandValue]);

    const filteredSummaryRows = useMemo(() => {
        if (!searchedSummaryRows.length) return [];
        const result = fleetBandFilter === 'all'
            ? [...searchedSummaryRows]
            : searchedSummaryRows.filter(r => getHeatBand(getRowBandValue(r)).key === fleetBandFilter);
        if (fleetSortConfig.key) {
            result.sort((a, b) => {
                if (fleetSortConfig.key === 'vehicleNo') {
                    const av = getVehicleNo(a);
                    const bv = getVehicleNo(b);
                    return fleetSortConfig.direction === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
                }
                if (fleetSortConfig.key === 'total') {
                    const av = getVehicleTotal(a), bv = getVehicleTotal(b);
                    return fleetSortConfig.direction === 'asc' ? av - bv : bv - av;
                }
                const col = periodColumns.find(c => c.key === fleetSortConfig.key);
                const av = col ? getColumnVal(a, col) : 0;
                const bv = col ? getColumnVal(b, col) : 0;
                return fleetSortConfig.direction === 'asc' ? av - bv : bv - av;
            });
        }
        return result;
    }, [searchedSummaryRows, fleetBandFilter, getRowBandValue, fleetSortConfig, periodColumns, getVehicleNo, getVehicleTotal, getColumnVal]);

    const requestFleetSort = useCallback((key) => {
        setFleetSortConfig(prev => {
            let direction = 'desc';
            if (prev.key === key && prev.direction === 'desc') {
                direction = 'asc';
            }
            return { key, direction };
        });
    }, []);

    const sortIndicator = (key) => (fleetSortConfig.key === key ? (fleetSortConfig.direction === 'asc' ? ' ▲' : ' ▼') : '');

    const handleFleetMonthFilter = useCallback((key) => {
        setFleetMonthFilter(key);
        setFleetSortConfig(key === 'all' ? { key: 'total', direction: 'desc' } : { key, direction: 'desc' });
    }, []);

    const hasFleetFilters = Boolean(fleetSearchQuery) || fleetBandFilter !== 'all' || fleetMonthFilter !== 'all';

    const clearFleetFilters = useCallback(() => {
        setFleetSearchQuery('');
        setFleetBandFilter('all');
        handleFleetMonthFilter('all');
    }, [handleFleetMonthFilter]);

    // A focused month may not exist once the main Filter Period changes
    useEffect(() => {
        handleFleetMonthFilter('all');
    }, [periodColumnsKey, handleFleetMonthFilter]);

    const fleetAggregates = useMemo(() => {
        const rows = rawSummaryRows;
        const pct = (part, whole) => (whole > 0 ? ((part / whole) * 100).toFixed(2) + '%' : '0.00%');

        // Outsourced counts come from the API when present, else from the dashboard's daily data
        const outsourcedForPart = (p) => {
            const fromApi = getOutsourcedFromPayload(fleetSummaryByFy[p.fy], p.m);
            if (fromApi !== null) return fromApi;
            if (!Array.isArray(dailyData)) return 0;
            return dailyData.reduce((count, d) => {
                const dt = d.date ? new Date(d.date) : null;
                if (dt && !isNaN(dt.getTime()) && dt.getFullYear() === p.year && String(dt.getMonth() + 1) === p.m.key) {
                    return count + Number(d.outsourcedTotal || d.hiredTrips || 0);
                }
                return count;
            }, 0);
        };

        const         srccMonths = {}, outsourcedMonths = {}, grandMonths = {}, srccUtilMonths = {}, outsourcedUtilMonths = {};
        const hiredByDate = new Map((dailyData || []).map(d => [d.dateStr, Number(d.hiredTrips || 0)]));
        periodColumns.forEach(col => {
            srccMonths[col.key] = rows.reduce((sum, r) => sum + getColumnVal(r, col), 0);
            outsourcedMonths[col.key] = col.date
                ? (hiredByDate.get(col.date) || 0)
                : col.parts.reduce((sum, p) => sum + outsourcedForPart(p), 0);
            grandMonths[col.key] = srccMonths[col.key] + outsourcedMonths[col.key];
            srccUtilMonths[col.key] = pct(srccMonths[col.key], grandMonths[col.key]);
            outsourcedUtilMonths[col.key] = pct(outsourcedMonths[col.key], grandMonths[col.key]);
        });
        const srccTotal = Object.values(srccMonths).reduce((a, b) => a + b, 0);
        const outsourcedTotal = Object.values(outsourcedMonths).reduce((a, b) => a + b, 0);
        const grandTotal = srccTotal + outsourcedTotal;

        return {
            srccMonths, srccTotal,
            outsourcedMonths, outsourcedTotal,
            grandMonths, grandTotal,
            srccUtilMonths, srccUtilTotal: pct(srccTotal, grandTotal),
            outsourcedUtilMonths, outsourcedUtilTotal: pct(outsourcedTotal, grandTotal)
        };
    }, [rawSummaryRows, periodColumns, fleetSummaryByFy, dailyData, getColumnVal]);

    const fleetSummaryKpis = useMemo(() => {
        const totalVehicles = rawSummaryRows.length;
        const srccTrips = fleetAggregates.srccTotal;
        return {
            totalVehicles,
            activeVehicles: rawSummaryRows.filter(r => getVehicleTotal(r) > 0).length,
            srccTrips,
            outsourcedTrips: fleetAggregates.outsourcedTotal,
            avgPerVehicleMonth: totalVehicles ? srccTrips / (totalVehicles * periodElapsedMonths) : 0
        };
    }, [rawSummaryRows, fleetAggregates, getVehicleTotal, periodElapsedMonths]);

    const monthlyMixData = useMemo(() => {
        if (!rawSummaryRows.length) return [];
        return periodColumns.filter(c => !c.future).map(col => {
            const srcc = fleetAggregates.srccMonths[col.key] || 0;
            const outsourced = fleetAggregates.outsourcedMonths[col.key] || 0;
            const total = srcc + outsourced;
            return { month: col.label, srcc, outsourced, share: total > 0 ? Number(((srcc / total) * 100).toFixed(1)) : 0 };
        });
    }, [rawSummaryRows.length, periodColumns, fleetAggregates]);

    const bandMixData = useMemo(() => (
        HEAT_BANDS
            .map(b => ({ key: b.key, name: b.label, value: fleetBandCounts[b.key], fill: b.solid }))
            .filter(d => d.value > 0)
    ), [fleetBandCounts]);

    const topVehiclesData = useMemo(() => (
        filteredSummaryRows
            .map(row => ({ row, vehicle: getVehicleNo(row), trips: focusColumn ? getColumnVal(row, focusColumn) : getVehicleTotal(row), band: getRowBandValue(row) }))
            .filter(d => d.trips > 0)
            .sort((a, b) => b.trips - a.trips)
            .slice(0, 10)
            .map(({ band, ...d }) => ({ ...d, fill: getHeatBand(band).solid }))
    ), [filteredSummaryRows, focusColumn, getVehicleNo, getColumnVal, getVehicleTotal, getRowBandValue]);

    const fleetRankMap = useMemo(() => {
        const map = new Map();
        [...rawSummaryRows]
            .sort((a, b) => getVehicleTotal(b) - getVehicleTotal(a))
            .forEach((r, i) => map.set(r, i + 1));
        return map;
    }, [rawSummaryRows, getVehicleTotal]);

    const selectedVehicleStats = useMemo(() => {
        if (!selectedVehicleTrend) return null;
        const row = selectedVehicleTrend;
        const total = getVehicleTotal(row);
        const fleetCount = rawSummaryRows.length || 1;
        const chartData = periodColumns.map(col => {
            const future = col.future;
            const trips = getColumnVal(row, col);
            return {
                key: col.key,
                month: col.label,
                future,
                trips: future && trips === 0 ? null : trips,
                fleetAvg: future ? null : Number(((fleetAggregates.srccMonths[col.key] || 0) / fleetCount).toFixed(1)),
                band: getHeatBand(trips / getColumnElapsed(col))
            };
        });
        const elapsed = chartData.filter(d => !d.future);
        const activeMonths = elapsed.filter(d => d.trips > 0).length;
        const best = chartData.reduce((acc, d) => ((d.trips || 0) > (acc ? acc.trips : 0) ? d : acc), null);
        const avg = total / periodElapsedMonths;
        const fleetAvg = fleetSummaryKpis.avgPerVehicleMonth;
        const index = filteredSummaryRows.indexOf(row);
        return {
            vehicleNo: getVehicleNo(row),
            total,
            chartData,
            activeMonths,
            elapsedColumns: elapsed.length,
            idleMonths: elapsed.length - activeMonths,
            best,
            avg,
            deltaPct: fleetAvg > 0 ? ((avg - fleetAvg) / fleetAvg) * 100 : null,
            band: getHeatBand(avg),
            rank: fleetRankMap.get(row) || '—',
            fleetCount: rawSummaryRows.length,
            shareOfFleet: fleetAggregates.srccTotal > 0 ? ((total / fleetAggregates.srccTotal) * 100).toFixed(1) : '0.0',
            hasPrev: index > 0,
            hasNext: index >= 0 && index < filteredSummaryRows.length - 1
        };
    }, [selectedVehicleTrend, rawSummaryRows.length, filteredSummaryRows, fleetAggregates, fleetSummaryKpis, fleetRankMap, periodColumns, periodElapsedMonths, getVehicleNo, getVehicleTotal, getColumnVal]);

    const navigateVehicle = useCallback((dir) => {
        const index = filteredSummaryRows.indexOf(selectedVehicleTrend);
        const next = filteredSummaryRows[index + dir];
        if (index >= 0 && next) setSelectedVehicleTrend(next);
    }, [filteredSummaryRows, selectedVehicleTrend]);

    useEffect(() => {
        if (!selectedVehicleTrend) return undefined;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') setSelectedVehicleTrend(null);
            else if (e.key === 'ArrowLeft') navigateVehicle(-1);
            else if (e.key === 'ArrowRight') navigateVehicle(1);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectedVehicleTrend, navigateVehicle]);

    const getCellHeatmapStyle = (value) => {
        const band = getHeatBand(value);
        if (band.key === 'idle') return { backgroundColor: '#ffffff', color: band.text, fontWeight: 500 };
        return { backgroundColor: band.bg, color: band.text, fontWeight: 700 };
    };

    const exportFleetSummaryExcel = async () => {
        if (!filteredSummaryRows.length) {
            alert("No fleet summary data available to export.");
            return;
        }
        try {
            const ExcelJS = await import('exceljs');
            const { saveAs } = await import('file-saver');
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Exim Application';
            const ws = workbook.addWorksheet('Vehicle Monthly Summary');

            const fyLabel = periodLabel;

            ws.addRow([`Vehicle Monthly Trip Summary (${fyLabel})`]);
            ws.mergeCells(1, 1, 1, periodColumns.length + 3);
            const titleRow = ws.getRow(1);
            titleRow.height = 32;
            titleRow.getCell(1).font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
            titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
            titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
            ws.addRow([]);

            const headers = ['Sr. No', 'Vehicle No', ...periodColumns.map(m => m.label.toUpperCase()), 'TOTAL'];
            ws.addRow(headers);
            const headerRow = ws.getRow(3);
            headerRow.height = 26;
            headerRow.eachCell(cell => {
                cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF334155' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            filteredSummaryRows.forEach((r, idx) => {
                const rowValues = [
                    idx + 1,
                    getVehicleNo(r),
                    ...periodColumns.map(m => getColumnVal(r, m)),
                    getVehicleTotal(r)
                ];
                ws.addRow(rowValues);
                const excelRow = ws.getRow(4 + idx);
                excelRow.height = 22;

                excelRow.eachCell((cell, colNum) => {
                    cell.font = { name: 'Arial', size: 10, color: { argb: 'FF1E293B' } };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                    };
                    cell.alignment = { horizontal: colNum === 2 ? 'left' : 'center', vertical: 'middle' };

                    if (colNum >= 3 && colNum <= periodColumns.length + 2) {
                        const band = getHeatBand((Number(cell.value) || 0) / getColumnElapsed(periodColumns[colNum - 3]));
                        cell.font = { name: 'Arial', size: 10, bold: band.key !== 'idle', color: { argb: band.xlText } };
                        if (band.key !== 'idle') {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: band.xlBg } };
                        }
                    } else if (colNum === periodColumns.length + 3) {
                        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
                    }
                });
            });

            const currentRIndex = 4 + filteredSummaryRows.length;
            const summaryRowsDefs = [
                {
                    label: 'SRCC vehicles',
                    values: periodColumns.map(m => fleetAggregates.srccMonths[m.key]),
                    total: fleetAggregates.srccTotal,
                    color: 'FF475569',
                    bold: true
                },
                {
                    label: 'Outsourced',
                    values: periodColumns.map(m => fleetAggregates.outsourcedMonths[m.key]),
                    total: fleetAggregates.outsourcedTotal,
                    color: 'FF475569',
                    bold: true
                },
                {
                    label: 'TOTAL',
                    values: periodColumns.map(m => fleetAggregates.grandMonths[m.key]),
                    total: fleetAggregates.grandTotal,
                    color: 'FF0F172A',
                    bold: true
                },
                {
                    label: 'SRCC Utilization',
                    values: periodColumns.map(m => fleetAggregates.srccUtilMonths[m.key]),
                    total: fleetAggregates.srccUtilTotal,
                    color: 'FF16A34A',
                    bold: true
                },
                {
                    label: 'Outsourced Utilization',
                    values: periodColumns.map(m => fleetAggregates.outsourcedUtilMonths[m.key]),
                    total: fleetAggregates.outsourcedUtilTotal,
                    color: 'FFEA580C',
                    bold: true
                }
            ];

            summaryRowsDefs.forEach((sRow, sIdx) => {
                ws.addRow(['', sRow.label, ...sRow.values, sRow.total]);
                const row = ws.getRow(currentRIndex + sIdx);
                row.height = 24;
                row.eachCell((cell, colNum) => {
                    cell.font = { name: 'Arial', size: 10.5, bold: sRow.bold, color: { argb: sRow.color } };
                    cell.border = {
                        top: { style: sIdx === 0 ? 'medium' : 'thin', color: { argb: 'FFCBD5E1' } },
                        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                    };
                    cell.alignment = { horizontal: colNum === 2 ? 'left' : 'center', vertical: 'middle' };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                });
            });

            ws.columns.forEach((col, idx) => {
                col.width = idx === 0 ? 8 : (idx === 1 ? 18 : 10);
            });

            const buffer = await workbook.xlsx.writeBuffer();
            saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `Vehicle_Monthly_Trip_Summary_${fyLabel.replace(/\s+/g, '_')}.xlsx`);
        } catch (error) {
            console.error("Failed to export summary Excel:", error);
            alert("An error occurred while exporting summary data to Excel.");
        }
    };

    const exportFleetSummaryPdf = () => {
        if (!filteredSummaryRows.length) {
            alert("No fleet summary data available to export.");
            return;
        }
        const fyLabel = periodLabel;
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            window.print();
            return;
        }

        const rowsHtml = filteredSummaryRows.map((r, idx) => `
            <tr>
                <td style="text-align:center;font-weight:600;color:#64748b;padding:6px;">${idx + 1}</td>
                <td style="text-align:left;font-weight:700;color:#2563eb;padding:6px 10px;">${getVehicleNo(r)}</td>
                ${periodColumns.map(m => {
            const val = getColumnVal(r, m);
            const style = getCellHeatmapStyle(val / getColumnElapsed(m));
            return `<td style="text-align:center;padding:6px;background-color:${style.backgroundColor};color:${style.color};font-weight:${style.fontWeight};">${val}</td>`;
        }).join('')}
                <td style="text-align:center;font-weight:800;color:#0f172a;padding:6px;">${getVehicleTotal(r)}</td>
            </tr>
        `).join('');

        const summaryRowsHtml = `
            <tr style="border-top:2px solid #cbd5e1;font-weight:700;color:#475569;">
                <td></td><td style="text-align:left;padding:8px 10px;">SRCC vehicles</td>
                ${periodColumns.map(m => `<td style="text-align:center;padding:8px 6px;">${fleetAggregates.srccMonths[m.key]}</td>`).join('')}
                <td style="text-align:center;font-weight:800;color:#0f172a;">${fleetAggregates.srccTotal}</td>
            </tr>
            <tr style="font-weight:700;color:#475569;">
                <td></td><td style="text-align:left;padding:8px 10px;">Outsourced</td>
                ${periodColumns.map(m => `<td style="text-align:center;padding:8px 6px;">${fleetAggregates.outsourcedMonths[m.key]}</td>`).join('')}
                <td style="text-align:center;font-weight:800;color:#0f172a;">${fleetAggregates.outsourcedTotal}</td>
            </tr>
            <tr style="font-weight:800;color:#0f172a;">
                <td></td><td style="text-align:left;padding:8px 10px;">TOTAL</td>
                ${periodColumns.map(m => `<td style="text-align:center;padding:8px 6px;">${fleetAggregates.grandMonths[m.key]}</td>`).join('')}
                <td style="text-align:center;font-weight:900;">${fleetAggregates.grandTotal}</td>
            </tr>
            <tr style="font-weight:800;color:#16a34a;">
                <td></td><td style="text-align:left;padding:8px 10px;">SRCC Utilization</td>
                ${periodColumns.map(m => `<td style="text-align:center;padding:8px 6px;">${fleetAggregates.srccUtilMonths[m.key]}</td>`).join('')}
                <td style="text-align:center;font-weight:900;">${fleetAggregates.srccUtilTotal}</td>
            </tr>
            <tr style="font-weight:800;color:#ea580c;">
                <td></td><td style="text-align:left;padding:8px 10px;">Outsourced Utilization</td>
                ${periodColumns.map(m => `<td style="text-align:center;padding:8px 6px;">${fleetAggregates.outsourcedUtilMonths[m.key]}</td>`).join('')}
                <td style="text-align:center;font-weight:900;">${fleetAggregates.outsourcedUtilTotal}</td>
            </tr>
        `;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Vehicle Monthly Trip Summary - ${fyLabel}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; }
                    h2 { margin: 0 0 16px 0; font-size: 18px; color: #0f172a; }
                    table { width: 100%; border-collapse: collapse; font-size: 11px; }
                    th, td { border: 1px solid #cbd5e1; }
                    th { background: #f1f5f9; padding: 8px 4px; font-weight: 700; text-align: center; font-size: 11px; }
                    @media print {
                        body { padding: 0; }
                        @page { size: landscape; margin: 10mm; }
                    }
                </style>
            </head>
            <body>
                <h2>Vehicle Monthly Trip Summary — ${fyLabel}</h2>
                <table>
                    <thead>
                        <tr>
                            <th style="width:40px;">Sr.<br/>No</th>
                            <th style="width:120px;text-align:left;padding-left:10px;">Vehicle No</th>
                            ${periodColumns.map(m => `<th>${m.label.toUpperCase()}</th>`).join('')}
                            <th style="width:60px;">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                        ${summaryRowsHtml}
                    </tbody>
                </table>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 400);
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

    const KpiCard = ({ label, subtext, value, originalValue, extra, color, gradient, border, badgeBg, large, accentColor, hl, hlBlue }) => {
        const defaultAccent = accentColor || color || '#cbd5e1';
        const isHl = hl || hlBlue;
        const textColor = hl ? '#991b1b' : hlBlue ? '#1e40af' : '#64748b';
        const valColor = hl ? '#991b1b' : hlBlue ? '#1e40af' : '#0f172a';

        // Parse percentage from extra (e.g., "49%" or "(49%)")
        let pct = null;
        if (!badgeBg) {
            if (extra && typeof extra === 'string') {
                const match = extra.match(/(\d+)%/);
                if (match) {
                    pct = parseFloat(match[1]);
                }
            } else if (typeof extra === 'number') {
                pct = extra;
            }
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
                        {originalValue !== undefined && originalValue !== null && originalValue !== '' && (
                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }} className="mono">
                                ({originalValue})
                            </span>
                        )}
                        {extra && !badgeBg && pct === null && <span style={{ fontSize: '15px', fontWeight: 700, color: color }}>{extra}</span>}
                    </div>
                    {extra && badgeBg && (
                        <div style={{ display: 'inline-flex', padding: '6px 12px', borderRadius: '8px', background: badgeBg, color: color, fontWeight: 700, fontSize: '12.5px', width: 'fit-content' }}>{extra}</div>
                    )}
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
    const denomFS = metrics.sumFS > 0 ? metrics.sumFS : metrics.fleetSize;
    const todayOnRoadPct = denomFS > 0 ? `(${((todayOnRoadCount / denomFS) * 100).toFixed(0)}%)` : '';
    const SubBadge = ({ text }) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)', padding: '3px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, color: 'inherit', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
            {text}
        </span>
    );

    const onRoadParts = [];
    if (metrics.underTrip > 0) onRoadParts.push(`Under Trip: ${metrics.underTrip} ${metrics.underTripPct}`);
    if (metrics.underDetention > 0) onRoadParts.push(`Under Detention: ${metrics.underDetention} ${metrics.underDetentionPct}`);
    // "Today On Road" logic removed as requested by user
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

            {/* ── Header Area (Tabs + Legend) ─────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
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

                <div className="kpi-info-wrap">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.6)', cursor: 'pointer', boxShadow: '0 4px 24px rgba(0,0,0,0.03)', width: '36px', height: '36px' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                    </div>
                    <div className="kpi-info-tip" style={{ width: '340px', bottom: 'auto', top: '100%', right: '0', transform: 'translateY(-10px)' }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>KPI Legend (Utilization)</div>
                        <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ color: '#475569', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                                    <th style={{ padding: '6px 0', fontWeight: 700 }}>Metric</th>
                                    <th style={{ color: '#10b981', padding: '6px 0', fontWeight: 700 }}>Green</th>
                                    <th style={{ color: '#f59e0b', padding: '6px 0', fontWeight: 700 }}>Yellow</th>
                                    <th style={{ color: '#ef4444', padding: '6px 0', fontWeight: 700 }}>Red</th>
                                </tr>
                            </thead>
                            <tbody style={{ color: '#64748b', fontWeight: 600 }}>
                                <tr><td style={{ padding: '4px 0' }}>On Road Own</td><td>≥90%</td><td>80-89%</td><td>&lt;80%</td></tr>
                                <tr><td style={{ padding: '4px 0' }}>Not on Road</td><td>≤10%</td><td>10-20%</td><td>&gt;20%</td></tr>
                                <tr><td style={{ padding: '4px 0' }}>Maintenance</td><td>≤3%</td><td>3-5%</td><td>&gt;5%</td></tr>
                                <tr><td style={{ padding: '4px 0' }}>Accident</td><td>0-1%</td><td>1-3%</td><td>&gt;3%</td></tr>
                                <tr><td style={{ padding: '4px 0' }}>No Driver</td><td>≤2%</td><td>2-5%</td><td>&gt;5%</td></tr>
                                <tr><td style={{ padding: '4px 0' }}>Driver on Leave</td><td>≤5%</td><td>5-10%</td><td>&gt;10%</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
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
                                    { label: 'Average Trips Per Day', value: kpiMetricsObj.avgTripsPerDay, originalValue: kpiMetricsObj.rawAvgTripsPerDay, ...kpiMetricsObj.avgTripsTheme, extra: kpiMetricsObj.avgTripsTheme.performanceLabel },
                                    { label: 'Projection Trips – All Ports', value: kpiMetricsObj.projectionAllPorts, ...kpiMetricsObj.projectionAllTheme, extra: kpiMetricsObj.projectionAllTheme.performanceLabel },
                                    { label: 'Projection Trips – Mundra', value: kpiMetricsObj.projectionMundra, ...kpiMetricsObj.projectionMundraTheme, extra: kpiMetricsObj.projectionMundraTheme.performanceLabel }
                                ].map((m, i) => <KpiCard key={i} large {...m} gradient={m.bg} />)}
                            </div>
                        </div>
                    )}

                    {/* Row 3: Not-on-Road breakdown cards */}
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '24px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>⚠️</span> Vehicle Not On Road Breakdown
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        {[
                            { label: 'Vehicle Not on Road', subtext: notOnRoadSubtext, value: `${metrics.notOnRoad}`, extra: metrics.notOnRoadPct, color: metrics.notOnRoadColor, accentColor: metrics.notOnRoadColor, large: true, gradient: `linear-gradient(135deg, ${metrics.notOnRoadColor}22 0%, transparent 100%)`, border: `1px solid ${metrics.notOnRoadColor}33`, hl: metrics.notOnRoadColor === '#ef4444' },
                            { label: 'No Driver', value: `${metrics.noDriver}`, extra: metrics.noDriverPct, color: metrics.noDriverColor, accentColor: metrics.noDriverColor, hl: metrics.noDriverColor === '#ef4444' },
                            { label: 'Driver On Leave', value: `${metrics.onLeave}`, extra: metrics.onLeavePct, color: metrics.onLeaveColor, accentColor: metrics.onLeaveColor, hl: metrics.onLeaveColor === '#ef4444' },
                            { label: 'Maintenance', value: `${metrics.maint}`, extra: metrics.maintPct, color: metrics.maintColor, accentColor: metrics.maintColor, hl: metrics.maintColor === '#ef4444' },
                            { label: 'Accidents', value: `${metrics.accident}`, extra: metrics.accidentPct, color: metrics.accidentColor, accentColor: metrics.accidentColor, hl: metrics.accidentColor === '#ef4444' }
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

                    {/* ── Vehicle Trip Summary (Financial Year) ── */}
                    <div className="fs-section">
                        <div className="fs-section-head">
                            <div>
                                <h3 className="fs-title">Vehicle Trip Summary</h3>
                                <span className="fs-subtitle">
                                    {periodAdjective === 'Daily' ? 'Day-wise' : periodAdjective === 'Yearly' ? 'Year-wise' : 'Month-wise'} trips for every vehicle · {periodLabel}
                                    {isDailyPeriod && ' · bands use trips per day × 30'}
                                </span>
                            </div>
                            <div className="fs-actions">
                                <button className="fs-btn fs-btn-primary" onClick={() => fetchFleetSummary()} disabled={fleetSummaryLoading}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: fleetSummaryLoading ? 'fleet-spin 0.8s linear infinite' : 'none' }}>
                                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                                    </svg>
                                    Refresh
                                </button>
                                <button className="fs-btn fs-btn-excel" onClick={exportFleetSummaryExcel}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="8" y1="13" x2="16" y2="13" />
                                        <line x1="8" y1="17" x2="16" y2="17" />
                                    </svg>
                                    Excel
                                </button>
                                <button className="fs-btn fs-btn-pdf" onClick={exportFleetSummaryPdf}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <path d="M9 15h3a1.5 1.5 0 0 0 0-3H9v6" />
                                    </svg>
                                    PDF
                                </button>
                            </div>
                        </div>

                        {fleetSummaryError && !fleetSummaryLoading && (
                            <div className="fs-error">
                                <span>{fleetSummaryError}</span>
                                <button className="fs-btn fs-btn-danger" onClick={() => fetchFleetSummary()}>Retry</button>
                            </div>
                        )}

                        {/* KPI strip */}
                        <div className="fs-kpi-grid">
                            {[
                                { label: 'Active Vehicles', value: fleetSummaryKpis.activeVehicles, hint: `of ${fleetSummaryKpis.totalVehicles} vehicles in fleet`, color: '#4f46e5' },
                                { label: 'SRCC Trips', value: fleetSummaryKpis.srccTrips.toLocaleString('en-IN'), hint: `${fleetSummaryKpis.outsourcedTrips.toLocaleString('en-IN')} outsourced trips`, color: '#0ea5e9' },
                                { label: 'Avg Trips / Vehicle / Month', value: fleetSummaryKpis.avgPerVehicleMonth.toFixed(1), hint: isDailyPeriod ? 'projected from daily trips' : `across ${periodElapsedMonths} month${periodElapsedMonths === 1 ? '' : 's'}`, color: '#10b981' },
                                { label: 'SRCC Share', value: fleetAggregates.srccUtilTotal, hint: 'of all trips (SRCC + outsourced)', color: '#7c3aed' }
                            ].map(k => (
                                <div key={k.label} className="fs-kpi" style={{ '--fs-accent': k.color }}>
                                    <span className="fs-kpi-label">{k.label}</span>
                                    <span className="fs-kpi-value">{k.value}</span>
                                    <span className="fs-kpi-hint">{k.hint}</span>
                                </div>
                            ))}
                        </div>

                        {/* Charts */}
                        <div className="fs-chart-grid">
                            <div className="fs-card fs-chart-wide">
                                <div className="fs-card-head">
                                    <h4>{periodAdjective} Trips: SRCC vs Outsourced</h4>
                                    <span>Bars show trip counts; the line shows SRCC's share of all trips</span>
                                </div>
                                <div style={{ width: '100%', height: 280 }}>
                                    {monthlyMixData.length > 0 ? (
                                        <ResponsiveContainer>
                                            <ComposedChart data={monthlyMixData} margin={{ top: 10, right: 0, left: -12, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                                                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                                <YAxis yAxisId="trips" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                                                <YAxis yAxisId="share" orientation="right" domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                                                <Tooltip content={<FsChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                                                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                                                <Bar yAxisId="trips" dataKey="srcc" name="SRCC" stackId="trips" fill="#6366f1" maxBarSize={36} />
                                                <Bar yAxisId="trips" dataKey="outsourced" name="Outsourced" stackId="trips" fill="#fde68a" radius={[6, 6, 0, 0]} maxBarSize={36} />
                                                <Line yAxisId="share" type="monotone" dataKey="share" name="SRCC Share %" stroke="#6ee7b7" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 0, fill: '#6ee7b7' }} activeDot={{ r: 5 }} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="fs-empty">No trip data for {periodLabel}</div>
                                    )}
                                </div>
                            </div>

                            <div className="fs-card">
                                <div className="fs-card-head">
                                    <h4>Performance Mix</h4>
                                    <span>{focusColumn ? `Vehicles by trips in ${focusColumn.fullLabel}` : 'Vehicles by average monthly trips'} · click to filter</span>
                                </div>
                                {bandMixData.length > 0 ? (
                                    <>
                                        <div style={{ width: '100%', height: 200, position: 'relative' }}>
                                            <ResponsiveContainer>
                                                <PieChart>
                                                    <Pie
                                                        data={bandMixData} dataKey="value" nameKey="name"
                                                        innerRadius={58} outerRadius={88} paddingAngle={2} strokeWidth={0}
                                                        onClick={d => {
                                                            const key = d?.payload?.key || d?.key;
                                                            if (key) setFleetBandFilter(prev => (prev === key ? 'all' : key));
                                                        }}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        {bandMixData.map(entry => (
                                                            <Cell key={entry.key} fill={entry.fill} opacity={fleetBandFilter === 'all' || fleetBandFilter === entry.key ? 1 : 0.3} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip content={<FsChartTooltip suffix=" vehicles" />} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="fs-donut-center">
                                                <span className="fs-donut-value">{fleetBandCounts.all}</span>
                                                <span className="fs-donut-label">Vehicles</span>
                                            </div>
                                        </div>
                                        <div className="fs-mix-legend">
                                            {HEAT_BANDS.map(b => (
                                                <button
                                                    key={b.key}
                                                    className="fs-mix-item"
                                                    data-active={String(fleetBandFilter === b.key)}
                                                    onClick={() => setFleetBandFilter(prev => (prev === b.key ? 'all' : b.key))}
                                                >
                                                    <span className="fs-mix-dot" style={{ background: b.solid }} />
                                                    <span className="fs-mix-name">{b.label}</span>
                                                    <span className="fs-mix-range">{b.range}</span>
                                                    <span className="fs-mix-count">{fleetBandCounts[b.key]}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="fs-empty" style={{ height: 260 }}>No vehicles to show</div>
                                )}
                            </div>

                            <div className="fs-card">
                                <div className="fs-card-head">
                                    <h4>Top 10 Vehicles</h4>
                                    <span>{`Most trips in ${focusColumn ? focusColumn.fullLabel : periodLabel}`} · click a bar for details</span>
                                </div>
                                <div style={{ width: '100%', height: 300 }}>
                                    {topVehiclesData.length > 0 ? (
                                        <ResponsiveContainer>
                                            <BarChart data={topVehiclesData} layout="vertical" margin={{ top: 4, right: 36, left: 4, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f7" />
                                                <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                                                <YAxis type="category" dataKey="vehicle" width={104} stroke="#475569" fontSize={11.5} fontWeight={600} tickLine={false} axisLine={false} />
                                                <Tooltip content={<FsChartTooltip suffix=" trips" />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                                                <Bar
                                                    dataKey="trips" name="Trips" radius={[0, 6, 6, 0]} maxBarSize={20}
                                                    label={{ position: 'right', fontSize: 11, fill: '#334155', fontWeight: 700 }}
                                                    onClick={d => {
                                                        const row = d?.payload?.row || d?.row;
                                                        if (row) setSelectedVehicleTrend(row);
                                                    }}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    {topVehiclesData.map(entry => <Cell key={entry.vehicle} fill={entry.fill} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="fs-empty">No trips recorded for the current filters</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Vehicle table */}
                        <div className="fs-card fs-table-card">
                            <div className="fs-filter-bar">
                                <div className="fs-search">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="7" />
                                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Search vehicle no."
                                        value={fleetSearchQuery}
                                        onChange={e => setFleetSearchQuery(e.target.value)}
                                    />
                                    {fleetSearchQuery && (
                                        <button className="fs-search-clear" onClick={() => setFleetSearchQuery('')} aria-label="Clear search">✕</button>
                                    )}
                                </div>

                                <div className="fs-chip-group" role="group" aria-label="Filter by performance">
                                    <button className="fs-chip" data-active={String(fleetBandFilter === 'all')} onClick={() => setFleetBandFilter('all')}>
                                        All <span className="fs-chip-count">{fleetBandCounts.all}</span>
                                    </button>
                                    {HEAT_BANDS.map(b => (
                                        <button
                                            key={b.key}
                                            className="fs-chip"
                                            data-active={String(fleetBandFilter === b.key)}
                                            onClick={() => setFleetBandFilter(b.key)}
                                            style={{ '--chip-bg': b.bg, '--chip-text': b.text, '--chip-dot': b.solid }}
                                            title={`${b.label}: ${b.range} trips per month${focusColumn ? ` in ${focusColumn.fullLabel}` : ' on average'}`}
                                        >
                                            <span className="fs-chip-dot" />
                                            {b.label}
                                            <span className="fs-chip-count">{fleetBandCounts[b.key]}</span>
                                        </button>
                                    ))}
                                </div>

                                {periodColumns.length > 1 && (
                                    <select
                                        className="fs-select"
                                        value={fleetMonthFilter}
                                        onChange={e => handleFleetMonthFilter(e.target.value)}
                                        aria-label={`Focus ${periodUnit}`}
                                    >
                                        <option value="all">{`All ${periodUnit}s (average)`}</option>
                                        {periodColumns.map(c => (
                                            <option key={c.key} value={c.key} disabled={c.future}>{c.fullLabel}</option>
                                        ))}
                                    </select>
                                )}

                                {hasFleetFilters && (
                                    <button className="fs-link-btn" onClick={clearFleetFilters}>Clear filters</button>
                                )}
                            </div>

                            <div className="fs-table-meta">
                                <span>
                                    Showing <strong>{filteredSummaryRows.length}</strong> of <strong>{rawSummaryRows.length}</strong> vehicles
                                    <span className="fs-meta-sep">·</span>
                                    Bands based on {focusColumn ? `trips in ${focusColumn.fullLabel}` : 'average monthly trips'}
                                </span>
                                <span className="fs-legend">
                                    {HEAT_BANDS.map(b => (
                                        <span key={b.key} className="fs-legend-item">
                                            <span className="fs-legend-swatch" style={{ background: b.bg, borderColor: b.solid }} />
                                            {b.label} <em>{b.range}</em>
                                        </span>
                                    ))}
                                </span>
                            </div>

                            {fleetSummaryLoading ? (
                                <div className="fs-empty" style={{ height: 240, flexDirection: 'column', gap: '12px' }}>
                                    <div className="fleet-spinner" style={{ width: '34px', height: '34px' }} />
                                    <span>Loading vehicle trip summary...</span>
                                </div>
                            ) : (
                                <div className="fleet-summary-scroll">
                                    <table className="fleet-summary-table">
                                        <thead>
                                            <tr>
                                                <th className="col-sr">#</th>
                                                <th
                                                    className="col-vehicle"
                                                    data-sorted={String(fleetSortConfig.key === 'vehicleNo')}
                                                    onClick={() => requestFleetSort('vehicleNo')}
                                                    title="Sort by vehicle number"
                                                >
                                                    Vehicle No{sortIndicator('vehicleNo')}
                                                </th>
                                                {periodColumns.map(m => (
                                                    <th
                                                        key={m.key}
                                                        data-sorted={String(fleetSortConfig.key === m.key)}
                                                        data-focus={String(fleetMonthFilter === m.key)}
                                                        onClick={() => requestFleetSort(m.key)}
                                                        title={`Sort by ${m.fullLabel}`}
                                                    >
                                                        {m.label}{sortIndicator(m.key)}
                                                    </th>
                                                ))}
                                                <th
                                                    className="col-total"
                                                    data-sorted={String(fleetSortConfig.key === 'total')}
                                                    onClick={() => requestFleetSort('total')}
                                                    title="Sort by total trips"
                                                >
                                                    Total{sortIndicator('total')}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredSummaryRows.length > 0 ? (
                                                filteredSummaryRows.map((row, i) => {
                                                    const vehicleNo = getVehicleNo(row);
                                                    return (
                                                        <tr key={`${vehicleNo}-${i}`}>
                                                            <td className="col-sr">{i + 1}</td>
                                                            <td className="col-vehicle">
                                                                <button className="fs-vehicle-link" onClick={() => setSelectedVehicleTrend(row)} title="View monthly trend">
                                                                    {vehicleNo}
                                                                </button>
                                                            </td>
                                                            {periodColumns.map(m => {
                                                                const val = getColumnVal(row, m);
                                                                const band = getHeatBand(val / getColumnElapsed(m));
                                                                return (
                                                                    <td key={m.key} data-focus={String(fleetMonthFilter === m.key)}>
                                                                        {m.future && val === 0 ? (
                                                                            <span className="fs-heat-empty">–</span>
                                                                        ) : band.key === 'idle' ? (
                                                                            <span className="fs-heat-empty">0</span>
                                                                        ) : (
                                                                            <span className="fs-heat" style={{ background: band.bg, color: band.text }}>{val}</span>
                                                                        )}
                                                                    </td>
                                                                );
                                                            })}
                                                            <td className="col-total">{getVehicleTotal(row)}</td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan={periodColumns.length + 3} className="fs-no-rows">
                                                        <div>No vehicles match the current filters</div>
                                                        {hasFleetFilters && (
                                                            <button className="fs-link-btn" onClick={clearFleetFilters}>Clear filters</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>

                                        {rawSummaryRows.length > 0 && (
                                            <tfoot>
                                                {[
                                                    { label: 'SRCC Vehicles', months: fleetAggregates.srccMonths, total: fleetAggregates.srccTotal, variant: 'base' },
                                                    { label: 'Outsourced', months: fleetAggregates.outsourcedMonths, total: fleetAggregates.outsourcedTotal, variant: 'base' },
                                                    { label: 'Total Trips', months: fleetAggregates.grandMonths, total: fleetAggregates.grandTotal, variant: 'total' },
                                                    { label: 'SRCC Utilization', months: fleetAggregates.srccUtilMonths, total: fleetAggregates.srccUtilTotal, variant: 'srcc' },
                                                    { label: 'Outsourced Utilization', months: fleetAggregates.outsourcedUtilMonths, total: fleetAggregates.outsourcedUtilTotal, variant: 'outsourced' }
                                                ].map(r => (
                                                    <tr key={r.label} className="fs-foot" data-variant={r.variant}>
                                                        <td className="col-sr" />
                                                        <td className="col-vehicle">{r.label}</td>
                                                        {periodColumns.map(m => (
                                                            <td key={m.key} data-focus={String(fleetMonthFilter === m.key)}>{r.months[m.key]}</td>
                                                        ))}
                                                        <td className="col-total">{r.total}</td>
                                                    </tr>
                                                ))}
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Vehicle Monthly Trend Modal */}
                    {selectedVehicleStats && (
                        <div className="fs-modal-backdrop" onClick={() => setSelectedVehicleTrend(null)}>
                            <div className="fs-modal" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
                                <div className="fs-modal-head">
                                    <div>
                                        <span className="fs-modal-eyebrow">Vehicle Trip Trend · {periodLabel}</span>
                                        <div className="fs-modal-title">
                                            <span>{selectedVehicleStats.vehicleNo}</span>
                                            <span className="fs-band-badge" style={{ background: selectedVehicleStats.band.bg, color: selectedVehicleStats.band.text }}>
                                                {selectedVehicleStats.band.label} performer
                                            </span>
                                        </div>
                                        <span className="fs-modal-sub">
                                            Ranked #{selectedVehicleStats.rank} of {selectedVehicleStats.fleetCount} vehicles by total trips
                                        </span>
                                    </div>
                                    <div className="fs-modal-nav">
                                        <button className="fs-icon-btn" onClick={() => navigateVehicle(-1)} disabled={!selectedVehicleStats.hasPrev} title="Previous vehicle (←)" aria-label="Previous vehicle">‹</button>
                                        <button className="fs-icon-btn" onClick={() => navigateVehicle(1)} disabled={!selectedVehicleStats.hasNext} title="Next vehicle (→)" aria-label="Next vehicle">›</button>
                                        <button className="fs-icon-btn" onClick={() => setSelectedVehicleTrend(null)} title="Close (Esc)" aria-label="Close">✕</button>
                                    </div>
                                </div>

                                <div className="fs-modal-body">
                                    <div className="fs-modal-kpis">
                                        {[
                                            { label: 'Total Trips', value: selectedVehicleStats.total, hint: `${selectedVehicleStats.shareOfFleet}% of all SRCC trips` },
                                            {
                                                label: `Active ${periodAdjective === 'Daily' ? 'Days' : periodAdjective === 'Yearly' ? 'Years' : 'Months'}`,
                                                value: `${selectedVehicleStats.activeMonths} / ${selectedVehicleStats.elapsedColumns}`,
                                                hint: selectedVehicleStats.idleMonths > 0
                                                    ? `${selectedVehicleStats.idleMonths} ${periodUnit}${selectedVehicleStats.idleMonths === 1 ? '' : 's'} with no trips`
                                                    : `Active every ${periodUnit}`
                                            },
                                            {
                                                label: 'Avg Trips / Month',
                                                value: selectedVehicleStats.avg.toFixed(1),
                                                hint: selectedVehicleStats.deltaPct === null
                                                    ? 'No fleet average yet'
                                                    : `${selectedVehicleStats.deltaPct >= 0 ? '▲' : '▼'} ${Math.abs(selectedVehicleStats.deltaPct).toFixed(0)}% vs fleet avg (${fleetSummaryKpis.avgPerVehicleMonth.toFixed(1)})`,
                                                hintColor: selectedVehicleStats.deltaPct === null ? undefined : selectedVehicleStats.deltaPct >= 0 ? '#047857' : '#be123c'
                                            },
                                            { label: `Best ${periodUnit.charAt(0).toUpperCase()}${periodUnit.slice(1)}`, value: selectedVehicleStats.best ? selectedVehicleStats.best.month : '—', hint: selectedVehicleStats.best ? `${selectedVehicleStats.best.trips} trips` : 'No trips yet' }
                                        ].map(k => (
                                            <div key={k.label} className="fs-modal-kpi">
                                                <span className="fs-kpi-label">{k.label}</span>
                                                <span className="fs-modal-kpi-value">{k.value}</span>
                                                <span className="fs-kpi-hint" style={k.hintColor ? { color: k.hintColor, fontWeight: 600 } : undefined}>{k.hint}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="fs-card-head" style={{ marginTop: '4px' }}>
                                        <h4>{periodAdjective} Trips vs Fleet Average</h4>
                                        <span>Bar colour shows the performance band for each {periodUnit}</span>
                                    </div>
                                    <div style={{ width: '100%', height: 240 }}>
                                        <ResponsiveContainer>
                                            <ComposedChart data={selectedVehicleStats.chartData} margin={{ top: 16, right: 8, left: -16, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                                                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                                                <Tooltip content={<FsChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                                                <Bar dataKey="trips" name="Trips" radius={[6, 6, 0, 0]} maxBarSize={30} label={{ position: 'top', fontSize: 10.5, fill: '#475569', fontWeight: 700 }}>
                                                    {selectedVehicleStats.chartData.map(d => (
                                                        <Cell key={d.key} fill={d.band.key === 'idle' ? '#e2e8f0' : d.band.solid} />
                                                    ))}
                                                </Bar>
                                                <Line type="monotone" dataKey="fleetAvg" name="Fleet avg / vehicle" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls={false} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div className="fs-month-grid">
                                        {selectedVehicleStats.chartData.map(d => (
                                            <div
                                                key={d.key}
                                                className="fs-month-tile"
                                                data-future={String(d.future)}
                                                style={{ '--tile-accent': d.future ? '#e2e8f0' : d.band.solid, '--tile-bg': d.future || d.band.key === 'idle' ? '#f8fafc' : d.band.bg }}
                                            >
                                                <span className="fs-month-name">{d.month}</span>
                                                <span className="fs-month-value" style={{ color: d.future ? '#cbd5e1' : d.band.text }}>{d.future ? '—' : d.trips}</span>
                                                <span className="fs-month-band">{d.future ? 'Upcoming' : d.band.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

        </div>
    );
};

export default FleetUtilizationReport;