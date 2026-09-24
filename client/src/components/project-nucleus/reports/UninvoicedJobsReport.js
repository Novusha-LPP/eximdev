import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import axios from 'axios';
import {
    Search,
    Download,
    RefreshCw,
    FileText,
    Copy,
    Check,
    X,
    Truck,
    Building2,
    Layers,
    AlertTriangle,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    ChevronDown,
    ShieldCheck,
    MapPin,
    Users,
    BarChart3
} from 'lucide-react';
import { TRANSPORT_BASE, TRANSPORT_HEADERS, getTransportDates } from './reports-helper';

// ─── Known Branch Metadata & Mappings ───────────────────────────────────────────────

export const BRANCH_METADATA = {
    KHD: { code: 'KHD', name: 'ICD Khodiyar', city: 'Ahmedabad', group: 'AMD', groupLabel: 'Ahmedabad Hub' },
    SND: { code: 'SND', name: 'ICD Sanand', city: 'Sanand', group: 'AMD', groupLabel: 'Ahmedabad Hub' },
    MND: { code: 'MND', name: 'Mundra Port', city: 'Mundra', group: 'GIM', groupLabel: 'Gandhidham Hub' },
    AUTO: { code: 'AUTO', name: 'Automove Hub', city: 'Automove', group: 'AUTO', groupLabel: 'Automove Hub' },
    SFPL: { code: 'SFPL', name: 'Suraj Forwarders', city: 'Suraj Logistics', group: 'SFPL', groupLabel: 'Suraj Forwarders' }
};

// Canonical 5 branch rows matching the user's Excel report
export const CANONICAL_BRANCHES = [
    { key: 'SFPL', label: 'SFPL' },
    { key: 'SND', label: 'Sanand' },
    { key: 'KHD', label: 'Khodiyar' },
    { key: 'AUTO', label: 'Auto' },
    { key: 'MND', label: 'Mundra' }
];

export const CANONICAL_BRANCH_MAP = {
    KHD: { key: 'KHD', label: 'Khodiyar' },
    SND: { key: 'SND', label: 'Sanand' },
    MND: { key: 'MND', label: 'Mundra' },
    SFPL: { key: 'SFPL', label: 'SFPL' },
    AUTO: { key: 'AUTO', label: 'Auto' }
};

export const FY_MONTH_ORDER = [3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2];
export const MONTH_NAMES = {
    3: 'April', 4: 'May', 5: 'June', 6: 'July', 7: 'Aug', 8: 'Sep',
    9: 'Oct', 10: 'Nov', 11: 'Dec', 0: 'Jan', 1: 'Feb', 2: 'March'
};

export const BRANCH_UI_CONFIG = {
    SFPL: {
        code: 'SFPL',
        label: 'SFPL',
        fullName: 'Suraj Forwarders',
        color: '#8b5cf6',
        bg: 'rgba(139, 92, 246, 0.12)',
        dot: '#8b5cf6'
    },
    SND: {
        code: 'SND',
        label: 'Sanand',
        fullName: 'ICD Sanand',
        color: '#0284c7',
        bg: 'rgba(2, 132, 199, 0.12)',
        dot: '#0284c7'
    },
    KHD: {
        code: 'KHD',
        label: 'Khodiyar',
        fullName: 'ICD Khodiyar',
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.12)',
        dot: '#10b981'
    },
    AUTO: {
        code: 'AUTO',
        label: 'Auto',
        fullName: 'Automove Hub',
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.12)',
        dot: '#f59e0b'
    },
    MND: {
        code: 'MND',
        label: 'Mundra',
        fullName: 'Mundra Port',
        color: '#6366f1',
        bg: 'rgba(99, 102, 241, 0.12)',
        dot: '#6366f1'
    }
};


export const BRANCH_ALIASES = {
    // Khodiyar
    KHD: 'KHD',
    KHODIYAR: 'KHD',
    INSBI7: 'KHD',
    INSBI9: 'KHD',

    // Sanand
    SND: 'SND',
    SANAND: 'SND',
    INSBI6: 'SND',

    // Mundra
    MND: 'MND',
    MUNDRA: 'MND',
    INMUN1: 'MND',

    // Automove (Prefixes ACC and ATM belong to Automove Hub)
    AUTO: 'AUTO',
    AUTOMOVE: 'AUTO',
    ACC: 'AUTO',
    ATM: 'AUTO',

    // Suraj Forwarders
    SFPL: 'SFPL',
    SURAJ: 'SFPL',
    SR: 'SFPL',
    SRCC: 'SFPL'
};

export const resolveJobBranch = (job) => {
    if (!job) return 'UNKNOWN';
    if (job.branch && String(job.branch).trim()) {
        const raw = String(job.branch).trim().toUpperCase();
        return BRANCH_ALIASES[raw] || raw;
    }
    // Fallback: extract branch code from TR/LR number (e.g. LR/KHD/01847/26-27 or LR/ACC/00272/25-26)
    if (job.tr_no) {
        const parts = String(job.tr_no).split('/');
        if (parts.length >= 2 && parts[1]) {
            const raw = parts[1].trim().toUpperCase();
            return BRANCH_ALIASES[raw] || raw;
        }
    }
    // Fallback: extract branch code from PR number (e.g. PR/KHD/01195/26-27 or PR/ACC/00063/25-26)
    if (job.pr_no) {
        const parts = String(job.pr_no).split('/');
        if (parts.length >= 2 && parts[1]) {
            const raw = parts[1].trim().toUpperCase();
            return BRANCH_ALIASES[raw] || raw;
        }
    }
    return 'UNKNOWN';
};

export const matchesBranchFilter = (jobBranch, selectedFilter) => {
    if (!selectedFilter || selectedFilter === 'all' || selectedFilter === 'ALL') return true;
    const cleanFilter = String(selectedFilter).trim().toUpperCase();

    // Global branch group mappings:
    // AMD maps to ICD Khodiyar (KHD) and ICD Sanand (SND)
    if (cleanFilter === 'AMD' || cleanFilter === 'AHMEDABAD') {
        return jobBranch === 'AMD' || jobBranch === 'KHD' || jobBranch === 'SND';
    }
    // GIM maps to Mundra Port (MND)
    if (cleanFilter === 'GIM' || cleanFilter === 'GANDHIDHAM') {
        return jobBranch === 'GIM' || jobBranch === 'MND';
    }

    return jobBranch === cleanFilter;
};

export const getBranchDisplay = (code) => {
    if (!code || code === 'all') return 'All Branches';
    const clean = String(code).trim().toUpperCase();
    if (clean === 'AMD') return 'Ahmedabad Hub (Khodiyar + Sanand)';
    if (clean === 'GIM') return 'Gandhidham Hub (Mundra Port)';
    const meta = BRANCH_METADATA[clean];
    return meta ? `${meta.name} (${clean})` : clean;
};

// ─── Theme from Fleet Utilization ───────────────────────────────────────────────

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');

.fleet-root {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    display: flex;
    flex-direction: column;
    gap: 22px;
    padding: 0;
    background: transparent;
    width: 100%;
    box-sizing: border-box;
}

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

.mono {
    font-family: 'Outfit', sans-serif;
    letter-spacing: -0.02em;
}

.code-font {
    font-family: 'Outfit', monospace;
    letter-spacing: -0.01em;
}

/* Table Wrapper */
.fleet-table-wrap {
    background: rgba(255, 255, 255, 0.9);
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
    background: linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.95) 100%);
    color: #0f172a;
    font-family: 'Outfit', sans-serif;
    font-weight: 700;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 18px 22px;
    border-bottom: 1px solid rgba(226, 232, 240, 0.6);
    white-space: nowrap;
}

.fleet-table td {
    color: #1e293b;
    font-weight: 500;
    font-size: 14px;
    padding: 15px 22px;
    border-bottom: 1px solid rgba(226, 232, 240, 0.4);
    transition: background 0.2s;
    vertical-align: middle;
}

.fleet-table tr:hover td {
    background: rgba(79, 70, 229, 0.03);
}

.fleet-table tr:last-child td {
    border-bottom: none;
}

/* Status Pills v2 from Fleet Utilization */
.status-pill-v2 {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 14px;
    border-radius: 999px;
    font-weight: 600;
    font-size: 11.5px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    transition: all 0.2s;
    font-family: 'Outfit', sans-serif;
    line-height: 1;
    white-space: nowrap;
}

.status-pill-v2[data-variant="neutral"] {
    background: rgba(148, 163, 184, 0.15);
    color: #475569;
    border: 1px solid rgba(148, 163, 184, 0.2);
}

.status-pill-v2[data-variant="success"] {
    background: rgba(16, 185, 129, 0.15);
    color: #059669;
    border: 1px solid rgba(16, 185, 129, 0.2);
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.1);
}

.status-pill-v2[data-variant="warning"] {
    background: rgba(245, 158, 11, 0.15);
    color: #d97706;
    border: 1px solid rgba(245, 158, 11, 0.2);
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.1);
}

.status-pill-v2[data-variant="info"] {
    background: rgba(14, 165, 233, 0.15);
    color: #0284c7;
    border: 1px solid rgba(14, 165, 233, 0.2);
    box-shadow: 0 0 10px rgba(14, 165, 233, 0.1);
}

.status-pill-v2[data-variant="purple"] {
    background: rgba(124, 58, 237, 0.15);
    color: #7c3aed;
    border: 1px solid rgba(124, 58, 237, 0.2);
    box-shadow: 0 0 10px rgba(124, 58, 237, 0.1);
}

.status-pill-v2[data-variant="error"] {
    background: rgba(239, 68, 68, 0.15);
    color: #dc2626;
    border: 1px solid rgba(239, 68, 68, 0.2);
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.1);
}

/* Export Button from Fleet Utilization */
.fleet-export-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border-radius: 12px;
    font-family: 'Outfit', sans-serif;
    font-weight: 600;
    font-size: 13.5px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid #10b981;
    background: transparent;
    color: #10b981;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.fleet-export-btn:hover:not(:disabled) {
    background: #10b981;
    color: #ffffff;
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(16, 185, 129, 0.25);
}

.fleet-export-btn:active:not(:disabled) {
    transform: translateY(0);
}

.fleet-export-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* Secondary Action Button */
.fleet-sec-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 18px;
    border-radius: 12px;
    font-family: 'Outfit', sans-serif;
    font-weight: 600;
    font-size: 13.5px;
    cursor: pointer;
    transition: all 0.25s ease;
    border: 1px solid #cbd5e1;
    background: rgba(255, 255, 255, 0.9);
    color: #475569;
}

.fleet-sec-btn:hover:not(:disabled) {
    background: #f8fafc;
    color: #0f172a;
    border-color: #94a3b8;
    transform: translateY(-1px);
}

/* Controls Toolbar */
.fleet-toolbar {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    border: 1px solid rgba(226, 232, 240, 0.8);
    border-radius: 20px;
    padding: 16px 22px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.02);
}

.fleet-search-wrapper {
    position: relative;
    flex: 1;
    min-width: 250px;
    max-width: 380px;
}

.fleet-search-input {
    width: 100%;
    padding: 10px 14px 10px 40px;
    border-radius: 12px;
    border: 1px solid #cbd5e1;
    background: #ffffff;
    font-family: 'Inter', sans-serif;
    font-size: 13.5px;
    color: #0f172a;
    outline: none;
    transition: all 0.2s ease;
    box-sizing: border-box;
}

.fleet-search-input:focus {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
}

.fleet-select {
    padding: 9px 14px;
    border-radius: 12px;
    border: 1px solid #cbd5e1;
    background: #ffffff;
    font-family: 'Outfit', sans-serif;
    font-size: 13.5px;
    color: #334155;
    font-weight: 500;
    outline: none;
    cursor: pointer;
    transition: all 0.2s ease;
}

.fleet-select:focus {
    border-color: #4f46e5;
}

/* Loading */
.fleet-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 90px 20px;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(24px);
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.6);
}

.fleet-spinner {
    width: 52px;
    height: 52px;
    border: 3px solid rgba(79, 70, 229, 0.15);
    border-top-color: #4f46e5;
    border-radius: 50%;
    animation: fleet-spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes fleet-spin {
    to { transform: rotate(360deg); }
}

.fleet-copy-btn {
    border: none;
    background: transparent;
    cursor: pointer;
    color: #94a3b8;
    padding: 3px 5px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    transition: all 0.15s ease;
}

.fleet-copy-btn:hover {
    color: #4f46e5;
    background: rgba(79, 70, 229, 0.08);
}

/* Detail Inspection Modal */
.fleet-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.5);
    backdrop-filter: blur(6px);
    z-index: 9999;
    display: flex;
    justify-content: flex-end;
    animation: fleetFadeIn 0.2s ease-out;
}

.fleet-modal-panel {
    width: 100%;
    max-width: 680px;
    height: 100%;
    background: #ffffff;
    box-shadow: -10px 0 40px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    animation: fleetSlideRight 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fleetFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes fleetSlideRight {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
}

.fleet-modal-header {
    padding: 22px 28px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.fleet-modal-body {
    padding: 26px 28px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.fleet-section-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 18px 20px;
}

.fleet-section-heading {
    font-family: 'Outfit', sans-serif;
    font-size: 13.5px;
    font-weight: 700;
    color: #334155;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 8px;
}

.fleet-grid-2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px 18px;
}

.fleet-field-lbl {
    font-family: 'Outfit', sans-serif;
    font-size: 11.5px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    margin-bottom: 2px;
}

.fleet-field-val {
    font-size: 13.5px;
    font-weight: 500;
    color: #0f172a;
    word-break: break-word;
}

/* Pagination */
.fleet-pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid #e2e8f0;
    background: #ffffff;
    font-family: 'Outfit', sans-serif;
}

/* Subtabs & Summary Table Styling */
.fleet-subtabs {
    display: inline-flex;
    padding: 4px;
    background: rgba(241, 245, 249, 0.85);
    backdrop-filter: blur(12px);
    border-radius: 12px;
    border: 1px solid rgba(226, 232, 240, 0.8);
    gap: 4px;
}

.fleet-subtab-btn {
    padding: 6px 14px;
    border-radius: 8px;
    font-family: 'Outfit', sans-serif;
    font-size: 12.5px;
    font-weight: 700;
    border: none;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.fleet-subtab-btn[data-active="true"] {
    background: #ffffff;
    color: #4f46e5;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.fleet-subtab-btn[data-active="false"]:hover {
    color: #0f172a;
}

.fleet-summary-header {
    padding: 16px 22px;
    border-bottom: 1px solid rgba(226, 232, 240, 0.8);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
    background: rgba(255, 255, 255, 0.75);
}

.fleet-action-filter-btn {
    padding: 4px 11px;
    border-radius: 8px;
    font-weight: 700;
    font-size: 11.5px;
    font-family: 'Outfit', sans-serif;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.fleet-action-filter-btn[data-active="true"] {
    background: #4f46e5;
    color: #ffffff;
    border: 1px solid #4f46e5;
    box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3);
}

.fleet-action-filter-btn[data-active="false"] {
    background: rgba(255, 255, 255, 0.9);
    color: #4f46e5;
    border: 1px solid rgba(79, 70, 229, 0.25);
}

.fleet-action-filter-btn[data-active="false"]:hover {
    background: rgba(79, 70, 229, 0.08);
    border-color: #4f46e5;
}

/* ─── Executive Unbilled Jobs Matrix Styling ─── */
.srcc-matrix-wrap {
    padding: 22px 24px 26px 24px;
    background: transparent;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.srcc-table-card {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 20px;
    border: 1px solid rgba(226, 232, 240, 0.9);
    box-shadow: 0 8px 30px -4px rgba(15, 23, 42, 0.04), 0 2px 6px rgba(15, 23, 42, 0.02);
    overflow: hidden;
    position: relative;
}

.srcc-modern-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: 13.5px;
}

/* Header Row */
.srcc-modern-table thead tr {
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
}

.srcc-modern-table th {
    padding: 15px 18px;
    color: #475569;
    font-family: 'Outfit', sans-serif;
    font-weight: 700;
    font-size: 12.5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 1px solid #e2e8f0;
    white-space: nowrap;
    user-select: none;
    transition: all 0.2s ease;
}

.srcc-modern-table th.branch-col {
    text-align: left;
    min-width: 200px;
    padding-left: 24px;
}

.srcc-modern-table th.month-col {
    text-align: center;
    cursor: pointer;
}

.srcc-modern-table th.month-col:hover {
    color: #4f46e5;
    background: rgba(79, 70, 229, 0.05);
}

.srcc-modern-table th.month-col.is-current {
    background: linear-gradient(180deg, rgba(79, 70, 229, 0.09) 0%, rgba(79, 70, 229, 0.03) 100%);
    border-bottom: 2px solid #4f46e5;
}

.srcc-modern-table th.total-col {
    text-align: center;
    min-width: 95px;
    background: rgba(241, 245, 249, 0.95);
    color: #0f172a;
    font-weight: 800;
}

/* Data Rows */
.srcc-modern-table tbody tr {
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.srcc-modern-table tbody tr:hover {
    background: rgba(79, 70, 229, 0.025);
}

.srcc-modern-table tbody tr.row-active {
    background: rgba(79, 70, 229, 0.06);
}

.srcc-modern-table tbody td {
    padding: 14px 18px;
    border-bottom: 1px solid rgba(226, 232, 240, 0.65);
    vertical-align: middle;
    transition: all 0.2s;
}

.srcc-modern-table tbody td.branch-cell {
    text-align: left;
    padding-left: 24px;
    cursor: pointer;
}

.srcc-modern-table tbody td.val-cell {
    text-align: center;
}

/* Interactive Number Badge */
.srcc-val-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    height: 32px;
    padding: 0 10px;
    border-radius: 8px;
    font-family: 'Outfit', sans-serif;
    font-weight: 600;
    font-size: 13.5px;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    user-select: none;
    border: 1px solid transparent;
}

.srcc-val-badge.zero {
    color: #cbd5e1;
    background: transparent;
    cursor: default;
    font-weight: 400;
}

.srcc-val-badge.low {
    color: #1e293b;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
}

.srcc-val-badge.high {
    color: #4338ca;
    background: rgba(79, 70, 229, 0.08);
    border: 1px solid rgba(79, 70, 229, 0.22);
    font-weight: 700;
}

.srcc-val-badge:hover:not(.zero) {
    background: #4f46e5;
    color: #ffffff;
    border-color: #4f46e5;
    transform: translateY(-2px);
    box-shadow: 0 4px 14px rgba(79, 70, 229, 0.28);
}

.srcc-val-badge.active {
    background: #4f46e5 !important;
    color: #ffffff !important;
    border-color: #3730a3 !important;
    box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
    font-weight: 800;
}

/* Branch Row Total Badge */
.srcc-row-total-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 42px;
    height: 32px;
    padding: 0 12px;
    border-radius: 8px;
    font-family: 'Outfit', sans-serif;
    font-weight: 800;
    font-size: 13.5px;
    color: #4f46e5;
    background: rgba(79, 70, 229, 0.07);
    border: 1px solid rgba(79, 70, 229, 0.18);
    cursor: pointer;
    transition: all 0.2s ease;
}

.srcc-row-total-badge:hover {
    background: #4f46e5;
    color: #ffffff;
    border-color: #4f46e5;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.22);
}

/* Footer Total Row */
.srcc-modern-table tr.total-row td {
    background: linear-gradient(90deg, #f8fafc 0%, #f1f5f9 100%);
    border-top: 2px solid #cbd5e1;
    border-bottom: none;
    padding: 16px 18px;
}

.srcc-grand-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 56px;
    height: 34px;
    padding: 0 14px;
    border-radius: 999px;
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    color: #ffffff;
    font-family: 'Outfit', sans-serif;
    font-weight: 900;
    font-size: 14px;
    border: none;
    box-shadow: 0 4px 14px rgba(79, 70, 229, 0.32);
    cursor: pointer;
    transition: all 0.2s ease;
}

.srcc-grand-badge:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 20px rgba(79, 70, 229, 0.45);
}

/* Executive Grand Total Strip at bottom */
.srcc-summary-strip {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 14px;
    padding: 14px 20px;
    background: linear-gradient(135deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.95) 100%);
    border-radius: 16px;
    border: 1px solid rgba(226, 232, 240, 0.9);
}

.srcc-branch-pill-list {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.srcc-branch-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 13px;
    border-radius: 999px;
    font-family: 'Outfit', sans-serif;
    font-size: 12.5px;
    font-weight: 600;
    color: #334155;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    cursor: pointer;
    transition: all 0.2s ease;
}

.srcc-branch-pill:hover {
    border-color: #4f46e5;
    color: #4f46e5;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.srcc-branch-pill.active {
    background: #4f46e5;
    color: #ffffff;
    border-color: #4f46e5;
}

.srcc-grand-kpi {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    padding: 8px 18px;
    background: #ffffff;
    border-radius: 12px;
    border: 1px solid rgba(79, 70, 229, 0.2);
    box-shadow: 0 2px 8px rgba(79, 70, 229, 0.08);
}
`;


// Helper: Parse job date (DD-MM-YYYY or DD/MM/YYYY)
const parseJobDate = (job) => {
    const raw = job.lr_date || job.pr_date;
    if (!raw) return null;
    const s = String(raw).trim();
    const parts = s.split(/[-/]/);
    if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        let y = parseInt(parts[2], 10);
        if (y < 100) y += 2000;
        const parsed = new Date(y, m, d);
        if (!isNaN(parsed.getTime())) return parsed;
    }
    const fallback = new Date(s);
    return isNaN(fallback.getTime()) ? null : fallback;
};

const UninvoicedJobsReport = ({
    filterType = 'all',
    selectedMonth,
    selectedYear,
    selectedQuarter,
    dateRange,
    selectedFinancialYear = '26-27',
    selectedDay,
    selectedBranchGroup = 'all'
}) => {
    // All jobs stored from backend
    const [allJobs, setAllJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Client-side pagination state
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);

    // Filter controls
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('all');
    const [selectedFleet, setSelectedFleet] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');

    // Summary Matrix Table states (Tabs: 'srcc_monthly' | 'branch' | 'consignor' | 'status')
    const [summaryTab, setSummaryTab] = useState('srcc_monthly');
    const [selectedMonthFilter, setSelectedMonthFilter] = useState(null);
    const [showSummaryTable, setShowSummaryTable] = useState(true);

    // Excel downloading state
    const [downloadingExcel, setDownloadingExcel] = useState(false);

    // Detail modal state
    const [selectedJob, setSelectedJob] = useState(null);

    // Copied feedback tooltip
    const [copiedKey, setCopiedKey] = useState(null);

    // In-memory cache by query key to avoid repeated network roundtrips
    const cacheRef = useRef({});

    // Sync selectedBranch with selectedBranchGroup from global BranchContext
    useEffect(() => {
        if (!selectedBranchGroup || selectedBranchGroup === 'all' || selectedBranchGroup === 'ALL') {
            setSelectedBranch('all');
        } else {
            setSelectedBranch(selectedBranchGroup.trim().toUpperCase());
        }
    }, [selectedBranchGroup]);

    // Debounce search input (250ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 250);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Copy to clipboard helper
    const handleCopy = (val, key) => {
        if (!val) return;
        navigator.clipboard.writeText(val);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 1600);
    };

    // Helper: Calculate current running Indian Financial Year (e.g. 26-27)
    const getCurrentFY = () => {
        const now = new Date();
        const m = now.getMonth();
        const y = now.getFullYear();
        return m >= 3
            ? `${String(y).slice(-2)}-${String(y + 1).slice(-2)}`
            : `${String(y - 1).slice(-2)}-${String(y).slice(-2)}`;
    };

    // Calculate effective financial year for API request based on central filters
    const effectiveFY = useMemo(() => {
        if (filterType === 'fin-year') {
            return selectedFinancialYear || getCurrentFY();
        }
        if (filterType === 'all') {
            return getCurrentFY();
        }
        if (filterType === 'year') {
            const curY = new Date().getFullYear();
            if (parseInt(selectedYear, 10) === curY) {
                return getCurrentFY();
            }
        }
        // For date-based filters, derive the relevant FY if available
        const { startDate } = getTransportDates(filterType, selectedDay, selectedYear, selectedMonth, selectedQuarter, dateRange);
        if (startDate) {
            const d = new Date(startDate);
            if (!isNaN(d.getTime())) {
                const m = d.getMonth();
                const y = d.getFullYear();
                return m >= 3
                    ? `${String(y).slice(-2)}-${String(y + 1).slice(-2)}`
                    : `${String(y - 1).slice(-2)}-${String(y).slice(-2)}`;
            }
        }
        return getCurrentFY();
    }, [filterType, selectedFinancialYear, selectedDay, selectedYear, selectedMonth, selectedQuarter, dateRange]);

    // Primary fetch function (fetches the entire batch for the selected FY/period so branch filtering is 100% accurate)
    const fetchUninvoicedJobs = useCallback(async (isRefresh = false) => {
        setLoading(true);
        setError(null);

        const cacheKey = `all_${effectiveFY}`;
        if (!isRefresh && cacheRef.current[cacheKey]) {
            setAllJobs(cacheRef.current[cacheKey]);
            setLoading(false);
            return;
        }

        try {
            const params = {
                format: 'json',
                financialYear: effectiveFY === 'all' ? undefined : effectiveFY
            };

            const res = await axios.get(`${TRANSPORT_BASE}/api/lr-uninvoiced-jobs`, {
                params,
                headers: TRANSPORT_HEADERS
            });

            if (res.data && res.data.success) {
                const fetchedJobs = res.data.data || [];
                setAllJobs(fetchedJobs);
                cacheRef.current[cacheKey] = fetchedJobs;
            } else {
                setError(res.data?.message || 'Failed to fetch uninvoiced jobs');
            }
        } catch (err) {
            console.error('Error fetching uninvoiced LR jobs:', err);
            setError(err.response?.data?.message || err.message || 'Error connecting to transport server');
        } finally {
            setLoading(false);
        }
    }, [effectiveFY]);

    // Reset page and month drilldown when central filters change
    useEffect(() => {
        setPage(1);
        setSelectedMonthFilter(null);
    }, [filterType, selectedFinancialYear, selectedMonth, selectedYear, selectedQuarter, selectedDay]);

    useEffect(() => {
        setPage(1);
    }, [selectedBranch, selectedFleet, selectedStatus, selectedMonthFilter, debouncedSearch]);

    useEffect(() => {
        fetchUninvoicedJobs();
    }, [fetchUninvoicedJobs]);

    // Extract master branch options and accurate counts across ALL records
    const branchCounts = useMemo(() => {
        const counts = {};
        allJobs.forEach(j => {
            const b = resolveJobBranch(j);
            if (b) {
                counts[b] = (counts[b] || 0) + 1;
            }
        });
        return counts;
    }, [allJobs]);

    const branchList = useMemo(() => {
        return Object.keys(branchCounts).sort((a, b) => branchCounts[b] - branchCounts[a]);
    }, [branchCounts]);

    // Regional group counts (for Customs & regional dashboards)
    const regionalCounts = useMemo(() => {
        return {
            AMD: (branchCounts['KHD'] || 0) + (branchCounts['SND'] || 0),
            GIM: branchCounts['MND'] || 0
        };
    }, [branchCounts]);

    // Extract unique tracking statuses across ALL records
    const statusOptions = useMemo(() => {
        const statuses = new Set();
        allJobs.forEach(j => {
            if (j.tracking_status) statuses.add(j.tracking_status.trim());
        });
        return Array.from(statuses).sort();
    }, [allJobs]);

    // Date range bounds for client-side filtering if user selected date/month/week
    const dateBounds = useMemo(() => {
        if (filterType === 'all' || filterType === 'fin-year' || filterType === 'year') return null;
        const { startDate, endDate } = getTransportDates(filterType, selectedDay, selectedYear, selectedMonth, selectedQuarter, dateRange);
        if (!startDate || !endDate) return null;
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        return { start: s, end: e };
    }, [filterType, selectedDay, selectedYear, selectedMonth, selectedQuarter, dateRange]);

    // Filter jobs across the ENTIRE dataset accurately
    const filteredJobs = useMemo(() => {
        const query = debouncedSearch.trim().toLowerCase();

        return allJobs.filter(job => {
            // Time period filter
            if (dateBounds) {
                const jobDate = parseJobDate(job);
                if (jobDate && (jobDate < dateBounds.start || jobDate > dateBounds.end)) {
                    return false;
                }
            }

            // Month drilldown filter (from clicking SRCC matrix month cell or column)
            if (selectedMonthFilter !== null && selectedMonthFilter !== undefined) {
                const jobDate = parseJobDate(job);
                if (!jobDate || jobDate.getMonth() !== selectedMonthFilter) {
                    return false;
                }
            }

            // Accurate branch filter (supports both individual hubs and regional groups)
            if (selectedBranch !== 'all') {
                const jobB = resolveJobBranch(job);
                if (!matchesBranchFilter(jobB, selectedBranch)) {
                    return false;
                }
            }

            // Fleet filter
            if (selectedFleet !== 'all') {
                const fleet = (job.own_hired || '').trim().toLowerCase();
                if (fleet !== selectedFleet.toLowerCase()) return false;
            }

            // Status filter
            if (selectedStatus !== 'all') {
                const stat = (job.tracking_status || '').trim();
                if (stat !== selectedStatus) return false;
            }

            // Search query filter across 7 fields
            if (query) {
                const matchTr = (job.tr_no || '').toLowerCase().includes(query);
                const matchPr = (job.pr_no || '').toLowerCase().includes(query);
                const matchCont = (job.container_number || '').toLowerCase().includes(query);
                const matchVeh = (job.vehicle_no || '').toLowerCase().includes(query);
                const matchConsignor = (job.consignor || '').toLowerCase().includes(query);
                const matchConsignee = (job.consignee || '').toLowerCase().includes(query);
                const matchEway = (job.eWay_bill || '').toLowerCase().includes(query);

                if (!matchTr && !matchPr && !matchCont && !matchVeh && !matchConsignor && !matchConsignee && !matchEway) {
                    return false;
                }
            }

            return true;
        });
    }, [allJobs, dateBounds, selectedBranch, selectedFleet, selectedStatus, selectedMonthFilter, debouncedSearch]);

    // Paginated view of the filtered jobs (60fps smooth client-side pagination)
    const paginatedJobs = useMemo(() => {
        const start = (page - 1) * limit;
        return filteredJobs.slice(start, start + limit);
    }, [filteredJobs, page, limit]);

    const totalPages = Math.max(1, Math.ceil(filteredJobs.length / limit));

    // Metrics calculation over filtered jobs
    const metrics = useMemo(() => {
        let ownCount = 0;
        let hiredCount = 0;
        let completedCount = 0;
        let pendingCount = 0;
        let validEwayCount = 0;

        filteredJobs.forEach(j => {
            const fleet = (j.own_hired || '').trim().toLowerCase();
            if (fleet === 'own') ownCount++;
            else if (fleet === 'hired') hiredCount++;

            const comp = (j.lr_completed || '').trim().toLowerCase();
            if (comp === 'completed') completedCount++;
            else pendingCount++;

            const eway = (j.eWay_bill || '').trim();
            if (eway && eway !== '000000000000') validEwayCount++;
        });

        const totalFiltered = filteredJobs.length;
        const ownPct = totalFiltered > 0 ? Math.round((ownCount / totalFiltered) * 100) : 0;
        const completedPct = totalFiltered > 0 ? Math.round((completedCount / totalFiltered) * 100) : 0;
        const ewayPct = totalFiltered > 0 ? Math.round((validEwayCount / totalFiltered) * 100) : 0;

        return {
            totalDisplay: totalFiltered,
            serverTotal: allJobs.length,
            ownCount,
            hiredCount,
            ownPct,
            completedCount,
            pendingCount,
            completedPct,
            validEwayCount,
            ewayPct
        };
    }, [filteredJobs, allJobs]);

    // ─── Executive Summary Matrix Calculations ───────────────────────────────
    // Base jobs for the selected period (respecting dateBounds if active)
    const summaryBaseJobs = useMemo(() => {
        if (!dateBounds) return allJobs;
        return allJobs.filter(job => {
            const jobDate = parseJobDate(job);
            return !jobDate || (jobDate >= dateBounds.start && jobDate <= dateBounds.end);
        });
    }, [allJobs, dateBounds]);

    // ─── Exact Excel Grid: Month-Wise Branch Matrix (Unbilled Jobs - Srcc) ───
    const srccMatrixData = useMemo(() => {
        const monthsInJobs = new Set();
        const latestDateByMonth = {};

        summaryBaseJobs.forEach(j => {
            const d = parseJobDate(j);
            if (d) {
                const m = d.getMonth();
                monthsInJobs.add(m);
                if (!latestDateByMonth[m] || d > latestDateByMonth[m]) {
                    latestDateByMonth[m] = d;
                }
            }
        });

        const now = new Date();
        const currentMonthIdx = now.getMonth(); // 8 for September
        const todayDayStr = String(now.getDate()).padStart(2, '0');
        const todayMonthStr = String(now.getMonth() + 1).padStart(2, '0');
        const todayYearStr = now.getFullYear();
        const todayFormatted = `${todayDayStr}.${todayMonthStr}.${todayYearStr}`;

        // Find index of current month in FY_MONTH_ORDER (April=0, May=1, June=2, July=3, Aug=4, Sep=5, ...)
        const currentMonthFYIdx = FY_MONTH_ORDER.indexOf(currentMonthIdx);

        // Check if effective FY is the current running FY (e.g. 26-27)
        const isCurrentRunningFY = (!effectiveFY || effectiveFY === 'all' || effectiveFY === getCurrentFY() || effectiveFY === '26-27');

        let maxIdx;
        if (isCurrentRunningFY) {
            // Show strictly up to current month (current till date)
            maxIdx = currentMonthFYIdx !== -1 ? currentMonthFYIdx : 5;
        } else {
            // For past financial years, show elapsed months that have jobs or up to March
            let maxJobMonthIdx = -1;
            FY_MONTH_ORDER.forEach((m, idx) => {
                if (monthsInJobs.has(m)) maxJobMonthIdx = Math.max(maxJobMonthIdx, idx);
            });
            maxIdx = maxJobMonthIdx !== -1 ? maxJobMonthIdx : 11;
        }

        const activeMonths = FY_MONTH_ORDER.slice(0, maxIdx + 1).map((m, idx) => {
            const isLatest = (idx === maxIdx);
            const dateStr = isCurrentRunningFY ? todayFormatted : (latestDateByMonth[m] ? `${String(latestDateByMonth[m].getDate()).padStart(2, '0')}.${String(latestDateByMonth[m].getMonth() + 1).padStart(2, '0')}.${latestDateByMonth[m].getFullYear()}` : todayFormatted);
            const label = isLatest ? `${MONTH_NAMES[m]} (till ${dateStr} LR date )` : MONTH_NAMES[m];
            return {
                month: m,
                name: MONTH_NAMES[m],
                label,
                isLatest,
                dateStr
            };
        });

        // Canonical 5 branches: Khodiyar, Sanand, Mundra, SFPL, Auto, plus any extra
        const allBranchList = [
            ...CANONICAL_BRANCHES,
            ...Object.keys(branchCounts)
                .filter(b => !CANONICAL_BRANCH_MAP[b] && b !== 'UNKNOWN' && branchCounts[b] > 0)
                .map(b => ({ key: b, label: b }))
        ];

        const matrix = {};
        allBranchList.forEach(b => {
            matrix[b.key] = { total: 0 };
            activeMonths.forEach(am => {
                matrix[b.key][am.month] = 0;
            });
        });

        const monthTotals = {};
        activeMonths.forEach(am => {
            monthTotals[am.month] = 0;
        });
        let grandTotal = 0;

        summaryBaseJobs.forEach(job => {
            const b = resolveJobBranch(job);
            const d = parseJobDate(job);
            if (d && matrix[b]) {
                const m = d.getMonth();
                if (matrix[b][m] !== undefined) {
                    matrix[b][m]++;
                    matrix[b].total++;
                    monthTotals[m] = (monthTotals[m] || 0) + 1;
                    grandTotal++;
                }
            }
        });

        return {
            activeMonths,
            allBranchList,
            matrix,
            monthTotals,
            grandTotal
        };
    }, [summaryBaseJobs, branchCounts, effectiveFY]);

    // Matrix cell click: filter by branch AND month
    const handleCellClick = (branchKey, monthIdx, count) => {
        if (count === 0) return;
        if (selectedBranch === branchKey && selectedMonthFilter === monthIdx) {
            setSelectedBranch('all');
            setSelectedMonthFilter(null);
        } else {
            setSelectedBranch(branchKey);
            setSelectedMonthFilter(monthIdx);
        }
    };

    // Matrix branch row click: filter by branch
    const handleBranchClick = (branchKey) => {
        if (selectedBranch === branchKey && selectedMonthFilter === null) {
            setSelectedBranch('all');
        } else {
            setSelectedBranch(branchKey);
            setSelectedMonthFilter(null);
        }
    };

    // Matrix month column click: filter by month
    const handleMonthClick = (monthIdx) => {
        if (selectedMonthFilter === monthIdx && selectedBranch === 'all') {
            setSelectedMonthFilter(null);
        } else {
            setSelectedBranch('all');
            setSelectedMonthFilter(monthIdx);
        }
    };

    // Copy entire Unbilled Jobs - Srcc matrix to clipboard in TSV (Excel-pasteable)
    const handleCopySrccMatrix = () => {
        const headers = ['Branch', ...srccMatrixData.activeMonths.map(m => m.name), 'Total'];
        const rows = srccMatrixData.allBranchList.map(b => {
            const rowVals = [b.label];
            srccMatrixData.activeMonths.forEach(m => {
                rowVals.push(srccMatrixData.matrix[b.key]?.[m.month] || 0);
            });
            rowVals.push(srccMatrixData.matrix[b.key]?.total || 0);
            return rowVals.join('\t');
        });
        const totalRow = ['Total'];
        srccMatrixData.activeMonths.forEach(m => {
            totalRow.push(srccMatrixData.monthTotals[m.month] || 0);
        });
        totalRow.push(srccMatrixData.grandTotal);
        rows.push(totalRow.join('\t'));

        const tsv = ['Unbilled Jobs - Srcc', headers.join('\t'), ...rows].join('\n');
        navigator.clipboard.writeText(tsv);
        handleCopy('Copied', 'srcc_matrix');
    };

    // Branch-Wise Breakdown Matrix calculation
    const branchBreakdown = useMemo(() => {
        const map = {};
        summaryBaseJobs.forEach(job => {
            const b = resolveJobBranch(job) || 'UNKNOWN';
            if (!map[b]) {
                map[b] = {
                    branch: b,
                    meta: BRANCH_METADATA[b] || null,
                    name: BRANCH_METADATA[b]?.name || b,
                    group: BRANCH_METADATA[b]?.groupLabel || 'Operating Station',
                    city: BRANCH_METADATA[b]?.city || '',
                    totalJobs: 0,
                    ownCount: 0,
                    hiredCount: 0,
                    completedCount: 0,
                    pendingCount: 0,
                    validEwayCount: 0,
                    size20Count: 0,
                    size40Count: 0
                };
            }
            map[b].totalJobs++;

            const fleet = (job.own_hired || '').trim().toLowerCase();
            if (fleet === 'own') map[b].ownCount++;
            else if (fleet === 'hired') map[b].hiredCount++;

            const comp = (job.lr_completed || '').trim().toLowerCase();
            if (comp === 'completed') map[b].completedCount++;
            else map[b].pendingCount++;

            const eway = (job.eWay_bill || '').trim();
            if (eway && eway !== '000000000000') map[b].validEwayCount++;

            const contType = String(job.container_type || '');
            if (contType.includes('20')) map[b].size20Count++;
            else if (contType.includes('40')) map[b].size40Count++;
        });

        const total = summaryBaseJobs.length;
        const list = Object.values(map).map(b => ({
            ...b,
            sharePct: total > 0 ? Math.round((b.totalJobs / total) * 100) : 0,
            ownPct: b.totalJobs > 0 ? Math.round((b.ownCount / b.totalJobs) * 100) : 0,
            hiredPct: b.totalJobs > 0 ? Math.round((b.hiredCount / b.totalJobs) * 100) : 0,
            completedPct: b.totalJobs > 0 ? Math.round((b.completedCount / b.totalJobs) * 100) : 0
        }));

        return list.sort((a, b) => b.totalJobs - a.totalJobs);
    }, [summaryBaseJobs]);

    // Grand totals for bottom row of branch breakdown
    const branchGrandTotals = useMemo(() => {
        let ownCount = 0;
        let hiredCount = 0;
        let completedCount = 0;
        let pendingCount = 0;
        let validEwayCount = 0;
        let size20Count = 0;
        let size40Count = 0;

        branchBreakdown.forEach(b => {
            ownCount += b.ownCount;
            hiredCount += b.hiredCount;
            completedCount += b.completedCount;
            pendingCount += b.pendingCount;
            validEwayCount += b.validEwayCount;
            size20Count += b.size20Count;
            size40Count += b.size40Count;
        });

        const total = summaryBaseJobs.length;
        return {
            totalJobs: total,
            ownCount,
            hiredCount,
            completedCount,
            pendingCount,
            validEwayCount,
            size20Count,
            size40Count,
            ownPct: total > 0 ? Math.round((ownCount / total) * 100) : 0,
            hiredPct: total > 0 ? Math.round((hiredCount / total) * 100) : 0,
            completedPct: total > 0 ? Math.round((completedCount / total) * 100) : 0,
            ewayPct: total > 0 ? Math.round((validEwayCount / total) * 100) : 0
        };
    }, [branchBreakdown, summaryBaseJobs]);

    // Top Consignors breakdown
    const consignorBreakdown = useMemo(() => {
        const map = {};
        summaryBaseJobs.forEach(job => {
            const c = (job.consignor || 'Unknown Consignor').trim();
            if (!map[c]) {
                map[c] = {
                    consignor: c,
                    totalJobs: 0,
                    ownCount: 0,
                    hiredCount: 0,
                    completedCount: 0,
                    pendingCount: 0,
                    validEwayCount: 0
                };
            }
            map[c].totalJobs++;

            const fleet = (job.own_hired || '').trim().toLowerCase();
            if (fleet === 'own') map[c].ownCount++;
            else if (fleet === 'hired') map[c].hiredCount++;

            const comp = (job.lr_completed || '').trim().toLowerCase();
            if (comp === 'completed') map[c].completedCount++;
            else map[c].pendingCount++;

            const eway = (job.eWay_bill || '').trim();
            if (eway && eway !== '000000000000') map[c].validEwayCount++;
        });

        const total = summaryBaseJobs.length;
        const list = Object.values(map).map(c => ({
            ...c,
            sharePct: total > 0 ? Math.round((c.totalJobs / total) * 100) : 0
        }));

        return list.sort((a, b) => b.totalJobs - a.totalJobs).slice(0, 15);
    }, [summaryBaseJobs]);

    // Tracking Stage & Fleet breakdown
    const statusBreakdown = useMemo(() => {
        const map = {};
        summaryBaseJobs.forEach(job => {
            const s = (job.tracking_status || 'Pending').trim();
            if (!map[s]) {
                map[s] = {
                    status: s,
                    totalJobs: 0,
                    ownCount: 0,
                    hiredCount: 0,
                    completedCount: 0,
                    pendingCount: 0,
                    validEwayCount: 0
                };
            }
            map[s].totalJobs++;

            const fleet = (job.own_hired || '').trim().toLowerCase();
            if (fleet === 'own') map[s].ownCount++;
            else if (fleet === 'hired') map[s].hiredCount++;

            const comp = (job.lr_completed || '').trim().toLowerCase();
            if (comp === 'completed') map[s].completedCount++;
            else map[s].pendingCount++;

            const eway = (job.eWay_bill || '').trim();
            if (eway && eway !== '000000000000') map[s].validEwayCount++;
        });

        const total = summaryBaseJobs.length;
        const list = Object.values(map).map(s => ({
            ...s,
            sharePct: total > 0 ? Math.round((s.totalJobs / total) * 100) : 0
        }));

        return list.sort((a, b) => b.totalJobs - a.totalJobs);
    }, [summaryBaseJobs]);

    // Excel Download Handler
    const handleDownloadExcel = async () => {
        setDownloadingExcel(true);
        try {
            const res = await axios.get(`${TRANSPORT_BASE}/api/lr-uninvoiced-jobs`, {
                params: {
                    format: 'excel',
                    financialYear: effectiveFY === 'all' ? undefined : effectiveFY
                },
                headers: TRANSPORT_HEADERS,
                responseType: 'blob'
            });

            const blob = new Blob([res.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Uninvoiced_LR_Jobs_${effectiveFY}_${selectedBranch !== 'all' ? selectedBranch + '_' : ''}${Date.now()}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to download Excel report:', err);
            alert('Failed to download Excel file. Please try again.');
        } finally {
            setDownloadingExcel(false);
        }
    };

    // Progress Circle Component from Fleet Utilization
    const ProgressCircle = ({ pct, color }) => {
        const radius = 18;
        const strokeWidth = 3.5;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (pct / 100) * circumference;
        return (
            <div style={{ position: 'relative', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="44" height="44" style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
                    <circle cx="22" cy="22" r={radius} fill="transparent" stroke="rgba(0,0,0,0.04)" strokeWidth={strokeWidth} />
                    <circle
                        cx="22"
                        cy="22"
                        r={radius}
                        fill="transparent"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
                    />
                </svg>
                <span style={{ fontSize: '10.5px', fontWeight: 800, color, fontFamily: "'Outfit', sans-serif" }}>{pct}%</span>
            </div>
        );
    };

    // Fleet Card Component matching Fleet Utilization KpiCard
    const FleetKpiCard = ({ label, subtext, value, extra, pct, color, gradient, border, accentColor }) => {
        const defaultAccent = accentColor || color || '#4f46e5';

        return (
            <div
                className="fleet-card"
                style={{
                    padding: '24px 28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    '--fc-bg': gradient || 'rgba(255, 255, 255, 0.85)',
                    '--fc-border': border || '1px solid rgba(226, 232, 240, 0.8)',
                    '--fc-accent': defaultAccent
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', zIndex: 1 }}>
                    <div>
                        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '13.5px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                            {label}
                        </div>
                        {subtext && (
                            <div style={{ fontSize: '12px', color: '#8091a7', marginTop: '4px', fontWeight: 600, letterSpacing: '0.01em', lineHeight: 1.3 }}>
                                {subtext}
                            </div>
                        )}
                    </div>
                    {pct !== undefined && pct !== null && (
                        <div style={{ flexShrink: 0, marginTop: '-4px' }}>
                            <ProgressCircle pct={pct} color={defaultAccent} />
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '38px', fontWeight: 900, color: '#0f172a' }} className="mono">
                            {value}
                        </span>
                        {extra && (
                            <span style={{ fontSize: '14px', fontWeight: 700, color }}>
                                {extra}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // Tracking status pill using Fleet Utilization status-pill-v2
    const renderStatusPill = (status) => {
        const clean = (status || 'Pending').trim();
        let variant = 'neutral';

        if (clean.toLowerCase().includes('completed') || clean.toLowerCase().includes('offloaded')) {
            variant = 'success';
        } else if (clean.toLowerCase().includes('factory')) {
            variant = 'info';
        } else if (clean.toLowerCase().includes('loading') || clean.toLowerCase().includes('pending')) {
            variant = 'warning';
        }

        return <span className="status-pill-v2" data-variant={variant}>{clean}</span>;
    };

    return (
        <div className="fleet-root">
            <style>{STYLES}</style>

            {/* Core KPI Cards Grid matching Fleet Utilization */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <FleetKpiCard
                    label="Total Uninvoiced"
                    subtext={
                        selectedBranch === 'all'
                            ? 'All active branches'
                            : selectedBranch === 'AMD'
                            ? 'Filtered by Ahmedabad Hub (KHD + SND)'
                            : selectedBranch === 'GIM'
                            ? 'Filtered by Gandhidham Hub (MND)'
                            : `Filtered by ${getBranchDisplay(selectedBranch)}`
                    }
                    value={metrics.totalDisplay}
                    extra={selectedBranch !== 'all' ? `of ${metrics.serverTotal}` : null}
                    color="#4f46e5"
                    accentColor="#4f46e5"
                    gradient="linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(124, 58, 237, 0.04) 100%)"
                />

                <FleetKpiCard
                    label="Fleet Mix (Own vs Hired)"
                    subtext={`${metrics.ownCount} Own / ${metrics.hiredCount} Hired`}
                    value={`${metrics.ownPct}%`}
                    extra="Own Fleet"
                    pct={metrics.ownPct}
                    color="#0284c7"
                    accentColor="#0284c7"
                    gradient="linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, transparent 100%)"
                />

                <FleetKpiCard
                    label="LR Clearance State"
                    subtext={`${metrics.pendingCount} Pending / ${metrics.completedCount} Done`}
                    value={`${metrics.completedPct}%`}
                    extra="Completed"
                    pct={metrics.completedPct}
                    color="#059669"
                    accentColor="#059669"
                    gradient="linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, transparent 100%)"
                />

                <FleetKpiCard
                    label="E-Way Bill Compliance"
                    subtext={`${metrics.validEwayCount} of ${metrics.totalDisplay} active jobs`}
                    value={`${metrics.ewayPct}%`}
                    extra="Active E-Way"
                    pct={metrics.ewayPct}
                    color="#d97706"
                    accentColor="#d97706"
                    gradient="linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, transparent 100%)"
                />
            </div>

            {/* ─── Top Executive Summary Matrix Table ─── */}
            <div className="fleet-table-wrap">
                <div className="fleet-summary-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(79, 70, 229, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                            <Building2 size={20} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <h3 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '15.5px', color: '#0f172a' }}>
                                    {summaryTab === 'srcc_monthly'
                                        ? 'Unbilled Jobs - Srcc'
                                        : summaryTab === 'branch'
                                        ? 'Branch-Wise Uninvoiced Jobs Breakdown & Matrix'
                                        : summaryTab === 'consignor'
                                        ? 'Top Consignors & Clients Billing Pipeline'
                                        : 'Tracking Stage & Operational Status Breakdown'}
                                </h3>
                                <span className="status-pill-v2" data-variant="info" style={{ fontSize: '11px', padding: '3px 10px' }}>
                                    {summaryTab === 'srcc_monthly'
                                        ? `${srccMatrixData.grandTotal} Unbilled Jobs`
                                        : summaryTab === 'branch'
                                        ? `${branchBreakdown.length} Stations Active`
                                        : summaryTab === 'consignor'
                                        ? `${consignorBreakdown.length} Consignors`
                                        : `${statusBreakdown.length} Stages`}
                                </span>
                                {(selectedBranch !== 'all' || selectedMonthFilter !== null) && summaryTab === 'srcc_monthly' && (
                                    <span
                                        className="status-pill-v2"
                                        data-variant="purple"
                                        style={{ fontSize: '11px', padding: '3px 10px', cursor: 'pointer' }}
                                        onClick={() => { setSelectedBranch('all'); setSelectedMonthFilter(null); }}
                                        title="Click to clear filter"
                                    >
                                        Filtered: {selectedBranch !== 'all' ? (CANONICAL_BRANCH_MAP[selectedBranch]?.label || selectedBranch) : ''}
                                        {selectedBranch !== 'all' && selectedMonthFilter !== null ? ' • ' : ''}
                                        {selectedMonthFilter !== null ? MONTH_NAMES[selectedMonthFilter] : ''} ✕
                                    </span>
                                )}
                                {selectedBranch !== 'all' && summaryTab === 'branch' && (
                                    <span
                                        className="status-pill-v2"
                                        data-variant="purple"
                                        style={{ fontSize: '11px', padding: '3px 10px', cursor: 'pointer' }}
                                        onClick={() => setSelectedBranch('all')}
                                        title="Click to clear filter"
                                    >
                                        Filtered: {getBranchDisplay(selectedBranch)} ✕
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                {summaryTab === 'srcc_monthly'
                                    ? 'Month-wise uninvoiced LR jobs matrix by branch • Click any cell, branch, or month to drill down'
                                    : `Summary distribution of all ${summaryBaseJobs.length} live uninvoiced LR consignments`}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {/* Subtabs for switching matrix view */}
                        <div className="fleet-subtabs">
                            <button
                                className="fleet-subtab-btn"
                                data-active={summaryTab === 'srcc_monthly'}
                                onClick={() => setSummaryTab('srcc_monthly')}
                            >
                                <FileText size={13} />
                                <span>Unbilled Jobs - Srcc</span>
                            </button>
                            <button
                                className="fleet-subtab-btn"
                                data-active={summaryTab === 'branch'}
                                onClick={() => setSummaryTab('branch')}
                            >
                                <Building2 size={13} />
                                <span>Operating Stations</span>
                            </button>
                            <button
                                className="fleet-subtab-btn"
                                data-active={summaryTab === 'consignor'}
                                onClick={() => setSummaryTab('consignor')}
                            >
                                <Users size={13} />
                                <span>Top Consignors</span>
                            </button>
                            <button
                                className="fleet-subtab-btn"
                                data-active={summaryTab === 'status'}
                                onClick={() => setSummaryTab('status')}
                            >
                                <BarChart3 size={13} />
                                <span>Tracking Stages</span>
                            </button>
                        </div>

                        {/* Expand / Collapse Button */}
                        <button
                            className="fleet-sec-btn"
                            style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '12px' }}
                            onClick={() => setShowSummaryTable(prev => !prev)}
                            title={showSummaryTable ? 'Collapse summary table' : 'Expand summary table'}
                        >
                            {showSummaryTable ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                    </div>
                </div>

                {showSummaryTable && (
                    <div style={{ overflowX: 'auto' }}>
                        {/* ─── View 1: Unbilled Jobs - Srcc (Modern Executive Matrix) ─── */}
                        {summaryTab === 'srcc_monthly' && (
                            <div className="srcc-matrix-wrap">
                                {/* Active Drilldown Banner */}
                                {(selectedBranch !== 'all' || selectedMonthFilter !== null) && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 18px',
                                        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(147, 51, 234, 0.08) 100%)',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(79, 70, 229, 0.22)',
                                        boxShadow: '0 2px 8px rgba(79, 70, 229, 0.05)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#1e293b' }}>
                                            <span style={{ fontWeight: 800, color: '#4f46e5' }}>Active Filter:</span>
                                            {selectedBranch !== 'all' && (
                                                <span className="status-pill-v2" data-variant="purple">
                                                    Branch: {BRANCH_UI_CONFIG[selectedBranch]?.label || CANONICAL_BRANCH_MAP[selectedBranch]?.label || selectedBranch}
                                                </span>
                                            )}
                                            {selectedMonthFilter !== null && (
                                                <span className="status-pill-v2" data-variant="info">
                                                    Month: {MONTH_NAMES[selectedMonthFilter]}
                                                </span>
                                            )}
                                            <span style={{ color: '#64748b', fontWeight: 600 }}>
                                                ({filteredJobs.length} jobs shown below)
                                            </span>
                                        </div>
                                        <button
                                            className="fleet-sec-btn"
                                            style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '6px' }}
                                            onClick={() => {
                                                setSelectedBranch('all');
                                                setSelectedMonthFilter(null);
                                            }}
                                        >
                                            Clear Drilldown ✕
                                        </button>
                                    </div>
                                )}

                                {/* Executive Table Card */}
                                <div className="srcc-table-card">
                                    {/* Card Top Action Bar */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '16px 22px',
                                        background: '#ffffff',
                                        borderBottom: '1px solid #e2e8f0',
                                        flexWrap: 'wrap',
                                        gap: '12px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '38px',
                                                height: '38px',
                                                borderRadius: '10px',
                                                background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.12) 0%, rgba(124, 58, 237, 0.12) 100%)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#4f46e5',
                                                flexShrink: 0
                                            }}>
                                                <Building2 size={19} />
                                            </div>
                                            <div>
                                                <div style={{
                                                    fontFamily: 'Outfit, sans-serif',
                                                    fontSize: '15px',
                                                    fontWeight: 800,
                                                    color: '#0f172a',
                                                    letterSpacing: '-0.01em',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px'
                                                }}>
                                                    <span>Unbilled Jobs Matrix</span>
                                                    <span style={{
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        padding: '2px 8px',
                                                        borderRadius: '6px',
                                                        background: '#e0e7ff',
                                                        color: '#4338ca',
                                                        letterSpacing: '0.04em'
                                                    }}>
                                                        SRCC
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                    Financial Year {effectiveFY || '26-27'} • Interactive Station × Month breakdown till current LR date
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <button
                                                type="button"
                                                className="fleet-sec-btn"
                                                style={{ padding: '6px 14px', fontSize: '12px', borderRadius: '8px', gap: '6px' }}
                                                onClick={handleCopySrccMatrix}
                                                title="Copy matrix data in Excel / Sheet compatible format"
                                            >
                                                {copiedKey === 'srcc_matrix' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                                                <span>{copiedKey === 'srcc_matrix' ? 'Copied Matrix!' : 'Copy Matrix'}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Modern Table */}
                                    <div style={{ overflowX: 'auto' }}>
                                        <table className="srcc-modern-table">
                                            <thead>
                                                <tr>
                                                    <th className="branch-col">Branch / Station</th>
                                                    {srccMatrixData.activeMonths.map(m => {
                                                        const isColActive = selectedMonthFilter === m.month && selectedBranch === 'all';
                                                        return (
                                                            <th
                                                                key={m.month}
                                                                className={`month-col ${m.isLatest ? 'is-current' : ''}`}
                                                                style={{
                                                                    background: isColActive ? 'rgba(79, 70, 229, 0.12)' : undefined,
                                                                    color: isColActive ? '#4f46e5' : undefined
                                                                }}
                                                                title={`Click to filter jobs for ${m.name}`}
                                                                onClick={() => handleMonthClick(m.month)}
                                                            >
                                                                {m.isLatest ? (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                            <span>{m.name}</span>
                                                                            <span style={{
                                                                                fontSize: '9.5px',
                                                                                padding: '1.5px 6px',
                                                                                borderRadius: '999px',
                                                                                background: '#4f46e5',
                                                                                color: '#ffffff',
                                                                                fontWeight: 800,
                                                                                letterSpacing: '0.04em',
                                                                                textTransform: 'uppercase'
                                                                            }}>Till Date</span>
                                                                        </div>
                                                                        <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 600, textTransform: 'none' }}>
                                                                            till {m.dateStr} LR date
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    <span>{m.name}</span>
                                                                )}
                                                            </th>
                                                        );
                                                    })}
                                                    <th
                                                        className="total-col"
                                                        onClick={() => { setSelectedBranch('all'); setSelectedMonthFilter(null); }}
                                                        title="Click to reset filters and show all"
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        Total
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {srccMatrixData.allBranchList.map(b => {
                                                    const isRowActive = selectedBranch === b.key && selectedMonthFilter === null;
                                                    const rowTotal = srccMatrixData.matrix[b.key]?.total || 0;
                                                    const cfg = BRANCH_UI_CONFIG[b.key] || {
                                                        code: b.key,
                                                        label: b.label,
                                                        fullName: b.label,
                                                        color: '#64748b',
                                                        bg: 'rgba(100, 116, 139, 0.12)',
                                                        dot: '#64748b'
                                                    };

                                                    return (
                                                        <tr
                                                            key={b.key}
                                                            className={isRowActive ? 'row-active' : ''}
                                                        >
                                                            {/* Branch Info Cell */}
                                                            <td
                                                                className="branch-cell"
                                                                onClick={() => handleBranchClick(b.key)}
                                                                title={`Click to filter all ${cfg.label} jobs (${rowTotal})`}
                                                            >
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                                    <div style={{
                                                                        width: '32px',
                                                                        height: '32px',
                                                                        borderRadius: '8px',
                                                                        background: cfg.bg,
                                                                        color: cfg.color,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        fontWeight: 800,
                                                                        fontSize: '11px',
                                                                        fontFamily: 'Outfit, sans-serif',
                                                                        letterSpacing: '0.02em',
                                                                        flexShrink: 0
                                                                    }}>
                                                                        {cfg.code.slice(0, 4)}
                                                                    </div>
                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                        <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '13.5px' }}>
                                                                            {cfg.label}
                                                                        </span>
                                                                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                                                                            {cfg.fullName}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            {/* Monthly Values */}
                                                            {srccMatrixData.activeMonths.map(m => {
                                                                const val = srccMatrixData.matrix[b.key]?.[m.month] || 0;
                                                                const isCellSelected = selectedBranch === b.key && selectedMonthFilter === m.month;

                                                                let badgeClass = 'zero';
                                                                if (isCellSelected) {
                                                                    badgeClass = 'active';
                                                                } else if (val >= 25) {
                                                                    badgeClass = 'high';
                                                                } else if (val > 0) {
                                                                    badgeClass = 'low';
                                                                }

                                                                return (
                                                                    <td
                                                                        key={m.month}
                                                                        className="val-cell"
                                                                    >
                                                                        <button
                                                                            type="button"
                                                                            className={`srcc-val-badge ${badgeClass}`}
                                                                            disabled={val === 0}
                                                                            onClick={() => handleCellClick(b.key, m.month, val)}
                                                                            title={val > 0 ? `Click to view ${val} uninvoiced jobs for ${cfg.label} in ${m.name}` : `No uninvoiced jobs`}
                                                                        >
                                                                            {val > 0 ? val : '—'}
                                                                        </button>
                                                                    </td>
                                                                );
                                                            })}

                                                            {/* Row Total */}
                                                            <td style={{ textAlign: 'center' }}>
                                                                <button
                                                                    type="button"
                                                                    className="srcc-row-total-badge"
                                                                    onClick={() => handleBranchClick(b.key)}
                                                                    title={`Click to filter all ${cfg.label} jobs (${rowTotal})`}
                                                                >
                                                                    {rowTotal}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot>
                                                <tr className="total-row">
                                                    <td
                                                        className="branch-cell"
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => { setSelectedBranch('all'); setSelectedMonthFilter(null); }}
                                                        title="Click to view all jobs across all stations"
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{
                                                                fontFamily: 'Outfit, sans-serif',
                                                                fontWeight: 800,
                                                                fontSize: '13px',
                                                                textTransform: 'uppercase',
                                                                letterSpacing: '0.04em',
                                                                color: '#0f172a'
                                                            }}>
                                                                Total Unbilled
                                                            </span>
                                                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                                                                (All Stations)
                                                            </span>
                                                        </div>
                                                    </td>
                                                    {srccMatrixData.activeMonths.map(m => {
                                                        const monthTotal = srccMatrixData.monthTotals[m.month] || 0;
                                                        const isColActive = selectedMonthFilter === m.month && selectedBranch === 'all';

                                                        return (
                                                            <td key={m.month} style={{ textAlign: 'center' }}>
                                                                <button
                                                                    type="button"
                                                                    className={`srcc-val-badge ${isColActive ? 'active' : (monthTotal > 0 ? 'high' : 'low')}`}
                                                                    style={{ fontWeight: 800, minWidth: '40px' }}
                                                                    onClick={() => handleMonthClick(m.month)}
                                                                    title={`Click to filter all jobs in ${m.name} (${monthTotal})`}
                                                                >
                                                                    {monthTotal}
                                                                </button>
                                                            </td>
                                                        );
                                                    })}
                                                    {/* Grand Total */}
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button
                                                            type="button"
                                                            className="srcc-grand-badge"
                                                            onClick={() => { setSelectedBranch('all'); setSelectedMonthFilter(null); }}
                                                            title="Click to reset filters and view all uninvoiced jobs"
                                                        >
                                                            {srccMatrixData.grandTotal}
                                                        </button>
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>

                                {/* Executive Bottom Summary Strip */}
                                <div className="srcc-summary-strip">
                                    <div className="srcc-branch-pill-list">
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginRight: '4px' }}>
                                            Quick Filter:
                                        </span>
                                        <button
                                            type="button"
                                            className={`srcc-branch-pill ${selectedBranch === 'all' && selectedMonthFilter === null ? 'active' : ''}`}
                                            onClick={() => { setSelectedBranch('all'); setSelectedMonthFilter(null); }}
                                        >
                                            <span>All Stations</span>
                                            <strong>{srccMatrixData.grandTotal}</strong>
                                        </button>
                                        {srccMatrixData.allBranchList.map(b => {
                                            const cfg = BRANCH_UI_CONFIG[b.key] || { label: b.label, dot: '#64748b' };
                                            const count = srccMatrixData.matrix[b.key]?.total || 0;
                                            const isActive = selectedBranch === b.key && selectedMonthFilter === null;

                                            return (
                                                <button
                                                    key={b.key}
                                                    type="button"
                                                    className={`srcc-branch-pill ${isActive ? 'active' : ''}`}
                                                    onClick={() => handleBranchClick(b.key)}
                                                >
                                                    <span style={{
                                                        width: '7px',
                                                        height: '7px',
                                                        borderRadius: '50%',
                                                        background: isActive ? '#ffffff' : (cfg.dot || '#64748b'),
                                                        flexShrink: 0
                                                    }}></span>
                                                    <span>{cfg.label}:</span>
                                                    <strong>{count}</strong>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="srcc-grand-kpi">
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                            <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b', fontWeight: 700 }}>
                                                Total Unbilled Jobs
                                            </span>
                                            <span style={{ fontSize: '12px', color: '#4f46e5', fontWeight: 600 }}>
                                                {effectiveFY ? `FY ${effectiveFY}` : 'FY 26-27'} Running
                                            </span>
                                        </div>
                                        <div style={{
                                            fontSize: '22px',
                                            fontFamily: 'Outfit, sans-serif',
                                            fontWeight: 900,
                                            color: '#1e293b',
                                            lineHeight: 1
                                        }}>
                                            {srccMatrixData.grandTotal}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {summaryTab === 'branch' && (
                            <table className="fleet-table">
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left' }}>Branch / Station</th>
                                        <th style={{ textAlign: 'center' }}>Uninvoiced Jobs</th>
                                        <th style={{ textAlign: 'center' }}>Own Fleet</th>
                                        <th style={{ textAlign: 'center' }}>Hired Fleet</th>
                                        <th style={{ textAlign: 'center' }}>LR Completed</th>
                                        <th style={{ textAlign: 'center' }}>LR Pending</th>
                                        <th style={{ textAlign: 'center' }}>Active E-Way</th>
                                        <th style={{ textAlign: 'right', minWidth: '130px' }}>Volume Share</th>
                                        <th style={{ textAlign: 'center', width: '90px' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {branchBreakdown.length === 0 ? (
                                        <tr>
                                            <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                                                No branch records available for the selected period.
                                            </td>
                                        </tr>
                                    ) : (
                                        branchBreakdown.map((b, idx) => {
                                            const isSelected = selectedBranch === b.branch ||
                                                (selectedBranch === 'AMD' && (b.branch === 'KHD' || b.branch === 'SND')) ||
                                                (selectedBranch === 'GIM' && b.branch === 'MND');

                                            return (
                                                <tr
                                                    key={b.branch || idx}
                                                    style={{
                                                        background: isSelected ? 'rgba(79, 70, 229, 0.06)' : undefined,
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => setSelectedBranch(prev => prev === b.branch ? 'all' : b.branch)}
                                                >
                                                    {/* Branch Name & Hub */}
                                                    <td style={{ textAlign: 'left' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span
                                                                style={{
                                                                    width: '8px',
                                                                    height: '8px',
                                                                    borderRadius: '50%',
                                                                    background: b.completedCount > 0 ? '#10b981' : '#f59e0b',
                                                                    flexShrink: 0
                                                                }}
                                                            />
                                                            <div>
                                                                <div style={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span>{b.name}</span>
                                                                    <span style={{ fontSize: '11px', color: '#4f46e5', background: 'rgba(79, 70, 229, 0.08)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }} className="code-font">
                                                                        {b.branch}
                                                                    </span>
                                                                </div>
                                                                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>
                                                                    {b.group} {b.city ? `• ${b.city}` : ''}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Total Uninvoiced Jobs */}
                                                    <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '15px', color: '#4f46e5' }} className="mono">
                                                        {b.totalJobs}
                                                    </td>

                                                    {/* Own Fleet */}
                                                    <td style={{ textAlign: 'center' }}>
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <span style={{ fontWeight: 800, color: '#0284c7' }} className="mono">{b.ownCount}</span>
                                                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>({b.ownPct}%)</span>
                                                        </div>
                                                    </td>

                                                    {/* Hired Fleet */}
                                                    <td style={{ textAlign: 'center' }}>
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <span style={{ fontWeight: 800, color: '#7c3aed' }} className="mono">{b.hiredCount}</span>
                                                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>({b.hiredPct}%)</span>
                                                        </div>
                                                    </td>

                                                    {/* LR Completed */}
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span style={{ fontWeight: 800, color: '#059669' }} className="mono">
                                                            {b.completedCount}
                                                        </span>
                                                    </td>

                                                    {/* LR Pending */}
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span style={{ fontWeight: 800, color: b.pendingCount > 0 ? '#d97706' : '#64748b' }} className="mono">
                                                            {b.pendingCount}
                                                        </span>
                                                    </td>

                                                    {/* Active E-Way */}
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span style={{ fontWeight: 800, color: b.validEwayCount > 0 ? '#0f172a' : '#94a3b8' }} className="mono">
                                                            {b.validEwayCount}
                                                        </span>
                                                    </td>

                                                    {/* Backlog Share */}
                                                    <td style={{ textAlign: 'right' }}>
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                                            <div style={{ width: '60px', height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${b.sharePct}%`, height: '100%', background: '#4f46e5', borderRadius: '999px' }} />
                                                            </div>
                                                            <span style={{ fontWeight: 800, color: '#0f172a', minWidth: '38px', textAlign: 'right' }} className="mono">{b.sharePct}%</span>
                                                        </div>
                                                    </td>

                                                    {/* Action Filter */}
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button
                                                            className="fleet-action-filter-btn"
                                                            data-active={isSelected}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedBranch(prev => prev === b.branch ? 'all' : b.branch);
                                                            }}
                                                            title={isSelected ? 'Clear branch filter' : `Filter by ${b.name}`}
                                                        >
                                                            {isSelected ? 'Filtered ✓' : 'Filter'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}

                                    {/* Total Grand Row */}
                                    {branchBreakdown.length > 0 && (
                                        <tr style={{ background: 'linear-gradient(180deg, rgba(241, 245, 249, 0.8) 0%, rgba(226, 232, 240, 0.9) 100%)', borderTop: '2px solid rgba(226, 232, 240, 1)' }}>
                                            <td style={{ textAlign: 'left', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', fontSize: '12.5px' }}>
                                                Total Across All Stations
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '16px', color: '#4f46e5' }} className="mono">
                                                {branchGrandTotals.totalJobs}
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: 800, color: '#0284c7' }} className="mono">
                                                {branchGrandTotals.ownCount} <span style={{ fontSize: '11px', color: '#64748b' }}>({branchGrandTotals.ownPct}%)</span>
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: 800, color: '#7c3aed' }} className="mono">
                                                {branchGrandTotals.hiredCount} <span style={{ fontSize: '11px', color: '#64748b' }}>({branchGrandTotals.hiredPct}%)</span>
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: 900, color: '#059669', fontSize: '15px' }} className="mono">
                                                {branchGrandTotals.completedCount}
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: 900, color: '#d97706', fontSize: '15px' }} className="mono">
                                                {branchGrandTotals.pendingCount}
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: 900, color: '#0f172a' }} className="mono">
                                                {branchGrandTotals.validEwayCount}
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 900, color: '#0f172a' }} className="mono">
                                                100%
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {selectedBranch !== 'all' && (
                                                    <button
                                                        onClick={() => setSelectedBranch('all')}
                                                        className="fleet-sec-btn"
                                                        style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '6px' }}
                                                    >
                                                        Reset
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}

                        {summaryTab === 'consignor' && (
                            <table className="fleet-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '60px' }}>#</th>
                                        <th style={{ textAlign: 'left' }}>Consignor (Client / Shipper)</th>
                                        <th style={{ textAlign: 'center' }}>Uninvoiced Jobs</th>
                                        <th style={{ textAlign: 'center' }}>Own Fleet</th>
                                        <th style={{ textAlign: 'center' }}>Hired Fleet</th>
                                        <th style={{ textAlign: 'center' }}>LR Completed</th>
                                        <th style={{ textAlign: 'center' }}>LR Pending</th>
                                        <th style={{ textAlign: 'right', minWidth: '130px' }}>Volume Share</th>
                                        <th style={{ textAlign: 'center', width: '90px' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {consignorBreakdown.length === 0 ? (
                                        <tr>
                                            <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                                                No consignor records available.
                                            </td>
                                        </tr>
                                    ) : (
                                        consignorBreakdown.map((c, idx) => {
                                            const isFiltered = searchTerm === c.consignor;
                                            return (
                                                <tr
                                                    key={c.consignor || idx}
                                                    style={{
                                                        background: isFiltered ? 'rgba(79, 70, 229, 0.06)' : undefined,
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => setSearchTerm(prev => prev === c.consignor ? '' : c.consignor)}
                                                >
                                                    <td style={{ fontWeight: 600, color: '#94a3b8' }} className="mono">{idx + 1}</td>
                                                    <td style={{ textAlign: 'left', fontWeight: 700, color: '#0f172a' }}>{c.consignor}</td>
                                                    <td style={{ textAlign: 'center', fontWeight: 900, color: '#4f46e5' }} className="mono">{c.totalJobs}</td>
                                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#0284c7' }} className="mono">{c.ownCount}</td>
                                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#7c3aed' }} className="mono">{c.hiredCount}</td>
                                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#059669' }} className="mono">{c.completedCount}</td>
                                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#d97706' }} className="mono">{c.pendingCount}</td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                                            <div style={{ width: '60px', height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${c.sharePct}%`, height: '100%', background: '#4f46e5', borderRadius: '999px' }} />
                                                            </div>
                                                            <span style={{ fontWeight: 800, color: '#0f172a', minWidth: '38px', textAlign: 'right' }} className="mono">{c.sharePct}%</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button
                                                            className="fleet-action-filter-btn"
                                                            data-active={isFiltered}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSearchTerm(prev => prev === c.consignor ? '' : c.consignor);
                                                            }}
                                                        >
                                                            {isFiltered ? 'Filtered ✓' : 'Filter'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        )}

                        {summaryTab === 'status' && (
                            <table className="fleet-table">
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left' }}>Tracking Stage / State</th>
                                        <th style={{ textAlign: 'center' }}>Total Consignments</th>
                                        <th style={{ textAlign: 'center' }}>Own Fleet</th>
                                        <th style={{ textAlign: 'center' }}>Hired Fleet</th>
                                        <th style={{ textAlign: 'center' }}>Active E-Way</th>
                                        <th style={{ textAlign: 'right', minWidth: '130px' }}>Stage Share</th>
                                        <th style={{ textAlign: 'center', width: '90px' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {statusBreakdown.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                                                No status records available.
                                            </td>
                                        </tr>
                                    ) : (
                                        statusBreakdown.map((s, idx) => {
                                            const isFiltered = selectedStatus === s.status;
                                            return (
                                                <tr
                                                    key={s.status || idx}
                                                    style={{
                                                        background: isFiltered ? 'rgba(79, 70, 229, 0.06)' : undefined,
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => setSelectedStatus(prev => prev === s.status ? 'all' : s.status)}
                                                >
                                                    <td style={{ textAlign: 'left' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {renderStatusPill(s.status)}
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'center', fontWeight: 900, color: '#4f46e5' }} className="mono">{s.totalJobs}</td>
                                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#0284c7' }} className="mono">{s.ownCount}</td>
                                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#7c3aed' }} className="mono">{s.hiredCount}</td>
                                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#059669' }} className="mono">{s.validEwayCount}</td>
                                                    <td style={{ textAlign: 'right' }}>
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                                            <div style={{ width: '60px', height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${s.sharePct}%`, height: '100%', background: '#4f46e5', borderRadius: '999px' }} />
                                                            </div>
                                                            <span style={{ fontWeight: 800, color: '#0f172a', minWidth: '38px', textAlign: 'right' }} className="mono">{s.sharePct}%</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button
                                                            className="fleet-action-filter-btn"
                                                            data-active={isFiltered}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedStatus(prev => prev === s.status ? 'all' : s.status);
                                                            }}
                                                        >
                                                            {isFiltered ? 'Filtered ✓' : 'Filter'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {/* Controls Toolbar in Fleet Theme */}
            <div className="fleet-toolbar">
                {/* Search Box */}
                <div className="fleet-search-wrapper">
                    <Search size={17} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        placeholder="Search LR #, PR #, Container, Vehicle, Party..."
                        className="fleet-search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8' }}
                        >
                            <X size={15} />
                        </button>
                    )}
                </div>

                {/* Filters & Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Branch Dropdown Filter */}
                    <select
                        className="fleet-select"
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                    >
                        <option value="all">All Branches ({allJobs.length} jobs)</option>
                        <optgroup label="Regional Groups">
                            <option value="AMD">
                                Ahmedabad Hub (KHD + SND) ({regionalCounts.AMD} jobs)
                            </option>
                            <option value="GIM">
                                Gandhidham Hub (Mundra Port) ({regionalCounts.GIM} jobs)
                            </option>
                        </optgroup>
                        <optgroup label="Operating Terminals / Hubs">
                            {branchList.map(code => (
                                <option key={code} value={code}>
                                    {getBranchDisplay(code)} ({branchCounts[code]} jobs)
                                </option>
                            ))}
                        </optgroup>
                    </select>

                    {/* Month Dropdown Filter */}
                    <select
                        className="fleet-select"
                        value={selectedMonthFilter === null ? 'all' : String(selectedMonthFilter)}
                        onChange={(e) => setSelectedMonthFilter(e.target.value === 'all' ? null : parseInt(e.target.value, 10))}
                    >
                        <option value="all">All Months</option>
                        {srccMatrixData.activeMonths.map(m => (
                            <option key={m.month} value={m.month}>
                                {m.name} ({srccMatrixData.monthTotals[m.month] || 0} jobs)
                            </option>
                        ))}
                    </select>

                    {/* Fleet Filter */}
                    <select
                        className="fleet-select"
                        value={selectedFleet}
                        onChange={(e) => setSelectedFleet(e.target.value)}
                    >
                        <option value="all">All Fleet</option>
                        <option value="own">Own Fleet</option>
                        <option value="hired">Hired Fleet</option>
                    </select>

                    {/* Status Filter */}
                    <select
                        className="fleet-select"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                        <option value="all">All Tracking Stages</option>
                        {statusOptions.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>

                    {/* Refresh Button */}
                    <button
                        className="fleet-sec-btn"
                        onClick={() => fetchUninvoicedJobs(true)}
                        disabled={loading}
                        title="Refresh live data"
                    >
                        <RefreshCw size={14} className={loading ? 'spin' : ''} />
                        <span>Refresh</span>
                    </button>

                    {/* Export Button from Fleet Utilization */}
                    <button
                        className="fleet-export-btn"
                        onClick={handleDownloadExcel}
                        disabled={downloadingExcel}
                    >
                        {downloadingExcel ? (
                            <>
                                <RefreshCw size={14} className="spin" />
                                <span>Exporting...</span>
                            </>
                        ) : (
                            <>
                                <Download size={14} />
                                <span>Download Excel</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Error Notice */}
            {error && (
                <div style={{ background: 'rgba(254, 242, 242, 0.9)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', color: '#dc2626', fontSize: '14px' }}>
                    <AlertTriangle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {/* Fleet Table Wrap */}
            <div className="fleet-table-wrap">
                <div style={{ overflowX: 'auto' }}>
                    <table className="fleet-table">
                        <thead>
                            <tr>
                                <th>LR / TR Number</th>
                                <th>PR / Order Details</th>
                                <th>Container / Type</th>
                                <th>Consignor / Consignee</th>
                                <th>Vehicle / Fleet</th>
                                <th>Transit Route</th>
                                <th>E-Way Bill</th>
                                <th>Stage & State</th>
                                <th style={{ textAlign: 'center' }}>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="9" style={{ padding: '0', border: 'none' }}>
                                        <div className="fleet-loading">
                                            <div className="fleet-spinner"></div>
                                            <div style={{ marginTop: '16px', color: '#0f172a', fontWeight: 700, fontFamily: "'Outfit', sans-serif", fontSize: '15px' }}>
                                                Loading Uninvoiced Records...
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                                                Streaming live operational data from transport API
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedJobs.length === 0 ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '70px 20px', color: '#64748b' }}>
                                        <Layers size={36} color="#cbd5e1" style={{ margin: '0 auto 12px', display: 'block' }} />
                                        <div style={{ fontWeight: 700, fontSize: '16px', color: '#0f172a', fontFamily: "'Outfit', sans-serif" }}>
                                            No Uninvoiced Records Match Filter
                                        </div>
                                        <div style={{ fontSize: '13.5px', marginTop: '4px' }}>
                                            {selectedBranch !== 'all' ? `No records found for branch "${getBranchDisplay(selectedBranch)}"` : 'Try adjusting the date period or clearing your search criteria'}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedJobs.map((job, idx) => {
                                    const branchCode = resolveJobBranch(job);
                                    return (
                                        <tr key={`${job.tr_no}_${job.container_number}_${idx}`}>
                                            {/* TR / LR Number */}
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span className="code-font" style={{ fontWeight: 700, color: '#4f46e5', fontSize: '14px' }}>
                                                        {job.tr_no || '—'}
                                                    </span>
                                                    {job.tr_no && (
                                                        <button
                                                            className="fleet-copy-btn"
                                                            onClick={() => handleCopy(job.tr_no, `tr_${idx}`)}
                                                            title="Copy LR No"
                                                        >
                                                            {copiedKey === `tr_${idx}` ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                                                        </button>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                                                    Branch: <strong style={{ color: '#0f172a' }}>{branchCode}</strong>
                                                    {BRANCH_METADATA[branchCode] && (
                                                        <span style={{ color: '#475569', fontSize: '11.5px', marginLeft: '5px' }}>
                                                            ({BRANCH_METADATA[branchCode].name})
                                                        </span>
                                                    )}
                                                    {job.lr_date && ` • ${job.lr_date}`}
                                                </div>
                                            </td>

                                            {/* PR Number & Details */}
                                            <td>
                                                <div className="code-font" style={{ fontWeight: 600, color: '#0f172a' }}>
                                                    {job.pr_no || '—'}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                                                    {job.pr_date ? `PR: ${job.pr_date}` : 'No date'}
                                                    {job.container_count && ` • ${job.container_count} cont.`}
                                                </div>
                                            </td>

                                            {/* Container Number & Type */}
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span className="code-font" style={{ fontWeight: 700, color: '#0f172a' }}>
                                                        {job.container_number || '—'}
                                                    </span>
                                                    {job.container_number && (
                                                        <button
                                                            className="fleet-copy-btn"
                                                            onClick={() => handleCopy(job.container_number, `cnt_${idx}`)}
                                                            title="Copy Container No"
                                                        >
                                                            {copiedKey === `cnt_${idx}` ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                                                        </button>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                                                    {job.container_type || 'General'}
                                                    {job.seal_no && ` • Seal: ${job.seal_no}`}
                                                </div>
                                            </td>

                                            {/* Consignor & Consignee */}
                                            <td style={{ maxWidth: '240px' }}>
                                                <div style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={job.consignor}>
                                                    {job.consignor || '—'}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }} title={job.consignee}>
                                                    ↳ {job.consignee || '—'}
                                                </div>
                                            </td>

                                            {/* Vehicle & Fleet */}
                                            <td>
                                                <div className="code-font" style={{ fontWeight: 700, color: '#0f172a' }}>
                                                    {job.vehicle_no || '—'}
                                                </div>
                                                <div style={{ marginTop: '4px' }}>
                                                    <span
                                                        className="status-pill-v2"
                                                        data-variant={(job.own_hired || '').toLowerCase() === 'own' ? 'info' : 'purple'}
                                                        style={{ padding: '3px 10px', fontSize: '10.5px' }}
                                                    >
                                                        {job.own_hired || '—'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Route */}
                                            <td style={{ maxWidth: '200px' }}>
                                                <div style={{ fontSize: '13px', color: '#334155', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`${job.goods_pickup || '—'} → ${job.goods_delivery || '—'}`}>
                                                    {job.goods_pickup || '—'}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    ➔ {job.goods_delivery || '—'}
                                                </div>
                                            </td>

                                            {/* E-Way Bill */}
                                            <td>
                                                <div className="code-font" style={{ fontSize: '13px', fontWeight: 600, color: job.eWay_bill && job.eWay_bill !== '000000000000' ? '#059669' : '#94a3b8' }}>
                                                    {job.eWay_bill || '—'}
                                                </div>
                                            </td>

                                            {/* Stage & State */}
                                            <td>
                                                <div>{renderStatusPill(job.tracking_status)}</div>
                                                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px', fontFamily: "'Outfit', sans-serif", fontWeight: 600 }}>
                                                    {job.lr_completed === 'Completed' ? (
                                                        <span style={{ color: '#059669' }}>● COMPLETED</span>
                                                    ) : (
                                                        <span style={{ color: '#d97706' }}>○ LR PENDING</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* View Full 37 Fields */}
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    className="fleet-sec-btn"
                                                    style={{ padding: '6px 12px', fontSize: '12.5px', borderRadius: '10px' }}
                                                    onClick={() => setSelectedJob(job)}
                                                    title="View complete 37-field record"
                                                >
                                                    <ExternalLink size={13} />
                                                    <span>View</span>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="fleet-pagination">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', color: '#64748b' }}>
                        <span>Showing</span>
                        <strong style={{ color: '#0f172a' }}>{paginatedJobs.length}</strong>
                        <span>of</span>
                        <strong style={{ color: '#0f172a' }}>{filteredJobs.length}</strong>
                        <span>records</span>
                        {selectedBranch !== 'all' && (
                            <span style={{ color: '#4f46e5', fontWeight: 600 }}>
                                ({getBranchDisplay(selectedBranch)})
                            </span>
                        )}

                        <span style={{ margin: '0 8px', color: '#cbd5e1' }}>|</span>

                        <span>Per Page:</span>
                        <select
                            value={limit}
                            onChange={(e) => {
                                setLimit(Number(e.target.value));
                                setPage(1);
                            }}
                            className="fleet-select"
                            style={{ padding: '4px 10px', fontSize: '12.5px' }}
                        >
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={500}>500</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            className="fleet-sec-btn"
                            style={{ padding: '6px 14px' }}
                            onClick={() => setPage(p => Math.max(p - 1, 1))}
                            disabled={page <= 1 || loading}
                        >
                            <ChevronLeft size={16} /> Prev
                        </button>
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', padding: '0 8px' }}>
                            Page {page} of {totalPages}
                        </span>
                        <button
                            className="fleet-sec-btn"
                            style={{ padding: '6px 14px' }}
                            onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                            disabled={page >= totalPages || loading}
                        >
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Slide-out Full 37-Field Detail Inspection Modal */}
            {selectedJob && (
                <div className="fleet-modal-backdrop" onClick={() => setSelectedJob(null)}>
                    <div className="fleet-modal-panel" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="fleet-modal-header">
                            <div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>Job Details:</span>
                                    <span className="code-font" style={{ color: '#4f46e5' }}>{selectedJob.tr_no}</span>
                                </div>
                                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                                    PR #{selectedJob.pr_no} • Container #{selectedJob.container_number} • Branch: {getBranchDisplay(resolveJobBranch(selectedJob))}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedJob(null)}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b', padding: '6px', borderRadius: '8px' }}
                            >
                                <X size={22} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="fleet-modal-body">
                            {/* Section 1: Job & Documentation */}
                            <div className="fleet-section-box">
                                <div className="fleet-section-heading">
                                    <FileText size={15} color="#4f46e5" />
                                    <span>Job & Document References</span>
                                </div>
                                <div className="fleet-grid-2">
                                    <div>
                                        <div className="fleet-field-lbl">TR / LR Number</div>
                                        <div className="fleet-field-val code-font" style={{ color: '#4f46e5', fontWeight: 700 }}>{selectedJob.tr_no || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">Branch / Operating Hub</div>
                                        <div className="fleet-field-val" style={{ fontWeight: 700, color: '#0f172a' }}>
                                            {getBranchDisplay(resolveJobBranch(selectedJob))}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">LR Date</div>
                                        <div className="fleet-field-val">{selectedJob.lr_date || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">Regional Zone</div>
                                        <div className="fleet-field-val">
                                            {BRANCH_METADATA[resolveJobBranch(selectedJob)]?.groupLabel || '—'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">PR Number</div>
                                        <div className="fleet-field-val code-font">{selectedJob.pr_no || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">PR Date</div>
                                        <div className="fleet-field-val">{selectedJob.pr_date || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">Bill of Entry (BE) No</div>
                                        <div className="fleet-field-val code-font">{selectedJob.be_no || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">BE Date</div>
                                        <div className="fleet-field-val">{selectedJob.be_date || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">Document No</div>
                                        <div className="fleet-field-val code-font">{selectedJob.document_no || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">Document Date</div>
                                        <div className="fleet-field-val">{selectedJob.document_date || '—'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Consignment Parties */}
                            <div className="fleet-section-box">
                                <div className="fleet-section-heading">
                                    <Building2 size={15} color="#0284c7" />
                                    <span>Consignment Parties</span>
                                </div>
                                <div className="fleet-grid-2">
                                    <div>
                                        <div className="fleet-field-lbl">Consignor</div>
                                        <div className="fleet-field-val">{selectedJob.consignor || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">Consignee</div>
                                        <div className="fleet-field-val">{selectedJob.consignee || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">Invoice Party</div>
                                        <div className="fleet-field-val">{selectedJob.invoice_party || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">Shipping Line</div>
                                        <div className="fleet-field-val">{selectedJob.shipping_line || '—'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Container & Cargo */}
                            <div className="fleet-section-box">
                                <div className="fleet-section-heading">
                                    <Layers size={15} color="#059669" />
                                    <span>Container & Cargo Profile</span>
                                </div>
                                <div className="fleet-grid-2">
                                    <div>
                                        <div className="fleet-field-lbl">Container Number</div>
                                        <div className="fleet-field-val code-font" style={{ fontWeight: 700 }}>{selectedJob.container_number || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">Container Type</div>
                                        <div className="fleet-field-val">{selectedJob.container_type || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">Container Count</div>
                                        <div className="fleet-field-val">{selectedJob.container_count || '1'}</div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">Seal Number</div>
                                        <div className="fleet-field-val code-font">{selectedJob.seal_no || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">DO Validity</div>
                                        <div className="fleet-field-val">{selectedJob.do_validity || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">Branch Code & Location</div>
                                        <div className="fleet-field-val">
                                            {getBranchDisplay(resolveJobBranch(selectedJob))}
                                        </div>
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <div className="fleet-field-lbl">Cargo Description</div>
                                        <div className="fleet-field-val" style={{ whiteSpace: 'pre-line', background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '4px' }}>
                                            {selectedJob.description || 'No Description'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Fleet & Driver */}
                            <div className="fleet-section-box">
                                <div className="fleet-section-heading">
                                    <Truck size={15} color="#7c3aed" />
                                    <span>Fleet & Driver Allocation</span>
                                </div>
                                <div className="fleet-grid-2">
                                    <div>
                                        <div className="fleet-field-lbl">Fleet Category</div>
                                        <div className="fleet-field-val">
                                            <span
                                                className="status-pill-v2"
                                                data-variant={(selectedJob.own_hired || '').toLowerCase() === 'own' ? 'info' : 'purple'}
                                            >
                                                {selectedJob.own_hired || '—'}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">Vehicle Registration No</div>
                                        <div className="fleet-field-val code-font" style={{ fontWeight: 700 }}>{selectedJob.vehicle_no || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">Driver Name</div>
                                        <div className="fleet-field-val">{selectedJob.driver_name || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">Driver Contact Phone</div>
                                        <div className="fleet-field-val code-font">
                                            {selectedJob.driver_phone ? (
                                                <a href={`tel:${selectedJob.driver_phone}`} style={{ color: '#4f46e5', textDecoration: 'none' }}>
                                                    {selectedJob.driver_phone}
                                                </a>
                                            ) : '—'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 5: Routing & Offloading */}
                            <div className="fleet-section-box">
                                <div className="fleet-section-heading">
                                    <MapPin size={15} color="#ea580c" />
                                    <span>Route & Yard Offloading</span>
                                </div>
                                <div className="fleet-grid-2">
                                    <div>
                                        <div className="fleet-field-lbl">Goods Pickup Location</div>
                                        <div className="fleet-field-val">{selectedJob.goods_pickup || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">Goods Delivery Destination</div>
                                        <div className="fleet-field-val">{selectedJob.goods_delivery || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">Planned Container Offloading</div>
                                        <div className="fleet-field-val">{selectedJob.container_offloading || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">Actual Offloaded Yard</div>
                                        <div className="fleet-field-val">{selectedJob.actual_container_offloading || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">Offloading Timestamp</div>
                                        <div className="fleet-field-val">{selectedJob.offloading_date_time || '—'}</div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">Tipping Required</div>
                                        <div className="fleet-field-val">{selectedJob.tipping || 'No'}</div>
                                    </div>
                                    {selectedJob.offloading_remark && (
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <div className="fleet-field-lbl">Offloading Remarks</div>
                                            <div className="fleet-field-val">{selectedJob.offloading_remark}</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section 6: Compliance, Status & Billing */}
                            <div className="fleet-section-box">
                                <div className="fleet-section-heading">
                                    <ShieldCheck size={15} color="#dc2626" />
                                    <span>Compliance, Status & Billing</span>
                                </div>
                                <div className="fleet-grid-2">
                                    <div>
                                        <div className="fleet-field-lbl">E-Way Bill Number</div>
                                        <div className="fleet-field-val code-font" style={{ fontWeight: 700, color: '#059669' }}>
                                            {selectedJob.eWay_bill || '—'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">Tracking Stage</div>
                                        <div className="fleet-field-val">{renderStatusPill(selectedJob.tracking_status)}</div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">LR Completion Status</div>
                                        <div className="fleet-field-val" style={{ fontWeight: 600 }}>{selectedJob.lr_completed || 'Pending'}</div>
                                    </div>
                                    <div>
                                        <div className="fleet-field-lbl">Detention Days</div>
                                        <div className="fleet-field-val code-font">{selectedJob.detention_days || '0'}</div>
                                    </div>
                                    {selectedJob.reason_of_detention && (
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <div className="fleet-field-lbl">Reason for Detention</div>
                                            <div className="fleet-field-val" style={{ color: '#dc2626' }}>{selectedJob.reason_of_detention}</div>
                                        </div>
                                    )}
                                    {selectedJob.instructions && (
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <div className="fleet-field-lbl">Transit / Handling Instructions</div>
                                            <div className="fleet-field-val">{selectedJob.instructions}</div>
                                        </div>
                                    )}
                                    {selectedJob.invoice_instruction && (
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <div className="fleet-field-lbl">Invoicing & Billing Instructions</div>
                                            <div className="fleet-field-val" style={{ color: '#4f46e5', fontWeight: 600 }}>{selectedJob.invoice_instruction}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UninvoicedJobsReport;
