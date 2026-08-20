import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getEndpoint } from './reports-helper';
import ImportDetailedSummaryTab from './ImportDetailedSummaryTab';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444', '#0ea5e9', '#10b981', '#f43f5e'];

const STYLES = `
.fleet-card {
    background: var(--fc-bg, rgba(255, 255, 255, 0.85));
    backdrop-filter: blur(28px);
    -webkit-backdrop-filter: blur(28px);
    border-radius: 28px 8px 28px 28px;
    border: var(--fc-border, 1px solid rgba(226, 232, 240, 0.8));
    box-shadow: 0 8px 20px -2px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.9);
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    overflow: hidden;
    position: relative;
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
    transition: all 0.4s ease;
    pointer-events: none;
    z-index: 0;
}
.fleet-card:hover {
    transform: translateY(-6px) scale(1.005);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 1);
    border-color: rgba(226, 232, 240, 1);
    z-index: 10;
}
.fleet-card:hover::before {
    transform: scale(1.3);
    opacity: 0.3;
}
`;
const ImportOutOfChargeSummaryReport = ({
    filterType,
    selectedMonth,
    selectedYear,
    selectedQuarter,
    dateRange,
    selectedDay,
    category,
    selectedFinancialYear,
    branchId,
}) => {
    const navigate = useNavigate();
    const [rawQueryData, setRawQueryData] = useState([]);
    const [rawCategoryData, setRawCategoryData] = useState([]);
    const [detailedJobs, setDetailedJobs] = useState([]);
    const [totalJobsCreated, setTotalJobsCreated] = useState(0);
    const [loading, setLoading] = useState(true);
    
    // Top-level View Tab: 'overview' | 'detailed'
    const [activeViewTab, setActiveViewTab] = useState('overview');

    // Main UI Tabs (Data vs Visuals)
    const [mainTab, setMainTab] = useState('data'); // 'data' | 'visuals'
    
    // Custom filter states
    const [viewMode, setViewMode] = useState('grouped'); // 'grouped' | 'flat'
    
    // Collapsible states for Hierarchical Grouped view
    const [expandedBranches, setExpandedBranches] = useState({});
    const [expandedPorts, setExpandedPorts] = useState({});
    
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });

    useEffect(() => {
        const fetchSummaries = async () => {
            setLoading(true);
            try {
                const endpoint = getEndpoint('/project-nucleus/out-of-charge-summaries');
                const params = {
                    filterType,
                    month: selectedMonth,
                    year: (filterType === 'year' || filterType === 'quarter' || filterType === 'month' || filterType === 'date-range') ? selectedYear : (selectedFinancialYear || '26-27'),
                    quarter: selectedQuarter,
                    startDate: dateRange[0] ? dateRange[0].toISOString() : null,
                    endDate: dateRange[1] ? dateRange[1].toISOString() : null,
                    day: selectedDay,
                    category,
                    branchId
                };
                const res = await axios.get(endpoint, { params, withCredentials: true });
                
                if (res.data && res.data.data) {
                    setRawQueryData(res.data.data);
                    setRawCategoryData(res.data.categoryData || []);
                    setDetailedJobs(res.data.detailedJobs || []);
                    setTotalJobsCreated(res.data.totalCreated || 0);
                } else {
                    // Fallback in case backend returns old format (array)
                    setRawQueryData(Array.isArray(res.data) ? res.data : []);
                    setRawCategoryData([]);
                    setDetailedJobs([]);
                    setTotalJobsCreated(0);
                }
            } catch (error) {
                console.error('Error fetching pending job summaries:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSummaries();
    }, [filterType, selectedMonth, selectedYear, selectedQuarter, dateRange, selectedDay, selectedFinancialYear, category, branchId]);

    // Handle sort for flat list
    const handleSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return '';
        return sortConfig.direction === 'asc' ? ' ▲' : ' ▼';
    };

    // Toggle branch expand/collapse
    const toggleBranch = (branch) => {
        setExpandedBranches(prev => ({
            ...prev,
            [branch]: !prev[branch]
        }));
    };

    // Toggle port expand/collapse
    const togglePort = (portKey) => {
        setExpandedPorts(prev => ({
            ...prev,
            [portKey]: !prev[portKey]
        }));
    };

    // Drill down to Import Billing module
    const handleDrillDown = (searchValue) => {
        navigate(`/import-billing?search=${encodeURIComponent(searchValue)}`);
    };

    // ─── Data Aggregation for KPIs ───────────────────────────────
    
    // Fixed reference totals based on unfiltered raw data
    const totalOutOfChargeRaw = useMemo(() =>
        rawQueryData.reduce((s, r) => s + r.count, 0),
        [rawQueryData]
    );

    const unassignedJobsCount = useMemo(() =>
        rawQueryData.reduce((sum, r) => {
            const isUnassigned = !r.employee || r.employee === 'Unassigned';
            return isUnassigned ? sum + r.count : sum;
        }, 0),
        [rawQueryData]
    );

    const assignedJobsCount = useMemo(() =>
        totalJobsCreated > 0 ? (totalJobsCreated - unassignedJobsCount) : (totalOutOfChargeRaw - unassignedJobsCount),
        [totalJobsCreated, totalOutOfChargeRaw, unassignedJobsCount]
    );

    const assignmentPercentage = useMemo(() => {
        // If there are no jobs created in this period, everything is implicitly perfectly assigned (100%)
        const denominator = totalJobsCreated > 0 ? totalJobsCreated : totalOutOfChargeRaw;
        if (denominator === 0) return 100;
        return ((assignedJobsCount / denominator) * 100).toFixed(0);
    }, [totalJobsCreated, totalOutOfChargeRaw, assignedJobsCount]);

    // Simplified dataset (no assignment filtering)
    const filteredData = rawQueryData;

    // Active KPI Total (updates with assignment filter)
    const totalOutOfCharge = useMemo(() =>
        filteredData.reduce((s, r) => s + r.count, 0),
        [filteredData]
    );

    const { topBranch, topEmployee, topEmployeeCount, topCategory, topCategoryCount } = useMemo(() => {
        const bTotals = {};
        const eTotals = {};
        
        filteredData.forEach(row => {
            bTotals[row.branch] = (bTotals[row.branch] || 0) + row.count;
            if (row.employee && row.employee !== 'Unassigned') {
                eTotals[row.employee] = (eTotals[row.employee] || 0) + row.count;
            }
        });

        const topB = Object.entries(bTotals).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];
        const topE = Object.entries(eTotals).sort((a, b) => b[1] - a[1])[0] || ['N/A', 0];
        
        // Find top category from rawCategoryData
        let tCategory = 'N/A';
        let tCategoryCount = 0;
        if (rawCategoryData && rawCategoryData.length > 0) {
            tCategory = rawCategoryData[0].category;
            tCategoryCount = rawCategoryData[0].count;
        }
        
        return { 
            topBranch: topB[0], 
            topEmployee: topE[0],
            topEmployeeCount: topE[1],
            topCategory: tCategory,
            topCategoryCount: tCategoryCount
        };
    }, [filteredData, rawCategoryData]);

    // Chart 1: Branch Load (Pie)
    const branchPieData = useMemo(() => {
        const bTotals = {};
        filteredData.forEach(row => {
            bTotals[row.branch] = (bTotals[row.branch] || 0) + row.count;
        });
        return Object.entries(bTotals)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredData]);

    // Chart 2: Top Employees (Bar)
    const topEmployeesData = useMemo(() => {
        const eTotals = {};
        filteredData.forEach(row => {
            if (row.employee !== 'Unassigned') {
                eTotals[row.employee] = (eTotals[row.employee] || 0) + row.count;
            }
        });
        return Object.entries(eTotals)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Top 10
    }, [filteredData]);

    // Chart 3: Branch vs Port Stacked Bar
    const { branchPortChartData, uniquePorts } = useMemo(() => {
        const map = {};
        const ports = new Set();
        filteredData.forEach(row => {
            if (!map[row.branch]) map[row.branch] = {};
            const p = row.port || 'Unknown';
            ports.add(p);
            map[row.branch][p] = (map[row.branch][p] || 0) + row.count;
        });

        const arr = Object.keys(map).map(branch => {
            const obj = { branch };
            ports.forEach(p => {
                obj[p] = map[branch][p] || 0;
            });
            return obj;
        });
        return { branchPortChartData: arr, uniquePorts: Array.from(ports) };
    }, [filteredData]);


    // ─── Table Sorting for Flat List ────────────────────────────

    const tableRows = useMemo(() => {
        const rows = filteredData || [];
        if (!sortConfig.key) return rows;
        return [...rows].sort((a, b) => {
            const valA = a[sortConfig.key];
            const valB = b[sortConfig.key];
            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
            }
            const strA = (valA || '').toString().toLowerCase();
            const strB = (valB || '').toString().toLowerCase();
            if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredData, sortConfig]);

    // Group data for Collapsible/Hierarchical view
    const groupedData = useMemo(() => {
        const branches = {};
        tableRows.forEach(row => {
            const b = row.branch || 'Unassigned';
            const p = row.port || 'Unassigned';
            const e = row.employee || 'Unassigned';
            
            if (!branches[b]) {
                branches[b] = { name: b, count: 0, ports: {} };
            }
            branches[b].count += row.count;
            
            if (!branches[b].ports[p]) {
                branches[b].ports[p] = { name: p, count: 0, employees: [] };
            }
            branches[b].ports[p].count += row.count;
            branches[b].ports[p].employees.push({ name: e, count: row.count });
        });
        return branches;
    }, [tableRows]);

    // Auto expand branches/ports disabled - defaults to closed
    useEffect(() => {
        if (Object.keys(groupedData).length > 0) {
            setExpandedBranches({});
            setExpandedPorts({});
        }
    }, [groupedData]);


    if (loading) {
        return (
            <div className="nucleus-loading-container">
                <div className="nucleus-loader"></div>
                <div style={{ marginTop: '1rem', color: '#6b7280' }}>Loading out of charge job summaries...</div>
            </div>
        );
    }

    // Determine color for Assignment Rate
    const assignmentColor = assignmentPercentage == 100 ? '#10b981' : assignmentPercentage > 50 ? '#f59e0b' : '#ef4444';

    return (
        <div style={{ padding: '0 8px' }}>
            <style>{STYLES}</style>
            
            {/* ─── TOP VIEW TAB SELECTOR ────────────────────────────────── */}
            <div style={{
                display: 'inline-flex',
                background: '#e2e8f0',
                padding: '4px',
                borderRadius: '14px',
                gap: '4px',
                marginBottom: '20px'
            }}>
                <button
                    onClick={() => setActiveViewTab('overview')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 20px',
                        borderRadius: '10px',
                        border: 'none',
                        background: activeViewTab === 'overview' ? '#ffffff' : 'transparent',
                        color: activeViewTab === 'overview' ? '#1e293b' : '#64748b',
                        fontWeight: 700,
                        fontSize: '13.5px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: activeViewTab === 'overview' ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none'
                    }}
                >
                    <span>📊</span> Summary Overview
                </button>

                <button
                    onClick={() => setActiveViewTab('detailed')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 20px',
                        borderRadius: '10px',
                        border: 'none',
                        background: activeViewTab === 'detailed' ? '#ffffff' : 'transparent',
                        color: activeViewTab === 'detailed' ? '#1e293b' : '#64748b',
                        fontWeight: 700,
                        fontSize: '13.5px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: activeViewTab === 'detailed' ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none'
                    }}
                >
                    <span>📋</span> Detail Summary Report
                    {detailedJobs.length > 0 && (
                        <span style={{
                            background: activeViewTab === 'detailed' ? '#eff6ff' : '#cbd5e1',
                            color: activeViewTab === 'detailed' ? '#2563eb' : '#475569',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11.5px',
                            fontWeight: 800
                        }}>
                            {detailedJobs.length}
                        </span>
                    )}
                </button>
            </div>

            {/* ─── CONDITIONAL VIEW RENDERING ──────────────────────────── */}
            {activeViewTab === 'detailed' ? (
                <ImportDetailedSummaryTab detailedJobs={detailedJobs} loading={loading} />
            ) : (
                <>
                    {/* ─── UNIFIED VIEW (CHART & DATA) ─────────────────────────── */}
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        
                        {/* Single Job Count Card requested by User */}
                        <div className="fleet-card" style={{ flex: '1 1 200px', maxWidth: '280px', height: '240px', padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', '--fc-accent': '#3b82f6' }}>
                            <h3 style={{ marginTop: 0, color: '#1e293b', fontSize: '18px', fontWeight: 600, paddingBottom: '16px', marginBottom: '16px' }}>
                                Total Out of Charge
                            </h3>
                            <div style={{ fontSize: '64px', fontWeight: 800, color: '#3b82f6', lineHeight: 1 }}>
                                {totalOutOfCharge}
                            </div>
                        </div>

                        <div className="fleet-card" style={{ flex: '1 1 320px', maxWidth: '380px', height: '240px', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', '--fc-accent': 'transparent' }}>
                            <h3 style={{ marginTop: 0, color: '#1e293b', fontSize: '16px', fontWeight: 600, paddingBottom: '12px', borderBottom: '1px solid rgba(226, 232, 240, 0.6)', marginBottom: '8px', width: '100%', textAlign: 'left' }}>
                                Branch Breakdown
                            </h3>
                            <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
                                {branchPieData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                                            <Pie
                                                data={branchPieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={35}
                                                outerRadius={55}
                                                paddingAngle={2}
                                                dataKey="value"
                                                stroke="none"
                                                labelLine={(props) => {
                                                    if (props.value === 0) return null;
                                                    const { cx, cy, midAngle, outerRadius, index } = props;
                                                    const RADIAN = Math.PI / 180;
                                                    // Stagger radius for overlapping prevention
                                                    const stagger = 1.2 + (index % 4) * 0.35;
                                                    const radius = outerRadius * stagger;
                                                    
                                                    const elbowX = cx + radius * Math.cos(-midAngle * RADIAN);
                                                    const elbowY = cy + radius * Math.sin(-midAngle * RADIAN);
                                                    
                                                    const horizontalLength = 15;
                                                    const textX = elbowX + (elbowX > cx ? horizontalLength : -horizontalLength);
                                                    
                                                    const startX = cx + outerRadius * Math.cos(-midAngle * RADIAN);
                                                    const startY = cy + outerRadius * Math.sin(-midAngle * RADIAN);
                                                    
                                                    return <polyline points={`${startX},${startY} ${elbowX},${elbowY} ${textX},${elbowY}`} stroke="#cbd5e1" strokeWidth={1} fill="none" />;
                                                }}
                                                label={(props) => {
                                                    if (props.value === 0) return null;
                                                    const { cx, cy, midAngle, outerRadius, name, value, index } = props;
                                                    const RADIAN = Math.PI / 180;
                                                    const stagger = 1.2 + (index % 4) * 0.35;
                                                    const radius = outerRadius * stagger;
                                                    
                                                    const elbowX = cx + radius * Math.cos(-midAngle * RADIAN);
                                                    const elbowY = cy + radius * Math.sin(-midAngle * RADIAN);
                                                    
                                                    const horizontalLength = 15;
                                                    const textX = elbowX + (elbowX > cx ? horizontalLength : -horizontalLength);
                                                    
                                                    return (
                                                        <text x={textX + (elbowX > cx ? 4 : -4)} y={elbowY} fill="#475569" textAnchor={elbowX > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="10px" fontWeight="600">
                                                            {name} ({value})
                                                        </text>
                                                    );
                                                }}
                                            >
                                                {branchPieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip 
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '12px', fontWeight: 600 }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                                        No branch breakdown available
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* ─── BRANCH WISE SUMMARY CARDS ─────────────────────────── */}
                    <div style={{ marginTop: '24px' }}>
                        <h3 style={{ marginTop: 0, color: '#1e293b', fontSize: '18px', fontWeight: 600, paddingBottom: '16px', borderBottom: '1px solid rgba(226, 232, 240, 0.6)', marginBottom: '16px' }}>
                            Out of Charge Jobs by Branch
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                            {Object.values(groupedData).map((branchData, index) => (
                                <div key={branchData.name} className="fleet-card" style={{
                                    padding: '24px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '16px',
                                    '--fc-accent': COLORS[index % COLORS.length]
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', zIndex: 1 }}>
                                        <div style={{ fontSize: '15px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                                            {branchData.name}
                                        </div>
                                        <div style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                                            {branchData.count}
                                        </div>
                                    </div>
                                    
                                    {Object.values(branchData.ports).length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '16px', borderTop: '1px solid rgba(226,232,240,0.6)', zIndex: 1 }}>
                                            {Object.values(branchData.ports).map((portData, i) => (
                                                <div key={portData.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(241,245,249,0.5)', padding: '10px 14px', borderRadius: '8px' }}>
                                                    <span style={{ fontSize: '13px', color: '#475569', fontWeight: 600 }}>{portData.name}</span>
                                                    <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 800 }}>{portData.count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {Object.keys(groupedData).length === 0 && (
                                <div className="fleet-card" style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', gridColumn: '1 / -1' }}>
                                    No data available
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

        </div>
    );
};

export default ImportOutOfChargeSummaryReport;
