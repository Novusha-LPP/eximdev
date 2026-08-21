import React, { useState, useEffect, useMemo, useCallback, useRef, useContext } from 'react';
import axios from 'axios';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { BranchContext } from '../../../contexts/BranchContext';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    Tooltip as RechartsTooltip,
    Legend,
    CartesianGrid,
    ReferenceLine
} from 'recharts';
import {
    Clock,
    AlertTriangle,
    RefreshCw,
    Search,
    Download,
    FileText,
    Copy,
    Check,
    CheckCircle2,
    Users,
    Layers,
    ListFilter,
    ChevronDown,
    ChevronRight
} from 'lucide-react';
import { getTransportDates, TRANSPORT_BASE, TRANSPORT_HEADERS } from './reports-helper';

// ─── Constants & Styles ─────────────────────────────────────────────────────────

const PIE_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b', '#ef4444'];

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');

.fleet-root {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    display: flex; flex-direction: column; gap: 28px; padding: 0; background: transparent;
    color: #1e293b;
}

/* Glass Tabs */
.fleet-tabs { display: flex; gap: 10px; padding: 8px; background: rgba(255,255,255,0.5); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border-radius: 20px; width: fit-content; box-shadow: 0 4px 24px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.6); }
.fleet-tab { padding: 12px 24px; border-radius: 14px; font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4,0,0.2,1); border: none; background: transparent; color: #64748b; display: flex; align-items: center; gap: 8px; }
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

/* Branch / Operations Summary Card */
.fleet-branch-card {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    border-radius: 24px;
    border: 1px solid rgba(226, 232, 240, 0.8);
    box-shadow: 0 8px 20px -2px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.9);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
    overflow: hidden;
}
.fleet-branch-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.06);
    border-color: rgba(226, 232, 240, 1);
}

/* Action Buttons */
.fleet-export-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 12px; font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 13.5px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4,0,0.2,1); border: 1px solid #10b981; background: rgba(16, 185, 129, 0.08); color: #059669; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
.fleet-export-btn:hover:not(:disabled) { background: #10b981; color: #fff; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(16,185,129,0.25); }
.fleet-export-btn:disabled { opacity: 0.65; cursor: not-allowed; }

.modern-refresh-btn { display: inline-flex; align-items: center; gap: 7px; background: rgba(79, 70, 229, 0.08); color: #4f46e5; border: 1px solid rgba(79, 70, 229, 0.2); padding: 10px 18px; border-radius: 12px; font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 13.5px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.modern-refresh-btn:hover { background: #4f46e5; color: #ffffff; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(79, 70, 229, 0.25); }

.modern-pdf-btn { display: inline-flex; align-items: center; gap: 7px; background: rgba(220, 38, 38, 0.08); color: #dc2626; border: 1px solid rgba(220, 38, 38, 0.2); padding: 10px 18px; border-radius: 12px; font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 13.5px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.modern-pdf-btn:hover { background: #dc2626; color: #ffffff; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(220, 38, 38, 0.25); }

.mono { font-family: 'Outfit', sans-serif; letter-spacing: -0.02em; }

/* Loading */
.fleet-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px 20px; background: rgba(255,255,255,0.7); backdrop-filter: blur(24px); border-radius: 24px; border: 1px solid rgba(255,255,255,0.6); }
.fleet-spinner { width: 56px; height: 56px; border: 3px solid rgba(79,70,229,0.15); border-top-color: #4f46e5; border-radius: 50%; animation: fleet-spin 0.8s cubic-bezier(0.4,0,0.2,1) infinite; }
@keyframes fleet-spin { to { transform: rotate(360deg); } }
`;

// ─── Utility & Projection Helpers ───────────────────────────────────────────────

const computeElapsedDays = (filterType, selectedYear, selectedMonth, selectedQuarter, dateRange, selectedDay, selectedFinancialYear) => {
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
        totalDays = 365;
        const fy = selectedFinancialYear || '26-27';
        const startY = 2000 + parseInt(fy.split('-')[0]);
        const fyStart = new Date(startY, 3, 1);
        const fyEnd = new Date(startY + 1, 2, 31);
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
            totalDays = Math.max(1, Math.round((eDate - sDate) / 86400000) + 1);
            if (today >= sDate && today <= eDate) {
                elapsedDays = Math.max(1, Math.round((today - sDate) / 86400000) + 1);
            } else if (today < sDate) {
                elapsedDays = 0;
            } else {
                elapsedDays = totalDays;
            }
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
    const arrow = perfVal >= 100 ? '↑' : '↓';
    const displayChange = absChange < 1 && absChange > 0 ? absChange.toFixed(1) : Math.round(absChange);
    const performanceLabel = `${arrow} ${displayChange}%`;

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

const formatDateDisplay = (dateStr) => {
    if (!dateStr || dateStr === '-') return '-';
    try {
        const d = dateStr.includes('T') ? parseISO(dateStr) : new Date(dateStr);
        if (!isValid(d)) return dateStr;
        return format(d, 'dd MMM yyyy');
    } catch {
        return dateStr;
    }
};

const getIeBadge = (ieStr) => {
    if (!ieStr) return <span style={{ color: '#94a3b8' }}>—</span>;
    const s = String(ieStr).toLowerCase().trim();
    if (s.includes('import')) return <span className="status-pill-v2" data-variant="info">Import</span>;
    if (s.includes('export')) return <span className="status-pill-v2" data-variant="success">Export</span>;
    return <span className="status-pill-v2" data-variant="neutral">{ieStr}</span>;
};

const getDoValidityBadge = (validityStr) => {
    if (!validityStr || validityStr === '-') return <span style={{ color: '#94a3b8' }}>—</span>;
    try {
        const d = validityStr.includes('T') ? parseISO(validityStr) : new Date(validityStr);
        if (!isValid(d)) return <span>{validityStr}</span>;

        const refDate = new Date();
        const diff = differenceInDays(d, refDate);
        const formatted = format(d, 'dd MMM yyyy');

        if (diff < 0) {
            return (
                <span className="status-pill-v2" data-variant="error" title={`Expired ${Math.abs(diff)} day(s) ago`}>
                    🔴 {formatted} ({Math.abs(diff)}d ago)
                </span>
            );
        }
        if (diff <= 3) {
            return (
                <span className="status-pill-v2" data-variant="warning" title={`Expires in ${diff} day(s)`}>
                    🟡 {formatted} ({diff === 0 ? 'Today' : `${diff}d left`})
                </span>
            );
        }
        return (
            <span className="status-pill-v2" data-variant="success" title="DO is active">
                🟢 {formatted}
            </span>
        );
    } catch {
        return <span>{validityStr}</span>;
    }
};

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

const CopyButton = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = (e) => {
        e.stopPropagation();
        if (!text) return;
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <button
            onClick={handleCopy}
            title="Copy"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 4px', color: '#94a3b8', verticalAlign: 'middle' }}
        >
            {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
        </button>
    );
};

// ─── Main Component ─────────────────────────────────────────────────────────────

const TransportMonitoringReport = ({
    filterType,
    selectedMonth,
    selectedYear,
    selectedQuarter,
    dateRange,
    selectedFinancialYear,
    selectedDay
}) => {
    const { branches: contextBranches = [] } = useContext(BranchContext) || {};
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [retryCount, setRetryCount] = useState(0);
    const [pendingList, setPendingList] = useState([]);
    const [activeList, setActiveList] = useState([]);
    const [closedList, setClosedList] = useState([]);

    // Active Tab: 'dashboard' | 'pending' | 'active' | 'closed' | 'analytics'
    const [activeTab, setActiveTab] = useState('dashboard');

    // Filters & Searches
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('ALL');
    const [selectedIe, setSelectedIe] = useState('ALL');
    const [selectedContainerType, setSelectedContainerType] = useState('ALL');
    const [selectedCustomer, setSelectedCustomer] = useState('ALL');
    const [selectedDoStatus, setSelectedDoStatus] = useState('ALL');
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [viewMode, setViewMode] = useState('flat');
    const [expandedGroups, setExpandedGroups] = useState({});
    const [isExportingExcel, setIsExportingExcel] = useState(false);

    const toggleGroup = (key) => setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));

    // Pagination
    const [pageSize, setPageSize] = useState(25);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: 'pendingCount', direction: 'desc' });

    // Date computation from central Nucleus filter
    const dateQuery = useMemo(() => {
        return getTransportDates(
            filterType || 'day',
            selectedDay,
            selectedYear,
            selectedMonth,
            selectedQuarter,
            dateRange
        );
    }, [filterType, selectedDay, selectedYear, selectedMonth, selectedQuarter, dateRange]);

    const isSingleDay = filterType === 'day' || (dateQuery.startDate && dateQuery.startDate === dateQuery.endDate);

    const { totalDays, elapsedDays } = useMemo(() => {
        return computeElapsedDays(
            filterType,
            selectedYear,
            selectedMonth,
            selectedQuarter,
            dateRange,
            selectedDay
        );
    }, [filterType, selectedYear, selectedMonth, selectedQuarter, dateRange, selectedDay]);

    const periodLabel = useMemo(() => {
        if (!dateQuery.startDate) return 'All Time / Live Queue';
        if (dateQuery.startDate === dateQuery.endDate) {
            try { return format(parseISO(dateQuery.startDate), 'dd MMMM yyyy'); }
            catch { return dateQuery.startDate; }
        }
        try {
            return `${format(parseISO(dateQuery.startDate), 'dd MMM yyyy')} – ${format(parseISO(dateQuery.endDate), 'dd MMM yyyy')}`;
        } catch {
            return `${dateQuery.startDate} to ${dateQuery.endDate}`;
        }
    }, [dateQuery]);

    // Fetch Pending LRs and Historical Closed LRs
    const loadReportData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const isSingle = !dateQuery.startDate || dateQuery.startDate === dateQuery.endDate;
            const targetDateStr = dateQuery.startDate || format(new Date(), 'yyyy-MM-dd');

            const dispatchPromise = isSingle
                ? axios.get(`${TRANSPORT_BASE}/api/vehicle-dsr/dispatch`, {
                    params: { date: targetDateStr },
                    headers: TRANSPORT_HEADERS,
                    withCredentials: true
                })
                : axios.get(`${TRANSPORT_BASE}/api/vehicle-dsr/dispatch-range`, {
                    params: { startDate: dateQuery.startDate, endDate: dateQuery.endDate },
                    headers: TRANSPORT_HEADERS,
                    withCredentials: true
                });

            const pendingPromise = axios.get(`${TRANSPORT_BASE}/api/vehicle-dsr/pending-lrs`, {
                headers: TRANSPORT_HEADERS,
                withCredentials: true
            });

            const [pendingRes, dispatchRes] = await Promise.allSettled([pendingPromise, dispatchPromise]);

            let pRecords = [];
            let aRecords = [];
            let cRecords = [];

            if (pendingRes.status === 'fulfilled' && pendingRes.value.data?.success && Array.isArray(pendingRes.value.data.data) && pendingRes.value.data.data.length > 0) {
                pRecords = pendingRes.value.data.data;
            } else if (dispatchRes.status === 'fulfilled' && dispatchRes.value.data?.pendingLRSnapshot && Array.isArray(dispatchRes.value.data.pendingLRSnapshot)) {
                pRecords = dispatchRes.value.data.pendingLRSnapshot;
            }

            if (dispatchRes.status === 'fulfilled' && dispatchRes.value.data) {
                const d = dispatchRes.value.data;
                if (Array.isArray(d.activeLRs)) aRecords = d.activeLRs;
                if (Array.isArray(d.closedLRs)) cRecords = d.closedLRs;
            }

            setPendingList(pRecords);
            setActiveList(aRecords);
            setClosedList(cRecords);
        } catch (err) {
            console.error("Error fetching transport queue & dispatch data:", err);
            setError(err.response?.data?.message || err.message || "Failed to load transport queue data.");
        } finally {
            setLoading(false);
        }
    }, [dateQuery]);

    useEffect(() => {
        loadReportData();
    }, [loadReportData, retryCount]);

    // ─── Extract Unique Filter Options ─────────────────────────────────────────

    const currentSourceList = useMemo(() => {
        if (activeTab === 'pending') return pendingList;
        if (activeTab === 'active') return activeList;
        if (activeTab === 'closed') return closedList;
        return [...pendingList, ...activeList, ...closedList];
    }, [activeTab, pendingList, activeList, closedList]);

    const allDiscoveredBranchesRef = useRef(new Set());

    useEffect(() => {
        [...pendingList, ...activeList, ...closedList].forEach(item => {
            const b = item.branch || item.branch_name || item.branch_code;
            if (b && String(b).trim()) allDiscoveredBranchesRef.current.add(String(b).trim());
        });
    }, [pendingList, activeList, closedList]);

    const availableBranches = useMemo(() => {
        const set = new Set(allDiscoveredBranchesRef.current);
        (contextBranches || []).forEach(b => {
            const code = b.branch_code || b.branch_name || b.name;
            if (code && String(code).trim()) set.add(String(code).trim());
        });
        [...pendingList, ...activeList, ...closedList].forEach(item => {
            const b = item.branch || item.branch_name || item.branch_code;
            if (b && String(b).trim()) set.add(String(b).trim());
        });
        return Array.from(set).sort();
    }, [contextBranches, pendingList, activeList, closedList]);

    const availableContainerTypes = useMemo(() => {
        const set = new Set();
        currentSourceList.forEach(item => {
            const t = item.container_type || item.container_size || item.vehicle_type || item.type;
            if (t) set.add(t);
        });
        return Array.from(set).sort();
    }, [currentSourceList]);

    const availableCustomers = useMemo(() => {
        const set = new Set();
        currentSourceList.forEach(item => {
            const c = item.invoice_party || item.consignee;
            if (c) set.add(c);
        });
        return Array.from(set).sort();
    }, [currentSourceList]);

    const customerSummary = useMemo(() => {
        const map = {};
        pendingList.forEach(item => {
            const party = item.invoice_party || 'Unknown Customer';
            if (!map[party]) {
                map[party] = {
                    customerName: party,
                    prCount: 0,
                    pendingContainers: 0,
                    totalContainers: 0,
                    createdLRs: 0,
                    branches: new Set(),
                    earliestDo: null,
                    items: []
                };
            }
            map[party].prCount += 1;
            map[party].pendingContainers += Number(item.pendingCount || 0);
            map[party].totalContainers += Number(item.totalContainers || 0);
            map[party].createdLRs += Number(item.lrCreatedContainers || 0);
            if (item.branch) map[party].branches.add(item.branch);
            if (item.do_validity && item.do_validity !== '-') {
                if (!map[party].earliestDo || item.do_validity < map[party].earliestDo) {
                    map[party].earliestDo = item.do_validity;
                }
            }
            map[party].items.push(item);
        });
        return Object.values(map).sort((a, b) => b.pendingContainers - a.pendingContainers);
    }, [pendingList]);

    const matchesContainerTypeOrSize = (item, filterVal) => {
        if (filterVal === 'ALL') return true;
        const typeStr = String(item.container_type || item.container_size || item.vehicle_type || item.type || '').toLowerCase();
        const cntrsStr = Array.isArray(item.containers) ? item.containers.join(' ').toLowerCase() : '';

        if (filterVal === 'SIZE_20' || filterVal === '20') return typeStr.includes('20') || cntrsStr.includes('20');
        if (filterVal === 'SIZE_40' || filterVal === '40') return typeStr.includes('40') || cntrsStr.includes('40');
        if (filterVal === 'SIZE_45' || filterVal === '45') return typeStr.includes('45') || cntrsStr.includes('45');
        return typeStr === String(filterVal).toLowerCase() || typeStr.includes(String(filterVal).toLowerCase());
    };

    const matchesBranch = (item, filterBranch) => {
        if (!filterBranch || filterBranch === 'ALL' || filterBranch === 'all') return true;
        const q = String(filterBranch).trim().toLowerCase();
        const b1 = String(item.branch || '').trim().toLowerCase();
        const b2 = String(item.branch_code || '').trim().toLowerCase();
        const b3 = String(item.branch_name || '').trim().toLowerCase();
        const b4 = String(item.branchId || '').trim().toLowerCase();
        return b1 === q || b2 === q || b3 === q || b4 === q || b1.includes(q) || q.includes(b1);
    };

    // ─── Filtered Lists ────────────────────────────────────────────────────────

    const filteredPendingList = useMemo(() => {
        let list = pendingList || [];
        if (selectedBranch !== 'ALL') list = list.filter(item => matchesBranch(item, selectedBranch));
        if (selectedIe !== 'ALL') list = list.filter(item => String(item.import_export || '').toLowerCase().includes(selectedIe.toLowerCase()));
        if (selectedContainerType !== 'ALL') list = list.filter(item => matchesContainerTypeOrSize(item, selectedContainerType));
        if (selectedCustomer !== 'ALL') list = list.filter(item => (item.invoice_party || '') === selectedCustomer);
        if (selectedDoStatus !== 'ALL') {
            const today = new Date();
            list = list.filter(item => {
                if (!item.do_validity || item.do_validity === '-') return selectedDoStatus === 'NO_DO';
                try {
                    const d = item.do_validity.includes('T') ? parseISO(item.do_validity) : new Date(item.do_validity);
                    if (!isValid(d)) return selectedDoStatus === 'NO_DO';
                    const diff = differenceInDays(d, today);
                    if (selectedDoStatus === 'EXPIRED') return diff < 0;
                    if (selectedDoStatus === 'EXPIRING_SOON') return diff >= 0 && diff <= 3;
                    if (selectedDoStatus === 'VALID') return diff > 3;
                    return true;
                } catch {
                    return selectedDoStatus === 'NO_DO';
                }
            });
        }
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            list = list.filter(item => {
                const pr = String(item.pr_no || '').toLowerCase();
                const party = String(item.invoice_party || '').toLowerCase();
                const br = String(item.branch || '').toLowerCase();
                const ct = String(item.container_type || '').toLowerCase();
                const cntrs = Array.isArray(item.containers) ? item.containers.join(' ').toLowerCase() : '';
                return pr.includes(q) || party.includes(q) || br.includes(q) || ct.includes(q) || cntrs.includes(q);
            });
        }
        return list;
    }, [pendingList, selectedBranch, selectedIe, selectedContainerType, selectedCustomer, selectedDoStatus, searchTerm]);

    const filteredActiveList = useMemo(() => {
        let list = activeList || [];
        if (selectedBranch !== 'ALL') list = list.filter(item => matchesBranch(item, selectedBranch));
        if (selectedIe !== 'ALL') list = list.filter(item => String(item.import_export || '').toLowerCase().includes(selectedIe.toLowerCase()));
        if (selectedContainerType !== 'ALL') list = list.filter(item => matchesContainerTypeOrSize(item, selectedContainerType));
        if (selectedCustomer !== 'ALL') list = list.filter(item => (item.consignee || item.invoice_party || '') === selectedCustomer);
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            list = list.filter(item => {
                const lr = String(item.tr_no || '').toLowerCase();
                const v = String(item.vehicle_no || '').toLowerCase();
                const c = String(item.container_number || '').toLowerCase();
                const ct = String(item.container_type || item.container_size || item.vehicle_type || item.type || '').toLowerCase();
                const cne = String(item.consignee || '').toLowerCase();
                const cnr = String(item.consignor || '').toLowerCase();
                const br = String(item.branch || '').toLowerCase();
                return lr.includes(q) || v.includes(q) || c.includes(q) || ct.includes(q) || cne.includes(q) || cnr.includes(q) || br.includes(q);
            });
        }
        return list;
    }, [activeList, selectedBranch, selectedIe, selectedContainerType, selectedCustomer, searchTerm]);

    const filteredClosedList = useMemo(() => {
        let list = closedList || [];
        if (selectedBranch !== 'ALL') list = list.filter(item => matchesBranch(item, selectedBranch));
        if (selectedIe !== 'ALL') list = list.filter(item => String(item.import_export || '').toLowerCase().includes(selectedIe.toLowerCase()));
        if (selectedContainerType !== 'ALL') list = list.filter(item => matchesContainerTypeOrSize(item, selectedContainerType));
        if (selectedCustomer !== 'ALL') list = list.filter(item => (item.consignee || item.invoice_party || '') === selectedCustomer);
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            list = list.filter(item => {
                const lr = String(item.tr_no || '').toLowerCase();
                const v = String(item.vehicle_no || '').toLowerCase();
                const c = String(item.container_number || '').toLowerCase();
                const ct = String(item.container_type || item.container_size || item.vehicle_type || item.type || '').toLowerCase();
                const cne = String(item.consignee || '').toLowerCase();
                const cnr = String(item.consignor || '').toLowerCase();
                const br = String(item.branch || '').toLowerCase();
                return lr.includes(q) || v.includes(q) || c.includes(q) || ct.includes(q) || cne.includes(q) || cnr.includes(q) || br.includes(q);
            });
        }
        return list;
    }, [closedList, selectedBranch, selectedIe, selectedContainerType, selectedCustomer, searchTerm]);

    // ─── Sorted List & Pagination ──────────────────────────────────────────────

    const sortedList = useMemo(() => {
        const src = activeTab === 'pending'
            ? filteredPendingList
            : (activeTab === 'active' ? filteredActiveList : filteredClosedList);

        if (!sortConfig.key) return src;
        return [...src].sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];
            if (valA === undefined || valA === null) valA = '';
            if (valB === undefined || valB === null) valB = '';

            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            }
            if (['do_validity', 'date', 'created_at', 'dispatchClosedDate', 'lr_date'].includes(sortConfig.key)) {
                const dateA = new Date(valA).getTime() || 0;
                const dateB = new Date(valB).getTime() || 0;
                return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
            }
            const strA = String(valA).toLowerCase();
            const strB = String(valB).toLowerCase();
            if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [activeTab, filteredPendingList, filteredActiveList, filteredClosedList, sortConfig]);

    // ─── Grouped Views for Pending Tab ─────────────────────────────────────────

    const customerGroupedList = useMemo(() => {
        if (activeTab !== 'pending' || viewMode !== 'by_customer') return [];
        const map = {};
        filteredPendingList.forEach(item => {
            const key = item.invoice_party || 'Unknown Customer';
            if (!map[key]) {
                map[key] = {
                    customerName: key,
                    prs: [],
                    totalPending: 0,
                    totalContainers: 0,
                    createdLRs: 0,
                    branches: new Set(),
                    types: new Set()
                };
            }
            map[key].prs.push(item);
            map[key].totalPending += Number(item.pendingCount || 0);
            map[key].totalContainers += Number(item.totalContainers || 0);
            map[key].createdLRs += Number(item.lrCreatedContainers || 0);
            if (item.branch) map[key].branches.add(item.branch);
            if (item.container_type) map[key].types.add(item.container_type);
        });
        return Object.values(map).map(c => ({
            ...c,
            branches: Array.from(c.branches),
            types: Array.from(c.types)
        })).sort((a, b) => b.totalPending - a.totalPending);
    }, [activeTab, viewMode, filteredPendingList]);

    const typeGroupedList = useMemo(() => {
        if (activeTab !== 'pending' || viewMode !== 'grouped') return [];
        const map = {};
        filteredPendingList.forEach(item => {
            const key = item.container_type || 'Standard / Unspecified';
            if (!map[key]) {
                map[key] = {
                    typeName: key,
                    prs: [],
                    totalPending: 0,
                    totalContainers: 0,
                    createdLRs: 0,
                    customers: new Set(),
                    branches: new Set()
                };
            }
            map[key].prs.push(item);
            map[key].totalPending += Number(item.pendingCount || 0);
            map[key].totalContainers += Number(item.totalContainers || 0);
            map[key].createdLRs += Number(item.lrCreatedContainers || 0);
            if (item.invoice_party) map[key].customers.add(item.invoice_party);
            if (item.branch) map[key].branches.add(item.branch);
        });
        return Object.values(map).map(t => ({
            ...t,
            customers: Array.from(t.customers),
            branches: Array.from(t.branches)
        })).sort((a, b) => b.totalPending - a.totalPending);
    }, [activeTab, viewMode, filteredPendingList]);

    const activeDisplayList = useMemo(() => {
        if (activeTab === 'pending' && viewMode === 'by_customer') return customerGroupedList;
        if (activeTab === 'pending' && viewMode === 'grouped') return typeGroupedList;
        return sortedList;
    }, [activeTab, viewMode, customerGroupedList, typeGroupedList, sortedList]);

    const totalPages = useMemo(() => {
        if (pageSize === 'ALL') return 1;
        return Math.ceil(activeDisplayList.length / Number(pageSize)) || 1;
    }, [activeDisplayList, pageSize]);

    const paginatedList = useMemo(() => {
        if (pageSize === 'ALL') return activeDisplayList;
        const size = Number(pageSize);
        const start = (currentPage - 1) * size;
        return activeDisplayList.slice(start, start + size);
    }, [activeDisplayList, currentPage, pageSize]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    // ─── Overall Stats & Projections ───────────────────────────────────────────

    const overallStats = useMemo(() => {
        let totalPRs = filteredPendingList.length;
        let totalPendingContainers = 0;
        let totalAllContainers = 0;
        let totalCreatedLRs = 0;
        let expiredDoCount = 0;
        let expiringSoonDoCount = 0;
        let validDoCount = 0;
        const uniqueParties = new Set();
        const today = new Date();

        filteredPendingList.forEach(item => {
            if (item.invoice_party) uniqueParties.add(item.invoice_party);
            totalPendingContainers += Number(item.pendingCount || 0);
            totalAllContainers += Number(item.totalContainers || 0);
            totalCreatedLRs += Number(item.lrCreatedContainers || 0);

            if (item.do_validity && item.do_validity !== '-') {
                try {
                    const d = item.do_validity.includes('T') ? parseISO(item.do_validity) : new Date(item.do_validity);
                    if (isValid(d)) {
                        const diff = differenceInDays(d, today);
                        if (diff < 0) expiredDoCount++;
                        else if (diff <= 3) expiringSoonDoCount++;
                        else validDoCount++;
                    }
                } catch { }
            }
        });

        const fulfillmentRate = totalAllContainers > 0 ? Math.round((totalCreatedLRs / totalAllContainers) * 100) : 0;
        const totalClosedLRs = filteredClosedList.length;
        const totalActiveLRs = filteredActiveList.length;

        // Daily average closed dispatches
        const avgDailyDispatches = elapsedDays > 0 ? Math.round((totalClosedLRs / elapsedDays) * 10) / 10 : 0;
        const projectedDeliveries = elapsedDays > 0 ? Math.round((totalClosedLRs / elapsedDays) * totalDays) : totalClosedLRs;

        // Est days to clear backlog
        const estDaysToClear = avgDailyDispatches > 0 ? Math.ceil(totalPendingContainers / avgDailyDispatches) : null;

        return {
            totalPRs,
            totalPendingContainers,
            totalAllContainers,
            totalCreatedLRs,
            totalActiveLRs,
            totalClosedLRs,
            fulfillmentRate,
            expiredDoCount,
            expiringSoonDoCount,
            validDoCount,
            uniquePartiesCount: uniqueParties.size,
            avgDailyDispatches,
            projectedDeliveries,
            estDaysToClear
        };
    }, [filteredPendingList, filteredActiveList, filteredClosedList, elapsedDays, totalDays]);

    const projectedDeliveriesTheme = useMemo(() => {
        const perf = overallStats.totalClosedLRs > 0 ? (overallStats.projectedDeliveries / Math.max(overallStats.totalClosedLRs, 1)) * 100 : 100;
        return getColorTheme(perf);
    }, [overallStats]);

    // ─── Breakdown Summaries ───────────────────────────────────────────────────

    const containerSizeSummaryBreakdown = useMemo(() => {
        const map = {};
        filteredPendingList.forEach(item => {
            const key = item.container_type || 'Standard / Unspecified';
            if (!map[key]) {
                map[key] = {
                    containerType: key,
                    prCount: 0,
                    pendingContainers: 0,
                    totalContainers: 0,
                    createdLRs: 0
                };
            }
            map[key].prCount += 1;
            map[key].pendingContainers += Number(item.pendingCount || 0);
            map[key].totalContainers += Number(item.totalContainers || 0);
            map[key].createdLRs += Number(item.lrCreatedContainers || 0);
        });
        return Object.values(map).sort((a, b) => b.pendingContainers - a.pendingContainers);
    }, [filteredPendingList]);

    const branchSummaryBreakdown = useMemo(() => {
        const map = {};
        const getB = (b) => b || 'Unassigned';

        filteredPendingList.forEach(item => {
            const br = getB(item.branch);
            if (!map[br]) map[br] = { branch: br, pendingPRs: 0, pendingCont: 0, totalCont: 0, createdLRs: 0, activeLRs: 0, closedLRs: 0 };
            map[br].pendingPRs += 1;
            map[br].pendingCont += Number(item.pendingCount || 0);
            map[br].totalCont += Number(item.totalContainers || 0);
            map[br].createdLRs += Number(item.lrCreatedContainers || 0);
        });

        filteredActiveList.forEach(item => {
            const br = getB(item.branch);
            if (!map[br]) map[br] = { branch: br, pendingPRs: 0, pendingCont: 0, totalCont: 0, createdLRs: 0, activeLRs: 0, closedLRs: 0 };
            map[br].activeLRs += 1;
        });

        filteredClosedList.forEach(item => {
            const br = getB(item.branch);
            if (!map[br]) map[br] = { branch: br, pendingPRs: 0, pendingCont: 0, totalCont: 0, createdLRs: 0, activeLRs: 0, closedLRs: 0 };
            map[br].closedLRs += 1;
        });

        return Object.values(map).map(b => ({
            ...b,
            avgClosedPerDay: elapsedDays > 0 ? Math.round((b.closedLRs / elapsedDays) * 10) / 10 : 0,
            projectedClosed: elapsedDays > 0 ? Math.round((b.closedLRs / elapsedDays) * totalDays) : b.closedLRs
        })).sort((a, b) => (b.pendingCont + b.activeLRs + b.closedLRs) - (a.pendingCont + a.activeLRs + a.closedLRs));
    }, [filteredPendingList, filteredActiveList, filteredClosedList, elapsedDays, totalDays]);

    const tradeTypeSummaryBreakdown = useMemo(() => {
        const map = {
            'Import': { tradeType: 'Import', pendingPRs: 0, pendingCont: 0, totalCont: 0, createdLRs: 0, activeLRs: 0, closedLRs: 0 },
            'Export': { tradeType: 'Export', pendingPRs: 0, pendingCont: 0, totalCont: 0, createdLRs: 0, activeLRs: 0, closedLRs: 0 }
        };

        filteredPendingList.forEach(item => {
            const isExp = String(item.import_export || '').toLowerCase().includes('export');
            const key = isExp ? 'Export' : 'Import';
            map[key].pendingPRs += 1;
            map[key].pendingCont += Number(item.pendingCount || 0);
            map[key].totalCont += Number(item.totalContainers || 0);
            map[key].createdLRs += Number(item.lrCreatedContainers || 0);
        });

        filteredActiveList.forEach(item => {
            const isExp = String(item.import_export || '').toLowerCase().includes('export');
            const key = isExp ? 'Export' : 'Import';
            map[key].activeLRs += 1;
        });

        filteredClosedList.forEach(item => {
            const isExp = String(item.import_export || '').toLowerCase().includes('export');
            const key = isExp ? 'Export' : 'Import';
            map[key].closedLRs += 1;
        });

        return Object.values(map);
    }, [filteredPendingList, filteredActiveList, filteredClosedList]);

    // ─── Operations Summary (Automove vs SR Container Carriers) ─────────────

    const operationsSummary = useMemo(() => {
        let autoTotal = 0, autoOwn = 0, autoHired = 0;
        let srTotal = 0, srOwn = 0, srHired = 0;
        let sr20 = 0, sr20Own = 0, sr20Hired = 0;
        let sr40 = 0, sr40Own = 0, sr40Hired = 0;

        const allTrips = [...filteredClosedList, ...filteredActiveList];

        allTrips.forEach(r => {
            const br = String(r.branch || r.branch_name || r.branch_code || '').toLowerCase().trim();
            const oh = String(r.own_hired || r.ownHired || (r.vehicle_type === 'OWN' ? 'own' : (r.vehicle_type === 'HIRED' ? 'hired' : ''))).toLowerCase().trim();
            const isOwn = oh === 'own';
            const veh = String(r.container_type || r.container_size || r.type_of_vehicle || r.type || '').toLowerCase();
            const is20 = veh.includes('20');
            const is40 = veh.includes('40');

            if (br === 'automove') {
                autoTotal++;
                if (isOwn) autoOwn++;
                else autoHired++;
            } else {
                srTotal++;
                if (isOwn) srOwn++;
                else srHired++;

                if (is20) {
                    sr20++;
                    if (isOwn) sr20Own++;
                    else sr20Hired++;
                } else if (is40) {
                    sr40++;
                    if (isOwn) sr40Own++;
                    else sr40Hired++;
                }
            }
        });

        const pct = (part, total) => total > 0 ? Math.round((part / total) * 100) : 0;

        return {
            automove: {
                total: autoTotal,
                own: autoOwn,
                hired: autoHired,
                ownPct: pct(autoOwn, autoTotal),
                hiredPct: pct(autoHired, autoTotal)
            },
            srCarriers: {
                total: srTotal,
                own: srOwn,
                hired: srHired,
                ownPct: pct(srOwn, srTotal),
                hiredPct: pct(srHired, srTotal),
                c20: sr20,
                own20: sr20Own,
                hired20: sr20Hired,
                own20Pct: pct(sr20Own, sr20),
                hired20Pct: pct(sr20Hired, sr20),
                c40: sr40,
                own40: sr40Own,
                hired40: sr40Hired,
                own40Pct: pct(sr40Own, sr40),
                hired40Pct: pct(sr40Hired, sr40)
            }
        };
    }, [filteredClosedList, filteredActiveList]);

    // ─── Export to Excel & PDF ──────────────────────────────────────────────────

    const handleExportFullExcel = async () => {
        setIsExportingExcel(true);
        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'AlVision Exim Project Nucleus';
            workbook.created = new Date();

            // SHEET 1: PENDING PRs QUEUE
            const wsPending = workbook.addWorksheet('Pending PRs Queue', { views: [{ state: 'frozen', ySplit: 4 }] });
            wsPending.addRow(['ALVISION EXIM — TRANSPORT PICKUP QUEUE & PENDING PRs']);
            wsPending.addRow([`Period: ${periodLabel} | Total Pending PRs: ${filteredPendingList.length} | Pending Containers: ${overallStats.totalPendingContainers}`]);
            wsPending.addRow([]);
            wsPending.addRow(['Srl', 'PR No', 'Branch', 'Invoice Party / Customer', 'Trade', 'Container Type', 'Pending', 'Total Cont.', 'Created LRs', 'DO Validity', 'Pickup Port', 'Delivery Destination']);

            const pHeader = wsPending.getRow(4);
            pHeader.height = 24;
            pHeader.eachCell(c => {
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
                c.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                c.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            filteredPendingList.forEach((item, idx) => {
                wsPending.addRow([
                    idx + 1,
                    item.pr_no || '—',
                    item.branch || '—',
                    item.invoice_party || '—',
                    item.import_export || '—',
                    item.container_type || '—',
                    Number(item.pendingCount || 0),
                    Number(item.totalContainers || 0),
                    Number(item.lrCreatedContainers || 0),
                    item.do_validity || '—',
                    item.pickup_point || item.port || '—',
                    item.delivery_point || item.destination || '—'
                ]);
            });

            wsPending.columns.forEach(col => {
                let max = 0;
                col.eachCell({ includeEmpty: true }, (cell, rn) => {
                    if (rn > 3) {
                        const s = cell.value ? String(cell.value) : '';
                        if (s.length > max) max = s.length;
                    }
                });
                col.width = Math.min(Math.max(max + 4, 12), 40);
            });

            // SHEET 2: ACTIVE IN-TRANSIT LRs
            const wsActive = workbook.addWorksheet('Active In-Transit LRs', { views: [{ state: 'frozen', ySplit: 4 }] });
            wsActive.addRow(['ALVISION EXIM — ACTIVE IN-TRANSIT TRIPS (ON ROAD)']);
            wsActive.addRow([`Period: ${periodLabel} | Total Active In-Transit Vehicles: ${filteredActiveList.length}`]);
            wsActive.addRow([]);
            wsActive.addRow(['Srl', 'LR / TR No', 'Vehicle No', 'Branch', 'Consignee', 'Consignor', 'Container No', 'Type/Size', 'LR Date', 'Status']);

            const aHeader = wsActive.getRow(4);
            aHeader.height = 24;
            aHeader.eachCell(c => {
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
                c.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                c.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            filteredActiveList.forEach((item, idx) => {
                wsActive.addRow([
                    idx + 1,
                    item.tr_no || '—',
                    item.vehicle_no || '—',
                    item.branch || '—',
                    item.consignee || item.invoice_party || '—',
                    item.consignor || '—',
                    item.container_number || '—',
                    item.container_type || item.container_size || '—',
                    formatDateDisplay(item.lr_date || item.date),
                    item.status || 'In-Transit'
                ]);
            });

            wsActive.columns.forEach(col => {
                let max = 0;
                col.eachCell({ includeEmpty: true }, (cell, rn) => {
                    if (rn > 3) {
                        const s = cell.value ? String(cell.value) : '';
                        if (s.length > max) max = s.length;
                    }
                });
                col.width = Math.min(Math.max(max + 4, 12), 40);
            });

            // SHEET 3: COMPLETED / CLOSED TRIPS
            const wsClosed = workbook.addWorksheet('Completed Trips', { views: [{ state: 'frozen', ySplit: 4 }] });
            wsClosed.addRow(['ALVISION EXIM — COMPLETED & CLOSED DELIVERIES']);
            wsClosed.addRow([`Period: ${periodLabel} | Total Closed Trips: ${filteredClosedList.length}`]);
            wsClosed.addRow([]);
            wsClosed.addRow(['Srl', 'LR / TR No', 'Vehicle No', 'Branch', 'Consignee', 'Container No', 'Completion Date', 'Status']);

            const cHeader = wsClosed.getRow(4);
            cHeader.height = 24;
            cHeader.eachCell(c => {
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
                c.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                c.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            filteredClosedList.forEach((item, idx) => {
                wsClosed.addRow([
                    idx + 1,
                    item.tr_no || '—',
                    item.vehicle_no || '—',
                    item.branch || '—',
                    item.consignee || item.invoice_party || '—',
                    item.container_number || '—',
                    formatDateDisplay(item.dispatchClosedDate || item.date),
                    'Completed / Closed'
                ]);
            });

            wsClosed.columns.forEach(col => {
                let max = 0;
                col.eachCell({ includeEmpty: true }, (cell, rn) => {
                    if (rn > 3) {
                        const s = cell.value ? String(cell.value) : '';
                        if (s.length > max) max = s.length;
                    }
                });
                col.width = Math.min(Math.max(max + 4, 12), 40);
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Transport_Monitoring_Report_${selectedDay || format(new Date(), 'yyyyMMdd')}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to export Excel report:", err);
            alert("Failed to export Excel workbook. Please try again.");
        } finally {
            setIsExportingExcel(false);
        }
    };

    const handleExportPDF = () => {
        try {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
            doc.setFontSize(14);
            doc.text('ALVISION EXIM — TRANSPORT MONITORING REPORT', 40, 40);
            doc.setFontSize(9);
            doc.text(`Period: ${periodLabel} | Section: ${activeTab.toUpperCase()}`, 40, 58);

            const tableHeaders = activeTab === 'pending'
                ? [['#', 'PR No', 'Branch', 'Customer', 'Trade', 'Type', 'Pending', 'Total', 'DO Validity']]
                : activeTab === 'active'
                    ? [['#', 'LR No', 'Vehicle No', 'Branch', 'Consignee', 'Container No', 'LR Date']]
                    : [['#', 'LR No', 'Vehicle No', 'Branch', 'Consignee', 'Container No', 'Closed Date']];

            const tableData = sortedList.map((item, i) => {
                if (activeTab === 'pending') {
                    return [
                        i + 1, item.pr_no || '—', item.branch || '—', item.invoice_party || '—',
                        item.import_export || '—', item.container_type || '—', item.pendingCount || 0,
                        item.totalContainers || 0, item.do_validity || '—'
                    ];
                }
                if (activeTab === 'active') {
                    return [
                        i + 1, item.tr_no || '—', item.vehicle_no || '—', item.branch || '—',
                        item.consignee || item.invoice_party || '—', item.container_number || '—',
                        formatDateDisplay(item.lr_date || item.date)
                    ];
                }
                return [
                    i + 1, item.tr_no || '—', item.vehicle_no || '—', item.branch || '—',
                    item.consignee || item.invoice_party || '—', item.container_number || '—',
                    formatDateDisplay(item.dispatchClosedDate || item.date)
                ];
            });

            doc.autoTable({
                head: tableHeaders,
                body: tableData,
                startY: 70,
                styles: { fontSize: 8, cellPadding: 4 },
                headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] }
            });

            doc.save(`Transport_Report_${activeTab}_${format(new Date(), 'yyyyMMdd')}.pdf`);
        } catch (err) {
            console.error("Failed to export PDF:", err);
            alert("Could not generate PDF.");
        }
    };

    // ─── Render States ──────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="fleet-loading">
                <style>{STYLES}</style>
                <div className="fleet-spinner" />
                <div style={{ marginTop: '1.5rem', color: '#1e293b', fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>
                    Loading Pending LRs & Dispatch Monitoring...
                </div>
                <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
                    Aggregating live PR backlog, in-transit trucks, and closed deliveries
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

    // ─── Main Render ────────────────────────────────────────────────────────────

    return (
        <div className="fleet-root">
            <style>{STYLES}</style>

            {/* ── Header Glass Strip ────────────────────────────────────────── */}
            <div className="fleet-header-glass">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '26px' }}>🚚</span>
                        <h3 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '22px', color: '#0f172a', letterSpacing: '-0.02em' }}>
                            Pending LRs & Dispatch Monitoring
                        </h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', color: '#64748b', fontSize: '13px', marginTop: '6px', fontWeight: 500 }}>
                        <span>Transport pickup backlog for <strong style={{ color: '#4f46e5' }}>{periodLabel}</strong></span>
                        <span>•</span>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, color: '#334155' }}>Branch:</span>
                            <select
                                value={selectedBranch}
                                onChange={(e) => { setSelectedBranch(e.target.value); setCurrentPage(1); }}
                                style={{
                                    fontSize: '12.5px',
                                    fontWeight: selectedBranch !== 'ALL' ? 700 : 600,
                                    borderRadius: '999px',
                                    padding: '3px 24px 3px 10px',
                                    border: selectedBranch !== 'ALL' ? '1px solid #4f46e5' : '1px solid #cbd5e1',
                                    background: selectedBranch !== 'ALL' ? 'rgba(79, 70, 229, 0.08)' : '#ffffff',
                                    color: selectedBranch !== 'ALL' ? '#4f46e5' : '#1e293b',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    fontFamily: "'Outfit', sans-serif"
                                }}
                            >
                                <option value="ALL">ALL</option>
                                {availableBranches.map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button onClick={loadReportData} className="modern-refresh-btn" title="Refresh transport data">
                        <RefreshCw size={14} />
                        <span>Refresh</span>
                    </button>
                    <button onClick={handleExportFullExcel} disabled={isExportingExcel} className="fleet-export-btn" title="Download Excel workbook">
                        {isExportingExcel ? (
                            <>
                                <span className="fleet-spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                                <span>Generating...</span>
                            </>
                        ) : (
                            <>
                                <Download size={14} />
                                <span>Download Excel</span>
                            </>
                        )}
                    </button>
                    <button onClick={handleExportPDF} className="modern-pdf-btn" title="Export PDF">
                        <FileText size={14} />
                        <span>Download PDF</span>
                    </button>

                    {/* KPI Info Tooltip Flyout */}
                    <div className="kpi-info-wrap">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(24px)', borderRadius: '50%', border: '1px solid rgba(226,232,240,0.8)', cursor: 'pointer', width: '38px', height: '38px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                        </div>
                        <div className="kpi-info-tip" style={{ width: '320px', top: '115%', bottom: 'auto' }}>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9', fontFamily: "'Outfit', sans-serif" }}>
                                💡 Transport Dispatch Radar Legend
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#64748b' }}>
                                <div><strong style={{ color: '#dc2626' }}>🔴 Critical Expired DO:</strong> DO passed expiry date before dispatch; urgent detention penalty risk.</div>
                                <div><strong style={{ color: '#d97706' }}>🟡 Expiring Soon:</strong> DO validity expires in ≤3 days; prioritize vehicle allocation.</div>
                                <div><strong style={{ color: '#059669' }}>🟢 Active & Valid:</strong> Normal scheduling buffer available.</div>
                                <div><strong style={{ color: '#4f46e5' }}>Fulfillment Velocity:</strong> Proportion of booked containers converted into dispatched LRs.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Navigation Tabs Bar ────────────────────────────────────────── */}
            <div className="fleet-tabs">
                {[
                    { id: 'dashboard', label: '📊 Operations Dashboard' },
                    { id: 'pending', label: `⏳ Pending PRs (${overallStats.totalPRs})` },
                    { id: 'active', label: `🚚 Active In-Transit (${overallStats.totalActiveLRs})` },
                    { id: 'closed', label: `✅ Completed Deliveries (${overallStats.totalClosedLRs})` },
                    { id: 'analytics', label: '📈 Trends & Analytics' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        className="fleet-tab"
                        data-active={String(activeTab === tab.id)}
                        onClick={() => { setActiveTab(tab.id); setCurrentPage(1); }}
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
                            label="Pending Containers Backlog"
                            value={overallStats.totalPendingContainers.toLocaleString()}
                            extra={`📋 ${overallStats.totalPRs} PRs`}
                            badgeBg="rgba(79, 70, 229, 0.12)"
                            color="#4f46e5"
                            accentColor="#4f46e5"
                            subtext={`⏱️ Live pickup queue • ${overallStats.totalAllContainers} Total Ordered`}
                            large
                            onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
                        />

                        <KpiCard
                            label="Active In-Transit LRs"
                            value={overallStats.totalActiveLRs.toLocaleString()}
                            extra="On Road"
                            accentColor="#f59e0b"
                            color="#d97706"
                            badgeBg="rgba(245, 158, 11, 0.12)"
                            subtext="🚚 Dispatched vehicles currently moving"
                            large
                            onClick={() => { setActiveTab('active'); setCurrentPage(1); }}
                        />

                        <KpiCard
                            label="Completed Deliveries"
                            value={overallStats.totalClosedLRs.toLocaleString()}
                            extra="Closed"
                            accentColor="#10b981"
                            progressPct={overallStats.fulfillmentRate}
                            subtext={`✅ ${overallStats.fulfillmentRate}% Total Fulfillment Rate`}
                            large
                            onClick={() => { setActiveTab('closed'); setCurrentPage(1); }}
                        />

                        <KpiCard
                            label="Client Accounts Waiting"
                            value={overallStats.uniquePartiesCount.toLocaleString()}
                            extra="Parties"
                            accentColor="#0ea5e9"
                            color="#0284c7"
                            badgeBg="rgba(14, 165, 233, 0.12)"
                            subtext="Click to view waiting customer accounts ↗"
                            large
                            onClick={() => setShowCustomerModal(true)}
                        />
                    </div>

                    {/* Row 2: Projections & Dispatch Velocity (Fleet Utilization Style - Shown for every filter except single day) */}
                    {!isSingleDay && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>🎯</span> Dispatch Velocity & Delivery Projections
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                                <KpiCard
                                    label="Average Dispatches / Day"
                                    value={overallStats.avgDailyDispatches}
                                    extra="/ day"
                                    color="#059669"
                                    badgeBg="rgba(16, 185, 129, 0.12)"
                                    accentColor="#10b981"
                                    subtext={`Paced across ${elapsedDays} elapsed days`}
                                    large
                                />

                                <KpiCard
                                    label="Projected Period Deliveries"
                                    value={overallStats.projectedDeliveries.toLocaleString()}
                                    extra={projectedDeliveriesTheme.performanceLabel}
                                    color={projectedDeliveriesTheme.color}
                                    gradient={projectedDeliveriesTheme.bg}
                                    border={projectedDeliveriesTheme.border}
                                    badgeBg={projectedDeliveriesTheme.badgeBg}
                                    accentColor={projectedDeliveriesTheme.color}
                                    subtext={`Run-rate delivery output (${totalDays} days)`}
                                    large
                                />

                                <KpiCard
                                    label="Est. Backlog Clearance Time"
                                    value={overallStats.estDaysToClear !== null ? `${overallStats.estDaysToClear} Days` : '—'}
                                    extra={overallStats.estDaysToClear && overallStats.estDaysToClear > 14 ? '⚠️ High' : '🟢 Normal'}
                                    color={overallStats.estDaysToClear && overallStats.estDaysToClear > 14 ? '#dc2626' : '#059669'}
                                    badgeBg={overallStats.estDaysToClear && overallStats.estDaysToClear > 14 ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)'}
                                    accentColor={overallStats.estDaysToClear && overallStats.estDaysToClear > 14 ? '#ef4444' : '#10b981'}
                                    subtext={`At ${overallStats.avgDailyDispatches} dispatches/day run-rate`}
                                    large
                                />

                                <KpiCard
                                    label="Pickup Fulfillment Velocity"
                                    value={`${overallStats.totalCreatedLRs} / ${overallStats.totalAllContainers}`}
                                    extra={`${overallStats.fulfillmentRate}%`}
                                    color="#4f46e5"
                                    progressPct={overallStats.fulfillmentRate}
                                    accentColor="#4f46e5"
                                    subtext="Containers converted to active dispatches"
                                    large
                                />
                            </div>
                        </div>
                    )}

                    {/* Row 3: DO Urgency Radar & Risk Breakdown (Fleet Card Style) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>⏰</span> DO Urgency Radar & Detention Risk Breakdown
                            </div>
                            {selectedDoStatus !== 'ALL' && (
                                <button
                                    onClick={() => setSelectedDoStatus('ALL')}
                                    style={{ background: 'transparent', border: 'none', color: '#dc2626', fontWeight: 700, fontSize: '12px', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                                >
                                    ✕ Reset Status Filter
                                </button>
                            )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                            <KpiCard
                                label="Critical Expired DOs"
                                value={overallStats.expiredDoCount}
                                extra="High Risk"
                                color="#dc2626"
                                badgeBg="rgba(239, 68, 68, 0.12)"
                                accentColor="#ef4444"
                                hl={Boolean(overallStats.expiredDoCount > 0)}
                                subtext="DO expired before truck assignment"
                                onClick={() => {
                                    setActiveTab('pending');
                                    setSelectedDoStatus(prev => prev === 'EXPIRED' ? 'ALL' : 'EXPIRED');
                                    setCurrentPage(1);
                                }}
                            />

                            <KpiCard
                                label="Expiring Soon (≤3 Days)"
                                value={overallStats.expiringSoonDoCount}
                                extra="Priority"
                                color="#d97706"
                                badgeBg="rgba(245, 158, 11, 0.12)"
                                accentColor="#f59e0b"
                                subtext="Immediate allocation required"
                                onClick={() => {
                                    setActiveTab('pending');
                                    setSelectedDoStatus(prev => prev === 'EXPIRING_SOON' ? 'ALL' : 'EXPIRING_SOON');
                                    setCurrentPage(1);
                                }}
                            />

                            <KpiCard
                                label="Active & Valid DOs"
                                value={overallStats.validDoCount}
                                extra="On Schedule"
                                color="#059669"
                                badgeBg="rgba(16, 185, 129, 0.12)"
                                accentColor="#10b981"
                                subtext="Normal scheduling buffer"
                                onClick={() => {
                                    setActiveTab('pending');
                                    setSelectedDoStatus(prev => prev === 'VALID' ? 'ALL' : 'VALID');
                                    setCurrentPage(1);
                                }}
                            />

                            <KpiCard
                                label="Unassigned / No DO Date"
                                value={Math.max(0, overallStats.totalPRs - overallStats.expiredDoCount - overallStats.expiringSoonDoCount - overallStats.validDoCount)}
                                extra="Pending Line"
                                color="#475569"
                                badgeBg="rgba(148, 163, 184, 0.15)"
                                accentColor="#64748b"
                                subtext="DO release pending from liner"
                                onClick={() => {
                                    setActiveTab('pending');
                                    setSelectedDoStatus(prev => prev === 'NO_DO' ? 'ALL' : 'NO_DO');
                                    setCurrentPage(1);
                                }}
                            />
                        </div>
                    </div>

                    {/* Row 4: Branch Operations Matrix & Container Split */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
                        {/* Branch Operations Matrix */}
                        <div className="fleet-table-wrap" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid rgba(226,232,240,0.6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h4 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '16px', color: '#0f172a' }}>
                                    🏢 Branch Operations Matrix
                                </h4>
                                <span className="status-pill-v2" data-variant="info">{branchSummaryBreakdown.length} Stations</span>
                            </div>
                            <div style={{ overflowX: 'auto', maxHeight: '340px' }}>
                                <table className="fleet-table">
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                                        <tr>
                                            <th>Branch</th>
                                            <th style={{ textAlign: 'center' }}>Pending PRs</th>
                                            <th style={{ textAlign: 'center' }}>Pending Cont.</th>
                                            <th style={{ textAlign: 'center' }}>In-Transit</th>
                                            <th style={{ textAlign: 'center' }}>Closed</th>
                                            <th style={{ textAlign: 'right' }}>Projected Closures</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {branchSummaryBreakdown.map((b, idx) => (
                                            <tr key={idx}>
                                                <td style={{ fontWeight: 700, color: '#0f172a' }}>{b.branch}</td>
                                                <td style={{ textAlign: 'center', fontWeight: 800, color: '#dc2626' }} className="mono">{b.pendingPRs}</td>
                                                <td style={{ textAlign: 'center' }} className="mono">{b.pendingCont}</td>
                                                <td style={{ textAlign: 'center', fontWeight: 700, color: '#d97706' }} className="mono">{b.activeLRs}</td>
                                                <td style={{ textAlign: 'center', fontWeight: 700, color: '#059669' }} className="mono">{b.closedLRs}</td>
                                                <td style={{ textAlign: 'right', fontWeight: 800, color: '#4f46e5' }} className="mono">{b.projectedClosed}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Trade Mode Split & Container Distribution */}
                        <div className="fleet-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
                            <div>
                                <h4 style={{ margin: '0 0 12px 0', fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '16px', color: '#0f172a' }}>
                                    📦 Trade Mode & Container Distribution
                                </h4>

                                {/* Split Bar */}
                                <div style={{ marginBottom: '18px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: '#64748b' }}>
                                        <span style={{ color: '#4f46e5' }}>Import ({tradeTypeSummaryBreakdown.find(t => t.tradeType === 'Import')?.pendingCont || 0} Cont.)</span>
                                        <span style={{ color: '#059669' }}>Export ({tradeTypeSummaryBreakdown.find(t => t.tradeType === 'Export')?.pendingCont || 0} Cont.)</span>
                                    </div>
                                    <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
                                        <div style={{ width: `${overallStats.totalPendingContainers > 0 ? ((tradeTypeSummaryBreakdown.find(t => t.tradeType === 'Import')?.pendingCont || 0) / overallStats.totalPendingContainers) * 100 : 50}%`, background: '#4f46e5' }} />
                                        <div style={{ width: `${overallStats.totalPendingContainers > 0 ? ((tradeTypeSummaryBreakdown.find(t => t.tradeType === 'Export')?.pendingCont || 0) / overallStats.totalPendingContainers) * 100 : 50}%`, background: '#10b981' }} />
                                    </div>
                                </div>

                                {/* Sizes Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    {containerSizeSummaryBreakdown.slice(0, 4).map((c, i) => (
                                        <div key={i} style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(226,232,240,0.8)', padding: '12px 14px', borderRadius: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>{c.containerType}</span>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                                <span style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a' }} className="mono">{c.pendingContainers}</span>
                                                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>pending</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid rgba(226,232,240,0.6)' }}>
                                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                                    Overall Fulfillment: <strong style={{ color: '#059669' }}>{overallStats.fulfillmentRate}%</strong>
                                </span>
                                <button
                                    onClick={() => setActiveTab('analytics')}
                                    style={{ background: 'transparent', border: 'none', color: '#4f46e5', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                                >
                                    View Full Analytics →
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Row 5: Operations Summary (Automove vs SR Container Carriers) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Outfit', sans-serif" }}>
                            <span>🏢</span> Operations Summary
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                            {/* Automove Card */}
                            <div className="fleet-branch-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Outfit', sans-serif" }}>
                                        🚛 Automove
                                    </span>
                                    <span className="status-pill-v2" data-variant="info">
                                        {operationsSummary.automove.total} trips
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid rgba(226,232,240,0.6)' }}>
                                    {[
                                        { label: 'OWN', val: operationsSummary.automove.own, pct: operationsSummary.automove.ownPct, bg: 'rgba(5,150,105,0.06)', lc: '#047857', vc: '#059669' },
                                        { label: 'HIRED', val: operationsSummary.automove.hired, pct: operationsSummary.automove.hiredPct, bg: 'rgba(245,158,11,0.06)', lc: '#b45309', vc: '#f59e0b' }
                                    ].map((x, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: x.bg, padding: '10px 16px', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.03)' }}>
                                            <span style={{ fontSize: '12px', color: x.lc, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>{x.label}</span>
                                            <span style={{ fontSize: '18px', fontWeight: 900, color: x.vc }} className="mono">
                                                {x.val}
                                                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 700, marginLeft: '6px' }}>{x.pct}%</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* SR Container Carriers Card */}
                            <div className="fleet-branch-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Outfit', sans-serif" }}>
                                        📦 SR Container Carriers
                                    </span>
                                    <span className="status-pill-v2" data-variant="success">
                                        {operationsSummary.srCarriers.total} trips
                                    </span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingTop: '12px', borderTop: '1px solid rgba(226,232,240,0.6)' }}>
                                    {[
                                        {
                                            label: '20 FEET',
                                            count: operationsSummary.srCarriers.c20,
                                            own: operationsSummary.srCarriers.own20,
                                            hired: operationsSummary.srCarriers.hired20,
                                            ownPct: operationsSummary.srCarriers.own20Pct,
                                            hiredPct: operationsSummary.srCarriers.hired20Pct
                                        },
                                        {
                                            label: '40 FEET',
                                            count: operationsSummary.srCarriers.c40,
                                            own: operationsSummary.srCarriers.own40,
                                            hired: operationsSummary.srCarriers.hired40,
                                            ownPct: operationsSummary.srCarriers.own40Pct,
                                            hiredPct: operationsSummary.srCarriers.hired40Pct
                                        }
                                    ].map((x, i) => (
                                        <div key={i}>
                                            <div style={{ fontSize: '12.5px', color: '#475569', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: "'Outfit', sans-serif" }}>
                                                {x.label} <span style={{ color: '#64748b' }}>({x.count})</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {[
                                                    { l: 'OWN', v: x.own, p: x.ownPct, bg: 'rgba(5,150,105,0.06)', lc: '#047857', vc: '#059669' },
                                                    { l: 'HIRED', v: x.hired, p: x.hiredPct, bg: 'rgba(245,158,11,0.06)', lc: '#b45309', vc: '#f59e0b' }
                                                ].map((s, j) => (
                                                    <div key={j} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: s.bg, padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.03)' }}>
                                                        <span style={{ fontSize: '11px', color: s.lc, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>{s.l}</span>
                                                        <span style={{ fontSize: '15px', fontWeight: 900, color: s.vc }} className="mono">
                                                            {s.v}
                                                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, marginLeft: '4px' }}>{s.p}%</span>
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                TAB 2, 3, 4: LIST DATA VIEWS (Pending / Active / Closed)
                ═══════════════════════════════════════════════════════════════════ */}
            {['pending', 'active', 'closed'].includes(activeTab) && (
                <div className="fleet-table-wrap" style={{ padding: '24px' }}>
                    {/* Toolbar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                            {/* Search */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', width: '100%', maxWidth: '380px' }}>
                                <Search size={15} color="#94a3b8" />
                                <input
                                    type="text"
                                    placeholder={activeTab === 'pending' ? "Search PR No, Customer, Port..." : "Search LR, Vehicle, Container..."}
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                    style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13.5px', fontFamily: "'Outfit', sans-serif" }}
                                />
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm('')} style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
                                )}
                            </div>

                            {/* View Switcher (Pending only) */}
                            {activeTab === 'pending' && (
                                <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
                                    <button
                                        onClick={() => { setViewMode('flat'); setCurrentPage(1); }}
                                        className="status-pill-v2"
                                        data-variant={viewMode === 'flat' ? 'info' : 'neutral'}
                                        style={{ cursor: 'pointer', border: 'none' }}
                                    >
                                        <ListFilter size={12} style={{ marginRight: '4px' }} /> Flat Table
                                    </button>
                                    <button
                                        onClick={() => { setViewMode('by_customer'); setCurrentPage(1); }}
                                        className="status-pill-v2"
                                        data-variant={viewMode === 'by_customer' ? 'info' : 'neutral'}
                                        style={{ cursor: 'pointer', border: 'none' }}
                                    >
                                        <Users size={12} style={{ marginRight: '4px' }} /> By Customer
                                    </button>
                                    <button
                                        onClick={() => { setViewMode('grouped'); setCurrentPage(1); }}
                                        className="status-pill-v2"
                                        data-variant={viewMode === 'grouped' ? 'info' : 'neutral'}
                                        style={{ cursor: 'pointer', border: 'none' }}
                                    >
                                        <Layers size={12} style={{ marginRight: '4px' }} /> By Type
                                    </button>
                                </div>
                            )}

                            <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
                                Showing <strong>{activeDisplayList.length}</strong> records
                            </div>
                        </div>

                        {/* Filter Selectors */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '12px', borderTop: '1px solid rgba(226,232,240,0.6)' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filters:</span>

                            {activeTab === 'pending' && (
                                <select
                                    value={selectedDoStatus}
                                    onChange={(e) => { setSelectedDoStatus(e.target.value); setCurrentPage(1); }}
                                    style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                                >
                                    <option value="ALL">All DO Statuses</option>
                                    <option value="EXPIRED">🔴 Expired ({overallStats.expiredDoCount})</option>
                                    <option value="EXPIRING_SOON">🟡 Expiring ≤3d ({overallStats.expiringSoonDoCount})</option>
                                    <option value="VALID">🟢 Active & Valid ({overallStats.validDoCount})</option>
                                    <option value="NO_DO">— No DO Date</option>
                                </select>
                            )}

                            {availableBranches.length > 0 && (
                                <select
                                    value={selectedBranch}
                                    onChange={(e) => { setSelectedBranch(e.target.value); setCurrentPage(1); }}
                                    style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                                >
                                    <option value="ALL">All Branches ({availableBranches.length})</option>
                                    {availableBranches.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            )}

                            <select
                                value={selectedContainerType}
                                onChange={(e) => { setSelectedContainerType(e.target.value); setCurrentPage(1); }}
                                style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                            >
                                <option value="ALL">All Sizes & Types</option>
                                <option value="SIZE_20">20' Containers</option>
                                <option value="SIZE_40">40' Containers</option>
                                {availableContainerTypes.filter(ct => !['20', '40', '45', 'SIZE_20', 'SIZE_40', 'SIZE_45'].includes(ct)).map(ct => (
                                    <option key={ct} value={ct}>{ct}</option>
                                ))}
                            </select>

                            <select
                                value={selectedIe}
                                onChange={(e) => { setSelectedIe(e.target.value); setCurrentPage(1); }}
                                style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }}
                            >
                                <option value="ALL">All Trade Types</option>
                                <option value="import">Import</option>
                                <option value="export">Export</option>
                            </select>

                            {(selectedDoStatus !== 'ALL' || selectedBranch !== 'ALL' || selectedContainerType !== 'ALL' || selectedIe !== 'ALL' || searchTerm) && (
                                <button
                                    onClick={() => {
                                        setSelectedDoStatus('ALL');
                                        setSelectedBranch('ALL');
                                        setSelectedContainerType('ALL');
                                        setSelectedIe('ALL');
                                        setSelectedCustomer('ALL');
                                        setSearchTerm('');
                                        setCurrentPage(1);
                                    }}
                                    className="status-pill-v2"
                                    data-variant="error"
                                    style={{ cursor: 'pointer', border: 'none' }}
                                >
                                    ✕ Reset
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflowX: 'auto', minHeight: '320px' }}>
                        <table className="fleet-table">
                            <thead>
                                {activeTab === 'pending' && viewMode === 'flat' && (
                                    <tr>
                                        <th onClick={() => handleSort('pr_no')} style={{ cursor: 'pointer' }}>PR No</th>
                                        <th onClick={() => handleSort('branch')} style={{ cursor: 'pointer' }}>Branch</th>
                                        <th onClick={() => handleSort('invoice_party')} style={{ cursor: 'pointer' }}>Customer / Party</th>
                                        <th style={{ textAlign: 'center' }}>Trade</th>
                                        <th>Container Type</th>
                                        <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('pendingCount')}>Pending</th>
                                        <th style={{ textAlign: 'center' }}>Total</th>
                                        <th style={{ textAlign: 'center' }}>Progress</th>
                                        <th onClick={() => handleSort('do_validity')} style={{ cursor: 'pointer' }}>DO Validity</th>
                                        <th>Pickup / Port</th>
                                    </tr>
                                )}
                                {activeTab === 'pending' && viewMode === 'by_customer' && (
                                    <tr>
                                        <th colSpan={3}>Customer / Invoice Party</th>
                                        <th colSpan={2}>Branches & Sizes</th>
                                        <th style={{ textAlign: 'center' }}>Pending Containers</th>
                                        <th style={{ textAlign: 'center' }}>Total Ordered</th>
                                        <th style={{ textAlign: 'center' }}>Fulfillment</th>
                                        <th colSpan={2} style={{ textAlign: 'right', paddingRight: '20px' }}>Actions</th>
                                    </tr>
                                )}
                                {activeTab === 'pending' && viewMode === 'grouped' && (
                                    <tr>
                                        <th colSpan={3}>Container Size & Type</th>
                                        <th colSpan={2}>Customers & Branches</th>
                                        <th style={{ textAlign: 'center' }}>Pending Containers</th>
                                        <th style={{ textAlign: 'center' }}>Total Ordered</th>
                                        <th style={{ textAlign: 'center' }}>Fulfillment</th>
                                        <th colSpan={2} style={{ textAlign: 'right', paddingRight: '20px' }}>Actions</th>
                                    </tr>
                                )}
                                {activeTab === 'active' && (
                                    <tr>
                                        <th onClick={() => handleSort('tr_no')} style={{ cursor: 'pointer' }}>LR / TR No</th>
                                        <th onClick={() => handleSort('vehicle_no')} style={{ cursor: 'pointer' }}>Vehicle No</th>
                                        <th onClick={() => handleSort('branch')} style={{ cursor: 'pointer' }}>Branch</th>
                                        <th>Consignee / Party</th>
                                        <th>Container No</th>
                                        <th>Size / Type</th>
                                        <th>LR Date</th>
                                        <th style={{ textAlign: 'center' }}>Status</th>
                                    </tr>
                                )}
                                {activeTab === 'closed' && (
                                    <tr>
                                        <th onClick={() => handleSort('tr_no')} style={{ cursor: 'pointer' }}>LR / TR No</th>
                                        <th onClick={() => handleSort('vehicle_no')} style={{ cursor: 'pointer' }}>Vehicle No</th>
                                        <th onClick={() => handleSort('branch')} style={{ cursor: 'pointer' }}>Branch</th>
                                        <th>Consignee</th>
                                        <th>Container No</th>
                                        <th>Closed Date</th>
                                        <th style={{ textAlign: 'center' }}>Status</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody>
                                {activeTab === 'pending' && viewMode === 'flat' && paginatedList.map((item, idx) => (
                                    <tr key={idx}>
                                        <td style={{ fontWeight: 800, color: '#4f46e5' }} className="mono">
                                            {item.pr_no || '—'}
                                            <CopyButton text={item.pr_no} />
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{item.branch || '—'}</td>
                                        <td style={{ fontWeight: 600, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.invoice_party}>
                                            {item.invoice_party || '—'}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>{getIeBadge(item.import_export)}</td>
                                        <td style={{ color: '#64748b' }} className="mono">{item.container_type || '—'}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 800, color: '#dc2626' }} className="mono">{item.pendingCount || 0}</td>
                                        <td style={{ textAlign: 'center', color: '#64748b' }} className="mono">{item.totalContainers || 0}</td>
                                        <td style={{ textAlign: 'center', width: '100px' }}>
                                            <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', background: '#10b981', width: `${Number(item.totalContainers) > 0 ? (Number(item.lrCreatedContainers || 0) / Number(item.totalContainers)) * 100 : 0}%` }} />
                                            </div>
                                        </td>
                                        <td>{getDoValidityBadge(item.do_validity)}</td>
                                        <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#64748b', fontSize: '13px' }} title={item.pickup_point || item.port}>
                                            {item.pickup_point || item.port || '—'}
                                        </td>
                                    </tr>
                                ))}

                                {activeTab === 'pending' && viewMode === 'by_customer' && paginatedList.map((custGroup, idx) => {
                                    const isExpanded = !!expandedGroups[`cust_${idx}`];
                                    const percent = custGroup.totalContainers > 0 ? Math.round((custGroup.createdLRs / custGroup.totalContainers) * 100) : 0;
                                    return (
                                        <React.Fragment key={idx}>
                                            <tr style={{ background: isExpanded ? '#f8fafc' : undefined, cursor: 'pointer' }} onClick={() => toggleGroup(`cust_${idx}`)}>
                                                <td colSpan={3} style={{ fontWeight: 700, color: '#0f172a' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ color: '#4f46e5' }}>{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
                                                        <span>{custGroup.customerName}</span>
                                                        <span className="status-pill-v2" data-variant="info">{custGroup.prs.length} PRs</span>
                                                    </div>
                                                </td>
                                                <td colSpan={2}>
                                                    {custGroup.branches.map(b => (
                                                        <span key={b} className="status-pill-v2" data-variant="neutral" style={{ marginRight: '4px' }}>{b}</span>
                                                    ))}
                                                </td>
                                                <td style={{ textAlign: 'center', fontWeight: 800, color: '#dc2626' }} className="mono">{custGroup.totalPending}</td>
                                                <td style={{ textAlign: 'center', color: '#64748b' }} className="mono">{custGroup.totalContainers}</td>
                                                <td style={{ textAlign: 'center', width: '120px' }}>
                                                    <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', background: '#10b981', width: `${percent}%` }} />
                                                    </div>
                                                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{percent}% fulfilled</div>
                                                </td>
                                                <td colSpan={2} style={{ textAlign: 'right', paddingRight: '20px' }} onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => { setSelectedCustomer(custGroup.customerName); setViewMode('flat'); setCurrentPage(1); }}
                                                        className="status-pill-v2"
                                                        data-variant="info"
                                                        style={{ cursor: 'pointer', border: 'none' }}
                                                    >
                                                        Filter PRs →
                                                    </button>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={10} style={{ padding: '0', background: '#f8fafc' }}>
                                                        <div style={{ padding: '16px 20px' }}>
                                                            <table className="fleet-table" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                                <thead>
                                                                    <tr>
                                                                        <th>PR No</th>
                                                                        <th>Branch</th>
                                                                        <th>Trade</th>
                                                                        <th>Container Type</th>
                                                                        <th style={{ textAlign: 'center' }}>Pending</th>
                                                                        <th style={{ textAlign: 'center' }}>Total</th>
                                                                        <th>DO Validity</th>
                                                                        <th>Pickup / Port</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {custGroup.prs.map((p, pIdx) => (
                                                                        <tr key={pIdx}>
                                                                            <td style={{ fontWeight: 700, color: '#4f46e5' }} className="mono">{p.pr_no || '—'}</td>
                                                                            <td>{p.branch || '—'}</td>
                                                                            <td>{getIeBadge(p.import_export)}</td>
                                                                            <td style={{ color: '#64748b' }} className="mono">{p.container_type || '—'}</td>
                                                                            <td style={{ textAlign: 'center', fontWeight: 700, color: '#dc2626' }} className="mono">{p.pendingCount || 0}</td>
                                                                            <td style={{ textAlign: 'center' }} className="mono">{p.totalContainers || 0}</td>
                                                                            <td>{getDoValidityBadge(p.do_validity)}</td>
                                                                            <td style={{ color: '#64748b', fontSize: '12px' }}>{p.pickup_point || p.port || '—'}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}

                                {activeTab === 'pending' && viewMode === 'grouped' && paginatedList.map((typeGroup, idx) => {
                                    const isExpanded = !!expandedGroups[`type_${idx}`];
                                    const percent = typeGroup.totalContainers > 0 ? Math.round((typeGroup.createdLRs / typeGroup.totalContainers) * 100) : 0;
                                    return (
                                        <React.Fragment key={idx}>
                                            <tr style={{ background: isExpanded ? '#f8fafc' : undefined, cursor: 'pointer' }} onClick={() => toggleGroup(`type_${idx}`)}>
                                                <td colSpan={3} style={{ fontWeight: 700, color: '#0f172a' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ color: '#4f46e5' }}>{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</span>
                                                        <span>📦 {typeGroup.typeName}</span>
                                                        <span className="status-pill-v2" data-variant="warning">{typeGroup.prs.length} PRs</span>
                                                    </div>
                                                </td>
                                                <td colSpan={2}>
                                                    <span className="status-pill-v2" data-variant="neutral">👥 {typeGroup.customers.length} Customers</span>
                                                </td>
                                                <td style={{ textAlign: 'center', fontWeight: 800, color: '#dc2626' }} className="mono">{typeGroup.totalPending}</td>
                                                <td style={{ textAlign: 'center', color: '#64748b' }} className="mono">{typeGroup.totalContainers}</td>
                                                <td style={{ textAlign: 'center', width: '120px' }}>
                                                    <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', background: '#10b981', width: `${percent}%` }} />
                                                    </div>
                                                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{percent}% fulfilled</div>
                                                </td>
                                                <td colSpan={2} style={{ textAlign: 'right', paddingRight: '20px' }} onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => { setSelectedContainerType(typeGroup.typeName); setViewMode('flat'); setCurrentPage(1); }}
                                                        className="status-pill-v2"
                                                        data-variant="info"
                                                        style={{ cursor: 'pointer', border: 'none' }}
                                                    >
                                                        Filter Type →
                                                    </button>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={10} style={{ padding: '0', background: '#f8fafc' }}>
                                                        <div style={{ padding: '16px 20px' }}>
                                                            <table className="fleet-table" style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                                                <thead>
                                                                    <tr>
                                                                        <th>PR No</th>
                                                                        <th>Branch</th>
                                                                        <th>Customer</th>
                                                                        <th>Trade</th>
                                                                        <th style={{ textAlign: 'center' }}>Pending</th>
                                                                        <th style={{ textAlign: 'center' }}>Total</th>
                                                                        <th>DO Validity</th>
                                                                        <th>Pickup / Port</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {typeGroup.prs.map((p, pIdx) => (
                                                                        <tr key={pIdx}>
                                                                            <td style={{ fontWeight: 700, color: '#4f46e5' }} className="mono">{p.pr_no || '—'}</td>
                                                                            <td>{p.branch || '—'}</td>
                                                                            <td style={{ fontWeight: 600 }}>{p.invoice_party || '—'}</td>
                                                                            <td>{getIeBadge(p.import_export)}</td>
                                                                            <td style={{ textAlign: 'center', fontWeight: 700, color: '#dc2626' }} className="mono">{p.pendingCount || 0}</td>
                                                                            <td style={{ textAlign: 'center' }} className="mono">{p.totalContainers || 0}</td>
                                                                            <td>{getDoValidityBadge(p.do_validity)}</td>
                                                                            <td style={{ color: '#64748b', fontSize: '12px' }}>{p.pickup_point || p.port || '—'}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}

                                {activeTab === 'active' && paginatedList.map((item, idx) => (
                                    <tr key={idx}>
                                        <td style={{ fontWeight: 800, color: '#4f46e5' }} className="mono">
                                            {item.tr_no || '—'}
                                            <CopyButton text={item.tr_no} />
                                        </td>
                                        <td style={{ fontWeight: 700, color: '#0f172a' }} className="mono">{item.vehicle_no || '—'}</td>
                                        <td>{item.branch || '—'}</td>
                                        <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.consignee || item.invoice_party}>
                                            {item.consignee || item.invoice_party || '—'}
                                        </td>
                                        <td style={{ color: '#64748b' }} className="mono">{item.container_number || '—'}</td>
                                        <td>{item.container_type || item.container_size || '—'}</td>
                                        <td style={{ color: '#64748b' }} className="mono">{formatDateDisplay(item.lr_date || item.date)}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className="status-pill-v2" data-variant="warning">In-Transit</span>
                                        </td>
                                    </tr>
                                ))}

                                {activeTab === 'closed' && paginatedList.map((item, idx) => (
                                    <tr key={idx}>
                                        <td style={{ fontWeight: 800, color: '#4f46e5' }} className="mono">
                                            {item.tr_no || '—'}
                                            <CopyButton text={item.tr_no} />
                                        </td>
                                        <td style={{ fontWeight: 700, color: '#0f172a' }} className="mono">{item.vehicle_no || '—'}</td>
                                        <td>{item.branch || '—'}</td>
                                        <td style={{ maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.consignee || item.invoice_party}>
                                            {item.consignee || item.invoice_party || '—'}
                                        </td>
                                        <td style={{ color: '#64748b' }} className="mono">{item.container_number || '—'}</td>
                                        <td style={{ color: '#64748b' }} className="mono">{formatDateDisplay(item.dispatchClosedDate || item.date)}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className="status-pill-v2" data-variant="success">Closed</span>
                                        </td>
                                    </tr>
                                ))}

                                {paginatedList.length === 0 && (
                                    <tr>
                                        <td colSpan={10} style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
                                            No transport records found matching the active filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(226,232,240,0.6)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748b' }}>
                            <span>Show</span>
                            <select
                                value={pageSize}
                                onChange={(e) => { setPageSize(e.target.value); setCurrentPage(1); }}
                                style={{ padding: '4px 8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                            >
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value="ALL">All</option>
                            </select>
                            <span>per page</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '13px', color: '#64748b' }}>
                                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage <= 1}
                                className="status-pill-v2"
                                data-variant="neutral"
                                style={{ cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', opacity: currentPage <= 1 ? 0.5 : 1, border: '1px solid #cbd5e1' }}
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                                className="status-pill-v2"
                                data-variant="neutral"
                                style={{ cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', opacity: currentPage >= totalPages ? 0.5 : 1, border: '1px solid #cbd5e1' }}
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                TAB 5: ANALYTICS & TRENDS
                ═══════════════════════════════════════════════════════════════════ */}
            {activeTab === 'analytics' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
                    {/* Branch Operations Bar Chart */}
                    <div className="fleet-chart-card">
                        <h3 style={{ margin: '0 0 4px 0' }}>🏢 Branch Dispatches & Pending Backlog</h3>
                        <span className="sub">Station-wise comparison of backlog vs dispatches</span>
                        <div style={{ height: '320px', width: '100%', marginTop: '16px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={branchSummaryBreakdown} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="branch" tick={{ fill: '#64748b', fontSize: 11, fontFamily: "'Outfit', sans-serif" }} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                                    <RechartsTooltip content={({ active, payload, label }) => {
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
                                    <Bar dataKey="pendingCont" name="Pending Containers" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="activeLRs" name="In-Transit Trucks" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="closedLRs" name="Completed Dispatches" fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Container Type Distribution Donut Chart */}
                    <div className="fleet-chart-card">
                        <h3 style={{ margin: '0 0 4px 0' }}>📦 Container Type Distribution</h3>
                        <span className="sub">Pending volume by container size & specification</span>
                        <div style={{ height: '320px', width: '100%', position: 'relative', marginTop: '16px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={containerSizeSummaryBreakdown}
                                        cx="50%"
                                        cy="45%"
                                        innerRadius={65}
                                        outerRadius={100}
                                        paddingAngle={4}
                                        dataKey="pendingContainers"
                                        nameKey="containerType"
                                    >
                                        {containerSizeSummaryBreakdown.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const d = payload[0];
                                            return (
                                                <div className="fleet-tooltip-v2">
                                                    <div style={{ fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>{d.name}</div>
                                                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Pending: <strong>{d.value}</strong></div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }} />
                                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px', fontFamily: "'Outfit', sans-serif" }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                                <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>{overallStats.totalPendingContainers.toLocaleString()}</div>
                                <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Total Cont.</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Customer Details Modal ───────────────────────────────────────── */}
            {showCustomerModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(15, 23, 42, 0.6)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 1050,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}
                    onClick={() => setShowCustomerModal(false)}
                >
                    <div
                        className="fleet-card"
                        style={{
                            maxWidth: '780px',
                            width: '100%',
                            maxHeight: '80vh',
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '28px',
                            background: '#ffffff'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Users size={20} color="#4f46e5" />
                                <h4 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 800, color: '#0f172a', fontSize: '18px' }}>
                                    Customers Waiting for Dispatch ({customerSummary.length})
                                </h4>
                            </div>
                            <button
                                onClick={() => setShowCustomerModal(false)}
                                style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
                            >
                                ✕
                            </button>
                        </div>

                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            <table className="fleet-table">
                                <thead>
                                    <tr>
                                        <th>Customer Name</th>
                                        <th style={{ textAlign: 'center' }}>Pending PRs</th>
                                        <th style={{ textAlign: 'center' }}>Pending Cont.</th>
                                        <th style={{ textAlign: 'center' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customerSummary.map((c, i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight: 700, color: '#0f172a' }}>{c.customerName}</td>
                                            <td style={{ textAlign: 'center' }} className="mono">{c.prCount}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 800, color: '#dc2626' }} className="mono">{c.pendingContainers}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    onClick={() => {
                                                        setSelectedCustomer(c.customerName);
                                                        setActiveTab('pending');
                                                        setShowCustomerModal(false);
                                                        setCurrentPage(1);
                                                    }}
                                                    className="status-pill-v2"
                                                    data-variant="info"
                                                    style={{ cursor: 'pointer', border: 'none' }}
                                                >
                                                    Filter Queue →
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #e2e8f0', marginTop: '12px' }}>
                            <button
                                onClick={() => setShowCustomerModal(false)}
                                className="status-pill-v2"
                                data-variant="neutral"
                                style={{ cursor: 'pointer', border: '1px solid #cbd5e1', padding: '8px 20px', fontSize: '13px' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransportMonitoringReport;
