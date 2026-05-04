import React, { useState, useEffect, useCallback } from 'react';
import {
  FiUsers, FiCalendar, FiXCircle, FiX, FiSearch,
  FiChevronLeft, FiChevronRight, FiClock, FiAlertCircle,
  FiList, FiGrid, FiInfo
} from 'react-icons/fi';
import attendanceAPI from '../../api/attendance/attendance.api';
import toast from 'react-hot-toast';
import moment from 'moment';
import EmployeeAttendanceDetailModal from './EmployeeAttendanceDetailModal';

/* ─── helpers ─────────────────────────────────────────── */
const formatLeaveBadge = (leaveType) => {
  if (!leaveType) return 'LV';
  const lt = leaveType.toLowerCase();
  if (lt.includes('privilege') || lt.includes('earned')) return 'PL';
  if (lt.includes('without pay') || lt === 'lwp') return 'LWP';
  if (lt.includes('sick')) return 'SL';
  if (lt.includes('casual')) return 'CL';
  return leaveType.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3);
};

const initials = (name = '') =>
  name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

const avatar_color = (name = '') => {
  const palette = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#3b82f6','#10b981','#ef4444'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
};

const STATUS_META = {
  present:  { label: 'Presence',  icon: FiUsers,    accent: '#10b981', bg: '#d1fae5', chip: 'present'  },
  leave:    { label: 'Leaves',   icon: FiCalendar, accent: '#f59e0b', bg: '#fef3c7', chip: 'leave'    },
  absent:   { label: 'Absences', icon: FiXCircle,  accent: '#ef4444', bg: '#fee2e2', chip: 'absent'   },
};

const STATUS_CHIP_LABEL = {
  present:     'Present',
  half_day:    'Half Day',
  late:        'Late',
  leave:       'Leave',
  pending_leave: 'Pending',
  absent:      'Absent',
};

/* ─── main component ──────────────────────────────────── */
const AttendanceAnalyticsModal = ({
  isOpen, onClose,
  type = 'present',
  initialDate,
  companyId,
  role = 'ADMIN' // Support role-based API
}) => {
  const today = initialDate ? new Date(initialDate) : new Date();
  const [viewDate, setViewDate] = useState(today);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const meta = STATUS_META[type] || STATUS_META.present;
  const Icon = meta.icon;

  const loadData = useCallback(async (t, d, mode) => {
    try {
      setLoading(true);
      const dateObj = moment(d);
      const start = dateObj.clone().startOf('month').format('YYYY-MM-DD');
      const end = dateObj.clone().endOf('month').format('YYYY-MM-DD');

      const apiCall = (role === 'HOD' || role === 'HEADOFDEPARTMENT')
        ? attendanceAPI.getTeamAttendanceReport(start, end, 'all')
        : attendanceAPI.getAdminAttendanceReport(start, end, 'all', companyId);

      const res = await apiCall;
      
      if (res?.success) {
        const employees = res.data || [];
        const processed = [];

        employees.forEach(emp => {
          // Find if the employee has any status matching 'type' on the specific 'viewDate'
          const dateStr = d.toISOString().split('T')[0];
          const todayRecord = (emp.history || []).find(day => day.date === dateStr);
          
          if (todayRecord) {
            const s = String(todayRecord.status || '').toLowerCase();
            let matches = false;
            if (t === 'leave')   matches = (s === 'leave' || s === 'pending_leave');
            if (t === 'absent')  matches = (s === 'absent');
            if (t === 'present') matches = (s === 'present' || s === 'half_day' || s === 'late');

            if (matches) {
              processed.push({
                id: emp.id || emp._id,
                name: emp.name || 'Unknown',
                department: emp.designation || emp.department || 'Staff',
                status: todayRecord.status,
                leaveType: todayRecord.leaveType || todayRecord.leave_type || null,
                leaveReason: todayRecord.leaveReason || null,
                checkIn: todayRecord.check_in || todayRecord.checkIn || null,
                checkOut: todayRecord.check_out || todayRecord.checkOut || null,
                date: todayRecord.date,
                // Full history for hover (all leaves in the fetched range - usually just today but backend gives more)
                leaveHistory: (emp.history || []).filter(h => h.status === 'leave' || h.status === 'pending_leave')
              });
            }
          }
        });
        setData(processed);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load attendance details');
    } finally {
      setLoading(false);
    }
  }, [companyId, role]);

  useEffect(() => { 
    if (isOpen) loadData(type, new Date(initialDate), 'day'); 
  }, [isOpen, type, initialDate, loadData]);

  useEffect(() => {
    if (initialDate) setViewDate(new Date(initialDate));
  }, [initialDate]);

  const filtered = data.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.department.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        .aam-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          animation: aam-fade-in 0.2s ease;
        }
        @keyframes aam-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes aam-slide-up {
          from { opacity: 0; transform: translateY(20px) scale(0.98) }
          to   { opacity: 1; transform: translateY(0) scale(1) }
        }

        .aam-panel {
          font-family: 'Inter', -apple-system, sans-serif;
          background: #ffffff;
          border-radius: 16px;
          width: 100%; max-width: 640px;
          max-height: 90vh;
          display: flex; flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: aam-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          overflow: hidden;
          color: #111827;
        }

        /* ── header ── */
        .aam-header {
          padding: 24px 24px 16px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid #f3f4f6;
        }
        .aam-header-left { display: flex; align-items: center; gap: 12px; }
        .aam-icon-wrap {
          width: 40px; height: 40px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
        }
        .aam-title-group { display: flex; flex-direction: column; }
        .aam-title { font-size: 18px; font-weight: 700; color: #111827; margin: 0; }
        .aam-subtitle { font-size: 13px; color: #6b7280; }
        
        .aam-close {
          background: #f3f4f6; border: none;
          color: #6b7280; width: 32px; height: 32px;
          border-radius: 8px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .aam-close:hover { background: #e5e7eb; color: #111827; }

        /* ── tabs ── */
        .aam-tabs {
          display: flex; padding: 4px; background: #f3f4f6;
          margin: 16px 24px 0; border-radius: 10px; gap: 4px;
        }
        .aam-tab {
          flex: 1; padding: 8px; border: none; border-radius: 8px;
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: all 0.2s; color: #6b7280; background: transparent;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .aam-tab.active { background: #ffffff; color: #111827; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

        /* ── toolbar ── */
        .aam-toolbar {
          padding: 16px 24px;
          display: flex; flex-direction: column; gap: 12px;
        }
        .aam-date-nav {
          display: flex; align-items: center; justify-content: center; gap: 16px;
        }
        .aam-nav-btn {
          background: #f9fafb; border: 1px solid #e5e7eb;
          width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #374151; transition: all 0.2s;
        }
        .aam-nav-btn:hover { background: #f3f4f6; }
        .aam-date-display { font-size: 15px; font-weight: 600; min-width: 140px; text-align: center; }

        .aam-search-container { position: relative; }
        .aam-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #9ca3af; }
        .aam-search-input {
          width: 100%; padding: 10px 12px 10px 38px;
          border: 1px solid #e5e7eb; border-radius: 10px;
          font-size: 14px; outline: none; transition: border-color 0.2s;
          box-sizing: border-box;
        }
        .aam-search-input:focus { border-color: #6366f1; ring: 2px solid #6366f122; }

        /* ── content ── */
        .aam-body {
          flex: 1; overflow-y: auto; padding: 0 24px 24px;
        }
        .aam-body::-webkit-scrollbar { width: 6px; }
        .aam-body::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }

        .aam-list-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 12px; padding: 0 4px;
        }
        .aam-list-title { font-size: 12px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
        .aam-badge-count { background: #f3f4f6; color: #374151; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; }

        .aam-card {
          display: flex; align-items: center; gap: 12px; padding: 12px;
          background: #ffffff; border: 1px solid #f3f4f6; border-radius: 12px;
          margin-bottom: 8px; transition: all 0.2s;
        }
        .aam-card:hover { border-color: #e5e7eb; background: #f9fafb; transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }

        .aam-avatar {
          width: 40px; height: 40px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 14px; color: #fff; flex-shrink: 0;
        }
        .aam-info { flex: 1; min-width: 0; }
        .aam-name { font-size: 14px; font-weight: 600; color: #111827; margin-bottom: 2px; }
        .aam-dept { font-size: 12px; color: #6b7280; }

        .aam-stats { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
        .aam-status-chip {
          padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.02em;
        }
        .aam-status-chip.present     { background: #d1fae5; color: #065f46; }
        .aam-status-chip.absent      { background: #fee2e2; color: #991b1b; }
        .aam-status-chip.leave       { background: #fef3c7; color: #92400e; }
        .aam-status-chip.late        { background: #fff7ed; color: #9a3412; }
        .aam-status-chip.half_day    { background: #eff6ff; color: #1e40af; }

        .aam-monthly-count { font-size: 12px; font-weight: 700; color: #374151; }
        .aam-monthly-label { font-size: 10px; color: #9ca3af; text-transform: uppercase; }

        .aam-details { margin-top: 4px; display: flex; flex-wrap: wrap; gap: 6px; }
        .aam-detail-tag {
          font-size: 11px; color: #4b5563; background: #f3f4f6;
          padding: 2px 8px; border-radius: 6px; border: 1px solid #e5e7eb;
          display: flex; align-items: center; gap: 4px;
        }
        .aam-reason-box {
          margin-top: 6px; font-size: 12px; color: #6b7280;
          background: #f9fafb; padding: 6px 10px; border-radius: 8px;
          border-left: 3px solid #e5e7eb; line-height: 1.4;
          display: flex; align-items: flex-start; gap: 6px;
        }

        .aam-loading-state { padding: 48px 0; text-align: center; color: #9ca3af; }
        .aam-empty-state { padding: 48px 0; text-align: center; color: #9ca3af; }
        .aam-empty-icon { font-size: 32px; margin-bottom: 12px; opacity: 0.5; }

        /* Hover Tooltip */
        .aam-user-hover-container { position: relative; }
        .aam-history-tooltip {
          position: absolute; left: 100%; top: 0; z-index: 10000;
          background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
          width: 280px; padding: 12px; margin-left: 12px;
          display: none; pointer-events: none;
          animation: aam-fade-in 0.2s ease;
        }
        .aam-user-hover-container:hover .aam-history-tooltip { display: block; }
        .aam-history-title { font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; margin-bottom: 8px; }
        .aam-history-item { font-size: 11px; color: #374151; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px dashed #f3f4f6; }
        .aam-history-item:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
        .aam-history-date { font-weight: 600; color: #111827; }
        .aam-history-reason { display: block; color: #6b7280; font-style: italic; margin-top: 2px; }
      `}</style>

      <div className="aam-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="aam-panel">
          
          <div className="aam-header">
            <div className="aam-header-left">
              <div className="aam-icon-wrap" style={{ background: meta.bg, color: meta.accent }}>
                <Icon />
              </div>
              <div className="aam-title-group">
                <h3 className="aam-title">{meta.label}</h3>
                <span className="aam-subtitle">
                  {viewDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
            <button className="aam-close" onClick={onClose}><FiX /></button>
          </div>


          <div className="aam-toolbar">
            <div className="aam-search-container">
              <FiSearch className="aam-search-icon" />
              <input 
                className="aam-search-input"
                placeholder="Search by name or department..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="aam-body">
            {loading ? (
              <div className="aam-loading-state">
                <div className="aam-spinner" />
                <p>Fetching records...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="aam-empty-state">
                <div className="aam-empty-icon"><FiAlertCircle /></div>
                <p>No records found for this period.</p>
              </div>
            ) : (
              <>
                <div className="aam-list-header">
                  <span className="aam-list-title">Employee List</span>
                  <span className="aam-badge-count">{filtered.length}</span>
                </div>
                {filtered.map(emp => (
                  <div 
                    key={emp.id} 
                    className="aam-card aam-user-hover-container clickable" 
                    onClick={() => setSelectedUser(emp)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="aam-avatar" style={{ background: avatar_color(emp.name) }}>
                      {initials(emp.name)}
                    </div>
                    <div className="aam-info">
                      <div className="aam-name">{emp.name}</div>
                      <div className="aam-dept">{emp.department}</div>
                      
                      <div className="aam-details">
                        {type === 'present' && (emp.checkIn || emp.checkOut) && (
                          <span className="aam-detail-tag">
                            <FiClock size={11} /> {emp.checkIn || '--'} - {emp.checkOut || '--'}
                          </span>
                        )}
                        {type === 'leave' && emp.leaveType && (
                          <span className="aam-detail-tag">
                            <FiCalendar size={11} /> {emp.leaveType}
                          </span>
                        )}
                      </div>
                      {type === 'leave' && emp.leaveReason && (
                        <div className="aam-reason-box">
                          <FiInfo size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                          <span>{emp.leaveReason}</span>
                        </div>
                      )}
                    </div>

                    {/* Hover History Tooltip */}
                    {emp.leaveHistory && emp.leaveHistory.length > 0 && (
                      <div className="aam-history-tooltip">
                        <div className="aam-history-title">Recent Leave History</div>
                        {emp.leaveHistory.slice(0, 5).map((h, hi) => (
                          <div key={hi} className="aam-history-item">
                            <span className="aam-history-date">
                              {new Date(h.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })} ({new Date(h.date).toLocaleDateString('en-IN', { weekday: 'short' })})
                            </span>
                            <span className="aam-history-reason">
                              — {h.leaveReason || h.leaveType || 'No reason provided'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="aam-stats">
                      <span className={`aam-status-chip ${String(emp.status).toLowerCase().replace(' ', '_')}`}>
                        {STATUS_CHIP_LABEL[emp.status] || emp.status}
                      </span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
      <EmployeeAttendanceDetailModal 
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        employee={selectedUser}
        startDate={viewDate.toISOString().substring(0, 7) + '-01'}
        endDate={viewDate.toISOString().substring(0, 10)}
      />
    </>
  );
};

export default AttendanceAnalyticsModal;