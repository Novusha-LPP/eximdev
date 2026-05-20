import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    parse, isToday, isThisWeek, isThisMonth, isThisQuarter, isThisYear, isValid,
    subMonths, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear,
    isWithinInterval, getYear, getMonth, getQuarter, format
} from 'date-fns';
import './NucleusHome.css';

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
        { id: 'transport', label: 'Transport', icon: '🚚', reports: [] },
        {
            id: 'business',
            label: 'Business',
            icon: '💼',
            reports: [
                { id: 'udyam', label: 'Customer UDYAM Registration' },
                { id: 'training', label: 'Customer Training Records' }
            ]
        },
        { id: 'sharanga', label: 'Sharanga', icon: '🕉️', reports: [] },
        { id: 'elock', label: 'Elock', icon: '🔒', reports: [] }
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

            if (filterType === 'date-range') {
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
                {!loading && activeReport !== 'top10' && activeReport !== 'udyam' && activeReport !== 'training' && (
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
                                        <option value="month">Month Wise</option>
                                        <option value="quarter">Quarter Wise</option>
                                        <option value="year">Year Wise</option>
                                        <option value="date-range">Date Range</option>
                                        <option value="all">Unfiltered (All Time)</option>
                                    </select>
                                </div>

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

                {loading || (activeReport === 'top10' && top10Loading) || (activeReport === 'udyam' && udyamLoading) || (activeReport === 'training' && trainingLoading) ? (
                    <div className="nucleus-loading-container">
                        <div className="nucleus-loader"></div>
                        <div style={{ marginTop: '1rem', color: '#6b7280' }}>Loading report details...</div>
                    </div>
                ) : (
                    <div className="nucleus-table-wrapper">
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
                                {activeReport === 'top10' ? (
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
                )}
            </div>
        </div>
    );
};

export default NucleusHome;
