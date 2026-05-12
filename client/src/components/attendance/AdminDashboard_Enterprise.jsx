import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUsers, FiCheckCircle, FiXCircle, FiCalendar,
  FiRefreshCw, FiChevronLeft, FiChevronRight,
  FiFilter, FiClock, FiAlertCircle, FiTrendingUp
} from 'react-icons/fi';
import useAdminDashboard from '../../hooks/useAdminDashboard';
import toast from 'react-hot-toast';
import './AdminDashboard.css';

/**
 * ENTERPRISE ADMIN DASHBOARD
 * Multi-organization, multi-level hierarchical view with dynamic filtering
 */
const AdminDashboard = () => {
  const navigate = useNavigate();
  const dashboard = useAdminDashboard();

  const {
    filters, data, monthlyData, leaveRequests, hierarchy,
    loading, error, lastUpdateTime, autoRefresh,
    handleOrganizationChange, handleDepartmentChange, handleTeamChange,
    handleDateChange, handleSummaryTypeChange, handleRefresh, toggleAutoRefresh,
    activeTab, setActiveTab
  } = dashboard;

  // Local UI state
  const [showFilters, setShowFilters] = useState(false);

  const getDisplayDate = () => {
    return filters.date.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getOrgName = (orgId) => {
    const org = hierarchy.organizations.find(o => o.id === orgId);
    return org?.name || 'All Organizations';
  };

  const presentCount = data.summary?.global?.present_today || 0;
  const absentCount = data.summary?.global?.absent_today || 0;
  const onLeaveCount = data.summary?.global?.on_leave_today || 0;
  const lateCount = data.summary?.global?.late_arrivals || 0;
  const totalCount = data.summary?.global?.total_employees || 0;

  return (
    <div className="admin-dashboard-container">
      {/* HEADER */}
      <div className="adb-header">
        <div className="adb-header-left">
          <h1 className="adb-title">Admin Dashboard</h1>
          <p className="adb-subtitle">
            {filters.summaryType === 'daily' ? getDisplayDate() : `${filters.date.toLocaleString('en-IN', { month: 'long', year: 'numeric' })}`}
          </p>
        </div>

        <div className="adb-header-right">
          <div className="adb-status-badge">
            {autoRefresh ? (
              <span className="badge-pulse">🟢 Live</span>
            ) : (
              <span className="badge-paused">⏸ Paused</span>
            )}
          </div>

          <button
            className="adb-btn adb-btn-icon"
            onClick={toggleAutoRefresh}
            title={autoRefresh ? 'Pause auto-refresh' : 'Resume auto-refresh'}
          >
            <FiRefreshCw size={16} />
          </button>

          <button
            className="adb-btn adb-btn-icon"
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh data"
          >
            <FiRefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>

          <button
            className={`adb-btn adb-btn-icon ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Toggle filters"
          >
            <FiFilter size={16} />
          </button>
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="adb-alert adb-alert-error">
          <FiAlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => {}} className="adb-alert-close">✕</button>
        </div>
      )}

      {/* FILTERS */}
      {showFilters && (
        <div className="adb-filters-panel">
          <div className="adb-filter-group">
            <label className="adb-filter-label">Organizations</label>
            <select
              multiple
              className="adb-filter-select"
              value={filters.organizations}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                handleOrganizationChange(selected);
              }}
            >
              {hierarchy.organizations?.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.employee_count} employees)
                </option>
              ))}
            </select>
            {filters.organizations.length === 0 && (
              <p className="adb-filter-hint">All organizations selected</p>
            )}
          </div>

          <div className="adb-filter-group">
            <label className="adb-filter-label">Summary Type</label>
            <div className="adb-filter-toggle">
              <button
                className={`adb-toggle-btn ${filters.summaryType === 'daily' ? 'active' : ''}`}
                onClick={() => handleSummaryTypeChange('daily')}
              >
                Daily
              </button>
              <button
                className={`adb-toggle-btn ${filters.summaryType === 'monthly' ? 'active' : ''}`}
                onClick={() => handleSummaryTypeChange('monthly')}
              >
                Monthly
              </button>
            </div>
          </div>

          <div className="adb-filter-group">
            <label className="adb-filter-label">Date</label>
            <input
              type="date"
              className="adb-filter-input"
              value={filters.date.toISOString().split('T')[0]}
              onChange={(e) => handleDateChange(new Date(e.target.value))}
            />
          </div>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="adb-kpi-grid">
        <div className="adb-kpi-card">
          <div className="adb-kpi-icon blue">
            <FiUsers size={20} />
          </div>
          <div className="adb-kpi-content">
            <div className="adb-kpi-value">{totalCount}</div>
            <div className="adb-kpi-label">Total Employees</div>
          </div>
        </div>

        <div className="adb-kpi-card">
          <div className="adb-kpi-icon green">
            <FiCheckCircle size={20} />
          </div>
          <div className="adb-kpi-content">
            <div className="adb-kpi-value">{presentCount}</div>
            <div className="adb-kpi-label">Present Today</div>
            <div className="adb-kpi-percent">{totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : 0}%</div>
          </div>
        </div>

        <div className="adb-kpi-card">
          <div className="adb-kpi-icon red">
            <FiXCircle size={20} />
          </div>
          <div className="adb-kpi-content">
            <div className="adb-kpi-value">{absentCount}</div>
            <div className="adb-kpi-label">Absent Today</div>
            <div className="adb-kpi-percent">{totalCount > 0 ? ((absentCount / totalCount) * 100).toFixed(1) : 0}%</div>
          </div>
        </div>

        <div className="adb-kpi-card">
          <div className="adb-kpi-icon purple">
            <FiCalendar size={20} />
          </div>
          <div className="adb-kpi-content">
            <div className="adb-kpi-value">{onLeaveCount}</div>
            <div className="adb-kpi-label">On Leave</div>
          </div>
        </div>

        <div className="adb-kpi-card">
          <div className="adb-kpi-icon orange">
            <FiClock size={20} />
          </div>
          <div className="adb-kpi-content">
            <div className="adb-kpi-value">{lateCount}</div>
            <div className="adb-kpi-label">Late Arrivals</div>
          </div>
        </div>

        <div className="adb-kpi-card">
          <div className="adb-kpi-icon teal">
            <FiTrendingUp size={20} />
          </div>
          <div className="adb-kpi-content">
            <div className="adb-kpi-value">{data.summary?.global?.pending_approvals || 0}</div>
            <div className="adb-kpi-label">Pending Approvals</div>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="adb-tabs">
        <button
          className={`adb-tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          📊 Summary
        </button>
        <button
          className={`adb-tab ${activeTab === 'present' ? 'active' : ''}`}
          onClick={() => setActiveTab('present')}
        >
          ✅ Present ({presentCount})
        </button>
        <button
          className={`adb-tab ${activeTab === 'absent' ? 'active' : ''}`}
          onClick={() => setActiveTab('absent')}
        >
          ❌ Absent ({absentCount})
        </button>
        <button
          className={`adb-tab ${activeTab === 'leaves' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaves')}
        >
          📋 Leaves ({leaveRequests.pending?.length || 0})
        </button>
        <button
          className={`adb-tab ${activeTab === 'organizations' ? 'active' : ''}`}
          onClick={() => setActiveTab('organizations')}
        >
          🏢 Organizations
        </button>
      </div>

      {/* CONTENT */}
      <div className="adb-content">
        {/* LOADING STATE */}
        {loading && (
          <div className="adb-loading">
            <div className="spinner"></div>
            <p>Loading dashboard data...</p>
          </div>
        )}

        {/* SUMMARY TAB */}
        {!loading && activeTab === 'summary' && filters.summaryType === 'daily' && (
          <div className="adb-tab-content">
            <div className="adb-section">
              <h3 className="adb-section-title">Daily Attendance Overview</h3>
              <div className="adb-stats-grid-2">
                <div className="adb-stat-item">
                  <div className="adb-stat-label">Present</div>
                  <div className="adb-stat-value green">{presentCount}</div>
                </div>
                <div className="adb-stat-item">
                  <div className="adb-stat-label">Absent</div>
                  <div className="adb-stat-value red">{absentCount}</div>
                </div>
                <div className="adb-stat-item">
                  <div className="adb-stat-label">On Leave</div>
                  <div className="adb-stat-value blue">{onLeaveCount}</div>
                </div>
                <div className="adb-stat-item">
                  <div className="adb-stat-label">Late Arrivals</div>
                  <div className="adb-stat-value orange">{lateCount}</div>
                </div>
              </div>
            </div>

            {/* Organization Breakdown */}
            {data.organizations && data.organizations.length > 0 && (
              <div className="adb-section">
                <h3 className="adb-section-title">Organization Breakdown</h3>
                <div className="adb-orgs-breakdown">
                  {data.organizations.map(org => (
                    <div key={org.org_id} className="adb-org-card">
                      <h4>{org.org_name}</h4>
                      <div className="adb-org-stats">
                        <div className="adb-org-stat">
                          <span className="label">Total</span>
                          <span className="value">{org.total_employees}</span>
                        </div>
                        <div className="adb-org-stat">
                          <span className="label">Present</span>
                          <span className="value green">{org.present}</span>
                        </div>
                        <div className="adb-org-stat">
                          <span className="label">Absent</span>
                          <span className="value red">{org.absent}</span>
                        </div>
                        <div className="adb-org-stat">
                          <span className="label">On Leave</span>
                          <span className="value blue">{org.on_leave}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PRESENT TAB */}
        {!loading && activeTab === 'present' && (
          <div className="adb-tab-content">
            <table className="adb-table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>In Time</th>
                  <th>Out Time</th>
                  <th>Work Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.daily_details?.present?.map(emp => (
                  <tr key={emp.emp_id}>
                    <td><strong>{emp.emp_name}</strong></td>
                    <td>{emp.in_time ? new Date(emp.in_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td>{emp.out_time ? new Date(emp.out_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td>{emp.work_hours}h</td>
                    <td>
                      <span className={`badge badge-${emp.is_late ? 'orange' : 'green'}`}>
                        {emp.is_late ? `Late (+${emp.late_by}m)` : 'Present'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!data.daily_details?.present || data.daily_details.present.length === 0) && (
              <div className="adb-empty-state">No present employees</div>
            )}
          </div>
        )}

        {/* ABSENT TAB */}
        {!loading && activeTab === 'absent' && (
          <div className="adb-tab-content">
            <table className="adb-table">
              <thead>
                <tr>
                  <th>Employee Name</th>
                  <th>Reason</th>
                  <th>Leave Type</th>
                </tr>
              </thead>
              <tbody>
                {data.daily_details?.absent?.map(emp => (
                  <tr key={emp.emp_id} className={emp.on_leave ? 'row-leave' : ''}>
                    <td><strong>{emp.emp_name}</strong></td>
                    <td>{emp.reason}</td>
                    <td>
                      {emp.on_leave ? (
                        <span className="badge badge-blue">{emp.leave_type || 'Leave'}</span>
                      ) : (
                        <span className="badge badge-red">Absent</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!data.daily_details?.absent || data.daily_details.absent.length === 0) && (
              <div className="adb-empty-state">No absent employees</div>
            )}
          </div>
        )}

        {/* LEAVES TAB */}
        {!loading && activeTab === 'leaves' && (
          <div className="adb-tab-content">
            <div className="adb-section">
              <h3 className="adb-section-title">Pending Leave Requests</h3>
              {leaveRequests.pending && leaveRequests.pending.length > 0 ? (
                <table className="adb-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Leave Type</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Days</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveRequests.pending.map(leave => (
                      <tr key={leave.id}>
                        <td><strong>{leave.employee_name}</strong></td>
                        <td>{leave.leave_type}</td>
                        <td>{new Date(leave.from_date).toLocaleDateString('en-IN')}</td>
                        <td>{new Date(leave.to_date).toLocaleDateString('en-IN')}</td>
                        <td>{leave.total_days}</td>
                        <td>
                          <span className="badge badge-yellow">Pending</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="adb-empty-state">No pending leave requests</div>
              )}
            </div>
          </div>
        )}

        {/* ORGANIZATIONS TAB */}
        {!loading && activeTab === 'organizations' && (
          <div className="adb-tab-content">
            {data.organizations && data.organizations.length > 0 ? (
              <div className="adb-orgs-list">
                {data.organizations.map(org => (
                  <div key={org.org_id} className="adb-org-detailed">
                    <h3>{org.org_name}</h3>
                    <div className="adb-org-grid">
                      <div className="adb-org-metric">
                        <div className="metric-value">{org.total_employees}</div>
                        <div className="metric-label">Total Employees</div>
                      </div>
                      <div className="adb-org-metric">
                        <div className="metric-value" style={{ color: '#10b981' }}>{org.present}</div>
                        <div className="metric-label">Present</div>
                      </div>
                      <div className="adb-org-metric">
                        <div className="metric-value" style={{ color: '#ef4444' }}>{org.absent}</div>
                        <div className="metric-label">Absent</div>
                      </div>
                      <div className="adb-org-metric">
                        <div className="metric-value" style={{ color: '#3b82f6' }}>{org.on_leave}</div>
                        <div className="metric-label">On Leave</div>
                      </div>
                      <div className="adb-org-metric">
                        <div className="metric-value" style={{ color: '#f59e0b' }}>{org.late}</div>
                        <div className="metric-label">Late</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="adb-empty-state">No organization data</div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="adb-footer">
        {lastUpdateTime && (
          <span className="adb-last-update">
            Last updated: {lastUpdateTime.toLocaleTimeString('en-IN')}
          </span>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
