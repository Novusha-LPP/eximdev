import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import {
    ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine
} from 'recharts';
import { getTransportDates, TRANSPORT_BASE, TRANSPORT_HEADERS } from './reports-helper';

const FleetTrendTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        let formattedDate = data.date || '';
        try {
            if (data.date) {
                formattedDate = format(new Date(data.date), 'dd MMMM yyyy');
            }
        } catch (e) {
            console.error("Invalid date in FleetTrendTooltip", e);
        }
        return (
            <div className="custom-chart-tooltip">
                <p className="tooltip-title">{formattedDate}</p>
                <p className="tooltip-value">
                    <span className="tooltip-bullet" style={{ backgroundColor: '#3b82f6' }}></span>
                    On Road: <strong>{data.onRoadPercent ?? 0}%</strong>
                </p>
                <p className="tooltip-value">
                    <span className="tooltip-bullet" style={{ backgroundColor: '#10b981' }}></span>
                    Trips: <strong>{data.noOfTrips ?? 0}</strong>
                </p>
                {data.outsourcedTotal != null && (
                    <p className="tooltip-value">
                        <span className="tooltip-bullet" style={{ backgroundColor: '#8b5cf6' }}></span>
                        Outsourced: <strong>{data.outsourcedTotal}</strong>
                    </p>
                )}
            </div>
        );
    }
    return null;
};

const FleetUtilizationReport = ({
    filterType,
    selectedMonth,
    selectedYear,
    selectedQuarter,
    dateRange,
    selectedDay
}) => {
    const [fleetData, setFleetData] = useState({ summary: {}, rows: [] });
    const [loading, setLoading] = useState(true);
    const [expandedFleetRows, setExpandedFleetRows] = useState({});

    useEffect(() => {
        const fetchFleet = async () => {
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
                if (!startDate || !endDate) {
                    setLoading(false);
                    return;
                }
                const res = await axios.get(`${TRANSPORT_BASE}/api/fleet/utilization-report`, {
                    params: { startDate, endDate },
                    headers: TRANSPORT_HEADERS,
                    withCredentials: true
                });
                const d = res.data;
                if (d) {
                    const inner = d.data ?? d;
                    const rows = Array.isArray(inner?.dailyRows) ? inner.dailyRows
                        : Array.isArray(inner?.rows) ? inner.rows
                        : Array.isArray(inner?.report) ? inner.report
                         : Array.isArray(inner?.daily) ? inner.daily
                        : Array.isArray(inner) ? inner
                        : [];
                    const summary = inner?.summary ?? d?.summary ?? {};
                    setFleetData({ summary, rows });
                }
            } catch (err) {
                console.error("Error fetching fleet report:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchFleet();
    }, [filterType, selectedMonth, selectedYear, selectedQuarter, dateRange, selectedDay]);

    const toggleFleetRow = (index) => {
        setExpandedFleetRows(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const fleetChartData = useMemo(() => {
        if (!fleetData.rows || fleetData.rows.length === 0) return [];
        return [...fleetData.rows].sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [fleetData.rows]);

    const fleetSummaryObj = useMemo(() => {
        if (filterType === 'day') {
            const dayRow = fleetData.rows?.find(r => r.date === selectedDay);
            if (dayRow) {
                return {
                    fleetSize: dayRow.totalFleet ?? '—',
                    onRoadPercent: dayRow.onRoadPercent ?? 0,
                    trips: dayRow.noOfTrips ?? 0,
                    outsourced: dayRow.outsourcedTotal ?? 0,
                    vehiclesNotOnRoad: dayRow.vehiclesNotOnRoadTotal ?? 0,
                    idlePercent: dayRow.idlePercent ?? 0,
                    totalDays: 1
                };
            }
            return { fleetSize: '—', onRoadPercent: '—', trips: '—', outsourced: '—', vehiclesNotOnRoad: '—', idlePercent: '—', totalDays: 1 };
        } else {
            return {
                fleetSize: fleetData.summary?.fleetSize ?? fleetData.rows?.[0]?.totalFleet ?? '—',
                onRoadPercent: fleetData.summary?.avgPerDay?.onRoadPercent ?? '—',
                trips: fleetData.summary?.avgPerDay?.trips ?? '—',
                projectedTrips: fleetData.summary?.projectedTrips ?? '—',
                totalDays: fleetData.summary?.totalDays ?? fleetData.rows?.length ?? 0
            };
        }
    }, [fleetData, filterType, selectedDay]);

    const displayedFleetRows = useMemo(() => {
        if (filterType === 'day') {
            return (fleetData.rows || []).filter(row => row.date === selectedDay);
        }
        return fleetData.rows || [];
    }, [fleetData.rows, filterType, selectedDay]);

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
            <div className="nucleus-stats-card" style={{ borderLeft: '4px solid #3b82f6', background: 'linear-gradient(90deg, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.01) 100%)' }}>
                <div className="stats-text" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                    <div>
                        Fleet Size: <span className="highlight-val" style={{ color: '#3b82f6' }}>{fleetSummaryObj.fleetSize}</span>
                    </div>
                    <div>
                        {filterType === 'day' ? 'On Road %' : 'Avg On Road %'}: <span className="highlight-val" style={{ color: '#10b981' }}>{fleetSummaryObj.onRoadPercent}%</span>
                    </div>
                    <div>
                        {filterType === 'day' ? 'Trips' : 'Avg Trips / Day'}: <span className="highlight-val" style={{ color: '#f59e0b' }}>{fleetSummaryObj.trips}</span>
                    </div>
                    {filterType === 'day' ? (
                        <>
                            <div>
                                Outsourced: <span className="highlight-val" style={{ color: '#8b5cf6' }}>{fleetSummaryObj.outsourced}</span>
                            </div>
                            <div>
                                Not on Road: <span className="highlight-val" style={{ color: '#ef4444' }}>{fleetSummaryObj.vehiclesNotOnRoad}</span>
                            </div>
                            <div>
                                Idle %: <span className="highlight-val" style={{ color: '#64748b' }}>{fleetSummaryObj.idlePercent}%</span>
                            </div>
                        </>
                    ) : (
                        <div>
                            Projected Trips: <span className="highlight-val" style={{ color: '#8b5cf6' }}>{fleetSummaryObj.projectedTrips}</span>
                        </div>
                    )}
                    <div style={{ marginLeft: 'auto' }}>
                        {filterType === 'day' ? 'Selected Day' : 'Total Days'}: <span className="highlight-val" style={{ color: 'var(--text-color)' }}>{filterType === 'day' ? selectedDay : fleetSummaryObj.totalDays}</span>
                    </div>
                </div>
            </div>

            {/* Graphs */}
            <div className="analytics-graphs-container">
                <div className="analytics-graph-card">
                    <div className="graph-card-header">
                        <h3>Fleet Utilization Trend</h3>
                        <span className="graph-subtitle">Daily On-Road Percentage and Total Trips</span>
                    </div>
                    <div style={{ width: '100%', height: 280 }}>
                        <ResponsiveContainer>
                            <AreaChart
                                data={fleetChartData}
                                margin={{ top: 10, right: -5, left: -20, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="colorOnRoad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
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
                                <YAxis yAxisId="left" stroke="#3b82f6" fontSize={11} tickLine={false} domain={[0, 100]} unit="%"/>
                                <YAxis yAxisId="right" orientation="right" stroke="#10b981" fontSize={11} tickLine={false} allowDecimals={false}/>
                                <Tooltip content={<FleetTrendTooltip />} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                {filterType === 'day' && selectedDay && (
                                    <ReferenceLine 
                                        yAxisId="left"
                                        x={selectedDay} 
                                        stroke="#f59e0b" 
                                        strokeWidth={2} 
                                        strokeDasharray="5 5" 
                                        label={{ value: 'Selected', position: 'top', fill: '#d97706', fontSize: 10, fontWeight: 600 }}
                                    />
                                )}
                                <Area yAxisId="left" type="monotone" name="On Road %" dataKey="onRoadPercent" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOnRoad)"/>
                                <Area yAxisId="right" type="monotone" name="Total Trips" dataKey="noOfTrips" stroke="#10b981" strokeWidth={2} fill="none"/>
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                
                <div className="analytics-graph-card">
                    <div className="graph-card-header">
                        <h3>Non-Operational Vehicle Breakdown</h3>
                        <span className="graph-subtitle">Breakdown of off-road vehicle counts</span>
                    </div>
                    <div style={{ width: '100%', height: 280 }}>
                        <ResponsiveContainer>
                            <BarChart
                                data={fleetChartData}
                                margin={{ top: 10, right: 0, left: -25, bottom: 0 }}
                            >
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
                                />
                                <Legend iconType="rect" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                {filterType === 'day' && selectedDay && (
                                    <ReferenceLine 
                                        x={selectedDay} 
                                        stroke="#f59e0b" 
                                        strokeWidth={2} 
                                        strokeDasharray="5 5" 
                                        label={{ value: 'Selected', position: 'top', fill: '#d97706', fontSize: 10, fontWeight: 600 }}
                                    />
                                )}
                                <Bar name="Breakdown" dataKey="breakdown" stackId="offroad" fill="#ef4444" radius={[0, 0, 0, 0]}/>
                                <Bar name="Maintenance" dataKey="maintenance" stackId="offroad" fill="#f97316" radius={[0, 0, 0, 0]}/>
                                <Bar name="Driver Leave" dataKey="driverOnLeave" stackId="offroad" fill="#3b82f6" radius={[0, 0, 0, 0]}/>
                                <Bar name="Accident" dataKey="accident" stackId="offroad" fill="#64748b" radius={[0, 0, 0, 0]}/>
                                <Bar name="No Driver" dataKey="noDriver" stackId="offroad" fill="#a855f7" radius={[4, 4, 0, 0]}/>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="nucleus-table-wrapper">
                <table className="nucleus-table">
                    <thead>
                        <tr>
                            <th style={{ minWidth: '40px' }}></th>
                            <th style={{ position: 'sticky', left: 0, background: '#f8fafc', zIndex: 2 }}>Day</th>
                            <th>Date</th>
                            <th>Total Fleet</th>
                            <th>On Road %</th>
                            <th>Dispatch Status</th>
                            <th>Own vs O/S %</th>
                            <th>O/S Status</th>
                            <th>Automove</th>
                            <th>SRCC 20ft</th>
                            <th>SRCC 40ft</th>
                            <th>O/S Total</th>
                            <th>Idle %</th>
                            <th>Breakdown</th>
                            <th>Maint.</th>
                            <th>Driver Leave</th>
                            <th>Accident</th>
                            <th>No Driver</th>
                            <th>Not on Road</th>
                            <th>Kho. O-20</th>
                            <th>Kho. O-40</th>
                            <th>Kho. OS-20</th>
                            <th>Kho. OS-40</th>
                            <th>San. O-20</th>
                            <th>San. O-40</th>
                            <th>San. OS-20</th>
                            <th>San. OS-40</th>
                            <th>Mun. O-20</th>
                            <th>Mun. O-40</th>
                            <th>Mun. OS-20</th>
                            <th>Mun. OS-40</th>
                            <th>Air. O</th>
                            <th>Air. OS</th>
                            <th>Sac. O-20</th>
                            <th>Sac. OS-20</th>
                            <th>Haz. O-20</th>
                            <th>Haz. O-40</th>
                            <th>Haz. OS-20</th>
                            <th>Haz. OS-40</th>
                            <th>No. Trips</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedFleetRows?.length > 0 ? (
                            displayedFleetRows.map((row, index) => {
                                const tripRows = row.rows || [];
                                const hasTrips = tripRows.length > 0;
                                const isExpanded = expandedFleetRows[index];
                                return (
                                    <React.Fragment key={index}>
                                        <tr>
                                            <td style={{ textAlign: 'center', background: '#fff', position: 'sticky', left: 0, zIndex: 2 }}>
                                                {hasTrips && (
                                                    <button onClick={() => toggleFleetRow(index)} style={{ background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.3)', color: '#3b82f6', borderRadius: '4px', padding: '2px 7px', cursor: 'pointer', fontSize: '11px', fontFamily: 'monospace' }} title={`${tripRows.length} trips`}>
                                                        {isExpanded ? '▼' : '▶'}
                                                    </button>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'left', fontWeight: 600, background: '#fff', position: 'sticky', left: '40px', zIndex: 2 }}>{row.dayName ?? '—'}</td>
                                            <td className="mono-text">{row.date ?? '—'}</td>
                                            <td style={{ fontWeight: 600 }}>{row.totalFleet ?? '—'}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <div style={{ width: '50px', background: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${row.onRoadPercent ?? 0}%`, height: '100%', background: '#3b82f6' }}></div>
                                                    </div>
                                                    <span style={{ fontSize: '11px', fontWeight: 600 }}>{row.onRoadPercent ?? 0}%</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status-pill ${row.onRoadStatus === 'GREEN' ? 'success' : row.onRoadStatus === 'YELLOW' ? 'warning' : 'error'}`}>{row.onRoadStatus ?? '—'}</span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <div style={{ width: '50px', background: '#e2e8f0', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${row.ownVsOutsourcedPercent ?? 0}%`, height: '100%', background: '#8b5cf6' }}></div>
                                                    </div>
                                                    <span style={{ fontSize: '11px', fontWeight: 600 }}>{row.ownVsOutsourcedPercent ?? 0}%</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`status-pill ${row.ownVsOutsourcedStatus === 'GREEN' ? 'success' : row.ownVsOutsourcedStatus === 'YELLOW' ? 'warning' : 'error'}`}>{row.ownVsOutsourcedStatus ?? '—'}</span>
                                            </td>
                                            <td>{row.automoveDispatched ?? '—'}</td>
                                            <td>{row.srccDispatched20ft ?? '—'}</td>
                                            <td>{row.srccDispatched40ft ?? '—'}</td>
                                            <td style={{ fontWeight: 600, color: '#3b82f6' }}>{row.outsourcedTotal ?? '—'}</td>
                                            <td className="mono-text">{row.idlePercent != null ? `${row.idlePercent}%` : '—'}</td>
                                            <td>{row.breakdown ?? '—'}</td>
                                            <td>{row.maintenance ?? '—'}</td>
                                            <td>{row.driverOnLeave ?? '—'}</td>
                                            <td>{row.accident ?? '—'}</td>
                                            <td>{row.noDriver ?? '—'}</td>
                                            <td style={{ fontWeight: 600, color: '#ef4444' }}>{row.vehiclesNotOnRoadTotal ?? '—'}</td>
                                            
                                            {/* Locations */}
                                            <td>{row.locations?.khodiyar?.own20ft ?? '—'}</td>
                                            <td>{row.locations?.khodiyar?.own40ft ?? '—'}</td>
                                            <td>{row.locations?.khodiyar?.outsourced20ft ?? '—'}</td>
                                            <td>{row.locations?.khodiyar?.outsourced40ft ?? '—'}</td>
                                            <td>{row.locations?.sanand?.own20ft ?? '—'}</td>
                                            <td>{row.locations?.sanand?.own40ft ?? '—'}</td>
                                            <td>{row.locations?.sanand?.outsourced20ft ?? '—'}</td>
                                            <td>{row.locations?.sanand?.outsourced40ft ?? '—'}</td>
                                            <td>{row.locations?.mundra?.own20ft ?? '—'}</td>
                                            <td>{row.locations?.mundra?.own40ft ?? '—'}</td>
                                            <td>{row.locations?.mundra?.outsourced20ft ?? '—'}</td>
                                            <td>{row.locations?.mundra?.outsourced40ft ?? '—'}</td>
                                            <td>{row.locations?.airport?.own ?? '—'}</td>
                                            <td>{row.locations?.airport?.outsourced ?? '—'}</td>
                                            <td>{row.locations?.sachana?.own20ft ?? '—'}</td>
                                            <td>{row.locations?.sachana?.outsourced20ft ?? '—'}</td>
                                            <td>{row.locations?.hazira?.own20ft ?? '—'}</td>
                                            <td>{row.locations?.hazira?.own40ft ?? '—'}</td>
                                            <td>{row.locations?.hazira?.outsourced20ft ?? '—'}</td>
                                            <td>{row.locations?.hazira?.outsourced40ft ?? '—'}</td>
                                            
                                            <td style={{ fontWeight: 600, background: '#f8fafc' }}>{row.noOfTrips ?? '—'}</td>
                                        </tr>
                                        {isExpanded && hasTrips && (
                                            <tr>
                                                <td colSpan="39" style={{ padding: 0, background: '#f8fafc' }}>
                                                    <div style={{ margin: '8px 8px 8px 40px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                                                        <div style={{ background: 'rgba(99,102,241,.08)', padding: '8px 14px', fontFamily: 'monospace', fontSize: '11px', letterSpacing: '.8px', color: '#6366f1', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>
                                                            ▸ {tripRows.length} Trip Records for {row.date}
                                                        </div>
                                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                                            <thead>
                                                                <tr style={{ background: '#f1f5f9' }}>
                                                                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>#</th>
                                                                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>TR / LR No</th>
                                                                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>Container No</th>
                                                                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>Vehicle Type</th>
                                                                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#64748b', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>Ownership</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {tripRows.map((t, ti) => (
                                                                    <tr key={ti} style={{ borderBottom: '1px solid #f1f5f9', background: ti % 2 === 1 ? '#f8fafc' : '#fff' }}>
                                                                        <td style={{ padding: '6px 12px', color: '#94a3b8' }}>{ti + 1}</td>
                                                                        <td style={{ padding: '6px 12px', color: '#3b82f6', fontWeight: 500 }}>{t.tr_no ?? '—'}</td>
                                                                        <td style={{ padding: '6px 12px', fontWeight: 500 }}>{t.container_number ?? '—'}</td>
                                                                        <td style={{ padding: '6px 12px', color: '#64748b' }}>{t.vehicle_type ?? '—'}</td>
                                                                        <td style={{ padding: '6px 12px' }}>
                                                                            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: t.ownership === 'Own' ? 'rgba(34,197,94,.1)' : 'rgba(245,158,11,.1)', color: t.ownership === 'Own' ? '#16a34a' : '#d97706', border: `1px solid ${t.ownership === 'Own' ? 'rgba(34,197,94,.2)' : 'rgba(245,158,11,.2)'}`, fontWeight: 600 }}>
                                                                                {t.ownership ?? '—'}
                                                                            </span>
                                                                        </td>
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
                            })
                        ) : (
                            <tr>
                                <td colSpan="40" style={{ textAlign: 'center', color: '#6b7280', padding: '30px' }}>
                                    No fleet data found for the selected period.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FleetUtilizationReport;
