import React, { useState, useEffect } from 'react';
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
                { id: 'penalty', label: 'Bill of Entry – Penalty Report' }
            ]
        },
        { id: 'export', label: 'Export', icon: '🛫', reports: [] },
        { id: 'transport', label: 'Transport', icon: '🚚', reports: [] },
        { id: 'business', label: 'Business', icon: '💼', reports: [] },
        { id: 'sharanga', label: 'Sharanga', icon: '🕉️', reports: [] },
        { id: 'elock', label: 'Elock', icon: '🔒', reports: [] }
    ];

    const [activeReport, setActiveReport] = useState('fine');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCategory, setExpandedCategory] = useState('import');

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
                let apiUrl = process.env.REACT_APP_API_STRING || 'http://localhost:9000';
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
            <div className="nucleus-sidebar">
                <div className="nucleus-brand">
                    <span className="brand-dot"></span>
                    Project Nucleus
                </div>

                <div className="report-search-container">
                    <input
                        type="text"
                        placeholder="Search reports..."
                        className="report-search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

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
                                    onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                                >
                                    <span className="cat-icon">{cat.icon}</span>
                                    <span className="cat-label">{cat.label}</span>
                                    <span className="cat-arrow">{isExpanded ? '▾' : '▸'}</span>
                                </div>

                                {isExpanded && (
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
                {!loading && (
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
                    </div>
                </div>

                {loading ? (
                    <div style={{ color: '#6b7280', padding: '20px' }}>Loading reports data...</div>
                ) : (
                    <div className="nucleus-table-wrapper">
                        <table className="nucleus-table">
                            <thead>
                                <tr>
                                    <th>Job No</th>
                                    <th>BE No</th>
                                    <th>BE Date</th>
                                    <th>{activeReport === 'fine' ? 'Fine Amount (INR)' : 'Penalty Amount (INR)'}</th>
                                    <th>Importer</th>
                                    <th>Handler Name(s)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentData.length > 0 ? (
                                    currentData.map((item) => (
                                        <tr key={item._id}>
                                            <td style={{ fontWeight: 500 }}>{item.job_no}</td>
                                            <td>{item.be_no}</td>
                                            <td>{item.be_date}</td>
                                            <td className={`amount-cell ${activeReport === 'fine' ? 'fine-amount' : 'penalty-amount'}`}>
                                                {activeReport === 'fine' ? item.fine_amount : item.penalty_amount}
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
                                        <td colSpan="6" style={{ textAlign: 'center', color: '#6b7280', padding: '30px' }}>
                                            No records found for the selected period.
                                        </td>
                                    </tr>
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
