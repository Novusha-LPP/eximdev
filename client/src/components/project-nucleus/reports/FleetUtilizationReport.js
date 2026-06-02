import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import {
    ResponsiveContainer, ComposedChart, AreaChart, Area, BarChart, Bar, Cell, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine
} from 'recharts';
import { getTransportDates, TRANSPORT_BASE, TRANSPORT_HEADERS } from './reports-helper';

const monthNames = [
    { key: '4', name: 'Apr' },
    { key: '5', name: 'May' },
    { key: '6', name: 'Jun' },
    { key: '7', name: 'Jul' },
    { key: '8', name: 'Aug' },
    { key: '9', name: 'Sep' },
    { key: '10', name: 'Oct' },
    { key: '11', name: 'Nov' },
    { key: '12', name: 'Dec' },
    { key: '1', name: 'Jan' },
    { key: '2', name: 'Feb' },
    { key: '3', name: 'Mar' }
];

// --- Sub-components & Helpers for Status and Labels ---
const StatusPill = ({ status, otherText }) => {
    const s = (status || '').trim();
    if (s === 'No Driver') return <span className="status-pill warning">No driver</span>;
    if (s === 'Driver on Leave') return <span className="status-pill error">Driver on leave</span>;
    if (s === 'Maintenance') return <span className="status-pill info">Maintenance</span>;
    if (s === 'Accident') return <span className="status-pill error">Accident</span>;
    return <span className="status-pill neutral">{otherText || status || '—'}</span>;
};

const IePill = ({ type }) => {
    const cls = type === 'Import' ? 'info' : type === 'Export' ? 'success' : 'neutral';
    return <span className={`status-pill ${cls}`}>{type || '—'}</span>;
};

const OwnPill = ({ ownHired }) => {
    const isOwn = (ownHired || '').toLowerCase().trim() === 'own';
    return (
        <span className={`status-pill ${isOwn ? 'success' : 'neutral'}`}>
            {isOwn ? 'Own' : 'Hired'}
        </span>
    );
};

// Custom Tooltip for Fleet Utilization Trend Charts
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
                {payload.map((p, idx) => (
                    <p key={idx} className="tooltip-value">
                        <span className="tooltip-bullet" style={{ backgroundColor: p.color }}></span>
                        {p.name}: <strong>{p.value}</strong>
                    </p>
                ))}
                {data.totalFleet && (
                    <p className="tooltip-value" style={{ borderTop: '1px solid rgba(241, 245, 249, 0.5)', paddingTop: '4px', marginTop: '4px', fontWeight: 600 }}>
                        Total Fleet: <strong>{data.totalFleet}</strong>
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
    const isSingleDay = filterType === 'day' || (filterType === 'custom' && dateRange?.start && dateRange?.end && dateRange.start === dateRange.end);
    const [reportData, setReportData] = useState({ totalFleet: 'NA', dispatch: [] });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');

    // Fleet Summary Specific States
    const [fleetSummaryData, setFleetSummaryData] = useState(null);
    const [fleetSummaryLoading, setFleetSummaryLoading] = useState(false);
    const [fleetSummaryError, setFleetSummaryError] = useState(null);
    const [fleetSearchQuery, setFleetSearchQuery] = useState('');
    const [fleetSortConfig, setFleetSortConfig] = useState({ key: 'total', direction: 'desc' });
    const [comparisonData, setComparisonData] = useState({
        prevTotalTrips: 0,
        prevMundraTrips: 0,
        prevAvgTrips: 0,
        prevMundraAvg: 0
    });

    // Fetch report data on filter changes
    useEffect(() => {
        const fetchReport = async () => {
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
                let start = startDate;
                let end = endDate;
                if (start) params.startDate = start;
                if (end) params.endDate = end;

                let rawDispatch = null;
                let totalFleet = 'NA';

                // Fetch previous month's data for comparison if filterType is month or day
                let prevTotalTrips = 0;
                let prevMundraTrips = 0;
                let prevAvgTrips = 0;
                let prevMundraAvg = 0;

                if (filterType === 'month' || filterType === 'day') {
                    try {
                        const selYear = parseInt(selectedYear) || 2026;
                        const selMonth = parseInt(selectedMonth) || 5;
                        const prevYear = selMonth === 0 ? selYear - 1 : selYear;
                        const prevMonth = selMonth === 0 ? 11 : selMonth - 1;
                        
                        const prevDays = new Date(prevYear, prevMonth + 1, 0).getDate();
                        const prevStart = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`;
                        const prevEnd = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(prevDays).padStart(2, '0')}`;

                        const prevParams = { startDate: prevStart, endDate: prevEnd };
                        const resPrev = await axios.get(`${TRANSPORT_BASE}/api/vehicle-dsr/dispatch-range`, {
                            params: prevParams,
                            headers: TRANSPORT_HEADERS,
                            withCredentials: true
                        });

                        if (resPrev && resPrev.data && resPrev.data.success) {
                            const prevClosed = resPrev.data.closedLRs || [];
                            prevTotalTrips = prevClosed.length;
                            prevMundraTrips = prevClosed.filter(r => (r.branch || '').toLowerCase().includes('mundra')).length;
                            
                            prevAvgTrips = prevTotalTrips / prevDays;
                            prevMundraAvg = prevMundraTrips / prevDays;
                        }
                    } catch (prevErr) {
                        console.error("Error fetching previous month data for KPI comparison:", prevErr);
                    }
                }
                setComparisonData({ prevTotalTrips, prevMundraTrips, prevAvgTrips, prevMundraAvg });

                // 1. Fetch dispatch data from new API (returns fleetStatus, activeLRs, closedLRs, exceptions directly)
                try {
                    const resDispatch = await axios.get(`${TRANSPORT_BASE}/api/vehicle-dsr/dispatch-range`, {
                        params,
                        headers: TRANSPORT_HEADERS,
                        withCredentials: true
                    });
                    if (resDispatch && resDispatch.data && resDispatch.data.success) {
                        rawDispatch = resDispatch.data;
                    }
                } catch (err) {
                    console.error("Error fetching dispatch range from new API:", err);
                }

                // 2. Fetch fleet size from old API
                try {
                    const resFleet = await axios.get(`${TRANSPORT_BASE}/api/fleet/utilization-report`, {
                        params,
                        headers: TRANSPORT_HEADERS,
                        withCredentials: true
                    });
                    if (resFleet && resFleet.data && resFleet.data.success && resFleet.data.data) {
                        totalFleet = resFleet.data.data.totalFleet || 'NA';
                    }
                } catch (err) {
                    console.error("Error fetching fleet size from old API:", err);
                }

                // Fallback for totalFleet if old API failed but new API has it
                if (totalFleet === 'NA' && rawDispatch && rawDispatch.totalFleet && rawDispatch.totalFleet !== 'NA') {
                    totalFleet = rawDispatch.totalFleet;
                }

                // Map the flat range data back into the daily dispatch objects expected by the UI
                let dailyDispatches = [];
                if (rawDispatch) {
                    let datesList = [];
                    if (params.startDate && params.endDate) {
                        try {
                            let current = new Date(params.startDate);
                            const end = new Date(params.endDate);
                            current.setHours(12, 0, 0, 0);
                            end.setHours(12, 0, 0, 0);
                            while (current <= end) {
                                datesList.push(current.toISOString().slice(0, 10));
                                current.setDate(current.getDate() + 1);
                            }
                        } catch (e) {
                            console.error("Error generating dates list", e);
                        }
                    }

                    const rawFleet = rawDispatch.fleetStatus || [];
                    const rawClosed = rawDispatch.closedLRs || [];
                    const rawActive = rawDispatch.activeLRs || [];
                    const rawExceptions = rawDispatch.exceptions || [];

                    // Fallback to unique dates in the data if range is invalid/empty
                    if (datesList.length === 0) {
                        const uniqueDates = new Set();
                        if (params.startDate) uniqueDates.add(params.startDate);
                        if (params.endDate) uniqueDates.add(params.endDate);
                        rawFleet.forEach(x => { if (x.date) uniqueDates.add(x.date.slice(0, 10)); });
                        rawClosed.forEach(x => { if (x.dispatchClosedDate) uniqueDates.add(x.dispatchClosedDate.slice(0, 10)); });
                        rawActive.forEach(x => { if (x.lr_date) uniqueDates.add(x.lr_date.slice(0, 10)); });
                        rawExceptions.forEach(x => { if (x.date) uniqueDates.add(x.date.slice(0, 10)); });
                        datesList = Array.from(uniqueDates).sort();
                    }

                    if (datesList.length === 0) {
                        datesList = [new Date().toISOString().slice(0, 10)];
                    }

                    const firstDateStr = datesList[0];
                    const lastDateStr = datesList[datesList.length - 1];

                    dailyDispatches = datesList.map(dateStr => {
                        const dayFleet = rawFleet.filter(x => {
                            if (!x.date) return false;
                            const itemDateStr = x.date.slice(0, 10);
                            if (itemDateStr === dateStr) return true;
                            if (dateStr === firstDateStr && itemDateStr < firstDateStr) return true;
                            if (dateStr === lastDateStr && itemDateStr > lastDateStr) return true;
                            return false;
                        });

                        const dayClosed = rawClosed.filter(x => {
                            if (!x.dispatchClosedDate) return false;
                            const itemDateStr = x.dispatchClosedDate.slice(0, 10);
                            if (itemDateStr === dateStr) return true;
                            if (dateStr === firstDateStr && itemDateStr < firstDateStr) return true;
                            if (dateStr === lastDateStr && itemDateStr > lastDateStr) return true;
                            return false;
                        });

                        const dayActive = rawActive.filter(x => {
                            if (!x.lr_date) return false;
                            const itemDateStr = x.lr_date.slice(0, 10);
                            if (itemDateStr === dateStr) return true;
                            if (dateStr === firstDateStr && itemDateStr < firstDateStr) return true;
                            if (dateStr === lastDateStr && itemDateStr > lastDateStr) return true;
                            return false;
                        });

                        const dayExceptions = rawExceptions.filter(x => {
                            if (!x.date) return false;
                            const itemDateStr = x.date.slice(0, 10);
                            if (itemDateStr === dateStr) return true;
                            if (dateStr === firstDateStr && itemDateStr < firstDateStr) return true;
                            if (dateStr === lastDateStr && itemDateStr > lastDateStr) return true;
                            return false;
                        });

                        return {
                            date: `${dateStr}T00:00:00.000Z`,
                            fleetStatus: dayFleet,
                            activeLRs: dayActive,
                            closedLRs: dayClosed,
                            exceptions: dayExceptions
                        };
                    });
                }

                setReportData({
                    totalFleet,
                    dispatch: dailyDispatches
                });
            } catch (err) {
                console.error("Error fetching fleet utilization report:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [filterType, selectedMonth, selectedYear, selectedQuarter, dateRange, selectedDay]);

    // Fetch Fleet Summary when activeTab is 'fleet-summary' or selectedYear changes
    useEffect(() => {
        if (activeTab !== 'fleet-summary') return;

        const fetchFleetSummary = async () => {
            setFleetSummaryLoading(true);
            setFleetSummaryError(null);
            try {
                const res = await axios.get(`${TRANSPORT_BASE}/api/vehicle-dsr/fleet-summary`, {
                    params: { fyStartYear: selectedYear || 2026 },
                    headers: TRANSPORT_HEADERS,
                    withCredentials: true
                });
                if (res.data && res.data.success) {
                    setFleetSummaryData(res.data.data);
                } else {
                    setFleetSummaryError("Failed to fetch fleet summary details");
                }
            } catch (err) {
                console.error("Error fetching fleet summary:", err);
                setFleetSummaryError(err.message || "An error occurred while fetching fleet summary");
            } finally {
                setFleetSummaryLoading(false);
            }
        };

        fetchFleetSummary();
    }, [selectedYear, activeTab]);

    // Format dispatches array safely
    const dispatches = useMemo(() => {
        if (!reportData.dispatch) return [];
        return Array.isArray(reportData.dispatch) ? reportData.dispatch : [reportData.dispatch];
    }, [reportData.dispatch]);

    // Parse and memoize the total fleet size number
    const totalFleetNum = useMemo(() => {
        return parseInt(reportData.totalFleet) || 0;
    }, [reportData.totalFleet]);

    // 4. Daily Aggregation for Trend & Spreadsheet Analysis (Moved up to prevent TDZ error in metrics)
    const dailyData = useMemo(() => {
        return dispatches.map(d => {
            const dateStr = d.date ? d.date.slice(0, 10) : '—';
            const fleet = d.fleetStatus || [];
            const active = d.activeLRs || [];
            const closed = d.closedLRs || [];

            const breakdown = fleet.filter(v => v.status === 'Breakdown').length;
            const maintenance = fleet.filter(v => v.status === 'Maintenance').length;
            const leave = fleet.filter(v => v.status === 'Driver on Leave').length;
            const accident = fleet.filter(v => v.status === 'Accident' || v.status === 'Accidents').length;
            const noDriver = fleet.filter(v => v.status === 'No Driver').length;
            const others = fleet.filter(v => !['Breakdown', 'Maintenance', 'Driver on Leave', 'Accident', 'Accidents', 'No Driver'].includes(v.status)).length;

            const notOnRoadTotal = fleet.length;
            const usedForTrips = Math.max(0, totalFleetNum - notOnRoadTotal);
            const oorPercentVal = totalFleetNum > 0 ? parseFloat(((usedForTrips / totalFleetNum) * 100).toFixed(1)) : 0;
            const oorPercent = `${oorPercentVal.toFixed(1)}%`;

            const ownTripsCount = closed.filter(r => (r.own_hired || '').toLowerCase().trim() === 'own').length;
            const idle = Math.max(0, totalFleetNum - notOnRoadTotal - ownTripsCount);

            const automove = [...active, ...closed].filter(r => (r.branch || '').toLowerCase().trim() === 'automove').length;
            const snContainer = [...active, ...closed].filter(r => (r.branch || '').toLowerCase().trim() !== 'automove').length;

            const ownClosed20 = closed.filter(r => (r.own_hired || '').toLowerCase().trim() === 'own' && ((r.type_of_vehicle || '').includes('20') || (r.type_of_vehicle || '').includes('20ft'))).length;
            const ownClosed40 = closed.filter(r => (r.own_hired || '').toLowerCase().trim() === 'own' && ((r.type_of_vehicle || '').includes('40') || (r.type_of_vehicle || '').includes('40ft'))).length;

            const outsourced20 = [...active, ...closed].filter(r => (r.own_hired || '').toLowerCase().trim() === 'hired' && ((r.type_of_vehicle || '').includes('20') || (r.type_of_vehicle || '').includes('20ft'))).length;
            const outsourced40 = [...active, ...closed].filter(r => (r.own_hired || '').toLowerCase().trim() === 'hired' && ((r.type_of_vehicle || '').includes('40') || (r.type_of_vehicle || '').includes('40ft'))).length;
            const outsourcedTotal = outsourced20 + outsourced40;

            const ownTrips = [...active, ...closed].filter(r => (r.own_hired || '').toLowerCase().trim() === 'own').length;
            const hiredTrips = [...active, ...closed].filter(r => (r.own_hired || '').toLowerCase().trim() === 'hired').length;

            return {
                date: d.date,
                dateStr,
                totalFleet: totalFleetNum,
                activeCount: ownTripsCount,
                idleCount: idle,
                oosCount: notOnRoadTotal,
                utilPercent: oorPercentVal,
                breakdown,
                maintenance,
                leave,
                accident,
                noDriver,
                others,
                usedForTrips,
                oorPercent,
                automove,
                snContainer,
                activeLRs: active.length,
                ownClosed20,
                ownClosed40,
                ownTrips,
                hiredTrips,
                outsourced20,
                outsourced40,
                outsourcedTotal,
                totalTrips: closed.length
            };
        }).sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [dispatches, totalFleetNum]);

    // 1. Dashboard specific aggregates
    const activeDispatch = useMemo(() => {
        if (!dispatches.length) return null;

        if (filterType === 'day' && selectedDay) {
            const found = dispatches.find(d => {
                if (!d.date) return false;
                const dDateStr = d.date.slice(0, 10);
                return dDateStr === selectedDay;
            });
            if (found) return found;
        }

        if (dispatches.length === 1) return dispatches[0];

        const fleetStatusMap = {};
        const activeLRs = [];
        const closedLRs = [];

        const sortedDispatches = [...dispatches].sort((a, b) => new Date(a.date) - new Date(b.date));

        sortedDispatches.forEach(d => {
            if (d.fleetStatus) {
                d.fleetStatus.forEach(v => {
                    fleetStatusMap[v.vehicleNumber] = v;
                });
            }
            if (d.activeLRs) activeLRs.push(...d.activeLRs);
            if (d.closedLRs) closedLRs.push(...d.closedLRs);
        });

        return {
            date: dispatches[0].date,
            fleetStatus: Object.values(fleetStatusMap),
            activeLRs,
            closedLRs
        };
    }, [dispatches, filterType, selectedDay]);

    const fleetStatusList = useMemo(() => activeDispatch?.fleetStatus || [], [activeDispatch]);
    const activeLRsList = useMemo(() => activeDispatch?.activeLRs || [], [activeDispatch]);
    const closedLRsList = useMemo(() => activeDispatch?.closedLRs || [], [activeDispatch]);

    // Estimate/Project monthly trips for Month, Quarter, or Year selection
    const projectedMonthlyTrips = useMemo(() => {
        if (filterType !== 'month' && filterType !== 'quarter' && filterType !== 'year') return null;

        const today = new Date('2026-06-02T12:56:07+05:30'); // Using current local time
        const todayYear = 2026;
        const todayMonth = 5; // June is 5 (0-indexed)
        const todayDate = 2;

        const totalTrips = closedLRsList.length;

        if (filterType === 'month') {
            const selYear = parseInt(selectedYear) || todayYear;
            const selMonth = parseInt(selectedMonth); // 0-indexed
            
            const daysInMonth = new Date(selYear, selMonth + 1, 0).getDate();

            let elapsedDays = daysInMonth;
            if (selYear === todayYear && selMonth === todayMonth) {
                elapsedDays = Math.max(1, todayDate);
            } else if (selYear > todayYear || (selYear === todayYear && selMonth > todayMonth)) {
                elapsedDays = 0; // Future month
            }

            if (elapsedDays === 0) return 0;
            if (elapsedDays === daysInMonth) return totalTrips; // Month in the past is already completed
            
            return Math.round((totalTrips / elapsedDays) * daysInMonth);
        }

        if (filterType === 'quarter') {
            const selYear = parseInt(selectedYear) || todayYear;
            const q = parseInt(selectedQuarter) || 2;
            const startMonthOfQ = (q - 1) * 3;
            const endMonthOfQ = startMonthOfQ + 2;

            const qStart = new Date(selYear, startMonthOfQ, 1);
            const qEnd = new Date(selYear, endMonthOfQ + 1, 0);
            
            const totalDaysInQ = Math.round((qEnd - qStart) / (1000 * 60 * 60 * 24)) + 1;

            let elapsedDays = totalDaysInQ;

            if (selYear === todayYear) {
                if (todayMonth >= startMonthOfQ && todayMonth <= endMonthOfQ) {
                    const elapsedInQ = Math.round((today - qStart) / (1000 * 60 * 60 * 24)) + 1;
                    elapsedDays = Math.max(1, elapsedInQ);
                } else if (todayMonth < startMonthOfQ) {
                    elapsedDays = 0; // Future quarter
                }
            } else if (selYear > todayYear) {
                elapsedDays = 0; // Future year
            }

            if (elapsedDays === 0) return 0;

            const projectedTotalQTrips = (totalTrips / elapsedDays) * totalDaysInQ;
            return Math.round(projectedTotalQTrips / 3); // Average monthly trips in the quarter
        }

        if (filterType === 'year') {
            const selYear = parseInt(selectedYear) || todayYear;
            
            const yStart = new Date(selYear, 0, 1);
            const yEnd = new Date(selYear, 12, 0);
            
            const totalDaysInYear = Math.round((yEnd - yStart) / (1000 * 60 * 60 * 24)) + 1;

            let elapsedDays = totalDaysInYear;

            if (selYear === todayYear) {
                const elapsedInYear = Math.round((today - yStart) / (1000 * 60 * 60 * 24)) + 1;
                elapsedDays = Math.max(1, elapsedInYear);
            } else if (selYear > todayYear) {
                elapsedDays = 0; // Future year
            }

            if (elapsedDays === 0) return 0;

            const projectedTotalYTrips = (totalTrips / elapsedDays) * totalDaysInYear;
            return Math.round(projectedTotalYTrips / 12); // Average monthly trips in the year
        }

        return null;
    }, [filterType, selectedYear, selectedMonth, selectedQuarter, closedLRsList]);

    // Dynamic KPI Calculations for Average Trips Per Day & Projections (CR-003)
    const kpiMetricsObj = useMemo(() => {
        const today = new Date();
        const todayYear = today.getFullYear();
        const todayMonth = today.getMonth(); // 0-indexed
        const todayDate = today.getDate();

        let totalDays = 30;
        let elapsedDays = 30;

        const selYear = parseInt(selectedYear) || todayYear;

        if (filterType === 'month') {
            const selMonth = parseInt(selectedMonth); // 0-indexed
            totalDays = new Date(selYear, selMonth + 1, 0).getDate();
            if (selYear === todayYear && selMonth === todayMonth) {
                elapsedDays = Math.max(1, todayDate);
            } else if (selYear > todayYear || (selYear === todayYear && selMonth > todayMonth)) {
                elapsedDays = 0; // Future month
            } else {
                elapsedDays = totalDays; // Past month
            }
        } else if (filterType === 'quarter') {
            const q = parseInt(selectedQuarter) || 2;
            const startMonthOfQ = (q - 1) * 3;
            const endMonthOfQ = startMonthOfQ + 2;
            
            const qStart = new Date(selYear, startMonthOfQ, 1);
            const qEnd = new Date(selYear, endMonthOfQ + 1, 0);
            totalDays = Math.round((qEnd - qStart) / (1000 * 60 * 60 * 24)) + 1;

            if (selYear === todayYear) {
                if (todayMonth >= startMonthOfQ && todayMonth <= endMonthOfQ) {
                    const elapsedInQ = Math.round((today - qStart) / (1000 * 60 * 60 * 24)) + 1;
                    elapsedDays = Math.max(1, elapsedInQ);
                } else if (todayMonth < startMonthOfQ) {
                    elapsedDays = 0; // Future quarter
                } else {
                    elapsedDays = totalDays; // Past quarter
                }
            } else if (selYear > todayYear) {
                elapsedDays = 0; // Future year
            } else {
                elapsedDays = totalDays; // Past year
            }
        } else if (filterType === 'year') {
            const yStart = new Date(selYear, 0, 1);
            const yEnd = new Date(selYear, 12, 0);
            totalDays = Math.round((yEnd - yStart) / (1000 * 60 * 60 * 24)) + 1;

            if (selYear === todayYear) {
                const elapsedInYear = Math.round((today - yStart) / (1000 * 60 * 60 * 24)) + 1;
                elapsedDays = Math.max(1, elapsedInYear);
            } else if (selYear > todayYear) {
                elapsedDays = 0; // Future year
            } else {
                elapsedDays = totalDays; // Past year
            }
        } else if (filterType === 'day') {
            totalDays = 1;
            elapsedDays = 1;
        } else { // Custom range
            if (dateRange && dateRange.start && dateRange.end) {
                const start = new Date(dateRange.start);
                const end = new Date(dateRange.end);
                totalDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
                elapsedDays = totalDays;
            } else if (dailyData.length > 0) {
                totalDays = dailyData.length;
                elapsedDays = totalDays;
            }
        }

        const totalTrips = closedLRsList.length;
        const mundraTrips = closedLRsList.filter(r => (r.branch || '').toLowerCase().includes('mundra')).length;

        const avgTripsPerDay = elapsedDays > 0 ? totalTrips / elapsedDays : 0;
        const mundraAvgTripsPerDay = elapsedDays > 0 ? mundraTrips / elapsedDays : 0;

        const projectionAllPorts = avgTripsPerDay * totalDays;
        const projectionMundra = mundraAvgTripsPerDay * totalDays;

        // Compute performance percentages against previous month (comparisonData)
        const avgTripsPerf = comparisonData.prevAvgTrips > 0 ? (avgTripsPerDay / comparisonData.prevAvgTrips) * 100 : 100;
        const projectionAllPerf = comparisonData.prevTotalTrips > 0 ? (projectionAllPorts / comparisonData.prevTotalTrips) * 100 : 100;
        const projectionMundraPerf = comparisonData.prevMundraTrips > 0 ? (projectionMundra / comparisonData.prevMundraTrips) * 100 : 100;

        // Apply HSL color themes based on CR logic (Green >= 100%, Yellow >= 90%, Red < 90%)
        const getColorTheme = (perfVal) => {
            if (perfVal >= 100) {
                return {
                    color: '#059669',
                    bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, transparent 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    badgeBg: 'rgba(16, 185, 129, 0.1)',
                    performanceLabel: `↑ ${perfVal.toFixed(0)}% vs Last Month`
                };
            } else if (perfVal >= 90) {
                return {
                    color: '#d97706',
                    bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, transparent 100%)',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    badgeBg: 'rgba(245, 158, 11, 0.1)',
                    performanceLabel: `↓ ${perfVal.toFixed(0)}% vs Last Month`
                };
            } else {
                return {
                    color: '#dc2626',
                    bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, transparent 100%)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    badgeBg: 'rgba(239, 68, 68, 0.1)',
                    performanceLabel: `↓ ${perfVal.toFixed(0)}% vs Last Month`
                };
            }
        };

        return {
            avgTripsPerDay: avgTripsPerDay.toFixed(1),
            projectionAllPorts: Math.round(projectionAllPorts),
            projectionMundra: Math.round(projectionMundra),
            avgTripsTheme: getColorTheme(avgTripsPerf),
            projectionAllTheme: getColorTheme(projectionAllPerf),
            projectionMundraTheme: getColorTheme(projectionMundraPerf)
        };
    }, [filterType, selectedYear, selectedMonth, selectedQuarter, dateRange, closedLRsList, comparisonData, dailyData]);

    // Spreadsheet Totals/Summary Row (CR-004)
    const spreadsheetTotals = useMemo(() => {
        if (dailyData.length === 0) return null;
        let sumFleet = 0;
        let sumUsed = 0;
        let sumIdle = 0;
        let sumNotOnRoad = 0;
        let sumBrk = 0;
        let sumMaint = 0;
        let sumLeave = 0;
        let sumAcc = 0;
        let sumNoDrv = 0;
        let sumOth = 0;
        let sumAuto = 0;
        let sumSnc = 0;
        let sumActLr = 0;
        let sumOwn20 = 0;
        let sumOwn40 = 0;
        let sumOwnTr = 0;
        let sumHirTr = 0;
        let sumOut20 = 0;
        let sumOut40 = 0;
        let sumOutTot = 0;

        dailyData.forEach(d => {
            sumFleet += d.totalFleet || 0;
            sumUsed += d.usedForTrips || 0;
            sumIdle += d.idleCount || 0;
            sumNotOnRoad += d.oosCount || 0;
            sumBrk += d.breakdown || 0;
            sumMaint += d.maintenance || 0;
            sumLeave += d.leave || 0;
            sumAcc += d.accident || 0;
            sumNoDrv += d.noDriver || 0;
            sumOth += d.others || 0;
            sumAuto += d.automove || 0;
            sumSnc += d.snContainer || 0;
            sumActLr += d.activeLRs || 0;
            sumOwn20 += d.ownClosed20 || 0;
            sumOwn40 += d.ownClosed40 || 0;
            sumOwnTr += d.ownTrips || 0;
            sumHirTr += d.hiredTrips || 0;
            sumOut20 += d.outsourced20 || 0;
            sumOut40 += d.outsourced40 || 0;
            sumOutTot += d.outsourcedTotal || 0;
        });

        // Compute average On Road %
        const avgOnRoadPct = sumFleet > 0 ? ((sumUsed / sumFleet) * 100).toFixed(1) + '%' : '0.0%';

        return {
            totalFleet: Math.round(sumFleet / dailyData.length), // Average size
            usedForTrips: sumUsed,
            oorPercent: avgOnRoadPct,
            idleCount: sumIdle,
            oosCount: sumNotOnRoad,
            breakdown: sumBrk,
            maintenance: sumMaint,
            leave: sumLeave,
            accident: sumAcc,
            noDriver: sumNoDrv,
            others: sumOth,
            automove: sumAuto,
            snContainer: sumSnc,
            activeLRs: sumActLr,
            ownClosed20: sumOwn20,
            ownClosed40: sumOwn40,
            ownTrips: sumOwnTr,
            hiredTrips: sumHirTr,
            outsourced20: sumOut20,
            outsourced40: sumOut40,
            outsourcedTotal: sumOutTot
        };
    }, [dailyData]);



    // 2. Metrics & KPI computation
    const metrics = useMemo(() => {
        const totalTrips = closedLRsList.length;

        if (filterType === 'day' || dailyData.length <= 1) {
            const noDriver = fleetStatusList.filter(v => v.status === 'No Driver').length;
            const onLeave = fleetStatusList.filter(v => v.status === 'Driver on Leave').length;
            const maint = fleetStatusList.filter(v => v.status === 'Maintenance').length;
            const accident = fleetStatusList.filter(v => v.status === 'Accident').length;
            const others = fleetStatusList.filter(v => !['No Driver', 'Driver on Leave', 'Maintenance', 'Accident'].includes(v.status)).length;
            const notOnRoad = fleetStatusList.length;

            const ownTrips = closedLRsList.filter(r => (r.own_hired || '').toLowerCase().trim() === 'own').length;
            const idleVal = totalFleetNum > 0 ? Math.max(0, totalFleetNum - notOnRoad - ownTrips) : 'NA';
            const onRoadCount = Math.max(0, totalFleetNum - notOnRoad);

            const getPctStr = (val) => {
                if (totalFleetNum <= 0) return '';
                return `(${((val / totalFleetNum) * 100).toFixed(0)}%)`;
            };

            const onRoadPct = totalFleetNum > 0 ? (onRoadCount / totalFleetNum) * 100 : 0;
            const onRoadColor = onRoadPct >= 90 ? '#10b981' : onRoadPct >= 75 ? '#f59e0b' : '#ef4444';

            let idleColor = '#374151';
            if (idleVal !== 'NA') {
                const idleInt = parseInt(idleVal);
                idleColor = idleInt === 0 ? '#10b981' : idleInt <= 2 ? '#f59e0b' : '#ef4444';
            }

            return {
                fleetSize: totalFleetNum || 'NA',
                onRoadCount,
                onRoadPct: getPctStr(onRoadCount),
                onRoadColor,
                idleVal,
                idlePct: idleVal !== 'NA' ? getPctStr(idleVal) : '',
                idleColor,
                notOnRoad,
                notOnRoadPct: getPctStr(notOnRoad),
                noDriver,
                noDriverPct: getPctStr(noDriver),
                onLeave,
                onLeavePct: getPctStr(onLeave),
                maint,
                maintPct: getPctStr(maint),
                accident,
                accidentPct: getPctStr(accident),
                others,
                othersPct: getPctStr(others),
                totalTrips
            };
        } else {
            // Range calculation: cumulative sum of each day's status
            let sumFleetSize = 0;
            let sumOnRoad = 0;
            let sumIdle = 0;
            let sumNotOnRoad = 0;
            let sumNoDriver = 0;
            let sumLeave = 0;
            let sumMaint = 0;
            let sumAccident = 0;
            let sumOthers = 0;

            dailyData.forEach(d => {
                sumFleetSize += d.totalFleet;
                sumOnRoad += d.usedForTrips;
                sumIdle += d.idleCount;
                sumNotOnRoad += d.oosCount;
                sumNoDriver += d.noDriver;
                sumLeave += d.leave;
                sumMaint += d.maintenance;
                sumAccident += d.accident;
                sumOthers += d.others;
            });

            const getPctStr = (val) => {
                if (sumFleetSize <= 0) return '';
                return `(${((val / sumFleetSize) * 100).toFixed(0)}%)`;
            };

            const onRoadPct = sumFleetSize > 0 ? (sumOnRoad / sumFleetSize) * 100 : 0;
            const onRoadColor = onRoadPct >= 90 ? '#10b981' : onRoadPct >= 75 ? '#f59e0b' : '#ef4444';

            // Custom idle color logic for range cumulative sum (e.g. idle status count)
            let idleColor = '#374151';
            const idleInt = sumIdle;
            idleColor = idleInt === 0 ? '#10b981' : '#f59e0b';

            return {
                fleetSize: sumFleetSize || 'NA',
                onRoadCount: sumOnRoad,
                onRoadPct: getPctStr(sumOnRoad),
                onRoadColor,
                idleVal: sumIdle,
                idlePct: getPctStr(sumIdle),
                idleColor,
                notOnRoad: sumNotOnRoad,
                notOnRoadPct: getPctStr(sumNotOnRoad),
                noDriver: sumNoDriver,
                noDriverPct: getPctStr(sumNoDriver),
                onLeave: sumLeave,
                onLeavePct: getPctStr(sumLeave),
                maint: sumMaint,
                maintPct: getPctStr(sumMaint),
                accident: sumAccident,
                accidentPct: getPctStr(sumAccident),
                others: sumOthers,
                othersPct: getPctStr(sumOthers),
                totalTrips
            };
        }
    }, [fleetStatusList, closedLRsList, totalFleetNum, filterType, dailyData]);

    // 3. Branch Wise Analytics Aggregates
    const branchSummary = useMemo(() => {
        const branches = {};
        closedLRsList.forEach(r => {
            const br = r.branch || 'Unknown';
            if (!branches[br]) {
                branches[br] = {
                    name: br,
                    c20: 0, c40: 0, other: 0,
                    own20: 0, own40: 0, hired20: 0, hired40: 0,
                    ownOther: 0, hiredOther: 0, total: 0
                };
            }

            const vehicle = (r.type_of_vehicle || '').toLowerCase();
            const ownHired = (r.own_hired || '').toLowerCase().trim();
            const is20 = vehicle.includes('20') || vehicle.includes('20ft');
            const is40 = vehicle.includes('40') || vehicle.includes('40ft');

            branches[br].total++;
            if (is20) {
                branches[br].c20++;
                if (ownHired === 'own') branches[br].own20++;
                else branches[br].hired20++;
            } else if (is40) {
                branches[br].c40++;
                if (ownHired === 'own') branches[br].own40++;
                else branches[br].hired40++;
            } else {
                branches[br].other++;
                if (ownHired === 'own') branches[br].ownOther++;
                else branches[br].hiredOther++;
            }
        });

        const list = Object.values(branches);

        let grand20 = 0, grandOwn20 = 0, grandHired20 = 0;
        let grand40 = 0, grandOwn40 = 0, grandHired40 = 0;
        let grandOther = 0, grandOwnOther = 0, grandHiredOther = 0;
        let grandTotal = 0;

        list.forEach(b => {
            grand20 += b.c20; grandOwn20 += b.own20; grandHired20 += b.hired20;
            grand40 += b.c40; grandOwn40 += b.own40; grandHired40 += b.hired40;
            grandOther += b.other; grandOwnOther += b.ownOther || 0; grandHiredOther += b.hiredOther || 0;
            grandTotal += b.total;
        });

        const automoveData = branches['Automove'] || { c20: 0, own20: 0, hired20: 0, c40: 0, own40: 0, hired40: 0, other: 0, ownOther: 0, hiredOther: 0, total: 0 };
        const othersData = { c20: 0, own20: 0, hired20: 0, c40: 0, own40: 0, hired40: 0, other: 0, ownOther: 0, hiredOther: 0, total: 0 };
        Object.keys(branches).forEach(br => {
            if (br !== 'Automove') {
                const b = branches[br];
                othersData.c20 += b.c20; othersData.own20 += b.own20; othersData.hired20 += b.hired20;
                othersData.c40 += b.c40; othersData.own40 += b.own40; othersData.hired40 += b.hired40;
                othersData.other += b.other; othersData.ownOther += b.ownOther || 0; othersData.hiredOther += b.hiredOther || 0;
                othersData.total += b.total;
            }
        });

        const calcPct = (part, total) => total > 0 ? ((part / total) * 100).toFixed(0) : 0;

        const automoveOwn = automoveData.own20 + automoveData.own40 + automoveData.ownOther;
        const automoveHired = automoveData.hired20 + automoveData.hired40 + automoveData.hiredOther;
        const automoveOwnPct = calcPct(automoveOwn, automoveData.total);
        const automoveHiredPct = calcPct(automoveHired, automoveData.total);

        const othersOwn = othersData.own20 + othersData.own40 + othersData.ownOther;
        const othersHired = othersData.hired20 + othersData.hired40 + othersData.hiredOther;
        const othersOwnPct = calcPct(othersOwn, othersData.total);
        const othersHiredPct = calcPct(othersHired, othersData.total);

        const own20Pct = calcPct(othersData.own20, othersData.c20);
        const hired20Pct = calcPct(othersData.hired20, othersData.c20);
        const own40Pct = calcPct(othersData.own40, othersData.c40);
        const hired40Pct = calcPct(othersData.hired40, othersData.c40);

        const overallOwn = grandOwn20 + grandOwn40 + grandOwnOther;
        const overallHired = grandHired20 + grandHired40 + grandHiredOther;
        const overallOwnPct = calcPct(overallOwn, grandTotal);
        const overallHiredPct = calcPct(overallHired, grandTotal);

        return {
            list,
            grandTotals: {
                c20: grand20, own20: grandOwn20, hired20: grandHired20,
                c40: grand40, own40: grandOwn40, hired40: grandHired40,
                other: grandOther, ownOther: grandOwnOther, hiredOther: grandHiredOther,
                total: grandTotal,
                overallOwn,
                overallHired,
                overallOwnPct,
                overallHiredPct
            },
            cards: {
                automove: {
                    total: automoveData.total,
                    own: automoveOwn,
                    hired: automoveHired,
                    ownPct: automoveOwnPct,
                    hiredPct: automoveHiredPct
                },
                srCarriers: {
                    total: othersData.total,
                    own: othersOwn,
                    hired: othersHired,
                    ownPct: othersOwnPct,
                    hiredPct: othersHiredPct,
                    c20: othersData.c20,
                    own20: othersData.own20,
                    hired20: othersData.hired20,
                    own20Pct,
                    hired20Pct,
                    c40: othersData.c40,
                    own40: othersData.own40,
                    hired40: othersData.hired40,
                    own40Pct,
                    hired40Pct
                }
            }
        };
    }, [closedLRsList]);



    // --- Fleet Summary Tab Computations ---

    const totalFleetTrips = useMemo(() => {
        if (!fleetSummaryData || !fleetSummaryData.rows) return 0;
        return fleetSummaryData.rows.reduce((sum, r) => sum + (r.total || 0), 0);
    }, [fleetSummaryData]);

    const totalSrccTrips = useMemo(() => {
        if (!fleetSummaryData || !fleetSummaryData.summary || !fleetSummaryData.summary.srcc) return 0;
        return Object.values(fleetSummaryData.summary.srcc).reduce((sum, val) => sum + (val || 0), 0);
    }, [fleetSummaryData]);

    const totalOutsourcedTrips = useMemo(() => {
        if (!fleetSummaryData || !fleetSummaryData.summary || !fleetSummaryData.summary.outsourced) return 0;
        return Object.values(fleetSummaryData.summary.outsourced).reduce((sum, val) => sum + (val || 0), 0);
    }, [fleetSummaryData]);

    const monthlyTrendData = useMemo(() => {
        if (!fleetSummaryData || !fleetSummaryData.summary) return [];
        const srcc = fleetSummaryData.summary.srcc || {};
        const outsourced = fleetSummaryData.summary.outsourced || {};
        
        return monthNames.map(m => {
            const srccVal = srcc[m.key] || 0;
            const outsourcedVal = outsourced[m.key] || 0;
            return {
                month: m.name,
                'SR Container Carriers (SRCC)': srccVal,
                'Outsourced': outsourcedVal,
                'Total': srccVal + outsourcedVal
            };
        });
    }, [fleetSummaryData]);

    const topVehiclesData = useMemo(() => {
        if (!fleetSummaryData || !fleetSummaryData.rows) return [];
        return [...fleetSummaryData.rows]
            .sort((a, b) => (b.total || 0) - (a.total || 0))
            .slice(0, 10)
            .map(v => ({
                vehicleNo: v.vehicleNo,
                trips: v.total || 0
            }));
    }, [fleetSummaryData]);

    const filteredSummaryRows = useMemo(() => {
        if (!fleetSummaryData || !fleetSummaryData.rows) return [];
        let result = [...fleetSummaryData.rows];
        
        if (fleetSearchQuery) {
            const query = fleetSearchQuery.toLowerCase().trim();
            result = result.filter(r => r.vehicleNo.toLowerCase().includes(query));
        }
        
        if (fleetSortConfig.key) {
            result.sort((a, b) => {
                let aValue = a[fleetSortConfig.key];
                let bValue = b[fleetSortConfig.key];
                
                if (fleetSortConfig.key === 'vehicleNo') {
                    aValue = aValue || '';
                    bValue = bValue || '';
                    return fleetSortConfig.direction === 'asc' 
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                } else {
                    aValue = parseFloat(aValue) || 0;
                    bValue = parseFloat(bValue) || 0;
                    return fleetSortConfig.direction === 'asc'
                        ? aValue - bValue
                        : bValue - aValue;
                }
            });
        }
        
        return result;
    }, [fleetSummaryData, fleetSearchQuery, fleetSortConfig]);

    const requestFleetSort = (key) => {
        let direction = 'desc';
        if (fleetSortConfig.key === key && fleetSortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setFleetSortConfig({ key, direction });
    };

    if (loading) {
        return (
            <div className="nucleus-loading-container">
                <div className="nucleus-loader"></div>
                <div style={{ marginTop: '1.5rem', color: '#1e293b', fontWeight: 600 }}>Loading report details...</div>
            </div>
        );
    }

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
                
                /* Smooth Tab Selector */
                .nucleus-tab-container {
                    display: flex;
                    gap: 8px;
                    padding: 6px;
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-radius: 16px;
                    width: fit-content;
                    box-shadow: 0 2px 16px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.04);
                }
                
                .nucleus-tab-btn {
                    padding: 10px 22px;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    border: none;
                    background: transparent;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    letter-spacing: -0.01em;
                }
                
                .nucleus-tab-btn.active {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: #ffffff;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                    font-weight: 700;
                }
                
                .nucleus-tab-btn:not(.active):hover {
                    background: rgba(102, 126, 234, 0.1);
                    color: #334155;
                }
                
                /* Glass Cards */
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
                
                /* Tables */
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
                
                /* Status Pills */
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
                
                .status-pill.neutral {
                    background: rgba(148, 163, 184, 0.1);
                    color: #475569;
                    border: 1px solid rgba(148, 163, 184, 0.2);
                }
                
                .status-pill.success {
                    background: rgba(16, 185, 129, 0.1);
                    color: #059669;
                    border: 1px solid rgba(16, 185, 129, 0.2);
                }
                
                .status-pill.warning {
                    background: rgba(245, 158, 11, 0.1);
                    color: #d97706;
                    border: 1px solid rgba(245, 158, 11, 0.2);
                }
                
                .status-pill.info {
                    background: rgba(14, 165, 233, 0.1);
                    color: #0284c7;
                    border: 1px solid rgba(14, 165, 233, 0.2);
                }
                
                .status-pill.error {
                    background: rgba(239, 68, 68, 0.1);
                    color: #dc2626;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }
                
                /* Charts */
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
                
                /* Branch Summary Cards */
                .branch-summary-card {
                    background: rgba(255, 255, 255, 0.85);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .branch-summary-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.08);
                }
                
                /* Spreadsheet View */
                .excel-wrap {
                    background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-radius: 20px;
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04);
                    overflow: auto;
                    max-width: 100%;
                }
                
                .excel-table {
                    border-collapse: separate;
                    border-spacing: 0;
                    width: 100%;
                    min-width: 1400px;
                }
                
                .excel-table th {
                    background: linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(241, 245, 249, 0.95) 100%);
                    color: #1e293b;
                    font-weight: 700;
                    font-size: 11.5px;
                    padding: 14px 12px;
                    border-right: 1px solid rgba(226, 232, 240, 0.4);
                    border-bottom: 1px solid rgba(226, 232, 240, 0.6);
                    text-align: center;
                    letter-spacing: 0.03em;
                    white-space: nowrap;
                }
                
                .excel-table td {
                    color: #334155;
                    font-weight: 500;
                    font-size: 13px;
                    padding: 12px;
                    border-right: 1px solid rgba(226, 232, 240, 0.3);
                    border-bottom: 1px solid rgba(226, 232, 240, 0.3);
                    text-align: center;
                }
                
                .excel-table tr:nth-child(even) td {
                    background: rgba(248, 250, 252, 0.5);
                }
                
                .excel-table tr:hover td {
                    background: rgba(102, 126, 234, 0.04) !important;
                }
                
                .excel-table td.num {
                    font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
                    font-weight: 600;
                }
                
                .excel-table td.highlight-yellow {
                    background: rgba(254, 240, 138, 0.2) !important;
                    color: #854d0e;
                }
                
                .excel-table td.highlight-red {
                    background: rgba(254, 202, 202, 0.2) !important;
                    color: #991b1b;
                }
                
                .excel-table td.highlight-green {
                    background: rgba(220, 252, 231, 0.2) !important;
                    color: #166534;
                }
                
                .excel-table td.highlight-blue {
                    background: rgba(219, 234, 254, 0.2) !important;
                    color: #1e40af;
                }
                
                .mono-text {
                    font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
                }
                
                /* Loading State */
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
                
                /* Scrollbar Styling */
                .excel-wrap::-webkit-scrollbar {
                    height: 8px;
                }
                
                .excel-wrap::-webkit-scrollbar-track {
                    background: transparent;
                }
                
                .excel-wrap::-webkit-scrollbar-thumb {
                    background: rgba(148, 163, 184, 0.3);
                    border-radius: 4px;
                }
                
                .excel-wrap::-webkit-scrollbar-thumb:hover {
                    background: rgba(148, 163, 184, 0.5);
                }
            `}</style>

            {/* Premium Tab Selector */}
            <div className="nucleus-tab-container">
                {[
                    { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
                    { id: 'spreadsheet', label: '🗂️ Spreadsheet', icon: '🗂️' },
                    { id: 'trend', label: '📈 Trend', icon: '📈' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id === 'fleet-summary' ? 'trend' : tab.id)}
                        className={`nucleus-tab-btn ${activeTab === tab.id || (tab.id === 'trend' && activeTab === 'fleet-summary') ? 'active' : ''}`}
                    >
                        <span>{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            {/* Dashboard View */}
            {activeTab === 'dashboard' && (
                <>
                    {/* Metrics Grid - First Line (Core KPIs) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                        {[
                            { label: 'Fleet Size', value: metrics.fleetSize, color: '#667eea', gradient: 'linear-gradient(135deg, #667eea10, #764ba210)' },
                            { label: 'Vehicle On Road', value: `${metrics.onRoadCount}`, extra: metrics.onRoadPct, color: metrics.onRoadColor, gradient: `linear-gradient(135deg, ${metrics.onRoadColor}15, transparent)` },
                            { label: 'Idle', value: `${metrics.idleVal}`, extra: metrics.idlePct, color: metrics.idleColor, gradient: `linear-gradient(135deg, ${metrics.idleColor}15, transparent)` },
                            { label: 'Total Trips', value: metrics.totalTrips, color: '#64748b', gradient: 'linear-gradient(135deg, #64748b10, transparent)' }
                        ].map((m, idx) => (
                            <div key={idx} className="nucleus-stats-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '8px', background: m.gradient || 'rgba(255, 255, 255, 0.8)' }}>
                                <div style={{ fontSize: '13px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{m.label}</div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                    <span style={{ fontSize: '38px', fontWeight: 900, color: '#0f172a' }} className="mono-text">{m.value}</span>
                                    {m.extra && <span style={{ fontSize: '15px', fontWeight: 700, color: m.color }}>{m.extra}</span>}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Metrics Grid - CR-003 Additional KPI Cards with Dynamic Colors */}
                    {!isSingleDay && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
                            {[
                                { 
                                    label: 'Average Trips Per Day', 
                                    value: kpiMetricsObj.avgTripsPerDay, 
                                    extra: kpiMetricsObj.avgTripsTheme.performanceLabel, 
                                    color: kpiMetricsObj.avgTripsTheme.color,
                                    gradient: kpiMetricsObj.avgTripsTheme.bg,
                                    border: kpiMetricsObj.avgTripsTheme.border,
                                    badgeBg: kpiMetricsObj.avgTripsTheme.badgeBg
                                },
                                { 
                                    label: 'Projection Trips – All Ports', 
                                    value: kpiMetricsObj.projectionAllPorts, 
                                    extra: kpiMetricsObj.projectionAllTheme.performanceLabel, 
                                    color: kpiMetricsObj.projectionAllTheme.color,
                                    gradient: kpiMetricsObj.projectionAllTheme.bg,
                                    border: kpiMetricsObj.projectionAllTheme.border,
                                    badgeBg: kpiMetricsObj.projectionAllTheme.badgeBg
                                },
                                { 
                                    label: 'Projection Trips – Mundra', 
                                    value: kpiMetricsObj.projectionMundra, 
                                    extra: kpiMetricsObj.projectionMundraTheme.performanceLabel, 
                                    color: kpiMetricsObj.projectionMundraTheme.color,
                                    gradient: kpiMetricsObj.projectionMundraTheme.bg,
                                    border: kpiMetricsObj.projectionMundraTheme.border,
                                    badgeBg: kpiMetricsObj.projectionMundraTheme.badgeBg
                                }
                            ].map((m, idx) => (
                                <div key={idx} className="nucleus-stats-card" style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: '10px', background: m.gradient, border: m.border, boxShadow: '0 8px 32px rgba(0, 0, 0, 0.03)' }}>
                                    <div style={{ fontSize: '13px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 800 }}>{m.label}</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                            <span style={{ fontSize: '42px', fontWeight: 900, color: '#0f172a' }} className="mono-text">{m.value}</span>
                                        </div>
                                        <div style={{ display: 'inline-flex', padding: '6px 12px', borderRadius: '8px', background: m.badgeBg, color: m.color, fontWeight: 700, fontSize: '12.5px', width: 'fit-content' }}>
                                            {m.extra}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Metrics Grid - Second Line (Not on Road Breakdown) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
                        {[
                            { label: 'Vehicle Not on Road', value: `${metrics.notOnRoad}`, extra: metrics.notOnRoadPct, color: '#ef4444', isHighlighted: true },
                            { label: 'No Driver', value: `${metrics.noDriver}`, extra: metrics.noDriverPct, color: '#f59e0b' },
                            { label: 'Driver On Leave', value: `${metrics.onLeave}`, extra: metrics.onLeavePct, color: '#ef4444' },
                            { label: 'Maintenance', value: `${metrics.maint}`, extra: metrics.maintPct, color: '#0ea5e9' },
                            { label: 'Accidents', value: `${metrics.accident}`, extra: metrics.accidentPct, color: '#ef4444' },
                            { label: 'Others', value: `${metrics.others}`, extra: metrics.othersPct, color: '#64748b' }
                        ].map((m, idx) => (
                            <div
                                key={idx}
                                className="nucleus-stats-card"
                                style={{
                                    padding: m.isHighlighted ? '24px 28px' : '20px 24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    background: m.isHighlighted ? 'linear-gradient(135deg, rgba(254, 226, 226, 0.6) 0%, rgba(254, 242, 242, 0.4) 100%)' : 'rgba(255, 255, 255, 0.8)',
                                    border: m.isHighlighted ? '2px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(255, 255, 255, 0.5)',
                                    transform: m.isHighlighted ? 'scale(1.02)' : 'none',
                                    boxShadow: m.isHighlighted ? '0 10px 25px rgba(239, 68, 68, 0.12)' : '0 8px 32px rgba(0, 0, 0, 0.04)',
                                    zIndex: m.isHighlighted ? 2 : 1
                                }}
                            >
                                <div style={{
                                    fontSize: m.isHighlighted ? '14px' : '13px',
                                    color: m.isHighlighted ? '#b91c1c' : '#475569',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    fontWeight: m.isHighlighted ? 900 : 700
                                }}>
                                    {m.label}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                    <span style={{
                                        fontSize: m.isHighlighted ? '46px' : '38px',
                                        fontWeight: 900,
                                        color: m.isHighlighted ? '#991b1b' : '#0f172a'
                                    }} className="mono-text">
                                        {m.value}
                                    </span>
                                    {m.extra && (
                                        <span style={{
                                            fontSize: m.isHighlighted ? '17px' : '15px',
                                            fontWeight: 800,
                                            color: m.isHighlighted ? '#dc2626' : m.color
                                        }}>
                                            {m.extra}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Branch Summary Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>🏢</span> Operations Summary
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                            {/* Automove Card */}
                            <div className="branch-summary-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>🚛</span> Automove
                                    </span>
                                    <span className="status-pill info">{branchSummary.cards.automove.total} trips</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '12px', borderTop: '1px solid rgba(226, 232, 240, 0.4)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(5, 150, 105, 0.05)', padding: '10px 16px', borderRadius: '8px' }}>
                                        <span style={{ fontSize: '12px', color: '#047857', fontWeight: 700 }}>OWN</span>
                                        <span style={{ fontSize: '18px', fontWeight: 800, color: '#059669' }}>
                                            {branchSummary.cards.automove.own}
                                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginLeft: '4px' }}>{branchSummary.cards.automove.ownPct}%</span>
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(245, 158, 11, 0.05)', padding: '10px 16px', borderRadius: '8px' }}>
                                        <span style={{ fontSize: '12px', color: '#b45309', fontWeight: 700 }}>HIRED</span>
                                        <span style={{ fontSize: '18px', fontWeight: 800, color: '#f59e0b' }}>
                                            {branchSummary.cards.automove.hired}
                                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginLeft: '4px' }}>{branchSummary.cards.automove.hiredPct}%</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* SR Container Carriers Card */}
                            <div className="branch-summary-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>📦</span> SR Container Carriers
                                    </span>
                                    <span className="status-pill success">{branchSummary.cards.srCarriers.total} trips</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingTop: '12px', borderTop: '1px solid rgba(226, 232, 240, 0.4)' }}>
                                    <div>
                                        <div style={{ fontSize: '13px', color: '#475569', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                            20 FEET ({branchSummary.cards.srCarriers.c20})
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(5, 150, 105, 0.05)', padding: '6px 10px', borderRadius: '8px' }}>
                                                <span style={{ fontSize: '11px', color: '#047857', fontWeight: 700 }}>OWN</span>
                                                <span style={{ fontSize: '15px', fontWeight: 800, color: '#059669' }}>
                                                    {branchSummary.cards.srCarriers.own20}
                                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginLeft: '4px' }}>{branchSummary.cards.srCarriers.own20Pct}%</span>
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(245, 158, 11, 0.05)', padding: '6px 10px', borderRadius: '8px' }}>
                                                <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 700 }}>HIRED</span>
                                                <span style={{ fontSize: '15px', fontWeight: 800, color: '#f59e0b' }}>
                                                    {branchSummary.cards.srCarriers.hired20}
                                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginLeft: '4px' }}>{branchSummary.cards.srCarriers.hired20Pct}%</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '13px', color: '#475569', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                                            40 FEET ({branchSummary.cards.srCarriers.c40})
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(5, 150, 105, 0.05)', padding: '6px 10px', borderRadius: '8px' }}>
                                                <span style={{ fontSize: '11px', color: '#047857', fontWeight: 700 }}>OWN</span>
                                                <span style={{ fontSize: '15px', fontWeight: 800, color: '#059669' }}>
                                                    {branchSummary.cards.srCarriers.own40}
                                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginLeft: '4px' }}>{branchSummary.cards.srCarriers.own40Pct}%</span>
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(245, 158, 11, 0.05)', padding: '6px 10px', borderRadius: '8px' }}>
                                                <span style={{ fontSize: '11px', color: '#b45309', fontWeight: 700 }}>HIRED</span>
                                                <span style={{ fontSize: '15px', fontWeight: 800, color: '#f59e0b' }}>
                                                    {branchSummary.cards.srCarriers.hired40}
                                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginLeft: '4px' }}>{branchSummary.cards.srCarriers.hired40Pct}%</span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Branch Table */}
                        <div className="nucleus-table-wrapper">
                            <table className="nucleus-table">
                                <thead>
                                    <tr>
                                        <th>Branch</th>
                                        <th>20 Feet</th>
                                        <th>40 Feet</th>
                                        <th>Automove</th>
                                        <th style={{ textAlign: 'right' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {branchSummary.list.length > 0 ? (
                                        <>
                                            {branchSummary.list.map((b, idx) => {
                                                return (
                                                    <tr key={idx}>
                                                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{b.name}</td>
                                                        <td style={{ color: '#2563eb' }}>
                                                            {b.c20} <span style={{ fontSize: '12.5px', color: '#64748b' }}>(Own: {b.own20} Hired: {b.hired20})</span>
                                                        </td>
                                                        <td style={{ color: '#d97706' }}>
                                                            {b.c40} <span style={{ fontSize: '12.5px', color: '#64748b' }}>(Own: {b.own40} Hired: {b.hired40})</span>
                                                        </td>
                                                        <td>
                                                            {b.other} <span style={{ fontSize: '12.5px', color: '#64748b' }}>(Own: {b.ownOther} Hired: {b.hiredOther})</span>
                                                        </td>
                                                        <td style={{ fontWeight: 800, textAlign: 'right', color: '#0f172a' }}>{b.total}</td>
                                                    </tr>
                                                );
                                            })}
                                            <tr style={{ background: 'rgba(102, 126, 234, 0.08)', fontWeight: 800 }}>
                                                <td style={{ color: '#0f172a' }}>Total</td>
                                                <td style={{ color: '#2563eb' }}>{branchSummary.grandTotals.c20}</td>
                                                <td style={{ color: '#d97706' }}>{branchSummary.grandTotals.c40}</td>
                                                <td>{branchSummary.grandTotals.other}</td>
                                                <td style={{ fontWeight: 900, textAlign: 'right', color: '#0f172a' }}>{branchSummary.grandTotals.total}</td>
                                            </tr>
                                        </>
                                    ) : (
                                        <tr>
                                            <td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No branch data available</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Our Vehicles vs Outsource Vehicles Percentage Card */}
                        {(() => {
                            const ownPctVal = parseInt(branchSummary.grandTotals.overallOwnPct) || 0;
                            let ownColor = '#ef4444'; // Red
                            let ownTextClassColor = '#dc2626';
                            let ownGradient = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';

                            if (ownPctVal >= 85) {
                                ownColor = '#10b981'; // Green
                                ownTextClassColor = '#059669';
                                ownGradient = 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
                            } else if (ownPctVal >= 70) {
                                ownColor = '#f59e0b'; // Yellow
                                ownTextClassColor = '#d97706';
                                ownGradient = 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)';
                            }

                            const hiredPctVal = parseInt(branchSummary.grandTotals.overallHiredPct) || 0;
                            let hiredColor = '#ef4444'; // Red
                            let hiredTextClassColor = '#dc2626';
                            let hiredGradient = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';

                            if (hiredPctVal <= 15) {
                                hiredColor = '#10b981'; // Green
                                hiredTextClassColor = '#059669';
                                hiredGradient = 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
                            } else if (hiredPctVal <= 30) {
                                hiredColor = '#f59e0b'; // Yellow
                                hiredTextClassColor = '#d97706';
                                hiredGradient = 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)';
                            }

                            return (
                                <div className="branch-summary-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                            <span>📊</span> Our Vehicles vs Outsource Vehicles Percentage
                                        </span>
                                        <span className="status-pill neutral" style={{ fontWeight: 700 }}>
                                            {branchSummary.grandTotals.total} Total Trips
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', alignItems: 'center' }}>
                                        {/* Left stats side */}
                                        <div style={{ display: 'flex', gap: '24px' }}>
                                            <div>
                                                <div style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Our Vehicles (Own)</div>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                                    <span style={{ fontSize: '28px', fontWeight: 900, color: ownTextClassColor }}>{branchSummary.grandTotals.overallOwn}</span>
                                                    <span style={{ fontSize: '14px', color: ownTextClassColor, fontWeight: 700 }}>{branchSummary.grandTotals.overallOwnPct}%</span>
                                                </div>
                                            </div>
                                            <div style={{ borderLeft: '1px solid rgba(226, 232, 240, 0.8)', paddingLeft: '24px' }}>
                                                <div style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Outsource Vehicles (Hired)</div>
                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                                    <span style={{ fontSize: '28px', fontWeight: 900, color: hiredTextClassColor }}>{branchSummary.grandTotals.overallHired}</span>
                                                    <span style={{ fontSize: '14px', color: hiredTextClassColor, fontWeight: 700 }}>{branchSummary.grandTotals.overallHiredPct}%</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right progress bar side */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ position: 'relative', height: '16px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden', display: 'flex' }}>
                                                <div
                                                    style={{
                                                        width: `${branchSummary.grandTotals.overallOwnPct}%`,
                                                        background: ownGradient,
                                                        height: '100%'
                                                    }}
                                                />
                                                <div
                                                    style={{
                                                        width: `${branchSummary.grandTotals.overallHiredPct}%`,
                                                        background: hiredGradient,
                                                        height: '100%'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: ownColor }}></span>
                                                    Own ({branchSummary.grandTotals.overallOwnPct}%)
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: hiredColor }}></span>
                                                    Hired ({branchSummary.grandTotals.overallHiredPct}%)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Out of Service Vehicles */}
                    <div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <span>⚠️</span> Vehicles Not on road ({fleetStatusList.length})
                        </div>
                        <div className="nucleus-table-wrapper">
                            <table className="nucleus-table">
                                <thead>
                                    <tr>
                                        <th>Vehicle No</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Last Update</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fleetStatusList.length > 0 ? (
                                        fleetStatusList.map((v, idx) => (
                                            <tr key={idx}>
                                                <td className="mono-text" style={{ fontWeight: 700, color: '#0f172a' }}>{v.vehicleNumber}</td>
                                                <td style={{ color: '#334155', fontWeight: 600 }}>{v.vehicleType || '—'}</td>
                                                <td><StatusPill status={v.status} otherText={v.otherStatusText} /></td>
                                                <td style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>{v.lastSummary || '—'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>All vehicles are operational 🎉</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Completed Trips */}
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <span>✅</span> Completed Trips ({closedLRsList.length})
                        </div>
                        <div className="nucleus-table-wrapper">
                            <table className="nucleus-table">
                                <thead>
                                    <tr>
                                        <th>LR No</th>
                                        <th>Type</th>
                                        <th>Branch</th>
                                        <th>Consignee</th>
                                        <th>Consignor</th>
                                        <th>Vehicle</th>
                                        <th>Container</th>
                                        <th>Own/Hired</th>
                                        <th>Closed</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {closedLRsList.length > 0 ? (
                                        closedLRsList.map((r, idx) => (
                                            <tr key={idx}>
                                                <td className="mono-text" style={{ fontWeight: 600, color: '#667eea' }}>{r.tr_no}</td>
                                                <td><IePill type={r.import_export} /></td>
                                                <td style={{ color: '#475569', fontSize: '12.5px' }}>{r.branch || '—'}</td>
                                                <td style={{ fontWeight: 500 }}>{r.consignee || '—'}</td>
                                                <td style={{ color: '#64748b', fontSize: '12.5px' }}>{r.consignor || '—'}</td>
                                                <td className="mono-text" style={{ fontWeight: 500 }}>{r.vehicle_no || '—'}</td>
                                                <td className="mono-text" style={{ fontWeight: 500 }}>{r.container_number || '—'}</td>
                                                <td><OwnPill ownHired={r.own_hired} /></td>
                                                <td style={{ fontSize: '12px', color: '#64748b' }}>{r.dispatchClosedDate ? r.dispatchClosedDate.slice(0, 10) : '—'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="9" style={{ textAlign: 'center', color: '#94a3b8', padding: '32px' }}>No completed trips found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}



            {/* Spreadsheet View */}
            {activeTab === 'spreadsheet' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', justifyContent: 'space-between', padding: '0 4px', fontWeight: 500 }}>
                        <span>📋 Detailed Dispatch Matrix</span>
                        <span><strong className="mono-text">{dailyData.length}</strong> records</span>
                    </div>

                    <div className="excel-wrap">
                        <table className="excel-table">
                            <thead>
                                <tr>
                                    <th rowSpan="2">Date</th>
                                    <th rowSpan="2" style={{ background: 'rgba(254, 240, 138, 0.15)' }}>Fleet [{totalFleetNum}]</th>
                                    <th rowSpan="2">Used for Trips</th>
                                    <th rowSpan="2">On Road %</th>
                                    <th rowSpan="2" style={{ background: 'rgba(254, 240, 138, 0.1)' }}>Idle</th>
                                    <th rowSpan="2" style={{ background: 'rgba(254, 202, 202, 0.15)' }}>Not on Road</th>
                                    <th colSpan="6" style={{ background: 'rgba(254, 202, 202, 0.1)' }}>Breakdown Details</th>
                                    <th colSpan="2">Dispatched</th>
                                    <th rowSpan="2" style={{ background: 'rgba(220, 252, 231, 0.15)' }}>Active LRs</th>
                                    <th colSpan="2">Own Closed</th>
                                    <th colSpan="2">Trips</th>
                                    <th colSpan="3" style={{ background: 'rgba(254, 240, 138, 0.1)' }}>Outsourced</th>
                                </tr>
                                <tr>
                                    <th>Brkdn</th><th>Maint</th><th>Leave</th><th>Acc</th><th>No Drv</th><th>Other</th>
                                    <th>Automove</th><th>SN Carrier</th>
                                    <th>20ft</th><th>40ft</th>
                                    <th>Own</th><th>Hired</th>
                                    <th>20ft</th><th>40ft</th><th>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dailyData.length > 0 ? (
                                    dailyData.map((d, index) => (
                                        <tr key={index}>
                                            <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{d.dateStr}</td>
                                            <td className="num highlight-yellow">{d.totalFleet}</td>
                                            <td className="num">{d.usedForTrips}</td>
                                            <td className="num" style={{ color: '#059669', fontWeight: 600 }}>{d.oorPercent}</td>
                                            <td className="num highlight-yellow">{d.idleCount}</td>
                                            <td className="num highlight-red">{d.oosCount}</td>
                                            <td className="num">{d.breakdown}</td>
                                            <td className="num">{d.maintenance}</td>
                                            <td className="num">{d.leave}</td>
                                            <td className="num">{d.accident}</td>
                                            <td className="num">{d.noDriver}</td>
                                            <td className="num">{d.others}</td>
                                            <td className="num">{d.automove}</td>
                                            <td className="num">{d.snContainer}</td>
                                            <td className="num highlight-green">{d.activeLRs}</td>
                                            <td className="num" style={{ color: '#2563eb' }}>{d.ownClosed20}</td>
                                            <td className="num" style={{ color: '#d97706' }}>{d.ownClosed40}</td>
                                            <td className="num">{d.ownTrips}</td>
                                            <td className="num">{d.hiredTrips}</td>
                                            <td className="num">{d.outsourced20}</td>
                                            <td className="num">{d.outsourced40}</td>
                                            <td className="num highlight-yellow">{d.outsourcedTotal}</td>
                                        </tr>
                                    ))
                                ) : null}
                                {dailyData.length > 0 && spreadsheetTotals && (
                                    <tr style={{ background: 'rgba(102, 126, 234, 0.08)', fontWeight: 800, borderTop: '2px solid rgba(102, 126, 234, 0.3)' }}>
                                        <td style={{ fontWeight: 800, color: '#0f172a' }}>Total / Avg</td>
                                        <td className="num highlight-yellow" style={{ fontWeight: 800 }}>{spreadsheetTotals.totalFleet}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.usedForTrips}</td>
                                        <td className="num" style={{ color: '#059669', fontWeight: 800 }}>{spreadsheetTotals.oorPercent}</td>
                                        <td className="num highlight-yellow" style={{ fontWeight: 800 }}>{spreadsheetTotals.idleCount}</td>
                                        <td className="num highlight-red" style={{ fontWeight: 800 }}>{spreadsheetTotals.oosCount}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.breakdown}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.maintenance}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.leave}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.accident}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.noDriver}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.others}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.automove}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.snContainer}</td>
                                        <td className="num highlight-green" style={{ fontWeight: 800 }}>{spreadsheetTotals.activeLRs}</td>
                                        <td className="num" style={{ color: '#2563eb', fontWeight: 800 }}>{spreadsheetTotals.ownClosed20}</td>
                                        <td className="num" style={{ color: '#d97706', fontWeight: 800 }}>{spreadsheetTotals.ownClosed40}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.ownTrips}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.hiredTrips}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.outsourced20}</td>
                                        <td className="num" style={{ fontWeight: 800 }}>{spreadsheetTotals.outsourced40}</td>
                                        <td className="num highlight-yellow" style={{ fontWeight: 800 }}>{spreadsheetTotals.outsourcedTotal}</td>
                                    </tr>
                                )}
                                {dailyData.length === 0 && (
                                    <tr>
                                        <td colSpan="22" style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                                            No data available for the selected period
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Trend View (CR-002) */}
            {(activeTab === 'trend' || activeTab === 'fleet-summary') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                    {/* KPI Metrics */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {[
                            { label: 'Fleet Size', value: metrics.fleetSize, color: '#6366f1', gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), transparent)' },
                            { label: 'Total Trips', value: metrics.totalTrips, color: '#8b5cf6', gradient: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), transparent)' }
                        ].map((m, idx) => (
                            <div key={idx} className="nucleus-stats-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '8px', background: m.gradient }}>
                                <div style={{ fontSize: '12px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{m.label}</div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                    <span style={{ fontSize: '36px', fontWeight: 900, color: '#0f172a' }} className="mono-text">{m.value}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Dynamic Line Charts Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px' }}>
                        {/* Fleet Utilization % Trend Chart */}
                        <div className="analytics-graph-card">
                            <div className="graph-card-header">
                                <h3>📈 Fleet Utilization % Trend</h3>
                                <span className="graph-subtitle">Daily stock utilization percentage rate over time</span>
                            </div>
                            <div style={{ width: '100%', height: 320, marginTop: '20px' }}>
                                <ResponsiveContainer>
                                    <ComposedChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorUtilTrend" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.4)" />
                                        <XAxis dataKey="dateStr" stroke="#94a3b8" fontSize={11} tickLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                border: '1px solid rgba(226, 232, 240, 0.6)',
                                                borderRadius: '16px',
                                                boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
                                                backdropFilter: 'blur(10px)'
                                            }}
                                            formatter={(value) => [`${value}%`, 'Utilization']}
                                        />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                                        <Area type="monotone" name="Utilization Rate" dataKey="utilPercent" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#colorUtilTrend)" />
                                        <Line type="monotone" name="Trend Line" dataKey="utilPercent" stroke="#2563eb" strokeWidth={3.5} dot={false} activeDot={{ r: 6 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Total Trips Trend Chart */}
                        <div className="analytics-graph-card">
                            <div className="graph-card-header">
                                <h3>📈 Total Trips Trend</h3>
                                <span className="graph-subtitle">Daily completed dispatches count trend</span>
                            </div>
                            <div style={{ width: '100%', height: 320, marginTop: '20px' }}>
                                <ResponsiveContainer>
                                    <ComposedChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorTripsTrend" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.4)" />
                                        <XAxis dataKey="dateStr" stroke="#94a3b8" fontSize={11} tickLine={false} />
                                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                border: '1px solid rgba(226, 232, 240, 0.6)',
                                                borderRadius: '16px',
                                                boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
                                                backdropFilter: 'blur(10px)'
                                            }}
                                            formatter={(value) => [value, 'Trips']}
                                        />
                                        <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                                        <Area type="monotone" name="Trips Count" dataKey="totalTrips" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#colorTripsTrend)" />
                                        <Line type="monotone" name="Trend Line" dataKey="totalTrips" stroke="#6d28d9" strokeWidth={3.5} dot={false} activeDot={{ r: 6 }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Data Table */}
                    {fleetSummaryData && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>📋</span> Vehicle Monthly Trip Summary
                                </div>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        placeholder="🔍 Search vehicle number..."
                                        value={fleetSearchQuery}
                                        onChange={(e) => setFleetSearchQuery(e.target.value)}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(226, 232, 240, 0.8)',
                                            fontSize: '13.5px',
                                            fontWeight: 600,
                                            outline: 'none',
                                            width: '240px',
                                            background: 'rgba(255, 255, 255, 0.8)',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                        }}
                                    />
                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
                                        Showing <strong className="mono-text">{filteredSummaryRows.length}</strong> of <strong className="mono-text">{fleetSummaryData.rows?.length || 0}</strong> vehicles
                                    </span>
                                </div>
                            </div>

                            <div className="excel-wrap">
                                <table className="excel-table">
                                    <thead>
                                        <tr>
                                            <th onClick={() => requestFleetSort('vehicleNo')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                                Vehicle No {fleetSortConfig.key === 'vehicleNo' ? (fleetSortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                                            </th>
                                            {monthNames.map(m => (
                                                <th key={m.key}>{m.name}</th>
                                            ))}
                                            <th onClick={() => requestFleetSort('total')} style={{ cursor: 'pointer', userSelect: 'none', background: 'rgba(220, 252, 231, 0.2)' }}>
                                                Total Trips {fleetSortConfig.key === 'total' ? (fleetSortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSummaryRows.length > 0 ? (
                                            filteredSummaryRows.map((row, idx) => (
                                                <tr key={idx}>
                                                    <td className="mono-text" style={{ fontWeight: 700, color: '#0f172a', textAlign: 'left', paddingLeft: '20px' }}>{row.vehicleNo}</td>
                                                    {monthNames.map(m => {
                                                        const val = row.months?.[m.key] || 0;
                                                        return (
                                                            <td key={m.key} className={`num ${val > 0 ? 'highlight-blue' : ''}`} style={{ fontWeight: val > 0 ? 700 : 500 }}>
                                                                {val || '—'}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="num highlight-green" style={{ fontWeight: 800, fontSize: '14px' }}>{row.total || 0}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="14" style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>
                                                    No matching vehicles found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FleetUtilizationReport;