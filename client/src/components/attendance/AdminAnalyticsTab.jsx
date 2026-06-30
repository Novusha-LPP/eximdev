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
  present: '#10b981',
  late: '#f59e0b',
  leave: '#3b82f6',
  absent: '#ef4444',
  half_day: '#8b5cf6'
};

const AdminAnalyticsTab = ({ data, loading, currentDate, endDate, onDateChange, onEndDateChange, companies = [], selectedCompanyId, onCompanyChange, isHOD = false, isAdmin = false }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [groupBy, setGroupBy] = useState('none');
  const [statusFilter, setStatusFilter] = useState('all');

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'present',
  });

  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    setCurrentPage(1);
    setStatusFilter('all');
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
      _id: originalId, // Preserve for key fallback if needed
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

  const stats = {
    present: presentList.length,
    onLeave: onLeaveList.length,
    absent: absentList.length
  };
  
  const chartData = [
    { name: 'Present', value: stats.present, color: COLORS.present },
    { name: 'On Leave', value: stats.onLeave, color: COLORS.leave },
    { name: 'Absent', value: stats.absent, color: COLORS.absent },
  ].filter(d => d.value > 0);

  const getStatusStyle = (status) => {
    const styles = {
      present: { label: 'Present', color: '#059669', bg: '#ecfdf5' },
      late: { label: 'Late', color: '#b45309', bg: '#fffbeb' },
      leave: { label: 'Leave', color: '#1e40af', bg: '#eff6ff' },
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

  const filteredDailySummary = statusFilter === 'all'
    ? dailySummary
    : dailySummary.filter(e => {
        if (statusFilter === 'present') return ['present', 'late', 'half_day'].includes(e.status);
        if (statusFilter === 'leave') return ['leave', 'pending_leave'].includes(e.status);
        return e.status === statusFilter;
      });

  const sortedSummary = [...filteredDailySummary].sort((a, b) => {
    if (groupBy !== 'none') {
      const groupA = groupValueFor(a);
      const groupB = groupValueFor(b);
      const groupCompare = groupA.localeCompare(groupB);
      if (groupCompare !== 0) return groupCompare;
    }
    return a.name.localeCompare(b.name);
  });

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filteredDailySummary.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredDailySummary.slice(startIndex, startIndex + itemsPerPage);
  const tableData = groupBy === 'none' ? paginatedData : sortedSummary;

  const handleMonthChange = (val) => {
    onDateChange(`${val}-01`);
  };

  return (
    <div className="adb-analytics-tab">
      <div className="adb-analytics-header">
         <div className="adb-header-controls">
            <div className="adb-date-picker-wrap">
                <span style={{ fontSize: '12px', color: '#6b7280', marginRight: '8px' }}>From:</span>
                <FiCalendar className="adb-dp-icon" />
                <input 
                    type="date" 
                    className="adb-date-input" 
                    value={currentDate} 
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => onDateChange(e.target.value)}
                />
            </div>

            <div className="adb-date-picker-wrap">
                <span style={{ fontSize: '12px', color: '#6b7280', marginRight: '8px' }}>To:</span>
                <FiCalendar className="adb-dp-icon" />
                <input 
                    type="date" 
                    className="adb-date-input" 
                    value={endDate} 
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => onEndDateChange(e.target.value)}
                />
            </div>

            {!isHOD && (
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
            )}
            {!isHOD && companies.length > 0 && (
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
            <div className="adb-company-filter-wrap">
              <FiFilter className="adb-dp-icon" />
              <select
                className="adb-company-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Statuses</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="half_day">Half Day</option>
                <option value="leave">Leave</option>
              </select>
            </div>
         </div>
      </div>

      <div className="adb-analytics-grid">
        <div className="adb-ms-card clickable" onClick={() => openModal('present')}>
            <div className="adb-ms-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: COLORS.present }}><FiUsers /></div>
            <div className="adb-ms-info">
                <span className="adb-ms-val">{stats.present}</span>
                <span className="adb-ms-lbl">Total Present</span>
            </div>
        </div>

        <div className="adb-ms-card clickable" onClick={() => openModal('leave')}>
            <div className="adb-ms-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: COLORS.leave }}><FiCalendar /></div>
            <div className="adb-ms-info">
                <span className="adb-ms-val">{stats.onLeave}</span>
                <span className="adb-ms-lbl">On Leave</span>
            </div>
        </div>
        <div className="adb-ms-card clickable" onClick={() => openModal('absent')}>
            <div className="adb-ms-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: COLORS.absent }}><FiXCircle /></div>
            <div className="adb-ms-info">
                <span className="adb-ms-val">{stats.absent}</span>
                <span className="adb-ms-lbl">Absent</span>
            </div>
        </div>
      </div>

      <div className="adb-dashboard-row">
        <div className="adb-summary-table-wrap">
            <div className="adb-table-header">
              <h3 className="adb-card-title"><FiUsers /> Employee Daily Summary</h3>
              <div className="adb-table-header-actions">
                {groupBy === 'none' && dailySummary.length > itemsPerPage && (
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
            <table className="adb-summary-table">
              <colgroup>
                <col style={{ width: '28%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '8%' }} />
              </colgroup>
              <thead>
                <tr>
                <th>Employee</th>
                      <th>Organization</th>
                      <th>Team</th>
                <th>Status</th>
                <th>Details</th>
                <th>In Time</th>
                <th>Out Time</th>
                <th>Late</th>
                </tr>
            </thead>
            <tbody>
              {tableData.length === 0 ? (
              <tr><td colSpan="8" className="adb-td-empty">No employee records found</td></tr>
              ) : groupBy === 'none' ? tableData.map((emp) => {
                const statusStyle = getStatusStyle(emp.status);
                return (
                <tr key={emp.id} className="analytics-row clickable" onClick={() => setSelectedEmployee(emp)} style={{ cursor: 'pointer' }}>
                  <td>
                  <div className="adb-td-user">
                    <div className="adb-user-avatar">{emp.name?.split(' ').map(n => n.charAt(0)).join('').slice(0, 2).toUpperCase()}</div>
                    <div className="adb-user-info">
                    <div className="adb-user-name">{emp.name}</div>
                    </div>
                  </div>
                  </td>
                  <td className="adb-org-cell">{emp.organization || 'All Companies'}</td>
                  <td className="adb-team-cell">{emp.team || 'Unassigned'}</td>
                  <td>
                  <span className={`adb-status-pill ${emp.status}`}>
                    {statusStyle.label}
                  </span>
                  </td>
                  <td>
                  {emp.leave ? (
                    <span className="adb-td-details">
                      {formatLeaveBadge(emp.leave.type)} {emp.leave.status === 'approved' ? 'Approved' : 'Applied'}
                    </span>
                  ) : <span className="adb-td-muted">—</span>}
                  </td>
                  <td className="adb-td-time">{fmtTime(emp.inTime)}</td>
                  <td className="adb-td-time">{fmtTime(emp.outTime)}</td>
                  <td className="adb-td-late">
                    {emp.lateMinutes > 0 ? (
                      <span className="adb-late-val">{emp.lateMinutes}m</span>
                    ) : (
                      <span className="adb-td-muted">0m</span>
                    )}
                  </td>
                </tr>
                );
              }) : (() => {
                const rows = [];
                let lastGroup = null;
                tableData.forEach((emp) => {
                const groupLabel = groupValueFor(emp) || 'Unassigned';
                if (groupLabel !== lastGroup) {
                  rows.push(
                  <tr key={`group-${groupLabel}`} className="adb-group-row">
                    <td colSpan="8">
                    <div className="adb-group-banner">
                      <span className="adb-group-title">{groupLabel}</span>
                      <span className="adb-group-count">{tableData.filter((item) => groupValueFor(item) === groupLabel).length} employees</span>
                    </div>
                    </td>
                  </tr>
                  );
                  lastGroup = groupLabel;
                }
                const statusStyle = getStatusStyle(emp.status);
                rows.push(
                  <tr key={emp.id} className="analytics-row clickable" onClick={() => setSelectedEmployee(emp)} style={{ cursor: 'pointer' }}>
                    <td>
                    <div className="adb-td-user">
                      <div className="adb-user-avatar">{emp.name?.split(' ').map(n => n.charAt(0)).join('').slice(0, 2).toUpperCase()}</div>
                      <div className="adb-user-info">
                      <div className="adb-user-name">{emp.name}</div>
                      </div>
                    </div>
                    </td>
                    <td className="adb-org-cell">{emp.organization || 'All Companies'}</td>
                    <td className="adb-team-cell">{emp.team || 'Unassigned'}</td>
                    <td>
                    <span className={`adb-status-pill ${emp.status}`}>
                      {statusStyle.label}
                    </span>
                    </td>
                    <td>
                    {emp.leave ? (
                      <span className="adb-td-details">
                        {formatLeaveBadge(emp.leave.type)} {emp.leave.status === 'approved' ? 'Approved' : 'Applied'}
                      </span>
                    ) : <span className="adb-td-muted">—</span>}
                    </td>
                    <td className="adb-td-time">{fmtTime(emp.inTime)}</td>
                    <td className="adb-td-time">{fmtTime(emp.outTime)}</td>
                    <td className="adb-td-late">
                      {emp.lateMinutes > 0 ? (
                        <span className="adb-late-val">{emp.lateMinutes}m</span>
                      ) : (
                        <span className="adb-td-muted">0m</span>
                      )}
                    </td>
                  </tr>
                );
                });
                return rows;
              })()}
            </tbody>
            </table>
        </div>

        <div className="adb-side-content">
            <div className="adb-chart-card">
                <h3 className="adb-card-title">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiClock /> Attendance Distribution
                    </span>
                </h3>
                <div className="adb-chart-container">
                    {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={238}>
                        <PieChart>
                        <Pie
                            data={chartData}
                            innerRadius={62}
                            outerRadius={84}
                            paddingAngle={chartData.length > 1 ? 5 : 0}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={6}
                        >
                            {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                        <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '24px', fontWeight: '800', fill: '#1e293b' }}>
                            {dailySummary.length}
                        </text>
                        <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: '11px', fontWeight: '600', fill: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Total Staff
                        </text>
                        </PieChart>
                    </ResponsiveContainer>
                    ) : (
                    <div className="adb-no-chart">No attendance data to visualize</div>
                    )}
                </div>
            </div>

            <div className="adb-leave-list-card">
                <h3 className="adb-card-title">
                    On Leave Today
                    <span className="adb-on-leave-count">{onLeaveList.length} employees</span>
                </h3>
                <div className="adb-leave-list-scroll">
                <div className="adb-leave-table-head">
                  <span>Name</span>
                  <span>Reason</span>
                  <span>Status</span>
                </div>
                {onLeaveList.slice(0, 5).map(emp => (
                  <div key={emp.id} className="adb-leave-table-row">
                    <div className="adb-lr-name-wrap">
                      <div className="adb-lr-avatar">{emp.name?.split(' ').map(n => n.charAt(0)).join('').slice(0, 2).toUpperCase()}</div>
                      <div className="adb-lr-info">
                        <div className="adb-lr-name">{emp.name}</div>
                        <div className="adb-lr-meta">{emp.leave?.type?.charAt(0).toUpperCase() + emp.leave?.type?.slice(1)}</div>
                      </div>
                    </div>
                    <div className="adb-lr-reason">{emp.leave?.reason || emp.leave?.type || 'Leave applied'}</div>
                    <div className={`adb-lr-status ${emp.leave?.status === 'approved' ? 'approved' : 'pending'}`}>{emp.leave?.status === 'approved' ? 'Approved' : 'Pending'}</div>
                  </div>
                ))}
                    {onLeaveList.length === 0 && (
                        <div className="adb-no-leave">No employees on leave for this date.</div>
                    )}
                </div>
                {onLeaveList.length > 5 && (
                    <a href="#" className="adb-view-all" onClick={(e) => e.preventDefault()}>
                        View all {onLeaveList.length} →
                    </a>
                )}
            </div>
        </div>
      </div>

      {/* Analytics Detail Modal */}
      <AttendanceAnalyticsModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        type={modalConfig.type}
        initialDate={currentDate}
        companyId={selectedCompanyId}
        isHOD={isHOD}
        isAdmin={isAdmin}
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
