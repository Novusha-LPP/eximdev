import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { getTransportDates, TRANSPORT_BASE, TRANSPORT_HEADERS } from './reports-helper';

const ElockUtilizationReport = ({
    filterType,
    selectedMonth,
    selectedYear,
    selectedQuarter,
    dateRange,
    selectedDay
}) => {
    const [elockData, setElockData] = useState({ summary: {}, rows: [] });
    const [loading, setLoading] = useState(true);

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
            if (!dateMap[row.date]) {
                dateMap[row.date] = {
                    date: row.date,
                    locksUsed: row.locks_used_this_date ?? 0,
                    availableLocks: row.available_locks_this_date ?? 0,
                    maintenanceLocks: row.maintenance_locks_this_date ?? 0,
                    totalLocks: (row.locks_used_this_date ?? 0) + (row.available_locks_this_date ?? 0) + (row.maintenance_locks_this_date ?? 0)
                };
            } else {
                dateMap[row.date].locksUsed = Math.max(dateMap[row.date].locksUsed, row.locks_used_this_date ?? 0);
                dateMap[row.date].availableLocks = Math.max(dateMap[row.date].availableLocks, row.available_locks_this_date ?? 0);
                dateMap[row.date].maintenanceLocks = Math.max(dateMap[row.date].maintenanceLocks, row.maintenance_locks_this_date ?? 0);
                dateMap[row.date].totalLocks = dateMap[row.date].locksUsed + dateMap[row.date].availableLocks + dateMap[row.date].maintenanceLocks;
            }
        });
        
        return Object.values(dateMap).sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [elockData.rows]);

    // Calculate smart KPI card statistics for elock report, handling single-day versus multi-day ranges (CR-006)
    const elockSummaryObj = useMemo(() => {
        if (filterType === 'day') {
            const found = elockDailyTrendData.find(d => d.date === selectedDay);
            if (found) {
                const totalLocks = found.totalLocks;
                const usedLocks = found.locksUsed;
                const idleLocks = found.availableLocks;
                const maintenanceLocks = found.maintenanceLocks;
                const assignedLocks = idleLocks + maintenanceLocks;
                const assetUtilizationPercent = totalLocks > 0 ? ((usedLocks / totalLocks) * 100).toFixed(1) : '0.0';

                return {
                    totalLocks,
                    assignedLocks,
                    usedLocks,
                    idleLocks,
                    maintenanceLocks,
                    assetUtilizationPercent
                };
            }
            // Fallback to first day row if not found in trend
            const dayRows = elockData.rows?.filter(r => r.date === selectedDay) || [];
            if (dayRows.length > 0) {
                const usedLocks = dayRows[0].locks_used_this_date ?? 0;
                const idleLocks = dayRows[0].available_locks_this_date ?? 0;
                const maintenanceLocks = dayRows[0].maintenance_locks_this_date ?? 0;
                const totalLocks = usedLocks + idleLocks + maintenanceLocks;
                const assignedLocks = idleLocks + maintenanceLocks;
                const assetUtilizationPercent = totalLocks > 0 ? ((usedLocks / totalLocks) * 100).toFixed(1) : '0.0';

                return {
                    totalLocks,
                    assignedLocks,
                    usedLocks,
                    idleLocks,
                    maintenanceLocks,
                    assetUtilizationPercent
                };
            }
            return { totalLocks: 0, assignedLocks: 0, usedLocks: 0, idleLocks: 0, maintenanceLocks: 0, assetUtilizationPercent: '0.0' };
        } else {
            // For range (multi-day): compute cumulative sums of daily statuses in alignment with user preference
            if (elockDailyTrendData.length > 0) {
                let totalSum = 0;
                let usedSum = 0;
                let idleSum = 0;
                let maintSum = 0;

                elockDailyTrendData.forEach(d => {
                    totalSum += d.totalLocks || 0;
                    usedSum += d.locksUsed || 0;
                    idleSum += d.availableLocks || 0;
                    maintSum += d.maintenanceLocks || 0;
                });

                const assignedSum = idleSum + maintSum;
                const assetUtilizationPercent = totalSum > 0 ? ((usedSum / totalSum) * 100).toFixed(1) : '0.0';

                return {
                    totalLocks: totalSum,
                    assignedLocks: assignedSum,
                    usedLocks: usedSum,
                    idleLocks: idleSum,
                    maintenanceLocks: maintSum,
                    assetUtilizationPercent
                };
            }
            return {
                totalLocks: elockData.summary?.total_locks ?? 0,
                assignedLocks: (elockData.summary?.available_locks || 0) + (elockData.summary?.elock_under_maintenance || 0) || 0,
                usedLocks: elockData.summary?.locks_used ?? 0,
                idleLocks: elockData.summary?.available_locks ?? 0,
                maintenanceLocks: elockData.summary?.elock_under_maintenance ?? 0,
                assetUtilizationPercent: elockData.summary?.asset_utilization_percent ?? '0.0'
            };
        }
    }, [elockData, elockDailyTrendData, filterType, selectedDay]);

    const displayedElockRows = useMemo(() => {
        if (filterType === 'day') {
            return (elockData.rows || []).filter(row => row.date === selectedDay);
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

            {/* KPI Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                {[
                    { label: 'Total Locks', value: elockSummaryObj.totalLocks, color: '#6366f1', gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(99, 102, 241, 0.02))' },
                    { label: 'Assigned Locks', value: elockSummaryObj.assignedLocks, color: '#8b5cf6', gradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(139, 92, 246, 0.02))' },
                    { label: 'Used Locks', value: elockSummaryObj.usedLocks, color: '#06b6d4', gradient: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(6, 182, 212, 0.02))' },
                    { label: 'Idle Locks', value: elockSummaryObj.idleLocks, color: '#f59e0b', gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.02))' },
                    { label: 'Maintenance Locks', value: elockSummaryObj.maintenanceLocks, color: '#ef4444', gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.02))' },
                    { label: 'Asset Utilization %', value: `${elockSummaryObj.assetUtilizationPercent}%`, color: getUtilColor(elockSummaryObj.assetUtilizationPercent), gradient: `linear-gradient(135deg, ${getUtilColor(elockSummaryObj.assetUtilizationPercent)}15, transparent)` }
                ].map((m, idx) => (
                    <div key={idx} className="nucleus-stats-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '8px', background: m.gradient }}>
                        <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{m.label}</div>
                        <div style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a' }} className="mono-text">{m.value}</div>
                    </div>
                ))}
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
                                        <td className="mono-text">{row.date ?? '—'}</td>
                                        <td className="mono-text">{row.elock_return_date ?? '—'}</td>
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
