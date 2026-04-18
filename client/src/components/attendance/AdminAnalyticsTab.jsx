import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { FiUsers, FiCheckCircle, FiXCircle, FiClock, FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const COLORS = {
  present: '#10b981',
  late: '#f59e0b',
  leave: '#6366f1',
  absent: '#ef4444',
  half_day: '#8b5cf6'
};

const AdminAnalyticsTab = ({ data, loading, currentDate, onDateChange, companies = [], selectedCompanyId, onCompanyChange }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    setCurrentPage(1);
  }, [data]);
  if (loading) return (
    <div className="adb-analytics-loading">
        <div className="adb-loader"></div>
        <span>Fetching detailed company summary...</span>
    </div>
  );
  if (!data) return <div className="adb-empty">No data available for the selected date.</div>;

  const stats = data?.stats || {};
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
      department: emp?.department || emp?.department_name || emp?.dept || 'General',
      status: String(emp?.status || emp?.attendanceStatus || 'absent').toLowerCase(),
      inTime: emp?.inTime || emp?.first_in || emp?.firstIn || null,
      outTime: emp?.outTime || emp?.last_out || emp?.lastOut || null,
      lateMinutes: Number(emp?.lateMinutes ?? emp?.late_by_minutes ?? emp?.lateBy ?? 0),
      leave: emp?.leave || null
    };
  });
  
  // Helpful while troubleshooting payload drift between environments.
  // console.log('AdminAnalyticsTab Data:', { keys: Object.keys(data || {}), stats, dailySummaryLength: dailySummary.length });

  const chartData = [
    { name: 'Present', value: (stats.present || 0) - (stats.late || 0), color: COLORS.present },
    { name: 'Late', value: stats.late || 0, color: COLORS.late },
    { name: 'On Leave', value: stats.onLeave || 0, color: COLORS.leave },
    { name: 'Absent', value: stats.absent || 0, color: COLORS.absent },
  ].filter(d => d.value > 0);

  const onLeaveEmployees = dailySummary.filter(e => e.status === 'leave');

  const getStatusLabel = (status) => {
    const labels = {
      present: 'Present',
      late: 'Late',
      leave: 'Leave',
      absent: 'Absent',
      half_day: 'Half Day'
    };
    return labels[status] || status;
  };

  const fmtTime = (iso) => {
    if (!iso) return '--:--';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(dailySummary.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = dailySummary.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="adb-analytics-tab">
      <div className="adb-analytics-header">
         <div className="adb-header-controls">
            <div className="adb-date-picker-wrap">
                <FiCalendar className="adb-dp-icon" />
                <input 
                    type="date" 
                    className="adb-date-input" 
                    value={currentDate} 
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => onDateChange(e.target.value)}
                />
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

      <div className="adb-analytics-grid">
        <div className="adb-chart-card">
          <h3 className="adb-card-title">Attendance Distribution</h3>
          <div className="adb-chart-container">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={chartData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="adb-no-chart">No attendance data to visualize</div>
            )}
          </div>
        </div>

        <div className="adb-stats-summary">
            <div className="adb-mini-stats">
                <div className="adb-ms-card">
                    <div className="adb-ms-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: COLORS.present }}><FiUsers /></div>
                    <div className="adb-ms-info">
                        <span className="adb-ms-val">{stats.present || 0}</span>
                        <span className="adb-ms-lbl">Total Present</span>
                    </div>
                </div>
                <div className="adb-ms-card">
                    <div className="adb-ms-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: COLORS.late }}><FiClock /></div>
                    <div className="adb-ms-info">
                        <span className="adb-ms-val">{stats.late || 0}</span>
                        <span className="adb-ms-lbl">Late Arrivals</span>
                    </div>
                </div>
                <div className="adb-ms-card">
                    <div className="adb-ms-icon" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: COLORS.leave }}><FiCalendar /></div>
                    <div className="adb-ms-info">
                        <span className="adb-ms-val">{stats.onLeave || 0}</span>
                        <span className="adb-ms-lbl">On Leave</span>
                    </div>
                </div>
                <div className="adb-ms-card">
                    <div className="adb-ms-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: COLORS.absent }}><FiXCircle /></div>
                    <div className="adb-ms-info">
                        <span className="adb-ms-val">{stats.absent || 0}</span>
                        <span className="adb-ms-lbl">Absent</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="adb-leave-list-card">
            <h3 className="adb-card-title">ON LEAVE</h3>
            <div className="adb-leave-list-scroll">
                {onLeaveEmployees.length > 0 ? (
                    onLeaveEmployees.map(emp => (
                        <div key={emp.id} className="adb-leave-row">
                            <div className="adb-lr-avatar">{emp.name?.charAt(0)}</div>
                            <div className="adb-lr-info">
                                <div className="adb-lr-name">{emp.name}</div>
                                <div className="adb-lr-meta">{emp.department} • {emp.leave?.type || 'Leave'}</div>
                            </div>
                            <div className={`adb-lr-status ${emp.leave?.status}`}>{emp.leave?.status === 'approved' ? 'Approved' : 'Pending'}</div>
                        </div>
                    ))
                ) : (
                    <div className="adb-no-leave">No employees on leave for this date.</div>
                )}
            </div>
        </div>
      </div>

      <div className="adb-summary-table-wrap">
        <div className="adb-table-header">
            <h3 className="adb-card-title">Employee Daily Summary</h3>
            {dailySummary.length > itemsPerPage && (
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
        <table className="adb-summary-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Status</th>
              <th>Details</th>
              <th>In Time</th>
              <th>Out Time</th>
              <th>Late</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr><td colSpan="6" className="adb-td-empty">No employee records found</td></tr>
            ) : paginatedData.map((emp) => (
              <tr key={emp.id} className="analytics-row">
                <td>
                  <div className="adb-td-user">
                    <div className="adb-user-avatar">{emp.name?.charAt(0)}</div>
                    <div className="adb-user-info">
                      <div className="adb-user-name">{emp.name}</div>
                      <div className="adb-user-dept">{emp.department}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`adb-status-pill ${emp.status}`}>
                    {getStatusLabel(emp.status)}
                  </span>
                </td>
                <td>
                  {emp.leave ? (
                    <div className="adb-leave-small">
                      <span className="adb-ls-type">{emp.leave.type}</span>
                      <span className={`adb-ls-status ${emp.leave.status}`}>
                        {emp.leave.status === 'approved' ? 'Approved' : 'Pending'}
                        {emp.leave.stage ? ` (${emp.leave.stage})` : ''}
                      </span>
                    </div>
                  ) : <span className="adb-td-muted">---</span>}
                </td>
                <td>{fmtTime(emp.inTime)}</td>
                <td>{fmtTime(emp.outTime)}</td>
                <td>{emp.lateMinutes > 0 ? <span className="adb-late-warn">{emp.lateMinutes}m</span> : <span className="adb-td-muted">0m</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminAnalyticsTab;
