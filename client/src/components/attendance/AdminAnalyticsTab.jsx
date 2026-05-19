import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { 
  FiUsers, FiCheckCircle, FiXCircle, FiClock, FiCalendar, 
  FiChevronLeft, FiChevronRight, FiX, FiSearch, FiDownload, FiFilter, FiMapPin
} from 'react-icons/fi';
import attendanceAPI from '../../api/attendance/attendance.api';
import toast from 'react-hot-toast';
import AttendanceAnalyticsModal from './AttendanceAnalyticsModal';
import EmployeeAttendanceDetailModal from './EmployeeAttendanceDetailModal';

const formatLeaveBadge = (leaveType) => {
    if (!leaveType) return '';
    const lt = leaveType.toLowerCase();
    if (lt.includes('privilege') || lt.includes('earned')) return 'PL';
    if (lt.includes('without pay') || lt === 'lwp') return 'LWP';

    return leaveType
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 3);
};

const COLORS = {
  present: '#36b60f',
  late: '#b45309',
  leave: '#1e40af',
  absent: '#c02e2e',
  half_day: '#ff9101',
  missed_punch: '#f97316'
};

const AdminAnalyticsTab = ({ data, loading, currentDate, endDate, onDateChange, onEndDateChange, companies = [], selectedCompanyId, onCompanyChange }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [groupBy, setGroupBy] = useState('none');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [localStartDate, setLocalStartDate] = useState(currentDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'present',
  });

  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Sync local dates with props
  useEffect(() => { setLocalStartDate(currentDate); }, [currentDate]);
  useEffect(() => { setLocalEndDate(endDate); }, [endDate]);

  // Debounced parent updates
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localStartDate !== currentDate) onDateChange(localStartDate);
    }, 800);
    return () => clearTimeout(timer);
  }, [localStartDate, currentDate, onDateChange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localEndDate !== endDate) onEndDateChange(localEndDate);
    }, 800);
    return () => clearTimeout(timer);
  }, [localEndDate, endDate, onEndDateChange]);

  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  const openModal = (type) => {
    setModalConfig({
      isOpen: true,
      type
    });
  };

  if (loading) return (
    <div className="adb-analytics-loading">
        <div className="adb-loader"></div>
        <span>Fetching detailed company summary...</span>
    </div>
  );
  if (!data) return <div className="adb-empty">No data available for the selected date.</div>;

  const dailySummarySource =
    (Array.isArray(data?.dailySummary) && data.dailySummary) ||
    (Array.isArray(data?.daily_summary) && data.daily_summary) ||
    (Array.isArray(data?.summaryRows) && data.summaryRows) ||
    (Array.isArray(data?.employees) && data.employees) ||
    [];

  const dailySummary = dailySummarySource.map((emp, idx) => {
    const originalId = emp?._id || emp?.id || emp?.employee_id;
    return {
      id: originalId || `row-${idx}`,
      _id: originalId,
      name: emp?.name || emp?.employeeName || emp?.employee_name || emp?.username || 'Unknown',
      organization: emp?.organization || emp?.company_name || emp?.company || 'All Companies',
      team: emp?.team || emp?.team_name || 'Unassigned',
      department: emp?.department || emp?.department_name || emp?.dept || 'General',
      status: String(emp?.status || emp?.attendanceStatus || 'absent').toLowerCase(),
      inTime: emp?.inTime || emp?.first_in || emp?.firstIn || null,
      outTime: emp?.outTime || emp?.last_out || emp?.lastOut || null,
      lateMinutes: Number(emp?.lateMinutes ?? emp?.late_by_minutes ?? emp?.lateBy ?? 0),
      leave: emp?.leave || null
    };
  });

  const onLeaveList = dailySummary.filter(e => ['leave', 'pending_leave'].includes(e.status));
  const presentList = dailySummary.filter(e => ['present', 'late', 'half_day'].includes(e.status));
  const absentList = dailySummary.filter(e => e.status === 'absent');
  const missedPunchList = dailySummary.filter(e => ['incomplete', 'missed_punch'].includes(e.status));

  const stats = {
    present: presentList.length,
    onLeave: onLeaveList.length,
    absent: absentList.length,
    missedPunch: missedPunchList.length
  };
  
  const chartData = [
    { name: 'Present', value: stats.present, color: COLORS.present },
    { name: 'On Leave', value: stats.onLeave, color: COLORS.leave },
    { name: 'Absent', value: stats.absent, color: COLORS.absent },
    { name: 'Missed Punch', value: stats.missedPunch, color: COLORS.missed_punch },
  ].filter(d => d.value > 0);

  const getStatusStyle = (status) => {
    const styles = {
      present: { label: 'Present', color: '#059669', bg: '#ecfdf5' },
      late: { label: 'Late', color: '#b45309', bg: '#fffbeb' },
      leave: { label: 'Leave', color: '#1e40af', bg: '#eff6ff' },
      pending_leave: { label: 'Leave', color: '#1e40af', bg: '#eff6ff' },
      absent: { label: 'Absent', color: '#c02e2e', bg: '#fef2f2' },
      half_day: { label: 'Half Day', color: '#ff9101', bg: '#fff7ed' }
    };
    return styles[status] || { label: status, color: '#64748b', bg: '#f1f5f9' };
  };

  const fmtTime = (iso) => {
    if (!iso) return '--:--';
    const date = new Date(iso);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    }).toUpperCase();
  };

  const groupValueFor = (emp) => {
    if (groupBy === 'organization') return emp.organization || 'All Companies';
    if (groupBy === 'team') return emp.team || 'Unassigned';
    return '';
  };

  const filteredSummary = dailySummary.filter(emp => {
    const matchesSearch = 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.team.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'present' && ['present', 'late', 'half_day'].includes(emp.status)) ||
      (statusFilter === 'absent' && emp.status === 'absent') ||
      (statusFilter === 'late' && emp.status === 'late') ||
      (statusFilter === 'leave' && ['leave', 'pending_leave'].includes(emp.status)) ||
      (statusFilter === 'missed_punch' && ['incomplete', 'missed_punch'].includes(emp.status));

    return matchesSearch && matchesStatus;
  });

  const sortedSummary = [...filteredSummary].sort((a, b) => {
    if (groupBy !== 'none') {
      const groupA = groupValueFor(a);
      const groupB = groupValueFor(b);
      const groupCompare = groupA.localeCompare(groupB);
      if (groupCompare !== 0) return groupCompare;
    }
    return a.name.localeCompare(b.name);
  });

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filteredSummary.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredSummary.slice(startIndex, startIndex + itemsPerPage);
  const tableData = groupBy === 'none' ? paginatedData : sortedSummary;

  // Custom Chart Label
  const renderCustomizedLabel = ({ cx, cy }) => {
    const total = stats.present + stats.onLeave + stats.absent;
    const percentage = total > 0 ? Math.round((stats.present / total) * 100) : 0;
    
    return (
      <g>
        <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '18px', fontWeight: '800', fill: '#111827' }}>
          {percentage}%
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '10px', fontWeight: '600', fill: '#6b7280' }}>
          Present
        </text>
      </g>
    );
  };

  const renderTableRow = (emp) => {
    const statusStyle = getStatusStyle(emp.status);
    return (
      <tr key={emp.id} className="analytics-row clickable" onClick={() => setSelectedEmployee(emp)} style={{ cursor: 'pointer' }}>
        <td>
          <div className="adb-td-user">
            <div className="adb-user-avatar">
              {emp.name?.split(' ').map(n => n.charAt(0)).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="adb-user-info">
              <div className="adb-user-name">{emp.name}</div>
              <div className="adb-user-role">{emp.role || emp.department || 'Employee'}</div>
            </div>
          </div>
        </td>
        <td className="adb-org-cell" title={emp.organization || 'SFPL'}>
          {emp.organization || 'SFPL'}
        </td>
        <td className="adb-team-cell">{emp.team || 'Unassigned'}</td>
        <td>
          <span className={`adb-status-pill-v2 ${emp.status}`}>
            <span className="adb-pill-dot" />
            {statusStyle.label}
          </span>
        </td>
        <td className="adb-td-time">{fmtTime(emp.inTime)}</td>
        <td className="adb-td-time">{fmtTime(emp.outTime)}</td>
        <td className="adb-td-late">
          {emp.lateMinutes > 0 ? (
            <span className="adb-late-badge">+{emp.lateMinutes}m</span>
          ) : (
            <span className="adb-td-muted">0m</span>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="adb-analytics-tab">
      {/* Header Controls */}
      <div className="adb-analytics-header">
         <div className="adb-header-controls">
            <div className="adb-date-picker-wrap">
                <span style={{ fontSize: '12px', color: '#6b7280', marginRight: '8px' }}>From:</span>
                <FiCalendar className="adb-dp-icon" />
                <input 
                    type="date" 
                    className="adb-date-input" 
                    value={localStartDate} 
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setLocalStartDate(e.target.value)}
                />
            </div>

            <div className="adb-date-picker-wrap">
                <span style={{ fontSize: '12px', color: '#6b7280', marginRight: '8px' }}>To:</span>
                <FiCalendar className="adb-dp-icon" />
                <input 
                    type="date" 
                    className="adb-date-input" 
                    value={localEndDate} 
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setLocalEndDate(e.target.value)}
                />
            </div>

            <div className="adb-company-filter-wrap">
              <FiFilter className="adb-dp-icon" />
              <select
                className="adb-company-select"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
              >
                <option value="none">No Grouping</option>
                <option value="organization">Group by Organization</option>
                <option value="team">Group by Team</option>
              </select>
            </div>

            {companies.length > 0 && (
              <div className="adb-company-filter-wrap">
                <FiUsers className="adb-dp-icon" />
                <select 
                  className="adb-company-select"
                  value={selectedCompanyId}
                  onChange={(e) => onCompanyChange(e.target.value)}
                >
                  <option value="">All Companies</option>
                  {companies.map(c => (
                    <option key={c._id} value={c._id}>{c.company_name}</option>
                  ))}
                </select>
              </div>
            )}

         </div>
      </div>

      {/* Main Dashboard Row */}
      <div className="adb-dashboard-row">

        {/* Summary Table */}
        <div className="adb-summary-table-wrap">
          <div className="adb-table-header">
            <h3 className="adb-card-title"><FiUsers style={{ marginRight: 6 }} /> Employee Daily Summary</h3>
            <div className="adb-table-header-actions">
              <div className="adb-search-input-wrap" style={{ minWidth: '180px', height: '32px', background: '#f8fafc' }}>
                <FiSearch className="adb-search-icon" />
                <input 
                  type="text" 
                  placeholder="Search user..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ fontSize: '0.75rem' }}
                />
                {searchTerm && <FiX className="adb-search-icon clickable" onClick={() => setSearchTerm('')} style={{ fontSize: '10px' }} />}
              </div>

              <div className="adb-company-filter-wrap" style={{ background: '#f8fafc', padding: '0 8px', borderRadius: '8px', border: '1px solid #e2e8f0', height: '32px' }}>
                <FiFilter className="adb-dp-icon" style={{ fontSize: '0.75rem' }} />
                <select 
                  className="adb-company-select" 
                  style={{ fontSize: '0.75rem', fontWeight: '600' }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="leave">On Leave</option>
                  <option value="missed_punch">Missed Punch</option>
                </select>
              </div>

              {groupBy === 'none' && filteredSummary.length > itemsPerPage && (
                <div className="adb-pagination-controls">
                  <span className="adb-pag-info">Page {currentPage} of {totalPages}</span>
                  <div className="adb-pag-btns">
                    <button 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                      className="adb-pag-btn"
                    >
                      <FiChevronLeft />
                    </button>
                    <button 
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      className="adb-pag-btn"
                    >
                      <FiChevronRight />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="adb-table-scroll">
            <table className="adb-summary-table">
              <colgroup>
                <col className="col-employee" />
                <col className="col-org" />
                <col className="col-team" />
                <col className="col-status" />
                <col className="col-in" />
                <col className="col-out" />
                <col className="col-late" />
              </colgroup>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Organization</th>
                  <th>Team</th>
                  <th>Status</th>
                  <th>In Time</th>
                  <th>Out Time</th>
                  <th>Late</th>
                </tr>
              </thead>
              <tbody>
                {tableData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="adb-td-empty">No employee records found</td>
                  </tr>
                ) : groupBy === 'none' ? (
                  tableData.map((emp) => renderTableRow(emp))
                ) : (() => {
                  const rows = [];
                  let lastGroup = null;
                  tableData.forEach((emp) => {
                    const groupLabel = groupValueFor(emp) || 'Unassigned';
                    if (groupLabel !== lastGroup) {
                      const groupCount = tableData.filter(item => groupValueFor(item) === groupLabel).length;
                      rows.push(
                        <tr key={`group-${groupLabel}`} className="adb-group-row">
                          <td colSpan="7">
                            <div className="adb-group-banner">
                              <span className="adb-group-title">{groupLabel}</span>
                              <span className="adb-group-count">{groupCount} employees</span>
                            </div>
                          </td>
                        </tr>
                      );
                      lastGroup = groupLabel;
                    }
                    rows.push(renderTableRow(emp));
                  });
                  return rows;
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Content */}
        <div className="adb-side-content">

          {/* Donut Chart */}
          <div className="adb-chart-card">
            <h3 className="adb-chart-title">ATTENDANCE DISTRIBUTION</h3>
            <div className="adb-chart-container">
              <div className="adb-chart-inner">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={0}
                      dataKey="value"
                      stroke="none"
                      labelLine={false}
                      label={renderCustomizedLabel}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="adb-chart-legend">
                <div className="adb-legend-item">
                  <span className="adb-legend-dot" style={{ background: COLORS.present }} />
                  <span className="adb-legend-lbl">Present</span>
                  <span className="adb-legend-val">{stats.present}</span>
                </div>
                <div className="adb-legend-item">
                  <span className="adb-legend-dot" style={{ background: COLORS.leave }} />
                  <span className="adb-legend-lbl">On Leave</span>
                  <span className="adb-legend-val">{stats.onLeave}</span>
                </div>
                <div className="adb-legend-item">
                  <span className="adb-legend-dot" style={{ background: COLORS.absent }} />
                  <span className="adb-legend-lbl">Absent</span>
                  <span className="adb-legend-val">{stats.absent}</span>
                </div>
                <div className="adb-legend-item">
                  <span className="adb-legend-dot" style={{ background: COLORS.missed_punch }} />
                  <span className="adb-legend-lbl">Missed Punch</span>
                  <span className="adb-legend-val">{stats.missedPunch}</span>
                </div>
              </div>
            </div>
          </div>

          {/* On Leave Today */}
          <div className="adb-leave-list-card">
            <h3 className="adb-chart-title">
              ON LEAVE TODAY
              <span className="adb-on-leave-count">{onLeaveList.length} employees</span>
            </h3>
            <div className="adb-leave-list-scroll">
              {onLeaveList.length === 0 ? (
                <div className="adb-no-leave">No employees on leave for this date.</div>
              ) : onLeaveList.slice(0, 5).map(emp => (
                <div key={emp.id} className="adb-leave-list-item">
                  <div className="adb-lr-avatar">
                    {emp.name?.split(' ').map(n => n.charAt(0)).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="adb-lr-info">
                    <div className="adb-lr-name">{emp.name}</div>
                    <div className="adb-lr-meta">
                      {emp.leave?.type
                        ? (emp.leave.type.charAt(0).toUpperCase() + emp.leave.type.slice(1))
                        : 'Leave'}
                      {emp.leave?.reason ? ` · ${emp.leave.reason}` : ''}
                    </div>
                  </div>
                  <div className={`adb-lr-status-v2 ${emp.leave?.status || 'pending'}`}>
                    {(emp.leave?.status || 'pending').toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
            {onLeaveList.length > 5 && (
              <button className="adb-view-all-btn" onClick={() => openModal('leave')}>
                View all {onLeaveList.length} →
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Analytics Detail Modal */}
      <AttendanceAnalyticsModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        type={modalConfig.type}
        startDate={localStartDate}
        endDate={localEndDate}
        companyId={selectedCompanyId}
        role="ADMIN"
      />

      <EmployeeAttendanceDetailModal 
        isOpen={!!selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        employee={selectedEmployee}
        startDate={currentDate}
        endDate={endDate}
      />
    </div>
  );
};

export default AdminAnalyticsTab;