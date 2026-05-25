import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { format, parse, isValid, startOfMonth, endOfMonth } from 'date-fns';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine
} from 'recharts';
import { getTransportDates, TRANSPORT_BASE, TRANSPORT_HEADERS } from './reports-helper';

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
    const [reportData, setReportData] = useState({ totalFleet: 'NA', dispatch: [] });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard');

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
                if (filterType === 'day' && selectedDay) {
                    start = selectedDay;
                    end = selectedDay;
                }
                if (start) params.startDate = start;
                if (end) params.endDate = end;

                const res = await axios.get(`${TRANSPORT_BASE}/api/fleet/utilization-report`, {
                    params,
                    headers: TRANSPORT_HEADERS,
                    withCredentials: true
                });

                if (res.data && res.data.success) {
                    setReportData(res.data.data || { totalFleet: 'NA', dispatch: [] });
                }
            } catch (err) {
                console.error("Error fetching fleet utilization report:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [filterType, selectedMonth, selectedYear, selectedQuarter, dateRange, selectedDay]);

    // Format dispatches array safely
    const dispatches = useMemo(() => {
        if (!reportData.dispatch) return [];
        return Array.isArray(reportData.dispatch) ? reportData.dispatch : [reportData.dispatch];
    }, [reportData.dispatch]);

    // Parse and memoize the total fleet size number
    const totalFleetNum = useMemo(() => {
        return parseInt(reportData.totalFleet) || 0;
    }, [reportData.totalFleet]);

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

    // 2. Metrics & KPI computation
    const metrics = useMemo(() => {
        const noDriver = fleetStatusList.filter(v => v.status === 'No Driver').length;
        const onLeave = fleetStatusList.filter(v => v.status === 'Driver on Leave').length;
        const maint = fleetStatusList.filter(v => v.status === 'Maintenance').length;
        const accident = fleetStatusList.filter(v => v.status === 'Accident').length;
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
            totalTrips: closedLRsList.length
        };
    }, [fleetStatusList, closedLRsList, totalFleetNum]);

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

        const automoveData = branches['Automove'] || { c20:0, own20:0, hired20:0, c40:0, own40:0, hired40:0, other:0, ownOther:0, hiredOther:0, total:0 };
        const othersData = { c20:0, own20:0, hired20:0, c40:0, own40:0, hired40:0, other:0, ownOther:0, hiredOther:0, total:0 };
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

        return {
            list,
            grandTotals: {
                c20: grand20, own20: grandOwn20, hired20: grandHired20,
                c40: grand40, own40: grandOwn40, hired40: grandHired40,
                other: grandOther, ownOther: grandOwnOther, hiredOther: grandHiredOther,
                total: grandTotal
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
                    ownPct: othersOwnPct,
                    hiredPct: othersHiredPct,
                    c20: othersData.c20,
                    own20Pct,
                    hired20Pct,
                    c40: othersData.c40,
                    own40Pct,
                    hired40Pct
                }
            }
        };
    }, [closedLRsList]);

    // 4. Daily Aggregation for Trend & Spreadsheet Analysis
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
            const others = fleet.filter(v => !['Breakdown','Maintenance','Driver on Leave','Accident','Accidents','No Driver'].includes(v.status)).length;
            
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
                outsourcedTotal
            };
        }).sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [dispatches, totalFleetNum]);

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
                    { id: 'trends', label: '📈 Trends', icon: '📈' },
                    { id: 'spreadsheet', label: '🗂️ Spreadsheet', icon: '🗂️' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`nucleus-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    >
                        <span>{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            {/* Dashboard View */}
            {activeTab === 'dashboard' && (
                <>
                    {/* Metrics Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        {[
                            { label: 'Fleet Size', value: metrics.fleetSize, color: '#667eea', gradient: 'linear-gradient(135deg, #667eea10, #764ba210)' },
                            { label: 'On Road', value: `${metrics.onRoadCount}`, extra: metrics.onRoadPct, color: metrics.onRoadColor, gradient: `linear-gradient(135deg, ${metrics.onRoadColor}15, transparent)` },
                            { label: 'Idle', value: `${metrics.idleVal}`, extra: metrics.idlePct, color: metrics.idleColor, gradient: `linear-gradient(135deg, ${metrics.idleColor}15, transparent)` },
                            { label: 'Not on Road', value: `${metrics.notOnRoad}`, extra: metrics.notOnRoadPct, color: '#ef4444', gradient: 'linear-gradient(135deg, #ef444415, transparent)' },
                            { label: 'No Driver', value: `${metrics.noDriver}`, extra: metrics.noDriverPct, color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b15, transparent)' },
                            { label: 'On Leave', value: `${metrics.onLeave}`, extra: metrics.onLeavePct, color: '#ef4444', gradient: 'linear-gradient(135deg, #ef444415, transparent)' },
                            { label: 'Maintenance', value: `${metrics.maint}`, extra: metrics.maintPct, color: '#0ea5e9', gradient: 'linear-gradient(135deg, #0ea5e915, transparent)' },
                            { label: 'Accidents', value: `${metrics.accident}`, extra: metrics.accidentPct, color: '#ef4444', gradient: 'linear-gradient(135deg, #ef444415, transparent)' },
                            { label: 'Total Trips', value: metrics.totalTrips, color: '#64748b', gradient: 'linear-gradient(135deg, #64748b10, transparent)' }
                        ].map((m, idx) => (
                            <div key={idx} className="nucleus-stats-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ fontSize: '13px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{m.label}</div>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                    <span style={{ fontSize: '38px', fontWeight: 900, color: '#0f172a' }} className="mono-text">{m.value}</span>
                                    {m.extra && <span style={{ fontSize: '15px', fontWeight: 700, color: m.color }}>{m.extra}</span>}
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
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingTop: '12px', borderTop: '1px solid rgba(226, 232, 240, 0.4)' }}>
                                    <div>
                                        <div style={{ fontSize: '13px', color: '#475569', fontWeight: 700, marginBottom: '4px' }}>OWN</div>
                                        <div style={{ fontSize: '30px', fontWeight: 900, color: '#059669' }}>
                                            {branchSummary.cards.automove.own}
                                            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, marginLeft: '4px' }}>{branchSummary.cards.automove.ownPct}%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '13px', color: '#475569', fontWeight: 700, marginBottom: '4px' }}>HIRED</div>
                                        <div style={{ fontSize: '30px', fontWeight: 900, color: '#f59e0b' }}>
                                            {branchSummary.cards.automove.hired}
                                            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, marginLeft: '4px' }}>{branchSummary.cards.automove.hiredPct}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SR Container Carriers Card */}
                            <div className="branch-summary-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>📦</span> SR Container
                                    </span>
                                    <span className="status-pill success">{branchSummary.cards.srCarriers.total} trips</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', paddingTop: '12px', borderTop: '1px solid rgba(226, 232, 240, 0.4)' }}>
                                    <div>
                                        <div style={{ fontSize: '13px', color: '#475569', fontWeight: 700, marginBottom: '4px' }}>20 FEET ({branchSummary.cards.srCarriers.c20})</div>
                                        <div style={{ fontSize: '14px', color: '#334155', fontWeight: 600 }}>
                                            Own: {branchSummary.cards.srCarriers.own20Pct}% · Hired: {branchSummary.cards.srCarriers.hired20Pct}%
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '13px', color: '#475569', fontWeight: 700, marginBottom: '4px' }}>40 FEET ({branchSummary.cards.srCarriers.c40})</div>
                                        <div style={{ fontSize: '14px', color: '#334155', fontWeight: 600 }}>
                                            Own: {branchSummary.cards.srCarriers.own40Pct}% · Hired: {branchSummary.cards.srCarriers.hired40Pct}%
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
                                        <th>Other</th>
                                        <th style={{ textAlign: 'right' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {branchSummary.list.length > 0 ? (
                                        <>
                                            {branchSummary.list.map((b, idx) => {
                                                const getPctStr = (part, total) => !total || total <= 0 ? '0%' : `${((part / total) * 100).toFixed(0)}%`;
                                                return (
                                                    <tr key={idx}>
                                                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{b.name}</td>
                                                        <td style={{ color: '#2563eb' }}>
                                                            {b.c20} <span style={{ fontSize: '12.5px', color: '#64748b' }}>(O: {b.own20} H: {b.hired20})</span>
                                                        </td>
                                                        <td style={{ color: '#d97706' }}>
                                                            {b.c40} <span style={{ fontSize: '12.5px', color: '#64748b' }}>(O: {b.own40} H: {b.hired40})</span>
                                                        </td>
                                                        <td>
                                                            {b.other} <span style={{ fontSize: '12.5px', color: '#64748b' }}>(O: {b.ownOther} H: {b.hiredOther})</span>
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
                    </div>

                    {/* Out of Service Vehicles */}
                    <div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <span>⚠️</span> Out of Service Vehicles ({fleetStatusList.length})
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

            {/* Trends View */}
            {activeTab === 'trends' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="analytics-graph-card">
                        <div className="graph-card-header">
                            <h3>🚛 Fleet Stock Allocation Trend</h3>
                            <span className="graph-subtitle">Daily breakdown of active, idle, and out-of-service vehicles</span>
                        </div>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorIdle" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#667eea" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorOOS" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.4)" />
                                    <XAxis dataKey="dateStr" stroke="#94a3b8" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                                    <Tooltip content={<FleetTrendTooltip />} />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                                    <Area type="monotone" name="Active" dataKey="activeCount" stackId="1" stroke="#10b981" strokeWidth={2} fill="url(#colorActive)" />
                                    <Area type="monotone" name="Idle" dataKey="idleCount" stackId="1" stroke="#667eea" strokeWidth={2} fill="url(#colorIdle)" />
                                    <Area type="monotone" name="Out of Service" dataKey="oosCount" stackId="1" stroke="#ef4444" strokeWidth={2} fill="url(#colorOOS)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="analytics-graph-card">
                        <div className="graph-card-header">
                            <h3>📊 Fleet Utilization Rate</h3>
                            <span className="graph-subtitle">Percentage of fleet actively utilized per day</span>
                        </div>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorUtil" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#667eea" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.4)" />
                                    <XAxis dataKey="dateStr" stroke="#94a3b8" fontSize={11} tickLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 100]} unit="%" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            border: '1px solid rgba(226, 232, 240, 0.6)',
                                            borderRadius: '12px',
                                            backdropFilter: 'blur(10px)'
                                        }}
                                        formatter={(value) => [`${value}%`, 'Utilization']}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
                                    <Area type="monotone" name="Utilization %" dataKey="utilPercent" stroke="#667eea" strokeWidth={2} fillOpacity={1} fill="url(#colorUtil)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
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
                                ) : (
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
        </div>
    );
};

export default FleetUtilizationReport;