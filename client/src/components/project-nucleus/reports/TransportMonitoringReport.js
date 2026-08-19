import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format, parseISO, isValid, addDays, subDays, differenceInDays } from 'date-fns';
import {
    ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip
} from 'recharts';
import {
    Truck,
    CheckCircle2,
    Clock,
    AlertTriangle,
    RefreshCw,
    Search,
    Download,
    ChevronRight,
    ChevronLeft,
    User,
    Package,
    Copy,
    Check,
    Grid,
    List,
    SlidersHorizontal,
    AlertCircle,
    Building2,
    X,
    ShieldCheck,
    Radio
} from 'lucide-react';
import { TRANSPORT_BASE, TRANSPORT_HEADERS } from './reports-helper';

// ─── Status Palette Constants ──────────────────────────────────────────────────
const STATUS_COLORS = {
    'Under trip': { fill: '#10b981', label: 'Under Trip', variant: 'success' },
    'Under Trip': { fill: '#10b981', label: 'Under Trip', variant: 'success' },
    'Maintenance': { fill: '#0ea5e9', label: 'Maintenance', variant: 'info' },
    'Driver on Leave': { fill: '#f59e0b', label: 'Driver on Leave', variant: 'warning' },
    'No Driver': { fill: '#ef4444', label: 'No Driver', variant: 'error' },
    'Under detention': { fill: '#8b5cf6', label: 'Under Detention', variant: 'neutral' },
    'Under Detention': { fill: '#8b5cf6', label: 'Under Detention', variant: 'neutral' },
    'Breakdown': { fill: '#dc2626', label: 'Breakdown', variant: 'error' },
    'IDLE': { fill: '#94a3b8', label: 'Idle / Available', variant: 'neutral' },
    'Idle': { fill: '#94a3b8', label: 'Idle / Available', variant: 'neutral' }
};

// ─── CSS Styles ────────────────────────────────────────────────────────────────
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');

.fleet-root {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 2px 0 24px 0;
    background: transparent;
    width: 100%;
    box-sizing: border-box;
}

/* Control Bar (Top) */
.fleet-control-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    padding: 12px 18px;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 18px;
    border: 1px solid rgba(226, 232, 240, 0.9);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.02);
}

/* Tab Bar */
.fleet-tabs {
    display: flex;
    gap: 5px;
    padding: 5px;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 16px;
    width: fit-content;
    max-width: 100%;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.02);
    border: 1px solid rgba(226, 232, 240, 0.9);
    flex-wrap: wrap;
    box-sizing: border-box;
}
.fleet-tab {
    padding: 7px 14px;
    border-radius: 11px;
    font-family: 'Outfit', sans-serif;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    border: none;
    background: transparent;
    color: #64748b;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
}
.fleet-tab[data-active="true"] {
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    color: #fff;
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.25);
    font-weight: 700;
}
.fleet-tab[data-active="false"]:hover {
    background: rgba(99, 102, 241, 0.08);
    color: #1e293b;
}
.fleet-tab-badge {
    padding: 2px 6px;
    border-radius: 999px;
    font-size: 10.5px;
    font-weight: 800;
    background: rgba(0, 0, 0, 0.06);
    color: inherit;
    white-space: nowrap;
}
.fleet-tab[data-active="true"] .fleet-tab-badge {
    background: rgba(255, 255, 255, 0.25);
    color: #ffffff;
}

/* Glass Card */
.fleet-card {
    background: var(--fc-bg, rgba(255, 255, 255, 0.92));
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    border-radius: 20px 8px 20px 20px;
    border: var(--fc-border, 1px solid rgba(226, 232, 240, 0.85));
    box-shadow: 0 4px 14px -2px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.9);
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
    position: relative;
    box-sizing: border-box;
}
.fleet-card::before {
    content: '';
    position: absolute;
    top: -20px;
    right: -20px;
    width: 90px;
    height: 90px;
    border-radius: 50%;
    background: var(--fc-accent, #cbd5e1);
    filter: blur(28px);
    opacity: 0.22;
    transition: all 0.25s ease;
    pointer-events: none;
    z-index: 0;
}
.fleet-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 1);
    border-color: rgba(203, 213, 225, 1);
}
.fleet-card[data-active-ring="true"] {
    border-color: #6366f1;
    box-shadow: 0 0 0 2px #6366f1, 0 6px 20px -2px rgba(99, 102, 241, 0.15);
}

/* KPI Grid */
.fleet-kpi-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 14px;
    width: 100%;
}
@media (max-width: 1380px) {
    .fleet-kpi-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
    .fleet-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 600px) {
    .fleet-kpi-grid { grid-template-columns: 1fr; }
}

/* Table Wrapper */
.fleet-table-wrap {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-radius: 18px;
    border: 1px solid rgba(226, 232, 240, 0.85);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
    overflow: hidden;
    width: 100%;
    box-sizing: border-box;
}
.fleet-table-scroll {
    overflow-x: auto;
    width: 100%;
    -webkit-overflow-scrolling: touch;
}
.fleet-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-size: 13px;
    text-align: left;
}
.fleet-table th {
    background: linear-gradient(180deg, rgba(248, 250, 252, 0.98) 0%, rgba(241, 245, 249, 0.98) 100%);
    color: #0f172a;
    font-family: 'Outfit', sans-serif;
    font-weight: 700;
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(226, 232, 240, 0.8);
    white-space: nowrap;
    position: sticky;
    top: 0;
    z-index: 2;
}
.fleet-table td {
    color: #1e293b;
    font-weight: 500;
    font-size: 13px;
    padding: 11px 16px;
    border-bottom: 1px solid rgba(226, 232, 240, 0.5);
    transition: background 0.15s ease;
    vertical-align: middle;
}
.fleet-table tr:hover td {
    background: rgba(79, 70, 229, 0.025);
}
.fleet-table tr:last-child td {
    border-bottom: none;
}

/* Status Pills */
.status-pill-v2 {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 7px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 10.5px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    transition: all 0.15s;
    font-family: 'Outfit', sans-serif;
    white-space: nowrap !important;
    flex-shrink: 0;
    box-sizing: border-box;
}
.status-pill-v2[data-variant="neutral"] { background: rgba(148, 163, 184, 0.15); color: #475569; border: 1px solid rgba(148, 163, 184, 0.25); }
.status-pill-v2[data-variant="success"] { background: rgba(16, 185, 129, 0.15); color: #059669; border: 1px solid rgba(16, 185, 129, 0.25); }
.status-pill-v2[data-variant="warning"] { background: rgba(245, 158, 11, 0.15); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.25); }
.status-pill-v2[data-variant="info"]    { background: rgba(14, 165, 233, 0.15); color: #0284c7; border: 1px solid rgba(14, 165, 233, 0.25); }
.status-pill-v2[data-variant="error"]   { background: rgba(239, 68, 68, 0.15); color: #dc2626; border: 1px solid rgba(239, 68, 68, 0.25); }

/* Chart Card */
.fleet-chart-card {
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-radius: 20px 8px 20px 20px;
    border: 1px solid rgba(226, 232, 240, 0.85);
    padding: 20px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.9);
    box-sizing: border-box;
}

/* Tooltip */
.fleet-tooltip-v2 {
    background: rgba(255, 255, 255, 0.98) !important;
    backdrop-filter: blur(12px) !important;
    border: 1px solid rgba(226, 232, 240, 0.8) !important;
    border-radius: 12px !important;
    padding: 10px 14px !important;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08) !important;
    font-family: 'Inter', sans-serif !important;
}

/* Export Button */
.fleet-export-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 10px;
    font-family: 'Outfit', sans-serif;
    font-weight: 700;
    font-size: 12.5px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid #10b981;
    background: transparent;
    color: #059669;
    white-space: nowrap;
    flex-shrink: 0;
}
.fleet-export-btn:hover {
    background: #10b981;
    color: #ffffff;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
}

/* Sub-Badges */
.sub-badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: rgba(0, 0, 0, 0.035);
    border: 1px solid rgba(0, 0, 0, 0.05);
    padding: 2.5px 6px;
    border-radius: 5px;
    font-size: 10.5px;
    font-weight: 700;
    color: inherit;
    letter-spacing: 0.01em;
    white-space: nowrap !important;
}

/* License Plate */
.tm-plate-badge {
    display: inline-flex;
    align-items: center;
    border-radius: 6px;
    border: 1px solid #cbd5e1;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    font-family: 'JetBrains Mono', monospace;
    font-weight: 800;
    font-size: 11.5px;
    letter-spacing: 0.02em;
    overflow: hidden;
    white-space: nowrap !important;
    flex-shrink: 0;
}
.tm-plate-ind {
    background: #1d4ed8;
    color: #ffffff;
    font-size: 7.5px;
    font-weight: 900;
    padding: 3px 5px;
    letter-spacing: 0.05em;
    border-right: 1px solid #cbd5e1;
}
.tm-plate-num {
    padding: 3px 6px;
    color: #0f172a;
}

/* Loading */
.fleet-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 70px 20px;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(20px);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.6);
}
.fleet-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(79, 70, 229, 0.15);
    border-top-color: #4f46e5;
    border-radius: 50%;
    animation: fleet-spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
@keyframes fleet-spin { to { transform: rotate(360deg); } }

/* Mono Typography */
.mono {
    font-family: 'Outfit', sans-serif;
    letter-spacing: -0.02em;
}
.tm-mono {
    font-family: 'JetBrains Mono', monospace !important;
    white-space: nowrap !important;
}

/* Copy Button */
.tm-copy-btn {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #64748b;
    padding: 2.5px 4.5px;
    border-radius: 4px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    transition: all 0.15s ease;
    margin-left: 4px;
    flex-shrink: 0;
    vertical-align: middle;
}
.tm-copy-btn:hover {
    color: #0f172a;
    background: #e2e8f0;
}

/* Search input */
.fleet-search-input {
    padding: 6px 26px 6px 30px;
    border-radius: 9px;
    border: 1px solid #cbd5e1;
    font-size: 12.5px;
    outline: none;
    width: 210px;
    background: #ffffff;
    color: #0f172a;
    font-family: inherit;
    transition: all 0.2s ease;
}
.fleet-search-input:focus {
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
    width: 240px;
}

/* Fleet Grid Cards */
.fleet-vehicle-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
    gap: 16px;
    padding: 20px;
    box-sizing: border-box;
}
.fleet-vehicle-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-top: 4px solid #94a3b8;
    border-radius: 16px;
    padding: 16px 18px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 12px;
    transition: all 0.2s ease;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);
    min-width: 0;
    overflow: hidden;
    box-sizing: border-box;
}
.fleet-vehicle-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
    border-color: #cbd5e1;
}

/* Overview Layout Split */
.fleet-overview-grid {
    display: grid;
    grid-template-columns: 1.35fr 1fr;
    gap: 20px;
    width: 100%;
}
@media (max-width: 1180px) {
    .fleet-overview-grid {
        grid-template-columns: 1fr;
    }
}
`;

// ─── Sub-Components ────────────────────────────────────────────────────────────

const ProgressCircle = ({ pct, color }) => {
    const radius = 16;
    const strokeWidth = 3.2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (pct / 100) * circumference;
    return (
        <div style={{ position: 'relative', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="38" height="38" style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
                <circle cx="19" cy="19" r={radius} fill="transparent" stroke="rgba(0,0,0,0.04)" strokeWidth={strokeWidth} />
                <circle 
                    cx="19" cy="19" r={radius} fill="transparent" stroke={color} strokeWidth={strokeWidth}
                    strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }} 
                />
            </svg>
            <span style={{ fontSize: '9.5px', fontWeight: 800, color: color, fontFamily: "'Outfit', sans-serif" }}>{pct}%</span>
        </div>
    );
};

const KpiCard = ({ label, subtext, value, unit, extra, color, gradient, border, badgeBg, large, accentColor, pct, active, onClick }) => {
    const defaultAccent = accentColor || color || '#cbd5e1';

    return (
        <div 
            className="fleet-card" 
            data-active-ring={active ? 'true' : 'false'}
            onClick={onClick}
            style={{
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '8px',
                cursor: 'pointer',
                minHeight: '128px',
                boxSizing: 'border-box',
                '--fc-bg': gradient,
                '--fc-border': border,
                '--fc-accent': defaultAccent
            }}
        >
            {/* Top Row: Label & Progress Circle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px', zIndex: 1 }}>
                <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '11.5px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800, lineHeight: 1.25 }}>
                    {label}
                </div>
                {pct !== undefined && pct !== null && (
                    <div style={{ flexShrink: 0, marginTop: '-2px' }}>
                        <ProgressCircle pct={pct} color={defaultAccent} />
                    </div>
                )}
            </div>

            {/* Middle Row: Big Metric Value & Unit */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontSize: large ? '30px' : '28px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }} className="mono">
                        {value}
                    </span>
                    {unit && (
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>
                            {unit}
                        </span>
                    )}
                </div>
                {extra && !badgeBg && pct === undefined && (
                    <div style={{ fontSize: '12px', fontWeight: 700, color: color, marginTop: '2px' }}>
                        {extra}
                    </div>
                )}
                {extra && badgeBg && (
                    <div style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: '5px', background: badgeBg, color: color, fontWeight: 700, fontSize: '10.5px', width: 'fit-content', marginTop: '3px' }}>
                        {extra}
                    </div>
                )}
            </div>

            {/* Bottom Row: Full Width Subtext / Badges */}
            {subtext && (
                <div style={{ zIndex: 1, paddingTop: '6px', borderTop: '1px solid rgba(0, 0, 0, 0.04)', fontSize: '11px', color: '#64748b', fontWeight: 600, lineHeight: 1.25 }}>
                    {subtext}
                </div>
            )}
        </div>
    );
};

const DonutLabel = ({ viewBox, total }) => {
    const { cx, cy } = viewBox;
    return (
        <g>
            <text x={cx} y={cy - 6} textAnchor="middle" dominantBaseline="central" style={{ fontSize: '22px', fontWeight: 900, fill: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
                {total}
            </text>
            <text x={cx} y={cy + 16} textAnchor="middle" dominantBaseline="central" style={{ fontSize: '10.5px', fontWeight: 700, fill: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Vehicles
            </text>
        </g>
    );
};

const DonutTooltip = ({ active, payload }) => {
    if (active && payload?.[0]) {
        const d = payload[0];
        return (
            <div className="fleet-tooltip-v2">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.payload.fill, display: 'inline-block' }} />
                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '12.5px' }}>{d.name}</span>
                </div>
                <div style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', marginTop: '3px', fontFamily: "'Outfit', sans-serif" }}>
                    {d.value} <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>vehicles</span>
                </div>
            </div>
        );
    }
    return null;
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
        <button className="tm-copy-btn" onClick={handleCopy} title="Copy to clipboard">
            {copied ? <Check size={10} color="#059669" /> : <Copy size={10} />}
        </button>
    );
};

const LicensePlate = ({ number }) => {
    if (!number) return <span>-</span>;
    return (
        <div className="tm-plate-badge" title="Vehicle Registration">
            <span className="tm-plate-ind">IND</span>
            <span className="tm-plate-num">{number}</span>
            <CopyButton text={number} />
        </div>
    );
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

const getStatusConfig = (statusStr) => {
    const s = String(statusStr || '').toLowerCase().trim();
    if (s.includes('trip')) return { label: 'Under Trip', variant: 'success', icon: Truck, fill: '#10b981' };
    if (s.includes('leave')) return { label: 'Driver on Leave', variant: 'warning', icon: User, fill: '#f59e0b' };
    if (s.includes('no driver')) return { label: 'No Driver', variant: 'error', icon: AlertCircle, fill: '#ef4444' };
    if (s.includes('maint')) return { label: 'Maintenance', variant: 'info', icon: SlidersHorizontal, fill: '#0ea5e9' };
    if (s.includes('detention')) return { label: 'Under Detention', variant: 'neutral', icon: Clock, fill: '#8b5cf6' };
    if (s.includes('breakdown') || s.includes('accident')) return { label: 'Breakdown', variant: 'error', icon: AlertTriangle, fill: '#dc2626' };
    if (s.includes('avail') || s.includes('ready')) return { label: 'Available', variant: 'success', icon: CheckCircle2, fill: '#10b981' };
    return { label: statusStr || 'IDLE', variant: 'neutral', icon: Clock, fill: '#94a3b8' };
};

const getIeBadge = (ieStr) => {
    if (!ieStr) return null;
    const s = String(ieStr).toLowerCase().trim();
    if (s.includes('import')) return <span className="status-pill-v2" data-variant="info">Import</span>;
    if (s.includes('export')) return <span className="status-pill-v2" data-variant="success">Export</span>;
    if (s.includes('sales') || s.includes('domestic')) return <span className="status-pill-v2" data-variant="warning">{ieStr}</span>;
    return <span className="status-pill-v2" data-variant="info">{ieStr}</span>;
};

const getDoValidityBadge = (validityStr, targetDateStr) => {
    if (!validityStr || validityStr === '-') {
        return <span className="tm-mono" style={{ color: '#94a3b8' }}>-</span>;
    }
    try {
        const d = validityStr.includes('T') ? parseISO(validityStr) : new Date(validityStr);
        if (!isValid(d)) return <span className="tm-mono" style={{ color: '#64748b' }}>{validityStr}</span>;
        
        const refDate = targetDateStr ? (targetDateStr.includes('T') ? parseISO(targetDateStr) : new Date(targetDateStr)) : new Date();
        const diff = differenceInDays(d, refDate);
        const formatted = format(d, 'dd MMM yyyy');

        if (diff < 0) {
            return (
                <span className="status-pill-v2" data-variant="error" title={`Expired ${Math.abs(diff)} day(s) ago`}>
                    <AlertTriangle size={10} /> {formatted} (Expired)
                </span>
            );
        }
        if (diff <= 3) {
            return (
                <span className="status-pill-v2" data-variant="warning" title={`Expires in ${diff} day(s)`}>
                    <Clock size={10} /> {formatted} ({diff === 0 ? 'Today' : `${diff}d left`})
                </span>
            );
        }
        return (
            <span className="status-pill-v2" data-variant="success" title="DO is valid">
                <CheckCircle2 size={10} /> {formatted}
            </span>
        );
    } catch {
        return <span className="tm-mono" style={{ color: '#64748b' }}>{validityStr}</span>;
    }
};

// ─── Main Component ─────────────────────────────────────────────────────────────

const TransportMonitoringReport = ({ selectedDay }) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const [targetDate, setTargetDate] = useState(selectedDay || todayStr);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [dispatchData, setDispatchData] = useState(null);
    const [livePendingList, setLivePendingList] = useState([]);

    // Tabs
    const [activeTab, setActiveTab] = useState('overview');
    const [fleetViewMode, setFleetViewMode] = useState('grid');
    const [fleetStatusFilter, setFleetStatusFilter] = useState('ALL');

    // Searches
    const [searchFleet, setSearchFleet] = useState('');
    const [searchActive, setSearchActive] = useState('');
    const [searchClosed, setSearchClosed] = useState('');
    const [searchExceptions, setSearchExceptions] = useState('');
    const [searchPending, setSearchPending] = useState('');

    // Dropdown filters
    const [activeBranchFilter, setActiveBranchFilter] = useState('ALL');
    const [activeIeFilter, setActiveIeFilter] = useState('ALL');
    const [closedBranchFilter, setClosedBranchFilter] = useState('ALL');

    // Fetch data
    const loadReportData = async (date) => {
        const qDate = date || targetDate;
        if (!qDate) return;
        setLoading(true);
        setError(null);
        try {
            const [dispatchRes, pendingRes] = await Promise.all([
                axios.get(`${TRANSPORT_BASE}/api/vehicle-dsr/dispatch`, {
                    params: { date: qDate },
                    headers: TRANSPORT_HEADERS,
                    withCredentials: true
                }),
                axios.get(`${TRANSPORT_BASE}/api/vehicle-dsr/pending-lrs`, {
                    headers: TRANSPORT_HEADERS,
                    withCredentials: true
                })
            ]);

            if (dispatchRes.data?.success) {
                setDispatchData(dispatchRes.data);
            } else {
                setDispatchData(null);
            }

            if (pendingRes.data?.success) {
                setLivePendingList(pendingRes.data.data || []);
            }
        } catch (err) {
            console.error("Error fetching transport monitoring data:", err);
            setError(err.message || "Failed to load transport monitoring data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedDay) {
            setTargetDate(selectedDay);
        }
    }, [selectedDay]);

    useEffect(() => {
        loadReportData(targetDate);
    }, [targetDate]);

    const handleShiftDate = (days) => {
        try {
            const cur = targetDate ? parseISO(targetDate) : new Date();
            const next = days > 0 ? addDays(cur, days) : subDays(cur, Math.abs(days));
            const formatted = format(next, 'yyyy-MM-dd');
            setTargetDate(formatted);
        } catch {
            setTargetDate(todayStr);
        }
    };

    // Data sources
    const fleetList = useMemo(() => dispatchData?.fleetStatus || [], [dispatchData]);
    const activeList = useMemo(() => dispatchData?.activeLRs || [], [dispatchData]);
    const closedList = useMemo(() => dispatchData?.closedLRs || [], [dispatchData]);
    const exceptionsList = useMemo(() => dispatchData?.exceptions || [], [dispatchData]);

    const pendingContainersSource = useMemo(() => {
        if (dispatchData?.pendingLRSnapshot && dispatchData.pendingLRSnapshot.length > 0) {
            return dispatchData.pendingLRSnapshot;
        }
        return livePendingList;
    }, [dispatchData, livePendingList]);

    // Summary Metrics
    const metrics = useMemo(() => {
        const totalFleet = fleetList.length;
        let underTrip = 0, driverLeave = 0, noDriver = 0, maintenance = 0, idle = 0, detention = 0;

        fleetList.forEach(v => {
            const st = (v.status && v.status[0] ? v.status[0] : 'IDLE').toLowerCase();
            if (st.includes('trip')) underTrip++;
            else if (st.includes('leave')) driverLeave++;
            else if (st.includes('no driver')) noDriver++;
            else if (st.includes('maint')) maintenance++;
            else if (st.includes('detention')) detention++;
            else idle++;
        });

        const activeTotal = activeList.length;
        let activeImport = 0, activeExport = 0, activeSales = 0;
        activeList.forEach(lr => {
            const ie = (lr.import_export || '').toLowerCase();
            if (ie.includes('import')) activeImport++;
            else if (ie.includes('export')) activeExport++;
            else activeSales++;
        });

        const closedTotal = closedList.length;
        const exceptionsTotal = exceptionsList.length;

        let totalPendingPRs = pendingContainersSource.length;
        let totalPendingContainers = 0;
        let totalAssignedContainers = 0;
        let urgentDoCount = 0;

        pendingContainersSource.forEach(p => {
            totalPendingContainers += (p.pendingCount || 0);
            totalAssignedContainers += (p.lrCreatedContainers || 0);
            if (p.do_validity) {
                try {
                    const d = parseISO(p.do_validity);
                    const ref = targetDate ? parseISO(targetDate) : new Date();
                    if (isValid(d) && differenceInDays(d, ref) <= 3) {
                        urgentDoCount++;
                    }
                } catch {
                    // Ignore
                }
            }
        });

        const fleetUtilization = totalFleet > 0 ? Math.round((underTrip / totalFleet) * 100) : 0;

        return {
            totalFleet,
            underTrip,
            driverLeave,
            noDriver,
            maintenance,
            idle,
            detention,
            fleetUtilization,
            activeTotal,
            activeImport,
            activeExport,
            activeSales,
            closedTotal,
            exceptionsTotal,
            totalPendingPRs,
            totalPendingContainers,
            totalAssignedContainers,
            urgentDoCount
        };
    }, [fleetList, activeList, closedList, exceptionsList, pendingContainersSource, targetDate]);

    // Pie chart status distribution
    const statusDistribution = useMemo(() => {
        const counts = {};
        fleetList.forEach(v => {
            const primary = (v.status && v.status[0]) || 'IDLE';
            const cfg = getStatusConfig(primary);
            counts[cfg.label] = (counts[cfg.label] || 0) + 1;
        });

        return Object.entries(counts).map(([name, value]) => {
            const cfg = getStatusConfig(name);
            return {
                name,
                value,
                fill: cfg.fill || '#94a3b8'
            };
        });
    }, [fleetList]);

    // Unique Branches
    const activeBranches = useMemo(() => {
        const set = new Set(activeList.map(l => l.branch).filter(Boolean));
        return ['ALL', ...Array.from(set)];
    }, [activeList]);

    const closedBranches = useMemo(() => {
        const set = new Set(closedList.map(l => l.branch).filter(Boolean));
        return ['ALL', ...Array.from(set)];
    }, [closedList]);

    // Group pending containers by container_type
    const pendingGroups = useMemo(() => {
        const groups = {};
        const query = searchPending.toLowerCase().trim();

        pendingContainersSource.forEach(item => {
            if (query) {
                const matches = (
                    (item.pr_no || '').toLowerCase().includes(query) ||
                    (item.branch || '').toLowerCase().includes(query) ||
                    (item.invoice_party || '').toLowerCase().includes(query) ||
                    (item.container_type || '').toLowerCase().includes(query)
                );
                if (!matches) return;
            }

            const type = item.container_type || 'Standard Containers';
            if (!groups[type]) {
                groups[type] = { pendingTotal: 0, totalContainers: 0, createdTotal: 0, items: [] };
            }
            groups[type].pendingTotal += (item.pendingCount || 0);
            groups[type].totalContainers += (item.totalContainers || 0);
            groups[type].createdTotal += (item.lrCreatedContainers || 0);
            groups[type].items.push(item);
        });

        return groups;
    }, [pendingContainersSource, searchPending]);

    // Filtered lists
    const filteredFleet = useMemo(() => {
        let list = fleetList;
        if (fleetStatusFilter !== 'ALL') {
            list = list.filter(v => {
                const primary = (v.status && v.status[0]) || 'IDLE';
                const s = primary.toLowerCase();
                if (fleetStatusFilter === 'TRIP') return s.includes('trip');
                if (fleetStatusFilter === 'LEAVE') return s.includes('leave');
                if (fleetStatusFilter === 'NODRIVER') return s.includes('no driver');
                if (fleetStatusFilter === 'MAINT') return s.includes('maint');
                if (fleetStatusFilter === 'DETENTION') return s.includes('detention');
                if (fleetStatusFilter === 'IDLE') return s.includes('idle') || (!s.includes('trip') && !s.includes('leave') && !s.includes('no driver') && !s.includes('maint'));
                return true;
            });
        }
        if (searchFleet) {
            const q = searchFleet.toLowerCase().trim();
            list = list.filter(v => 
                (v.vehicleNumber || '').toLowerCase().includes(q) ||
                (v.vehicleType || '').toLowerCase().includes(q) ||
                (v.status || []).some(s => s.toLowerCase().includes(q)) ||
                (v.lastSummary || '').toLowerCase().includes(q) ||
                (v.otherStatusText || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [fleetList, fleetStatusFilter, searchFleet]);

    const filteredActive = useMemo(() => {
        let list = activeList;
        if (activeBranchFilter !== 'ALL') {
            list = list.filter(lr => lr.branch === activeBranchFilter);
        }
        if (activeIeFilter !== 'ALL') {
            list = list.filter(lr => (lr.import_export || '').toLowerCase().includes(activeIeFilter.toLowerCase()));
        }
        if (searchActive) {
            const q = searchActive.toLowerCase().trim();
            list = list.filter(lr => 
                (lr.tr_no || '').toLowerCase().includes(q) ||
                (lr.vehicle_no || '').toLowerCase().includes(q) ||
                (lr.container_number || '').toLowerCase().includes(q) ||
                (lr.consignee || '').toLowerCase().includes(q) ||
                (lr.consignor || '').toLowerCase().includes(q) ||
                (lr.branch || '').toLowerCase().includes(q) ||
                (lr.seal_no || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [activeList, activeBranchFilter, activeIeFilter, searchActive]);

    const filteredClosed = useMemo(() => {
        let list = closedList;
        if (closedBranchFilter !== 'ALL') {
            list = list.filter(lr => lr.branch === closedBranchFilter);
        }
        if (searchClosed) {
            const q = searchClosed.toLowerCase().trim();
            list = list.filter(lr => 
                (lr.tr_no || '').toLowerCase().includes(q) ||
                (lr.vehicle_no || '').toLowerCase().includes(q) ||
                (lr.container_number || '').toLowerCase().includes(q) ||
                (lr.consignee || '').toLowerCase().includes(q) ||
                (lr.consignor || '').toLowerCase().includes(q) ||
                (lr.branch || '').toLowerCase().includes(q) ||
                (lr.own_hired || '').toLowerCase().includes(q) ||
                (lr.seal_no || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [closedList, closedBranchFilter, searchClosed]);

    const filteredExceptions = useMemo(() => {
        if (!searchExceptions) return exceptionsList;
        const q = searchExceptions.toLowerCase().trim();
        return exceptionsList.filter(ex => 
            (ex.tr_no || '').toLowerCase().includes(q) ||
            (ex.vehicle_no || '').toLowerCase().includes(q) ||
            (ex.container_number || '').toLowerCase().includes(q) ||
            (ex.exception_remark || '').toLowerCase().includes(q) ||
            (ex.createdBy || '').toLowerCase().includes(q) ||
            (ex.consignee || '').toLowerCase().includes(q)
        );
    }, [exceptionsList, searchExceptions]);

    // CSV Export
    const handleExportCSV = (type = 'active') => {
        let rows = [];
        let filename = `dispatch_report_${targetDate}.csv`;

        if (type === 'active') {
            filename = `active_trips_${targetDate}.csv`;
            rows = [
                ['I/E', 'Branch', 'Type', 'TR No', 'Vehicle', 'Container', 'Seal No', 'Consignee', 'Consignor'],
                ...filteredActive.map(r => [
                    r.import_export || '',
                    r.branch || '',
                    r.type_of_vehicle || r.vehicleType || '',
                    r.tr_no || '',
                    r.vehicle_no || '',
                    r.container_number || '',
                    r.seal_no || '',
                    `"${(r.consignee || '').replace(/"/g, '""')}"`,
                    `"${(r.consignor || '').replace(/"/g, '""')}"`
                ])
            ];
        } else if (type === 'closed') {
            filename = `closed_dispatches_${targetDate}.csv`;
            rows = [
                ['I/E', 'Branch', 'Type', 'TR No', 'Vehicle', 'Container', 'Seal No', 'Consignee', 'Consignor', 'Own/Hired'],
                ...filteredClosed.map(r => [
                    r.import_export || '',
                    r.branch || '',
                    r.type_of_vehicle || r.vehicleType || '',
                    r.tr_no || '',
                    r.vehicle_no || '',
                    r.container_number || '',
                    r.seal_no || '',
                    `"${(r.consignee || '').replace(/"/g, '""')}"`,
                    `"${(r.consignor || '').replace(/"/g, '""')}"`,
                    r.own_hired || ''
                ])
            ];
        } else if (type === 'pending') {
            filename = `pending_containers_${targetDate}.csv`;
            rows = [
                ['PR No', 'Container Type', 'I/E', 'Branch', 'Created LRs', 'Total Containers', 'Pending Count', 'Invoice Party', 'DO Validity'],
                ...pendingContainersSource.map(r => [
                    r.pr_no || '',
                    r.container_type || '',
                    r.import_export || '',
                    r.branch || '',
                    r.lrCreatedContainers || 0,
                    r.totalContainers || 0,
                    r.pendingCount || 0,
                    `"${(r.invoice_party || '').replace(/"/g, '""')}"`,
                    r.do_validity || ''
                ])
            ];
        }

        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(',')).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="fleet-loading">
                <div className="fleet-spinner" />
                <div style={{ marginTop: '1.2rem', color: '#1e293b', fontWeight: 600, fontSize: '13.5px' }}>Loading report details...</div>
            </div>
        );
    }

    return (
        <div className="fleet-root">
            <style>{STYLES}</style>

            {/* ═══════════════════════════════════════════════════════════════════
                TOP CONTROL BAR: DATE NAVIGATOR & STATUS
                ═══════════════════════════════════════════════════════════════════ */}
            <div className="fleet-control-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Radio size={15} color="#4f46e5" />
                        <span style={{ fontSize: '13.5px', color: '#0f172a', fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
                            Date: {formatDateDisplay(targetDate)}
                        </span>
                    </div>
                    {dispatchData && (
                        <span className="status-pill-v2" data-variant={dispatchData.dayClosed ? 'success' : 'warning'}>
                            {dispatchData.dayClosed ? 'Day Closed' : 'Live Operations'}
                        </span>
                    )}
                    {dispatchData?.closedBy && (
                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                            By: <strong style={{ color: '#334155' }}>
                                {typeof dispatchData.closedBy === 'object' ? (dispatchData.closedBy.username || '—') : dispatchData.closedBy}
                            </strong>
                        </span>
                    )}
                </div>

                {/* Date Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '2px' }}>
                        <button 
                            onClick={() => handleShiftDate(-1)} 
                            style={{ background: 'transparent', border: 'none', color: '#475569', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}
                        >
                            <ChevronLeft size={13} /> Prev
                        </button>
                        <input 
                            type="date" 
                            value={targetDate} 
                            onChange={(e) => setTargetDate(e.target.value)} 
                            style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', fontSize: '12px', fontWeight: 700, padding: '3px 6px', outline: 'none' }}
                        />
                        <button 
                            onClick={() => setTargetDate(todayStr)} 
                            style={{ background: 'transparent', border: 'none', color: '#475569', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}
                        >
                            Today
                        </button>
                        <button 
                            onClick={() => handleShiftDate(1)} 
                            style={{ background: 'transparent', border: 'none', color: '#475569', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}
                        >
                            Next <ChevronRight size={13} />
                        </button>
                    </div>

                    <button 
                        className="fleet-export-btn"
                        style={{ borderColor: '#4f46e5', color: '#4f46e5' }}
                        onClick={() => loadReportData(targetDate)}
                        disabled={loading}
                    >
                        {loading ? <div className="fleet-spinner" style={{ width: 12, height: 12 }} /> : <RefreshCw size={12} />}
                        Refresh
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ padding: '10px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#b91c1c', fontSize: '12.5px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={15} /> {error}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                EXECUTIVE KPI COMMAND TILES
                ═══════════════════════════════════════════════════════════════════ */}
            <div className="fleet-kpi-grid">
                {/* KPI 1: Fleet Deployment */}
                <KpiCard 
                    label="Fleet Deployment"
                    value={metrics.totalFleet}
                    unit="Vehicles"
                    pct={metrics.fleetUtilization}
                    color="#2563eb"
                    accentColor="#3b82f6"
                    gradient="linear-gradient(135deg, rgba(59, 130, 246, 0.04) 0%, rgba(255, 255, 255, 0.95) 100%)"
                    border="1px solid rgba(59, 130, 246, 0.2)"
                    active={activeTab === 'fleet'}
                    onClick={() => setActiveTab('fleet')}
                    subtext={
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            <span className="sub-badge" style={{ color: '#059669' }}>{metrics.underTrip} Trip</span>
                            <span className="sub-badge" style={{ color: '#d97706' }}>{metrics.driverLeave + metrics.noDriver} Drivers</span>
                            <span className="sub-badge" style={{ color: '#2563eb' }}>{metrics.maintenance} Maint</span>
                        </div>
                    }
                />

                {/* KPI 2: In-Transit Trips */}
                <KpiCard 
                    label="In-Transit Trips"
                    value={metrics.activeTotal}
                    unit="Live LRs"
                    color="#059669"
                    accentColor="#10b981"
                    gradient="linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(255, 255, 255, 0.95) 100%)"
                    border="1px solid rgba(16, 185, 129, 0.2)"
                    active={activeTab === 'active'}
                    onClick={() => setActiveTab('active')}
                    subtext={
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            <span className="sub-badge" style={{ color: '#0284c7' }}>{metrics.activeImport} Import</span>
                            <span className="sub-badge" style={{ color: '#d97706' }}>{metrics.activeSales} Sales</span>
                            {metrics.activeExport > 0 && <span className="sub-badge" style={{ color: '#15803d' }}>{metrics.activeExport} Export</span>}
                        </div>
                    }
                />

                {/* KPI 3: Closed Dispatches */}
                <KpiCard 
                    label="Closed Dispatches"
                    value={metrics.closedTotal}
                    unit="Completed"
                    color="#d97706"
                    accentColor="#f59e0b"
                    gradient="linear-gradient(135deg, rgba(245, 158, 11, 0.04) 0%, rgba(255, 255, 255, 0.95) 100%)"
                    border="1px solid rgba(245, 158, 11, 0.2)"
                    active={activeTab === 'closed'}
                    onClick={() => setActiveTab('closed')}
                    subtext={
                        <span style={{ color: '#059669', fontWeight: 700 }}>✓ {metrics.closedTotal} Dispatched Today</span>
                    }
                />

                {/* KPI 4: Pending Queue */}
                <KpiCard 
                    label="Pending Queue"
                    value={metrics.totalPendingContainers}
                    unit="Containers"
                    color="#4f46e5"
                    accentColor="#6366f1"
                    gradient="linear-gradient(135deg, rgba(99, 102, 241, 0.04) 0%, rgba(255, 255, 255, 0.95) 100%)"
                    border="1px solid rgba(99, 102, 241, 0.2)"
                    active={activeTab === 'pending'}
                    onClick={() => setActiveTab('pending')}
                    subtext={
                        metrics.urgentDoCount > 0 ? (
                            <span style={{ color: '#dc2626', fontWeight: 700 }}>⚠️ {metrics.urgentDoCount} DOs Expiring Soon ({metrics.totalPendingPRs} PRs)</span>
                        ) : (
                            <span style={{ color: '#4f46e5', fontWeight: 600 }}>{metrics.totalPendingPRs} PRs Awaiting</span>
                        )
                    }
                />

                {/* KPI 5: Exceptions */}
                <KpiCard 
                    label="Exceptions & Alerts"
                    value={metrics.exceptionsTotal}
                    unit="Incidents"
                    color={metrics.exceptionsTotal > 0 ? '#dc2626' : '#059669'}
                    accentColor={metrics.exceptionsTotal > 0 ? '#ef4444' : '#10b981'}
                    gradient={metrics.exceptionsTotal > 0 ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(255, 255, 255, 0.95) 100%)' : 'linear-gradient(135deg, rgba(16, 185, 129, 0.04) 0%, rgba(255, 255, 255, 0.95) 100%)'}
                    border={metrics.exceptionsTotal > 0 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)'}
                    active={activeTab === 'exceptions'}
                    onClick={() => setActiveTab('exceptions')}
                    subtext={
                        metrics.exceptionsTotal === 0 ? (
                            <span style={{ color: '#059669', fontWeight: 700 }}>✓ All Clear • Zero Exceptions</span>
                        ) : (
                            <span style={{ color: '#dc2626', fontWeight: 700 }}>⚠️ {metrics.exceptionsTotal} Action Required</span>
                        )
                    }
                />
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                INTERACTIVE TAB NAVIGATION BAR
                ═══════════════════════════════════════════════════════════════════ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div className="fleet-tabs">
                    {[
                        { id: 'overview', label: '📊 Command Center' },
                        { id: 'fleet', label: '🚚 Fleet Matrix', count: fleetList.length },
                        { id: 'active', label: '🚀 Active Trips', count: activeList.length },
                        { id: 'closed', label: '✅ Closed Dispatches', count: closedList.length },
                        { id: 'pending', label: '📦 Pending Queue', count: `${pendingContainersSource.length} PRs` },
                        { id: 'exceptions', label: '⚠️ Exceptions', count: exceptionsList.length, alert: metrics.exceptionsTotal > 0 },
                        { id: 'all', label: '📋 All Sections' }
                    ].map(tab => {
                        if (tab.id === 'fleet' && fleetList.length === 0) return null;
                        return (
                            <button 
                                key={tab.id} 
                                className="fleet-tab" 
                                data-active={String(activeTab === tab.id)}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label}
                                {tab.count !== undefined && (
                                    <span 
                                        className="fleet-tab-badge" 
                                        style={tab.alert ? { background: '#fee2e2', color: '#b91c1c' } : {}}
                                    >
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <button className="fleet-export-btn" onClick={() => handleExportCSV(activeTab === 'pending' ? 'pending' : activeTab === 'closed' ? 'closed' : 'active')}>
                    <Download size={12} /> Export Report CSV
                </button>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                TAB 1: COMMAND CENTER EXECUTIVE OVERVIEW
                ═══════════════════════════════════════════════════════════════════ */}
            {(activeTab === 'overview') && (
                <div className="fleet-overview-grid">
                    {/* Left Column: Live Active Spotlight & Pending Queue */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
                        {/* Live Active Trips Table Card */}
                        <div className="fleet-table-wrap">
                            <div style={{ padding: '14px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
                                        🚀 Live In-Transit Trips
                                    </h3>
                                    <span className="status-pill-v2" data-variant="success">{activeList.length} Active</span>
                                </div>
                                <button className="fleet-tab" style={{ padding: '4px 10px', fontSize: '11.5px' }} onClick={() => setActiveTab('active')}>
                                    View All ({activeList.length}) <ChevronRight size={11} />
                                </button>
                            </div>
                            <div className="fleet-table-scroll">
                                <table className="fleet-table" style={{ minWidth: '560px' }}>
                                    <thead>
                                        <tr>
                                            <th>I/E</th>
                                            <th>TR No</th>
                                            <th>Vehicle</th>
                                            <th>Container</th>
                                            <th>Consignee</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeList.slice(0, 6).map((lr, idx) => (
                                            <tr key={idx}>
                                                <td>{getIeBadge(lr.import_export)}</td>
                                                <td>
                                                    <span className="tm-mono" style={{ fontWeight: 800, color: '#0f172a', fontSize: '12px' }}>{lr.tr_no}</span>
                                                    <CopyButton text={lr.tr_no} />
                                                </td>
                                                <td><LicensePlate number={lr.vehicle_no} /></td>
                                                <td>
                                                    <span className="tm-mono" style={{ color: '#0284c7', fontWeight: 700, fontSize: '12px' }}>
                                                        {lr.container_number || '—'}
                                                    </span>
                                                </td>
                                                <td style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lr.consignee}>
                                                    {lr.consignee || '—'}
                                                </td>
                                            </tr>
                                        ))}
                                        {activeList.length === 0 && (
                                            <tr>
                                                <td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>
                                                    No active trips currently in transit
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Urgent Pending Containers Radar */}
                        <div className="fleet-table-wrap">
                            <div style={{ padding: '14px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
                                        📦 Urgent Pending PRs
                                    </h3>
                                    <span className="status-pill-v2" data-variant="neutral">{pendingContainersSource.length} PRs</span>
                                </div>
                                <button className="fleet-tab" style={{ padding: '4px 10px', fontSize: '11.5px' }} onClick={() => setActiveTab('pending')}>
                                    Full Queue ({pendingContainersSource.length}) <ChevronRight size={11} />
                                </button>
                            </div>
                            <div className="fleet-table-scroll">
                                <table className="fleet-table" style={{ minWidth: '580px' }}>
                                    <thead>
                                        <tr>
                                            <th>PR No</th>
                                            <th>Type</th>
                                            <th>Progress</th>
                                            <th>Party</th>
                                            <th>DO Validity</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingContainersSource.slice(0, 5).map((item, idx) => {
                                            const total = item.totalContainers || 0;
                                            const created = item.lrCreatedContainers || 0;
                                            const pct = total > 0 ? Math.round((created / total) * 100) : 0;
                                            return (
                                                <tr key={idx}>
                                                    <td style={{ whiteSpace: 'nowrap' }}>
                                                        <span className="tm-mono" style={{ fontWeight: 800, fontSize: '12px' }}>{item.pr_no}</span>
                                                        <CopyButton text={item.pr_no} />
                                                    </td>
                                                    <td style={{ whiteSpace: 'nowrap' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                                                            {item.container_type || '20 Dry'}
                                                        </span>
                                                    </td>
                                                    <td style={{ whiteSpace: 'nowrap' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', minWidth: '60px' }}>{created}/{total} ({pct}%)</span>
                                                            <div style={{ width: '60px', height: '5px', background: '#e2e8f0', borderRadius: '100px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#10b981' : pct > 0 ? '#3b82f6' : '#94a3b8' }} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.invoice_party}>
                                                        {item.invoice_party}
                                                    </td>
                                                    <td>
                                                        {getDoValidityBadge(item.do_validity, targetDate)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {pendingContainersSource.length === 0 && (
                                            <tr>
                                                <td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>
                                                    No pending containers in queue
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Fleet Status Donut Chart & Closed Dispatches */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', minWidth: 0 }}>
                        {/* Status Distribution Donut Chart (If fleet data exists) */}
                        {statusDistribution.length > 0 && (
                            <div className="fleet-chart-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                    <div>
                                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14.5px', fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
                                            🔵 Fleet Status Matrix
                                        </h3>
                                        <span style={{ fontSize: '11.5px', color: '#64748b' }}>Live vehicle deployment</span>
                                    </div>
                                    <button className="fleet-tab" style={{ padding: '4px 10px', fontSize: '11.5px' }} onClick={() => setActiveTab('fleet')}>
                                        Inspect <ChevronRight size={11} />
                                    </button>
                                </div>
                                <div style={{ width: '100%', maxWidth: 220, height: 210, marginTop: '6px', position: 'relative' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie 
                                                data={statusDistribution} 
                                                cx="50%" cy="50%" 
                                                innerRadius={54} outerRadius={84}
                                                paddingAngle={3} dataKey="value" nameKey="name" strokeWidth={0}
                                            >
                                                {statusDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                            </Pie>
                                            <Pie data={[{ value: 1 }]} cx="50%" cy="50%" innerRadius={0} outerRadius={0} dataKey="value">
                                                <DonutLabel viewBox={{ cx: 110, cy: 105 }} total={fleetList.length} />
                                            </Pie>
                                            <RechartsTooltip content={<DonutTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                {/* Legend */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', justifyContent: 'center', marginTop: '6px', width: '100%' }}>
                                    {statusDistribution.map((d, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#475569', background: 'rgba(0,0,0,0.02)', padding: '2px 7px', borderRadius: '5px', border: '1px solid rgba(0,0,0,0.04)', whiteSpace: 'nowrap' }}>
                                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.fill, display: 'inline-block' }} />
                                            {d.name} ({d.value})
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recent Closed Summary Widget */}
                        <div className="fleet-table-wrap" style={{ padding: '16px 18px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                                <div>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        Completed Trips
                                    </div>
                                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
                                        {closedList.length} <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>closed on date</span>
                                    </div>
                                </div>
                                <button className="fleet-tab" style={{ padding: '4px 10px', fontSize: '11.5px' }} onClick={() => setActiveTab('closed')}>
                                    All ({closedList.length}) <ChevronRight size={11} />
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {closedList.slice(0, 4).map((c, idx) => (
                                    <div key={idx} style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                                            <strong className="tm-mono" style={{ color: '#0f172a', fontSize: '11.5px' }}>{c.tr_no}</strong>
                                            <span style={{ color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.vehicle_no}</span>
                                        </div>
                                        <span className="status-pill-v2" data-variant="success">✓ Closed</span>
                                    </div>
                                ))}
                                {closedList.length === 0 && (
                                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '16px', fontSize: '12px' }}>
                                        No closed dispatches recorded for this date
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                TAB 2: FLEET STATUS MATRIX
                ═══════════════════════════════════════════════════════════════════ */}
            {(activeTab === 'fleet' || activeTab === 'all') && fleetList.length > 0 && (
                <div className="fleet-table-wrap">
                    <div style={{ padding: '14px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
                                🚚 Fleet Status Matrix
                            </h3>
                            <span className="status-pill-v2" data-variant="neutral">{fleetList.length} Total</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                                <Search size={13} style={{ position: 'absolute', left: 10, color: '#94a3b8' }} />
                                <input 
                                    type="text" 
                                    placeholder="Search vehicle..." 
                                    className="fleet-search-input"
                                    value={searchFleet} 
                                    onChange={e => setSearchFleet(e.target.value)} 
                                />
                                {searchFleet && (
                                    <button onClick={() => setSearchFleet('')} style={{ position: 'absolute', right: 8, background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                        <X size={11} />
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '2px', background: '#f8fafc' }}>
                                <button 
                                    onClick={() => setFleetViewMode('grid')}
                                    style={{ background: fleetViewMode === 'grid' ? '#ffffff' : 'transparent', border: 'none', borderRadius: '6px', padding: '4px 7px', cursor: 'pointer', color: fleetViewMode === 'grid' ? '#0f172a' : '#64748b', display: 'flex', alignItems: 'center', boxShadow: fleetViewMode === 'grid' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}
                                    title="Grid View"
                                >
                                    <Grid size={13} />
                                </button>
                                <button 
                                    onClick={() => setFleetViewMode('table')}
                                    style={{ background: fleetViewMode === 'table' ? '#ffffff' : 'transparent', border: 'none', borderRadius: '6px', padding: '4px 7px', cursor: 'pointer', color: fleetViewMode === 'table' ? '#0f172a' : '#64748b', display: 'flex', alignItems: 'center', boxShadow: fleetViewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none' }}
                                    title="Table View"
                                >
                                    <List size={13} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Filter Pills */}
                    <div style={{ padding: '8px 18px', background: '#ffffff', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {[
                            { key: 'ALL', label: `All (${fleetList.length})` },
                            { key: 'TRIP', label: `🚚 Under Trip (${metrics.underTrip})` },
                            { key: 'LEAVE', label: `👤 Leave (${metrics.driverLeave})` },
                            { key: 'NODRIVER', label: `⚠️ No Driver (${metrics.noDriver})` },
                            { key: 'MAINT', label: `🔧 Maintenance (${metrics.maintenance})` },
                            { key: 'IDLE', label: `⏸️ Idle (${metrics.idle})` }
                        ].map(f => (
                            <button 
                                key={f.key}
                                onClick={() => setFleetStatusFilter(f.key)}
                                style={{
                                    padding: '4px 10px', borderRadius: '100px', fontSize: '11.5px', fontWeight: 700,
                                    border: fleetStatusFilter === f.key ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                                    background: fleetStatusFilter === f.key ? '#4f46e5' : '#f8fafc',
                                    color: fleetStatusFilter === f.key ? '#ffffff' : '#475569',
                                    cursor: 'pointer', transition: 'all 0.15s ease', fontFamily: "'Outfit', sans-serif",
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {fleetViewMode === 'grid' ? (
                        <div className="fleet-vehicle-grid">
                            {filteredFleet.map((v, idx) => {
                                const primaryStatus = (v.status && v.status[0]) || 'IDLE';
                                const cfg = getStatusConfig(primaryStatus);
                                const StatusIcon = cfg.icon;
                                return (
                                    <div key={idx} className="fleet-vehicle-card" style={{ borderTopColor: cfg.fill }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                            <LicensePlate number={v.vehicleNumber} />
                                            <span className="status-pill-v2" data-variant={cfg.variant}>
                                                <StatusIcon size={10} /> {cfg.label}
                                            </span>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{v.vehicleType || 'Commercial Vehicle'}</div>
                                            {v.otherStatusText && (
                                                <div style={{ fontSize: '11.5px', color: '#475569', fontWeight: 700, marginTop: '2px' }}>{v.otherStatusText}</div>
                                            )}
                                        </div>
                                        <div style={{ paddingTop: '6px', borderTop: '1px solid #f1f5f9', fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                                            <span>Last Action</span>
                                            <strong style={{ color: '#0f172a', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.lastSummary || '—'}</strong>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="fleet-table-scroll">
                            <table className="fleet-table" style={{ minWidth: '650px' }}>
                                <thead>
                                    <tr>
                                        <th>Vehicle No</th>
                                        <th>Vehicle Type</th>
                                        <th>Status</th>
                                        <th>Details</th>
                                        <th>Last Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredFleet.map((v, idx) => {
                                        const primaryStatus = (v.status && v.status[0]) || 'IDLE';
                                        const cfg = getStatusConfig(primaryStatus);
                                        const StatusIcon = cfg.icon;
                                        return (
                                            <tr key={idx}>
                                                <td><LicensePlate number={v.vehicleNumber} /></td>
                                                <td style={{ color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>{v.vehicleType || '—'}</td>
                                                <td>
                                                    <span className="status-pill-v2" data-variant={cfg.variant}>
                                                        <StatusIcon size={10} /> {cfg.label}
                                                    </span>
                                                </td>
                                                <td style={{ color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.otherStatusText || '-'}</td>
                                                <td style={{ color: '#475569', fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.lastSummary || '-'}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                TAB 3: ACTIVE IN-TRANSIT TRIPS
                ═══════════════════════════════════════════════════════════════════ */}
            {(activeTab === 'active' || activeTab === 'all') && (
                <div className="fleet-table-wrap">
                    <div style={{ padding: '14px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
                                🚀 Active In-Transit Trips
                            </h3>
                            <span className="status-pill-v2" data-variant="success">{activeList.length} Active LRs</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <select 
                                style={{ padding: '5px 8px', borderRadius: '7px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, outline: 'none', background: '#ffffff' }}
                                value={activeBranchFilter}
                                onChange={e => setActiveBranchFilter(e.target.value)}
                            >
                                <option value="ALL">All Branches ({activeList.length})</option>
                                {activeBranches.filter(b => b !== 'ALL').map((b, i) => <option key={i} value={b}>{b}</option>)}
                            </select>
                            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                                <Search size={13} style={{ position: 'absolute', left: 10, color: '#94a3b8' }} />
                                <input 
                                    type="text" 
                                    placeholder="Search TR, Vehicle..." 
                                    className="fleet-search-input"
                                    value={searchActive} 
                                    onChange={e => setSearchActive(e.target.value)} 
                                />
                                {searchActive && (
                                    <button onClick={() => setSearchActive('')} style={{ position: 'absolute', right: 8, background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                        <X size={11} />
                                    </button>
                                )}
                            </div>
                            <button className="fleet-export-btn" onClick={() => handleExportCSV('active')}>
                                <Download size={11} /> Export
                            </button>
                        </div>
                    </div>

                    <div className="fleet-table-scroll">
                        <table className="fleet-table" style={{ minWidth: '780px' }}>
                            <thead>
                                <tr>
                                    <th>I/E</th>
                                    <th>Branch</th>
                                    <th>Vehicle Type</th>
                                    <th>TR No</th>
                                    <th>Vehicle No</th>
                                    <th>Container No</th>
                                    <th>Seal No</th>
                                    <th>Consignee</th>
                                    <th>Consignor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredActive.map((lr, idx) => (
                                    <tr key={idx}>
                                        <td>{getIeBadge(lr.import_export)}</td>
                                        <td>
                                            <span className="sub-badge" style={{ color: '#475569' }}>
                                                <Building2 size={10} /> {lr.branch || '—'}
                                            </span>
                                        </td>
                                        <td style={{ color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>{lr.type_of_vehicle || lr.vehicleType || '—'}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <span className="tm-mono" style={{ fontWeight: 800, color: '#0f172a', fontSize: '12px' }}>{lr.tr_no}</span>
                                            <CopyButton text={lr.tr_no} />
                                        </td>
                                        <td><LicensePlate number={lr.vehicle_no} /></td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <span className="tm-mono" style={{ color: '#0284c7', fontWeight: 800, fontSize: '12px' }}>{lr.container_number || '—'}</span>
                                            {lr.container_number && <CopyButton text={lr.container_number} />}
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <span className="tm-mono" style={{ color: '#64748b', fontSize: '12px' }}>{lr.seal_no || '-'}</span>
                                        </td>
                                        <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lr.consignee}>
                                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{lr.consignee || '—'}</span>
                                        </td>
                                        <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lr.consignor}>
                                            <span style={{ color: '#64748b' }}>{lr.consignor || '—'}</span>
                                        </td>
                                    </tr>
                                ))}
                                {filteredActive.length === 0 && (
                                    <tr>
                                        <td colSpan="9" style={{ textAlign: 'center', color: '#94a3b8', padding: '36px' }}>
                                            No active trips matching search filters
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                TAB 4: CLOSED DISPATCHES
                ═══════════════════════════════════════════════════════════════════ */}
            {(activeTab === 'closed' || activeTab === 'all') && (
                <div className="fleet-table-wrap">
                    <div style={{ padding: '14px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
                                ✅ Closed Dispatches
                            </h3>
                            <span className="status-pill-v2" data-variant="success">{closedList.length} Completed</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                                <Search size={13} style={{ position: 'absolute', left: 10, color: '#94a3b8' }} />
                                <input 
                                    type="text" 
                                    placeholder="Search Closed TR..." 
                                    className="fleet-search-input"
                                    value={searchClosed} 
                                    onChange={e => setSearchClosed(e.target.value)} 
                                />
                                {searchClosed && (
                                    <button onClick={() => setSearchClosed('')} style={{ position: 'absolute', right: 8, background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                        <X size={11} />
                                    </button>
                                )}
                            </div>
                            <button className="fleet-export-btn" onClick={() => handleExportCSV('closed')}>
                                <Download size={11} /> Export CSV
                            </button>
                        </div>
                    </div>

                    <div className="fleet-table-scroll">
                        <table className="fleet-table" style={{ minWidth: '880px' }}>
                            <thead>
                                <tr>
                                    <th>I/E</th>
                                    <th>Branch</th>
                                    <th>Vehicle Type</th>
                                    <th>TR No</th>
                                    <th>Vehicle No</th>
                                    <th>Container No</th>
                                    <th>Seal No</th>
                                    <th>Consignee</th>
                                    <th>Consignor</th>
                                    <th>Own/Hired</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredClosed.map((lr, idx) => (
                                    <tr key={idx}>
                                        <td>{getIeBadge(lr.import_export)}</td>
                                        <td>
                                            <span className="sub-badge" style={{ color: '#475569' }}>
                                                <Building2 size={10} /> {lr.branch || '—'}
                                            </span>
                                        </td>
                                        <td style={{ color: '#475569', fontWeight: 600, whiteSpace: 'nowrap' }}>{lr.type_of_vehicle || lr.vehicleType || '—'}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <span className="tm-mono" style={{ fontWeight: 800, color: '#0f172a', fontSize: '12px' }}>{lr.tr_no}</span>
                                            <CopyButton text={lr.tr_no} />
                                        </td>
                                        <td><LicensePlate number={lr.vehicle_no} /></td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <span className="tm-mono" style={{ color: '#0284c7', fontWeight: 800, fontSize: '12px' }}>{lr.container_number || '—'}</span>
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <span className="tm-mono" style={{ color: '#64748b', fontSize: '12px' }}>{lr.seal_no || '-'}</span>
                                        </td>
                                        <td style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lr.consignee}>
                                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{lr.consignee || '—'}</span>
                                        </td>
                                        <td style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={lr.consignor}>
                                            <span style={{ color: '#64748b' }}>{lr.consignor || '—'}</span>
                                        </td>
                                        <td>
                                            <span className="status-pill-v2" data-variant={lr.own_hired === 'Own' ? 'success' : 'neutral'}>
                                                {lr.own_hired || '-'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {filteredClosed.length === 0 && (
                                    <tr>
                                        <td colSpan="10" style={{ textAlign: 'center', color: '#94a3b8', padding: '36px' }}>
                                            No closed dispatches recorded for this date
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                TAB 5: PENDING CONTAINERS QUEUE
                ═══════════════════════════════════════════════════════════════════ */}
            {(activeTab === 'pending' || activeTab === 'all') && (
                <div className="fleet-table-wrap">
                    <div style={{ padding: '14px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
                                📦 Pending Containers Dispatch Queue
                            </h3>
                            <span className="status-pill-v2" data-variant="neutral">{pendingContainersSource.length} PRs Awaiting</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                                <Search size={13} style={{ position: 'absolute', left: 10, color: '#94a3b8' }} />
                                <input 
                                    type="text" 
                                    placeholder="Search PR No, Party..." 
                                    className="fleet-search-input"
                                    value={searchPending} 
                                    onChange={e => setSearchPending(e.target.value)} 
                                />
                                {searchPending && (
                                    <button onClick={() => setSearchPending('')} style={{ position: 'absolute', right: 8, background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                        <X size={11} />
                                    </button>
                                )}
                            </div>
                            <button className="fleet-export-btn" onClick={() => handleExportCSV('pending')}>
                                <Download size={11} /> Export CSV
                            </button>
                        </div>
                    </div>

                    {Object.keys(pendingGroups).length > 0 ? (
                        Object.entries(pendingGroups).map(([groupType, groupData], gIdx) => (
                            <div key={gIdx} style={{ borderBottom: gIdx < Object.keys(pendingGroups).length - 1 ? '6px solid #f8fafc' : 'none' }}>
                                <div style={{ background: '#f8fafc', padding: '10px 18px', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Package size={15} color="#4f46e5" />
                                        <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>{groupType}</span>
                                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>({groupData.items.length} PRs)</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 800 }}>
                                        <span style={{ color: groupData.pendingTotal > 0 ? '#b45309' : '#059669' }}>{groupData.pendingTotal} Pending</span>
                                        <span style={{ color: '#cbd5e1' }}>/</span>
                                        <span style={{ color: '#475569' }}>{groupData.totalContainers} Total</span>
                                    </div>
                                </div>
                                <div className="fleet-table-scroll">
                                    <table className="fleet-table" style={{ minWidth: '720px' }}>
                                        <thead>
                                            <tr>
                                                <th>PR No</th>
                                                <th>I/E</th>
                                                <th>Branch</th>
                                                <th>LR Creation Progress</th>
                                                <th>Invoice Party</th>
                                                <th>DO Validity Radar</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {groupData.items.map((item, idx) => {
                                                const total = item.totalContainers || 0;
                                                const created = item.lrCreatedContainers || 0;
                                                const pct = total > 0 ? Math.round((created / total) * 100) : 0;

                                                return (
                                                    <tr key={idx}>
                                                        <td style={{ whiteSpace: 'nowrap' }}>
                                                            <span className="tm-mono" style={{ fontWeight: 800, color: '#0f172a', fontSize: '12px' }}>{item.pr_no}</span>
                                                            <CopyButton text={item.pr_no} />
                                                        </td>
                                                        <td>{getIeBadge(item.import_export)}</td>
                                                        <td>
                                                            <span className="sub-badge" style={{ color: '#475569' }}>
                                                                <Building2 size={10} /> {item.branch || '—'}
                                                            </span>
                                                        </td>
                                                        <td style={{ whiteSpace: 'nowrap' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', minWidth: '60px' }}>{created}/{total} ({pct}%)</span>
                                                                <div style={{ width: '60px', height: '5px', background: '#e2e8f0', borderRadius: '100px', overflow: 'hidden' }}>
                                                                    <div 
                                                                        style={{ 
                                                                            width: `${pct}%`, height: '100%',
                                                                            background: pct === 100 ? '#10b981' : pct > 0 ? '#3b82f6' : '#94a3b8' 
                                                                        }} 
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.invoice_party}>
                                                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{item.invoice_party}</span>
                                                        </td>
                                                        <td>
                                                            {getDoValidityBadge(item.do_validity, targetDate)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                            <Package size={26} color="#cbd5e1" />
                            <div style={{ marginTop: '6px', fontWeight: 600, fontSize: '12.5px' }}>No pending containers found matching your search.</div>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                TAB 6: OPERATIONAL EXCEPTIONS
                ═══════════════════════════════════════════════════════════════════ */}
            {(activeTab === 'exceptions' || activeTab === 'all') && (
                <div className="fleet-table-wrap">
                    <div style={{ padding: '14px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
                                ⚠️ Operational Exceptions & Incidents
                            </h3>
                            <span className="status-pill-v2" data-variant={exceptionsList.length > 0 ? 'error' : 'success'}>
                                {exceptionsList.length} Incidents
                            </span>
                        </div>
                        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                            <Search size={13} style={{ position: 'absolute', left: 10, color: '#94a3b8' }} />
                            <input 
                                type="text" 
                                placeholder="Search Exceptions..." 
                                className="fleet-search-input"
                                value={searchExceptions} 
                                onChange={e => setSearchExceptions(e.target.value)} 
                            />
                            {searchExceptions && (
                                <button onClick={() => setSearchExceptions('')} style={{ position: 'absolute', right: 8, background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                                    <X size={11} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="fleet-table-scroll">
                        <table className="fleet-table" style={{ minWidth: '820px' }}>
                            <thead>
                                <tr>
                                    <th>I/E</th>
                                    <th>Branch</th>
                                    <th>Vehicle Type</th>
                                    <th>Party</th>
                                    <th>TR No</th>
                                    <th>Vehicle</th>
                                    <th>Container No</th>
                                    <th>Seal No</th>
                                    <th>Exception Remark</th>
                                    <th>Reported By</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredExceptions.map((ex, idx) => (
                                    <tr key={idx}>
                                        <td>{getIeBadge(ex.import_export)}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{ex.branch || '-'}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{ex.type_of_vehicle || '-'}</td>
                                        <td style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ex.consignee || '-'}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <span className="tm-mono" style={{ fontWeight: 800, fontSize: '12px' }}>{ex.tr_no || '-'}</span>
                                        </td>
                                        <td><LicensePlate number={ex.vehicle_no} /></td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <span className="tm-mono" style={{ color: '#0284c7', fontWeight: 700, fontSize: '12px' }}>{ex.container_number || '-'}</span>
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>
                                            <span className="tm-mono" style={{ fontSize: '12px' }}>{ex.seal_no || '-'}</span>
                                        </td>
                                        <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            <span style={{ color: '#dc2626', fontWeight: 700 }}>{ex.exception_remark || '-'}</span>
                                        </td>
                                        <td style={{ whiteSpace: 'nowrap' }}>{ex.createdBy || '-'}</td>
                                    </tr>
                                ))}
                                {filteredExceptions.length === 0 && (
                                    <tr>
                                        <td colSpan="10" style={{ textAlign: 'center', color: '#059669', padding: '32px', fontWeight: 700 }}>
                                            <ShieldCheck size={28} color="#10b981" style={{ margin: '0 auto 6px' }} />
                                            <div>All Clear! No operational exceptions recorded for this date.</div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransportMonitoringReport;
