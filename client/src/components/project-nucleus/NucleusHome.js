import { YearContext } from "../../contexts/yearContext.js";
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { BranchContext } from '../../contexts/BranchContext';
import './NucleusHome.css';

// Import refactored report components
import FineReport from './reports/FineReport';
import PenaltyReport from './reports/PenaltyReport';
import Top10ImportersReport from './reports/Top10ImportersReport';
import Top10TransportersReport from './reports/Top10TransportersReport';
import FleetUtilizationReport from './reports/FleetUtilizationReport';
import ElockLrCompletedReport from './reports/ElockLrCompletedReport';
import CustomerUdyamReport from './reports/CustomerUdyamReport';
import CustomerTrainingReport from './reports/CustomerTrainingReport';
import ClientLoginAnalyticsReport from './reports/ClientLoginAnalyticsReport';
import NewCustomersReport from './reports/NewCustomersReport';
import ElockUtilizationReport from './reports/ElockUtilizationReport';
import ElockAssignedCountReport from './reports/ElockAssignedCountReport';
import ElockBillingReport from './reports/ElockBillingReport';
import TransportAccountsReport from './reports/TransportAccountsReport';
import KarmaReport from './reports/KarmaReport';
import ExportPulseReport from './reports/ExportPulseReport';
import ImportPendingSummaryReport from './reports/ImportPendingSummaryReport';
import ImportOutOfChargeSummaryReport from './reports/ImportOutOfChargeSummaryReport';

const NucleusHome = () => {
    const { selectedCategory, selectedBranchGroup } = useContext(BranchContext);
    // Categories Configuration
    const reportCategories = [
        {
            id: 'import',
            label: 'Import',
            icon: '🚢',
            reports: [
                { id: 'fine', label: 'Bill of Entry – Fine Report' },
                { id: 'penalty', label: 'Bill of Entry – Penalty Report' },
                { id: 'top10', label: 'Top 10 Importers' },
                { id: 'import_pending_summary', label: 'Pending Job Summary' },
                { id: 'import_out_of_charge_summary', label: 'Out of Charge Summary' }
            ]
        },
        { 
            id: 'export', 
            label: 'Export', 
            icon: '🛫', 
            reports: [
                { id: 'export_pulse', label: 'Export Pulse Dashboard' }
            ] 
        },
        {
            id: 'transport',
            label: 'Transport',
            icon: '🚚',
            reports: [
                { id: 'transport_table', label: 'Top 10 Transporters' },
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
                { id: 'client_login_analytics', label: 'Client User Login Analytics' },
                { id: 'new_customers', label: 'New Customer Added / KYC Report' }
            ]
        },
        { id: 'sharanga', label: 'Sharanga', icon: '🕉️', reports: [] },
        {
            id: 'elock',
            label: 'Elock',
            icon: '🔒',
            reports: [
                { id: 'elock_utilization', label: 'E-Lock Utilization' },
                { id: 'elock_assigned_count', label: 'E-Lock Assigned Count' },
                { id: 'elock_billing', label: 'E-Lock Billing' }
            ]
        },
        {
            id: 'finance',
            label: 'Finance Report',
            icon: '💰',
            reports: [
                { id: 'transport_accounts', label: 'Transport Accounts' }
            ]
        },
        {
            id: 'gamification',
            label: 'Gamification',
            icon: '🏆',
            reports: [
                { id: 'karma_leaderboard', label: 'Karma Leaderboard' }
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

    // Date Filter State
    const { selectedYearState, setSelectedYearState } = React.useContext(YearContext);
    const [filterType, setFilterType] = useState('year');
    const [financialYears, setFinancialYears] = useState(['26-27', '25-26', '24-25', '23-24']);
    const selectedFinancialYear = selectedYearState || '26-27';
    const setSelectedFinancialYear = setSelectedYearState;
    const [selectedDay, setSelectedDay] = useState(format(new Date(), 'yyyy-MM-dd'));

    // Custom Date Filter Values
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));

    // Base Compliance Data State (Shared for Fine and Penalty)
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Auto-switch filter type based on report
    useEffect(() => {
        if (['import_pending_summary', 'import_out_of_charge_summary'].includes(activeReport)) {
            setFilterType('fin-year');
        } else {
            if (filterType === 'fin-year') setFilterType('year');
        }
    }, [activeReport]);


    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);
    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    useEffect(() => {
        const fetchReports = async () => {
            setLoading(true);
            try {
                let apiUrl = process.env.REACT_APP_API_STRING || 'http://localhost:9006';
                if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);

                const endpoint = apiUrl.endsWith('/api')
                    ? `${apiUrl}/project-nucleus/reports`
                    : `${apiUrl}/api/project-nucleus/reports`;

                const response = await axios.get(endpoint, { withCredentials: true });
                setData(response.data || []);
            } catch (error) {
                console.error("Error fetching reports:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReports();
    }, []);



    const renderActiveReport = () => {
        if (loading && ['fine', 'penalty'].includes(activeReport)) {
            return (
                <div className="nucleus-loading-container">
                    <div className="nucleus-loader"></div>
                    <div style={{ marginTop: '1rem', color: '#6b7280' }}>Loading report details...</div>
                </div>
            );
        }

        switch (activeReport) {
            case 'fine':
                return (
                    <FineReport
                        data={data}
                        filterType={filterType}
                        dateRange={dateRange}
                        selectedFinancialYear={selectedFinancialYear}
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                        selectedQuarter={selectedQuarter}
                        selectedDay={selectedDay}
                    />
                );
            case 'penalty':
                return (
                    <PenaltyReport
                        data={data}
                        filterType={filterType}
                        dateRange={dateRange}
                        selectedFinancialYear={selectedFinancialYear}
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                        selectedQuarter={selectedQuarter}
                        selectedDay={selectedDay}
                    />
                );
            case 'top10':
                return (
                    <Top10ImportersReport
                        filterType={filterType}
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                        selectedQuarter={selectedQuarter}
                        dateRange={dateRange}
                        selectedFinancialYear={selectedFinancialYear}
                    />
                );
            case 'udyam':
                return <CustomerUdyamReport />;
            case 'training':
                return <CustomerTrainingReport />;
            case 'client_login_analytics':
                return <ClientLoginAnalyticsReport />;
            case 'new_customers':
                return <NewCustomersReport />;
            case 'export_pulse':
                return <ExportPulseReport />;
            case 'transport_table':
                return (
                    <Top10TransportersReport
                        filterType={filterType}
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                        selectedQuarter={selectedQuarter}
                        dateRange={dateRange}
                        selectedFinancialYear={selectedFinancialYear}
                        selectedDay={selectedDay}
                    />
                );
            case 'fleet_utilization':
                return (
                    <FleetUtilizationReport
                        filterType={filterType}
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                        selectedQuarter={selectedQuarter}
                        dateRange={dateRange}
                        selectedFinancialYear={selectedFinancialYear}
                        selectedDay={selectedDay}
                    />
                );
            case 'elock_lr_completed':
                return (
                    <ElockLrCompletedReport
                        filterType={filterType}
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                        selectedQuarter={selectedQuarter}
                        dateRange={dateRange}
                        selectedFinancialYear={selectedFinancialYear}
                        selectedDay={selectedDay}
                    />
                );
            case 'elock_utilization':
                return (
                    <ElockUtilizationReport
                        filterType={filterType}
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                        selectedQuarter={selectedQuarter}
                        dateRange={dateRange}
                        selectedFinancialYear={selectedFinancialYear}
                        selectedDay={selectedDay}
                    />
                );
            case 'elock_assigned_count':
                return (
                    <ElockAssignedCountReport
                        filterType={filterType}
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                        selectedQuarter={selectedQuarter}
                        dateRange={dateRange}
                        selectedFinancialYear={selectedFinancialYear}
                        selectedDay={selectedDay}
                    />
                );
            case 'elock_billing':
                return (
                    <ElockBillingReport
                        filterType={filterType}
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                        selectedQuarter={selectedQuarter}
                        dateRange={dateRange}
                        selectedFinancialYear={selectedFinancialYear}
                        selectedDay={selectedDay}
                    />
                );
            case 'transport_accounts':
                return (
                    <TransportAccountsReport
                        filterType={filterType}
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                        selectedQuarter={selectedQuarter}
                        dateRange={dateRange}
                        selectedFinancialYear={selectedFinancialYear}
                        selectedDay={selectedDay}
                    />
                );
            case 'karma_leaderboard':
                return (
                    <KarmaReport
                        filterType={filterType}
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                        selectedQuarter={selectedQuarter}
                        dateRange={dateRange}
                        selectedFinancialYear={selectedFinancialYear}
                        selectedDay={selectedDay}
                    />
                );
            case 'import_pending_summary':
                return (
                    <ImportPendingSummaryReport
                        filterType={filterType}
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                        selectedQuarter={selectedQuarter}
                        dateRange={dateRange}
                        selectedFinancialYear={selectedFinancialYear}
                        selectedDay={selectedDay}
                        category={selectedCategory}
                        branchId={selectedBranchGroup === 'all' ? '' : selectedBranchGroup}
                    />
                );
            case 'import_out_of_charge_summary':
                return (
                    <ImportOutOfChargeSummaryReport
                        filterType={filterType}
                        selectedMonth={selectedMonth}
                        selectedYear={selectedYear}
                        selectedQuarter={selectedQuarter}
                        dateRange={dateRange}
                        selectedFinancialYear={selectedFinancialYear}
                        selectedDay={selectedDay}
                        category={selectedCategory}
                        branchId={selectedBranchGroup === 'all' ? '' : selectedBranchGroup}
                    />
                );
            default:
                return <div style={{ padding: '20px', color: '#64748b' }}>Select a report from the sidebar</div>;
        }
    };

    // Determine if date controls are needed (udyam, training, client login analytics, new_customers don't need them)
    const showDateControls = !['udyam', 'training', 'client_login_analytics', 'new_customers', 'export_pulse'].includes(activeReport);

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
                                                onClick={() => {
                                                    setActiveReport(report.id);
                                                    if (['fleet_utilization', 'elock_utilization', 'elock_billing', 'transport_accounts'].includes(report.id)) {
                                                        setFilterType('day');
                                                        setSelectedDay(format(new Date(), 'yyyy-MM-dd'));
                                                    } else if (['import_pending_summary'].includes(report.id)) {
                                                        setFilterType('all');
                                                    } else {
                                                        if (filterType === 'day') {
                                                            setFilterType('month');
                                                        }
                                                    }
                                                }}
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

                {/* Centralized Date Filters (Hidden for reports that don't need them) */}
                {showDateControls && (
                    <div className="nucleus-controls-container">
                        <div className="nucleus-filter-section">
                            <div className="filter-row custom-filter-row" style={{ marginTop: 0, paddingLeft: 0, background: 'transparent' }}>
                                <div className="filter-type-selector">
                                    <span className="filter-label" style={{ minWidth: 'auto', marginRight: '10px' }}>Filter Period:</span>
                                    <select
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value)}
                                        className="nucleus-select"
                                    >
                                        {['fleet_utilization', 'elock_utilization', 'elock_billing', 'transport_accounts', 'import_pending_summary'].includes(activeReport) && (
                                            <option value="day">Day Wise</option>
                                        )}
                                        <option value="week">Week Wise</option>
                                        <option value="month">Month Wise</option>
                                        <option value="quarter">Quarter Wise</option>
                                        <option value="year">Year Wise</option>
                                        {["import_pending_summary", "import_out_of_charge_summary"].includes(activeReport) && <option value="fin-year">Financial Year</option>}
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

                                {filterType === 'week' && (
                                    <div className="custom-inputs" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="date"
                                            className="nucleus-input"
                                            value={selectedDay}
                                            onChange={(e) => setSelectedDay(e.target.value)}
                                        />
                                        {selectedDay && (
                                            <span style={{ fontSize: '13px', color: '#4b5563', fontWeight: 600 }}>
                                                ({format(startOfWeek(new Date(selectedDay), { weekStartsOn: 1 }), 'dd MMM')} - {format(endOfWeek(new Date(selectedDay), { weekStartsOn: 1 }), 'dd MMM')})
                                            </span>
                                        )}
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

                                {filterType === 'fin-year' && (
                                    <div className="custom-inputs">
                                        <select
                                            className="nucleus-select"
                                            value={selectedFinancialYear}
                                            onChange={(e) => setSelectedFinancialYear(e.target.value)}
                                        >
                                            {financialYears.map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
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
                )}

                {/* Report Content View */}
                {renderActiveReport()}
            </div>
        </div>
    );
};

export default NucleusHome;
