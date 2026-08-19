import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
    Package,
    Clock,
    AlertTriangle,
    RefreshCw,
    Search,
    Download,
    FileText,
    Copy,
    Check,
    Building2,
    X,
    CheckCircle2,
    Users,
    Layers,
    ListFilter,
    Calendar,
    Truck
} from 'lucide-react';
import { getTransportDates, TRANSPORT_BASE, TRANSPORT_HEADERS } from './reports-helper';

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
    if (!ieStr) return <span style={{ color: '#94a3b8' }}>—</span>;
    const s = String(ieStr).toLowerCase().trim();
    if (s.includes('import')) {
        return (
            <span style={{
                background: '#e0f2fe',
                color: '#0369a1',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                whiteSpace: 'nowrap'
            }}>
                Import
            </span>
        );
    }
    if (s.includes('export')) {
        return (
            <span style={{
                background: '#ecfdf5',
                color: '#047857',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                whiteSpace: 'nowrap'
            }}>
                Export
            </span>
        );
    }
    return (
        <span style={{
            background: '#fef3c7',
            color: '#b45309',
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            whiteSpace: 'nowrap'
        }}>
            {ieStr}
        </span>
    );
};

const getOwnHiredBadge = (ownHired) => {
    const s = String(ownHired || '').toLowerCase().trim();
    if (s === 'own') {
        return (
            <span style={{
                background: '#f0fdf4',
                color: '#15803d',
                border: '1px solid #bbf7d0',
                padding: '2px 7px',
                borderRadius: '5px',
                fontSize: '11px',
                fontWeight: 700
            }}>
                Own
            </span>
        );
    }
    if (s === 'hired' || s === 'market') {
        return (
            <span style={{
                background: '#fef3c7',
                color: '#b45309',
                border: '1px solid #fde68a',
                padding: '2px 7px',
                borderRadius: '5px',
                fontSize: '11px',
                fontWeight: 700
            }}>
                Hired
            </span>
        );
    }
    return <span style={{ color: '#64748b', fontSize: '11px' }}>{ownHired || '—'}</span>;
};

const getDoValidityBadge = (validityStr) => {
    if (!validityStr || validityStr === '-') {
        return <span style={{ color: '#94a3b8', fontSize: '12px' }}>—</span>;
    }
    try {
        const d = validityStr.includes('T') ? parseISO(validityStr) : new Date(validityStr);
        if (!isValid(d)) return <span style={{ color: '#64748b', fontSize: '12px' }}>{validityStr}</span>;

        const refDate = new Date();
        const diff = differenceInDays(d, refDate);
        const formatted = format(d, 'dd MMM yyyy');

        if (diff < 0) {
            return (
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#fef2f2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        whiteSpace: 'nowrap'
                    }}
                    title={`Expired ${Math.abs(diff)} day(s) ago`}
                >
                    <AlertTriangle size={12} /> {formatted} ({Math.abs(diff)}d ago)
                </span>
            );
        }
        if (diff <= 3) {
            return (
                <span
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#fffbeb',
                        color: '#b45309',
                        border: '1px solid #fde68a',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        whiteSpace: 'nowrap'
                    }}
                    title={`Expires in ${diff} day(s)`}
                >
                    <Clock size={12} /> {formatted} ({diff === 0 ? 'Today' : `${diff}d left`})
                </span>
            );
        }
        return (
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#f0fdf4',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                }}
                title="DO is active"
            >
                <CheckCircle2 size={12} /> {formatted}
            </span>
        );
    } catch {
        return <span style={{ color: '#64748b', fontSize: '12px' }}>{validityStr}</span>;
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
            title="Copy Number"
            style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: '2px 4px',
                color: copied ? '#10b981' : '#94a3b8',
                display: 'inline-flex',
                alignItems: 'center'
            }}
        >
            {copied ? <Check size={11} /> : <Copy size={11} />}
        </button>
    );
};

// ─── Main Component: Transport Pending Queue & Closed LRs Summary ──────────────

const TransportMonitoringReport = ({
    filterType,
    selectedMonth,
    selectedYear,
    selectedQuarter,
    dateRange,
    selectedFinancialYear,
    selectedDay
}) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pendingList, setPendingList] = useState([]);
    const [activeList, setActiveList] = useState([]);
    const [closedList, setClosedList] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Active Section Tab: 'pending' | 'active' | 'closed'
    const [activeSection, setActiveSection] = useState('pending');

    // Filters & Searches
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('ALL');
    const [selectedIe, setSelectedIe] = useState('ALL');
    const [selectedContainerType, setSelectedContainerType] = useState('ALL');
    const [selectedCustomer, setSelectedCustomer] = useState('ALL');
    const [selectedDoStatus, setSelectedDoStatus] = useState('ALL'); // ALL, EXPIRED, EXPIRING_SOON, VALID, NO_DO
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [viewMode, setViewMode] = useState('flat'); // 'flat' | 'by_customer' | 'grouped'

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
            return `${format(parseISO(dateQuery.startDate), 'dd MMM yyyy')} - ${format(parseISO(dateQuery.endDate), 'dd MMM yyyy')}`;
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
            setError(err.message || "Failed to load transport queue data.");
        } finally {
            setLoading(false);
        }
    }, [dateQuery]);

    useEffect(() => {
        loadReportData();
    }, [loadReportData]);

    // ─── Extract Unique Filter Options (Pending / Active / Closed) ─────────────
    const availableBranches = useMemo(() => {
        const set = new Set();
        const src = activeSection === 'pending' ? pendingList : (activeSection === 'active' ? activeList : closedList);
        src.forEach(item => {
            if (item.branch) set.add(item.branch);
        });
        return Array.from(set).sort();
    }, [pendingList, activeList, closedList, activeSection]);

    const availableContainerTypes = useMemo(() => {
        const set = new Set();
        const src = activeSection === 'pending' ? pendingList : (activeSection === 'active' ? activeList : closedList);
        src.forEach(item => {
            const t = item.container_type || item.container_size || item.vehicle_type || item.type;
            if (t) set.add(t);
        });
        return Array.from(set).sort();
    }, [pendingList, activeList, closedList, activeSection]);

    const availableCustomers = useMemo(() => {
        const set = new Set();
        const src = activeSection === 'pending' ? pendingList : (activeSection === 'active' ? activeList : closedList);
        src.forEach(item => {
            const c = item.invoice_party || item.consignee;
            if (c) set.add(c);
        });
        return Array.from(set).sort();
    }, [pendingList, activeList, closedList, activeSection]);

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

    // ─── Filter Pending List ───────────────────────────────────────────────────
    const filteredPendingList = useMemo(() => {
        let list = pendingList || [];

        if (selectedBranch !== 'ALL') {
            list = list.filter(item => item.branch === selectedBranch);
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
            list = list.filter(item => item.branch === selectedBranch);
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
            list = list.filter(item => item.branch === selectedBranch);
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
        const src = activeSection === 'pending'
            ? filteredPendingList
            : (activeSection === 'active' ? filteredActiveList : filteredClosedList);

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
    }, [activeSection, filteredPendingList, filteredActiveList, filteredClosedList, sortConfig]);

    // ─── Grouped View for Pending (By Type) ────────────────────────────────────
    const groupedData = useMemo(() => {
        const groups = {};
        filteredPendingList.forEach(item => {
            const key = item.container_type || 'Standard Containers';
            if (!groups[key]) {
                groups[key] = {
                    containerType: key,
                    totalPending: 0,
                    totalContainers: 0,
                    totalCreated: 0,
                    items: []
                };
            }
            groups[key].totalPending += Number(item.pendingCount || 0);
            groups[key].totalContainers += Number(item.totalContainers || 0);
            groups[key].totalCreated += Number(item.lrCreatedContainers || 0);
            groups[key].items.push(item);
        });
        return groups;
    }, [filteredPendingList]);

    // ─── Grouped View for Pending (By Customer) ────────────────────────────────
    const customerGroupedData = useMemo(() => {
        const groups = {};
        filteredPendingList.forEach(item => {
            const key = item.invoice_party || 'Unknown Customer';
            if (!groups[key]) {
                groups[key] = {
                    customerName: key,
                    totalPending: 0,
                    totalContainers: 0,
                    totalCreated: 0,
                    items: []
                };
            }
            groups[key].totalPending += Number(item.pendingCount || 0);
            groups[key].totalContainers += Number(item.totalContainers || 0);
            groups[key].totalCreated += Number(item.lrCreatedContainers || 0);
            groups[key].items.push(item);
        });
        return groups;
    }, [filteredPendingList]);

    // ─── Overall Stats ─────────────────────────────────────────────────────────
    const overallStats = useMemo(() => {
        let totalPRs = pendingList.length;
        let totalPendingContainers = 0;
        let totalAllContainers = 0;
        let totalCreatedLRs = 0;
        let expiredDoCount = 0;
        let expiringSoonDoCount = 0;
        let validDoCount = 0;
        const uniqueParties = new Set();
        const today = new Date();

        pendingList.forEach(item => {
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
            totalActiveLRs: activeList.length,
            totalClosedLRs: closedList.length,
            fulfillmentRate,
            expiredDoCount,
            expiringSoonDoCount,
            validDoCount,
            uniquePartiesCount: uniqueParties.size
        };
    }, [pendingList, activeList, closedList]);

    // ─── Pagination Logic ──────────────────────────────────────────────────────
    const totalPages = pageSize === 'ALL' ? 1 : Math.ceil(sortedList.length / (parseInt(pageSize, 10) || 25));
    const paginatedList = useMemo(() => {
        if (pageSize === 'ALL') return sortedList;
        const size = parseInt(pageSize, 10) || 25;
        const start = (currentPage - 1) * size;
        return sortedList.slice(start, start + size);
    }, [sortedList, currentPage, pageSize]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return ' ⇅';
        return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
    };

    // ─── Export to Excel (Styled & with AutoFilter) ────────────────────────────
    const exportToExcel = async () => {
        if (!sortedList.length) return;

        try {
            const ExcelJS = await import('exceljs');
            const { saveAs } = await import('file-saver');
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'AlVision Exim Operations';
            workbook.created = new Date();

            const isPending = activeSection === 'pending';
            const isActive = activeSection === 'active';

            const sheetName = isPending
                ? 'Pending Pickup Queue'
                : (isActive ? 'Active In-Transit LRs' : 'Completed Closed LRs');

            const ws = workbook.addWorksheet(sheetName, {
                views: [{ state: 'frozen', ySplit: 4 }]
            });

            // Theme colors
            const primaryColor = isPending ? 'FF312E81' : (isActive ? 'FF92400E' : 'FF065F46');
            const headerFill = isPending ? 'FF4F46E5' : (isActive ? 'FFD97706' : 'FF059669');

            // 1. Report Title Banner (Row 1)
            const titleText = isPending
                ? 'ALVISION EXIM — TRANSPORT PICKUP QUEUE MONITORING'
                : (isActive
                    ? 'ALVISION EXIM — ACTIVE IN-TRANSIT DISPATCHES'
                    : 'ALVISION EXIM — COMPLETED & CLOSED TRIPS REPORT');

            const headers = isPending
                ? [
                    "Srl No.", "PR No", "Type (I/E)", "Branch", "Customer / Invoice Party",
                    "Container Type", "Total Cont.", "Created LRs", "Pending Cont.",
                    "Fulfillment %", "DO Validity", "DO Urgency Status"
                ]
                : [
                    "Srl No.", "LR No", "Type (I/E)", "Branch", "Consignee", "Consignor",
                    "Container Type", "Vehicle No", "Container No", "Own / Hired",
                    isActive ? "LR Date / Status" : "Closed Date"
                ];

            const totalCols = headers.length;
            const lastColLetter = String.fromCharCode(64 + totalCols);

            // Row 1: Title
            ws.addRow([titleText]);
            ws.mergeCells(`A1:${lastColLetter}1`);
            const titleRow = ws.getRow(1);
            titleRow.height = 36;
            titleRow.getCell(1).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
            titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
            titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

            // Row 2: Metadata
            const metaText = `Period: ${periodLabel} | Generated: ${new Date().toLocaleString('en-GB')} | Total Records: ${sortedList.length} | Branch Filter: ${selectedBranch} | Customer: ${selectedCustomer}`;
            ws.addRow([metaText]);
            ws.mergeCells(`A2:${lastColLetter}2`);
            const metaRow = ws.getRow(2);
            metaRow.height = 22;
            metaRow.getCell(1).font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF1E293B' } };
            metaRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
            metaRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

            // Row 3: Empty separator
            ws.addRow([]);
            ws.getRow(3).height = 8;

            // Row 4: Column Headers
            ws.addRow(headers);
            const headerRow = ws.getRow(4);
            headerRow.height = 28;
            headerRow.eachCell((cell) => {
                cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerFill } };
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                    bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
                    right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                };
            });

            // Set Native Excel AutoFilter on row 4 across all columns
            ws.autoFilter = {
                from: { row: 4, column: 1 },
                to: { row: 4 + sortedList.length, column: totalCols }
            };

            // Data Rows
            let sumTotalCont = 0;
            let sumCreatedLRs = 0;
            let sumPendingCont = 0;

            sortedList.forEach((item, idx) => {
                const rowNum = 5 + idx;
                const bgArgb = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';

                if (isPending) {
                    const tot = Number(item.totalContainers || 0);
                    const crt = Number(item.lrCreatedContainers || 0);
                    const pnd = Number(item.pendingCount || 0);
                    const pct = tot > 0 ? (crt / tot) : 0;
                    sumTotalCont += tot;
                    sumCreatedLRs += crt;
                    sumPendingCont += pnd;

                    let doStatusLabel = 'No DO Date';
                    let doStatusArgb = 'FFF1F5F9';
                    let doTextArgb = 'FF64748B';
                    if (item.do_validity && item.do_validity !== '-') {
                        try {
                            const d = item.do_validity.includes('T') ? parseISO(item.do_validity) : new Date(item.do_validity);
                            if (isValid(d)) {
                                const diff = differenceInDays(d, new Date());
                                if (diff < 0) {
                                    doStatusLabel = `Expired (${Math.abs(diff)}d ago)`;
                                    doStatusArgb = 'FFFEE2E2';
                                    doTextArgb = 'FF991B1B';
                                } else if (diff <= 3) {
                                    doStatusLabel = `Expiring in ${diff}d`;
                                    doStatusArgb = 'FFFEF3C7';
                                    doTextArgb = 'FF92400E';
                                } else {
                                    doStatusLabel = 'Valid';
                                    doStatusArgb = 'FFDCFCE7';
                                    doTextArgb = 'FF166534';
                                }
                            }
                        } catch {
                            // ignore
                        }
                    }

                    ws.addRow([
                        idx + 1,
                        item.pr_no || '—',
                        item.import_export || 'Import',
                        item.branch || '—',
                        item.invoice_party || '—',
                        item.container_type || 'Standard',
                        tot,
                        crt,
                        pnd,
                        pct,
                        item.do_validity ? formatDateDisplay(item.do_validity) : '—',
                        doStatusLabel
                    ]);

                    const row = ws.getRow(rowNum);
                    row.height = 22;
                    row.eachCell((cell, colNum) => {
                        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                        };

                        // Column Alignments & Formats
                        if (colNum === 1 || colNum === 3 || colNum === 4 || colNum === 6 || colNum === 11) {
                            cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        } else if (colNum === 2) {
                            cell.alignment = { horizontal: 'center', vertical: 'middle' };
                            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF4338CA' } };
                        } else if (colNum === 5) {
                            cell.alignment = { horizontal: 'left', vertical: 'middle' };
                            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
                        } else if (colNum === 7 || colNum === 8 || colNum === 9) {
                            cell.alignment = { horizontal: 'right', vertical: 'middle' };
                            cell.numFmt = '#,##0';
                            if (colNum === 9 && pnd > 0) {
                                cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB91C1C' } };
                            }
                        } else if (colNum === 10) {
                            cell.alignment = { horizontal: 'right', vertical: 'middle' };
                            cell.numFmt = '0.0%';
                        } else if (colNum === 12) {
                            cell.alignment = { horizontal: 'center', vertical: 'middle' };
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: doStatusArgb } };
                            cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: doTextArgb } };
                        }
                    });
                } else {
                    ws.addRow([
                        idx + 1,
                        item.tr_no || '—',
                        item.import_export || 'Import',
                        item.branch || '—',
                        item.consignee || '—',
                        item.consignor || '—',
                        item.container_type || item.container_size || item.vehicle_type || item.type || 'Standard',
                        item.vehicle_no || '—',
                        item.container_number || '—',
                        item.own_hired || 'Own',
                        isActive
                            ? (item.lr_date ? formatDateDisplay(item.lr_date) : (item.status || 'In Transit'))
                            : (item.dispatchClosedDate ? formatDateDisplay(item.dispatchClosedDate) : 'Completed')
                    ]);

                    const row = ws.getRow(rowNum);
                    row.height = 22;
                    row.eachCell((cell, colNum) => {
                        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                        };

                        if (colNum === 1 || colNum === 3 || colNum === 4 || colNum === 7 || colNum === 8 || colNum === 9 || colNum === 10 || colNum === 11) {
                            cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        } else if (colNum === 2) {
                            cell.alignment = { horizontal: 'center', vertical: 'middle' };
                            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF4338CA' } };
                        } else {
                            cell.alignment = { horizontal: 'left', vertical: 'middle' };
                        }
                    });
                }
            });

            // Summary Total Row for Pending Queue
            if (isPending && sortedList.length > 0) {
                const totalRowNum = 5 + sortedList.length;
                const avgPct = sumTotalCont > 0 ? (sumCreatedLRs / sumTotalCont) : 0;
                ws.addRow([
                    'TOTAL',
                    `${sortedList.length} PRs`,
                    '—',
                    '—',
                    'All Customers',
                    '—',
                    sumTotalCont,
                    sumCreatedLRs,
                    sumPendingCont,
                    avgPct,
                    '—',
                    '—'
                ]);

                const totRow = ws.getRow(totalRowNum);
                totRow.height = 25;
                totRow.eachCell((cell, colNum) => {
                    cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
                    cell.border = {
                        top: { style: 'medium', color: { argb: 'FF0F172A' } },
                        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                        bottom: { style: 'double', color: { argb: 'FF0F172A' } },
                        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
                    };

                    if (colNum === 1 || colNum === 2 || colNum === 3 || colNum === 4 || colNum === 6 || colNum === 11 || colNum === 12) {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    } else if (colNum === 5) {
                        cell.alignment = { horizontal: 'left', vertical: 'middle' };
                    } else if (colNum === 7 || colNum === 8 || colNum === 9) {
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                        cell.numFmt = '#,##0';
                    } else if (colNum === 10) {
                        cell.alignment = { horizontal: 'right', vertical: 'middle' };
                        cell.numFmt = '0.0%';
                    }
                });
            }

            // Also add a Customer Backlog Breakdown tab if in Pending view
            if (isPending && customerSummary.length > 0) {
                const wsCust = workbook.addWorksheet('Customer Backlog Summary', {
                    views: [{ state: 'frozen', ySplit: 4 }]
                });

                wsCust.addRow(['ALVISION EXIM — CUSTOMER-WISE PICKUP BACKLOG SUMMARY']);
                wsCust.mergeCells('A1:G1');
                const custTitle = wsCust.getRow(1);
                custTitle.height = 32;
                custTitle.getCell(1).font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
                custTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF581C87' } };
                custTitle.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

                wsCust.addRow([`Period: ${periodLabel} | Total Customers Waiting: ${customerSummary.length}`]);
                wsCust.mergeCells('A2:G2');
                const custMeta = wsCust.getRow(2);
                custMeta.height = 20;
                custMeta.getCell(1).font = { name: 'Calibri', size: 9.5, italic: true, color: { argb: 'FF581C87' } };
                custMeta.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
                custMeta.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

                wsCust.addRow([]);
                wsCust.getRow(3).height = 6;

                const custHeaders = ['#', 'Customer / Invoice Party', 'Pending PRs', 'Pending Containers', 'Total Containers', 'Branches', 'Earliest DO'];
                wsCust.addRow(custHeaders);
                const custHRow = wsCust.getRow(4);
                custHRow.height = 26;
                custHRow.eachCell((cell) => {
                    cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });

                wsCust.autoFilter = {
                    from: { row: 4, column: 1 },
                    to: { row: 4 + customerSummary.length, column: 7 }
                };

                customerSummary.forEach((c, cIdx) => {
                    const cRowNum = 5 + cIdx;
                    const cBg = cIdx % 2 === 0 ? 'FFFFFFFF' : 'FFFAF5FF';
                    wsCust.addRow([
                        cIdx + 1,
                        c.customerName,
                        c.prCount,
                        c.pendingContainers,
                        c.totalContainers,
                        Array.from(c.branches).join(', ') || '—',
                        c.earliestDo ? formatDateDisplay(c.earliestDo) : '—'
                    ]);

                    const row = wsCust.getRow(cRowNum);
                    row.height = 21;
                    row.eachCell((cell, colNum) => {
                        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cBg } };
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                        };
                        if (colNum === 1) cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        else if (colNum === 2) {
                            cell.alignment = { horizontal: 'left', vertical: 'middle' };
                            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
                        } else if (colNum === 3 || colNum === 4 || colNum === 5) {
                            cell.alignment = { horizontal: 'right', vertical: 'middle' };
                            cell.numFmt = '#,##0';
                            if (colNum === 4) cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB91C1C' } };
                        } else {
                            cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        }
                    });
                });

                // Auto-fit column widths for customer sheet
                wsCust.columns.forEach((col) => {
                    let max = 0;
                    col.eachCell({ includeEmpty: true }, (cell, rn) => {
                        if (rn > 3) {
                            const l = cell.value ? String(cell.value).length : 0;
                            if (l > max) max = l;
                        }
                    });
                    col.width = Math.max(max + 4, 14);
                });
            }

            // Auto-fit column widths for main sheet
            ws.columns.forEach((col) => {
                let max = 0;
                col.eachCell({ includeEmpty: true }, (cell, rn) => {
                    if (rn > 3) {
                        const l = cell.value ? String(cell.value).length : 0;
                        if (l > max) max = l;
                    }
                });
                col.width = Math.max(max + 4, 14);
            });

            // Generate buffer and trigger download
            const buffer = await workbook.xlsx.writeBuffer();
            const fileName = isPending
                ? `Transport_Pending_Pickup_Queue_${new Date().toISOString().slice(0, 10)}.xlsx`
                : (isActive
                    ? `Transport_Active_Dispatches_${new Date().toISOString().slice(0, 10)}.xlsx`
                    : `Transport_Completed_Trips_${new Date().toISOString().slice(0, 10)}.xlsx`);

            saveAs(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
        } catch (err) {
            console.error("Excel export error:", err);
            alert("Failed to export Excel file. Please try again.");
        }
    };

    // ─── Export to PDF ─────────────────────────────────────────────────────────
    const exportToPDF = () => {
        if (!sortedList.length) return;

        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        doc.setFontSize(14);
        doc.text(
            activeSection === 'pending'
                ? "Transport Dispatch - Pending Pickup Queue Summary"
                : (activeSection === 'active'
                    ? "Transport Dispatch - Active / In-Transit LRs Summary"
                    : "Transport Dispatch - Completed & Closed LRs Summary"),
            40, 35
        );
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Period: ${periodLabel} | Generated: ${new Date().toLocaleString('en-GB')} | Total Records: ${sortedList.length}`, 40, 50);

        if (activeSection === 'pending') {
            const tableColumn = [
                "Srl", "PR No", "I/E", "Branch", "Customer / Party",
                "Container Type", "Total", "Created", "Pending", "Progress", "DO Validity"
            ];
            const tableRows = sortedList.map((item, idx) => {
                const tot = item.totalContainers || 0;
                const crt = item.lrCreatedContainers || 0;
                const pct = tot > 0 ? Math.round((crt / tot) * 100) : 0;
                return [
                    idx + 1,
                    item.pr_no || '',
                    item.import_export || 'Import',
                    item.branch || '',
                    (item.invoice_party || '').slice(0, 24),
                    item.container_type || 'Standard',
                    tot,
                    crt,
                    item.pendingCount || 0,
                    `${pct}%`,
                    item.do_validity ? formatDateDisplay(item.do_validity) : '-'
                ];
            });

            doc.autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: 65,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 4 },
                headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { left: 30, right: 30 }
            });

            doc.save(`Transport_Pending_Queue_${new Date().toISOString().slice(0, 10)}.pdf`);
        } else {
            const isAct = activeSection === 'active';
            const tableColumn = [
                "Srl", "LR No", "I/E", "Branch", "Consignee", "Consignor",
                "Container Type", "Vehicle No", "Container No", "Own/Hired", isAct ? "LR Date / Status" : "Closed Date"
            ];
            const tableRows = sortedList.map((item, idx) => [
                idx + 1,
                item.tr_no || '',
                item.import_export || 'Import',
                item.branch || '',
                (item.consignee || '').slice(0, 20),
                (item.consignor || '').slice(0, 18),
                item.container_type || item.container_size || item.vehicle_type || item.type || 'Standard',
                item.vehicle_no || '',
                item.container_number || '',
                item.own_hired || 'Own',
                item.dispatchClosedDate ? formatDateDisplay(item.dispatchClosedDate) : '-'
            ]);

            doc.autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: 65,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 4 },
                headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { left: 30, right: 30 }
            });

            doc.save(`Transport_Completed_LRs_${new Date().toISOString().slice(0, 10)}.pdf`);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '340px', gap: '12px' }}>
                <div style={{
                    width: '38px',
                    height: '38px',
                    border: '3px solid #e2e8f0',
                    borderTopColor: '#4f46e5',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                }} />
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>Loading Transport Dispatch & Queue Report...</div>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '14px',
                padding: '24px',
                textAlign: 'center',
                color: '#b91c1c'
            }}>
                <AlertTriangle size={32} style={{ marginBottom: '8px' }} />
                <div style={{ fontWeight: 700, fontSize: '16px' }}>Failed to Load Transport Data</div>
                <div style={{ fontSize: '13px', marginTop: '4px', color: '#7f1d1d' }}>{error}</div>
                <button
                    onClick={loadReportData}
                    style={{
                        marginTop: '14px',
                        background: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        padding: '8px 18px',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'pointer'
                    }}
                >
                    Retry Loading
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            
            {/* ─── Header Strip (Single Clean Header with Period & Refresh) ───── */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
                background: '#ffffff',
                padding: '16px 20px',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                boxSizing: 'border-box'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>📦</span>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                            Transport Pickup Queue & Dispatch Monitoring
                        </h2>
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={13} color="#4f46e5" />
                        <span>Showing data for: <strong>{periodLabel}</strong></span>
                    </div>
                </div>

                {/* Header Actions: Last Updated & Refresh */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {lastUpdated && (
                        <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
                            Updated: {format(lastUpdated, 'HH:mm:ss')}
                        </span>
                    )}

                    <button
                        onClick={loadReportData}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#f8fafc',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            padding: '7px 14px',
                            borderRadius: '10px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                        title="Refresh data"
                    >
                        <RefreshCw size={13} /> Refresh
                    </button>
                </div>
            </div>

            {/* ─── 5 Top KPI Metrics Cards ────────────────────────────────────── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                width: '100%',
                boxSizing: 'border-box'
            }}>
                {/* 1. Total Pending PRs */}
                <div
                    onClick={() => { setActiveSection('pending'); setCurrentPage(1); }}
                    style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        border: activeSection === 'pending' ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                        padding: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        boxShadow: activeSection === 'pending' ? '0 0 0 3px rgba(79, 70, 229, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                    }}
                >
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                        <Package size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Total Pending PRs
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
                            {overallStats.totalPRs}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            Awaiting Dispatch
                        </div>
                    </div>
                </div>

                {/* 2. Total Pending Containers */}
                <div
                    onClick={() => { setActiveSection('pending'); setCurrentPage(1); }}
                    style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        border: '1px solid #fde68a',
                        padding: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.08)',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                    }}
                >
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                        <Layers size={24} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Pending Containers
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 900, color: '#b45309', lineHeight: 1.2 }}>
                            {overallStats.totalPendingContainers}
                        </div>
                        <div style={{ fontSize: '11px', color: '#78350f', marginTop: '2px' }}>
                            out of {overallStats.totalAllContainers} total cont.
                        </div>
                    </div>
                </div>

                {/* 3. Active / Dispatched LRs */}
                <div
                    onClick={() => { setActiveSection('active'); setCurrentPage(1); }}
                    style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        border: activeSection === 'active' ? '2px solid #d97706' : '1px solid #e2e8f0',
                        padding: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        boxShadow: activeSection === 'active' ? '0 0 0 3px rgba(217, 119, 6, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                    }}
                >
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                        <Truck size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Active In-Transit LRs
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
                            {overallStats.totalActiveLRs} <span style={{ fontSize: '12px', fontWeight: 600, color: '#d97706' }}>On Road</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            Live Dispatches
                        </div>
                    </div>
                </div>

                {/* 4. Completed / Closed LRs */}
                <div
                    onClick={() => { setActiveSection('closed'); setCurrentPage(1); }}
                    style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        border: activeSection === 'closed' ? '2px solid #059669' : '1px solid #e2e8f0',
                        padding: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        boxShadow: activeSection === 'closed' ? '0 0 0 3px rgba(5, 150, 105, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
                        cursor: 'pointer',
                        boxSizing: 'border-box'
                    }}
                >
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                        <CheckCircle2 size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Completed / Closed Trips
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
                            {overallStats.totalClosedLRs} <span style={{ fontSize: '12px', fontWeight: 600, color: '#059669' }}>LRs Closed</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            in selected period
                        </div>
                    </div>
                </div>

                {/* 4. Interactive DO Urgency Radar Card */}
                <div style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: selectedDoStatus !== 'ALL' ? '2px solid #ef4444' : overallStats.expiredDoCount > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0',
                    padding: '16px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    boxShadow: selectedDoStatus !== 'ALL' ? '0 0 0 3px rgba(239, 68, 68, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
                    boxSizing: 'border-box',
                    position: 'relative'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '14px',
                        background: overallStats.expiredDoCount > 0 ? '#fef2f2' : '#fffbeb',
                        color: overallStats.expiredDoCount > 0 ? '#dc2626' : '#d97706',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px',
                        flexShrink: 0
                    }}>
                        <Clock size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                DO Urgency Radar
                            </div>
                            {selectedDoStatus !== 'ALL' && (
                                <button
                                    onClick={() => setSelectedDoStatus('ALL')}
                                    style={{
                                        border: 'none',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        color: '#dc2626',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    ✕ Reset
                                </button>
                            )}
                        </div>
                        
                        {/* Interactive Clickable Badges */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                            <button
                                onClick={() => {
                                    setActiveSection('pending');
                                    setSelectedDoStatus(prev => prev === 'EXPIRED' ? 'ALL' : 'EXPIRED');
                                    setCurrentPage(1);
                                }}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: selectedDoStatus === 'EXPIRED' ? '#dc2626' : '#fef2f2',
                                    color: selectedDoStatus === 'EXPIRED' ? '#ffffff' : '#b91c1c',
                                    border: '1px solid #fca5a5',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                                title="Click to filter Expired DOs"
                            >
                                <AlertTriangle size={11} /> {overallStats.expiredDoCount} Expired
                            </button>

                            <button
                                onClick={() => {
                                    setActiveSection('pending');
                                    setSelectedDoStatus(prev => prev === 'EXPIRING_SOON' ? 'ALL' : 'EXPIRING_SOON');
                                    setCurrentPage(1);
                                }}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: selectedDoStatus === 'EXPIRING_SOON' ? '#d97706' : '#fffbeb',
                                    color: selectedDoStatus === 'EXPIRING_SOON' ? '#ffffff' : '#b45309',
                                    border: '1px solid #fcd34d',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                                title="Click to filter DOs Expiring in ≤3 days"
                            >
                                <Clock size={11} /> {overallStats.expiringSoonDoCount} Expiring ≤3d
                            </button>
                        </div>
                    </div>
                </div>

                {/* 5. Unique Parties / Customers */}
                <div
                    onClick={() => setShowCustomerModal(true)}
                    style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        border: selectedCustomer !== 'ALL' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
                        padding: '16px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        boxShadow: selectedCustomer !== 'ALL' ? '0 0 0 3px rgba(124, 58, 237, 0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                        transition: 'all 0.15s ease'
                    }}
                    title="Click to view Customer breakdown details"
                >
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                        <Users size={24} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Customers Waiting
                            </div>
                            {selectedCustomer !== 'ALL' && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedCustomer('ALL'); }}
                                    style={{
                                        border: 'none',
                                        background: 'rgba(124, 58, 237, 0.1)',
                                        color: '#7c3aed',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    ✕ Reset
                                </button>
                            )}
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
                            {overallStats.uniquePartiesCount} <span style={{ fontSize: '12px', fontWeight: 600, color: '#7c3aed' }}>Parties</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#7c3aed', marginTop: '2px', fontWeight: 600 }}>
                            Click to view details ↗
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Search & Quick Filter Toolbar ──────────────────────────────── */}
            <div style={{
                background: '#ffffff',
                padding: '14px 18px',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                boxSizing: 'border-box'
            }}>
                {/* Left Filter Controls */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: '1 1 auto', flexWrap: 'wrap', minWidth: 0 }}>
                    {/* Live Search Input */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#f8fafc',
                        padding: '0 12px',
                        height: '36px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        flex: '1 1 200px',
                        minWidth: '160px',
                        maxWidth: '260px',
                        boxSizing: 'border-box'
                    }}>
                        <Search size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
                        <input
                            type="text"
                            placeholder={activeSection === 'pending' ? "Search PR No, Customer..." : "Search LR, Vehicle, Container..."}
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                outline: 'none',
                                width: '100%',
                                minWidth: 0,
                                fontSize: '12.5px',
                                color: '#1e293b'
                            }}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', fontSize: '12px', padding: 0 }}
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* DO Status Filter (Pending only) */}
                    {activeSection === 'pending' && (
                        <select
                            value={selectedDoStatus}
                            onChange={(e) => {
                                setSelectedDoStatus(e.target.value);
                                setCurrentPage(1);
                            }}
                            style={{
                                height: '36px',
                                padding: '0 10px',
                                borderRadius: '8px',
                                border: selectedDoStatus !== 'ALL' ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                                background: selectedDoStatus !== 'ALL' ? '#fef2f2' : '#f8fafc',
                                fontWeight: selectedDoStatus !== 'ALL' ? 700 : 500,
                                fontSize: '12.5px',
                                color: selectedDoStatus !== 'ALL' ? '#b91c1c' : '#334155',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="ALL">All DO Statuses ({pendingList.length})</option>
                            <option value="EXPIRED">🔴 Expired ({overallStats.expiredDoCount})</option>
                            <option value="EXPIRING_SOON">🟡 Expiring ≤3d ({overallStats.expiringSoonDoCount})</option>
                            <option value="VALID">🟢 Active & Valid ({overallStats.validDoCount})</option>
                            <option value="NO_DO">— No DO Date</option>
                        </select>
                    )}

                    {/* Customer Filter */}
                    {availableCustomers.length > 0 && (
                        <select
                            value={selectedCustomer}
                            onChange={(e) => {
                                setSelectedCustomer(e.target.value);
                                setCurrentPage(1);
                            }}
                            style={{
                                height: '36px',
                                padding: '0 10px',
                                borderRadius: '8px',
                                border: selectedCustomer !== 'ALL' ? '1.5px solid #7c3aed' : '1px solid #cbd5e1',
                                background: selectedCustomer !== 'ALL' ? '#f5f3ff' : '#f8fafc',
                                fontWeight: selectedCustomer !== 'ALL' ? 700 : 500,
                                fontSize: '12.5px',
                                color: selectedCustomer !== 'ALL' ? '#6d28d9' : '#334155',
                                outline: 'none',
                                cursor: 'pointer',
                                maxWidth: '180px'
                            }}
                        >
                            <option value="ALL">All Customers ({availableCustomers.length})</option>
                            {availableCustomers.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    )}

                    {/* Branch Filter */}
                    {availableBranches.length > 0 && (
                        <select
                            value={selectedBranch}
                            onChange={(e) => {
                                setSelectedBranch(e.target.value);
                                setCurrentPage(1);
                            }}
                            style={{
                                height: '36px',
                                padding: '0 10px',
                                borderRadius: '8px',
                                border: selectedBranch !== 'ALL' ? '1.5px solid #4f46e5' : '1px solid #cbd5e1',
                                background: selectedBranch !== 'ALL' ? '#eff6ff' : '#f8fafc',
                                fontWeight: selectedBranch !== 'ALL' ? 700 : 500,
                                fontSize: '12.5px',
                                color: selectedBranch !== 'ALL' ? '#1d4ed8' : '#334155',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="ALL">All Branches ({availableBranches.length})</option>
                            {availableBranches.map(b => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    )}

                    {/* Container / Vehicle Size & Type Filter */}
                    <select
                        value={selectedContainerType}
                        onChange={(e) => {
                            setSelectedContainerType(e.target.value);
                            setCurrentPage(1);
                        }}
                        style={{
                            height: '36px',
                            padding: '0 10px',
                            borderRadius: '8px',
                            border: selectedContainerType !== 'ALL' ? '1.5px solid #d97706' : '1px solid #cbd5e1',
                            background: selectedContainerType !== 'ALL' ? '#fffbeb' : '#f8fafc',
                            fontWeight: selectedContainerType !== 'ALL' ? 700 : 500,
                            fontSize: '12.5px',
                            color: selectedContainerType !== 'ALL' ? '#b45309' : '#334155',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="ALL">All Sizes & Types</option>
                        <option value="SIZE_20">20' Containers (20ft / 20 Dry / 20 HC)</option>
                        <option value="SIZE_40">40' Containers (40ft / 40 HC / 40 Dry)</option>
                        {availableContainerTypes.filter(ct => !['20', '40', '45', 'SIZE_20', 'SIZE_40', 'SIZE_45'].includes(ct)).map(ct => (
                            <option key={ct} value={ct}>{ct}</option>
                        ))}
                    </select>

                    {/* I/E Filter */}
                    <select
                        value={selectedIe}
                        onChange={(e) => {
                            setSelectedIe(e.target.value);
                            setCurrentPage(1);
                        }}
                        style={{
                            height: '36px',
                            padding: '0 10px',
                            borderRadius: '8px',
                            border: selectedIe !== 'ALL' ? '1.5px solid #059669' : '1px solid #cbd5e1',
                            background: selectedIe !== 'ALL' ? '#ecfdf5' : '#f8fafc',
                            fontWeight: selectedIe !== 'ALL' ? 700 : 500,
                            fontSize: '12.5px',
                            color: selectedIe !== 'ALL' ? '#047857' : '#334155',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="ALL">All Trade Types</option>
                        <option value="import">Import</option>
                        <option value="export">Export</option>
                    </select>
                </div>

                {/* Right Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    {activeSection === 'pending' && (
                        <div style={{
                            display: 'inline-flex',
                            background: '#f1f5f9',
                            padding: '3px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            height: '36px',
                            boxSizing: 'border-box',
                            alignItems: 'center'
                        }}>
                            <button
                                onClick={() => setViewMode('flat')}
                                style={{
                                    border: 'none',
                                    background: viewMode === 'flat' ? '#ffffff' : 'transparent',
                                    color: viewMode === 'flat' ? '#0f172a' : '#64748b',
                                    fontWeight: 700,
                                    fontSize: '12px',
                                    padding: '4px 9px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: viewMode === 'flat' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                                }}
                            >
                                <ListFilter size={12} /> Table
                            </button>
                            <button
                                onClick={() => setViewMode('by_customer')}
                                style={{
                                    border: 'none',
                                    background: viewMode === 'by_customer' ? '#ffffff' : 'transparent',
                                    color: viewMode === 'by_customer' ? '#7c3aed' : '#64748b',
                                    fontWeight: 700,
                                    fontSize: '12px',
                                    padding: '4px 9px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: viewMode === 'by_customer' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                                }}
                            >
                                <Users size={12} /> By Customer
                            </button>
                            <button
                                onClick={() => setViewMode('grouped')}
                                style={{
                                    border: 'none',
                                    background: viewMode === 'grouped' ? '#ffffff' : 'transparent',
                                    color: viewMode === 'grouped' ? '#0f172a' : '#64748b',
                                    fontWeight: 700,
                                    fontSize: '12px',
                                    padding: '4px 9px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: viewMode === 'grouped' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                                }}
                            >
                                <Layers size={12} /> By Type
                            </button>
                        </div>
                    )}

                    <button
                        onClick={exportToExcel}
                        disabled={sortedList.length === 0}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: '#10b981',
                            color: '#ffffff',
                            border: 'none',
                            height: '36px',
                            padding: '0 14px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '12.5px',
                            cursor: sortedList.length === 0 ? 'not-allowed' : 'pointer',
                            opacity: sortedList.length === 0 ? 0.6 : 1,
                            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)'
                        }}
                    >
                        <Download size={13} /> Excel
                    </button>

                    <button
                        onClick={exportToPDF}
                        disabled={sortedList.length === 0}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: '#ef4444',
                            color: '#ffffff',
                            border: 'none',
                            height: '36px',
                            padding: '0 14px',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '12.5px',
                            cursor: sortedList.length === 0 ? 'not-allowed' : 'pointer',
                            opacity: sortedList.length === 0 ? 0.6 : 1,
                            boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)'
                        }}
                    >
                        <FileText size={13} /> PDF
                    </button>
                </div>
            </div>

            {/* ─── Main Content: Pending Queue vs Closed LRs ──────────────────── */}
            {activeSection === 'pending' ? (
                /* SECTION 1: PENDING QUEUE */
                viewMode === 'by_customer' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
                        {Object.keys(customerGroupedData).length === 0 ? (
                            <div style={{
                                background: '#ffffff',
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                padding: '50px 20px',
                                textAlign: 'center',
                                color: '#64748b'
                            }}>
                                <Package size={32} style={{ marginBottom: '8px', color: '#cbd5e1' }} />
                                <div style={{ fontSize: '15px', fontWeight: 600 }}>No pending pickup requests found.</div>
                            </div>
                        ) : (
                            Object.entries(customerGroupedData).map(([custKey, group], gIdx) => (
                                <div
                                    key={gIdx}
                                    style={{
                                        background: '#ffffff',
                                        borderRadius: '16px',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
                                        overflow: 'hidden',
                                        width: '100%',
                                        maxWidth: '100%',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <div style={{
                                        background: '#faf5ff',
                                        padding: '12px 18px',
                                        borderBottom: '1px solid #f3e8ff',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: '8px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Users size={16} color="#7c3aed" />
                                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#581c87' }}>{custKey}</span>
                                            <span style={{ fontSize: '11.5px', color: '#7e22ce', fontWeight: 700 }}>({group.items.length} PRs)</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', fontWeight: 800 }}>
                                            <span style={{ color: '#b91c1c' }}>{group.totalPending} Pending Containers</span>
                                            <span style={{ color: '#cbd5e1' }}>/</span>
                                            <span style={{ color: '#475569' }}>{group.totalContainers} Total Containers</span>
                                        </div>
                                    </div>

                                    <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', boxSizing: 'border-box' }}>
                                        <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', background: '#ffffff' }}>
                                            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                                                <tr>
                                                    <th style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 800, width: '45px' }}>#</th>
                                                    <th style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 800, width: '140px' }}>PR No</th>
                                                    <th style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 800, width: '80px' }}>I/E</th>
                                                    <th style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 800, width: '100px' }}>Branch</th>
                                                    <th style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 800, width: '140px' }}>Container Type</th>
                                                    <th style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 800, width: '140px' }}>LR Progress</th>
                                                    <th style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 800, width: '100px', textAlign: 'center' }}>Pending</th>
                                                    <th style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 800, width: '160px' }}>DO Validity</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group.items.map((item, idx) => {
                                                    const tot = item.totalContainers || 0;
                                                    const crt = item.lrCreatedContainers || 0;
                                                    const pct = tot > 0 ? Math.round((crt / tot) * 100) : 0;
                                                    return (
                                                        <tr
                                                            key={idx}
                                                            style={{
                                                                borderBottom: '1px solid #e2e8f0',
                                                                background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                                                                transition: 'background 0.15s ease'
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#f8fafc'}
                                                        >
                                                            <td style={{ padding: '10px 14px', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                                                            <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a' }}>
                                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                    <span style={{ fontFamily: 'monospace' }}>{item.pr_no}</span>
                                                                    <CopyButton text={item.pr_no} />
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '10px 14px' }}>{getIeBadge(item.import_export)}</td>
                                                            <td style={{ padding: '10px 14px', color: '#334155', fontWeight: 600 }}>
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                    <Building2 size={12} color="#64748b" /> {item.branch || '—'}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '10px 14px', color: '#334155', fontWeight: 600 }}>
                                                                <span style={{
                                                                    background: '#f1f5f9',
                                                                    color: '#334155',
                                                                    padding: '3px 8px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '11.5px',
                                                                    fontWeight: 600
                                                                }}>
                                                                    {item.container_type || 'Standard'}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '10px 14px' }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>
                                                                        {crt}/{tot} ({pct}%)
                                                                    </div>
                                                                    <div style={{ width: '90px', height: '5px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                                        <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#10b981' : pct > 0 ? '#3b82f6' : '#94a3b8' }} />
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                                <span style={{
                                                                    background: '#fef3c7',
                                                                    color: '#92400e',
                                                                    padding: '3px 8px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '12px',
                                                                    fontWeight: 800
                                                                }}>
                                                                    {item.pendingCount || 0}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '10px 14px' }}>
                                                                {getDoValidityBadge(item.do_validity)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : viewMode === 'grouped' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', boxSizing: 'border-box' }}>
                        {Object.keys(groupedData).length === 0 ? (
                            <div style={{
                                background: '#ffffff',
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                padding: '50px 20px',
                                textAlign: 'center',
                                color: '#64748b'
                            }}>
                                <Package size={32} style={{ marginBottom: '8px', color: '#cbd5e1' }} />
                                <div style={{ fontSize: '15px', fontWeight: 600 }}>No pending pickup requests found.</div>
                            </div>
                        ) : (
                            Object.entries(groupedData).map(([typeKey, group], gIdx) => (
                                <div
                                    key={gIdx}
                                    style={{
                                        background: '#ffffff',
                                        borderRadius: '16px',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
                                        overflow: 'hidden',
                                        width: '100%',
                                        maxWidth: '100%',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <div style={{
                                        background: '#f8fafc',
                                        padding: '12px 18px',
                                        borderBottom: '1px solid #e2e8f0',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: '8px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Package size={16} color="#4f46e5" />
                                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{typeKey}</span>
                                            <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700 }}>({group.items.length} PRs)</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px', fontWeight: 800 }}>
                                            <span style={{ color: '#b45309' }}>{group.totalPending} Pending</span>
                                            <span style={{ color: '#cbd5e1' }}>/</span>
                                            <span style={{ color: '#475569' }}>{group.totalContainers} Total Containers</span>
                                        </div>
                                    </div>

                                    <div style={{ width: '100%', maxWidth: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', boxSizing: 'border-box' }}>
                                        <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', background: '#ffffff' }}>
                                            <thead style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                                                <tr>
                                                    <th style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 800, width: '45px' }}>#</th>
                                                    <th style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 800, width: '140px' }}>PR No</th>
                                                    <th style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 800, width: '80px' }}>I/E</th>
                                                    <th style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 800, width: '100px' }}>Branch</th>
                                                    <th style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 800, minWidth: '180px' }}>Customer / Party</th>
                                                    <th style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 800, width: '140px' }}>LR Progress</th>
                                                    <th style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 800, width: '100px', textAlign: 'center' }}>Pending</th>
                                                    <th style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 800, width: '160px' }}>DO Validity</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group.items.map((item, idx) => {
                                                    const tot = item.totalContainers || 0;
                                                    const crt = item.lrCreatedContainers || 0;
                                                    const pct = tot > 0 ? Math.round((crt / tot) * 100) : 0;
                                                    return (
                                                        <tr
                                                            key={idx}
                                                            style={{
                                                                borderBottom: '1px solid #e2e8f0',
                                                                background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                                                                transition: 'background 0.15s ease'
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#f8fafc'}
                                                        >
                                                            <td style={{ padding: '10px 14px', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                                                            <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a' }}>
                                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                    <span style={{ fontFamily: 'monospace' }}>{item.pr_no}</span>
                                                                    <CopyButton text={item.pr_no} />
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '10px 14px' }}>{getIeBadge(item.import_export)}</td>
                                                            <td style={{ padding: '10px 14px', color: '#334155', fontWeight: 600 }}>
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                    <Building2 size={12} color="#64748b" /> {item.branch || '—'}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '10px 14px', color: '#0f172a', fontWeight: 700, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.invoice_party}>
                                                                {item.invoice_party || '—'}
                                                            </td>
                                                            <td style={{ padding: '10px 14px' }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>
                                                                        {crt}/{tot} ({pct}%)
                                                                    </div>
                                                                    <div style={{ width: '90px', height: '5px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                                        <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#10b981' : pct > 0 ? '#3b82f6' : '#94a3b8' }} />
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                                <span style={{
                                                                    background: '#fef3c7',
                                                                    color: '#92400e',
                                                                    padding: '3px 8px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '12px',
                                                                    fontWeight: 800
                                                                }}>
                                                                    {item.pendingCount || 0}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '10px 14px' }}>
                                                                {getDoValidityBadge(item.do_validity)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                        overflow: 'hidden',
                        width: '100%',
                        maxWidth: '100%',
                        boxSizing: 'border-box'
                    }}>
                        <div style={{
                            width: '100%',
                            maxWidth: '100%',
                            overflowX: 'auto',
                            maxHeight: '680px',
                            WebkitOverflowScrolling: 'touch',
                            boxSizing: 'border-box'
                        }}>
                            <table style={{
                                width: '100%',
                                minWidth: '1200px',
                                borderCollapse: 'collapse',
                                textAlign: 'left',
                                fontSize: '13px',
                                background: '#ffffff'
                            }}>
                                <thead style={{
                                    background: '#f1f5f9',
                                    borderBottom: '2px solid #cbd5e1',
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 2
                                }}>
                                    <tr>
                                        <th style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, width: '45px' }}>Srl</th>
                                        <th onClick={() => handleSort('pr_no')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '130px' }}>
                                            PR No {getSortIcon('pr_no')}
                                        </th>
                                        <th onClick={() => handleSort('import_export')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '85px' }}>
                                            I/E {getSortIcon('import_export')}
                                        </th>
                                        <th onClick={() => handleSort('branch')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '100px' }}>
                                            Branch {getSortIcon('branch')}
                                        </th>
                                        <th onClick={() => handleSort('invoice_party')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', minWidth: '200px' }}>
                                            Customer / Invoice Party {getSortIcon('invoice_party')}
                                        </th>
                                        <th onClick={() => handleSort('container_type')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '140px' }}>
                                            Container Type {getSortIcon('container_type')}
                                        </th>
                                        <th onClick={() => handleSort('totalContainers')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '80px', textAlign: 'center' }}>
                                            Total {getSortIcon('totalContainers')}
                                        </th>
                                        <th onClick={() => handleSort('lrCreatedContainers')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '80px', textAlign: 'center' }}>
                                            Created {getSortIcon('lrCreatedContainers')}
                                        </th>
                                        <th onClick={() => handleSort('pendingCount')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '100px', textAlign: 'center' }}>
                                            Pending {getSortIcon('pendingCount')}
                                        </th>
                                        <th style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, width: '140px' }}>
                                            Fulfillment %
                                        </th>
                                        <th onClick={() => handleSort('do_validity')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '160px' }}>
                                            DO Validity {getSortIcon('do_validity')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedList.length === 0 ? (
                                        <tr>
                                            <td colSpan={11} style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                                                No pending pickup requests found matching your filter criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedList.map((item, idx) => {
                                            const srl = pageSize === 'ALL' ? (idx + 1) : ((currentPage - 1) * (parseInt(pageSize, 10) || 25) + idx + 1);
                                            const tot = item.totalContainers || 0;
                                            const crt = item.lrCreatedContainers || 0;
                                            const pct = tot > 0 ? Math.round((crt / tot) * 100) : 0;

                                            return (
                                                <tr
                                                    key={item._id || idx}
                                                    style={{
                                                        borderBottom: '1px solid #e2e8f0',
                                                        background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                                                        transition: 'background 0.15s ease'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#f8fafc'}
                                                >
                                                    <td style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>{srl}</td>
                                                    <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a' }}>
                                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{item.pr_no}</span>
                                                            <CopyButton text={item.pr_no} />
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '10px 14px' }}>
                                                        {getIeBadge(item.import_export)}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', color: '#1e293b' }}>
                                                        <span style={{
                                                            background: '#e0e7ff',
                                                            color: '#312e81',
                                                            padding: '3px 8px',
                                                            borderRadius: '6px',
                                                            fontSize: '11.5px',
                                                            fontWeight: 700
                                                        }}>
                                                            {item.branch || '—'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '10px 14px', color: '#0f172a', fontWeight: 700, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.invoice_party}>
                                                        {item.invoice_party || '—'}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', color: '#334155', fontWeight: 600 }}>
                                                        <span style={{
                                                            background: '#f1f5f9',
                                                            color: '#334155',
                                                            padding: '3px 8px',
                                                            borderRadius: '6px',
                                                            fontSize: '11.5px',
                                                            fontWeight: 600
                                                        }}>
                                                            {item.container_type || 'Standard'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                                                        {tot}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#059669' }}>
                                                        {crt}
                                                    </td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                        <span style={{
                                                            background: '#fef3c7',
                                                            color: '#92400e',
                                                            padding: '3px 8px',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            fontWeight: 800
                                                        }}>
                                                            {item.pendingCount || 0}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '10px 14px' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                            <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>
                                                                {pct}%
                                                            </div>
                                                            <div style={{ width: '90px', height: '5px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                                                                <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#10b981' : pct > 0 ? '#3b82f6' : '#94a3b8' }} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '10px 14px' }}>
                                                        {getDoValidityBadge(item.do_validity)}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            ) : (
                /* SECTION 2 & 3: ACTIVE IN-TRANSIT LRS & COMPLETED CLOSED LRS TABLE */
                <div style={{
                    background: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
                    overflow: 'hidden',
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box'
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '100%',
                        overflowX: 'auto',
                        maxHeight: '680px',
                        WebkitOverflowScrolling: 'touch',
                        boxSizing: 'border-box'
                    }}>
                        <table style={{
                            width: '100%',
                            minWidth: '1200px',
                            borderCollapse: 'collapse',
                            textAlign: 'left',
                            fontSize: '13px',
                            background: '#ffffff'
                        }}>
                            <thead style={{
                                background: '#f1f5f9',
                                borderBottom: '2px solid #cbd5e1',
                                position: 'sticky',
                                top: 0,
                                zIndex: 2
                            }}>
                                <tr>
                                    <th style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, width: '45px' }}>Srl</th>
                                    <th onClick={() => handleSort('tr_no')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '130px' }}>
                                        LR No {getSortIcon('tr_no')}
                                    </th>
                                    <th onClick={() => handleSort('import_export')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '85px' }}>
                                        I/E {getSortIcon('import_export')}
                                    </th>
                                    <th onClick={() => handleSort('branch')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '100px' }}>
                                        Branch {getSortIcon('branch')}
                                    </th>
                                    <th onClick={() => handleSort('consignee')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', minWidth: '180px' }}>
                                        Consignee {getSortIcon('consignee')}
                                    </th>
                                    <th onClick={() => handleSort('consignor')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', minWidth: '160px' }}>
                                        Consignor {getSortIcon('consignor')}
                                    </th>
                                    <th onClick={() => handleSort('container_type')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '130px' }}>
                                        Container Type {getSortIcon('container_type')}
                                    </th>
                                    <th onClick={() => handleSort('vehicle_no')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '140px' }}>
                                        Vehicle No {getSortIcon('vehicle_no')}
                                    </th>
                                    <th onClick={() => handleSort('container_number')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '140px' }}>
                                        Container No {getSortIcon('container_number')}
                                    </th>
                                    <th onClick={() => handleSort('own_hired')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '90px' }}>
                                        Own/Hired {getSortIcon('own_hired')}
                                    </th>
                                    <th onClick={() => handleSort(activeSection === 'active' ? 'lr_date' : 'dispatchClosedDate')} style={{ padding: '12px 14px', color: '#1e293b', fontWeight: 800, cursor: 'pointer', width: '140px' }}>
                                        {activeSection === 'active' ? 'LR Date / Status' : 'Closed Date'} {getSortIcon(activeSection === 'active' ? 'lr_date' : 'dispatchClosedDate')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedList.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                                            <Truck size={32} style={{ marginBottom: '8px', color: '#cbd5e1' }} />
                                            <div>
                                                {activeSection === 'active'
                                                    ? 'No active / in-transit LRs found for this period.'
                                                    : 'No completed / closed trips found for this period.'}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedList.map((item, idx) => {
                                        const srl = pageSize === 'ALL' ? (idx + 1) : ((currentPage - 1) * (parseInt(pageSize, 10) || 25) + idx + 1);
                                        const isAct = activeSection === 'active';
                                        return (
                                            <tr
                                                key={item._id || idx}
                                                style={{
                                                    borderBottom: '1px solid #e2e8f0',
                                                    background: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                                                    transition: 'background 0.15s ease'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#f8fafc'}
                                            >
                                                <td style={{ padding: '10px 14px', color: '#475569', fontWeight: 700 }}>{srl}</td>
                                                <td style={{ padding: '10px 14px', fontWeight: 800, color: '#4f46e5' }}>
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{item.tr_no}</span>
                                                        <CopyButton text={item.tr_no} />
                                                    </div>
                                                </td>
                                                <td style={{ padding: '10px 14px' }}>
                                                    {getIeBadge(item.import_export)}
                                                </td>
                                                <td style={{ padding: '10px 14px', color: '#1e293b' }}>
                                                    <span style={{
                                                        background: '#e0e7ff',
                                                        color: '#312e81',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '11.5px',
                                                        fontWeight: 700
                                                    }}>
                                                        {item.branch || '—'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 14px', color: '#0f172a', fontWeight: 700, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.consignee}>
                                                    {item.consignee || '—'}
                                                </td>
                                                <td style={{ padding: '10px 14px', color: '#475569', fontWeight: 500, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.consignor}>
                                                    {item.consignor || '—'}
                                                </td>
                                                <td style={{ padding: '10px 14px', color: '#334155', fontWeight: 600 }}>
                                                    <span style={{
                                                        background: '#f1f5f9',
                                                        color: '#334155',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '11.5px',
                                                        fontWeight: 600
                                                    }}>
                                                        {item.container_type || item.container_size || item.vehicle_type || item.type || 'Standard'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                                                    {item.vehicle_no || '—'}
                                                </td>
                                                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#334155', fontFamily: 'monospace' }}>
                                                    {item.container_number || '—'}
                                                </td>
                                                <td style={{ padding: '10px 14px' }}>
                                                    {getOwnHiredBadge(item.own_hired)}
                                                </td>
                                                <td style={{ padding: '10px 14px', color: isAct ? '#d97706' : '#059669', fontWeight: 600, fontSize: '12px' }}>
                                                    {isAct
                                                        ? (item.lr_date ? formatDateDisplay(item.lr_date) : (item.status || 'In Transit'))
                                                        : (item.dispatchClosedDate ? formatDateDisplay(item.dispatchClosedDate) : 'Completed')}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ─── Pagination Footer ──────────────────────────────────────────── */}
            {sortedList.length > 0 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    padding: '12px 18px',
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>Rows per page:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                fontSize: '12.5px',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={25}>25</option>
                            <option value={30}>30</option>
                            <option value={40}>40</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value="ALL">All ({sortedList.length})</option>
                        </select>
                        <span style={{ fontSize: '13px', color: '#64748b' }}>
                            Showing {pageSize === 'ALL' ? 1 : (currentPage - 1) * pageSize + 1} - {pageSize === 'ALL' ? sortedList.length : Math.min(currentPage * pageSize, sortedList.length)} of {sortedList.length} {activeSection === 'pending' ? 'PRs' : 'Closed LRs'}
                        </span>
                    </div>

                    {pageSize !== 'ALL' && totalPages > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                disabled={currentPage === 1}
                                style={{
                                    border: '1px solid #cbd5e1',
                                    background: currentPage === 1 ? '#f8fafc' : '#ffffff',
                                    color: currentPage === 1 ? '#94a3b8' : '#1e293b',
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    fontSize: '12.5px',
                                    fontWeight: 600,
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Prev
                            </button>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155', padding: '0 6px' }}>
                                {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                style={{
                                    border: '1px solid #cbd5e1',
                                    background: currentPage === totalPages ? '#f8fafc' : '#ffffff',
                                    color: currentPage === totalPages ? '#94a3b8' : '#1e293b',
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    fontSize: '12.5px',
                                    fontWeight: 600,
                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            )}
            {/* ─── Customer Breakdown Modal ────────────────────────────────────── */}
            {showCustomerModal && (
                <div
                    onClick={() => setShowCustomerModal(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(15, 23, 42, 0.55)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '20px',
                        boxSizing: 'border-box'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#ffffff',
                            borderRadius: '18px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                            width: '100%',
                            maxWidth: '780px',
                            maxHeight: '85vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Modal Header */}
                        <div style={{
                            padding: '18px 24px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#f8fafc'
                        }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Users size={20} color="#7c3aed" /> Customers Waiting Breakdown ({customerSummary.length} Clients)
                                </h3>
                                <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                                    Distinct clients with pending Pickup Requests (PRs) awaiting container dispatch
                                </p>
                            </div>
                            <button
                                onClick={() => setShowCustomerModal(false)}
                                style={{
                                    border: 'none',
                                    background: '#f1f5f9',
                                    color: '#64748b',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '16px',
                                    fontWeight: 700
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body Table */}
                        <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', fontSize: '11.5px', textTransform: 'uppercase' }}>
                                        <th style={{ padding: '10px 8px' }}>#</th>
                                        <th style={{ padding: '10px 8px' }}>Customer / Party</th>
                                        <th style={{ padding: '10px 8px', textAlign: 'center' }}>Pending PRs</th>
                                        <th style={{ padding: '10px 8px', textAlign: 'center' }}>Pending Cont.</th>
                                        <th style={{ padding: '10px 8px' }}>Branches</th>
                                        <th style={{ padding: '10px 8px' }}>DO Status</th>
                                        <th style={{ padding: '10px 8px', textAlign: 'right' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customerSummary.map((cust, idx) => (
                                        <tr
                                            key={cust.customerName}
                                            style={{
                                                borderBottom: '1px solid #f1f5f9',
                                                background: selectedCustomer === cust.customerName ? '#f5f3ff' : 'transparent'
                                            }}
                                        >
                                            <td style={{ padding: '12px 8px', color: '#94a3b8', fontWeight: 600 }}>{idx + 1}</td>
                                            <td style={{ padding: '12px 8px', fontWeight: 700, color: '#0f172a' }}>
                                                {cust.customerName}
                                            </td>
                                            <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 700, color: '#4f46e5' }}>
                                                {cust.prCount}
                                            </td>
                                            <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                                <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, fontSize: '12px' }}>
                                                    {cust.pendingContainers}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 8px', color: '#64748b', fontSize: '12px' }}>
                                                {Array.from(cust.branches).join(', ') || '—'}
                                            </td>
                                            <td style={{ padding: '12px 8px' }}>
                                                {getDoValidityBadge(cust.earliestDo)}
                                            </td>
                                            <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                                                <button
                                                    onClick={() => {
                                                        setActiveSection('pending');
                                                        setSelectedCustomer(cust.customerName);
                                                        setShowCustomerModal(false);
                                                        setCurrentPage(1);
                                                    }}
                                                    style={{
                                                        border: 'none',
                                                        background: '#4f46e5',
                                                        color: '#ffffff',
                                                        padding: '5px 12px',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        fontWeight: 700,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Filter Queue
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Modal Footer */}
                        <div style={{
                            padding: '12px 24px',
                            borderTop: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#f8fafc'
                        }}>
                            <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                                Total: <strong>{customerSummary.length} Customers</strong> waiting for <strong>{overallStats.totalPendingContainers} containers</strong>
                            </span>
                            <button
                                onClick={() => {
                                    setSelectedCustomer('ALL');
                                    setShowCustomerModal(false);
                                }}
                                style={{
                                    border: '1px solid #cbd5e1',
                                    background: '#ffffff',
                                    color: '#334155',
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    fontSize: '12.5px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
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
