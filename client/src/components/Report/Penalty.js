import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import {
  parse, isValid, isWithinInterval, getYear, getMonth, getQuarter
} from 'date-fns';
import './Penalty.css';
import BillingPending from './BillingPending'; // Importing the existing component
import MonthlyContainers from './monthlyContainers';
import { BranchContext } from '../../contexts/BranchContext';

const Penalty = () => {
  // Basic state for the report tab
  const [activeReport, setActiveReport] = useState('monthly-container'); // Default to monthly container
  const { selectedBranch, selectedCategory } = useContext(BranchContext);

  // Filter State
  const [filterType, setFilterType] = useState('month'); // Default to month

  // Custom Filter Values
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Generate years for dropdown
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => currentYear - 5 + i);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Importer filter state
  const [selectedImporter, setSelectedImporter] = useState('');
  const [importerSearchInput, setImporterSearchInput] = useState('');
  const [showImporterSuggestions, setShowImporterSuggestions] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        let apiUrl = process.env.REACT_APP_API_STRING || 'http://localhost:9006';
        if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);

        const endpoint = apiUrl.endsWith('/api')
          ? `${apiUrl}/project-nucleus/reports`
          : `${apiUrl}/api/project-nucleus/reports`;

        const response = await axios.get(endpoint, {
          params: {
            branchId: selectedBranch && selectedBranch !== 'all' ? selectedBranch : undefined,
            category: selectedCategory && selectedCategory !== 'all' ? selectedCategory : undefined
          },
          withCredentials: true
        });
        setData(response.data);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [selectedBranch, selectedCategory]);

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

  const getFilteredData = () => {
    return filterByTime(data); // Base data
  };

  const currentData = getFilteredData();

  // Helper for Fine/Penalty Data
  const getFinePenaltyData = (type) => {
    return currentData.filter(item => {
      const val = type === 'fine'
        ? (item.fine_val !== undefined ? item.fine_val : (parseFloat(item.fine_amount?.toString().replace(/[^0-9.]/g, '') || 0)))
        : (item.penalty_val !== undefined ? item.penalty_val : (parseFloat(item.penalty_amount?.toString().replace(/[^0-9.]/g, '') || 0)));
      return val > 0;
    });
  };

  // Get unique importers for dropdown
  const getUniqueImporters = () => {
    const importers = new Set();
    currentData.forEach(item => {
      if (item.importer) {
        importers.add(item.importer);
      }
    });
    return Array.from(importers).sort();
  };

  // Group Data for Importer Wise Report
  const getImporterContainerData = () => {
    const grouped = {};
    let total20 = 0;
    let total40 = 0;
    let totalBE = 0;

    // Filter by selected importer if one is chosen
    const dataToProcess = selectedImporter
      ? currentData.filter(item => item.importer === selectedImporter)
      : currentData;

    dataToProcess.forEach(item => {
      const importer = item.importer || 'Unknown';
      if (!grouped[importer]) {
        grouped[importer] = {
          name: importer,
          beCount: 0,
          count20: 0,
          count40: 0
        };
      }

      grouped[importer].beCount += 1;
      grouped[importer].count20 += (item.fcl20 || 0);
      grouped[importer].count40 += (item.fcl40 || 0);

      totalBE += 1;
      total20 += (item.fcl20 || 0);
      total40 += (item.fcl40 || 0);
    });

    return {
      rows: Object.values(grouped).sort((a, b) => b.beCount - a.beCount),
      summary: { totalBE, total20, total40 }
    };
  };

  const handleStatusUpdate = async (jobId, source) => {
    try {
      const updates = {
        penalty_by_us: source === 'us',
        penalty_by_importer: source === 'importer'
      };

      // Optimistic update locally
      const newData = data.map(item => {
        if (item._id === jobId) {
          return { ...item, ...updates };
        }
        return item;
      });
      setData(newData);

      let apiUrl = process.env.REACT_APP_API_STRING || 'http://localhost:9006';
      if (apiUrl.endsWith('/')) apiUrl = apiUrl.slice(0, -1);

      const endpoint = apiUrl.endsWith('/api')
        ? `${apiUrl}/project-nucleus/update-penalty-status`
        : `${apiUrl}/api/project-nucleus/update-penalty-status`;

      await axios.post(endpoint, {
        jobId,
        updates
      }, { withCredentials: true });

    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const renderContent = () => {
    if (activeReport === 'billing') {
      return <div className="billing-wrapper"><BillingPending /></div>;
    }

    if (activeReport === 'monthly-container') {
      return <MonthlyContainers />;
    }

    if (loading) {
      return <div style={{ padding: '20px', color: '#6b7280' }}>Loading report data...</div>;
    }

    // Filter Controls
    const FilterSection = () => (
      <div className="nucleus-filter-section" style={{ marginBottom: '20px' }}>
        <div className="filter-row custom-filter-row" style={{ marginTop: 0, paddingLeft: 0, background: 'transparent' }}>
          <div className="filter-type-selector">
            <span className="filter-label" style={{ minWidth: 'auto', marginRight: '10px' }}>Filter Period:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
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
    );

    if (activeReport === 'importer-container') {
      const { rows, summary } = getImporterContainerData();
      const uniqueImporters = getUniqueImporters();

      // Filter importers based on search input
      const filteredImporters = uniqueImporters.filter(importer =>
        importer.toLowerCase().includes(importerSearchInput.toLowerCase())
      );

      const handleImporterInputChange = (e) => {
        const value = e.target.value;
        setImporterSearchInput(value);
        setShowImporterSuggestions(true);
        if (!value) {
          setSelectedImporter('');
        }
      };

      const handleImporterSelect = (importer) => {
        setSelectedImporter(importer);
        setImporterSearchInput(importer);
        setShowImporterSuggestions(false);
      };

      const handleClearImporter = () => {
        setSelectedImporter('');
        setImporterSearchInput('');
        setShowImporterSuggestions(false);
      };

      return (
        <div className="report-content">
          <h2 className="report-title">Importer Wise Container Report</h2>
          <FilterSection />

          {/* Importer Search Filter */}
          <div className="nucleus-filter-section" style={{ marginBottom: '20px', marginTop: '-10px' }}>
            <div className="filter-row custom-filter-row" style={{ marginTop: 0, paddingLeft: 0, background: 'transparent' }}>
              <div className="filter-type-selector" style={{ position: 'relative' }}>
                <span className="filter-label" style={{ minWidth: 'auto', marginRight: '10px' }}>Search Importer:</span>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <input
                    type="text"
                    value={importerSearchInput}
                    onChange={handleImporterInputChange}
                    onFocus={() => setShowImporterSuggestions(true)}
                    placeholder="Type to search importers..."
                    className="nucleus-input"
                    style={{ minWidth: '300px', paddingRight: '30px' }}
                  />
                  {importerSearchInput && (
                    <button
                      onClick={handleClearImporter}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#6b7280',
                        fontSize: '18px',
                        padding: '0 4px'
                      }}
                    >
                      ×
                    </button>
                  )}

                  {/* Typeahead Suggestions */}
                  {showImporterSuggestions && importerSearchInput && filteredImporters.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        marginTop: '4px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        zIndex: 1000
                      }}
                    >
                      {filteredImporters.map((importer, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleImporterSelect(importer)}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            borderBottom: idx < filteredImporters.length - 1 ? '1px solid #f3f4f6' : 'none',
                            transition: 'background 0.15s',
                            fontSize: '14px'
                          }}
                          onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
                          onMouseLeave={(e) => e.target.style.background = 'white'}
                        >
                          {importer}
                        </div>
                      ))}
                    </div>
                  )}

                  {showImporterSuggestions && importerSearchInput && filteredImporters.length === 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        marginTop: '4px',
                        padding: '10px 12px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        zIndex: 1000,
                        color: '#6b7280',
                        fontSize: '14px'
                      }}
                    >
                      No importers found
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="summary-cards-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <div className="summary-card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>Total Bill of Entry</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{summary.totalBE}</div>
            </div>
            <div className="summary-card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #10b981' }}>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>Total 20ft Containers</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{summary.total20}</div>
            </div>
            <div className="summary-card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ color: '#6b7280', fontSize: '14px' }}>Total 40ft Containers</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>{summary.total40}</div>
            </div>
          </div>

          <div className="nucleus-table-wrapper">
            <table className="nucleus-table">
              <thead>
                <tr>
                  <th>Importer Name</th>
                  <th>Number of Bills of Entry</th>
                  <th>20 Feet Count</th>
                  <th>40 Feet Count</th>
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 ? (
                  rows.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 500 }}>{row.name}</td>
                      <td>{row.beCount}</td>
                      <td>{row.count20}</td>
                      <td>{row.count40}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', color: '#6b7280', padding: '30px' }}>
                      No records found for the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Fine or Penalty Report
    const dataToShow = getFinePenaltyData(activeReport);

    return (
      <div className="report-content">
        <h2 className="report-title">{activeReport === 'fine' ? 'Fine Report' : 'Penalty Report'}</h2>

        {/* Helper Stats Text for Fine/Penalty */}
        <div className="nucleus-stats-card" style={{ marginBottom: '20px' }}>
          <div className="stats-text">
            {(() => {
              const totalFiled = currentData.length;
              const affectedCount = dataToShow.length;
              const percentage = totalFiled > 0 ? ((affectedCount / totalFiled) * 100).toFixed(1) : 0;

              const totalAmount = dataToShow.reduce((sum, item) => {
                const val = activeReport === 'fine'
                  ? (item.fine_val !== undefined ? item.fine_val : (parseFloat(item.fine_amount?.toString().replace(/[^0-9.]/g, '') || 0)))
                  : (item.penalty_val !== undefined ? item.penalty_val : (parseFloat(item.penalty_amount?.toString().replace(/[^0-9.]/g, '') || 0)));
                return sum + val;
              }, 0);

              const formattedAmount = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0
              }).format(totalAmount);

              return (
                <>
                  In selected period, we filed <span className="highlight-val">{totalFiled}</span> Bills of Entry, out of which <span className="highlight-val">{affectedCount}</span> had {activeReport === 'fine' ? 'fines' : 'penalties'} (<span className="highlight-val">{percentage}%</span>).
                  Total Amount: <span className="highlight-val" style={{ color: activeReport === 'fine' ? '#d97706' : '#dc2626' }}>{formattedAmount}</span>
                </>
              );
            })()}
          </div>
        </div>

        <FilterSection />

        <div className="nucleus-table-wrapper">
          <table className="nucleus-table">
            <thead>
              <tr>
                <th>Job No</th>
                <th>BE No</th>
                <th>BE Date</th>
                <th>Amount (INR)</th>
                <th>Accountability</th>
                <th>Importer</th>
                <th>Handler Name(s)</th>
              </tr>
            </thead>
            <tbody>
              {dataToShow.length > 0 ? (
                dataToShow.map((item) => (
                  <tr key={item._id}>
                    <td style={{ fontWeight: 500, whiteSpace: "nowrap" }}>{item.job_number || item.job_no}</td>
                    <td>{item.be_no}</td>
                    <td>{item.be_date}</td>
                    <td className={`amount-cell ${activeReport === 'fine' ? 'fine-amount' : 'penalty-amount'}`}>
                      {activeReport === 'fine' ? item.fine_amount : item.penalty_amount}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '15px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '5px' }}>
                          <input
                            type="radio"
                            name={`accountability_${item._id}`}
                            checked={item.penalty_by_us === true}
                            onChange={() => handleStatusUpdate(item._id, 'us')}
                          />
                          By Us
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '5px' }}>
                          <input
                            type="radio"
                            name={`accountability_${item._id}`}
                            checked={item.penalty_by_importer === true}
                            onChange={() => handleStatusUpdate(item._id, 'importer')}
                          />
                          By Importer
                        </label>
                      </div>
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
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="penalty-page-container">

      {/* SIDEBAR */}
      <div className="reports-sidebar">
        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', fontWeight: 'bold', fontSize: '18px', color: '#111827' }}>
          Reports Hub
        </div>
        <div className="sidebar-menu" style={{ padding: '10px' }}>
          <div
            className={`sidebar-item ${activeReport === 'monthly-container' ? 'active' : ''}`}
            onClick={() => setActiveReport('monthly-container')}
          >
            Monthly Container
          </div>
          <div
            className={`sidebar-item ${activeReport === 'importer-container' ? 'active' : ''}`}
            onClick={() => setActiveReport('importer-container')}
          >
            Importer Wise BoE's
          </div>
          <div
            className={`sidebar-item ${activeReport === 'fine' ? 'active' : ''}`}
            onClick={() => setActiveReport('fine')}
          >
            Fine Report
          </div>
          <div
            className={`sidebar-item ${activeReport === 'penalty' ? 'active' : ''}`}
            onClick={() => setActiveReport('penalty')}
          >
            Penalty Report
          </div>
          <div
            className={`sidebar-item ${activeReport === 'billing' ? 'active' : ''}`}
            onClick={() => setActiveReport('billing')}
          >
            Billing Pending
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="nucleus-main-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default Penalty;