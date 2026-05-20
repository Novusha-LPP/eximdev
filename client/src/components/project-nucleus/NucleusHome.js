import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    parse, isToday, isThisWeek, isThisMonth, isThisQuarter, isThisYear, isValid,
    subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear,
    isWithinInterval, getYear, getMonth, getQuarter, format
} from 'date-fns';
import {
    ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine
} from 'recharts';
import './NucleusHome.css';

const CustomMonthlyTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        let formattedLabel = '';
        if (label) {
            const parts = label.split('-');
            if (parts.length >= 2) {
                const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
                formattedLabel = format(d, 'MMMM yyyy');
            } else {
                formattedLabel = label;
            }
        }
        
        const names = data.names || [];

        return (
            <div className="custom-chart-tooltip">
                <p className="tooltip-title">{formattedLabel}</p>
                <p className="tooltip-value">
                    <span className="tooltip-bullet" style={{ backgroundColor: '#8b5cf6' }}></span>
                    Active Users: <strong>{data.count}</strong>
                </p>
                {names.length > 0 && (
                    <div className="tooltip-users-list">
                        <p className="users-list-title">Active Names:</p>
                        <div className="users-list-tags">
                            {names.map((name, i) => (
                                <span key={i} className="tooltip-user-tag">{name}</span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }
    return null;
};

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

const NucleusHome = () => {
    // Categories Configuration
    const reportCategories = [
        {
            id: 'import',
            label: 'Import',
            icon: '🚢',
            reports: [
                { id: 'fine', label: 'Bill of Entry – Fine Report' },
                { id: 'penalty', label: 'Bill of Entry – Penalty Report' },
                { id: 'top10', label: 'Top 10 Importers' }
            ]
        },
        { id: 'export', label: 'Export', icon: '🛫', reports: [] },
        {
            id: 'transport',
            label: 'Transport',
            icon: '🚚',
            reports: [
                { id: 'transport_table', label: 'Top 10 Transporters Volume' },
                { id: 'fleet_utilization', label: 'Fleet Utilization' },
                { id: 'elock_lr_completed', label: 'LR Completed Count' }
            ]
        },
        {
            id: 'business',
            label: 'Business',
            icon: '💼',
            reports: [
                { id: 'udyam', label: 'Customer UDYAM Registration' },
                { id: 'training', label: 'Customer Training Records' },
                { id: 'client_login_analytics', label: 'Client User Login Analytics' }
            ]
        },
        { id: 'sharanga', label: 'Sharanga', icon: '🕉️', reports: [] },
        {
            id: 'elock',
            label: 'Elock',
            icon: '🔒',
            reports: [
                { id: 'elock_utilization', label: 'E-Lock Utilization' },
                { id: 'elock_assigned_count', label: 'E-Lock Assigned Count' }
            ]
        }
    ];

    const [activeReport, setActiveReport] = useState('fine');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCategory, setExpandedCategory] = useState('import');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const activeReportDetails = reportCategories
        .flatMap(c => c.reports)
        .find(r => r.id === activeReport);

    // Filter State
    const [filterType, setFilterType] = useState('month'); // Default to month
    const [presetFilter, setPresetFilter] = useState('all'); // 'day', 'week', 'month', 'last-month', 'quarter', 'year', 'all'
    const [selectedDay, setSelectedDay] = useState(format(new Date(), 'yyyy-MM-dd'));

    // Custom Filter Values
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [top10Data, setTop10Data] = useState([]);
    const [top10Loading, setTop10Loading] = useState(false);
    const [udyamData, setUdyamData] = useState([]);
    const [udyamLoading, setUdyamLoading] = useState(false);
    const [udyamSearch, setUdyamSearch] = useState('');
    const [udyamStatusFilter, setUdyamStatusFilter] = useState('all');
    const [trainingData, setTrainingData] = useState([]);
    const [trainingLoading, setTrainingLoading] = useState(false);
    const [trainingSearch, setTrainingSearch] = useState('');
    const [trainingStatusFilter, setTrainingStatusFilter] = useState('all');
    const [clientAnalyticsData, setClientAnalyticsData] = useState({ users: [], daily: [], monthly: [] });
    const [clientAnalyticsLoading, setClientAnalyticsLoading] = useState(false);
    const [clientSearch, setClientSearch] = useState('');
    const [clientRoleFilter, setClientRoleFilter] = useState('all');
    const [clientStatusFilter, setClientStatusFilter] = useState('all');
    const [clientMonthFilter, setClientMonthFilter] = useState('all');
    const [clientYearFilter, setClientYearFilter] = useState('all');
    
    // Transport Reports State
    const [fleetData, setFleetData] = useState({ summary: {}, rows: [] });
    const [fleetLoading, setFleetLoading] = useState(false);
    const [expandedFleetRows, setExpandedFleetRows] = useState({});
    
    const [elockData, setElockData] = useState({ summary: {}, rows: [] });
    const [elockMeta, setElockMeta] = useState({});
    const [elockLoading, setElockLoading] = useState(false);

    // Transport Dashboard State (summary + monthly + category)
    const TRANSPORT_BASE = 'https://eximbot.alvision.in/transport';
    const TRANSPORT_API_KEY = '1234567890';
    const TRANSPORT_HEADERS = { 'x-api-key': TRANSPORT_API_KEY };

    // Transport Shipment Table State
    const [transportTable, setTransportTable] = useState([]);
    const [transportTableMeta, setTransportTableMeta] = useState({ totalCount: 0 });
    const [transportTableLoading, setTransportTableLoading] = useState(false);
    const [transportTablePage, setTransportTablePage] = useState(1);
    const TRANSPORT_TABLE_LIMIT = 20;
    const [transportSortBy, setTransportSortBy] = useState('totalShipments');
    const [transportSortOrder, setTransportSortOrder] = useState('desc');

    // E-Lock Dashboard State
    const [elockAssigned, setElockAssigned] = useState([]);
    const [elockAssignedSummary, setElockAssignedSummary] = useState({});
    const [elockAssignedLoading, setElockAssignedLoading] = useState(false);
    const [elockLrCompleted, setElockLrCompleted] = useState([]);
    const [elockLrSummary, setElockLrSummary] = useState({});
    const [elockLrLoading, setElockLrLoading] = useState(false);
    const [elockDashFilterType, setElockDashFilterType] = useState('consignee'); // consignee | consignor

    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' });

    // Generate years for dropdown (Current year - 5 to Current year + 1)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    useEffect(() => {
        const fetchReports = async () => {
            try {
                // Determine API URL based on environment or existing convention
                let apiUrl = process.env.REACT_APP_API_STRING || 'http://localhost:9006';
                // Remove trailing slash if present
                if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);

                // Construct endpoint
                // If apiUrl already ends with /api, don't append it again
                const endpoint = apiUrl.endsWith('/api')
                    ? `${apiUrl}/project-nucleus/reports`
                    : `${apiUrl}/api/project-nucleus/reports`;

                const response = await axios.get(endpoint, { withCredentials: true });
                console.log("Project Nucleus Data:", response.data); // Debugging
                setData(response.data);
            } catch (error) {
                console.error("Error fetching reports:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, []);

    useEffect(() => {
        if (activeReport === 'top10') {
            const fetchTop10 = async () => {
                setTop10Loading(true);
                try {
                    let apiUrl = process.env.REACT_APP_API_STRING || 'http://localhost:9006';
                    if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
                    const endpoint = apiUrl.endsWith('/api')
                        ? `${apiUrl}/project-nucleus/top-importers`
                        : `${apiUrl}/api/project-nucleus/top-importers`;

                    const params = {
                        filterType,
                        month: selectedMonth,
                        year: selectedYear,
                        quarter: selectedQuarter,
                        startDate: dateRange.start,
                        endDate: dateRange.end
                    };

                    const res = await axios.get(endpoint, { params, withCredentials: true });
                    setTop10Data(res.data);
                } catch (error) {
                    console.error("Error fetching top 10 importers:", error);
                } finally {
                    setTop10Loading(false);
                }
            };
            fetchTop10();
        }
    }, [activeReport, filterType, selectedMonth, selectedYear, selectedQuarter, dateRange]);

    useEffect(() => {
        if (activeReport === 'udyam') {
            const fetchUdyam = async () => {
                setUdyamLoading(true);
                try {
                    let apiUrl = process.env.REACT_APP_API_STRING || 'http://localhost:9006';
                    if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
                    const endpoint = apiUrl.endsWith('/api')
                        ? `${apiUrl}/project-nucleus/customer-udyam`
                        : `${apiUrl}/api/project-nucleus/customer-udyam`;

                    const res = await axios.get(endpoint, { withCredentials: true });
                    setUdyamData(res.data);
                } catch (error) {
                    console.error("Error fetching customer udyam details:", error);
                } finally {
                    setUdyamLoading(false);
                }
            };
            fetchUdyam();
        }
    }, [activeReport]);

    useEffect(() => {
        if (activeReport === 'training') {
            const fetchTrainings = async () => {
                setTrainingLoading(true);
                try {
                    let apiUrl = process.env.REACT_APP_API_STRING || 'http://localhost:9006';
                    if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
                    const endpoint = apiUrl.endsWith('/api')
                        ? `${apiUrl}/customer-trainings`
                        : `${apiUrl}/api/customer-trainings`;

                    const res = await axios.get(endpoint, { withCredentials: true });
                    setTrainingData(res.data);
                } catch (err) {
                    console.error("Error fetching training details for Project Nucleus:", err);
                } finally {
                    setTrainingLoading(false);
                }
            };
            fetchTrainings();
        }
    }, [activeReport]);

    useEffect(() => {
        if (activeReport === 'client_login_analytics') {
            const fetchClientAnalytics = async () => {
                setClientAnalyticsLoading(true);
                try {
                    let apiUrl = process.env.REACT_APP_API_STRING || 'http://localhost:9006';
                    if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);
                    const endpoint = apiUrl.endsWith('/api')
                        ? `${apiUrl}/project-nucleus/client-login-analytics`
                        : `${apiUrl}/api/project-nucleus/client-login-analytics`;

                    const res = await axios.get(endpoint, { withCredentials: true });
                    setClientAnalyticsData(res.data);
                } catch (err) {
                    console.error("Error fetching client login analytics for Project Nucleus:", err);
                } finally {
                    setClientAnalyticsLoading(false);
                }
            };
            fetchClientAnalytics();
        }
    }, [activeReport]);

    useEffect(() => {
        if (['fleet_utilization', 'elock_utilization'].includes(activeReport)) {
            setFilterType('day');
            setSelectedDay(format(new Date(), 'yyyy-MM-dd'));
        } else {
            if (filterType === 'day') {
                setFilterType('month');
            }
        }
    }, [activeReport]);

    const getTransportDates = () => {
        let sd = '', ed = '';
        if (filterType === 'day') {
            const dateObj = parse(selectedDay, 'yyyy-MM-dd', new Date());
            if (isValid(dateObj)) {
                sd = format(startOfMonth(dateObj), 'yyyy-MM-dd');
                ed = format(endOfMonth(dateObj), 'yyyy-MM-dd');
            } else {
                sd = format(startOfMonth(new Date()), 'yyyy-MM-dd');
                ed = format(endOfMonth(new Date()), 'yyyy-MM-dd');
            }
        } else if (filterType === 'month') {
            sd = format(new Date(selectedYear, selectedMonth, 1), 'yyyy-MM-dd');
            ed = format(endOfMonth(new Date(selectedYear, selectedMonth, 1)), 'yyyy-MM-dd');
        } else if (filterType === 'quarter') {
            const firstMonthOfQuarter = (selectedQuarter - 1) * 3;
            sd = format(new Date(selectedYear, firstMonthOfQuarter, 1), 'yyyy-MM-dd');
            ed = format(endOfMonth(new Date(selectedYear, firstMonthOfQuarter + 2, 1)), 'yyyy-MM-dd');
        } else if (filterType === 'year') {
            sd = format(new Date(selectedYear, 0, 1), 'yyyy-MM-dd');
            ed = format(new Date(selectedYear, 11, 31), 'yyyy-MM-dd');
        } else if (filterType === 'custom') {
            sd = dateRange.start;
            ed = dateRange.end;
        }
        return { startDate: sd, endDate: ed };
    };

    useEffect(() => {
        if (activeReport === 'fleet_utilization') {
            const fetchFleet = async () => {
                setFleetLoading(true);
                try {
                    const { startDate, endDate } = getTransportDates();
                    if (!startDate || !endDate) {
                        setFleetLoading(false);
                        return;
                    }
                    const res = await axios.get(`${TRANSPORT_BASE}/api/fleet/utilization-report`, {
                        params: { startDate, endDate },
                        headers: TRANSPORT_HEADERS,
                        withCredentials: true
                    });
                    console.log('Fleet utilization raw response:', res.data);
                    const d = res.data;
                    if (d) {
                        // API returns rows under 'dailyRows' key (per fleet_elock_report.html line 699)
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
                    setFleetLoading(false);
                }
            };
            fetchFleet();
        }
    }, [activeReport, filterType, selectedMonth, selectedYear, selectedQuarter, dateRange, selectedDay]);

    useEffect(() => {
        if (activeReport === 'elock_utilization') {
            const fetchElock = async () => {
                setElockLoading(true);
                try {
                    const { startDate, endDate } = getTransportDates();
                    const params = {};
                    if (startDate) params.startDate = startDate;
                    if (endDate) params.endDate = endDate;
                    const res = await axios.get(`${TRANSPORT_BASE}/api/elock/utilization-report`, { 
                        params,
                        headers: TRANSPORT_HEADERS,
                        withCredentials: true 
                    });
                    if (res.data && res.data.success) {
                        setElockData(res.data.data);
                        setElockMeta(res.data.meta || {});
                    }
                } catch (err) {
                    console.error("Error fetching elock report:", err);
                } finally {
                    setElockLoading(false);
                }
            };
            fetchElock();
        }
    }, [activeReport, filterType, selectedMonth, selectedYear, selectedQuarter, dateRange, selectedDay]);

    // Transport Shipment Table
    useEffect(() => {
        if (activeReport === 'transport_table') {
            const fetchTable = async () => {
                setTransportTableLoading(true);
                try {
                    const { startDate: from, endDate: to } = getTransportDates();
                    if (!from || !to) { setTransportTableLoading(false); return; }
                    const res = await axios.get(`${TRANSPORT_BASE}/api/reports/table`, {
                        params: { from, to, page: transportTablePage, limit: TRANSPORT_TABLE_LIMIT, sortBy: transportSortBy, sortOrder: transportSortOrder },
                        headers: TRANSPORT_HEADERS,
                        withCredentials: true
                    });
                    setTransportTable(res.data?.data || res.data || []);
                    setTransportTableMeta({ totalCount: res.data?.totalCount || 0 });
                } catch (err) {
                    console.error('Error fetching transport table:', err);
                } finally {
                    setTransportTableLoading(false);
                }
            };
            fetchTable();
        }
    }, [activeReport, filterType, selectedMonth, selectedYear, selectedQuarter, dateRange, selectedDay, transportTablePage, transportSortBy, transportSortOrder]);

    // E-Lock Assigned Count
    useEffect(() => {
        if (activeReport === 'elock_assigned_count') {
            const fetchAssigned = async () => {
                setElockAssignedLoading(true);
                try {
                    const { startDate: from, endDate: to } = getTransportDates();
                    if (!from || !to) { setElockAssignedLoading(false); return; }
                    const url = `${TRANSPORT_BASE}/api/client-elock-dashboard/assigned-count`;
                    console.log('E-Lock Assigned: calling', url, { from, to, filterType: elockDashFilterType });
                    const res = await axios.get(url, {
                        params: { from, to, filterType: elockDashFilterType },
                        headers: TRANSPORT_HEADERS,
                        withCredentials: true
                    });
                    console.log('E-Lock Assigned raw response:', res.data);
                    const raw = res.data;
                    const inner = raw?.data ?? {};
                    const arr = Array.isArray(inner?.byParty) ? inner.byParty : [];
                    setElockAssigned(arr);
                    setElockAssignedSummary({
                        prAssignedCount: inner.prAssignedCount ?? 0,
                        othersAssignedCount: inner.othersAssignedCount ?? 0,
                        totalAssignedCount: inner.totalAssignedCount ?? arr.length
                    });
                } catch (err) {
                    console.error('Error fetching elock assigned count:', err);
                } finally {
                    setElockAssignedLoading(false);
                }
            };
            fetchAssigned();
        }
    }, [activeReport, filterType, selectedMonth, selectedYear, selectedQuarter, dateRange, selectedDay, elockDashFilterType]);

    // E-Lock LR Completed Count
    useEffect(() => {
        if (activeReport === 'elock_lr_completed') {
            const fetchLr = async () => {
                setElockLrLoading(true);
                try {
                    const { startDate: from, endDate: to } = getTransportDates();
                    if (!from || !to) { setElockLrLoading(false); return; }
                    const urlLr = `${TRANSPORT_BASE}/api/client-elock-dashboard/lr-completed-count`;
                    console.log('LR Completed: calling', urlLr, { from, to, filterType: elockDashFilterType });
                    const res = await axios.get(urlLr, {
                        params: { from, to, filterType: elockDashFilterType },
                        headers: TRANSPORT_HEADERS,
                        withCredentials: true
                    });
                    console.log('LR Completed raw response:', res.data);
                    const rawLr = res.data;
                    const innerLr = rawLr?.data ?? {};
                    const arrLr = Array.isArray(innerLr?.byParty) ? innerLr.byParty : [];
                    setElockLrCompleted(arrLr);
                    setElockLrSummary({
                        totalCompletedCount: innerLr.totalCompletedCount ?? arrLr.length
                    });
                } catch (err) {
                    console.error('Error fetching elock lr completed:', err);
                } finally {
                    setElockLrLoading(false);
                }
            };
            fetchLr();
        }
    }, [activeReport, filterType, selectedMonth, selectedYear, selectedQuarter, dateRange, selectedDay, elockDashFilterType]);

    const toggleFleetRow = (index) => {
        setExpandedFleetRows(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const filteredUdyamData = useMemo(() => {
        return udyamData.filter(item => {
            const name = (item.name_of_individual || '').toLowerCase();
            const iec = (item.iec_no || '').toLowerCase();
            const udyam = (item.udyam_no || '').toLowerCase();
            const search = udyamSearch.toLowerCase();
            const matchesSearch = name.includes(search) || iec.includes(search) || udyam.includes(search);

            let matchesStatus = true;
            if (udyamStatusFilter === 'registered') {
                matchesStatus = !!item.udyam_no && item.udyam_no.trim() !== '';
            } else if (udyamStatusFilter === 'pending') {
                matchesStatus = !item.udyam_no || item.udyam_no.trim() === '';
            }

            return matchesSearch && matchesStatus;
        });
    }, [udyamData, udyamSearch, udyamStatusFilter]);

    const filteredTrainingData = useMemo(() => {
        return trainingData.filter(item => {
            const code = (item.training_code || '').toLowerCase();
            const customer = (item.customerName || '').toLowerCase();
            const trainee = (item.trainee_name || '').toLowerCase();
            const trainer = (item.trainer_name || '').toLowerCase();
            const search = trainingSearch.toLowerCase();
            const matchesSearch = code.includes(search) || customer.includes(search) || trainee.includes(search) || trainer.includes(search);

            let matchesStatus = true;
            if (trainingStatusFilter !== 'all') {
                matchesStatus = item.training_status === trainingStatusFilter;
            }
            return matchesSearch && matchesStatus;
        });
    }, [trainingData, trainingSearch, trainingStatusFilter]);

    const filteredClientData = useMemo(() => {
        return (clientAnalyticsData.users || []).filter(item => {
            const name = (item.name || '').toLowerCase();
            const email = (item.email || '').toLowerCase();
            const search = clientSearch.toLowerCase();
            const matchesSearch = name.includes(search) || email.includes(search);

            let matchesRole = true;
            if (clientRoleFilter !== 'all') {
                matchesRole = (item.role || '').toLowerCase() === clientRoleFilter.toLowerCase();
            }

            let matchesStatus = true;
            if (clientStatusFilter !== 'all') {
                if (clientStatusFilter === 'active') {
                    matchesStatus = item.isActive && item.status === 'active';
                } else if (clientStatusFilter === 'inactive') {
                    matchesStatus = !item.isActive || item.status !== 'active';
                }
            }

            let matchesMonth = true;
            if (clientMonthFilter !== 'all') {
                if (!item.lastLogin) {
                    matchesMonth = false;
                } else {
                    const d = new Date(item.lastLogin);
                    matchesMonth = d.getMonth() === parseInt(clientMonthFilter);
                }
            }

            let matchesYear = true;
            if (clientYearFilter !== 'all') {
                if (!item.lastLogin) {
                    matchesYear = false;
                } else {
                    const d = new Date(item.lastLogin);
                    matchesYear = d.getFullYear() === parseInt(clientYearFilter);
                }
            }

            return matchesSearch && matchesRole && matchesStatus && matchesMonth && matchesYear;
        });
    }, [clientAnalyticsData.users, clientSearch, clientRoleFilter, clientStatusFilter, clientMonthFilter, clientYearFilter]);

    // Trend analysis: sort fleet data rows chronologically for daily trend visualization
    const fleetChartData = useMemo(() => {
        if (!fleetData.rows || fleetData.rows.length === 0) return [];
        return [...fleetData.rows].sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [fleetData.rows]);

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

    // Calculate smart KPI card statistics for fleet report, handling single-day versus multi-day ranges
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

    // Isolates table rows to only display the selected day in Day-Wise mode
    const displayedFleetRows = useMemo(() => {
        if (filterType === 'day') {
            return (fleetData.rows || []).filter(row => row.date === selectedDay);
        }
        return fleetData.rows || [];
    }, [fleetData.rows, filterType, selectedDay]);

    const displayedElockRows = useMemo(() => {
        if (filterType === 'day') {
            return (elockData.rows || []).filter(row => row.date === selectedDay);
        }
        return elockData.rows || [];
    }, [elockData.rows, filterType, selectedDay]);

    const totalCustomersCount = udyamData.length;
    const registeredCount = udyamData.filter(c => c.udyam_no && c.udyam_no.trim() !== "").length;
    const pendingCount = totalCustomersCount - registeredCount;

    const totalTrainings = trainingData.length;
    const completedTrainings = trainingData.filter(t => t.training_status === 'Completed').length;
    const pendingTrainings = trainingData.filter(t => t.training_status === 'Pending').length;
    const ratedTrainings = trainingData.filter(t => t.feedback_rating);
    const avgRating = ratedTrainings.length > 0
        ? (ratedTrainings.reduce((sum, t) => sum + t.feedback_rating, 0) / ratedTrainings.length).toFixed(1)
        : '0.0';

    const handleSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setSortConfig({ key, direction });
    };

    const sortedTop10Data = useMemo(() => {
        if (!sortConfig.key) return top10Data;

        return [...top10Data].sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [top10Data, sortConfig]);

    const filterByTime = (items) => {
        return items.filter(item => {
            if (!item.be_date) return false;

            // Try parsing with multiple formats
            let date = parse(item.be_date, 'dd-MM-yyyy', new Date());

            if (!isValid(date)) {
                // Try ISO format
                date = parse(item.be_date, 'yyyy-MM-dd', new Date());
            }

            if (!isValid(date)) {
                // Fallback to standard JS date parser
                date = new Date(item.be_date);
            }

            if (!isValid(date)) return false;

            if (filterType === 'day') {
                if (!selectedDay) return true;
                const itemDateStr = format(date, 'yyyy-MM-dd');
                return itemDateStr === selectedDay;
            } else if (filterType === 'date-range') {
                if (!dateRange.start || !dateRange.end) return true;
                const start = new Date(dateRange.start);
                const end = new Date(dateRange.end);
                // Set end date to end of day to include the full day
                end.setHours(23, 59, 59, 999);
                return isWithinInterval(date, { start, end });
            } else if (filterType === 'month') {
                // selectedMonth is 0-indexed
                return getMonth(date) === parseInt(selectedMonth) && getYear(date) === parseInt(selectedYear);
            } else if (filterType === 'quarter') {
                return getQuarter(date) === parseInt(selectedQuarter) && getYear(date) === parseInt(selectedYear);
            } else if (filterType === 'year') {
                return getYear(date) === parseInt(selectedYear);
            }
            // If preset is still set (like 'all'), show all
            return true;
        });
    };

    const fineData = data.filter(item => {
        const val = item.fine_val !== undefined ? item.fine_val : (parseFloat(item.fine_amount.toString().replace(/[^0-9.]/g, '')) || 0);
        return val > 0;
    });

    const penaltyData = data.filter(item => {
        const val = item.penalty_val !== undefined ? item.penalty_val : (parseFloat(item.penalty_amount.toString().replace(/[^0-9.]/g, '')) || 0);
        return val > 0;
    });

    const currentBaseData = activeReport === 'fine' ? fineData : penaltyData;
    const currentData = filterByTime(currentBaseData);





    const PresetButton = ({ label, value }) => (
        <button
            className={`filter-btn ${filterType === 'preset' && presetFilter === value ? 'active' : ''}`}
            onClick={() => {
                setFilterType('preset');
                setPresetFilter(value);
            }}
        >
            {label}
        </button>
    );

    return (
        <div className="nucleus-layout">
            {/* Left Sidebar Navigation */}
            <div className={`nucleus-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                <div className="nucleus-brand">
                    {!isSidebarCollapsed && (
                        <>
                            <span className="brand-dot"></span>
                            <span>Project Nucleus</span>
                        </>
                    )}
                    <button
                        className="sidebar-toggle-btn"
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isSidebarCollapsed ? '»' : '«'}
                    </button>
                </div>

                {!isSidebarCollapsed && (
                    <div className="report-search-container">
                        <input
                            type="text"
                            placeholder="Search reports..."
                            className="report-search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                )}

                <div className="report-categories">
                    {reportCategories.map(cat => {
                        const filteredReports = cat.reports.filter(r =>
                            r.label.toLowerCase().includes(searchTerm.toLowerCase())
                        );

                        if (searchTerm && filteredReports.length === 0) return null;

                        // If searching, show all matching. If not, respect expanded state
                        const isExpanded = searchTerm ? true : expandedCategory === cat.id;

                        return (
                            <div key={cat.id} className="category-group">
                                <div
                                    className="category-header"
                                    onClick={() => !isSidebarCollapsed && setExpandedCategory(isExpanded ? null : cat.id)}
                                    title={isSidebarCollapsed ? cat.label : ''}
                                >
                                    <span className="cat-icon">{cat.icon}</span>
                                    {!isSidebarCollapsed && <span className="cat-label">{cat.label}</span>}
                                    {!isSidebarCollapsed && <span className="cat-arrow">{isExpanded ? '▾' : '▸'}</span>}
                                </div>

                                {isExpanded && !isSidebarCollapsed && (
                                    <div className="category-reports">
                                        {(searchTerm ? filteredReports : cat.reports).map(report => (
                                            <div
                                                key={report.id}
                                                className={`report-item ${activeReport === report.id ? 'active' : ''}`}
                                                onClick={() => setActiveReport(report.id)}
                                            >
                                                {report.label}
                                            </div>
                                        ))}
                                        {(searchTerm ? filteredReports : cat.reports).length === 0 && (
                                            <div className="empty-reports">No reports available</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="nucleus-main-content">
                <div className="nucleus-header">
                    <div className="nucleus-title">{activeReportDetails?.label || 'Select a Report'}</div>
                    <div className="nucleus-subtitle">Operational and Compliance Reports Hub</div>
                </div>

                {/* Statistics Summary Section */}
                {!loading && activeReport === 'udyam' && (
                    <div className="nucleus-stats-card" style={{ borderLeft: '4px solid var(--primary-500)', background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.08) 0%, rgba(6, 182, 212, 0.01) 100%)' }}>
                        <div className="stats-text" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div>
                                Total Entities: <span className="highlight-val" style={{ color: 'var(--primary-700)' }}>{totalCustomersCount}</span>
                            </div>
                            <div>
                                UDYAM Registered: <span className="highlight-val" style={{ color: '#10b981' }}>{registeredCount}</span>
                            </div>
                            <div>
                                Pending / Not Provided: <span className="highlight-val" style={{ color: '#f59e0b' }}>{pendingCount}</span>
                            </div>
                            <div style={{ marginLeft: 'auto' }}>
                                Registration Rate: <span className="highlight-val" style={{ color: 'var(--primary-700)' }}>
                                    {totalCustomersCount > 0 ? ((registeredCount / totalCustomersCount) * 100).toFixed(1) : 0}%
                                </span>
                            </div>
                        </div>
                    </div>
                )}
                {!loading && activeReport === 'training' && (
                    <div className="nucleus-stats-card" style={{ borderLeft: '4px solid #8b5cf6', background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0.01) 100%)' }}>
                        <div className="stats-text" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div>
                                Total Sessions: <span className="highlight-val" style={{ color: '#8b5cf6' }}>{totalTrainings}</span>
                            </div>
                            <div>
                                Completed: <span className="highlight-val" style={{ color: '#10b981' }}>{completedTrainings}</span>
                            </div>
                            <div>
                                Pending: <span className="highlight-val" style={{ color: '#f59e0b' }}>{pendingTrainings}</span>
                            </div>
                            <div style={{ marginLeft: 'auto' }}>
                                Average Feedback: <span className="highlight-val" style={{ color: '#eab308' }}>★ {avgRating}</span>
                            </div>
                        </div>
                    </div>
                )}
                {!loading && activeReport === 'client_login_analytics' && (
                    <div className="nucleus-stats-card" style={{ borderLeft: '4px solid #3b82f6', background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.01) 100%)' }}>
                        <div className="stats-text" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
                            {(() => {
                                const users = clientAnalyticsData.users || [];
                                const totalUsers = users.length;
                                const activeUsers = users.filter(u => u.isActive && u.status === 'active').length;
                                
                                // Daily logins (last login is today)
                                const loggedInToday = users.filter(u => {
                                    if (!u.lastLogin) return false;
                                    const d = new Date(u.lastLogin);
                                    const today = new Date();
                                    return d.getDate() === today.getDate() && 
                                           d.getMonth() === today.getMonth() && 
                                           d.getFullYear() === today.getFullYear();
                                }).length;

                                // Monthly logins (last login is this month)
                                const loggedInThisMonth = users.filter(u => {
                                    if (!u.lastLogin) return false;
                                    const d = new Date(u.lastLogin);
                                    const today = new Date();
                                    return d.getMonth() === today.getMonth() && 
                                           d.getFullYear() === today.getFullYear();
                                }).length;

                                return (
                                    <>
                                        <div>
                                            Total Clients: <span className="highlight-val" style={{ color: '#3b82f6' }}>{totalUsers}</span>
                                        </div>
                                        <div>
                                            Active System Users: <span className="highlight-val" style={{ color: '#10b981' }}>{activeUsers}</span>
                                        </div>
                                        <div>
                                            Logged In Today: <span className="highlight-val" style={{ color: '#ec4899' }}>{loggedInToday}</span>
                                        </div>
                                        <div>
                                            Logged In This Month: <span className="highlight-val" style={{ color: '#8b5cf6' }}>{loggedInThisMonth}</span>
                                        </div>
                                        <div style={{ marginLeft: 'auto' }}>
                                            Active Engagement Rate: <span className="highlight-val" style={{ color: '#10b981' }}>
                                                {totalUsers > 0 ? ((activeUsers / totalUsers) * 100).toFixed(1) : 0}%
                                            </span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}
                {!loading && activeReport === 'fleet_utilization' && fleetSummaryObj && (
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
                )}
                {!loading && activeReport === 'elock_utilization' && elockSummaryObj && (
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
                )}
                {!loading && ['fine', 'penalty'].includes(activeReport) && (
                    <div className="nucleus-stats-card">
                        <div className="stats-text">
                            {(() => {
                                // Calculate Stats
                                // 1. All Jobs in the selected period (Total Filed)
                                const allJobsInPeriod = filterByTime(data); // data contains ALL jobs now
                                const totalFiled = allJobsInPeriod.length;

                                // 2. Jobs with Fines/Penalties in the selected period
                                const relevantJobsInPeriod = allJobsInPeriod.filter(item => {
                                    const val = activeReport === 'fine'
                                        ? (item.fine_val !== undefined ? item.fine_val : (parseFloat(item.fine_amount?.toString().replace(/[^0-9.]/g, '') || 0)))
                                        : (item.penalty_val !== undefined ? item.penalty_val : (parseFloat(item.penalty_amount?.toString().replace(/[^0-9.]/g, '') || 0)));
                                    return val > 0;
                                });

                                const affectedCount = relevantJobsInPeriod.length;
                                const percentage = totalFiled > 0 ? ((affectedCount / totalFiled) * 100).toFixed(1) : 0;

                                // 3. Total Amount Calculation
                                const totalAmount = relevantJobsInPeriod.reduce((sum, item) => {
                                    const val = activeReport === 'fine'
                                        ? (item.fine_val !== undefined ? item.fine_val : (parseFloat(item.fine_amount?.toString().replace(/[^0-9.]/g, '') || 0)))
                                        : (item.penalty_val !== undefined ? item.penalty_val : (parseFloat(item.penalty_amount?.toString().replace(/[^0-9.]/g, '') || 0)));
                                    return sum + val;
                                }, 0);

                                // Format Currency
                                const formattedAmount = new Intl.NumberFormat('en-IN', {
                                    style: 'currency',
                                    currency: 'INR',
                                    maximumFractionDigits: 0
                                }).format(totalAmount);

                                // Construct Time Period Text
                                let periodText = "all time";
                                if (filterType === 'month') {
                                    periodText = `in ${months[selectedMonth]} ${selectedYear}`;
                                } else if (filterType === 'quarter') {
                                    periodText = `in Q${selectedQuarter} ${selectedYear}`;
                                } else if (filterType === 'year') {
                                    periodText = `in ${selectedYear}`;
                                } else if (filterType === 'date-range' && dateRange.start) {
                                    periodText = `from ${dateRange.start} to ${dateRange.end || 'today'}`;
                                }

                                return (
                                    <>
                                        In <span className="highlight-text">{periodText}</span>, we filed <span className="highlight-val">{totalFiled}</span> Bills of Entry, out of which <span className="highlight-val">{affectedCount}</span> had {activeReport === 'fine' ? 'fines' : 'penalties'} (<span className="highlight-val">{percentage}%</span>).

                                        Total {activeReport === 'fine' ? 'Fine' : 'Penalty'} Amount: <span className="highlight-val" style={{ color: activeReport === 'fine' ? '#d97706' : '#dc2626' }}>{formattedAmount}</span>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}

                <div className="nucleus-controls-container">
                    {/* Tabs removed, using Sidebar now */}

                    <div className="nucleus-filter-section">
                        {activeReport === 'udyam' ? (
                            <div className="filter-row custom-filter-row" style={{ marginTop: 0, paddingLeft: 0, background: 'transparent', gap: '1.5rem', display: 'flex', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="filter-label" style={{ minWidth: 'auto', margin: 0 }}>Search:</span>
                                    <input
                                        type="text"
                                        placeholder="Search by customer name, IEC, or UDYAM..."
                                        className="nucleus-input"
                                        style={{ width: '280px', padding: '6px 12px', fontSize: '0.9rem' }}
                                        value={udyamSearch}
                                        onChange={(e) => setUdyamSearch(e.target.value)}
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="filter-label" style={{ minWidth: 'auto', margin: 0 }}>Status:</span>
                                    <select
                                        value={udyamStatusFilter}
                                        onChange={(e) => setUdyamStatusFilter(e.target.value)}
                                        className="nucleus-select"
                                        style={{ padding: '6px 24px 6px 12px', fontSize: '0.9rem' }}
                                    >
                                        <option value="all">All Customers</option>
                                        <option value="registered">UDYAM Registered</option>
                                        <option value="pending">Pending / Not Provided</option>
                                    </select>
                                </div>
                            </div>
                        ) : activeReport === 'training' ? (
                            <div className="filter-row custom-filter-row" style={{ marginTop: 0, paddingLeft: 0, background: 'transparent', gap: '1.5rem', display: 'flex', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="filter-label" style={{ minWidth: 'auto', margin: 0 }}>Search:</span>
                                    <input
                                        type="text"
                                        placeholder="Search by code, customer, trainee, trainer..."
                                        className="nucleus-input"
                                        style={{ width: '300px', padding: '6px 12px', fontSize: '0.9rem' }}
                                        value={trainingSearch}
                                        onChange={(e) => setTrainingSearch(e.target.value)}
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="filter-label" style={{ minWidth: 'auto', margin: 0 }}>Status:</span>
                                    <select
                                        value={trainingStatusFilter}
                                        onChange={(e) => setTrainingStatusFilter(e.target.value)}
                                        className="nucleus-select"
                                        style={{ padding: '6px 24px 6px 12px', fontSize: '0.9rem' }}
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Expired">Expired</option>
                                    </select>
                                </div>
                            </div>
                        ) : activeReport === 'client_login_analytics' ? (
                            <div className="filter-row custom-filter-row" style={{ marginTop: 0, paddingLeft: 0, background: 'transparent', gap: '1.5rem', display: 'flex', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="filter-label" style={{ minWidth: 'auto', margin: 0 }}>Search:</span>
                                    <input
                                        type="text"
                                        placeholder="Search clients by name or email..."
                                        className="nucleus-input"
                                        style={{ width: '220px', padding: '6px 12px', fontSize: '0.9rem' }}
                                        value={clientSearch}
                                        onChange={(e) => setClientSearch(e.target.value)}
                                    />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="filter-label" style={{ minWidth: 'auto', margin: 0 }}>Role:</span>
                                    <select
                                        value={clientRoleFilter}
                                        onChange={(e) => setClientRoleFilter(e.target.value)}
                                        className="nucleus-select"
                                        style={{ padding: '6px 24px 6px 12px', fontSize: '0.9rem' }}
                                    >
                                        <option value="all">All Roles</option>
                                        <option value="admin">Admin</option>
                                        <option value="user">User</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="filter-label" style={{ minWidth: 'auto', margin: 0 }}>Status:</span>
                                    <select
                                        value={clientStatusFilter}
                                        onChange={(e) => setClientStatusFilter(e.target.value)}
                                        className="nucleus-select"
                                        style={{ padding: '6px 24px 6px 12px', fontSize: '0.9rem' }}
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="filter-label" style={{ minWidth: 'auto', margin: 0 }}>Month:</span>
                                    <select
                                        value={clientMonthFilter}
                                        onChange={(e) => setClientMonthFilter(e.target.value)}
                                        className="nucleus-select"
                                        style={{ padding: '6px 24px 6px 12px', fontSize: '0.9rem' }}
                                    >
                                        <option value="all">All Months</option>
                                        {months.map((m, i) => (
                                            <option key={i} value={i}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="filter-label" style={{ minWidth: 'auto', margin: 0 }}>Year:</span>
                                    <select
                                        value={clientYearFilter}
                                        onChange={(e) => setClientYearFilter(e.target.value)}
                                        className="nucleus-select"
                                        style={{ padding: '6px 24px 6px 12px', fontSize: '0.9rem' }}
                                    >
                                        <option value="all">All Years</option>
                                        {years.map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div className="filter-row custom-filter-row" style={{ marginTop: 0, paddingLeft: 0, background: 'transparent' }}>
                                <div className="filter-type-selector">
                                    <span className="filter-label" style={{ minWidth: 'auto', marginRight: '10px' }}>Filter Period:</span>
                                    <select
                                        value={filterType}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setFilterType(val);
                                        }}
                                        className="nucleus-select"
                                    >
                                        {['fleet_utilization', 'elock_utilization'].includes(activeReport) && (
                                            <option value="day">Day Wise</option>
                                        )}
                                        <option value="month">Month Wise</option>
                                        <option value="quarter">Quarter Wise</option>
                                        <option value="year">Year Wise</option>
                                        <option value="date-range">Date Range</option>
                                        <option value="all">Unfiltered (All Time)</option>
                                    </select>
                                </div>

                                {filterType === 'day' && (
                                    <div className="custom-inputs">
                                        <input
                                            type="date"
                                            className="nucleus-input"
                                            value={selectedDay}
                                            onChange={(e) => setSelectedDay(e.target.value)}
                                        />
                                    </div>
                                )}

                                {filterType === 'date-range' && (
                                    <div className="custom-inputs">
                                        <input
                                            type="date"
                                            className="nucleus-input"
                                            value={dateRange.start}
                                            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                        />
                                        <span style={{ color: '#6b7280' }}>to</span>
                                        <input
                                            type="date"
                                            className="nucleus-input"
                                            value={dateRange.end}
                                            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                        />
                                    </div>
                                )}

                                {filterType === 'month' && (
                                    <div className="custom-inputs">
                                        <select
                                            className="nucleus-select"
                                            value={selectedMonth}
                                            onChange={(e) => setSelectedMonth(e.target.value)}
                                        >
                                            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                        </select>
                                        <select
                                            className="nucleus-select"
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(e.target.value)}
                                        >
                                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                )}

                                {filterType === 'quarter' && (
                                    <div className="custom-inputs">
                                        <select
                                            className="nucleus-select"
                                            value={selectedQuarter}
                                            onChange={(e) => setSelectedQuarter(e.target.value)}
                                        >
                                            <option value="1">Q1 (Jan - Mar)</option>
                                            <option value="2">Q2 (Apr - Jun)</option>
                                            <option value="3">Q3 (Jul - Sep)</option>
                                            <option value="4">Q4 (Oct - Dec)</option>
                                        </select>
                                        <select
                                            className="nucleus-select"
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(e.target.value)}
                                        >
                                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                )}

                                {filterType === 'year' && (
                                    <div className="custom-inputs">
                                        <select
                                            className="nucleus-select"
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(e.target.value)}
                                        >
                                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {loading || (activeReport === 'top10' && top10Loading) || (activeReport === 'udyam' && udyamLoading) || (activeReport === 'training' && trainingLoading) || (activeReport === 'client_login_analytics' && clientAnalyticsLoading) || (activeReport === 'transport_table' && transportTableLoading) || (activeReport === 'elock_assigned_count' && elockAssignedLoading) || (activeReport === 'elock_lr_completed' && elockLrLoading) ? (
                    <div className="nucleus-loading-container">
                        <div className="nucleus-loader"></div>
                        <div style={{ marginTop: '1rem', color: '#6b7280' }}>Loading report details...</div>
                    </div>
                ) : (
                    <>
                        {activeReport === 'client_login_analytics' && (
                            <div className="analytics-graphs-container">
                                <div className="analytics-graph-card">
                                    <div className="graph-card-header">
                                        <h3>Daily Active Logins</h3>
                                        <span className="graph-subtitle">Unique login events per calendar day</span>
                                    </div>
                                    <div style={{ width: '100%', height: 260 }}>
                                        <ResponsiveContainer>
                                            <AreaChart
                                                data={clientAnalyticsData.daily || []}
                                                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                                            >
                                                <defs>
                                                    <linearGradient id="colorDaily" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.5)"/>
                                                <XAxis 
                                                    dataKey="date" 
                                                    tickFormatter={(str) => {
                                                        if (!str) return '';
                                                        const d = new Date(str);
                                                        return format(d, 'dd MMM');
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
                                                        borderRadius: '8px',
                                                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)'
                                                    }}
                                                    labelFormatter={(str) => {
                                                        if (!str) return '';
                                                        const d = new Date(str);
                                                        return format(d, 'eeee, dd MMMM yyyy');
                                                    }}
                                                    formatter={(value) => [`${value} Logins`, 'Activity']}
                                                />
                                                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorDaily)"/>
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="analytics-graph-card">
                                    <div className="graph-card-header">
                                        <h3>Monthly Login Distribution</h3>
                                        <span className="graph-subtitle">Total logins grouped by month</span>
                                    </div>
                                    <div style={{ width: '100%', height: 260 }}>
                                        <ResponsiveContainer>
                                            <BarChart
                                                data={clientAnalyticsData.monthly || []}
                                                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.5)"/>
                                                <XAxis 
                                                    dataKey="month" 
                                                    tickFormatter={(str) => {
                                                        if (!str) return '';
                                                        const parts = str.split('-');
                                                        if (parts.length < 2) return str;
                                                        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
                                                        return format(d, 'MMM yy');
                                                    }}
                                                    stroke="#94a3b8"
                                                    fontSize={11}
                                                    tickLine={false}
                                                />
                                                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false}/>
                                                <Tooltip content={<CustomMonthlyTooltip />} />
                                                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={45}/>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}



                        {/* ── Transport Shipment Table ── */}
                        {activeReport === 'transport_table' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Sort by:</span>
                                        <select value={transportSortBy} onChange={e => { setTransportSortBy(e.target.value); setTransportTablePage(1); }} className="nucleus-select" style={{ padding: '6px 12px', fontSize: '13px' }}>
                                            <option value="totalShipments">Total Shipments</option>
                                            <option value="consignor">Consignor</option>
                                            <option value="consignee">Consignee</option>
                                            <option value="route">Route</option>
                                            <option value="period">Period</option>
                                        </select>
                                        <select value={transportSortOrder} onChange={e => { setTransportSortOrder(e.target.value); setTransportTablePage(1); }} className="nucleus-select" style={{ padding: '6px 12px', fontSize: '13px' }}>
                                            <option value="desc">Descending</option>
                                            <option value="asc">Ascending</option>
                                        </select>
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                                        Total Records: <strong style={{ color: '#1e293b' }}>{transportTableMeta.totalCount}</strong>
                                    </div>
                                </div>
                                <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc' }}>
                                                {['#', 'Consignor', 'Consignee', 'Route', 'Period', 'Shipments', 'Category'].map((h, i) => (
                                                    <th key={i} style={{ padding: '11px 14px', textAlign: i === 5 ? 'right' : 'left', color: '#64748b', fontWeight: 600, borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {transportTable.length > 0 ? transportTable.map((row, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                                    <td style={{ padding: '10px 14px', color: '#94a3b8', fontWeight: 500 }}>{(transportTablePage - 1) * TRANSPORT_TABLE_LIMIT + i + 1}</td>
                                                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{row.consignor ?? '—'}</td>
                                                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{row.consignee ?? '—'}</td>
                                                    <td style={{ padding: '10px 14px', color: '#64748b' }}>{row.route ?? '—'}</td>
                                                    <td style={{ padding: '10px 14px', color: '#64748b', fontFamily: 'monospace', fontSize: '12px' }}>{row.period ?? '—'}</td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#3b82f6' }}>{row.totalShipments ?? '—'}</td>
                                                    <td style={{ padding: '10px 14px' }}>
                                                        <span style={{ background: '#3b82f610', color: '#3b82f6', border: '1px solid #3b82f620', borderRadius: '6px', padding: '2px 10px', fontSize: '11px', fontWeight: 600 }}>{row.category ?? row.import_export ?? '—'}</span>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan="7" style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>No shipment data found for the selected period.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {transportTableMeta.totalCount > TRANSPORT_TABLE_LIMIT && (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                                        <button disabled={transportTablePage === 1} onClick={() => setTransportTablePage(p => Math.max(1, p - 1))} style={{ padding: '6px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: transportTablePage === 1 ? '#f8fafc' : '#fff', cursor: transportTablePage === 1 ? 'not-allowed' : 'pointer', fontWeight: 600, color: '#64748b' }}>← Prev</button>
                                        <span style={{ fontSize: '13px', color: '#64748b' }}>Page <strong>{transportTablePage}</strong> of <strong>{Math.ceil(transportTableMeta.totalCount / TRANSPORT_TABLE_LIMIT)}</strong></span>
                                        <button disabled={transportTablePage >= Math.ceil(transportTableMeta.totalCount / TRANSPORT_TABLE_LIMIT)} onClick={() => setTransportTablePage(p => p + 1)} style={{ padding: '6px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#64748b' }}>Next →</button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── E-Lock Assigned Count ── */}
                        {activeReport === 'elock_assigned_count' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Filter by:</span>
                                    {['consignee', 'consignor'].map(ft => (
                                        <button key={ft} onClick={() => setElockDashFilterType(ft)} style={{ padding: '6px 16px', border: `1px solid ${elockDashFilterType === ft ? '#3b82f6' : '#e2e8f0'}`, borderRadius: '8px', background: elockDashFilterType === ft ? '#3b82f610' : '#fff', color: elockDashFilterType === ft ? '#3b82f6' : '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '13px', textTransform: 'capitalize' }}>{ft}</button>
                                    ))}
                                </div>
                                <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc' }}>
                                                {['#', 'Party Name', 'PR Assigned', 'Others Assigned', 'Total Assigned'].map((h, i) => (
                                                    <th key={i} style={{ padding: '11px 14px', textAlign: i >= 2 ? 'right' : 'left', color: '#64748b', fontWeight: 600, borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Array.isArray(elockAssigned) && elockAssigned.length > 0 ? elockAssigned.map((row, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                                    <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{i + 1}</td>
                                                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{row.partyName ?? row.party_name ?? row.consignee ?? row.consignor ?? row.name ?? '—'}</td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>{row.prCount ?? 0}</td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>{row.othersCount ?? 0}</td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#3b82f6', fontSize: '15px' }}>{row.totalCount ?? row.count ?? 0}</td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>No e-lock assignment data found for the selected period.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* ── E-Lock LR Completed Count ── */}
                        {activeReport === 'elock_lr_completed' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Filter by:</span>
                                    {['consignee', 'consignor'].map(ft => (
                                        <button key={ft} onClick={() => setElockDashFilterType(ft)} style={{ padding: '6px 16px', border: `1px solid ${elockDashFilterType === ft ? '#10b981' : '#e2e8f0'}`, borderRadius: '8px', background: elockDashFilterType === ft ? '#10b98110' : '#fff', color: elockDashFilterType === ft ? '#10b981' : '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '13px', textTransform: 'capitalize' }}>{ft}</button>
                                    ))}
                                </div>
                                <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                        <thead>
                                            <tr style={{ background: '#f8fafc' }}>
                                                {['#', 'Party Name', 'LR Completed Count'].map((h, i) => (
                                                    <th key={i} style={{ padding: '11px 14px', textAlign: i === 2 ? 'right' : 'left', color: '#64748b', fontWeight: 600, borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Array.isArray(elockLrCompleted) && elockLrCompleted.length > 0 ? elockLrCompleted.map((row, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                                                    <td style={{ padding: '10px 14px', color: '#94a3b8' }}>{i + 1}</td>
                                                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{row.partyName ?? row.party_name ?? row.consignee ?? row.consignor ?? row.name ?? '—'}</td>
                                                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#10b981', fontSize: '16px' }}>{row.count ?? row.completedCount ?? row.lr_completed_count ?? 0}</td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan="3" style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>No LR completed data found for the selected period.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeReport === 'fleet_utilization' && (
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
                        )}

                        {activeReport === 'elock_utilization' && (
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
                        )}

                        <div className="nucleus-table-wrapper" style={{ display: ['transport_table', 'elock_assigned_count', 'elock_lr_completed'].includes(activeReport) ? 'none' : undefined }}>
                            <table className="nucleus-table">
                                <thead>
                                <tr>
                                    {activeReport === 'top10' ? (
                                        <>
                                            <th>S.No</th>
                                            <th>Importer Name</th>
                                            <th onClick={() => handleSort('total20')} style={{ cursor: 'pointer' }}>
                                                20 FT Containers {sortConfig.key === 'total20' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                            </th>
                                            <th onClick={() => handleSort('total40')} style={{ cursor: 'pointer' }}>
                                                40 FT Containers {sortConfig.key === 'total40' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                            </th>
                                            <th onClick={() => handleSort('fclTeus')} style={{ cursor: 'pointer' }}>
                                                FCL {sortConfig.key === 'fclTeus' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                            </th>
                                            <th onClick={() => handleSort('lclTeus')} style={{ cursor: 'pointer' }}>
                                                LCL {sortConfig.key === 'lclTeus' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                            </th>
                                            <th onClick={() => handleSort('totalTeus')} style={{ cursor: 'pointer' }}>
                                                Total TEU {sortConfig.key === 'totalTeus' && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                            </th>
                                            <th>Handled By</th>
                                        </>
                                    ) : activeReport === 'udyam' ? (
                                        <>
                                            <th>S.No</th>
                                            <th>Customer Name</th>
                                            <th>Category</th>
                                            <th>IEC Number</th>
                                            <th>UDYAM Number</th>
                                            <th>Approval Status</th>
                                        </>
                                    ) : activeReport === 'training' ? (
                                        <>
                                            <th>Code</th>
                                            <th>Customer Entity</th>
                                            <th>Module</th>
                                            <th>Trainee Name</th>
                                            <th>Date</th>
                                            <th>Trainer</th>
                                            <th>Mode</th>
                                            <th>Status</th>
                                            <th>Rating</th>
                                        </>
                                    ) : activeReport === 'client_login_analytics' ? (
                                        <>
                                            <th>S.No</th>
                                            <th>Client Name</th>
                                            <th>Email Address</th>
                                            <th>Role</th>
                                            <th>Active Status</th>
                                            <th>Account Status</th>
                                            <th>Last Login Date</th>
                                            <th>Registered At</th>
                                        </>
                                    ) : activeReport === 'fleet_utilization' ? (
                                        <>
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
                                        </>
                                    ) : activeReport === 'elock_utilization' ? (
                                        <>
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
                                        </>
                                    ) : (
                                        <>
                                            <th>Job No</th>
                                            <th>BE No</th>
                                            <th>BE Date</th>
                                            <th>{activeReport === 'fine' ? 'Fine Amount (INR)' : 'Penalty Amount (INR)'}</th>
                                            <th>Accountability</th>
                                            <th>Importer</th>
                                            <th>Handler Name(s)</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {activeReport === 'fleet_utilization' ? (
                                    displayedFleetRows?.length > 0 ? (
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
                                            <td colSpan="39" style={{ textAlign: 'center', color: '#6b7280', padding: '30px' }}>
                                                No fleet data found for the selected period.
                                            </td>
                                        </tr>
                                    )
                                ) : activeReport === 'elock_utilization' ? (
                                    displayedElockRows?.length > 0 ? (
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
                                    )
                                ) : activeReport === 'top10' ? (
                                    sortedTop10Data.length > 0 ? (
                                        sortedTop10Data.map((item, index) => (
                                            <tr key={item.importer}>
                                                <td style={{ fontWeight: 500 }}>{index + 1}</td>
                                                <td>{item.importer}</td>
                                                <td>{item.total20}</td>
                                                <td>{item.total40}</td>
                                                <td>{item.fclTeus}</td>
                                                <td>{item.lclTeus}</td>
                                                <td style={{ fontWeight: 'bold' }}>{item.totalTeus}</td>
                                                <td>
                                                    {item.handlers && item.handlers.length > 0 ? (
                                                        item.handlers.map((h, i) => (
                                                            <span key={i} className="handler-tag">{h}</span>
                                                        ))
                                                    ) : (
                                                        <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '12px' }}>Unassigned</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8" style={{ textAlign: 'center', color: '#6b7280', padding: '30px' }}>
                                                No data found for the selected period.
                                            </td>
                                        </tr>
                                    )
                                ) : activeReport === 'udyam' ? (
                                    filteredUdyamData.length > 0 ? (
                                        filteredUdyamData.map((item, index) => (
                                            <tr key={item._id || index}>
                                                <td style={{ fontWeight: 500 }}>{index + 1}</td>
                                                <td style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{item.name_of_individual}</td>
                                                <td>
                                                    <span className="status-pill info" style={{ textTransform: 'capitalize', fontSize: '0.8rem' }}>
                                                        {item.category || 'General'}
                                                    </span>
                                                </td>
                                                <td className="mono-text" style={{ fontWeight: 500 }}>{item.iec_no || '—'}</td>
                                                <td className="mono-text">
                                                    {item.udyam_no ? (
                                                        <span style={{ color: 'var(--primary-700)', fontWeight: 600 }}>{item.udyam_no}</span>
                                                    ) : (
                                                        <span style={{ color: 'var(--slate-400)', fontStyle: 'italic' }}>Pending / Not Provided</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className={`status-pill ${
                                                        item.approval === 'Approved' ? 'success' : 
                                                        item.approval === 'Rejected' ? 'error' : 'warning'
                                                    }`} style={{ fontWeight: 600 }}>
                                                        {item.approval || 'Pending'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', color: '#6b7280', padding: '30px' }}>
                                                No customers found matching the search criteria.
                                            </td>
                                        </tr>
                                    )
                                ) : activeReport === 'training' ? (
                                    filteredTrainingData.length > 0 ? (
                                        filteredTrainingData.map((item, index) => (
                                            <tr key={item._id || index}>
                                                <td className="mono-text" style={{ fontWeight: 600, color: 'var(--primary-700)' }}>
                                                    {item.training_code}
                                                </td>
                                                <td style={{ fontWeight: 600, color: 'var(--slate-800)' }}>
                                                    {item.customerName || '—'}
                                                </td>
                                                <td>
                                                    <span className="status-pill info" style={{ fontSize: '0.8rem' }}>
                                                        {item.training_module}
                                                    </span>
                                                </td>
                                                <td style={{ fontWeight: 500 }}>{item.trainee_name}</td>
                                                <td className="mono-text">
                                                    {item.training_date ? new Date(item.training_date).toLocaleDateString('en-GB') : '—'}
                                                </td>
                                                <td style={{ fontWeight: 500 }}>{item.trainer_name}</td>
                                                <td>
                                                    <span className="status-pill" style={{
                                                        backgroundColor: 'rgba(6, 182, 212, 0.08)',
                                                        color: 'rgb(6, 182, 212)',
                                                        border: '1px solid rgba(6, 182, 212, 0.2)',
                                                        fontSize: '0.8rem',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {item.training_mode}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`status-pill ${
                                                        item.training_status === 'Completed' ? 'success' :
                                                        item.training_status === 'Expired' ? 'error' : 'warning'
                                                    }`} style={{ fontWeight: 600 }}>
                                                        {item.training_status}
                                                    </span>
                                                </td>
                                                <td>
                                                    {item.feedback_rating ? (
                                                        <span style={{ color: '#eab308', fontWeight: 600 }}>
                                                            {'★'.repeat(item.feedback_rating)}
                                                            <span style={{ color: '#d1d5db' }}>{'★'.repeat(5 - item.feedback_rating)}</span>
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: 'var(--slate-400)', fontStyle: 'italic', fontSize: '0.85rem' }}>Not Rated</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="9" style={{ textAlign: 'center', color: '#6b7280', padding: '30px' }}>
                                                No training records found matching the search criteria.
                                            </td>
                                        </tr>
                                    )
                                ) : activeReport === 'client_login_analytics' ? (
                                    filteredClientData.length > 0 ? (
                                        filteredClientData.map((item, index) => (
                                            <tr key={item._id || index}>
                                                <td style={{ fontWeight: 500 }}>{index + 1}</td>
                                                <td style={{ fontWeight: 600, color: 'var(--slate-800)' }}>{item.name}</td>
                                                <td className="mono-text">{item.email}</td>
                                                <td>
                                                    <span className={`status-pill ${item.role === 'admin' ? 'error' : 'info'}`} style={{ textTransform: 'capitalize', fontSize: '0.8rem' }}>
                                                        {item.role || 'user'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`status-pill ${item.isActive ? 'success' : 'warning'}`}>
                                                        {item.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`status-pill ${item.status === 'active' ? 'success' : 'error'}`} style={{ textTransform: 'capitalize' }}>
                                                        {item.status || 'unknown'}
                                                    </span>
                                                </td>
                                                <td className="mono-text" style={{ fontWeight: 500 }}>
                                                    {item.lastLogin ? (
                                                        <>
                                                            {new Date(item.lastLogin).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            <span style={{ fontSize: '11px', color: '#94a3b8', marginLeft: '6px' }}>
                                                                {new Date(item.lastLogin).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span style={{ color: 'var(--slate-400)', fontStyle: 'italic' }}>Never logged in</span>
                                                    )}
                                                </td>
                                                <td className="mono-text" style={{ color: '#64748b' }}>
                                                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : '—'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8" style={{ textAlign: 'center', color: '#6b7280', padding: '30px' }}>
                                                No client users found matching the search criteria.
                                            </td>
                                        </tr>
                                    )
                                ) : (
                                    currentData.length > 0 ? (
                                        currentData.map((item) => (
                                            <tr key={item._id}>
                                                <td style={{ fontWeight: 500 }}>{item.job_no}</td>
                                                <td>{item.be_no}</td>
                                                <td>{item.be_date}</td>
                                                <td className={`amount-cell ${activeReport === 'fine' ? 'fine-amount' : 'penalty-amount'}`}>
                                                    {activeReport === 'fine' ? item.fine_amount : item.penalty_amount}
                                                </td>
                                                <td>
                                                    {item.penalty_by_us ? (
                                                        <span style={{ color: '#d97706', fontWeight: 600 }}>Agency</span>
                                                    ) : item.penalty_by_importer ? (
                                                        <span style={{ color: '#2563eb', fontWeight: 600 }}>Importer</span>
                                                    ) : (
                                                        <span style={{ color: '#9ca3af' }}>-</span>
                                                    )}
                                                </td>
                                                <td>{item.importer}</td>
                                                <td>
                                                    {item.handlers && item.handlers.length > 0 ? (
                                                        item.handlers.map((h, i) => (
                                                            <span key={i} className="handler-tag">{h}</span>
                                                        ))
                                                    ) : (
                                                        <span style={{ color: '#9ca3af', fontStyle: 'italic', fontSize: '12px' }}>Unassigned</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: 'center', color: '#6b7280', padding: '30px' }}>
                                                No records found for the selected period.
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                    </>
                )}

                {/* ── Summary stats cards for new transport/elock reports ── */}
                {activeReport === 'elock_assigned_count' && !elockAssignedLoading && (
                    <div className="nucleus-stats-card" style={{ borderLeft: '4px solid #3b82f6', background: 'linear-gradient(90deg, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.01) 100%)' }}>
                        <div className="stats-text" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div>Parties: <span className="highlight-val" style={{ color: '#3b82f6' }}>{Array.isArray(elockAssigned) ? elockAssigned.length : 0}</span></div>
                            <div>PR Assigned: <span className="highlight-val" style={{ color: '#8b5cf6' }}>{elockAssignedSummary.prAssignedCount ?? 0}</span></div>
                            <div>Others Assigned: <span className="highlight-val" style={{ color: '#f59e0b' }}>{elockAssignedSummary.othersAssignedCount ?? 0}</span></div>
                            <div>Total Assigned: <span className="highlight-val" style={{ color: '#10b981' }}>{elockAssignedSummary.totalAssignedCount ?? 0}</span></div>
                        </div>
                    </div>
                )}
                {activeReport === 'elock_lr_completed' && !elockLrLoading && (
                    <div className="nucleus-stats-card" style={{ borderLeft: '4px solid #10b981', background: 'linear-gradient(90deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.01) 100%)' }}>
                        <div className="stats-text" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div>Parties: <span className="highlight-val" style={{ color: '#10b981' }}>{Array.isArray(elockLrCompleted) ? elockLrCompleted.length : 0}</span></div>
                            <div>Total LR Completed: <span className="highlight-val" style={{ color: '#3b82f6' }}>{elockLrSummary.totalCompletedCount ?? 0}</span></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NucleusHome;
