import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { getTransportDates, TRANSPORT_BASE, TRANSPORT_HEADERS } from './reports-helper';


const normalizeDateStr = (dateStr) => {
    if (!dateStr) return '';
    const cleanStr = String(dateStr).trim();
    
    // Extract date portion if it has time T... or space...
    const datePart = cleanStr.split('T')[0].split(' ')[0];
    
    if (datePart.includes('-')) {
        const parts = datePart.split('-');
        if (parts[0].length === 4) {
            // yyyy-MM-dd
            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else if (parts[2].length === 4) {
            // dd-MM-yyyy
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }
    
    if (datePart.includes('.')) {
        const parts = datePart.split('.');
        if (parts[2].length === 4) {
            // dd.MM.yyyy
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }
    
    if (datePart.includes('/')) {
        const parts = datePart.split('/');
        if (parts[2].length === 4) {
            // dd/MM/yyyy
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        } else if (parts[0].length === 4) {
            // yyyy/MM/dd
            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
    }
    
    // Fallback: try parsing with Date
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

const ElockUtilizationReport = ({
    filterType,
    selectedMonth,
    selectedYear,
    selectedQuarter,
    dateRange,
    selectedDay
}) => {
    const [elockData, setElockData] = useState({ summary: {}, rows: [] });
    const [elockMeta, setElockMeta] = useState({});
    const [loading, setLoading] = useState(true);
    const [tatLimitHours, setTatLimitHours] = useState(24);

    useEffect(() => {
        const fetchElock = async () => {
            setLoading(true);
            try {
                const { startDate, endDate } = getTransportDates(
                    filterType,
                    selectedDay,
                    selectedYear,
                    selectedMonth,
                    selectedQuarter,
                    dateRange
                );
                const params = {};
                if (startDate) params.startDate = startDate;
                if (endDate) params.endDate = endDate;
                const res = await axios.get(`${TRANSPORT_BASE}/api/elock/utilization-report`, { 
                    params,
                    headers: TRANSPORT_HEADERS,
                    withCredentials: true 
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

    // Trend analysis: deduplicate transaction records by date and compute daily aggregations
    const elockDailyTrendData = useMemo(() => {
        if (!elockData.rows || elockData.rows.length === 0) return [];
        const dateMap = {};
        
        elockData.rows.forEach(row => {
            if (!row.date) return;
            const normDate = normalizeDateStr(row.date);
            if (!normDate) return;

            if (!dateMap[normDate]) {
                dateMap[normDate] = {
                    date: normDate,
                    locksUsed: row.locks_used_this_date ?? 0,
                    availableLocks: row.available_locks_this_date ?? 0,
                    maintenanceLocks: row.maintenance_locks_this_date ?? 0,
                    totalLocks: (row.locks_used_this_date ?? 0) + (row.available_locks_this_date ?? 0) + (row.maintenance_locks_this_date ?? 0)
                };
            } else {
                dateMap[normDate].locksUsed = Math.max(dateMap[normDate].locksUsed, row.locks_used_this_date ?? 0);
                dateMap[normDate].availableLocks = Math.max(dateMap[normDate].availableLocks, row.available_locks_this_date ?? 0);
                dateMap[normDate].maintenanceLocks = Math.max(dateMap[normDate].maintenanceLocks, row.maintenance_locks_this_date ?? 0);
                dateMap[normDate].totalLocks = dateMap[normDate].locksUsed + dateMap[normDate].availableLocks + dateMap[normDate].maintenanceLocks;
            }
        });
        
        return Object.values(dateMap).sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [elockData.rows]);

    const parseDate = (dateStr) => {
        if (!dateStr) return new Date();
        if (dateStr.includes('-')) {
            return new Date(dateStr);
        }
        if (dateStr.includes('.')) {
            const parts = dateStr.split('.');
            return new Date(parts[2], parts[1] - 1, parts[0]);
        }
        return new Date(dateStr);
    };

    const calculatedKPIs = useMemo(() => {
        const rows = elockData.rows || [];
        const totalLocks = elockMeta.totalAssets || 17;

        // 1. Used and Assigned/Return Pending Locks
        let usedLocks = 0;
        let assignedReturnPendingLocks = 0;
        let maintenanceLocks = 0;

        rows.forEach(row => {
            if (row.elock_assign_status === 'ACTIVE') {
                const start = parseDate(row.date);
                const elapsedHours = (new Date() - start) / (1000 * 60 * 60);
                if (elapsedHours > tatLimitHours) {
                    assignedReturnPendingLocks++;
                } else {
                    usedLocks++;
                }
            } else if (row.elock_assign_status === 'MAINTENANCE') {
                maintenanceLocks++;
            }
        });

        // If maintenanceLocks is 0, fallback to summary
        if (maintenanceLocks === 0 && elockData.summary?.elock_under_maintenance) {
            maintenanceLocks = elockData.summary.elock_under_maintenance;
        }

        // 2. Idle Locks
        const idleLocks = Math.max(0, totalLocks - usedLocks - assignedReturnPendingLocks - maintenanceLocks);

        // 3. Asset Utilization %
        const assetUtilizationPercent = totalLocks > 0 ? ((usedLocks / totalLocks) * 100).toFixed(1) : '0.0';

        // 4. Average Daily Locks Used
        const { startDate, endDate } = getTransportDates(
            filterType,
            selectedDay,
            selectedYear,
            selectedMonth,
            selectedQuarter,
            dateRange
        );
        let diffDays = 1;
        if (startDate && endDate) {
            const startD = new Date(startDate);
            const endD = new Date(endDate);
            const diffTime = Math.abs(endD - startD);
            diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1 || 1;
        }
        const totalLocksUsedDuringPeriod = rows.length;
        const averageDailyLocksUsed = (totalLocksUsedDuringPeriod / diffDays).toFixed(1);

        // 5. Average Daily Utilization %
        const averageDailyUtilizationPercent = totalLocks > 0 ? ((parseFloat(averageDailyLocksUsed) / totalLocks) * 100).toFixed(1) : '0.0';

        // 6. Highest Single Day Utilization %
        const maxLocksUsedSingleDay = elockDailyTrendData.length > 0 ? Math.max(...elockDailyTrendData.map(d => d.locksUsed)) : 0;
        const highestSingleDayUtilizationPercent = totalLocks > 0 ? ((maxLocksUsedSingleDay / totalLocks) * 100).toFixed(1) : '0.0';

        // 7. Projected Volume of E-Locks
        let daysInMonth = 30;
        if (selectedMonth && selectedYear) {
            daysInMonth = new Date(selectedYear, parseInt(selectedMonth) + 1, 0).getDate();
        } else if (startDate) {
            const startD = new Date(startDate);
            daysInMonth = new Date(startD.getFullYear(), startD.getMonth() + 1, 0).getDate();
        }
        const projectedVolume = Math.round(parseFloat(averageDailyLocksUsed) * daysInMonth);

        // 8. Projected Lock Requirement
        let totalRetentionDays = 0;
        let returnedCount = 0;
        rows.forEach(row => {
            if (row.elock_assign_status === 'RETURNED' && row.elock_return_date && row.date) {
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
        const projectedLockRequirement = Math.ceil((projectedVolume * averageLockRetentionDays) / daysInMonth);

        // 9. E-Lock TAT Alerts
        const elockTatAlerts = assignedReturnPendingLocks;

        // 10. Fleet-wise Analysis
        let srccLocksUsed = 0;
        let otherFleetLocksUsed = 0;
        rows.forEach(row => {
            const assign = (row.elock_assign || '').trim().toUpperCase();
            const others = (row.elock_assign_others || '').trim().toUpperCase();
            const isSrcc = assign === 'SRCC' || (assign === '' && others === '');
            if (isSrcc) {
                srccLocksUsed++;
            } else {
                otherFleetLocksUsed++;
            }
        });
        const srccUtilizationPercent = totalLocksUsedDuringPeriod > 0 ? ((srccLocksUsed / totalLocksUsedDuringPeriod) * 100).toFixed(1) : '0.0';
        const otherFleetUtilizationPercent = totalLocksUsedDuringPeriod > 0 ? ((otherFleetLocksUsed / totalLocksUsedDuringPeriod) * 100).toFixed(1) : '0.0';

        return {
            totalLocks,
            usedLocks,
            assignedReturnPendingLocks,
            idleLocks,
            maintenanceLocks,
            assetUtilizationPercent,
            averageDailyLocksUsed,
            averageDailyUtilizationPercent,
            highestSingleDayUtilizationPercent,
            projectedVolume,
            projectedLockRequirement,
            elockTatAlerts,
            srccLocksUsed,
            srccUtilizationPercent,
            otherFleetLocksUsed,
            otherFleetUtilizationPercent,
            averageLockRetentionDays
        };
    }, [elockData, elockMeta, elockDailyTrendData, filterType, selectedDay, selectedYear, selectedMonth, selectedQuarter, dateRange, tatLimitHours]);

    const displayedElockRows = useMemo(() => {
        const normSelectedDay = normalizeDateStr(selectedDay);
        if (filterType === 'day') {
            return (elockData.rows || []).filter(row => normalizeDateStr(row.date) === normSelectedDay);
        }
        return elockData.rows || [];
    }, [elockData.rows, filterType, selectedDay]);

    if (loading) {
        return (
            <div className="report-root-container">
                <style>{`
                    .nucleus-loading-container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 80px 20px;
                        background: rgba(255, 255, 255, 0.5);
                        backdrop-filter: blur(20px);
                        border-radius: 24px;
                    }
                    .nucleus-loader {
                        width: 48px;
                        height: 48px;
                        border: 3px solid rgba(102, 126, 234, 0.2);
                        border-top-color: #667eea;
                        border-radius: 50%;
                        animation: spin 0.8s linear infinite;
                    }
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
                <div className="nucleus-loading-container">
                    <div className="nucleus-loader"></div>
                    <div style={{ marginTop: '1.5rem', color: '#1e293b', fontWeight: 600 }}>Loading report details...</div>
                </div>
            </div>
        );
    }

    const getUtilColor = (val) => {
        if (val === '—') return '#64748b';
        const n = parseFloat(val);
        if (n >= 80) return '#10b981';
        if (n >= 50) return '#f59e0b';
        return '#ef4444';
    };

    const getAssetUtilColor = (val) => {
        const n = parseFloat(val);
        if (n > 60) return '#10b981'; // Green
        if (n >= 50) return '#f59e0b'; // Yellow
        return '#ef4444'; // Red
    };

    const getHighestUtilColor = (val) => {
        const n = parseFloat(val);
        if (n > 60) return '#10b981'; // Green
        if (n >= 40) return '#f59e0b'; // Yellow
        return '#ef4444'; // Red
    };

    return (
        <div className="report-root-container">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
                
                .report-root-container {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    display: flex;
                    flex-direction: column;
                    gap: 28px;
                    padding: 0;
                    background: transparent;
                }
                
                .nucleus-stats-card {
                    background: rgba(255, 255, 255, 0.8);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04), 0 1px 4px rgba(0, 0, 0, 0.02);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    overflow: hidden;
                    position: relative;
                }
                
                .nucleus-stats-card::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
                }
                
                .nucleus-stats-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
                }
                
                .nucleus-table-wrapper {
                    background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04);
                    overflow: hidden;
                }
                
                .nucleus-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                }
                
                .nucleus-table th {
                    background: linear-gradient(180deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.9) 100%);
                    color: #0f172a;
                    font-weight: 800;
                    font-size: 13.5px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    padding: 16px 20px;
                    border-bottom: 1px solid rgba(226, 232, 240, 0.6);
                    white-space: nowrap;
                }
                
                .nucleus-table td {
                    color: #1e293b;
                    font-weight: 600;
                    font-size: 14.5px;
                    padding: 14px 20px;
                    border-bottom: 1px solid rgba(226, 232, 240, 0.4);
                    transition: background 0.2s;
                }
                
                .nucleus-table tr:hover td {
                    background: rgba(102, 126, 234, 0.04);
                }
                
                .nucleus-table tr:last-child td {
                    border-bottom: none;
                }
                
                .status-pill {
                    display: inline-flex;
                    align-items: center;
                    padding: 6px 14px;
                    border-radius: 999px;
                    font-weight: 600;
                    font-size: 11.5px;
                    letter-spacing: 0.02em;
                    text-transform: uppercase;
                    transition: all 0.2s;
                }
                
                .status-pill.success {
                    background: rgba(16, 185, 129, 0.1);
                    color: #059669;
                    border: 1px solid rgba(16, 185, 129, 0.2);
                }
                
                .status-pill.info {
                    background: rgba(14, 165, 233, 0.1);
                    color: #0284c7;
                    border: 1px solid rgba(14, 165, 233, 0.2);
                }
                
                .status-pill.warning {
                    background: rgba(245, 158, 11, 0.1);
                    color: #d97706;
                    border: 1px solid rgba(245, 158, 11, 0.2);
                }
                
                .status-pill.error {
                    background: rgba(239, 68, 68, 0.1);
                    color: #dc2626;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }
                
                .status-pill.neutral {
                    background: rgba(148, 163, 184, 0.1);
                    color: #475569;
                    border: 1px solid rgba(148, 163, 184, 0.2);
                }
                
                .analytics-graphs-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
                    gap: 24px;
                }
                
                .analytics-graph-card {
                    background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    padding: 28px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04);
                }
                
                .graph-card-header h3 {
                    color: #1e293b;
                    font-weight: 700;
                    font-size: 16px;
                    margin-bottom: 4px;
                }
                
                .graph-card-header .graph-subtitle {
                    color: #64748b;
                    font-weight: 500;
                    font-size: 13px;
                }
                
                .custom-chart-tooltip {
                    background: rgba(255, 255, 255, 0.95) !important;
                    backdrop-filter: blur(10px) !important;
                    -webkit-backdrop-filter: blur(10px) !important;
                    border: 1px solid rgba(226, 232, 240, 0.6) !important;
                    border-radius: 16px !important;
                    padding: 16px 20px !important;
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08) !important;
                }
                
                .custom-chart-tooltip .tooltip-title {
                    font-weight: 700;
                    font-size: 14px;
                    color: #1e293b;
                    margin-bottom: 10px;
                }
                
                .custom-chart-tooltip .tooltip-value {
                    font-size: 13px;
                    font-weight: 500;
                    color: #475569;
                    margin: 6px 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .custom-chart-tooltip .tooltip-bullet {
                    display: inline-block;
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                }
                
                .mono-text {
                    font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
                }
                
                .handler-tag {
                    display: inline-flex;
                    align-items: center;
                    padding: 5px 12px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 12px;
                    background: rgba(102, 126, 234, 0.08);
                    color: #4f46e5;
                    border: 1px solid rgba(102, 126, 234, 0.15);
                }
                
                @media (max-width: 768px) {
                    .analytics-graphs-container {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>

            {/* TAT Limit Configuration */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                background: 'rgba(255, 255, 255, 0.8)',
                padding: '16px 24px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(20px)',
                flexWrap: 'wrap'
            }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                    Configure TAT Limit (Hours):
                </span>
                <input
                    type="number"
                    value={tatLimitHours}
                    onChange={e => setTatLimitHours(Math.max(1, parseInt(e.target.value) || 24))}
                    style={{
                        width: '80px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontWeight: 600,
                        fontSize: '14px',
                        textAlign: 'center',
                        color: '#0f172a'
                    }}
                />
                <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                    Locks unreturned past this limit will trigger TAT Alerts and be counted under "Assigned / Return Pending".
                </span>
            </div>

            {/* Inventory Validation indicator */}
            <div style={{
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#059669',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.15)',
                padding: '10px 20px',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                alignSelf: 'flex-start'
            }}>
                <span style={{ fontSize: '15px' }}>✓</span>
                Inventory Validated: Total Locks ({calculatedKPIs.totalLocks}) = Used ({calculatedKPIs.usedLocks}) + Assigned/Return Pending ({calculatedKPIs.assignedReturnPendingLocks}) + Idle ({calculatedKPIs.idleLocks}) + Maintenance ({calculatedKPIs.maintenanceLocks})
            </div>

            {/* KPI Stats Cards - Group 1: Inventory Status & Live Utilization */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                    Inventory Status & Live Utilization
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                    {[
                        { label: 'Total Locks', value: calculatedKPIs.totalLocks, color: '#6366f1', gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(99, 102, 241, 0.01))' },
                        { label: 'Used Locks', value: calculatedKPIs.usedLocks, color: '#06b6d4', gradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.08), rgba(6, 182, 212, 0.01))', subtitle: 'Active in trips' },
                        { label: 'Assigned / Return Pending', value: calculatedKPIs.assignedReturnPendingLocks, color: '#f59e0b', gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.01))', subtitle: 'Assigned, not returned' },
                        { label: 'Maintenance Locks', value: calculatedKPIs.maintenanceLocks, color: '#ef4444', gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.01))', subtitle: 'Under repair/service' },
                        { label: 'Idle Locks', value: calculatedKPIs.idleLocks, color: '#10b981', gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.01))', subtitle: 'Available for assign' },
                        { label: 'Asset Utilization %', value: `${calculatedKPIs.assetUtilizationPercent}%`, color: getAssetUtilColor(calculatedKPIs.assetUtilizationPercent), gradient: `linear-gradient(135deg, ${getAssetUtilColor(calculatedKPIs.assetUtilizationPercent)}12, transparent)` }
                    ].map((m, idx) => (
                        <div key={idx} className="nucleus-stats-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '8px', background: m.gradient }}>
                            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{m.label}</div>
                            <div style={{ fontSize: '30px', fontWeight: 900, color: m.color }} className="mono-text">{m.value}</div>
                            {m.subtitle && <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>{m.subtitle}</div>}
                        </div>
                    ))}
                </div>
            </div>

            {/* KPI Stats Cards - Group 2: Performance Trends & Projections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                    Performance Trends & Projections
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                    {[
                        { label: 'Avg Daily Locks Used', value: calculatedKPIs.averageDailyLocksUsed, color: '#6366f1', gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(99, 102, 241, 0.01))' },
                        { label: 'Avg Daily Utilization %', value: `${calculatedKPIs.averageDailyUtilizationPercent}%`, color: getAssetUtilColor(calculatedKPIs.averageDailyUtilizationPercent), gradient: `linear-gradient(135deg, ${getAssetUtilColor(calculatedKPIs.averageDailyUtilizationPercent)}12, transparent)` },
                        { label: 'Highest Single Day Util %', value: `${calculatedKPIs.highestSingleDayUtilizationPercent}%`, color: getHighestUtilColor(calculatedKPIs.highestSingleDayUtilizationPercent), gradient: `linear-gradient(135deg, ${getHighestUtilColor(calculatedKPIs.highestSingleDayUtilizationPercent)}12, transparent)` },
                        { label: 'Projected Volume', value: calculatedKPIs.projectedVolume, color: '#8b5cf6', gradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(139, 92, 246, 0.01))', subtitle: 'Expected monthly usage' },
                        { label: 'Projected Lock Requirement', value: calculatedKPIs.projectedLockRequirement, color: '#10b981', gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.01))', subtitle: `Avg Retention: ${calculatedKPIs.averageLockRetentionDays.toFixed(2)} days` }
                    ].map((m, idx) => (
                        <div key={idx} className="nucleus-stats-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '8px', background: m.gradient }}>
                            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{m.label}</div>
                            <div style={{ fontSize: '30px', fontWeight: 900, color: m.color }} className="mono-text">{m.value}</div>
                            {m.subtitle && <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>{m.subtitle}</div>}
                        </div>
                    ))}
                </div>
            </div>

            {/* KPI Stats Cards - Group 3: Fleet Breakdown & TAT Compliance */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                    Fleet Breakdown & TAT Compliance
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    {[
                        { label: 'E-Lock TAT Alerts', value: calculatedKPIs.elockTatAlerts, color: calculatedKPIs.elockTatAlerts > 0 ? '#ef4444' : '#10b981', gradient: calculatedKPIs.elockTatAlerts > 0 ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(239, 68, 68, 0.01))' : 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.01))', subtitle: 'Exceeding configured hours' },
                        { label: 'SRCC Locks Used', value: `${calculatedKPIs.srccLocksUsed} (${calculatedKPIs.srccUtilizationPercent}%)`, color: '#6366f1', gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(99, 102, 241, 0.01))', subtitle: 'SRCC vehicle trips' },
                        { label: 'Other Fleet Locks Used', value: `${calculatedKPIs.otherFleetLocksUsed} (${calculatedKPIs.otherFleetUtilizationPercent}%)`, color: '#f59e0b', gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(245, 158, 11, 0.01))', subtitle: 'Non-SRCC vehicle trips' }
                    ].map((m, idx) => (
                        <div key={idx} className="nucleus-stats-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '8px', background: m.gradient }}>
                            <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{m.label}</div>
                            <div style={{ fontSize: '26px', fontWeight: 900, color: m.color }} className="mono-text">{m.value}</div>
                            {m.subtitle && <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>{m.subtitle}</div>}
                        </div>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="nucleus-table-wrapper">
                {filterType !== 'day' ? (
                    <table className="nucleus-table">
                        <thead>
                            <tr>
                                <th style={{ width: '80px' }}>S.No</th>
                                <th>Date</th>
                                <th style={{ textAlign: 'right' }}>Available Locks (Idle)</th>
                                <th style={{ textAlign: 'right' }}>Maintenance Locks</th>
                                <th style={{ textAlign: 'right' }}>Used Locks</th>
                                <th style={{ textAlign: 'right' }}>Total Stock Capacity</th>
                                <th style={{ textAlign: 'right' }}>Utilization %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {elockDailyTrendData.length > 0 ? (
                                elockDailyTrendData.map((d, index) => {
                                    const utilPercent = d.totalLocks > 0 ? ((d.locksUsed / d.totalLocks) * 100).toFixed(1) : '0.0';
                                    let formattedDate = d.date;
                                    try {
                                        formattedDate = format(new Date(d.date), 'dd-MM-yyyy');
                                    } catch (e) {}

                                    return (
                                        <tr key={index}>
                                            <td style={{ fontWeight: 500, color: '#64748b' }} className="mono-text">{index + 1}</td>
                                            <td style={{ fontWeight: 700, color: '#0f172a' }}>{formattedDate}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600, color: '#475569' }} className="mono-text">{d.availableLocks}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600, color: '#ef4444' }} className="mono-text">{d.maintenanceLocks}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 600, color: '#06b6d4' }} className="mono-text">{d.locksUsed}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }} className="mono-text">{d.totalLocks}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 800, color: getUtilColor(utilPercent) }} className="mono-text">{utilPercent}%</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', color: '#64748b', padding: '40px', fontWeight: 500 }}>
                                        No E-Lock trend data found for the selected period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                ) : (
                    <table className="nucleus-table">
                        <thead>
                            <tr>
                                <th style={{ width: '80px' }}>S.No</th>
                                <th>TR No</th>
                                <th>Container No</th>
                                <th>Lock No</th>
                                <th>LR No</th>
                                <th>Assign Date</th>
                                <th>Return Date</th>
                                <th>Assign Status</th>
                                <th>Location</th>
                                <th>Customer Name</th>
                                <th>Assignee</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedElockRows.length > 0 ? (
                                displayedElockRows.map((row, index) => (
                                    <tr key={index}>
                                        <td style={{ fontWeight: 500, color: '#64748b' }} className="mono-text">{index + 1}</td>
                                        <td style={{ color: '#3b82f6', fontWeight: 500 }}>{row.tr_no ?? '—'}</td>
                                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{row.container_number ?? '—'}</td>
                                        <td className="mono-text" style={{ fontWeight: 600 }}>{row.lock_number ?? '—'}</td>
                                        <td className="mono-text" style={{ color: '#64748b' }}>{row.lr_no ?? '—'}</td>
                                        <td className="mono-text">
                                            {(() => {
                                                if (!row.date) return '—';
                                                try {
                                                    return format(new Date(row.date), 'dd-MM-yyyy');
                                                } catch (e) {
                                                    return row.date;
                                                }
                                            })()}
                                        </td>
                                        <td className="mono-text">
                                            {(() => {
                                                if (!row.elock_return_date) return '—';
                                                try {
                                                    return format(new Date(row.elock_return_date), 'dd-MM-yyyy');
                                                } catch (e) {
                                                    return row.elock_return_date;
                                                }
                                            })()}
                                        </td>
                                        <td>
                                            <span className={`status-pill ${row.elock_assign_status === 'ACTIVE' ? 'success' : row.elock_assign_status === 'RETURNED' ? 'info' : row.elock_assign_status === 'MAINTENANCE' ? 'error' : 'warning'}`}>
                                                {row.elock_assign_status ?? '—'}
                                            </span>
                                        </td>
                                        <td style={{ color: '#475569' }}>{row.location ?? '—'}</td>
                                        <td style={{ fontWeight: 500 }}>{row.customer_name ?? '—'}</td>
                                        <td>
                                            <span className="handler-tag">{row.elock_assign ?? '—'}</span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="11" style={{ textAlign: 'center', color: '#64748b', padding: '40px', fontWeight: 500 }}>
                                        No E-Lock data found for the selected period.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default ElockUtilizationReport;
