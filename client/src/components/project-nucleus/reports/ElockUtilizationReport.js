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
            <div className="nucleus-loading-container">
                <div className="nucleus-loader"></div>
                <div style={{ marginTop: '1rem', color: '#6b7280' }}>Loading report details...</div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Stats Card */}
            <div className="nucleus-stats-card" style={{ borderLeft: '4px solid #06b6d4', background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.08) 0%, rgba(6, 182, 212, 0.01) 100%)' }}>
                <div className="stats-text" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                    <div>
                        Locks Used: <span className="highlight-val" style={{ color: '#3b82f6' }}>{elockSummaryObj.locksUsed}</span>
                    </div>
                    <div>
                        Active Locks: <span className="highlight-val" style={{ color: '#10b981' }}>{elockSummaryObj.activeLocks}</span>
                    </div>
                    <div>
                        Returned: <span className="highlight-val" style={{ color: 'var(--text-color)' }}>{elockSummaryObj.returnedLocks}</span>
                    </div>
                    <div>
                        Under Maint.: <span className="highlight-val" style={{ color: '#ef4444' }}>{elockSummaryObj.maintenance}</span>
                    </div>
                    <div>
                        Asset Util: <span className="highlight-val" style={{ color: elockSummaryObj.assetUtilizationPercent >= 80 ? '#10b981' : elockSummaryObj.assetUtilizationPercent >= 50 ? '#f59e0b' : '#ef4444' }}>{elockSummaryObj.assetUtilizationPercent}%</span>
                    </div>
                    <div style={{ marginLeft: 'auto' }}>
                        {filterType === 'day' ? 'Total Trans.' : 'Peak Util'}: <span className="highlight-val" style={{ color: '#f59e0b' }}>{filterType === 'day' ? elockSummaryObj.totalTransactions : `${elockSummaryObj.highestSingleDay}%`}</span>
                    </div>
                </div>
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
                                    <td style={{ fontWeight: 500 }}>{index + 1}</td>
                                    <td style={{ color: '#3b82f6', fontWeight: 500 }}>{row.tr_no ?? '—'}</td>
                                    <td style={{ fontWeight: 600 }}>{row.container_number ?? '—'}</td>
                                    <td className="mono-text">{row.lock_number ?? '—'}</td>
                                    <td className="mono-text" style={{ color: '#64748b' }}>{row.lr_no ?? '—'}</td>
                                    <td className="mono-text">{row.date ?? '—'}</td>
                                    <td className="mono-text">{row.elock_return_date ?? '—'}</td>
                                    <td>
                                        <span className={`status-pill ${row.elock_assign_status === 'ACTIVE' ? 'success' : row.elock_assign_status === 'RETURNED' ? 'info' : row.elock_assign_status === 'MAINTENANCE' ? 'error' : 'warning'}`}>
                                            {row.elock_assign_status ?? '—'}
                                        </span>
                                    </td>
                                    <td>{row.available_locks_this_date ?? '—'}</td>
                                    <td>{row.maintenance_locks_this_date ?? '—'}</td>
                                    <td style={{ fontWeight: 600 }}>{row.locks_used_this_date ?? '—'}</td>
                                    <td style={{ color: '#475569' }}>{row.location ?? '—'}</td>
                                    <td style={{ fontWeight: 500 }}>{row.customer_name ?? '—'}</td>
                                    <td>
                                        <span className="handler-tag">{row.elock_assign ?? '—'}</span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="14" style={{ textAlign: 'center', color: '#6b7280', padding: '30px' }}>
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
