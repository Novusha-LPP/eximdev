import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getEndpoint } from './reports-helper';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57', '#a4de6c'];

const ImportPendingSummaryReport = ({
    filterType,
    selectedMonth,
    selectedYear,
    selectedQuarter,
    dateRange,
    selectedDay,
    category,
}) => {
    const navigate = useNavigate();
    const [rawQueryData, setRawQueryData] = useState([]);
    const [rawCategoryData, setRawCategoryData] = useState([]);
    const [totalJobsCreated, setTotalJobsCreated] = useState(0);
    const [readyForBillingSeaCount, setReadyForBillingSeaCount] = useState(0);
    const [readyForBillingAirCount, setReadyForBillingAirCount] = useState(0);
    const [loading, setLoading] = useState(true);
    
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
                const endpoint = getEndpoint('/project-nucleus/pending-job-summaries');
                const params = {
                    filterType,
                    month: selectedMonth,
                    year: selectedYear,
                    quarter: selectedQuarter,
                    startDate: dateRange[0] ? dateRange[0].toISOString() : null,
                    endDate: dateRange[1] ? dateRange[1].toISOString() : null,
                    day: selectedDay,
                };
                const res = await axios.get(endpoint, { params, withCredentials: true });
                
                if (res.data && res.data.data) {
                    setRawQueryData(res.data.data);
                    setRawCategoryData(res.data.categoryData || []);
                    setTotalJobsCreated(res.data.totalCreated || 0);
                    setReadyForBillingSeaCount(res.data.readyForBillingSeaCount || 0);
                    setReadyForBillingAirCount(res.data.readyForBillingAirCount || 0);
                } else {
                    // Fallback in case backend returns old format (array)
                    setRawQueryData(Array.isArray(res.data) ? res.data : []);
                    setRawCategoryData([]);
                    setTotalJobsCreated(0);
                    setReadyForBillingSeaCount(0);
                    setReadyForBillingAirCount(0);
                }
            } catch (error) {
                console.error('Error fetching pending job summaries:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSummaries();
    }, [filterType, selectedMonth, selectedYear, selectedQuarter, dateRange, selectedDay]);

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
    const totalPendingRaw = useMemo(() =>
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
        totalJobsCreated > 0 ? (totalJobsCreated - unassignedJobsCount) : (totalPendingRaw - unassignedJobsCount),
        [totalJobsCreated, totalPendingRaw, unassignedJobsCount]
    );

    const assignmentPercentage = useMemo(() => {
        // If there are no jobs created in this period, everything is implicitly perfectly assigned (100%)
        const denominator = totalJobsCreated > 0 ? totalJobsCreated : totalPendingRaw;
        if (denominator === 0) return 100;
        return ((assignedJobsCount / denominator) * 100).toFixed(0);
    }, [totalJobsCreated, totalPendingRaw, assignedJobsCount]);

    // Simplified dataset (no assignment filtering)
    const filteredData = rawQueryData;

    // Active KPI Total (updates with assignment filter)
    const totalPending = useMemo(() =>
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
                <div style={{ marginTop: '1rem', color: '#6b7280' }}>Loading pending job summaries...</div>
            </div>
        );
    }

    // Determine color for Assignment Rate
    const assignmentColor = assignmentPercentage == 100 ? '#10b981' : assignmentPercentage > 50 ? '#f59e0b' : '#ef4444';

    return (
        <div style={{ padding: '0 8px' }}>
            
            {/* KPI Cards Row */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px',
                marginBottom: '24px'
            }}>
                {/* Total Pending Jobs */}
                <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', borderLeft: '4px solid #3b82f6' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Job Count</h3>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>{totalPending}</div>
                </div>

                {/* Jobs Pending Billing (Accounts) - SEA */}
                {(!category || category.toLowerCase() === 'sea' || category.toLowerCase() === 'all') && (
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', borderLeft: '4px solid #f59e0b' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ready to Send to Billing (SEA)</h3>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>{readyForBillingSeaCount}</div>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>(Financial Year)</div>
                        </div>
                    </div>
                )}

                {/* Jobs Pending Billing (Accounts) - AIR */}
                {(!category || category.toLowerCase() === 'air' || category.toLowerCase() === 'all') && (
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', borderLeft: '4px solid #06b6d4' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ready to Send to Billing (AIR)</h3>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>{readyForBillingAirCount}</div>
                            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>(Financial Year)</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Tabs (Data vs Visuals) */}
            <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '20px' }}>
                <button
                    onClick={() => setMainTab('data')}
                    style={{
                        padding: '12px 24px',
                        background: 'none',
                        border: 'none',
                        borderBottom: mainTab === 'data' ? '3px solid #3b82f6' : '3px solid transparent',
                        color: mainTab === 'data' ? '#3b82f6' : '#64748b',
                        fontWeight: mainTab === 'data' ? 700 : 500,
                        fontSize: '15px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        marginBottom: '-2px'
                    }}
                >
                    📑 Data Tables
                </button>
                <button
                    onClick={() => setMainTab('visuals')}
                    style={{
                        padding: '12px 24px',
                        background: 'none',
                        border: 'none',
                        borderBottom: mainTab === 'visuals' ? '3px solid #8b5cf6' : '3px solid transparent',
                        color: mainTab === 'visuals' ? '#8b5cf6' : '#64748b',
                        fontWeight: mainTab === 'visuals' ? 700 : 500,
                        fontSize: '15px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        marginBottom: '-2px'
                    }}
                >
                    📊 Data Visuals
                </button>
            </div>


            {/* ─── VISUALS VIEW ─────────────────────────────────────────── */}
            {mainTab === 'visuals' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1100px', margin: '0 auto' }}>
                    
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                        {/* Branch Load Donut */}
                        <div style={{ flex: '1 1 400px', background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <h3 style={{ marginTop: 0, color: '#1e293b', fontSize: '16px' }}>Pending Jobs by Branch</h3>
                            <div style={{ height: '280px', width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={branchPieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {branchPieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip formatter={(value) => [`${value} jobs`, 'Pending']} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>


                    </div>

                    {/* Branch vs Port Stacked Bar */}
                    <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ marginTop: 0, color: '#1e293b', fontSize: '16px' }}>Branch vs Port Job Distribution</h3>
                        <div style={{ height: '340px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={branchPortChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="branch" />
                                    <YAxis />
                                    <RechartsTooltip cursor={{ fill: '#f1f5f9' }} />
                                    <Legend />
                                    {uniquePorts.map((port, idx) => (
                                        <Bar key={port} dataKey={port} stackId="a" fill={COLORS[idx % COLORS.length]} />
                                    ))}
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            )}

            {/* ─── DATA VIEW ────────────────────────────────────────────── */}
            {mainTab === 'data' && (
                <div>
                    

                        <div className="nucleus-table-wrapper" style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                            <table className="nucleus-table" style={{ margin: 0 }}>
                                <thead style={{ background: '#f8fafc' }}>
                                    <tr>
                                        <th style={{ width: '60px' }}>S.No</th>
                                        <th>Branch / Port</th>
                                        <th style={{ textAlign: 'right', width: '220px' }}>Pending Jobs (Click to view list)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(groupedData).length > 0 ? (
                                        Object.values(groupedData).map((branch, bIdx) => {
                                            const isBranchExpanded = !!expandedBranches[branch.name];
                                            return (
                                                <React.Fragment key={branch.name}>
                                                    {/* Branch Level Row */}
                                                    <tr style={{ background: '#f1f5f9', fontWeight: 600 }}>
                                                        <td style={{ color: '#64748b' }}>{bIdx + 1}</td>
                                                        <td>
                                                            <div 
                                                                onClick={() => toggleBranch(branch.name)}
                                                                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', userSelect: 'none' }}
                                                            >
                                                                <span style={{ fontSize: '10px', color: '#64748b', width: '12px' }}>{isBranchExpanded ? '▼' : '▶'}</span>
                                                                <span className="handler-tag" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 700, padding: '4px 10px', fontSize: '13px' }}>
                                                                    🏢 Branch: {branch.name}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            <span 
                                                                onClick={() => handleDrillDown(branch.name)}
                                                                title={`Click to view all pending jobs in ${branch.name}`}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    padding: '4px 12px',
                                                                    borderRadius: '20px',
                                                                    fontSize: '12px',
                                                                    fontWeight: 700,
                                                                    background: '#0284c7',
                                                                    color: '#fff',
                                                                    cursor: 'pointer',
                                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                                                }}
                                                            >
                                                                {branch.count}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                    
                                                    {/* Port Level Rows */}
                                                    {isBranchExpanded && Object.values(branch.ports).map((port) => {
                                                        const portKey = `${branch.name}-${port.name}`;
                                                        const isPortExpanded = !!expandedPorts[portKey];
                                                        const assignedEmployees = port.employees.filter(emp => emp.name !== 'Unassigned');
                                                        const hasAssigned = assignedEmployees.length > 0;
                                                        return (
                                                            <React.Fragment key={port.name}>
                                                                <tr style={{ background: '#fafafa' }}>
                                                                    <td></td>
                                                                    <td style={{ paddingLeft: '32px' }}>
                                                                        <div 
                                                                            /* removed */
                                                                            style={{ cursor: hasAssigned ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: '8px', userSelect: 'none' }}
                                                                        >
                                                                            <span style={{ fontSize: '8px', color: '#64748b', width: '10px' }}>
                                                                                '•'
                                                                            </span>
                                                                            <span className="handler-tag" style={{ background: '#fef3c7', color: '#b45309', fontWeight: 600, padding: '3px 8px', fontSize: '12px' }}>
                                                                                ⚓ Port: {port.name}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ textAlign: 'right' }}>
                                                                        <span 
                                                                            onClick={() => handleDrillDown(port.name)}
                                                                            title={`Click to view all pending jobs in port ${port.name}`}
                                                                            style={{
                                                                                display: 'inline-flex',
                                                                                alignItems: 'center',
                                                                                gap: '4px',
                                                                                padding: '3px 10px',
                                                                                borderRadius: '20px',
                                                                                fontSize: '11px',
                                                                                fontWeight: 700,
                                                                                background: '#d97706',
                                                                                color: '#fff',
                                                                                cursor: 'pointer',
                                                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                                            }}
                                                                        >
                                                                            {port.count}
                                                                        </span>
                                                                    </td>
                                                                </tr>

                                                                </React.Fragment>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="3" style={{ textAlign: 'center', color: '#6b7280', padding: '40px' }}>
                                                No pending jobs found for the selected period.
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
};export default ImportPendingSummaryReport;
