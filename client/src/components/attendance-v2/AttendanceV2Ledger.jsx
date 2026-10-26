import React, { useState, useEffect, useMemo } from 'react';
import {
  FiArrowLeft, FiChevronLeft, FiChevronRight, FiCalendar, FiClock, FiAlertCircle,
  FiList, FiX, FiFileText, FiEdit3, FiTrendingUp
} from 'react-icons/fi';
import attendanceV2API from '../../api/attendance/attendanceV2.api';

const normalizeDateKey = (val) => {
  if (!val) return '';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.includes('T')) return trimmed.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  }
  const d = new Date(val);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return '';
};

const formatTimeOnly = (val) => {
  if (!val) return '-';
  if (typeof val === 'string') {
    const s = val.trim();
    if (/^(0?[1-9]|1[0-2]):[0-5][0-9](:[0-5][0-9])?\s*(AM|PM)$/i.test(s)) {
      return s.replace(/:00\s*(AM|PM)/i, ' $1');
    }
    if (/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(s)) {
      const parts = s.split(':');
      const h = Number(parts[0]);
      const m = Number(parts[1]);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
    }
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return typeof val === 'string' ? val : '-';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatMins = (mins) => {
  const safeMins = Math.max(0, Math.round(Number(mins) || 0));
  const h = Math.floor(safeMins / 60);
  const m = safeMins % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
};

const getStatusCategory = (status) => {
  const s = String(status || '').toUpperCase().trim();
  if (s === 'PRESENT') return 'present';
  if (s === 'ABSENT') return 'absent';
  if (s === 'HALF_DAY' || s === 'HALFDAY') return 'half-day';
  if (s === 'ON_LEAVE' || s === 'LEAVE') return 'leave';
  if (s === 'MISSED_PUNCH' || s === 'MISSED' || s === 'INCOMPLETE') return 'missed';
  if (s === 'WEEKLY_OFF' || s === 'WEEKEND' || s === 'WEEKLY OFF') return 'weekend';
  if (s === 'HOLIDAY') return 'holiday';
  return 'default';
};

const AttendanceV2Ledger = ({ onRequestCorrection, onApplyLeave, defaultView = 'table', title, onBack }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState(defaultView); // 'table' | 'calendar'
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    if (defaultView) {
      setViewMode(defaultView);
    }
  }, [defaultView]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const fetchDays = async () => {
    setLoading(true);
    setError(null);
    try {
      const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const toDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const res = await attendanceV2API.getDays({ from_date: fromDate, to_date: toDate });
      const rawList = Array.isArray(res)
        ? res
        : Array.isArray(res?.days)
        ? res.days
        : Array.isArray(res?.attendance_days)
        ? res.attendance_days
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.items)
        ? res.items
        : Array.isArray(res?.records)
        ? res.records
        : [];

      const normalized = rawList.map((d) => {
        const rawDate = d.work_date || d.attendance_date_str || d.attendance_date || d.date;
        const workDate = normalizeDateKey(rawDate);
        return {
          ...d,
          work_date: workDate,
          status: String(d.status || 'ABSENT').toUpperCase(),
          first_punch_in: d.first_punch_in || d.first_in || d.in_time || d.punch_in_time || null,
          last_punch_out: d.last_punch_out || d.last_out || d.out_time || d.punch_out_time || null,
          effective_minutes: d.effective_minutes ?? (d.net_work_hours ? Math.round(d.net_work_hours * 60) : d.total_work_hours ? Math.round(d.total_work_hours * 60) : (d.work_minutes || 0)),
          late_by_minutes: d.late_by_minutes ?? (d.is_late ? (d.late_minutes || 0) : 0),
          ot_minutes: d.ot_minutes ?? (d.overtime_minutes || (d.overtime_hours ? Math.round(d.overtime_hours * 60) : 0)),
        };
      });

      setDays(normalized);
    } catch (err) {
      console.error('Failed to fetch attendance days:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load attendance days');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDays();
  }, [year, month]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const handleCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  // Compute month summary statistics
  const summary = useMemo(() => {
    return days.reduce(
      (acc, day) => {
        acc.total++;
        const s = String(day.status || '').toUpperCase();
        if (s === 'PRESENT') acc.present++;
        else if (s === 'ABSENT') acc.absent++;
        else if (s === 'HALF_DAY' || s === 'HALFDAY') acc.halfDay++;
        else if (s === 'ON_LEAVE' || s === 'LEAVE') acc.leave++;

        const lateMins = day.late_by_minutes || 0;
        if (lateMins > 0) acc.late++;
        acc.totalMinutes += day.effective_minutes || 0;
        acc.totalOtMinutes += day.ot_minutes || 0;
        return acc;
      },
      { total: 0, present: 0, absent: 0, halfDay: 0, leave: 0, late: 0, totalMinutes: 0, totalOtMinutes: 0 }
    );
  }, [days]);

  const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const isCurrentMonth = new Date().getFullYear() === year && new Date().getMonth() + 1 === month;

  // Calendar calculations
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0 (Sun) to 6 (Sat)
  const daysInCurrentMonth = new Date(year, month, 0).getDate();
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

  const dayRecordMap = useMemo(() => {
    const map = new Map();
    for (const d of days) {
      const rawDate = d.work_date || d.attendance_date_str || d.attendance_date || d.date;
      const key = normalizeDateKey(rawDate);
      if (key) {
        map.set(key, d);
      }
    }
    return map;
  }, [days]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const calendarCells = useMemo(() => {
    const cells = [];

    // Trailing days from previous month
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const prevDayNum = daysInPrevMonth - i;
      const prevDate = new Date(year, month - 2, prevDayNum);
      const dStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDayNum).padStart(2, '0')}`;
      cells.push({
        dateStr: dStr,
        dayNum: prevDayNum,
        isCurrentMonth: false,
        record: dayRecordMap.get(dStr) || null,
        dayOfWeek: prevDate.getDay(),
      });
    }

    // Days in current month
    for (let dayNum = 1; dayNum <= daysInCurrentMonth; dayNum++) {
      const dStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dObj = new Date(year, month - 1, dayNum);
      cells.push({
        dateStr: dStr,
        dayNum,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        record: dayRecordMap.get(dStr) || null,
        dayOfWeek: dObj.getDay(),
      });
    }

    // Leading days of next month to complete the last week row
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= remaining; dayNum++) {
      const nextDate = new Date(year, month, dayNum);
      const dStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({
        dateStr: dStr,
        dayNum,
        isCurrentMonth: false,
        record: dayRecordMap.get(dStr) || null,
        dayOfWeek: nextDate.getDay(),
      });
    }

    return cells;
  }, [year, month, firstDayOfMonth, daysInCurrentMonth, daysInPrevMonth, dayRecordMap, todayStr]);

  const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="att-v2-card">
      <div className="att-v2-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button
              type="button"
              className="att-v2-btn-back-overview"
              onClick={onBack}
              title="Back to Overview"
            >
              <FiArrowLeft size={14} />
              <span>Back to Overview</span>
            </button>
          )}
          <h3 style={{ margin: 0 }}>
            {viewMode === 'calendar' ? <FiCalendar className="text-primary" /> : <FiList className="text-primary" />}
            <span>{title || (viewMode === 'calendar' ? 'Monthly Attendance Calendar' : 'Monthly Attendance Ledger')}</span>
          </h3>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Segmented View Switcher */}
          <div className="att-v2-view-toggle">
            <button
              type="button"
              className={`att-v2-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
            >
              <FiList size={14} />
              <span>Table</span>
            </button>
            <button
              type="button"
              className={`att-v2-toggle-btn ${viewMode === 'calendar' ? 'active' : ''}`}
              onClick={() => setViewMode('calendar')}
            >
              <FiCalendar size={14} />
              <span>Calendar</span>
            </button>
          </div>

          {/* Sleek Month Navigator */}
          <div className="att-v2-month-nav">
            <button className="att-v2-month-nav-btn" onClick={handlePrevMonth} title="Previous Month">
              <FiChevronLeft size={16} />
            </button>
            <span className="att-v2-month-title">{monthLabel}</span>
            <button className="att-v2-month-nav-btn" onClick={handleNextMonth} title="Next Month">
              <FiChevronRight size={16} />
            </button>
            {!isCurrentMonth && (
              <button
                type="button"
                onClick={handleCurrentMonth}
                style={{
                  background: 'var(--att-primary-subtle)',
                  color: 'var(--att-primary)',
                  border: '1px solid var(--att-primary-border)',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  marginLeft: '4px',
                }}
              >
                Today
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Summary Statistics Strip */}
      <div className="att-v2-summary-strip">
        <div className="att-v2-summary-chip present">
          <span className="att-v2-legend-dot present" />
          <span>Present: <strong>{summary.present}</strong></span>
        </div>
        <div className="att-v2-summary-chip late">
          <span className="att-v2-legend-dot half-day" />
          <span>Half Day: <strong>{summary.halfDay}</strong></span>
        </div>
        <div className="att-v2-summary-chip late">
          <span style={{ color: '#ea580c', fontWeight: 800 }}>!</span>
          <span>Late: <strong>{summary.late}</strong></span>
        </div>
        <div className="att-v2-summary-chip leave">
          <span className="att-v2-legend-dot leave" />
          <span>Leave: <strong>{summary.leave}</strong></span>
        </div>
        <div className="att-v2-summary-chip absent">
          <span className="att-v2-legend-dot absent" />
          <span>Absent: <strong>{summary.absent}</strong></span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div className="att-v2-summary-chip" style={{ borderColor: 'var(--att-primary-border)', color: 'var(--att-primary)' }}>
            <FiClock size={13} />
            <span>Total Hours: <strong>{formatMins(summary.totalMinutes)}</strong></span>
          </div>
          {summary.totalOtMinutes > 0 && (
            <div className="att-v2-summary-chip" style={{ borderColor: 'var(--att-success-border)', color: 'var(--att-success-text)' }}>
              <FiTrendingUp size={13} />
              <span>Overtime: <strong>{formatMins(summary.totalOtMinutes)}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{ padding: '14px 18px', background: '#fef2f2', border: '1px solid #fecdd3', borderRadius: '10px', color: '#991b1b', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiAlertCircle size={18} />
            <span>{error}</span>
          </div>
          <button className="att-v2-btn-secondary" onClick={fetchDays} style={{ background: '#ffffff', color: '#b91c1c', padding: '6px 12px', fontSize: '12px' }}>
            Retry
          </button>
        </div>
      )}

      {/* VIEW 1: CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="att-v2-calendar-container">
          {/* Calendar Status Legend */}
          <div className="att-v2-calendar-legend">
            <div className="att-v2-legend-item">
              <span className="att-v2-legend-dot present" />
              <span>Present</span>
            </div>
            <div className="att-v2-legend-item">
              <span className="att-v2-legend-dot absent" />
              <span>Absent</span>
            </div>
            <div className="att-v2-legend-item">
              <span className="att-v2-legend-dot half-day" />
              <span>Half Day</span>
            </div>
            <div className="att-v2-legend-item">
              <span className="att-v2-legend-dot leave" />
              <span>On Leave</span>
            </div>
            <div className="att-v2-legend-item">
              <span className="att-v2-legend-dot missed" />
              <span>Missed Punch</span>
            </div>
            <div className="att-v2-legend-item">
              <span className="att-v2-legend-dot off" />
              <span>Weekend / Holiday</span>
            </div>
          </div>

          {/* Weekday Column Headers */}
          <div className="att-v2-cal-header-row">
            {weekDayNames.map((d, idx) => (
              <div key={d} className={`att-v2-cal-header-cell ${idx === 0 || idx === 6 ? 'weekend' : ''}`}>
                {d}
              </div>
            ))}
          </div>

          {/* Month Day Grid */}
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              <FiClock size={28} className="spinning" style={{ color: 'var(--att-primary)', marginBottom: '8px' }} />
              <div>Loading calendar view...</div>
            </div>
          ) : (
            <div className="att-v2-cal-grid">
              {calendarCells.map((cell, idx) => {
                const rec = cell.record;
                const statusCat = rec ? getStatusCategory(rec.status) : (cell.dayOfWeek === 0 || cell.dayOfWeek === 6 ? 'weekend' : 'default');
                const isWeekend = cell.dayOfWeek === 0 || cell.dayOfWeek === 6;

                return (
                  <div
                    key={`${cell.dateStr}-${idx}`}
                    className={`att-v2-cal-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${cell.isToday ? 'today' : ''} status-${statusCat}`}
                    onClick={() => cell.isCurrentMonth && setSelectedDay(cell)}
                  >
                    {/* Top Row: Date & Status Badge */}
                    <div className="att-v2-cal-top">
                      <span className="att-v2-cal-day-num">{cell.dayNum}</span>
                      {cell.isToday && <span className="att-v2-cal-today-pill">Today</span>}
                      {rec && rec.status && (
                        <span className={`att-v2-cal-badge ${statusCat}`}>
                          {rec.status.replace('_', ' ')}
                        </span>
                      )}
                      {!rec && cell.isCurrentMonth && isWeekend && (
                        <span className="att-v2-cal-badge weekend">Off</span>
                      )}
                    </div>

                    {/* Middle: Punches & Working Hours */}
                    {cell.isCurrentMonth && rec && (
                      <div className="att-v2-cal-body">
                        {(rec.first_punch_in || rec.last_punch_out) && (
                          <div className="att-v2-cal-time-row">
                            <span>In: <strong>{formatTimeOnly(rec.first_punch_in)}</strong></span>
                            <span>Out: <strong>{formatTimeOnly(rec.last_punch_out)}</strong></span>
                          </div>
                        )}
                        {rec.effective_minutes > 0 && (
                          <div className="att-v2-cal-hours">
                            {formatMins(rec.effective_minutes)}
                          </div>
                        )}
                        <div className="att-v2-cal-tags">
                          {rec.late_by_minutes > 0 && (
                            <span className="att-v2-cal-tag late">+{rec.late_by_minutes}m Late</span>
                          )}
                          {rec.ot_minutes > 0 && (
                            <span className="att-v2-cal-tag ot">+{formatMins(rec.ot_minutes)} OT</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Bottom Action for Regularization */}
                    {cell.isCurrentMonth && rec && (rec.status === 'ABSENT' || rec.status === 'MISSED_PUNCH' || rec.late_by_minutes > 0) && (
                      <div className="att-v2-cal-footer">
                        <button
                          type="button"
                          className="att-v2-cal-btn-regularize"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRequestCorrection && onRequestCorrection(cell.dateStr);
                          }}
                        >
                          Regularize
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="att-v2-table-wrapper">
          <table className="att-v2-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Status</th>
                <th>First In</th>
                <th>Last Out</th>
                <th>Work Hours</th>
                <th>Late Arrival</th>
                <th>Overtime</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <FiClock size={24} className="spinning" style={{ color: 'var(--att-primary)', marginBottom: '8px' }} />
                    <div>Loading attendance ledger...</div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#ef4444' }}>
                    <div>{error}</div>
                    <button
                      className="att-v2-btn-secondary"
                      onClick={fetchDays}
                      style={{ marginTop: '10px' }}
                    >
                      Retry Loading Ledger
                    </button>
                  </td>
                </tr>
              ) : days.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No attendance records found for {monthLabel}.
                  </td>
                </tr>
              ) : (
                days.map((row) => {
                  const [y, m, d] = (row.work_date || '').split('-').map(Number);
                  const dateObj = y && m && d ? new Date(y, m - 1, d) : new Date(row.work_date);
                  const dayName = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });

                  return (
                    <tr
                      key={row.id || row.work_date}
                      onClick={() => setSelectedDay({ dateStr: row.work_date, record: row, dayOfWeek: isNaN(dateObj.getTime()) ? 0 : dateObj.getDay() })}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontWeight: 600 }}>
                        {row.work_date}{' '}
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>({dayName})</span>
                      </td>
                      <td>
                        <span className={`att-v2-status-pill ${row.status}`}>
                          {row.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td>{formatTimeOnly(row.first_punch_in)}</td>
                      <td>{formatTimeOnly(row.last_punch_out)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--att-text)' }}>{formatMins(row.effective_minutes)}</td>
                      <td style={{ color: row.late_by_minutes > 0 ? '#ea580c' : '#64748b', fontWeight: row.late_by_minutes > 0 ? 700 : 500 }}>
                        {row.late_by_minutes > 0 ? `+${row.late_by_minutes}m` : '-'}
                      </td>
                      <td style={{ color: row.ot_minutes > 0 ? '#16a34a' : '#64748b', fontWeight: row.ot_minutes > 0 ? 700 : 500 }}>
                        {row.ot_minutes > 0 ? formatMins(row.ot_minutes) : '-'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {(row.status === 'ABSENT' || row.status === 'MISSED_PUNCH' || row.late_by_minutes > 0) && (
                          <button
                            type="button"
                            className="att-v2-btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onRequestCorrection && onRequestCorrection(row.work_date);
                            }}
                          >
                            Regularize
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Selected Day Quick Inspection Modal */}
      {selectedDay && (
        <div className="att-v2-modal-overlay" onClick={() => setSelectedDay(null)}>
          <div className="att-v2-modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="att-v2-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiCalendar className="text-primary" size={18} />
                <h3 style={{ margin: 0, fontSize: '17px' }}>
                  {new Date(selectedDay.dateStr).toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </h3>
              </div>
              <button className="att-v2-modal-close" onClick={() => setSelectedDay(null)}>
                <FiX size={18} />
              </button>
            </div>

            <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--att-text-muted)', fontSize: '13px' }}>Status</span>
                <span className={`att-v2-status-pill ${selectedDay.record?.status || 'WEEKEND'}`}>
                  {selectedDay.record?.status?.replace('_', ' ') || (selectedDay.dayOfWeek === 0 || selectedDay.dayOfWeek === 6 ? 'Weekly Off' : 'No Record')}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="att-v2-stat-box">
                  <div className="att-v2-stat-label">Punch In</div>
                  <div className="att-v2-stat-val" style={{ fontSize: '16px' }}>
                    {formatTimeOnly(selectedDay.record?.first_punch_in)}
                  </div>
                </div>
                <div className="att-v2-stat-box">
                  <div className="att-v2-stat-label">Punch Out</div>
                  <div className="att-v2-stat-val" style={{ fontSize: '16px' }}>
                    {formatTimeOnly(selectedDay.record?.last_punch_out)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px' }}>
                <span>Effective Work Time</span>
                <strong style={{ color: '#0f172a' }}>{formatMins(selectedDay.record?.effective_minutes)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px' }}>
                <span>Late Arrival</span>
                <strong style={{ color: selectedDay.record?.late_by_minutes > 0 ? '#ea580c' : '#64748b' }}>
                  {selectedDay.record?.late_by_minutes > 0 ? `+${selectedDay.record.late_by_minutes} mins` : 'On Time'}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px', fontSize: '13px' }}>
                <span>Overtime</span>
                <strong style={{ color: selectedDay.record?.ot_minutes > 0 ? '#16a34a' : '#64748b' }}>
                  {selectedDay.record?.ot_minutes > 0 ? formatMins(selectedDay.record.ot_minutes) : 'None'}
                </strong>
              </div>
            </div>

            <div className="att-v2-modal-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button
                type="button"
                className="att-v2-btn-secondary"
                onClick={() => setSelectedDay(null)}
              >
                Close
              </button>

              <button
                type="button"
                className="att-v2-btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#f5f3ff',
                  color: '#6d28d9',
                  borderColor: '#ddd6fe',
                  fontWeight: 600,
                  fontSize: '13px',
                  padding: '8px 14px',
                }}
                onClick={() => {
                  const dStr = selectedDay.dateStr;
                  setSelectedDay(null);
                  onApplyLeave && onApplyLeave(dStr);
                }}
                title="Apply leave for this date"
              >
                <FiFileText size={15} />
                <span>Apply Leave</span>
              </button>

              <button
                type="button"
                className="att-v2-btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '13px',
                  padding: '8px 14px',
                }}
                onClick={() => {
                  const dStr = selectedDay.dateStr;
                  setSelectedDay(null);
                  onRequestCorrection && onRequestCorrection(dStr);
                }}
                title="Apply attendance correction / regularization for this date"
              >
                <FiEdit3 size={15} />
                <span>Apply Correction</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceV2Ledger;
