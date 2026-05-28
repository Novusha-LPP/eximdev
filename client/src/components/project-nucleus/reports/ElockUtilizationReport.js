import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine
} from 'recharts';
import { getTransportDates, TRANSPORT_BASE, TRANSPORT_HEADERS } from './reports-helper';

const ElockTrendTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        let formattedDate = data.date || '';
        try {
            if (data.date) {
                formattedDate = format(new Date(data.date), 'dd MMMM yyyy');
            }
        } catch (e) {
            console.error("Invalid date in ElockTrendTooltip", e);
        }
        return (
            <div className="custom-chart-tooltip">
                <p className="tooltip-title">{formattedDate}</p>
                <p className="tooltip-value">
                    <span className="tooltip-bullet" style={{ backgroundColor: '#06b6d4' }}></span>
                    Locks Used: <strong>{data.locksUsed ?? 0}</strong>
                </p>
                <p className="tooltip-value">
                    <span className="tooltip-bullet" style={{ backgroundColor: '#f43f5e' }}></span>
                    Under Maint.: <strong>{data.maintenanceLocks ?? 0}</strong>
                </p>
                <p className="tooltip-value">
                    <span className="tooltip-bullet" style={{ backgroundColor: '#10b981' }}></span>
                    Available: <strong>{data.availableLocks ?? 0}</strong>
                </p>
                <p className="tooltip-value" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '4px', marginTop: '4px', fontWeight: 600 }}>
                    Total Capacity: <strong>{data.totalLocks ?? 0}</strong>
                </p>
            </div>
        );
    }
    return null;
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

    // Calculate smart KPI card statistics for elock report, handling single-day versus multi-day ranges
    const elockSummaryObj = useMemo(() => {
        if (filterType === 'day') {
            const dayRows = elockData.rows?.filter(r => r.date === selectedDay) || [];
            if (dayRows.length > 0) {
                const locksUsed = dayRows[0].locks_used_this_date ?? 0;
                const availableLocks = dayRows[0].available_locks_this_date ?? 0;
                const maintenanceLocks = dayRows[0].maintenance_locks_this_date ?? 0;
                const totalLocks = locksUsed + availableLocks + maintenanceLocks;
                const assetUtilPercent = totalLocks > 0 ? ((locksUsed / totalLocks) * 100).toFixed(1) : '—';
                
                const activeLocksCount = dayRows.filter(r => r.elock_assign_status === 'ACTIVE' || r.elock_assign_status === 'ASSIGNED' || r.is_active).length;
                const returnedLocksCount = dayRows.filter(r => r.elock_assign_status === 'RETURNED' || r.is_returned).length;
                const maintenanceCount = dayRows.filter(r => r.elock_assign_status === 'MAINTENANCE' || r.is_maintenance).length;

                return {
                    locksUsed: locksUsed,
                    activeLocks: activeLocksCount,
                    returnedLocks: returnedLocksCount,
                    maintenance: maintenanceCount || maintenanceLocks,
                    assetUtilizationPercent: assetUtilPercent,
                    totalTransactions: dayRows.length
                };
            }
            return { locksUsed: '—', activeLocks: '—', returnedLocks: '—', maintenance: '—', assetUtilizationPercent: '—', totalTransactions: 0 };
        } else {
            return {
                locksUsed: elockData.summary?.locks_used ?? '—',
                activeLocks: elockData.summary?.active_locks ?? '—',
                returnedLocks: elockData.summary?.returned_locks ?? '—',
                maintenance: elockData.summary?.elock_under_maintenance ?? '—',
                assetUtilizationPercent: elockData.summary?.asset_utilization_percent ?? '—',
                highestSingleDay: elockData.summary?.highest_single_day_utilization ?? '—'
            };
        }
    }, [elockData, filterType, selectedDay]);

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
                    { label: 'Locks Used', value: elockSummaryObj.locksUsed, color: '#3b82f6', gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.02))' },
                    { label: 'Active Locks', value: elockSummaryObj.activeLocks, color: '#10b981', gradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.02))' },
                    { label: 'Returned', value: elockSummaryObj.returnedLocks, color: '#64748b', gradient: 'linear-gradient(135deg, rgba(100, 116, 139, 0.1), rgba(100, 116, 139, 0.02))' },
                    { label: 'Under Maint.', value: elockSummaryObj.maintenance, color: '#ef4444', gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.02))' },
                    { label: 'Asset Util', value: `${elockSummaryObj.assetUtilizationPercent}%`, color: getUtilColor(elockSummaryObj.assetUtilizationPercent), gradient: `linear-gradient(135deg, ${getUtilColor(elockSummaryObj.assetUtilizationPercent)}15, transparent)` },
                    { label: filterType === 'day' ? 'Total Trans.' : 'Peak Util', value: filterType === 'day' ? elockSummaryObj.totalTransactions : `${elockSummaryObj.highestSingleDay}%`, color: '#f59e0b', gradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.02))' }
                ].map((m, idx) => (
                    <div key={idx} className="nucleus-stats-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '8px', background: m.gradient }}>
                        <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>{m.label}</div>
                        <div style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a' }} className="mono-text">{m.value}</div>
                    </div>
                ))}
            </div>

            {/* Graphs */}
            <div className="analytics-graphs-container">
                <div className="analytics-graph-card">
                    <div className="graph-card-header">
                        <h3>E-Lock Stock Allocation Trend</h3>
                        <span className="graph-subtitle">Daily stock status breakdown</span>
                    </div>
                    <div style={{ width: '100%', height: 280 }}>
                        <ResponsiveContainer>
                            <AreaChart
                                data={elockDailyTrendData}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorUsed" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.05}/>
                                    </linearGradient>
                                    <linearGradient id="colorMaint" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02}/>
                                    </linearGradient>
                                    <linearGradient id="colorAvail" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.5)"/>
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(str) => {
                                        if (!str) return '';
                                        try {
                                            const d = new Date(str);
                                            return format(d, 'dd MMM');
                                        } catch (e) {
                                            return str;
                                        }
                                    }}
                                    stroke="#94a3b8"
                                    fontSize={11}
                                    tickLine={false}
                                />
                                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false}/>
                                <Tooltip content={<ElockTrendTooltip />} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                {filterType === 'day' && selectedDay && (
                                    <ReferenceLine 
                                        x={selectedDay} 
                                        stroke="#f59e0b" 
                                        strokeWidth={2} 
                                        strokeDasharray="5 5" 
                                        label={{ value: 'Selected', position: 'top', fill: '#d97706', fontSize: 10, fontWeight: 600 }}
                                    />
                                )}
                                <Area type="monotone" name="Locks Used" dataKey="locksUsed" stackId="1" stroke="#06b6d4" strokeWidth={2} fill="url(#colorUsed)"/>
                                <Area type="monotone" name="Under Maintenance" dataKey="maintenanceLocks" stackId="1" stroke="#f43f5e" strokeWidth={2} fill="url(#colorMaint)"/>
                                <Area type="monotone" name="Available Locks" dataKey="availableLocks" stackId="1" stroke="#10b981" strokeWidth={2} fill="url(#colorAvail)"/>
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                
                <div className="analytics-graph-card">
                    <div className="graph-card-header">
                        <h3>E-Lock Inventory Utilization Efficiency</h3>
                        <span className="graph-subtitle">Daily asset usage rate as a percentage of total stock</span>
                    </div>
                    <div style={{ width: '100%', height: 280 }}>
                        <ResponsiveContainer>
                            <AreaChart
                                data={elockDailyTrendData.map(d => {
                                    const total = d.totalLocks || 0;
                                    const util = total > 0 ? parseFloat(((d.locksUsed / total) * 100).toFixed(1)) : 0;
                                    return { ...d, utilPercent: util };
                                })}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorUtilEff" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0891b2" stopOpacity={0.25}/>
                                        <stop offset="95%" stopColor="#0891b2" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.5)"/>
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(str) => {
                                        if (!str) return '';
                                        try {
                                            const d = new Date(str);
                                            return format(d, 'dd MMM');
                                        } catch (e) {
                                            return str;
                                        }
                                    }}
                                    stroke="#94a3b8"
                                    fontSize={11}
                                    tickLine={false}
                                />
                                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 100]} unit="%"/>
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                                        border: '1px solid #e2e8f0', 
                                        borderRadius: '8px'
                                    }}
                                    labelFormatter={(str) => {
                                        if (!str) return '';
                                        try {
                                            return format(new Date(str), 'dd MMMM yyyy');
                                        } catch (e) {
                                            return str;
                                        }
                                    }}
                                    formatter={(value) => [`${value}%`, 'Utilization Efficiency']}
                                />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                {filterType === 'day' && selectedDay && (
                                    <ReferenceLine 
                                        x={selectedDay} 
                                        stroke="#f59e0b" 
                                        strokeWidth={2} 
                                        strokeDasharray="5 5" 
                                        label={{ value: 'Selected', position: 'top', fill: '#d97706', fontSize: 10, fontWeight: 600 }}
                                    />
                                )}
                                <Area type="monotone" name="Utilization Efficiency" dataKey="utilPercent" stroke="#0891b2" strokeWidth={2.5} fillOpacity={1} fill="url(#colorUtilEff)"/>
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="nucleus-table-wrapper">
                <table className="nucleus-table">
                    <thead>
                        <tr>
                            <th>S.No</th>
                            <th>TR No</th>
                            <th>Container No</th>
                            <th>Lock No</th>
                            <th>LR No</th>
                            <th>Assign Date</th>
                            <th>Return Date</th>
                            <th>Assign Status</th>
                            <th>Avail Locks</th>
                            <th>Maint Locks</th>
                            <th>Used Locks</th>
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
                                    <td className="mono-text">{row.available_locks_this_date ?? '—'}</td>
                                    <td className="mono-text">{row.maintenance_locks_this_date ?? '—'}</td>
                                    <td className="mono-text" style={{ fontWeight: 800, color: '#0f172a' }}>{row.locks_used_this_date ?? '—'}</td>
                                    <td style={{ color: '#475569' }}>{row.location ?? '—'}</td>
                                    <td style={{ fontWeight: 500 }}>{row.customer_name ?? '—'}</td>
                                    <td>
                                        <span className="handler-tag">{row.elock_assign ?? '—'}</span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="14" style={{ textAlign: 'center', color: '#64748b', padding: '40px', fontWeight: 500 }}>
                                    No E-Lock data found for the selected period.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ElockUtilizationReport;
