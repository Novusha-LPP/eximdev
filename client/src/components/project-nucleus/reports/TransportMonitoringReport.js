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
    CartesianGrid
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

// ─── Custom CSS Styling ─────────────────────────────────────────────────────────

const CUSTOM_CSS = `
.nucleus-transport-root {
    animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: #1e293b;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
}

.report-header-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
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
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.03);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-white-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.08);
}

.stat-number-hero {
    font-size: 2.25rem;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.5px;
    font-variant-numeric: tabular-nums;
}

.report-tab-pill {
    padding: 8px 16px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 13px;
    color: #475569;
    background: transparent;
    border: none;
    transition: all 0.2s ease;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.report-tab-pill:hover {
    color: #1e293b;
    background: #f1f5f9;
}

.report-tab-pill.active {
    color: #ffffff;
    background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
}

.table-modern {
    border-collapse: separate;
    border-spacing: 0;
    width: 100%;
}

.table-modern thead th {
    background: #f8fafc;
    color: #475569;
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    padding: 12px 14px;
    border-bottom: 1px solid #e2e8f0;
    vertical-align: middle;
    white-space: nowrap;
}

.table-modern tbody td {
    padding: 11px 14px;
    font-size: 13px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
}

.table-modern tbody tr:hover td {
    background: rgba(241, 245, 249, 0.8);
}

.modern-download-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: linear-gradient(135deg, #059669 0%, #10b981 100%);
    color: #ffffff;
    border: none;
    padding: 8px 16px;
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
    opacity: 0.65;
    cursor: not-allowed;
}

.modern-download-badge {
    background: rgba(255, 255, 255, 0.22);
    padding: 2px 6px;
    border-radius: 5px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.5px;
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

.radar-chip {
    padding: 10px 14px;
    border-radius: 12px;
    transition: all 0.2s ease;
    cursor: pointer;
    border: 1px solid transparent;
}

.radar-chip:hover {
    transform: translateY(-2px);
    filter: brightness(0.96);
}

.nucleus-report-root select,
.stat-white-card select,
.form-select {
    padding-right: 34px !important;
    background-position: right 10px center !important;
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

.modern-pdf-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%) !important;
    color: #ffffff !important;
    border: none !important;
    padding: 8px 16px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(239, 68, 68, 0.25) !important;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    letter-spacing: 0.2px;
}

.modern-pdf-btn:hover:not(:disabled) {
    transform: translateY(-1.5px);
    box-shadow: 0 6px 20px rgba(239, 68, 68, 0.35) !important;
    filter: brightness(1.05);
    color: #ffffff !important;
}

.modern-pdf-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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

.modern-pdf-badge {
    background: rgba(255, 255, 255, 0.22);
    padding: 2px 6px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.5px;
}
`;

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b', '#ef4444'];

// ─── Helpers ───────────────────────────────────────────────────────────────────

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
    if (!ieStr) return <span className="text-muted small">—</span>;
    const s = String(ieStr).toLowerCase().trim();
    if (s.includes('import')) {
        return <span className="badge bg-primary-subtle text-primary fw-semibold px-2 py-1 rounded-pill">Import</span>;
    }
    if (s.includes('export')) {
        return <span className="badge bg-success-subtle text-success fw-semibold px-2 py-1 rounded-pill">Export</span>;
    }
    return <span className="badge bg-warning-subtle text-warning fw-semibold px-2 py-1 rounded-pill">{ieStr}</span>;
};

const getDoValidityBadge = (validityStr) => {
    if (!validityStr || validityStr === '-') {
        return <span className="text-muted small">—</span>;
    }
    try {
        const d = validityStr.includes('T') ? parseISO(validityStr) : new Date(validityStr);
        if (!isValid(d)) return <span className="text-muted small">{validityStr}</span>;

        const refDate = new Date();
        const diff = differenceInDays(d, refDate);
        const formatted = format(d, 'dd MMM yyyy');

        if (diff < 0) {
            return (
                <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2 py-1 rounded-pill d-inline-flex align-items-center gap-1" title={`Expired ${Math.abs(diff)} day(s) ago`}>
                    <AlertTriangle size={11} /> {formatted} ({Math.abs(diff)}d ago)
                </span>
            );
        }
        if (diff <= 3) {
            return (
                <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1 rounded-pill d-inline-flex align-items-center gap-1" title={`Expires in ${diff} day(s)`}>
                    <Clock size={11} /> {formatted} ({diff === 0 ? 'Today' : `${diff}d left`})
                </span>
            );
        }
        return (
            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1 rounded-pill d-inline-flex align-items-center gap-1" title="DO is active">
                <CheckCircle2 size={11} /> {formatted}
            </span>
        );
    } catch {
        return <span className="text-muted small">{validityStr}</span>;
    }
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
            className="btn btn-link btn-sm p-0 ms-1 text-muted"
            style={{ border: 'none', background: 'transparent', verticalAlign: 'middle' }}
        >
            {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
        </button>
    );
};

// ─── Main Component: Transport Pending Queue & Dispatch Monitoring ────────────

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
    const [lastUpdated, setLastUpdated] = useState(null);

    // Active Tab: 'dashboard' | 'pending' | 'active' | 'closed' | 'analytics'
    const [activeTab, setActiveTab] = useState('dashboard');

    // Filters & Searches
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('ALL');
    const [selectedIe, setSelectedIe] = useState('ALL');
    const [selectedContainerType, setSelectedContainerType] = useState('ALL');
    const [selectedCustomer, setSelectedCustomer] = useState('ALL');
    const [selectedDoStatus, setSelectedDoStatus] = useState('ALL'); // ALL, EXPIRED, EXPIRING_SOON, VALID, NO_DO
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [viewMode, setViewMode] = useState('flat'); // 'flat' | 'by_customer' | 'grouped'
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

    // Human-readable date period label
    const periodLabel = useMemo(() => {
        if (!dateQuery.startDate) return 'All Time / Live Queue';
        if (dateQuery.startDate === dateQuery.endDate) {
            try {
                return format(parseISO(dateQuery.startDate), 'dd MMMM yyyy');
            } catch {
                return dateQuery.startDate;
            }
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
            const isSingleDay = !dateQuery.startDate || dateQuery.startDate === dateQuery.endDate;
            const targetDateStr = dateQuery.startDate || format(new Date(), 'yyyy-MM-dd');

            const dispatchPromise = isSingleDay
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

            // 1. Pending Records
            if (pendingRes.status === 'fulfilled' && pendingRes.value.data?.success && Array.isArray(pendingRes.value.data.data) && pendingRes.value.data.data.length > 0) {
                pRecords = pendingRes.value.data.data;
            } else if (dispatchRes.status === 'fulfilled' && dispatchRes.value.data?.pendingLRSnapshot && Array.isArray(dispatchRes.value.data.pendingLRSnapshot)) {
                pRecords = dispatchRes.value.data.pendingLRSnapshot;
            }

            // 2. Active & Closed Records
            if (dispatchRes.status === 'fulfilled' && dispatchRes.value.data) {
                const d = dispatchRes.value.data;
                if (Array.isArray(d.activeLRs)) {
                    aRecords = d.activeLRs;
                }
                if (Array.isArray(d.closedLRs)) {
                    cRecords = d.closedLRs;
                }
            }

            setPendingList(pRecords);
            setActiveList(aRecords);
            setClosedList(cRecords);
            setLastUpdated(new Date());
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
            if (b && String(b).trim()) {
                allDiscoveredBranchesRef.current.add(String(b).trim());
            }
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
            if (b && String(b).trim()) {
                set.add(String(b).trim());
            }
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

    // ─── Customer Summary Breakdown ───────────────────────────────────────────

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

    // ─── Size / Type Matcher Helper ───────────────────────────────────────────

    const matchesContainerTypeOrSize = (item, filterVal) => {
        if (filterVal === 'ALL') return true;
        const typeStr = String(item.container_type || item.container_size || item.vehicle_type || item.type || '').toLowerCase();
        const cntrsStr = Array.isArray(item.containers) ? item.containers.join(' ').toLowerCase() : '';

        if (filterVal === 'SIZE_20' || filterVal === '20') {
            return typeStr.includes('20') || cntrsStr.includes('20');
        }
        if (filterVal === 'SIZE_40' || filterVal === '40') {
            return typeStr.includes('40') || cntrsStr.includes('40');
        }
        if (filterVal === 'SIZE_45' || filterVal === '45') {
            return typeStr.includes('45') || cntrsStr.includes('45');
        }

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

    // ─── Filter Pending List ───────────────────────────────────────────────────

    const filteredPendingList = useMemo(() => {
        let list = pendingList || [];

        if (selectedBranch !== 'ALL') {
            list = list.filter(item => matchesBranch(item, selectedBranch));
        }

        if (selectedIe !== 'ALL') {
            list = list.filter(item => {
                const s = String(item.import_export || '').toLowerCase();
                return s.includes(selectedIe.toLowerCase());
            });
        }

        if (selectedContainerType !== 'ALL') {
            list = list.filter(item => matchesContainerTypeOrSize(item, selectedContainerType));
        }

        if (selectedCustomer !== 'ALL') {
            list = list.filter(item => (item.invoice_party || '') === selectedCustomer);
        }

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

    // ─── Filter Active List ────────────────────────────────────────────────────

    const filteredActiveList = useMemo(() => {
        let list = activeList || [];

        if (selectedBranch !== 'ALL') {
            list = list.filter(item => matchesBranch(item, selectedBranch));
        }

        if (selectedIe !== 'ALL') {
            list = list.filter(item => {
                const s = String(item.import_export || '').toLowerCase();
                return s.includes(selectedIe.toLowerCase());
            });
        }

        if (selectedContainerType !== 'ALL') {
            list = list.filter(item => matchesContainerTypeOrSize(item, selectedContainerType));
        }

        if (selectedCustomer !== 'ALL') {
            list = list.filter(item => (item.consignee || item.invoice_party || '') === selectedCustomer);
        }

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

    // ─── Filter Closed List ────────────────────────────────────────────────────

    const filteredClosedList = useMemo(() => {
        let list = closedList || [];

        if (selectedBranch !== 'ALL') {
            list = list.filter(item => matchesBranch(item, selectedBranch));
        }

        if (selectedIe !== 'ALL') {
            list = list.filter(item => {
                const s = String(item.import_export || '').toLowerCase();
                return s.includes(selectedIe.toLowerCase());
            });
        }

        if (selectedContainerType !== 'ALL') {
            list = list.filter(item => matchesContainerTypeOrSize(item, selectedContainerType));
        }

        if (selectedCustomer !== 'ALL') {
            list = list.filter(item => (item.consignee || item.invoice_party || '') === selectedCustomer);
        }

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

    // ─── Sorted List ───────────────────────────────────────────────────────────

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

    // ─── Overall Stats ─────────────────────────────────────────────────────────

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
                } catch {
                    // Ignore parsing error
                }
            }
        });

        const fulfillmentRate = totalAllContainers > 0 ? Math.round((totalCreatedLRs / totalAllContainers) * 100) : 0;

        return {
            totalPRs,
            totalPendingContainers,
            totalAllContainers,
            totalCreatedLRs,
            totalActiveLRs: filteredActiveList.length,
            totalClosedLRs: filteredClosedList.length,
            fulfillmentRate,
            expiredDoCount,
            expiringSoonDoCount,
            validDoCount,
            uniquePartiesCount: uniqueParties.size
        };
    }, [filteredPendingList, filteredActiveList, filteredClosedList]);

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

        return Object.values(map).sort((a, b) => (b.pendingCont + b.activeLRs + b.closedLRs) - (a.pendingCont + a.activeLRs + a.closedLRs));
    }, [filteredPendingList, filteredActiveList, filteredClosedList]);

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

    // ─── Grouped Breakdown Views for Pending Tab ──────────────────────────────

    const customerGroupedList = useMemo(() => {
        if (activeTab !== 'pending') return [];
        const map = new Map();
        for (const item of sortedList) {
            const cust = item.invoice_party || 'Direct / Unassigned';
            if (!map.has(cust)) {
                map.set(cust, {
                    customerName: cust,
                    totalPending: 0,
                    totalContainers: 0,
                    createdLRs: 0,
                    prs: [],
                    branches: new Set(),
                    types: new Set()
                });
            }
            const entry = map.get(cust);
            entry.totalPending += Number(item.pendingCount || 0);
            entry.totalContainers += Number(item.totalContainers || 0);
            entry.createdLRs += Number(item.lrCreatedContainers || 0);
            entry.prs.push(item);
            if (item.branch) entry.branches.add(item.branch);
            if (item.container_type) entry.types.add(item.container_type);
        }
        return Array.from(map.values())
            .map(e => ({
                ...e,
                branches: Array.from(e.branches),
                types: Array.from(e.types)
            }))
            .sort((a, b) => b.totalPending - a.totalPending);
    }, [sortedList, activeTab]);

    const typeGroupedList = useMemo(() => {
        if (activeTab !== 'pending') return [];
        const map = new Map();
        for (const item of sortedList) {
            const type = item.container_type || 'Standard / Unspecified';
            if (!map.has(type)) {
                map.set(type, {
                    typeName: type,
                    totalPending: 0,
                    totalContainers: 0,
                    createdLRs: 0,
                    prs: [],
                    customers: new Set(),
                    branches: new Set()
                });
            }
            const entry = map.get(type);
            entry.totalPending += Number(item.pendingCount || 0);
            entry.totalContainers += Number(item.totalContainers || 0);
            entry.createdLRs += Number(item.lrCreatedContainers || 0);
            entry.prs.push(item);
            if (item.invoice_party) entry.customers.add(item.invoice_party);
            if (item.branch) entry.branches.add(item.branch);
        }
        return Array.from(map.values())
            .map(e => ({
                ...e,
                customers: Array.from(e.customers),
                branches: Array.from(e.branches)
            }))
            .sort((a, b) => b.totalPending - a.totalPending);
    }, [sortedList, activeTab]);

    // ─── Active Display List & Pagination ──────────────────────────────────────

    const activeDisplayList = useMemo(() => {
        if (activeTab === 'pending') {
            if (viewMode === 'by_customer') return customerGroupedList;
            if (viewMode === 'grouped') return typeGroupedList;
        }
        return sortedList;
    }, [activeTab, viewMode, customerGroupedList, typeGroupedList, sortedList]);

    const totalPages = pageSize === 'ALL' ? 1 : Math.ceil(activeDisplayList.length / (parseInt(pageSize, 10) || 25));
    const paginatedList = useMemo(() => {
        if (pageSize === 'ALL') return activeDisplayList;
        const size = parseInt(pageSize, 10) || 25;
        const start = (currentPage - 1) * size;
        return activeDisplayList.slice(start, start + size);
    }, [activeDisplayList, currentPage, pageSize]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // ─── Export to Excel ───────────────────────────────────────────────────────

    const handleExportFullExcel = async () => {
        setIsExportingExcel(true);
        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'AlVision Exim Project Nucleus';
            workbook.created = new Date();

            // SHEET 1: PENDING PRs QUEUE
            const wsPending = workbook.addWorksheet('Pending PRs Queue', { views: [{ state: 'frozen', ySplit: 5 }] });
            wsPending.addRow(['ALVISION EXIM — TRANSPORT PICKUP QUEUE & PENDING PRs']);
            wsPending.addRow([`Period: ${periodLabel} | Total Pending PRs: ${filteredPendingList.length} | Pending Containers: ${overallStats.totalPendingContainers}`]);
            wsPending.addRow([]);
            wsPending.addRow(['Srl', 'PR No', 'Branch', 'Invoice Party / Customer', 'Trade', 'Container Type', 'Pending', 'Total Cont.', 'Created LRs', 'DO Validity', 'Pickup Port', 'Delivery Destination']);

            // Header styling
            const pHeader = wsPending.getRow(4);
            pHeader.height = 24;
            pHeader.eachCell(c => {
                c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
                c.font = { color: { argb: 'FFFFFFFF' }, bold: true };
                c.alignment = { horizontal: 'center', vertical: 'middle' };
            });

            wsPending.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + Math.max(filteredPendingList.length, 1), column: 12 } };

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

            // Auto-fit columns
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
            const wsActive = workbook.addWorksheet('Active In-Transit LRs', { views: [{ state: 'frozen', ySplit: 5 }] });
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

            wsActive.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + Math.max(filteredActiveList.length, 1), column: 10 } };

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
            const wsClosed = workbook.addWorksheet('Completed Trips', { views: [{ state: 'frozen', ySplit: 5 }] });
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

            wsClosed.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + Math.max(filteredClosedList.length, 1), column: 8 } };

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

    // ─── Export to PDF ─────────────────────────────────────────────────────────

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
                        i + 1,
                        item.pr_no || '—',
                        item.branch || '—',
                        item.invoice_party || '—',
                        item.import_export || '—',
                        item.container_type || '—',
                        item.pendingCount || 0,
                        item.totalContainers || 0,
                        item.do_validity || '—'
                    ];
                }
                if (activeTab === 'active') {
                    return [
                        i + 1,
                        item.tr_no || '—',
                        item.vehicle_no || '—',
                        item.branch || '—',
                        item.consignee || item.invoice_party || '—',
                        item.container_number || '—',
                        formatDateDisplay(item.lr_date || item.date)
                    ];
                }
                return [
                    i + 1,
                    item.tr_no || '—',
                    item.vehicle_no || '—',
                    item.branch || '—',
                    item.consignee || item.invoice_party || '—',
                    item.container_number || '—',
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

    // ─── Render Loading & Error States ──────────────────────────────────────────

    if (loading) {
        return (
            <div className="d-flex flex-column align-items-center justify-content-center py-5 nucleus-transport-root" style={{ minHeight: '400px' }}>
                <style>{CUSTOM_CSS}</style>
                <div className="spinner-border text-primary mb-3" style={{ width: '3rem', height: '3rem' }} role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
                <h5 className="text-secondary fw-semibold">Loading Transport Queue & Dispatch Data...</h5>
                <p className="text-muted small">Aggregating live PR backlog, in-transit vehicles, and delivery records</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger mx-3 my-4 p-4 shadow-sm rounded-4 nucleus-transport-root">
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
        <div className="container-fluid p-3 p-md-4 nucleus-transport-root">
            <style>{CUSTOM_CSS}</style>

            {/* ─── Header Strip ─────────────────────────────────────────────────── */}
            <div className="report-header-card p-3 p-md-4 mb-4 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                        <span className="fs-4">🚚</span>
                        <h4 className="fw-bold text-dark mb-0" style={{ letterSpacing: '-0.3px' }}>
                            Pending LRs & Dispatch Monitoring
                        </h4>
                    </div>
                    <div className="d-flex align-items-center gap-2 flex-wrap text-muted small mt-1">
                        <span>Transport pickup queue for <strong className="text-primary">{periodLabel}</strong></span>
                        <span>•</span>
                        <div className="d-inline-flex align-items-center gap-1">
                            <span className="fw-semibold text-dark">Branch:</span>
                            <select
                                value={selectedBranch}
                                onChange={(e) => { setSelectedBranch(e.target.value); setCurrentPage(1); }}
                                className="form-select form-select-sm rounded-pill w-auto ps-2 pe-4 py-0.5"
                                style={{
                                    fontSize: '12px',
                                    fontWeight: selectedBranch !== 'ALL' ? 700 : 500,
                                    borderColor: selectedBranch !== 'ALL' ? '#2563eb' : '#cbd5e1',
                                    background: selectedBranch !== 'ALL' ? '#eff6ff' : '#ffffff',
                                    color: selectedBranch !== 'ALL' ? '#1d4ed8' : '#1e293b',
                                    height: '28px',
                                    minHeight: '28px',
                                    paddingRight: '32px'
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

                {/* Header Action Buttons */}
                <div className="d-flex align-items-center gap-2 flex-wrap">
                    <button
                        onClick={loadReportData}
                        className="modern-refresh-btn"
                        title="Refresh data"
                    >
                        <RefreshCw size={13} />
                        <span>Refresh</span>
                    </button>

                    <button
                        onClick={handleExportFullExcel}
                        disabled={isExportingExcel}
                        className="modern-download-btn"
                        title="Download complete structured Excel workbook with active AutoFilters"
                    >
                        {isExportingExcel ? (
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

            {/* ─── Navigation Tabs Bar ──────────────────────────────────────────── */}
            <div className="bg-white p-1 rounded-3 shadow-sm border mb-4 d-inline-flex flex-wrap gap-1">
                {[
                    { id: 'dashboard', label: '📊 Operations Dashboard' },
                    { id: 'pending', label: `⏳ Pending PRs Queue (${overallStats.totalPRs})` },
                    { id: 'active', label: `🚚 Active In-Transit (${overallStats.totalActiveLRs})` },
                    { id: 'closed', label: `✅ Completed Deliveries (${overallStats.totalClosedLRs})` },
                    { id: 'analytics', label: '📈 Analytics & Trends' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id);
                            setCurrentPage(1);
                        }}
                        className={`report-tab-pill ${activeTab === tab.id ? 'active' : ''}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ══════════════════════════════════════════════════════════════════════════ */}
            {/* TAB 1: OPERATIONS DASHBOARD                                               */}
            {/* ══════════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'dashboard' && (
                <div>
                    {/* Row 1: Core 4 Hero KPI Cards */}
                    <div className="row g-3 mb-4">
                        {/* KPI 1: Total Pending Backlog (Royal Blue Hero Card) */}
                        <div className="col-12 col-sm-6 col-xl-3">
                            <div
                                onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
                                className="stat-hero-card p-3 p-md-4 h-100 d-flex flex-column justify-content-between cursor-pointer"
                                style={{ cursor: 'pointer' }}
                            >
                                <div>
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <span className="text-uppercase fw-bold" style={{ fontSize: '11px', letterSpacing: '0.8px', opacity: 0.9 }}>
                                            Pending Containers Backlog
                                        </span>
                                        <span
                                            className="badge px-2 py-1 rounded-pill"
                                            style={{
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                letterSpacing: '0.3px',
                                                backgroundColor: '#ffffff',
                                                color: '#1e3a8a',
                                                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
                                            }}
                                        >
                                            📋 {overallStats.totalPRs} PRs
                                        </span>
                                    </div>
                                    <div className="stat-number-hero mb-2">{overallStats.totalPendingContainers.toLocaleString()}</div>
                                </div>
                                <div className="d-flex align-items-center gap-2 pt-2 border-top border-white border-opacity-10 small" style={{ opacity: 0.9 }}>
                                    <span>⏱️ Live Pickup Backlog</span>
                                    <span>•</span>
                                    <span>{overallStats.totalAllContainers} Total Ordered</span>
                                </div>
                            </div>
                        </div>

                        {/* KPI 2: Active In-Transit Vehicles */}
                        <div className="col-12 col-sm-6 col-xl-3">
                            <div
                                onClick={() => { setActiveTab('active'); setCurrentPage(1); }}
                                className="stat-white-card p-3 p-md-4 h-100 d-flex flex-column justify-content-between cursor-pointer"
                                style={{ cursor: 'pointer' }}
                            >
                                <div>
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <span className="card-title-sub text-muted">Active In-Transit LRs</span>
                                        <span className="badge bg-warning-subtle text-warning fw-bold px-2 py-1 rounded-pill" style={{ fontSize: '11px' }}>
                                            On Road
                                        </span>
                                    </div>
                                    <div className="stat-number-hero text-dark mb-2">
                                        {overallStats.totalActiveLRs.toLocaleString()}
                                        <span className="text-muted fw-normal fs-6 ms-1">Trucks</span>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center gap-1 flex-wrap pt-2 border-top small text-muted">
                                    <span>🚚 Live Dispatches Moving to Destination</span>
                                </div>
                            </div>
                        </div>

                        {/* KPI 3: Completed / Closed Trips */}
                        <div className="col-12 col-sm-6 col-xl-3">
                            <div
                                onClick={() => { setActiveTab('closed'); setCurrentPage(1); }}
                                className="stat-white-card p-3 p-md-4 h-100 d-flex flex-column justify-content-between cursor-pointer"
                                style={{ cursor: 'pointer' }}
                            >
                                <div>
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <span className="card-title-sub text-muted">Completed Deliveries</span>
                                        <span className="badge bg-success-subtle text-success fw-bold px-2 py-1 rounded-pill" style={{ fontSize: '11px' }}>
                                            {overallStats.fulfillmentRate}% Fulfillment
                                        </span>
                                    </div>
                                    <div className="stat-number-hero text-dark mb-2">
                                        {overallStats.totalClosedLRs.toLocaleString()}
                                        <span className="text-muted fw-normal fs-6 ms-1">Closed</span>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center gap-2 pt-2 border-top small text-muted">
                                    <span>✅ Verified Deliveries in Period</span>
                                </div>
                            </div>
                        </div>

                        {/* KPI 4: Customers Waiting */}
                        <div className="col-12 col-sm-6 col-xl-3">
                            <div
                                onClick={() => setShowCustomerModal(true)}
                                className="stat-white-card p-3 p-md-4 h-100 d-flex flex-column justify-content-between cursor-pointer"
                                style={{ cursor: 'pointer' }}
                            >
                                <div>
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <span className="card-title-sub text-muted">Client Accounts</span>
                                        <span className="badge bg-primary-subtle text-primary fw-bold px-2 py-1 rounded-pill" style={{ fontSize: '11px' }}>
                                            View List ↗
                                        </span>
                                    </div>
                                    <div className="stat-number-hero text-dark mb-2">
                                        {overallStats.uniquePartiesCount.toLocaleString()}
                                        <span className="text-muted fw-normal fs-6 ms-1">Parties</span>
                                    </div>
                                </div>
                                <div className="d-flex align-items-center gap-2 pt-2 border-top small text-primary fw-semibold">
                                    <span>Click to view customer details ↗</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: DO Urgency Radar Strip */}
                    <div className="stat-white-card p-3 p-md-4 mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <div>
                                <h6 className="fw-bold mb-0 text-dark">⏰ DO Urgency Radar & Bottleneck Flags</h6>
                                <span className="text-muted small">Real-time customs delivery order validity status across active PR queue</span>
                            </div>
                            {selectedDoStatus !== 'ALL' && (
                                <button
                                    onClick={() => setSelectedDoStatus('ALL')}
                                    className="btn btn-outline-danger btn-sm rounded-pill px-3 py-1 fw-bold"
                                >
                                    ✕ Reset Filter
                                </button>
                            )}
                        </div>

                        <div className="row g-2">
                            {/* Chip 1: Expired DOs */}
                            <div className="col-12 col-md-4">
                                <div
                                    onClick={() => {
                                        setActiveTab('pending');
                                        setSelectedDoStatus(prev => prev === 'EXPIRED' ? 'ALL' : 'EXPIRED');
                                        setCurrentPage(1);
                                    }}
                                    className="radar-chip p-3 h-100"
                                    style={{
                                        background: selectedDoStatus === 'EXPIRED' ? '#fee2e2' : '#fef2f2',
                                        borderColor: selectedDoStatus === 'EXPIRED' ? '#ef4444' : '#fecaca'
                                    }}
                                >
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="fw-bold text-danger d-flex align-items-center gap-2" style={{ fontSize: '13px' }}>
                                            <AlertTriangle size={15} /> 🔴 Critical Expired DOs
                                        </span>
                                        <span className="badge bg-danger text-white fw-bold px-2 py-1 rounded-pill">
                                            {overallStats.expiredDoCount} PRs
                                        </span>
                                    </div>
                                    <p className="text-muted small mb-0 mt-2" style={{ fontSize: '11.5px' }}>
                                        DO validity expired before dispatch. High detention risk.
                                    </p>
                                </div>
                            </div>

                            {/* Chip 2: Expiring Soon (≤3 Days) */}
                            <div className="col-12 col-md-4">
                                <div
                                    onClick={() => {
                                        setActiveTab('pending');
                                        setSelectedDoStatus(prev => prev === 'EXPIRING_SOON' ? 'ALL' : 'EXPIRING_SOON');
                                        setCurrentPage(1);
                                    }}
                                    className="radar-chip p-3 h-100"
                                    style={{
                                        background: selectedDoStatus === 'EXPIRING_SOON' ? '#fef3c7' : '#fffbeb',
                                        borderColor: selectedDoStatus === 'EXPIRING_SOON' ? '#f59e0b' : '#fde68a'
                                    }}
                                >
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="fw-bold text-warning d-flex align-items-center gap-2" style={{ fontSize: '13px', color: '#b45309' }}>
                                            <Clock size={15} /> 🟡 Expiring Soon (≤3 Days)
                                        </span>
                                        <span className="badge bg-warning text-dark fw-bold px-2 py-1 rounded-pill">
                                            {overallStats.expiringSoonDoCount} PRs
                                        </span>
                                    </div>
                                    <p className="text-muted small mb-0 mt-2" style={{ fontSize: '11.5px' }}>
                                        Immediate vehicle allocation required to avoid expiration.
                                    </p>
                                </div>
                            </div>

                            {/* Chip 3: Active & Valid DOs */}
                            <div className="col-12 col-md-4">
                                <div
                                    onClick={() => {
                                        setActiveTab('pending');
                                        setSelectedDoStatus(prev => prev === 'VALID' ? 'ALL' : 'VALID');
                                        setCurrentPage(1);
                                    }}
                                    className="radar-chip p-3 h-100"
                                    style={{
                                        background: selectedDoStatus === 'VALID' ? '#dcfce7' : '#f0fdf4',
                                        borderColor: selectedDoStatus === 'VALID' ? '#10b981' : '#bbf7d0'
                                    }}
                                >
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="fw-bold text-success d-flex align-items-center gap-2" style={{ fontSize: '13px' }}>
                                            <CheckCircle2 size={15} /> 🟢 Active & Valid DOs
                                        </span>
                                        <span className="badge bg-success text-white fw-bold px-2 py-1 rounded-pill">
                                            {overallStats.validDoCount} PRs
                                        </span>
                                    </div>
                                    <p className="text-muted small mb-0 mt-2" style={{ fontSize: '11.5px' }}>
                                        Safe buffer available for normal dispatch scheduling.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 3: 50/50 Desktop Grid - Branch Performance & Mode Breakdown */}
                    <div className="row g-4 mb-4">
                        {/* Left: Branch Breakdown Table */}
                        <div className="col-12 col-xl-6">
                            <div className="stat-white-card p-3 p-md-4 h-100">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <div>
                                        <h6 className="fw-bold mb-0 text-dark">🏢 Branch Operations Matrix</h6>
                                        <span className="text-muted small">Pending PRs, In-transit trucks, and closed dispatches by station</span>
                                    </div>
                                </div>

                                <div className="table-responsive" style={{ maxHeight: '320px' }}>
                                    <table className="table table-modern align-middle mb-0">
                                        <thead className="sticky-top">
                                            <tr>
                                                <th>Branch</th>
                                                <th className="text-center">Pending PRs</th>
                                                <th className="text-center">Pending Cont.</th>
                                                <th className="text-center">In-Transit</th>
                                                <th className="text-center">Closed</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {branchSummaryBreakdown.map((b, idx) => (
                                                <tr key={idx}>
                                                    <td className="fw-semibold text-dark">{b.branch}</td>
                                                    <td className="text-center font-monospace fw-bold text-danger">{b.pendingPRs}</td>
                                                    <td className="text-center font-monospace">{b.pendingCont}</td>
                                                    <td className="text-center font-monospace text-warning fw-bold">{b.activeLRs}</td>
                                                    <td className="text-center font-monospace text-success fw-bold">{b.closedLRs}</td>
                                                </tr>
                                            ))}
                                            {branchSummaryBreakdown.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="text-center text-muted py-4">No branch data available.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Right: Trade Mode Split & Container Sizes */}
                        <div className="col-12 col-xl-6">
                            <div className="stat-white-card p-3 p-md-4 h-100 d-flex flex-column justify-content-between">
                                <div>
                                    <h6 className="fw-bold mb-3 text-dark">📦 Trade Type & Container Distribution</h6>
                                    
                                    {/* Trade Mode Split Progress Bar */}
                                    <div className="mb-4">
                                        <div className="d-flex justify-content-between align-items-center mb-1 small">
                                            <span className="fw-semibold text-primary">Import ({tradeTypeSummaryBreakdown.find(t => t.tradeType === 'Import')?.pendingCont || 0} Cont.)</span>
                                            <span className="fw-semibold text-success">Export ({tradeTypeSummaryBreakdown.find(t => t.tradeType === 'Export')?.pendingCont || 0} Cont.)</span>
                                        </div>
                                        <div className="progress" style={{ height: '10px', borderRadius: '5px' }}>
                                            <div
                                                className="progress-bar bg-primary"
                                                role="progressbar"
                                                style={{
                                                    width: `${overallStats.totalPendingContainers > 0
                                                        ? ((tradeTypeSummaryBreakdown.find(t => t.tradeType === 'Import')?.pendingCont || 0) / overallStats.totalPendingContainers) * 100
                                                        : 50}%`
                                                }}
                                            />
                                            <div
                                                className="progress-bar bg-success"
                                                role="progressbar"
                                                style={{
                                                    width: `${overallStats.totalPendingContainers > 0
                                                        ? ((tradeTypeSummaryBreakdown.find(t => t.tradeType === 'Export')?.pendingCont || 0) / overallStats.totalPendingContainers) * 100
                                                        : 50}%`
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Container Sizes Grid */}
                                    <div className="row g-2">
                                        {containerSizeSummaryBreakdown.slice(0, 4).map((c, i) => (
                                            <div key={i} className="col-6">
                                                <div className="p-3 bg-light rounded-3 border">
                                                    <span className="text-muted small d-block">{c.containerType}</span>
                                                    <span className="fs-5 fw-bold text-dark font-monospace">{c.pendingContainers}</span>
                                                    <span className="text-muted small ms-1">pending</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-3 border-top d-flex justify-content-between align-items-center small text-muted mt-3">
                                    <span>Overall Fulfillment: <strong>{overallStats.fulfillmentRate}%</strong></span>
                                    <button
                                        onClick={() => setActiveTab('analytics')}
                                        className="btn btn-link btn-sm text-primary fw-semibold p-0 text-decoration-none"
                                    >
                                        View Complete Analytics →
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════════ */}
            {/* TAB 2, 3, 4: LIST DATA VIEWS (Pending / Active / Closed)                  */}
            {/* ══════════════════════════════════════════════════════════════════════════ */}
            {['pending', 'active', 'closed'].includes(activeTab) && (
                <div className="stat-white-card p-3 p-md-4">
                    {/* 2-Tier Structured Toolbar */}
                    <div className="d-flex flex-column gap-3 mb-4">
                        {/* Row 1: Search + View Switcher + Export Buttons */}
                        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                            {/* Search Box */}
                            <div className="d-flex align-items-center gap-2 bg-light px-3 py-2 rounded-3 border flex-grow-1" style={{ maxWidth: '420px' }}>
                                <Search size={14} className="text-muted flex-shrink-0" />
                                <input
                                    type="text"
                                    className="border-0 bg-transparent w-100 text-dark small"
                                    placeholder={activeTab === 'pending' ? "Search PR No, Customer, Port..." : "Search LR, Vehicle, Container..."}
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                    style={{ outline: 'none' }}
                                />
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm('')} className="border-0 bg-transparent text-muted p-0">✕</button>
                                )}
                            </div>

                            {/* View Switcher (Pending only) */}
                            {activeTab === 'pending' && (
                                <div className="bg-light p-1 rounded-3 border d-inline-flex gap-1">
                                    <button
                                        onClick={() => { setViewMode('flat'); setCurrentPage(1); }}
                                        className={`btn btn-sm ${viewMode === 'flat' ? 'btn-white shadow-sm bg-white text-primary fw-bold' : 'text-muted'}`}
                                    >
                                        <ListFilter size={12} className="me-1" /> Table
                                    </button>
                                    <button
                                        onClick={() => { setViewMode('by_customer'); setCurrentPage(1); }}
                                        className={`btn btn-sm ${viewMode === 'by_customer' ? 'btn-white shadow-sm bg-white text-primary fw-bold' : 'text-muted'}`}
                                    >
                                        <Users size={12} className="me-1" /> By Customer
                                    </button>
                                    <button
                                        onClick={() => { setViewMode('grouped'); setCurrentPage(1); }}
                                        className={`btn btn-sm ${viewMode === 'grouped' ? 'btn-white shadow-sm bg-white text-primary fw-bold' : 'text-muted'}`}
                                    >
                                        <Layers size={12} className="me-1" /> By Type
                                    </button>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="d-flex align-items-center gap-2">
                                <button
                                    onClick={handleExportFullExcel}
                                    disabled={isExportingExcel || sortedList.length === 0}
                                    className="modern-download-btn"
                                >
                                    <Download size={13} />
                                    <span>Download Excel</span>
                                    <span className="modern-download-badge">XLSX</span>
                                </button>
                                <button
                                    onClick={handleExportPDF}
                                    disabled={sortedList.length === 0}
                                    className="modern-pdf-btn"
                                >
                                    <FileText size={13} />
                                    <span>Download PDF</span>
                                    <span className="modern-pdf-badge">PDF</span>
                                </button>
                            </div>
                        </div>

                        {/* Row 2: Filter Pills Strip */}
                        <div className="d-flex align-items-center gap-2 flex-wrap pt-2 border-top">
                            <span className="text-muted small fw-bold text-uppercase me-1" style={{ fontSize: '11px' }}>
                                Filters:
                            </span>

                            {/* DO Status Filter (Pending only) */}
                            {activeTab === 'pending' && (
                                <select
                                    value={selectedDoStatus}
                                    onChange={(e) => { setSelectedDoStatus(e.target.value); setCurrentPage(1); }}
                                    className="form-select form-select-sm rounded-pill w-auto ps-3 pe-4"
                                    style={{
                                        borderColor: selectedDoStatus !== 'ALL' ? '#ef4444' : undefined,
                                        background: selectedDoStatus !== 'ALL' ? '#fef2f2' : undefined,
                                        fontWeight: selectedDoStatus !== 'ALL' ? 700 : 500,
                                        fontSize: '12px',
                                        paddingRight: '34px'
                                    }}
                                >
                                    <option value="ALL">All DO Statuses</option>
                                    <option value="EXPIRED">🔴 Expired ({overallStats.expiredDoCount})</option>
                                    <option value="EXPIRING_SOON">🟡 Expiring ≤3d ({overallStats.expiringSoonDoCount})</option>
                                    <option value="VALID">🟢 Active & Valid ({overallStats.validDoCount})</option>
                                    <option value="NO_DO">— No DO Date</option>
                                </select>
                            )}

                            {/* Branch Filter */}
                            {availableBranches.length > 0 && (
                                <select
                                    value={selectedBranch}
                                    onChange={(e) => { setSelectedBranch(e.target.value); setCurrentPage(1); }}
                                    className="form-select form-select-sm rounded-pill w-auto ps-3 pe-4"
                                    style={{
                                        borderColor: selectedBranch !== 'ALL' ? '#2563eb' : undefined,
                                        background: selectedBranch !== 'ALL' ? '#eff6ff' : undefined,
                                        fontWeight: selectedBranch !== 'ALL' ? 700 : 500,
                                        fontSize: '12px',
                                        paddingRight: '34px'
                                    }}
                                >
                                    <option value="ALL">All Branches ({availableBranches.length})</option>
                                    {availableBranches.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            )}

                            {/* Container Type Filter */}
                            <select
                                value={selectedContainerType}
                                onChange={(e) => { setSelectedContainerType(e.target.value); setCurrentPage(1); }}
                                className="form-select form-select-sm rounded-pill w-auto ps-3 pe-4"
                                style={{
                                    borderColor: selectedContainerType !== 'ALL' ? '#d97706' : undefined,
                                    background: selectedContainerType !== 'ALL' ? '#fffbeb' : undefined,
                                    fontWeight: selectedContainerType !== 'ALL' ? 700 : 500,
                                    fontSize: '12px',
                                    paddingRight: '34px'
                                }}
                            >
                                <option value="ALL">All Sizes & Types</option>
                                <option value="SIZE_20">20' Containers</option>
                                <option value="SIZE_40">40' Containers</option>
                                {availableContainerTypes.filter(ct => !['20', '40', '45', 'SIZE_20', 'SIZE_40', 'SIZE_45'].includes(ct)).map(ct => (
                                    <option key={ct} value={ct}>{ct}</option>
                                ))}
                            </select>

                            {/* Customer Filter */}
                            {availableCustomers.length > 0 && (
                                <select
                                    value={selectedCustomer}
                                    onChange={(e) => { setSelectedCustomer(e.target.value); setCurrentPage(1); }}
                                    className="form-select form-select-sm rounded-pill w-auto ps-3 pe-4"
                                    style={{
                                        borderColor: selectedCustomer !== 'ALL' ? '#7c3aed' : undefined,
                                        background: selectedCustomer !== 'ALL' ? '#f5f3ff' : undefined,
                                        fontWeight: selectedCustomer !== 'ALL' ? 700 : 500,
                                        fontSize: '12px',
                                        maxWidth: '220px',
                                        paddingRight: '34px'
                                    }}
                                >
                                    <option value="ALL">All Customers ({availableCustomers.length})</option>
                                    {availableCustomers.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            )}

                            {/* Trade Type Filter */}
                            <select
                                value={selectedIe}
                                onChange={(e) => { setSelectedIe(e.target.value); setCurrentPage(1); }}
                                className="form-select form-select-sm rounded-pill w-auto ps-3 pe-4"
                                style={{
                                    borderColor: selectedIe !== 'ALL' ? '#059669' : undefined,
                                    background: selectedIe !== 'ALL' ? '#ecfdf5' : undefined,
                                    fontWeight: selectedIe !== 'ALL' ? 700 : 500,
                                    fontSize: '12px',
                                    paddingRight: '34px'
                                }}
                            >
                                <option value="ALL">All Trade Types</option>
                                <option value="import">Import</option>
                                <option value="export">Export</option>
                            </select>

                            {/* Reset Button */}
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
                                    className="btn btn-outline-danger btn-sm rounded-pill px-3 py-1 fw-bold"
                                    style={{ fontSize: '11px' }}
                                >
                                    ✕ Reset
                                </button>
                            )}

                            {/* Live Result Counter */}
                            <div className="ms-auto text-muted small">
                                {activeTab === 'pending' && viewMode === 'by_customer' && (
                                    <>Showing <strong>{customerGroupedList.length}</strong> customers (<strong>{sortedList.length}</strong> PRs)</>
                                )}
                                {activeTab === 'pending' && viewMode === 'grouped' && (
                                    <>Showing <strong>{typeGroupedList.length}</strong> container types (<strong>{sortedList.length}</strong> PRs)</>
                                )}
                                {(activeTab !== 'pending' || viewMode === 'flat') && (
                                    <>Showing <strong>{sortedList.length}</strong> records</>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="table-responsive" style={{ minHeight: '320px' }}>
                        <table className="table table-modern align-middle mb-0">
                            <thead className="sticky-top">
                                {activeTab === 'pending' && viewMode === 'flat' && (
                                    <tr>
                                        <th onClick={() => handleSort('pr_no')} style={{ cursor: 'pointer' }}>PR No</th>
                                        <th onClick={() => handleSort('branch')} style={{ cursor: 'pointer' }}>Branch</th>
                                        <th onClick={() => handleSort('invoice_party')} style={{ cursor: 'pointer' }}>Customer / Party</th>
                                        <th className="text-center">Trade</th>
                                        <th>Container Type</th>
                                        <th className="text-center" onClick={() => handleSort('pendingCount')} style={{ cursor: 'pointer' }}>Pending</th>
                                        <th className="text-center">Total</th>
                                        <th className="text-center">Progress</th>
                                        <th onClick={() => handleSort('do_validity')} style={{ cursor: 'pointer' }}>DO Validity</th>
                                        <th>Pickup / Port</th>
                                    </tr>
                                )}
                                {activeTab === 'pending' && viewMode === 'by_customer' && (
                                    <tr>
                                        <th colSpan={3}>Customer / Invoice Party</th>
                                        <th colSpan={2}>Branches & Sizes</th>
                                        <th className="text-center">Pending Containers</th>
                                        <th className="text-center">Total Ordered</th>
                                        <th className="text-center">Fulfillment</th>
                                        <th colSpan={2} className="text-end pe-3">Actions</th>
                                    </tr>
                                )}
                                {activeTab === 'pending' && viewMode === 'grouped' && (
                                    <tr>
                                        <th colSpan={3}>Container Size & Type</th>
                                        <th colSpan={2}>Customers & Branches</th>
                                        <th className="text-center">Pending Containers</th>
                                        <th className="text-center">Total Ordered</th>
                                        <th className="text-center">Fulfillment</th>
                                        <th colSpan={2} className="text-end pe-3">Actions</th>
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
                                        <th className="text-center">Status</th>
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
                                        <th className="text-center">Status</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody>
                                {/* Pending Flat List */}
                                {activeTab === 'pending' && viewMode === 'flat' && paginatedList.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="fw-bold text-primary font-monospace">
                                            {item.pr_no || '—'}
                                            <CopyButton text={item.pr_no} />
                                        </td>
                                        <td className="fw-semibold text-dark">{item.branch || '—'}</td>
                                        <td className="fw-semibold text-dark text-truncate" style={{ maxWidth: '240px' }} title={item.invoice_party}>
                                            {item.invoice_party || '—'}
                                        </td>
                                        <td className="text-center">{getIeBadge(item.import_export)}</td>
                                        <td className="text-muted font-monospace">{item.container_type || '—'}</td>
                                        <td className="text-center fw-bold text-danger font-monospace">{item.pendingCount || 0}</td>
                                        <td className="text-center font-monospace text-muted">{item.totalContainers || 0}</td>
                                        <td className="text-center" style={{ width: '100px' }}>
                                            <div className="progress" style={{ height: '6px' }}>
                                                <div
                                                    className="progress-bar bg-success"
                                                    style={{
                                                        width: `${Number(item.totalContainers) > 0 ? (Number(item.lrCreatedContainers || 0) / Number(item.totalContainers)) * 100 : 0}%`
                                                    }}
                                                />
                                            </div>
                                        </td>
                                        <td>{getDoValidityBadge(item.do_validity)}</td>
                                        <td className="text-truncate text-muted small" style={{ maxWidth: '160px' }} title={item.pickup_point || item.port}>
                                            {item.pickup_point || item.port || '—'}
                                        </td>
                                    </tr>
                                ))}

                                {/* Pending Grouped By Customer */}
                                {activeTab === 'pending' && viewMode === 'by_customer' && paginatedList.map((custGroup, idx) => {
                                    const isExpanded = !!expandedGroups[`cust_${idx}`];
                                    const percent = custGroup.totalContainers > 0 ? Math.round((custGroup.createdLRs / custGroup.totalContainers) * 100) : 0;
                                    return (
                                        <React.Fragment key={idx}>
                                            <tr style={{ background: isExpanded ? '#f8fafc' : undefined, cursor: 'pointer' }} onClick={() => toggleGroup(`cust_${idx}`)}>
                                                <td colSpan={3} className="fw-bold text-dark">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className="text-primary" style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                        </span>
                                                        <span className="fs-6">{custGroup.customerName}</span>
                                                        <span className="badge bg-primary-subtle text-primary fw-bold rounded-pill px-2 py-1" style={{ fontSize: '11px' }}>
                                                            {custGroup.prs.length} PR{custGroup.prs.length > 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td colSpan={2} className="text-muted small">
                                                    {custGroup.branches.map(b => (
                                                        <span key={b} className="badge bg-light text-dark border me-1">{b}</span>
                                                    ))}
                                                    {custGroup.types.slice(0, 2).map(t => (
                                                        <span key={t} className="badge bg-light text-secondary border me-1 font-monospace">{t}</span>
                                                    ))}
                                                </td>
                                                <td className="text-center fw-bold text-danger font-monospace fs-6">
                                                    {custGroup.totalPending}
                                                </td>
                                                <td className="text-center font-monospace text-muted">
                                                    {custGroup.totalContainers}
                                                </td>
                                                <td className="text-center" style={{ width: '120px' }}>
                                                    <div className="progress" style={{ height: '6px' }}>
                                                        <div className="progress-bar bg-success" style={{ width: `${percent}%` }} />
                                                    </div>
                                                    <div className="text-muted" style={{ fontSize: '10px' }}>{percent}% fulfilled</div>
                                                </td>
                                                <td colSpan={2} className="text-end pe-3" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedCustomer(custGroup.customerName);
                                                            setViewMode('flat');
                                                            setCurrentPage(1);
                                                        }}
                                                        className="btn btn-outline-primary btn-sm rounded-pill px-3 py-1 fw-bold me-1"
                                                        style={{ fontSize: '11px' }}
                                                    >
                                                        Filter PRs →
                                                    </button>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={10} className="p-0 border-0">
                                                        <div className="p-3 bg-light rounded-3 my-2 mx-2 border shadow-sm">
                                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                                <div className="fw-bold text-primary small">
                                                                    📋 Pending PR Breakdown for {custGroup.customerName} ({custGroup.prs.length} PRs)
                                                                </div>
                                                            </div>
                                                            <table className="table table-sm table-bordered bg-white rounded-2 mb-0" style={{ fontSize: '12px' }}>
                                                                <thead className="table-light">
                                                                    <tr>
                                                                        <th>PR No</th>
                                                                        <th>Branch</th>
                                                                        <th>Trade</th>
                                                                        <th>Container Type</th>
                                                                        <th className="text-center">Pending</th>
                                                                        <th className="text-center">Total</th>
                                                                        <th>DO Validity</th>
                                                                        <th>Pickup / Port</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {custGroup.prs.map((p, pIdx) => (
                                                                        <tr key={pIdx}>
                                                                            <td className="fw-bold text-primary font-monospace">{p.pr_no || '—'}</td>
                                                                            <td>{p.branch || '—'}</td>
                                                                            <td>{getIeBadge(p.import_export)}</td>
                                                                            <td className="font-monospace text-muted">{p.container_type || '—'}</td>
                                                                            <td className="text-center fw-bold text-danger font-monospace">{p.pendingCount || 0}</td>
                                                                            <td className="text-center font-monospace">{p.totalContainers || 0}</td>
                                                                            <td>{getDoValidityBadge(p.do_validity)}</td>
                                                                            <td className="text-muted text-truncate" style={{ maxWidth: '160px' }}>{p.pickup_point || p.port || '—'}</td>
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

                                {/* Pending Grouped By Container Type */}
                                {activeTab === 'pending' && viewMode === 'grouped' && paginatedList.map((typeGroup, idx) => {
                                    const isExpanded = !!expandedGroups[`type_${idx}`];
                                    const percent = typeGroup.totalContainers > 0 ? Math.round((typeGroup.createdLRs / typeGroup.totalContainers) * 100) : 0;
                                    return (
                                        <React.Fragment key={idx}>
                                            <tr style={{ background: isExpanded ? '#f8fafc' : undefined, cursor: 'pointer' }} onClick={() => toggleGroup(`type_${idx}`)}>
                                                <td colSpan={3} className="fw-bold text-dark">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span className="text-primary" style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                        </span>
                                                        <span className="fs-6 font-monospace">📦 {typeGroup.typeName}</span>
                                                        <span className="badge bg-warning-subtle text-warning fw-bold rounded-pill px-2 py-1" style={{ fontSize: '11px' }}>
                                                            {typeGroup.prs.length} PR{typeGroup.prs.length > 1 ? 's' : ''}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td colSpan={2} className="text-muted small">
                                                    <span className="badge bg-light text-dark border me-1">
                                                        👥 {typeGroup.customers.length} Customer{typeGroup.customers.length > 1 ? 's' : ''}
                                                    </span>
                                                    {typeGroup.branches.map(b => (
                                                        <span key={b} className="badge bg-light text-secondary border me-1">{b}</span>
                                                    ))}
                                                </td>
                                                <td className="text-center fw-bold text-danger font-monospace fs-6">
                                                    {typeGroup.totalPending}
                                                </td>
                                                <td className="text-center font-monospace text-muted">
                                                    {typeGroup.totalContainers}
                                                </td>
                                                <td className="text-center" style={{ width: '120px' }}>
                                                    <div className="progress" style={{ height: '6px' }}>
                                                        <div className="progress-bar bg-success" style={{ width: `${percent}%` }} />
                                                    </div>
                                                    <div className="text-muted" style={{ fontSize: '10px' }}>{percent}% fulfilled</div>
                                                </td>
                                                <td colSpan={2} className="text-end pe-3" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedContainerType(typeGroup.typeName);
                                                            setViewMode('flat');
                                                            setCurrentPage(1);
                                                        }}
                                                        className="btn btn-outline-primary btn-sm rounded-pill px-3 py-1 fw-bold me-1"
                                                        style={{ fontSize: '11px' }}
                                                    >
                                                        Filter Type →
                                                    </button>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={10} className="p-0 border-0">
                                                        <div className="p-3 bg-light rounded-3 my-2 mx-2 border shadow-sm">
                                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                                <div className="fw-bold text-primary small">
                                                                    📦 Pending PR Breakdown for {typeGroup.typeName} ({typeGroup.prs.length} PRs)
                                                                </div>
                                                            </div>
                                                            <table className="table table-sm table-bordered bg-white rounded-2 mb-0" style={{ fontSize: '12px' }}>
                                                                <thead className="table-light">
                                                                    <tr>
                                                                        <th>PR No</th>
                                                                        <th>Branch</th>
                                                                        <th>Customer / Party</th>
                                                                        <th>Trade</th>
                                                                        <th className="text-center">Pending</th>
                                                                        <th className="text-center">Total</th>
                                                                        <th>DO Validity</th>
                                                                        <th>Pickup / Port</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {typeGroup.prs.map((p, pIdx) => (
                                                                        <tr key={pIdx}>
                                                                            <td className="fw-bold text-primary font-monospace">{p.pr_no || '—'}</td>
                                                                            <td>{p.branch || '—'}</td>
                                                                            <td className="fw-semibold text-truncate" style={{ maxWidth: '200px' }}>{p.invoice_party || '—'}</td>
                                                                            <td>{getIeBadge(p.import_export)}</td>
                                                                            <td className="text-center fw-bold text-danger font-monospace">{p.pendingCount || 0}</td>
                                                                            <td className="text-center font-monospace">{p.totalContainers || 0}</td>
                                                                            <td>{getDoValidityBadge(p.do_validity)}</td>
                                                                            <td className="text-muted text-truncate" style={{ maxWidth: '160px' }}>{p.pickup_point || p.port || '—'}</td>
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
                                        <td className="fw-bold text-primary font-monospace">
                                            {item.tr_no || '—'}
                                            <CopyButton text={item.tr_no} />
                                        </td>
                                        <td className="fw-bold text-dark font-monospace">{item.vehicle_no || '—'}</td>
                                        <td>{item.branch || '—'}</td>
                                        <td className="text-truncate" style={{ maxWidth: '240px' }} title={item.consignee || item.invoice_party}>
                                            {item.consignee || item.invoice_party || '—'}
                                        </td>
                                        <td className="font-monospace text-muted">{item.container_number || '—'}</td>
                                        <td>{item.container_type || item.container_size || '—'}</td>
                                        <td className="font-monospace text-muted">{formatDateDisplay(item.lr_date || item.date)}</td>
                                        <td className="text-center">
                                            <span className="badge bg-warning-subtle text-warning fw-bold px-2 py-1 rounded-pill">In-Transit</span>
                                        </td>
                                    </tr>
                                ))}

                                {activeTab === 'closed' && paginatedList.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="fw-bold text-primary font-monospace">
                                            {item.tr_no || '—'}
                                            <CopyButton text={item.tr_no} />
                                        </td>
                                        <td className="fw-bold text-dark font-monospace">{item.vehicle_no || '—'}</td>
                                        <td>{item.branch || '—'}</td>
                                        <td className="text-truncate" style={{ maxWidth: '260px' }} title={item.consignee || item.invoice_party}>
                                            {item.consignee || item.invoice_party || '—'}
                                        </td>
                                        <td className="font-monospace text-muted">{item.container_number || '—'}</td>
                                        <td className="font-monospace text-muted">{formatDateDisplay(item.dispatchClosedDate || item.date)}</td>
                                        <td className="text-center">
                                            <span className="badge bg-success-subtle text-success fw-bold px-2 py-1 rounded-pill">Closed</span>
                                        </td>
                                    </tr>
                                ))}

                                {paginatedList.length === 0 && (
                                    <tr>
                                        <td colSpan={10} className="text-center text-muted py-5">
                                            No transport records found matching the active filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Bar */}
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-3 border-top mt-3">
                        <div className="d-flex align-items-center gap-2">
                            <span className="text-muted small">Show</span>
                            <select
                                value={pageSize}
                                onChange={(e) => { setPageSize(e.target.value); setCurrentPage(1); }}
                                className="form-select form-select-sm rounded-3 w-auto"
                            >
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value="ALL">All</option>
                            </select>
                            <span className="text-muted small">per page</span>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            <span className="text-muted small">
                                Page <strong>{currentPage}</strong> of <strong>{totalPages || 1}</strong>
                            </span>
                            <div className="btn-group btn-group-sm">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage <= 1}
                                    className="btn btn-outline-primary px-3 fw-semibold"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage >= totalPages}
                                    className="btn btn-outline-primary px-3 fw-semibold"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════════════ */}
            {/* TAB 5: ANALYTICS & TRENDS                                                 */}
            {/* ══════════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'analytics' && (
                <div>
                    <div className="row g-4 mb-4">
                        {/* Branch Operations Bar Chart */}
                        <div className="col-12 col-xl-8">
                            <div className="stat-white-card p-3 p-md-4 h-100">
                                <h6 className="fw-bold mb-3 text-dark">🏢 Branch Dispatches & Pending Backlog</h6>
                                <div style={{ height: '320px', width: '100%' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={branchSummaryBreakdown} margin={{ top: 10, right: 10, bottom: 20, left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="branch" tick={{ fill: '#64748b', fontSize: 11 }} />
                                            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                                            <RechartsTooltip content={({ active, payload, label }) => {
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
                                            <Bar dataKey="pendingCont" name="Pending Containers" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="activeLRs" name="In-Transit Trucks" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="closedLRs" name="Completed Dispatches" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Container Type Distribution Donut Chart */}
                        <div className="col-12 col-xl-4">
                            <div className="stat-white-card p-3 p-md-4 h-100">
                                <h6 className="fw-bold mb-3 text-dark">📦 Container Type Distribution</h6>
                                <div style={{ height: '320px', width: '100%', position: 'relative' }}>
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
                                                        <div className="recharts-custom-tooltip">
                                                            <div className="fw-bold">{d.name}</div>
                                                            <div>Pending: <strong>{d.value}</strong></div>
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
                                            {overallStats.totalPendingContainers.toLocaleString()}
                                        </span>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: '2px' }}>
                                            Total Cont.
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Customer Details Modal ───────────────────────────────────────── */}
            {showCustomerModal && (
                <div
                    className="modal show d-block"
                    tabIndex="-1"
                    style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', zIndex: 1050 }}
                >
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content rounded-4 border-0 shadow-lg">
                            <div className="modal-header border-bottom p-4">
                                <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
                                    <Users size={20} className="text-primary" />
                                    Customers Waiting for Dispatch ({customerSummary.length})
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowCustomerModal(false)}
                                />
                            </div>
                            <div className="modal-body p-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                <div className="table-responsive">
                                    <table className="table table-modern align-middle mb-0">
                                        <thead>
                                            <tr>
                                                <th>Customer Name</th>
                                                <th className="text-center">Pending PRs</th>
                                                <th className="text-center">Pending Cont.</th>
                                                <th className="text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {customerSummary.map((c, i) => (
                                                <tr key={i}>
                                                    <td className="fw-bold text-dark">{c.customerName}</td>
                                                    <td className="text-center font-monospace">{c.prCount}</td>
                                                    <td className="text-center fw-bold text-danger font-monospace">{c.pendingContainers}</td>
                                                    <td className="text-center">
                                                        <button
                                                            onClick={() => {
                                                                setSelectedCustomer(c.customerName);
                                                                setActiveTab('pending');
                                                                setShowCustomerModal(false);
                                                                setCurrentPage(1);
                                                            }}
                                                            className="btn btn-outline-primary btn-sm rounded-pill px-3 py-1 fw-bold"
                                                        >
                                                            Filter Queue →
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="modal-footer border-top p-3">
                                <button
                                    type="button"
                                    className="btn btn-light border btn-sm px-4 rounded-3 text-secondary"
                                    onClick={() => setShowCustomerModal(false)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransportMonitoringReport;
