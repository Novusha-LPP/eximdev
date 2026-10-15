import React, { useState, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight, FiCalendar, FiClock, FiAlertCircle } from 'react-icons/fi';
import attendanceV2API from '../../api/attendance/attendanceV2.api';

const formatTimeOnly = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d)) return '-';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatMins = (mins) => {
  if (!mins) return '0h 00m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
};

const AttendanceV2Ledger = ({ onRequestCorrection }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const fetchDays = async () => {
    setLoading(true);
    try {
      const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
      // Last day of month
      const lastDay = new Date(year, month, 0).getDate();
      const toDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const res = await attendanceV2API.getDays({ from_date: fromDate, to_date: toDate });
      setDays(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to fetch attendance days:', err);
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
  const summary = days.reduce(
    (acc, day) => {
      acc.total++;
      if (day.status === 'PRESENT') acc.present++;
      else if (day.status === 'ABSENT') acc.absent++;
      else if (day.status === 'HALF_DAY') acc.halfDay++;
      else if (day.status === 'ON_LEAVE') acc.leave++;

      if (day.late_by_minutes > 0) acc.late++;
      acc.totalMinutes += day.effective_minutes || 0;
      acc.totalOtMinutes += day.ot_minutes || 0;
      return acc;
    },
    { total: 0, present: 0, absent: 0, halfDay: 0, leave: 0, late: 0, totalMinutes: 0, totalOtMinutes: 0 }
  );

  const monthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="att-v2-card">
      <div className="att-v2-card-header">
        <h3>
          <FiCalendar className="text-primary" />
          <span>Monthly Attendance Ledger</span>
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="att-v2-btn-secondary" onClick={handlePrevMonth} title="Previous Month">
            <FiChevronLeft />
          </button>
          <button className="att-v2-btn-secondary" onClick={handleCurrentMonth} style={{ fontWeight: 700 }}>
            {monthLabel}
          </button>
          <button className="att-v2-btn-secondary" onClick={handleNextMonth} title="Next Month">
            <FiChevronRight />
          </button>
        </div>
      </div>

      {/* Monthly Summary Statistics Strip */}
      <div className="att-v2-kpi-grid" style={{ marginBottom: '20px' }}>
        <div className="att-v2-kpi-card">
          <div className="att-v2-kpi-icon green">
            <FiClock />
          </div>
          <div className="att-v2-kpi-info">
            <h4>Present Days</h4>
            <p>{summary.present}</p>
          </div>
        </div>

        <div className="att-v2-kpi-card">
          <div className="att-v2-kpi-icon amber">
            <FiAlertCircle />
          </div>
          <div className="att-v2-kpi-info">
            <h4>Half Days / Late</h4>
            <p>{summary.halfDay} / {summary.late}</p>
          </div>
        </div>

        <div className="att-v2-kpi-card">
          <div className="att-v2-kpi-icon blue">
            <FiCalendar />
          </div>
          <div className="att-v2-kpi-info">
            <h4>Total Worked</h4>
            <p>{formatMins(summary.totalMinutes)}</p>
          </div>
        </div>

        <div className="att-v2-kpi-card">
          <div className="att-v2-kpi-icon purple">
            <FiClock />
          </div>
          <div className="att-v2-kpi-info">
            <h4>Overtime</h4>
            <p>{formatMins(summary.totalOtMinutes)}</p>
          </div>
        </div>
      </div>

      {/* Ledger Data Table */}
      <div className="att-v2-table-wrapper">
        <table className="att-v2-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>First In</th>
              <th>Last Out</th>
              <th>Work Hours</th>
              <th>Late By</th>
              <th>Overtime</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  Loading attendance ledger...
                </td>
              </tr>
            ) : days.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  No attendance records found for {monthLabel}.
                </td>
              </tr>
            ) : (
              days.map((row) => {
                const dateObj = new Date(row.work_date);
                const dayName = isNaN(dateObj) ? '' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });

                return (
                  <tr key={row.id || row.work_date}>
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
                    <td style={{ fontWeight: 600 }}>{formatMins(row.effective_minutes)}</td>
                    <td style={{ color: row.late_by_minutes > 0 ? '#ea580c' : '#64748b' }}>
                      {row.late_by_minutes > 0 ? `+${row.late_by_minutes}m` : '-'}
                    </td>
                    <td style={{ color: row.ot_minutes > 0 ? '#16a34a' : '#64748b' }}>
                      {row.ot_minutes > 0 ? formatMins(row.ot_minutes) : '-'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {(row.status === 'ABSENT' || row.status === 'MISSED_PUNCH' || row.late_by_minutes > 0) && (
                        <button
                          className="att-v2-btn-secondary"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          onClick={() => onRequestCorrection && onRequestCorrection(row.work_date)}
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
    </div>
  );
};

export default AttendanceV2Ledger;
