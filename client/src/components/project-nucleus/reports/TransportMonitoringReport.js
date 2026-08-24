import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import axios from 'axios';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { BranchContext } from '../../../contexts/BranchContext';
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
    Layers,
    X,
    Building2,
    ArrowUpDown,
    CheckSquare,
    Truck
} from 'lucide-react';
import { TRANSPORT_BASE, TRANSPORT_HEADERS, getTransportDates } from './reports-helper';

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');

.fleet-root {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    display: flex;
    flex-direction: column;
    gap: 22px;
    padding: 0;
    background: transparent;
    color: #1e293b;
    width: 100%;
    box-sizing: border-box;
}

/* Glass Card with Glowing Orb */
.fleet-card {
    background: var(--fc-bg, rgba(255, 255, 255, 0.88));
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    border-radius: 20px;
    border: var(--fc-border, 1px solid rgba(226, 232, 240, 0.8));
    box-shadow: 0 8px 20px -2px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.9);
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
    position: relative;
    box-sizing: border-box;
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
    transition: all 0.3s ease;
    pointer-events: none;
    z-index: 0;
}
.fleet-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 14px 30px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 1);
    border-color: rgba(226, 232, 240, 1);
    z-index: 4;
}

/* Hero KPI Grid - Exactly 3 Equal Columns */
.fleet-hero-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
    align-items: stretch;
    width: 100%;
}
@media (max-width: 1100px) {
    .fleet-hero-grid {
        grid-template-columns: 1fr;
    }
}

/* Header Glass Container */
.fleet-header-glass {
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.03);
    padding: 20px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    box-sizing: border-box;
}

/* Sub Tabs Bar */
.fleet-subtabs {
    display: inline-flex;
    padding: 4px;
    background: rgba(241, 245, 249, 0.8);
    backdrop-filter: blur(12px);
    border-radius: 12px;
    border: 1px solid rgba(226, 232, 240, 0.8);
    gap: 4px;
}
.fleet-subtab-btn {
    padding: 8px 16px;
    border-radius: 8px;
    font-family: 'Outfit', sans-serif;
    font-size: 13px;
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

/* Table Wrapper */
.fleet-table-wrap {
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 20px;
    border: 1px solid rgba(226, 232, 240, 0.8);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.02);
    overflow: hidden;
    box-sizing: border-box;
    width: 100%;
}
.fleet-table {
    width: 100%;
    border-collapse: collapse;
    border-spacing: 0;
}
.fleet-table th {
    background: linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.95) 100%);
    color: #0f172a;
    font-family: 'Outfit', sans-serif;
    font-weight: 700;
    font-size: 12.5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 13px 16px;
    border-bottom: 1px solid rgba(226, 232, 240, 0.8);
    white-space: nowrap;
    vertical-align: middle;
}
.fleet-table td {
    color: #1e293b;
    font-weight: 500;
    font-size: 13px;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(226, 232, 240, 0.5);
    transition: background 0.2s;
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
    justify-content: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 999px;
    font-weight: 700;
    font-size: 11.5px;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    transition: all 0.2s;
    font-family: 'Outfit', sans-serif;
    white-space: nowrap;
    line-height: 1.2;
}
.status-pill-v2[data-variant="neutral"] { background: rgba(148, 163, 184, 0.15); color: #475569; border: 1px solid rgba(148, 163, 184, 0.25); }
.status-pill-v2[data-variant="success"] { background: rgba(16, 185, 129, 0.14); color: #059669; border: 1px solid rgba(16, 185, 129, 0.25); }
.status-pill-v2[data-variant="warning"] { background: rgba(245, 158, 11, 0.14); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.25); }
.status-pill-v2[data-variant="error"]   { background: rgba(239, 68, 68, 0.14); color: #dc2626; border: 1px solid rgba(239, 68, 68, 0.25); }
.status-pill-v2[data-variant="info"]    { background: rgba(79, 70, 229, 0.12); color: #4f46e5; border: 1px solid rgba(79, 70, 229, 0.25); }
.status-pill-v2[data-variant="sales"]   { background: rgba(139, 92, 246, 0.14); color: #7c3aed; border: 1px solid rgba(139, 92, 246, 0.25); }

/* Buttons */
.fleet-export-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    height: 38px;
    padding: 0 16px;
    border-radius: 10px;
    font-family: 'Outfit', sans-serif;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.25s;
    border: 1px solid #10b981;
    background: rgba(16, 185, 129, 0.08);
    color: #059669;
    box-sizing: border-box;
}
.fleet-export-btn:hover:not(:disabled) {
    background: #10b981;
    color: #fff;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(16, 185, 129, 0.25);
}

.modern-refresh-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    height: 38px;
    padding: 0 16px;
    background: rgba(79, 70, 229, 0.08);
    color: #4f46e5;
    border: 1px solid rgba(79, 70, 229, 0.2);
    border-radius: 10px;
    font-family: 'Outfit', sans-serif;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.25s;
    box-sizing: border-box;
}
.modern-refresh-btn:hover {
    background: #4f46e5;
    color: #ffffff;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(79, 70, 229, 0.25);
}

.modern-pdf-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    height: 38px;
    padding: 0 16px;
    background: rgba(220, 38, 38, 0.08);
    color: #dc2626;
    border: 1px solid rgba(220, 38, 38, 0.2);
    border-radius: 10px;
    font-family: 'Outfit', sans-serif;
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.25s;
    box-sizing: border-box;
}
.modern-pdf-btn:hover {
    background: #dc2626;
    color: #ffffff;
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(220, 38, 38, 0.25);
}

.mono {
    font-family: 'Outfit', sans-serif;
    letter-spacing: -0.02em;
}

/* Loading */
.fleet-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 20px;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(24px);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.6);
}
.fleet-spinner {
    width: 48px;
    height: 48px;
    border: 3px solid rgba(79, 70, 229, 0.15);
    border-top-color: #4f46e5;
    border-radius: 50%;
    animation: fleet-spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
@keyframes fleet-spin { to { transform: rotate(360deg); } }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDateDisplay = (dateStr) => {
    if (!dateStr || dateStr === '-') return '—';
    try {
        const d = dateStr.includes('T') ? parseISO(dateStr) : new Date(dateStr);
        if (!isValid(d)) return dateStr;
        return format(d, 'dd MMM yyyy');
    } catch {
        return dateStr;
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
            style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: '2px 4px',
                color: '#94a3b8',
                verticalAlign: 'middle',
                display: 'inline-flex',
                alignItems: 'center'
            }}
        >
            {copied ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
        </button>
    );
};

const getIeBadge = (ie) => {
    const s = String(ie || '').trim().toLowerCase();
    if (s === 'import') return <span className="status-pill-v2" data-variant="info">Import</span>;
    if (s === 'export') return <span className="status-pill-v2" data-variant="success">Export</span>;
    if (s === 'sales') return <span className="status-pill-v2" data-variant="sales">Sales</span>;
    return <span className="status-pill-v2" data-variant="neutral">{ie || '—'}</span>;
};

// ─── Main Component ────────────────────────────────────────────────────────────

const TransportMonitoringReport = ({
    filterType = 'month',
    selectedMonth = new Date().getMonth().toString(),
    selectedYear = new Date().getFullYear().toString(),
    selectedQuarter = '1',
    selectedDay = new Date().toISOString().slice(0, 10),
    dateRange = null,
    selectedFinancialYear = '26-27'
}) => {
    const { branches: contextBranches } = useContext(BranchContext) || {};

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pendingList, setPendingList] = useState([]);
    const [closedList, setClosedList] = useState([]);
    const [activeList, setActiveList] = useState([]);
    const [retryCount, setRetryCount] = useState(0);

    // Active View Mode: 'pending' (Live Backlog) or 'closed' (Closed Dispatches)
    const [activeTab, setActiveTab] = useState('pending');

    // Filters for Pending view
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('ALL');
    const [selectedSize, setSelectedSize] = useState('ALL'); // ALL, 20, 40
    const [selectedDoStatus, setSelectedDoStatus] = useState('ALL'); // ALL, EXPIRED, EXPIRING_SOON, VALID, NO_DO

    // Filters for Closed view
    const [closedSearchTerm, setClosedSearchTerm] = useState('');
    const [closedBranch, setClosedBranch] = useState('ALL');
    const [closedIe, setClosedIe] = useState('ALL'); // ALL, Import, Export, Sales
    const [closedType, setClosedType] = useState('ALL');

    // Table pagination & sorting
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [sortConfig, setSortConfig] = useState({ key: 'pendingCount', direction: 'desc' });
    const [closedSortConfig, setClosedSortConfig] = useState({ key: 'tr_no', direction: 'desc' });
    const [isExportingExcel, setIsExportingExcel] = useState(false);

    // Compute start/end dates from the current filter period
    const { startDate, endDate } = useMemo(() => {
        return getTransportDates(
            filterType,
            selectedDay,
            parseInt(selectedYear),
            parseInt(selectedMonth),
            parseInt(selectedQuarter),
            dateRange || {}
        );
    }, [filterType, selectedDay, selectedYear, selectedMonth, selectedQuarter, dateRange]);

    // Determine if the selected period is "today"
    const todayStr = new Date().toISOString().slice(0, 10);
    const isToday = !startDate || (startDate === todayStr && (!endDate || endDate === todayStr));

    // Auto-select the most relevant tab based on date selection
    useEffect(() => {
        if (!isToday) {
            setActiveTab('closed');
        } else {
            setActiveTab('pending');
        }
        setCurrentPage(1);
    }, [isToday, startDate, endDate]);

    // Load Data
    const loadReportData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const targetDateStr = startDate || todayStr;
            const isSingle = !startDate || startDate === endDate;

            // 1. Fetch dispatch data (contains closedLRs and activeLRs for the target period)
            const dispatchPromise = isSingle
                ? axios.get(`${TRANSPORT_BASE}/api/vehicle-dsr/dispatch`, {
                    params: { date: targetDateStr },
                    headers: TRANSPORT_HEADERS,
                    withCredentials: true
                }).catch(() => axios.get(`${TRANSPORT_BASE}/api/vehicle-dsr/dispatch-range`, {
                    params: { startDate: targetDateStr, endDate: targetDateStr, limit: 999999 },
                    headers: TRANSPORT_HEADERS,
                    withCredentials: true
                }))
                : axios.get(`${TRANSPORT_BASE}/api/vehicle-dsr/dispatch-range`, {
                    params: { startDate, endDate, limit: 999999 },
                    headers: TRANSPORT_HEADERS,
                    withCredentials: true
                });

            // 2. Fetch live pending LRs queue
            const pendingPromise = axios.get(`${TRANSPORT_BASE}/api/vehicle-dsr/pending-lrs`, {
                headers: TRANSPORT_HEADERS,
                withCredentials: true
            }).catch(() => ({ data: { data: [] } }));

            const [dispatchRes, pendingRes] = await Promise.allSettled([dispatchPromise, pendingPromise]);

            let pRecords = [];
            let cRecords = [];
            let aRecords = [];

            // Process Pending records
            if (pendingRes.status === 'fulfilled' && pendingRes.value.data?.success && Array.isArray(pendingRes.value.data.data)) {
                pRecords = pendingRes.value.data.data;
            } else if (pendingRes.status === 'fulfilled' && Array.isArray(pendingRes.value.data)) {
                pRecords = pendingRes.value.data;
            }

            // Process Dispatch records (Closed and Active)
            if (dispatchRes.status === 'fulfilled' && dispatchRes.value.data) {
                const d = dispatchRes.value.data;
                if (Array.isArray(d.closedLRs)) cRecords = d.closedLRs;
                if (Array.isArray(d.activeLRs)) aRecords = d.activeLRs;
                // If historical mode and snapshot exists, fallback for pending
                if (!isToday && Array.isArray(d.pendingLRSnapshot) && d.pendingLRSnapshot.length > 0) {
                    pRecords = d.pendingLRSnapshot;
                }
            }

            setPendingList(pRecords);
            setClosedList(cRecords);
            setActiveList(aRecords);
        } catch (err) {
            console.error("Error fetching transport data:", err);
            setError(err.response?.data?.message || err.message || "Failed to load transport dispatch data.");
        } finally {
            setLoading(false);
        }
    }, [isToday, startDate, endDate, todayStr]);

    useEffect(() => {
        loadReportData();
    }, [loadReportData, retryCount]);

    // ─── Branch & Type Discovery ───────────────────────────────────────────────

    const availableBranches = useMemo(() => {
        const set = new Set();
        (contextBranches || []).forEach(b => {
            const code = b.branch_name || b.branch_code || b.name;
            if (code && String(code).trim()) set.add(String(code).trim());
        });
        [...pendingList, ...closedList, ...activeList].forEach(item => {
            const b = item.branch || item.branch_name || item.branch_code;
            if (b && String(b).trim()) set.add(String(b).trim());
        });
        return Array.from(set).sort();
    }, [contextBranches, pendingList, closedList, activeList]);

    const availableClosedTypes = useMemo(() => {
        const set = new Set();
        closedList.forEach(item => {
            const t = item.type_of_vehicle || item.container_type;
            if (t && String(t).trim()) set.add(String(t).trim());
        });
        return Array.from(set).sort();
    }, [closedList]);

    // ─── Metrics for Pending LRs ───────────────────────────────────────────────

    const pendingStats = useMemo(() => {
        const totalPRs = pendingList.length;
        let totalPendingLrs = 0;
        let totalAllContainers = 0;
        let totalCreatedLRs = 0;
        let expiredDoCount = 0;
        let expiringSoonDoCount = 0;
        let validDoCount = 0;
        let noDoCount = 0;

        let size20Count = 0;
        let size40Count = 0;
        let sizeOtherCount = 0;

        const branchAgg = {};
        const today = new Date();

        pendingList.forEach(item => {
            const pCount = Number(item.pendingCount) || 0;
            const tCount = Number(item.totalContainers) || 0;
            const lCount = Number(item.lrCreatedContainers) || 0;
            const br = String(item.branch || 'Unassigned').trim();
            const typeStr = String(item.container_type || '').toLowerCase();

            totalPendingLrs += pCount;
            totalAllContainers += tCount;
            totalCreatedLRs += lCount;

            // Size categorization
            const is20 = typeStr.includes('20');
            const is40 = typeStr.includes('40');
            const is45 = typeStr.includes('45');

            if (is20) size20Count += pCount;
            else if (is40) size40Count += pCount;
            else if (is45) sizeOtherCount += pCount;
            else sizeOtherCount += pCount;

            // DO Validity categorization
            let doStatus = 'NO_DO';
            if (item.do_validity && item.do_validity !== '-') {
                try {
                    const d = item.do_validity.includes('T') ? parseISO(item.do_validity) : new Date(item.do_validity);
                    if (isValid(d)) {
                        const diff = differenceInDays(d, today);
                        if (diff < 0) {
                            expiredDoCount += 1;
                            doStatus = 'EXPIRED';
                        } else if (diff <= 3) {
                            expiringSoonDoCount += 1;
                            doStatus = 'EXPIRING_SOON';
                        } else {
                            validDoCount += 1;
                            doStatus = 'VALID';
                        }
                    } else {
                        noDoCount += 1;
                    }
                } catch {
                    noDoCount += 1;
                }
            } else {
                noDoCount += 1;
            }

            // Branch aggregation
            if (!branchAgg[br]) {
                branchAgg[br] = {
                    branch: br,
                    pendingLrs: 0,
                    prCount: 0,
                    totalContainers: 0,
                    createdLRs: 0,
                    size20: 0,
                    size40: 0,
                    sizeOther: 0,
                    expiredDo: 0,
                    expiringSoonDo: 0
                };
            }
            branchAgg[br].pendingLrs += pCount;
            branchAgg[br].prCount += 1;
            branchAgg[br].totalContainers += tCount;
            branchAgg[br].createdLRs += lCount;
            if (is20) branchAgg[br].size20 += pCount;
            else if (is40) branchAgg[br].size40 += pCount;
            else branchAgg[br].sizeOther += pCount;

            if (doStatus === 'EXPIRED') branchAgg[br].expiredDo += 1;
            if (doStatus === 'EXPIRING_SOON') branchAgg[br].expiringSoonDo += 1;
        });

        const fulfillmentRate = totalAllContainers > 0 ? Math.round((totalCreatedLRs / totalAllContainers) * 100) : 0;
        const totalDoAlerts = expiredDoCount + expiringSoonDoCount;

        const size20Pct = totalPendingLrs > 0 ? Math.round((size20Count / totalPendingLrs) * 100) : 0;
        const size40Pct = totalPendingLrs > 0 ? Math.round((size40Count / totalPendingLrs) * 100) : 0;
        const sizeOtherPct = totalPendingLrs > 0 ? Math.max(0, 100 - size20Pct - size40Pct) : 0;

        const branchList = Object.values(branchAgg)
            .map(b => ({
                ...b,
                sharePct: totalPendingLrs > 0 ? Math.round((b.pendingLrs / totalPendingLrs) * 1000) / 10 : 0
            }))
            .sort((a, b) => b.pendingLrs - a.pendingLrs);

        return {
            totalPRs,
            totalPendingLrs,
            totalAllContainers,
            totalCreatedLRs,
            fulfillmentRate,
            totalDoAlerts,
            expiredDoCount,
            expiringSoonDoCount,
            validDoCount,
            noDoCount,
            size20Count,
            size40Count,
            sizeOtherCount,
            size20Pct,
            size40Pct,
            sizeOtherPct,
            branchList
        };
    }, [pendingList]);

    // ─── Metrics for Closed Dispatches ─────────────────────────────────────────

    const closedStats = useMemo(() => {
        const totalClosed = closedList.length;
        let importCount = 0;
        let exportCount = 0;
        let salesCount = 0;
        let otherIeCount = 0;

        let size20 = 0;
        let size40 = 0;
        let sizeEicher = 0;
        let sizeOther = 0;

        const branchMap = {};

        closedList.forEach(item => {
            const ie = String(item.import_export || '').toLowerCase().trim();
            if (ie === 'import') importCount += 1;
            else if (ie === 'export') exportCount += 1;
            else if (ie === 'sales') salesCount += 1;
            else otherIeCount += 1;

            const t = String(item.type_of_vehicle || '').toLowerCase();
            if (t.includes('20')) size20 += 1;
            else if (t.includes('40')) size40 += 1;
            else if (t.includes('eicher')) sizeEicher += 1;
            else sizeOther += 1;

            const br = String(item.branch || 'Unassigned').trim();
            if (!branchMap[br]) {
                branchMap[br] = { branch: br, count: 0, importCount: 0, exportCount: 0, salesCount: 0 };
            }
            branchMap[br].count += 1;
            if (ie === 'import') branchMap[br].importCount += 1;
            else if (ie === 'export') branchMap[br].exportCount += 1;
            else if (ie === 'sales') branchMap[br].salesCount += 1;
        });

        const branchList = Object.values(branchMap)
            .map(b => ({
                ...b,
                sharePct: totalClosed > 0 ? Math.round((b.count / totalClosed) * 1000) / 10 : 0
            }))
            .sort((a, b) => b.count - a.count);

        return {
            totalClosed,
            importCount,
            exportCount,
            salesCount,
            otherIeCount,
            size20,
            size40,
            sizeEicher,
            sizeOther,
            branchList
        };
    }, [closedList]);

    // ─── Filtered Lists ────────────────────────────────────────────────────────

    const filteredPendingItems = useMemo(() => {
        let list = pendingList || [];
        const today = new Date();

        if (selectedBranch !== 'ALL') {
            const q = selectedBranch.trim().toLowerCase();
            list = list.filter(item => {
                const b = String(item.branch || item.branch_name || '').trim().toLowerCase();
                return b === q || b.includes(q);
            });
        }

        if (selectedSize !== 'ALL') {
            list = list.filter(item => {
                const t = String(item.container_type || '').toLowerCase();
                if (selectedSize === '20') return t.includes('20');
                if (selectedSize === '40') return t.includes('40');
                return true;
            });
        }

        if (selectedDoStatus !== 'ALL') {
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
                return pr.includes(q) || party.includes(q) || br.includes(q) || ct.includes(q);
            });
        }

        return list;
    }, [pendingList, selectedBranch, selectedSize, selectedDoStatus, searchTerm]);

    const filteredClosedItems = useMemo(() => {
        let list = closedList || [];

        if (closedBranch !== 'ALL') {
            const q = closedBranch.trim().toLowerCase();
            list = list.filter(item => {
                const b = String(item.branch || '').trim().toLowerCase();
                return b === q || b.includes(q);
            });
        }

        if (closedIe !== 'ALL') {
            const q = closedIe.trim().toLowerCase();
            list = list.filter(item => {
                const ie = String(item.import_export || '').trim().toLowerCase();
                return ie === q;
            });
        }

        if (closedType !== 'ALL') {
            const q = closedType.trim().toLowerCase();
            list = list.filter(item => {
                const t = String(item.type_of_vehicle || item.container_type || '').trim().toLowerCase();
                return t === q || t.includes(q);
            });
        }

        if (closedSearchTerm.trim()) {
            const q = closedSearchTerm.toLowerCase();
            list = list.filter(item => {
                const tr = String(item.tr_no || '').toLowerCase();
                const veh = String(item.vehicle_no || '').toLowerCase();
                const cont = String(item.container_number || '').toLowerCase();
                const seal = String(item.seal_no || '').toLowerCase();
                const cnee = String(item.consignee || '').toLowerCase();
                const cnor = String(item.consignor || '').toLowerCase();
                const br = String(item.branch || '').toLowerCase();
                const type = String(item.type_of_vehicle || '').toLowerCase();
                return tr.includes(q) || veh.includes(q) || cont.includes(q) || seal.includes(q) || cnee.includes(q) || cnor.includes(q) || br.includes(q) || type.includes(q);
            });
        }

        return list;
    }, [closedList, closedBranch, closedIe, closedType, closedSearchTerm]);

    // ─── Sorting & Pagination ──────────────────────────────────────────────────

    const sortedPendingItems = useMemo(() => {
        return [...filteredPendingItems].sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            }

            valA = String(valA || '').toLowerCase();
            valB = String(valB || '').toLowerCase();
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredPendingItems, sortConfig]);

    const sortedClosedItems = useMemo(() => {
        return [...filteredClosedItems].sort((a, b) => {
            let valA = a[closedSortConfig.key];
            let valB = b[closedSortConfig.key];

            valA = String(valA || '').toLowerCase();
            valB = String(valB || '').toLowerCase();
            if (valA < valB) return closedSortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return closedSortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredClosedItems, closedSortConfig]);

    const currentList = activeTab === 'pending' ? sortedPendingItems : sortedClosedItems;

    const totalPages = useMemo(() => {
        if (pageSize === 'ALL') return 1;
        return Math.ceil(currentList.length / Number(pageSize)) || 1;
    }, [currentList, pageSize]);

    const paginatedItems = useMemo(() => {
        if (pageSize === 'ALL') return currentList;
        const size = Number(pageSize);
        const start = (currentPage - 1) * size;
        return currentList.slice(start, start + size);
    }, [currentList, currentPage, pageSize]);

    const handleSort = (key) => {
        if (activeTab === 'pending') {
            let direction = 'asc';
            if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
            setSortConfig({ key, direction });
        } else {
            let direction = 'asc';
            if (closedSortConfig.key === key && closedSortConfig.direction === 'asc') direction = 'desc';
            setClosedSortConfig({ key, direction });
        }
    };

    // ─── Export Handlers ───────────────────────────────────────────────────────

    const handleExportExcel = async () => {
        setIsExportingExcel(true);
        try {
            const ExcelJS = (await import('exceljs')).default;
            const workbook = new ExcelJS.Workbook();

            if (activeTab === 'pending') {
                const ws = workbook.addWorksheet('Pending LRs');
                ws.addRow(['ALVISION EXIM — PENDING LRS QUEUE & MONITORING']);
                ws.addRow([`Exported on: ${format(new Date(), 'dd MMM yyyy, HH:mm')} | Total Records: ${filteredPendingItems.length}`]);
                ws.addRow([]);

                ws.getRow(1).font = { bold: true, size: 14, color: { argb: 'FF1E293B' } };
                ws.getRow(2).font = { italic: true, size: 10, color: { argb: 'FF64748B' } };

                const headers = [
                    'S.No',
                    'PR Number',
                    'Customer / Invoice Party',
                    'Branch',
                    'Container Type / Size',
                    'Total Ordered',
                    'LRs Created',
                    'Pending LRs',
                    'DO Validity',
                    'DO Status'
                ];

                const headerRow = ws.addRow(headers);
                headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

                const today = new Date();
                filteredPendingItems.forEach((item, idx) => {
                    let doStatusText = 'No DO Date';
                    if (item.do_validity && item.do_validity !== '-') {
                        try {
                            const d = item.do_validity.includes('T') ? parseISO(item.do_validity) : new Date(item.do_validity);
                            if (isValid(d)) {
                                const diff = differenceInDays(d, today);
                                if (diff < 0) doStatusText = `Expired (${Math.abs(diff)}d ago)`;
                                else if (diff <= 3) doStatusText = `Expiring Soon (${diff}d left)`;
                                else doStatusText = 'Active / Valid';
                            }
                        } catch { }
                    }

                    ws.addRow([
                        idx + 1,
                        item.pr_no || '—',
                        item.invoice_party || '—',
                        item.branch || '—',
                        item.container_type || '—',
                        Number(item.totalContainers) || 0,
                        Number(item.lrCreatedContainers) || 0,
                        Number(item.pendingCount) || 0,
                        formatDateDisplay(item.do_validity),
                        doStatusText
                    ]);
                });

                ws.columns.forEach(col => {
                    let max = 0;
                    col.eachCell({ includeEmpty: true }, cell => {
                        const s = cell.value ? String(cell.value) : '';
                        if (s.length > max) max = s.length;
                    });
                    ws.getColumn(col.number).width = Math.min(Math.max(max + 4, 12), 45);
                });
            } else {
                const ws = workbook.addWorksheet('Closed Dispatches');
                ws.addRow(['ALVISION EXIM — CLOSED DISPATCHES & DELIVERIES']);
                ws.addRow([`Period: ${startDate || 'Live'} to ${endDate || 'Live'} | Exported: ${format(new Date(), 'dd MMM yyyy, HH:mm')} | Total Records: ${filteredClosedItems.length}`]);
                ws.addRow([]);

                ws.getRow(1).font = { bold: true, size: 14, color: { argb: 'FF1E293B' } };
                ws.getRow(2).font = { italic: true, size: 10, color: { argb: 'FF64748B' } };

                const headers = [
                    'S.No',
                    'I/E',
                    'Branch',
                    'Type',
                    'TR No',
                    'Vehicle',
                    'Container No',
                    'Seal No',
                    'Consignee',
                    'Consignor',
                    'Remark'
                ];

                const headerRow = ws.addRow(headers);
                headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } };

                filteredClosedItems.forEach((item, idx) => {
                    ws.addRow([
                        idx + 1,
                        item.import_export || '—',
                        item.branch || '—',
                        item.type_of_vehicle || item.container_type || '—',
                        item.tr_no || '—',
                        item.vehicle_no || '—',
                        item.container_number || '—',
                        item.seal_no || '—',
                        item.consignee || '—',
                        item.consignor || '—',
                        item.remarks || item.remark || item.otherStatusText || '—'
                    ]);
                });

                ws.columns.forEach(col => {
                    let max = 0;
                    col.eachCell({ includeEmpty: true }, cell => {
                        const s = cell.value ? String(cell.value) : '';
                        if (s.length > max) max = s.length;
                    });
                    ws.getColumn(col.number).width = Math.min(Math.max(max + 4, 12), 45);
                });
            }

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${activeTab === 'pending' ? 'Pending_LRs' : 'Closed_Dispatches'}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Failed to export Excel:", err);
            alert("Failed to export Excel workbook. Please try again.");
        } finally {
            setIsExportingExcel(false);
        }
    };

    const handleExportPDF = () => {
        try {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

            if (activeTab === 'pending') {
                doc.setFontSize(14);
                doc.text('ALVISION EXIM — PENDING LRS QUEUE & MONITORING', 40, 40);
                doc.setFontSize(9);
                doc.text(`Total Pending LRs: ${pendingStats.totalPendingLrs} across ${pendingStats.totalPRs} PRs | Exported: ${format(new Date(), 'dd MMM yyyy')}`, 40, 56);

                const tableHeaders = [['#', 'PR Number', 'Customer / Party', 'Branch', 'Container Type', 'Ordered', 'Created', 'Pending LRs', 'DO Validity']];
                const tableData = sortedPendingItems.map((item, i) => [
                    i + 1,
                    item.pr_no || '—',
                    item.invoice_party || '—',
                    item.branch || '—',
                    item.container_type || '—',
                    item.totalContainers || 0,
                    item.lrCreatedContainers || 0,
                    item.pendingCount || 0,
                    formatDateDisplay(item.do_validity)
                ]);

                doc.autoTable({
                    head: tableHeaders,
                    body: tableData,
                    startY: 68,
                    styles: { fontSize: 8.5, cellPadding: 5 },
                    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [248, 250, 252] }
                });

                doc.save(`Pending_LRs_Report_${format(new Date(), 'yyyyMMdd')}.pdf`);
            } else {
                doc.setFontSize(14);
                doc.text('ALVISION EXIM — CLOSED DISPATCHES & DELIVERIES', 40, 40);
                doc.setFontSize(9);
                doc.text(`Period: ${startDate || 'Live'} to ${endDate || 'Live'} | Total Closed: ${filteredClosedItems.length} | Exported: ${format(new Date(), 'dd MMM yyyy')}`, 40, 56);

                const tableHeaders = [['#', 'I/E', 'Branch', 'Type', 'TR No', 'Vehicle', 'Container No', 'Seal No', 'Consignee', 'Consignor', 'Remark']];
                const tableData = sortedClosedItems.map((item, i) => [
                    i + 1,
                    item.import_export || '—',
                    item.branch || '—',
                    item.type_of_vehicle || item.container_type || '—',
                    item.tr_no || '—',
                    item.vehicle_no || '—',
                    item.container_number || '—',
                    item.seal_no || '—',
                    item.consignee || '—',
                    item.consignor || '—',
                    item.remarks || item.remark || item.otherStatusText || '—'
                ]);

                doc.autoTable({
                    head: tableHeaders,
                    body: tableData,
                    startY: 68,
                    styles: { fontSize: 8, cellPadding: 4 },
                    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [248, 250, 252] }
                });

                doc.save(`Closed_Dispatches_Report_${format(new Date(), 'yyyyMMdd')}.pdf`);
            }
        } catch (err) {
            console.error("Failed to export PDF:", err);
            alert("Could not generate PDF.");
        }
    };

    const renderDoValidityBadge = (validityStr) => {
        if (!validityStr || validityStr === '-') {
            return <span className="status-pill-v2" data-variant="neutral">No DO Date</span>;
        }
        try {
            const d = validityStr.includes('T') ? parseISO(validityStr) : new Date(validityStr);
            if (!isValid(d)) return <span>{validityStr}</span>;

            const diff = differenceInDays(d, new Date());
            const formatted = format(d, 'dd MMM yyyy');

            if (diff < 0) {
                return (
                    <span className="status-pill-v2" data-variant="error" title={`DO Expired ${Math.abs(diff)} day(s) ago`}>
                        🔴 Expired ({Math.abs(diff)}d ago)
                    </span>
                );
            }
            if (diff <= 3) {
                return (
                    <span className="status-pill-v2" data-variant="warning" title={`DO Expires in ${diff} day(s)`}>
                        🟡 {diff === 0 ? 'Expires Today' : `${diff}d left`} ({formatted})
                    </span>
                );
            }
            return (
                <span className="status-pill-v2" data-variant="success" title="DO is Active">
                    🟢 Active ({formatted})
                </span>
            );
        } catch {
            return <span>{validityStr}</span>;
        }
    };

    // ─── Render States ──────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="fleet-loading">
                <style>{STYLES}</style>
                <div className="fleet-spinner" />
                <p style={{ marginTop: '18px', color: '#475569', fontWeight: 700, fontFamily: "'Outfit', sans-serif", fontSize: '15px' }}>
                    Loading Transport Monitoring Data...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '36px', background: 'rgba(254, 242, 242, 0.9)', borderRadius: '20px', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>
                <style>{STYLES}</style>
                <AlertTriangle size={36} color="#dc2626" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ color: '#991b1b', margin: '0 0 8px 0', fontFamily: "'Outfit', sans-serif" }}>Unable to load Transport Data</h3>
                <p style={{ color: '#b91c1c', margin: '0 0 16px 0', fontSize: '14px' }}>{error}</p>
                <button className="modern-refresh-btn" onClick={() => setRetryCount(c => c + 1)}>
                    <RefreshCw size={14} /> Retry Loading
                </button>
            </div>
        );
    }

    return (
        <div className="fleet-root">
            <style>{STYLES}</style>

            {/* ── 1. Top Header ───────────────────────────────────────────────── */}
            <div className="fleet-header-glass">
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: activeTab === 'closed' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: activeTab === 'closed' ? '0 8px 20px rgba(16, 185, 129, 0.25)' : '0 8px 20px rgba(79, 70, 229, 0.25)', flexShrink: 0 }}>
                        {activeTab === 'closed' ? <CheckSquare size={24} color="#ffffff" /> : <Clock size={24} color="#ffffff" />}
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h2 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '20px', color: '#0f172a', lineHeight: 1.2 }}>
                                {activeTab === 'closed' ? 'Closed Dispatches & Trip Monitoring' : 'Pending LRs & Dispatch Monitoring'}
                            </h2>
                            {/* View Switcher Subtabs */}
                            <div className="fleet-subtabs">
                                <button
                                    className="fleet-subtab-btn"
                                    data-active={String(activeTab === 'pending')}
                                    onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
                                >
                                    <Clock size={13} />
                                    Pending LRs ({pendingList.length})
                                </button>
                                <button
                                    className="fleet-subtab-btn"
                                    data-active={String(activeTab === 'closed')}
                                    onClick={() => { setActiveTab('closed'); setCurrentPage(1); }}
                                >
                                    <CheckSquare size={13} />
                                    Closed Dispatches ({closedList.length})
                                </button>
                            </div>
                        </div>

                        <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600, display: 'inline-block', marginTop: '4px' }}>
                            {activeTab === 'closed' ? 'Completed delivery runs & vehicle dispatches' : 'Pending LRs Pickup Queue • DO Urgency Alerts • Container Size Split'}
                            {startDate && endDate ? (
                                <span style={{ marginLeft: '8px', background: 'rgba(79,70,229,0.1)', color: '#4f46e5', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '11px', verticalAlign: 'middle' }}>
                                    📅 {startDate} → {endDate}
                                </span>
                            ) : (
                                <span style={{ marginLeft: '8px', background: 'rgba(16,185,129,0.1)', color: '#059669', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '11px', verticalAlign: 'middle' }}>
                                    🟢 Live Queue
                                </span>
                            )}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        className="fleet-export-btn"
                        onClick={handleExportExcel}
                        disabled={isExportingExcel || currentList.length === 0}
                    >
                        <FileText size={14} /> {isExportingExcel ? 'Exporting...' : 'Export XLSX'}
                    </button>
                    <button
                        className="modern-pdf-btn"
                        onClick={handleExportPDF}
                        disabled={currentList.length === 0}
                    >
                        <Download size={14} /> Export PDF
                    </button>
                    <button
                        className="modern-refresh-btn"
                        onClick={() => setRetryCount(c => c + 1)}
                        title="Refresh Data"
                    >
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════════ */}
            {/* VIEW A: CLOSED DISPATCHES (FOR PREVIOUS DATES / SELECTION)            */}
            {/* ══════════════════════════════════════════════════════════════════════ */}

            {activeTab === 'closed' && (
                <>
                    {/* ── 2A. Hero KPI Cards for Closed Dispatches ──────────────────── */}
                    <div className="fleet-hero-grid">
                        {/* 1. TOTAL CLOSED DELIVERIES */}
                        <div
                            className="fleet-card"
                            style={{
                                padding: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                minHeight: '250px',
                                '--fc-bg': 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(240, 253, 244, 0.9) 100%)',
                                '--fc-border': '1px solid rgba(16, 185, 129, 0.25)',
                                '--fc-accent': '#10b981'
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '28px' }}>
                                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '13px', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                                        Closed Dispatches
                                    </div>
                                    <span className="status-pill-v2" data-variant="success">
                                        ✅ {closedStats.totalClosed} Total
                                    </span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                                    Completed transport trips in selected period
                                </div>

                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '14px', marginBottom: '14px' }}>
                                    <span style={{ fontSize: '42px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }} className="mono">
                                        {closedStats.totalClosed}
                                    </span>
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#059669' }}>
                                        Dispatches Closed
                                    </span>
                                </div>
                            </div>

                            {/* Mini Branch Breakdown Bar */}
                            <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(226, 232, 240, 0.8)', marginTop: 'auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>
                                    <span>Top Stations</span>
                                    <span>{closedStats.branchList.length} Branches</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {closedStats.branchList.slice(0, 2).map((b, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                                            <span style={{ fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                                                {b.branch}
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '60px', height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${b.sharePct}%`, height: '100%', background: idx === 0 ? '#10b981' : '#0ea5e9' }} />
                                                </div>
                                                <span style={{ fontWeight: 800, color: '#0f172a', minWidth: '34px', textAlign: 'right' }} className="mono">
                                                    {b.count}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 2. IMPORT / EXPORT / SALES SPLIT */}
                        <div
                            className="fleet-card"
                            style={{
                                padding: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                minHeight: '250px',
                                '--fc-bg': 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 247, 255, 0.9) 100%)',
                                '--fc-border': '1px solid rgba(79, 70, 229, 0.2)',
                                '--fc-accent': '#4f46e5'
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '28px' }}>
                                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '13px', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                                        Operation Mode Split
                                    </div>
                                    <span className="status-pill-v2" data-variant="info">
                                        📦 Breakdown
                                    </span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                                    Import vs Export vs Sales movement
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '16px' }}>
                                    <div
                                        onClick={() => setClosedIe(prev => prev === 'Import' ? 'ALL' : 'Import')}
                                        style={{
                                            padding: '10px 8px',
                                            borderRadius: '10px',
                                            background: closedIe === 'Import' ? 'rgba(79, 70, 229, 0.2)' : 'rgba(79, 70, 229, 0.06)',
                                            border: '1px solid rgba(79, 70, 229, 0.2)',
                                            textAlign: 'center',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5' }}>Import</div>
                                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }} className="mono">{closedStats.importCount}</div>
                                    </div>

                                    <div
                                        onClick={() => setClosedIe(prev => prev === 'Export' ? 'ALL' : 'Export')}
                                        style={{
                                            padding: '10px 8px',
                                            borderRadius: '10px',
                                            background: closedIe === 'Export' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.06)',
                                            border: '1px solid rgba(16, 185, 129, 0.2)',
                                            textAlign: 'center',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>Export</div>
                                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }} className="mono">{closedStats.exportCount}</div>
                                    </div>

                                    <div
                                        onClick={() => setClosedIe(prev => prev === 'Sales' ? 'ALL' : 'Sales')}
                                        style={{
                                            padding: '10px 8px',
                                            borderRadius: '10px',
                                            background: closedIe === 'Sales' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.06)',
                                            border: '1px solid rgba(139, 92, 246, 0.2)',
                                            textAlign: 'center',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#7c3aed' }}>Sales</div>
                                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }} className="mono">{closedStats.salesCount}</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(226, 232, 240, 0.8)', marginTop: 'auto' }}>
                                <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
                                    Click any card above to filter table by operation mode
                                </div>
                            </div>
                        </div>

                        {/* 3. VEHICLE TYPE & SIZE BIFURCATION */}
                        <div
                            className="fleet-card"
                            style={{
                                padding: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                minHeight: '250px',
                                '--fc-bg': 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)',
                                '--fc-border': '1px solid rgba(226, 232, 240, 0.8)',
                                '--fc-accent': '#06b6d4'
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '28px' }}>
                                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '13px', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                                        Vehicle / Size Split
                                    </div>
                                    <span className="status-pill-v2" data-variant="neutral">
                                        🚚 {closedStats.totalClosed} Trips
                                    </span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                                    Trailer, truck & Eicher vehicle distribution
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px' }}>
                                    <div style={{ padding: '8px 10px', background: 'rgba(241, 245, 249, 0.8)', borderRadius: '10px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>20 FT Vehicles</span>
                                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }} className="mono">{closedStats.size20}</div>
                                    </div>
                                    <div style={{ padding: '8px 10px', background: 'rgba(241, 245, 249, 0.8)', borderRadius: '10px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>40 FT Vehicles</span>
                                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }} className="mono">{closedStats.size40}</div>
                                    </div>
                                    <div style={{ padding: '8px 10px', background: 'rgba(241, 245, 249, 0.8)', borderRadius: '10px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Eicher / LCV</span>
                                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }} className="mono">{closedStats.sizeEicher}</div>
                                    </div>
                                    <div style={{ padding: '8px 10px', background: 'rgba(241, 245, 249, 0.8)', borderRadius: '10px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Other Trucks</span>
                                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }} className="mono">{closedStats.sizeOther}</div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(226, 232, 240, 0.8)', marginTop: 'auto' }}>
                                <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
                                    Fleet distribution for completed deliveries
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── 3A. Closed Dispatches Detailed Table ────────────────────────── */}
                    <div className="fleet-table-wrap">
                        {/* Filter Toolbar */}
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(226, 232, 240, 0.8)', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255, 255, 255, 0.7)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <CheckSquare size={18} color="#10b981" />
                                    <h3 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '16px', color: '#0f172a' }}>
                                        Closed Dispatches
                                    </h3>
                                    <span className="status-pill-v2" data-variant="success">
                                        {filteredClosedItems.length} Total
                                    </span>
                                </div>

                                {/* Search Input */}
                                <div style={{ position: 'relative', width: '320px' }}>
                                    <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        type="text"
                                        placeholder="Search Closed (TR No, Vehicle, Container, Consignee)..."
                                        value={closedSearchTerm}
                                        onChange={e => { setClosedSearchTerm(e.target.value); setCurrentPage(1); }}
                                        style={{
                                            width: '100%',
                                            height: '36px',
                                            padding: '0 12px 0 34px',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(226, 232, 240, 0.8)',
                                            background: 'rgba(255, 255, 255, 0.95)',
                                            fontSize: '13px',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    {closedSearchTerm && (
                                        <X
                                            size={14}
                                            color="#94a3b8"
                                            onClick={() => setClosedSearchTerm('')}
                                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Dropdown Filters */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Branch:</span>
                                    <select
                                        value={closedBranch}
                                        onChange={e => { setClosedBranch(e.target.value); setCurrentPage(1); }}
                                        style={{ height: '32px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, background: '#fff', outline: 'none' }}
                                    >
                                        <option value="ALL">ALL Branches</option>
                                        {availableBranches.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Mode (I/E):</span>
                                    <select
                                        value={closedIe}
                                        onChange={e => { setClosedIe(e.target.value); setCurrentPage(1); }}
                                        style={{ height: '32px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, background: '#fff', outline: 'none' }}
                                    >
                                        <option value="ALL">ALL Modes</option>
                                        <option value="Import">Import</option>
                                        <option value="Export">Export</option>
                                        <option value="Sales">Sales</option>
                                    </select>
                                </div>

                                {availableClosedTypes.length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Vehicle Type:</span>
                                        <select
                                            value={closedType}
                                            onChange={e => { setClosedType(e.target.value); setCurrentPage(1); }}
                                            style={{ height: '32px', padding: '0 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 600, background: '#fff', outline: 'none' }}
                                        >
                                            <option value="ALL">ALL Types</option>
                                            {availableClosedTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                )}

                                {(closedBranch !== 'ALL' || closedIe !== 'ALL' || closedType !== 'ALL' || closedSearchTerm) && (
                                    <button
                                        onClick={() => {
                                            setClosedBranch('ALL');
                                            setClosedIe('ALL');
                                            setClosedType('ALL');
                                            setClosedSearchTerm('');
                                            setCurrentPage(1);
                                        }}
                                        style={{ height: '32px', padding: '0 10px', borderRadius: '8px', border: 'none', background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        ✕ Clear Filters
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Table */}
                        <div style={{ overflowX: 'auto' }}>
                            <table className="fleet-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                                        <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('import_export')}>
                                            I/E <ArrowUpDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                                        </th>
                                        <th style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('branch')}>
                                            Branch <ArrowUpDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                                        </th>
                                        <th style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('type_of_vehicle')}>
                                            Type <ArrowUpDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                                        </th>
                                        <th style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('tr_no')}>
                                            TR No <ArrowUpDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                                        </th>
                                        <th style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('vehicle_no')}>
                                            Vehicle <ArrowUpDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                                        </th>
                                        <th style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('container_number')}>
                                            Container No <ArrowUpDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                                        </th>
                                        <th style={{ textAlign: 'center' }}>Seal No</th>
                                        <th style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('consignee')}>
                                            Consignee <ArrowUpDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                                        </th>
                                        <th style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('consignor')}>
                                            Consignor <ArrowUpDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                                        </th>
                                        <th style={{ textAlign: 'left' }}>Remark</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontStyle: 'italic' }}>
                                                No closed dispatch records found for the selected period / filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedItems.map((item, idx) => {
                                            const rowNum = (currentPage - 1) * (pageSize === 'ALL' ? 0 : Number(pageSize)) + idx + 1;
                                            return (
                                                <tr key={item._id || idx}>
                                                    <td style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 600 }} className="mono">
                                                        {rowNum}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {getIeBadge(item.import_export)}
                                                    </td>
                                                    <td style={{ fontWeight: 700, color: '#0f172a' }}>
                                                        {item.branch || '—'}
                                                    </td>
                                                    <td style={{ color: '#475569', fontSize: '12.5px' }}>
                                                        {item.type_of_vehicle || item.container_type || '—'}
                                                    </td>
                                                    <td style={{ fontWeight: 800, color: '#4f46e5' }} className="mono">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <span>{item.tr_no || '—'}</span>
                                                            <CopyButton text={item.tr_no} />
                                                        </div>
                                                    </td>
                                                    <td style={{ fontWeight: 800, color: '#0f172a' }} className="mono">
                                                        {item.vehicle_no || '—'}
                                                    </td>
                                                    <td style={{ fontWeight: 700, color: '#334155' }} className="mono">
                                                        {item.container_number || '—'}
                                                    </td>
                                                    <td style={{ textAlign: 'center', color: '#64748b' }} className="mono">
                                                        {item.seal_no || '—'}
                                                    </td>
                                                    <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, color: '#0f172a' }} title={item.consignee}>
                                                        {item.consignee || '—'}
                                                    </td>
                                                    <td style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#475569' }} title={item.consignor}>
                                                        {item.consignor || '—'}
                                                    </td>
                                                    <td style={{ color: '#64748b', fontSize: '12px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {item.remarks || item.remark || item.otherStatusText || '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Bar */}
                        {totalPages > 1 && (
                            <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(226, 232, 240, 0.8)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.7)' }}>
                                <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>
                                    Showing {pageSize === 'ALL' ? `1 to ${currentList.length}` : `${(currentPage - 1) * Number(pageSize) + 1} to ${Math.min(currentPage * Number(pageSize), currentList.length)}`} of {currentList.length} records
                                </span>

                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        style={{
                                            height: '30px',
                                            padding: '0 12px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(226, 232, 240, 0.8)',
                                            background: currentPage === 1 ? 'rgba(241, 245, 249, 0.5)' : '#fff',
                                            color: currentPage === 1 ? '#94a3b8' : '#1e293b',
                                            fontWeight: 700,
                                            fontSize: '12px',
                                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        Previous
                                    </button>

                                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                                        const pageNum = i + 1;
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                style={{
                                                    height: '30px',
                                                    padding: '0 12px',
                                                    borderRadius: '8px',
                                                    border: currentPage === pageNum ? '1px solid #10b981' : '1px solid rgba(226, 232, 240, 0.8)',
                                                    background: currentPage === pageNum ? '#10b981' : '#fff',
                                                    color: currentPage === pageNum ? '#fff' : '#1e293b',
                                                    fontWeight: 800,
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    fontFamily: "'Outfit', sans-serif"
                                                }}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}

                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        style={{
                                            height: '30px',
                                            padding: '0 12px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(226, 232, 240, 0.8)',
                                            background: currentPage === totalPages ? 'rgba(241, 245, 249, 0.5)' : '#fff',
                                            color: currentPage === totalPages ? '#94a3b8' : '#1e293b',
                                            fontWeight: 700,
                                            fontSize: '12px',
                                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ══════════════════════════════════════════════════════════════════════ */}
            {/* VIEW B: PENDING LRS QUEUE (FOR TODAY / LIVE QUEUE)                    */}
            {/* ══════════════════════════════════════════════════════════════════════ */}

            {activeTab === 'pending' && (
                <>
                    {/* ── 2B. 3 Core Hero KPI Cards ─────────────────────────────────────── */}
                    <div className="fleet-hero-grid">
                        {/* 1. PENDING LRS BACKLOG (NOT PR COUNT) */}
                        <div
                            className="fleet-card"
                            style={{
                                padding: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                minHeight: '260px',
                                '--fc-bg': 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 247, 255, 0.9) 100%)',
                                '--fc-border': '1px solid rgba(79, 70, 229, 0.2)',
                                '--fc-accent': '#4f46e5'
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '28px' }}>
                                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '13px', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                                        Pending LRs Backlog
                                    </div>
                                    <span className="status-pill-v2" data-variant="info">
                                        📋 {pendingStats.totalPRs} PRs
                                    </span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                                    Containers awaiting Lorry Receipt (LR) creation
                                </div>

                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '14px', marginBottom: '14px' }}>
                                    <span style={{ fontSize: '42px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }} className="mono">
                                        {pendingStats.totalPendingLrs}
                                    </span>
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626' }}>
                                        Pending LRs
                                    </span>
                                </div>
                            </div>

                            {/* Mini Branch Distribution Bar */}
                            <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(226, 232, 240, 0.8)', marginTop: 'auto' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>
                                    <span>Branch Breakdown</span>
                                    <span>{pendingStats.branchList.length} Active Stations</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {pendingStats.branchList.slice(0, 2).map((b, idx) => (
                                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                                            <span style={{ fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                                                {b.branch}
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '60px', height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${b.sharePct}%`, height: '100%', background: idx === 0 ? '#4f46e5' : '#0ea5e9' }} />
                                                </div>
                                                <span style={{ fontWeight: 800, color: '#0f172a', minWidth: '34px', textAlign: 'right' }} className="mono">
                                                    {b.pendingLrs}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* 2. DO URGENCY & DETENTION ALERTS */}
                        <div
                            className="fleet-card"
                            style={{
                                padding: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                minHeight: '260px',
                                '--fc-bg': pendingStats.totalDoAlerts > 0 ? 'linear-gradient(135deg, rgba(254, 242, 242, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)' : 'linear-gradient(135deg, rgba(240, 253, 244, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
                                '--fc-border': pendingStats.totalDoAlerts > 0 ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(16, 185, 129, 0.25)',
                                '--fc-accent': pendingStats.totalDoAlerts > 0 ? '#ef4444' : '#10b981'
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '28px' }}>
                                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '13px', color: pendingStats.totalDoAlerts > 0 ? '#dc2626' : '#059669', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                                        DO Validity Alerts
                                    </div>
                                    <span className="status-pill-v2" data-variant={pendingStats.expiredDoCount > 0 ? 'error' : pendingStats.expiringSoonDoCount > 0 ? 'warning' : 'success'}>
                                        {pendingStats.totalDoAlerts > 0 ? `⚠️ ${pendingStats.totalDoAlerts} Alert${pendingStats.totalDoAlerts > 1 ? 's' : ''}` : '🟢 All Valid'}
                                    </span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                                    Detention risk & urgent vehicle allocation
                                </div>

                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '14px', marginBottom: '14px' }}>
                                    <span style={{ fontSize: '42px', fontWeight: 900, color: pendingStats.expiredDoCount > 0 ? '#dc2626' : '#0f172a', lineHeight: 1 }} className="mono">
                                        {pendingStats.expiredDoCount}
                                    </span>
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626' }}>
                                        Critical Expired DOs
                                    </span>
                                </div>
                            </div>

                            {/* Interactive Alert Breakdown Chips */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '12px', borderTop: '1px solid rgba(226, 232, 240, 0.8)', marginTop: 'auto' }}>
                                <div
                                    onClick={() => setSelectedDoStatus(prev => prev === 'EXPIRED' ? 'ALL' : 'EXPIRED')}
                                    style={{
                                        background: selectedDoStatus === 'EXPIRED' ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.08)',
                                        border: '1px solid rgba(239, 68, 68, 0.25)',
                                        padding: '8px 10px',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#b91c1c' }}>🔴 Expired</span>
                                    <span style={{ fontSize: '14px', fontWeight: 900, color: '#dc2626' }} className="mono">{pendingStats.expiredDoCount}</span>
                                </div>

                                <div
                                    onClick={() => setSelectedDoStatus(prev => prev === 'EXPIRING_SOON' ? 'ALL' : 'EXPIRING_SOON')}
                                    style={{
                                        background: selectedDoStatus === 'EXPIRING_SOON' ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.08)',
                                        border: '1px solid rgba(245, 158, 11, 0.25)',
                                        padding: '8px 10px',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#b45309' }}>🟡 ≤3 Days</span>
                                    <span style={{ fontSize: '14px', fontWeight: 900, color: '#d97706' }} className="mono">{pendingStats.expiringSoonDoCount}</span>
                                </div>

                                <div
                                    onClick={() => setSelectedDoStatus(prev => prev === 'VALID' ? 'ALL' : 'VALID')}
                                    style={{
                                        background: selectedDoStatus === 'VALID' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(16, 185, 129, 0.08)',
                                        border: '1px solid rgba(16, 185, 129, 0.25)',
                                        padding: '8px 10px',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#047857' }}>🟢 Active</span>
                                    <span style={{ fontSize: '14px', fontWeight: 900, color: '#059669' }} className="mono">{pendingStats.validDoCount}</span>
                                </div>

                                <div
                                    onClick={() => setSelectedDoStatus(prev => prev === 'NO_DO' ? 'ALL' : 'NO_DO')}
                                    style={{
                                        background: selectedDoStatus === 'NO_DO' ? 'rgba(148, 163, 184, 0.25)' : 'rgba(148, 163, 184, 0.1)',
                                        border: '1px solid rgba(148, 163, 184, 0.25)',
                                        padding: '8px 10px',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>⚪ No DO</span>
                                    <span style={{ fontSize: '14px', fontWeight: 900, color: '#334155' }} className="mono">{pendingStats.noDoCount}</span>
                                </div>
                            </div>
                        </div>

                        {/* 3. CONTAINER SIZE BIFURCATION */}
                        <div
                            className="fleet-card"
                            style={{
                                padding: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                minHeight: '260px',
                                '--fc-bg': 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)',
                                '--fc-border': '1px solid rgba(226, 232, 240, 0.8)',
                                '--fc-accent': '#06b6d4'
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '28px' }}>
                                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '13px', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 800 }}>
                                        Size Bifurcation
                                    </div>
                                    <span className="status-pill-v2" data-variant="neutral">
                                        📦 {pendingStats.totalPendingLrs} Total Backlog
                                    </span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginTop: '2px' }}>
                                    20 FT vs 40 FT container size volume split
                                </div>

                                {/* Split Bar */}
                                <div style={{ marginTop: '16px', marginBottom: '14px' }}>
                                    <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
                                        <div style={{ width: `${pendingStats.size20Pct}%`, background: '#4f46e5', transition: 'width 0.4s' }} title={`20 FT: ${pendingStats.size20Pct}%`} />
                                        <div style={{ width: `${pendingStats.size40Pct}%`, background: '#10b981', transition: 'width 0.4s' }} title={`40 FT: ${pendingStats.size40Pct}%`} />
                                        <div style={{ width: `${pendingStats.sizeOtherPct}%`, background: '#f59e0b', transition: 'width 0.4s' }} title={`Other: ${pendingStats.sizeOtherPct}%`} />
                                    </div>
                                </div>
                            </div>

                            {/* Size Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', paddingTop: '12px', borderTop: '1px solid rgba(226, 232, 240, 0.8)', marginTop: 'auto' }}>
                                <div
                                    onClick={() => setSelectedSize(prev => prev === '20' ? 'ALL' : '20')}
                                    style={{
                                        background: selectedSize === '20' ? 'rgba(79, 70, 229, 0.15)' : 'rgba(79, 70, 229, 0.05)',
                                        border: '1px solid rgba(79, 70, 229, 0.2)',
                                        padding: '10px 12px',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#4f46e5' }}>📦 20 FT</span>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>{pendingStats.size20Pct}%</span>
                                    </div>
                                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }} className="mono">
                                        {pendingStats.size20Count} <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>pending</span>
                                    </div>
                                </div>

                                <div
                                    onClick={() => setSelectedSize(prev => prev === '40' ? 'ALL' : '40')}
                                    style={{
                                        background: selectedSize === '40' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.05)',
                                        border: '1px solid rgba(16, 185, 129, 0.2)',
                                        padding: '10px 12px',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669' }}>📦 40 FT</span>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>{pendingStats.size40Pct}%</span>
                                    </div>
                                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }} className="mono">
                                        {pendingStats.size40Count} <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>pending</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── 3B. Branch-Wise Detailed Count Matrix ─────────────────────────── */}
                    <div className="fleet-table-wrap">
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(226, 232, 240, 0.8)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.7)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Building2 size={18} color="#4f46e5" />
                                <h3 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
                                    Branch-Wise Detailed Count & Breakdown
                                </h3>
                            </div>
                            <span className="status-pill-v2" data-variant="info">
                                {pendingStats.branchList.length} Stations Active
                            </span>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table className="fleet-table">
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left' }}>Branch / Station</th>
                                        <th style={{ textAlign: 'center' }}>Pending LRs (Not PR)</th>
                                        <th style={{ textAlign: 'center' }}>PR Count</th>
                                        <th style={{ textAlign: 'center' }}>20 FT Pending</th>
                                        <th style={{ textAlign: 'center' }}>40 FT Pending</th>
                                        <th style={{ textAlign: 'center' }}>DO Expired / Risk</th>
                                        <th style={{ textAlign: 'right' }}>Backlog Share</th>
                                        <th style={{ textAlign: 'center', width: '90px' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingStats.branchList.map((b, idx) => (
                                        <tr key={idx} style={{ background: selectedBranch === b.branch ? 'rgba(79, 70, 229, 0.05)' : undefined }}>
                                            <td style={{ textAlign: 'left', fontWeight: 800, color: '#0f172a' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: b.expiredDo > 0 ? '#ef4444' : '#10b981', flexShrink: 0 }} />
                                                    {b.branch}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '15px', color: '#4f46e5' }} className="mono">
                                                {b.pendingLrs}
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: 700, color: '#64748b' }} className="mono">
                                                {b.prCount}
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: 800, color: '#0f172a' }} className="mono">
                                                {b.size20}
                                            </td>
                                            <td style={{ textAlign: 'center', fontWeight: 800, color: '#0f172a' }} className="mono">
                                                {b.size40}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {b.expiredDo > 0 ? (
                                                    <span className="status-pill-v2" data-variant="error">
                                                        🔴 {b.expiredDo} Expired
                                                    </span>
                                                ) : b.expiringSoonDo > 0 ? (
                                                    <span className="status-pill-v2" data-variant="warning">
                                                        🟡 {b.expiringSoonDo} Soon
                                                    </span>
                                                ) : (
                                                    <span className="status-pill-v2" data-variant="success">
                                                        🟢 0 Risk
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                                    <div style={{ width: '60px', height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${b.sharePct}%`, height: '100%', background: '#4f46e5' }} />
                                                    </div>
                                                    <span style={{ fontWeight: 800, color: '#0f172a', minWidth: '40px', textAlign: 'right' }} className="mono">{b.sharePct}%</span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button
                                                    onClick={() => {
                                                        setSelectedBranch(prev => prev === b.branch ? 'ALL' : b.branch);
                                                        setCurrentPage(1);
                                                    }}
                                                    style={{
                                                        padding: '4px 10px',
                                                        borderRadius: '8px',
                                                        border: selectedBranch === b.branch ? '1px solid #4f46e5' : '1px solid rgba(226, 232, 240, 0.8)',
                                                        background: selectedBranch === b.branch ? '#4f46e5' : 'rgba(255, 255, 255, 0.8)',
                                                        color: selectedBranch === b.branch ? '#fff' : '#4f46e5',
                                                        fontWeight: 700,
                                                        fontSize: '11.5px',
                                                        cursor: 'pointer',
                                                        fontFamily: "'Outfit', sans-serif"
                                                    }}
                                                >
                                                    {selectedBranch === b.branch ? 'Filtered ✓' : 'Filter'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Total Row */}
                                    <tr style={{ background: 'linear-gradient(180deg, rgba(241, 245, 249, 0.7) 0%, rgba(226, 232, 240, 0.8) 100%)', borderTop: '2px solid rgba(226, 232, 240, 1)' }}>
                                        <td style={{ textAlign: 'left', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', fontSize: '12.5px' }}>
                                            Total Backlog
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 900, fontSize: '16px', color: '#4f46e5' }} className="mono">
                                            {pendingStats.totalPendingLrs}
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 800, color: '#0f172a' }} className="mono">
                                            {pendingStats.totalPRs}
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 900, color: '#0f172a' }} className="mono">
                                            {pendingStats.size20Count}
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 900, color: '#0f172a' }} className="mono">
                                            {pendingStats.size40Count}
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 900, color: pendingStats.expiredDoCount > 0 ? '#dc2626' : '#059669' }} className="mono">
                                            {pendingStats.expiredDoCount} Expired
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 900, color: '#0f172a' }} className="mono">
                                            100%
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {Boolean(selectedBranch !== 'ALL' || selectedSize !== 'ALL' || selectedDoStatus !== 'ALL' || searchTerm) && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedBranch('ALL');
                                                        setSelectedSize('ALL');
                                                        setSelectedDoStatus('ALL');
                                                        setSearchTerm('');
                                                        setCurrentPage(1);
                                                    }}
                                                    style={{ background: 'transparent', border: 'none', color: '#dc2626', fontWeight: 700, fontSize: '11.5px', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                                                >
                                                    Reset All
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ── 4B. Detailed Pending LRs Queue Table ─────────────────────────── */}
                    <div className="fleet-table-wrap">
                        {/* Filter Toolbar */}
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(226, 232, 240, 0.8)', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255, 255, 255, 0.7)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Layers size={18} color="#4f46e5" />
                                    <h3 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
                                        Pending LRs Queue Records
                                    </h3>
                                    <span className="status-pill-v2" data-variant="neutral">
                                        {filteredPendingItems.length} Records
                                    </span>
                                </div>

                                {/* Search Input */}
                                <div style={{ position: 'relative', width: '280px' }}>
                                    <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        type="text"
                                        placeholder="Search PR No, Customer, Branch..."
                                        value={searchTerm}
                                        onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                        style={{
                                            width: '100%',
                                            height: '36px',
                                            padding: '0 12px 0 34px',
                                            borderRadius: '10px',
                                            border: '1px solid rgba(226, 232, 240, 0.8)',
                                            background: 'rgba(255, 255, 255, 0.95)',
                                            fontSize: '13px',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    {searchTerm && (
                                        <X
                                            size={14}
                                            color="#94a3b8"
                                            onClick={() => setSearchTerm('')}
                                            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div style={{ overflowX: 'auto' }}>
                            <table className="fleet-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                                        <th style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('pr_no')}>
                                            PR Number <ArrowUpDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                                        </th>
                                        <th style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('invoice_party')}>
                                            Customer / Invoice Party <ArrowUpDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                                        </th>
                                        <th style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('branch')}>
                                            Branch <ArrowUpDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                                        </th>
                                        <th style={{ textAlign: 'left' }}>Container Type</th>
                                        <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('totalContainers')}>
                                            Total Ordered <ArrowUpDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                                        </th>
                                        <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('lrCreatedContainers')}>
                                            LRs Created <ArrowUpDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                                        </th>
                                        <th style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSort('pendingCount')}>
                                            Pending LRs <ArrowUpDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                                        </th>
                                        <th style={{ textAlign: 'left', cursor: 'pointer' }} onClick={() => handleSort('do_validity')}>
                                            DO Validity Status <ArrowUpDown size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontStyle: 'italic' }}>
                                                No pending LRs records found matching the active filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedItems.map((item, idx) => {
                                            const rowNum = (currentPage - 1) * (pageSize === 'ALL' ? 0 : Number(pageSize)) + idx + 1;
                                            return (
                                                <tr key={item.pr_no || idx}>
                                                    <td style={{ textAlign: 'center', color: '#94a3b8', fontWeight: 600 }} className="mono">
                                                        {rowNum}
                                                    </td>
                                                    <td style={{ textAlign: 'left', fontWeight: 800, color: '#4f46e5' }} className="mono">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <span>{item.pr_no || '—'}</span>
                                                            <CopyButton text={item.pr_no} />
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'left', fontWeight: 600, color: '#0f172a', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.invoice_party}>
                                                        {item.invoice_party || '—'}
                                                    </td>
                                                    <td style={{ textAlign: 'left', fontWeight: 600 }}>
                                                        {item.branch || '—'}
                                                    </td>
                                                    <td style={{ textAlign: 'left', color: '#475569' }} className="mono">
                                                        {item.container_type || '—'}
                                                    </td>
                                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#0f172a' }} className="mono">
                                                        {item.totalContainers || 0}
                                                    </td>
                                                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#059669' }} className="mono">
                                                        {item.lrCreatedContainers || 0}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                padding: '3px 10px',
                                                                borderRadius: '8px',
                                                                background: 'rgba(239, 68, 68, 0.12)',
                                                                color: '#dc2626',
                                                                fontWeight: 900,
                                                                fontSize: '14px',
                                                                minWidth: '32px'
                                                            }}
                                                            className="mono"
                                                        >
                                                            {item.pendingCount || 0}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'left' }}>
                                                        {renderDoValidityBadge(item.do_validity)}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Bar */}
                        {totalPages > 1 && (
                            <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(226, 232, 240, 0.8)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.7)' }}>
                                <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>
                                    Showing {pageSize === 'ALL' ? `1 to ${currentList.length}` : `${(currentPage - 1) * Number(pageSize) + 1} to ${Math.min(currentPage * Number(pageSize), currentList.length)}`} of {currentList.length} records
                                </span>

                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        style={{
                                            height: '30px',
                                            padding: '0 12px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(226, 232, 240, 0.8)',
                                            background: currentPage === 1 ? 'rgba(241, 245, 249, 0.5)' : '#fff',
                                            color: currentPage === 1 ? '#94a3b8' : '#1e293b',
                                            fontWeight: 700,
                                            fontSize: '12px',
                                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        Previous
                                    </button>

                                    {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                                        const pageNum = i + 1;
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                style={{
                                                    height: '30px',
                                                    padding: '0 12px',
                                                    borderRadius: '8px',
                                                    border: currentPage === pageNum ? '1px solid #4f46e5' : '1px solid rgba(226, 232, 240, 0.8)',
                                                    background: currentPage === pageNum ? '#4f46e5' : '#fff',
                                                    color: currentPage === pageNum ? '#fff' : '#1e293b',
                                                    fontWeight: 800,
                                                    fontSize: '12px',
                                                    cursor: 'pointer',
                                                    fontFamily: "'Outfit', sans-serif"
                                                }}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}

                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        style={{
                                            height: '30px',
                                            padding: '0 12px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(226, 232, 240, 0.8)',
                                            background: currentPage === totalPages ? 'rgba(241, 245, 249, 0.5)' : '#fff',
                                            color: currentPage === totalPages ? '#94a3b8' : '#1e293b',
                                            fontWeight: 700,
                                            fontSize: '12px',
                                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default TransportMonitoringReport;
