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

const getAchievementRingCfg = (tag) => {
  if (!tag) return null;
  const t = String(tag).trim();
  const lower = t.toLowerCase();
  if (lower.includes('month') || lower.includes('employee')) {
    return { ring: '0 0 0 2px #f59e0b, 0 0 8px rgba(245, 158, 11, 0.45)', icon: '🌟', color: '#b45309', bg: '#fef3c7', border: '#fcd34d' };
  }
  if (lower.includes('qc') || lower.includes('inspector') || lower.includes('quality')) {
    return { ring: '0 0 0 2px #0284c7, 0 0 8px rgba(2, 132, 199, 0.45)', icon: '🔍', color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd' };
  }
  if (lower.includes('5s') || lower.includes('zone') || lower.includes('clean')) {
    return { ring: '0 0 0 2px #059669, 0 0 8px rgba(5, 150, 105, 0.45)', icon: '🏆', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' };
  }
  if (lower.includes('operator') || lower.includes('machine') || lower.includes('tech')) {
    return { ring: '0 0 0 2px #4f46e5, 0 0 8px rgba(79, 70, 229, 0.45)', icon: '⚙️', color: '#4338ca', bg: '#eef2ff', border: '#c7d2fe' };
  }
  return { ring: '0 0 0 2px #d97706, 0 0 8px rgba(217, 119, 6, 0.45)', icon: '🎖️', color: '#b45309', bg: '#fffbeb', border: '#fde68a' };
};

const AdminAnalyticsTab = ({ data, loading, currentDate, endDate, onDateChange, onEndDateChange, companies = [], selectedCompanyId, onCompanyChange, isHOD = false, isAdmin = false }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const [groupBy, setGroupBy] = useState('none');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [shiftFilter, setShiftFilter] = useState('all');

  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: 'present',
  });

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [localTags, setLocalTags] = useState({});
  const [tagModalTarget, setTagModalTarget] = useState(null);
  const [selectedTag, setSelectedTag] = useState('');
  const [customTagInput, setCustomTagInput] = useState('');
  const [savingTag, setSavingTag] = useState(false);

  useEffect(() => {
    setCurrentPage(1);
    setStatusFilter('all');
    setCategoryFilter('all');
    setShiftFilter('all');
  }, [data]);

  const openModal = (type) => {
    setModalConfig({
      isOpen: true,
      type
    });
  };

  const handleOpenTagModal = (emp, e) => {
    if (e) e.stopPropagation();
    setTagModalTarget(emp);
    const currentTag = emp.achievement_tag || '';
    const presetLabels = [
      'Best Employee of the Month',
      'Best QC Inspector',
      'Best 5s Zone',
      'Best Operator',
      'Star Performer',
      'Best Team Player',
      'Punctuality Champion'
    ];
    if (presetLabels.includes(currentTag)) {
      setSelectedTag(currentTag);
      setCustomTagInput('');
    } else {
      setSelectedTag('');
      setCustomTagInput(currentTag);
    }
  };

  const handleSaveAchievementTag = async (tagValue) => {
    if (!tagModalTarget || !tagModalTarget.id) return;
    setSavingTag(true);
    try {
      await attendanceAPI.setAchievementTag({
        employee_id: tagModalTarget.id,
        achievement_tag: tagValue || null
      });
      setLocalTags(prev => ({
        ...prev,
        [tagModalTarget.id]: tagValue || null
      }));
      toast.success(tagValue ? `Assigned "${tagValue}" to ${tagModalTarget.name}` : `Achievement tag removed for ${tagModalTarget.name}`);
      setTagModalTarget(null);
    } catch (err) {
      toast.error(err?.message || 'Failed to update achievement tag');
    } finally {
      setSavingTag(false);
    }
  };
  // Early returns are moved below React hooks to satisfy rules of hooks

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
      shiftName: emp?.shiftName || emp?.shift_id?.shift_name || emp?.shift_name || null,
      leave: emp?.leave || null,
      category: emp?.category || 'Management',
      achievement_tag: localTags[originalId] !== undefined ? localTags[originalId] : (emp?.achievement_tag || emp?.employee?.achievement_tag || emp?.employee_id?.achievement_tag || null)
    };
  });

  const categoriesList = React.useMemo(() => {
    const s = new Set();
    dailySummary.forEach(e => {
      if (e.category) s.add(e.category);
    });
    return Array.from(s).sort();
  }, [dailySummary]);

  const shiftsList = React.useMemo(() => {
    const s = new Set();
    dailySummary.forEach(e => {
      if (e.shiftName) s.add(e.shiftName);
    });
    return Array.from(s).sort();
  }, [dailySummary]);

  const categoryShiftFilteredSummary = React.useMemo(() => {
    return dailySummary.filter(e => {
      const matchesCategory = categoryFilter === 'all' || String(e.category || '').toLowerCase() === categoryFilter.toLowerCase();
      const matchesShift = shiftFilter === 'all' || String(e.shiftName || '').toLowerCase() === shiftFilter.toLowerCase();
      return matchesCategory && matchesShift;
    });
  }, [dailySummary, categoryFilter, shiftFilter]);

  const onLeaveList = categoryShiftFilteredSummary.filter(e => ['leave', 'pending_leave'].includes(e.status));
  const presentList = categoryShiftFilteredSummary.filter(e => ['present', 'late', 'half_day'].includes(e.status));
  const absentList = categoryShiftFilteredSummary.filter(e => e.status === 'absent');

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
    ? categoryShiftFilteredSummary
    : categoryShiftFilteredSummary.filter(e => {
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

  if (loading) return (
    <div className="adb-analytics-loading">
        <div className="adb-loader"></div>
        <span>Fetching detailed company summary...</span>
    </div>
  );
  if (!data) return <div className="adb-empty">No data available for the selected date.</div>;

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

            <div className="adb-company-filter-wrap">
              <FiFilter className="adb-dp-icon" />
              <select
                className="adb-company-select"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Categories</option>
                {categoriesList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="adb-company-filter-wrap">
              <FiClock className="adb-dp-icon" />
              <select
                className="adb-company-select"
                value={shiftFilter}
                onChange={(e) => {
                  setShiftFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Shifts</option>
                {shiftsList.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
         </div>
      </div>

      <div className="adb-analytics-grid">
        <div 
          className="adb-ms-card clickable" 
          onClick={() => {
            setStatusFilter(statusFilter === 'present' ? 'all' : 'present');
            setCurrentPage(1);
          }}
          style={{
            borderColor: statusFilter === 'present' ? COLORS.present : 'var(--border)',
            boxShadow: statusFilter === 'present' ? `0 0 0 2px ${COLORS.present}33` : 'var(--shadow-sm)'
          }}
        >
            <div className="adb-ms-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: COLORS.present }}><FiUsers /></div>
            <div className="adb-ms-info">
                <span className="adb-ms-val">{stats.present}</span>
                <span className="adb-ms-lbl">Total Present</span>
            </div>
        </div>

        <div 
          className="adb-ms-card clickable" 
          onClick={() => {
            setStatusFilter(statusFilter === 'leave' ? 'all' : 'leave');
            setCurrentPage(1);
          }}
          style={{
            borderColor: statusFilter === 'leave' ? COLORS.leave : 'var(--border)',
            boxShadow: statusFilter === 'leave' ? `0 0 0 2px ${COLORS.leave}33` : 'var(--shadow-sm)'
          }}
        >
            <div className="adb-ms-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: COLORS.leave }}><FiCalendar /></div>
            <div className="adb-ms-info">
                <span className="adb-ms-val">{stats.onLeave}</span>
                <span className="adb-ms-lbl">On Leave</span>
            </div>
        </div>
        <div 
          className="adb-ms-card clickable" 
          onClick={() => {
            setStatusFilter(statusFilter === 'absent' ? 'all' : 'absent');
            setCurrentPage(1);
          }}
          style={{
            borderColor: statusFilter === 'absent' ? COLORS.absent : 'var(--border)',
            boxShadow: statusFilter === 'absent' ? `0 0 0 2px ${COLORS.absent}33` : 'var(--shadow-sm)'
          }}
        >
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
              <h3 className="adb-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <FiUsers /> 
                <span>
                  {
                    statusFilter === 'present' ? 'Total Present' :
                    statusFilter === 'leave' ? 'On Leave' :
                    statusFilter === 'absent' ? 'Absent' :
                    'Employee Daily Summary'
                  }
                </span>
                {(categoryFilter !== 'all' || shiftFilter !== 'all') && (
                  <span style={{ fontSize: '11px', fontWeight: '500', background: 'var(--surface2)', padding: '2px 8px', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--ink2)', marginLeft: '8px' }}>
                    {categoryFilter !== 'all' && `Category: ${categoryFilter}`}
                    {categoryFilter !== 'all' && shiftFilter !== 'all' && ' • '}
                    {shiftFilter !== 'all' && `Shift: ${shiftFilter}`}
                  </span>
                )}
              </h3>
              <div className="adb-table-header-actions">
                {groupBy === 'none' && filteredDailySummary.length > itemsPerPage && (
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
                const achCfg = getAchievementRingCfg(emp.achievement_tag || emp.employee?.achievement_tag);
                return (
                <tr key={emp.id} className="analytics-row clickable" onClick={() => setSelectedEmployee(emp)} style={{ cursor: 'pointer' }}>
                  <td>
                  <div className="adb-td-user">
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div
                        className="adb-user-avatar"
                        style={{
                          boxShadow: achCfg ? achCfg.ring : 'none',
                          border: achCfg ? '1.5px solid #fff' : 'none'
                        }}
                      >
                        {emp.name?.split(' ').map(n => n.charAt(0)).join('').slice(0, 2).toUpperCase()}
                      </div>
                      {achCfg && (
                        <span
                          title={emp.achievement_tag || emp.employee?.achievement_tag}
                          style={{ position: 'absolute', bottom: -2, right: -2, fontSize: '10px', lineHeight: 1 }}
                        >
                          {achCfg.icon}
                        </span>
                      )}
                    </div>
                    <div className="adb-user-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <div className="adb-user-name">{emp.name}</div>
                        {achCfg ? (
                          <span 
                            onClick={(e) => (isAdmin || isHOD) && handleOpenTagModal(emp, e)}
                            title={(isAdmin || isHOD) ? "Click to change/manage achievement tag" : (emp.achievement_tag || emp.employee?.achievement_tag)}
                            style={{
                              fontSize: '9.5px',
                              fontWeight: '700',
                              color: achCfg.color,
                              background: achCfg.bg || '#fef3c7',
                              padding: '1.5px 6px',
                              borderRadius: '6px',
                              border: `1px solid ${achCfg.border || '#fcd34d'}`,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              cursor: (isAdmin || isHOD) ? 'pointer' : 'default',
                              transition: 'all 0.15s'
                            }}
                          >
                            {achCfg.icon} {emp.achievement_tag || emp.employee?.achievement_tag}
                            {(isAdmin || isHOD) && <span style={{ opacity: 0.6, fontSize: '8px', marginLeft: '2px' }}>✏️</span>}
                          </span>
                        ) : ((isAdmin || isHOD) && (
                          <button
                            type="button"
                            onClick={(e) => handleOpenTagModal(emp, e)}
                            title="Assign Achievement Tag"
                            style={{
                              border: '1px dashed #cbd5e1',
                              background: 'transparent',
                              borderRadius: '6px',
                              padding: '1px 6px',
                              fontSize: '9.5px',
                              color: '#64748b',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.borderColor = '#f59e0b';
                              e.currentTarget.style.color = '#d97706';
                              e.currentTarget.style.background = '#fffbeb';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.borderColor = '#cbd5e1';
                              e.currentTarget.style.color = '#64748b';
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <span>✨</span>
                            <span>Tag</span>
                          </button>
                        ))}
                      </div>
                      {emp.shiftName && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{emp.shiftName}</div>}
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
                const achCfg = getAchievementRingCfg(emp.achievement_tag || emp.employee?.achievement_tag);
                rows.push(
                  <tr key={emp.id} className="analytics-row clickable" onClick={() => setSelectedEmployee(emp)} style={{ cursor: 'pointer' }}>
                    <td>
                    <div className="adb-td-user">
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div
                          className="adb-user-avatar"
                          style={{
                            boxShadow: achCfg ? achCfg.ring : 'none',
                            border: achCfg ? '1.5px solid #fff' : 'none'
                          }}
                        >
                          {emp.name?.split(' ').map(n => n.charAt(0)).join('').slice(0, 2).toUpperCase()}
                        </div>
                        {achCfg && (
                          <span
                            title={emp.achievement_tag || emp.employee?.achievement_tag}
                            style={{ position: 'absolute', bottom: -2, right: -2, fontSize: '10px', lineHeight: 1 }}
                          >
                            {achCfg.icon}
                          </span>
                        )}
                      </div>
                      <div className="adb-user-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <div className="adb-user-name">{emp.name}</div>
                          {achCfg ? (
                            <span 
                              onClick={(e) => (isAdmin || isHOD) && handleOpenTagModal(emp, e)}
                              title={(isAdmin || isHOD) ? "Click to change/manage achievement tag" : (emp.achievement_tag || emp.employee?.achievement_tag)}
                              style={{
                                fontSize: '9.5px',
                                fontWeight: '700',
                                color: achCfg.color,
                                background: achCfg.bg || '#fef3c7',
                                padding: '1.5px 6px',
                                borderRadius: '6px',
                                border: `1px solid ${achCfg.border || '#fcd34d'}`,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                cursor: (isAdmin || isHOD) ? 'pointer' : 'default',
                                transition: 'all 0.15s'
                              }}
                            >
                              {achCfg.icon} {emp.achievement_tag || emp.employee?.achievement_tag}
                              {(isAdmin || isHOD) && <span style={{ opacity: 0.6, fontSize: '8px', marginLeft: '2px' }}>✏️</span>}
                            </span>
                          ) : ((isAdmin || isHOD) && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenTagModal(emp, e)}
                              title="Assign Achievement Tag"
                              style={{
                                border: '1px dashed #cbd5e1',
                                background: 'transparent',
                                borderRadius: '6px',
                                padding: '1px 6px',
                                fontSize: '9.5px',
                                color: '#64748b',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                                transition: 'all 0.15s'
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.borderColor = '#f59e0b';
                                e.currentTarget.style.color = '#d97706';
                                e.currentTarget.style.background = '#fffbeb';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.borderColor = '#cbd5e1';
                                e.currentTarget.style.color = '#64748b';
                                e.currentTarget.style.background = 'transparent';
                              }}
                            >
                              <span>✨</span>
                              <span>Tag</span>
                            </button>
                          ))}
                        </div>
                        {emp.shiftName && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>{emp.shiftName}</div>}
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

      {/* Achievement Tag Assignment / Creation Modal for HOD & Admin */}
      {tagModalTarget && (
        <div 
          className="adb-tag-modal-overlay" 
          onClick={() => setTagModalTarget(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(6px)',
            zIndex: 100000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div 
            className="adb-tag-modal-card" 
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              animation: 'tagModalPop 0.25s ease-out'
            }}
          >
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>🌟</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>
                    Assign Achievement Tag
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                    {tagModalTarget.name} • {tagModalTarget.department || tagModalTarget.organization}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setTagModalTarget(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Popular Preset Tags
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {[
                    { label: 'Best Employee of the Month', icon: '🌟' },
                    { label: 'Best QC Inspector', icon: '🔍' },
                    { label: 'Best 5s Zone', icon: '🏆' },
                    { label: 'Best Operator', icon: '⚙️' },
                    { label: 'Star Performer', icon: '⭐' },
                    { label: 'Best Team Player', icon: '🤝' },
                    { label: 'Punctuality Champion', icon: '⏱️' }
                  ].map(preset => {
                    const isSelected = selectedTag === preset.label;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setSelectedTag(preset.label);
                          setCustomTagInput('');
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid #d97706' : '1px solid #e2e8f0',
                          background: isSelected ? '#fffbeb' : '#f8fafc',
                          color: isSelected ? '#b45309' : '#334155',
                          fontSize: '12px',
                          fontWeight: isSelected ? '800' : '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.15s'
                        }}
                      >
                        <span>{preset.icon}</span>
                        <span>{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Or Create / Type Custom Tag
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kaizen Champion, Safe Operator, Zero Error Hero..."
                  value={customTagInput}
                  onChange={e => {
                    setCustomTagInput(e.target.value);
                    if (e.target.value) setSelectedTag('');
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13.5px',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{
              padding: '16px 24px',
              background: '#f8fafc',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px'
            }}>
              {tagModalTarget.achievement_tag ? (
                <button
                  type="button"
                  onClick={() => handleSaveAchievementTag('')}
                  disabled={savingTag}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #fca5a5',
                    background: '#fef2f2',
                    color: '#dc2626',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Remove Current Tag
                </button>
              ) : <div />}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setTagModalTarget(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingTag || (!selectedTag && !customTagInput.trim())}
                  onClick={() => handleSaveAchievementTag(customTagInput.trim() || selectedTag)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(217, 119, 6, 0.3)',
                    opacity: (!selectedTag && !customTagInput.trim()) ? 0.6 : 1
                  }}
                >
                  {savingTag ? 'Saving...' : '✨ Save & Award Tag'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnalyticsTab;
