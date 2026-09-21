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
    ShieldCheck,
    MapPin
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

    // Calculate effective financial year for API request based on central filters
    const effectiveFY = useMemo(() => {
        if (filterType === 'fin-year') {
            return selectedFinancialYear || 'all';
        }
        if (filterType === 'all') {
            return 'all';
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
        return 'all';
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

    // Reset page to 1 when any filter changes
    useEffect(() => {
        setPage(1);
    }, [filterType, selectedFinancialYear, selectedMonth, selectedYear, selectedQuarter, selectedDay, selectedBranch, selectedFleet, selectedStatus, debouncedSearch]);

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
        if (filterType === 'all' || filterType === 'fin-year') return null;
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
    }, [allJobs, dateBounds, selectedBranch, selectedFleet, selectedStatus, debouncedSearch]);

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
