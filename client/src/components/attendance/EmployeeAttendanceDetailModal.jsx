import React, { useState, useEffect, useCallback } from 'react';
import { FiX, FiCalendar, FiClock, FiInfo } from 'react-icons/fi';
import attendanceAPI from '../../api/attendance/attendance.api';
import toast from 'react-hot-toast';

const EmployeeAttendanceDetailModal = ({ isOpen, onClose, employee, startDate, endDate, companyId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!employee || !employee.id) return;
    try {
      setLoading(true);
      // Pass the date range and companyId to the API to get records for the selected month
      const res = await attendanceAPI.getEmployeeFullProfile(employee.id, startDate, endDate, companyId);
      if (res?.success) {
        setHistory(res.attendance || []);
      }
    } catch (err) {
      console.error('Failed to load employee history', err);
    } finally {
      setLoading(false);
    }
  }, [employee, startDate, endDate, companyId]);

  useEffect(() => {
    if (isOpen) loadHistory();
  }, [isOpen, loadHistory]);

  if (!isOpen || !employee) return null;

  return (
    <div className="ead-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <style>{`
        .ead-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .ead-modal { background: #fff; border-radius: 16px; width: 100%; max-width: 800px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); overflow: hidden; animation: ead-slide-up 0.3s ease; }
        @keyframes ead-slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        
        .ead-header { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: flex-start; background: #fff; }
        .ead-title-grp { display: flex; flex-direction: column; }
        .ead-name { font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; }
        .ead-dept { font-size: 13px; color: #64748b; margin-top: 2px; font-weight: 500; }
        .ead-close { background: #f1f5f9; border: none; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; transition: all 0.2s; }
        .ead-close:hover { background: #e2e8f0; color: #0f172a; }
        
        .ead-body { padding: 0; max-height: 550px; overflow-y: auto; }
        
        /* Summary Grid Improvements */
        .ead-summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 24px; background: #f8fafc; border-bottom: 1px solid #f1f5f9; }
        .ead-sum-card { padding: 16px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px solid rgba(0,0,0,0.05); box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .ead-sum-val { font-size: 24px; font-weight: 800; line-height: 1; margin-bottom: 6px; }
        .ead-sum-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.7; }
        
        .ead-sum-card.total { background: #fff; color: #1e293b; }
        .ead-sum-card.privilege { background: #ecfdf5; color: #059669; }
        .ead-sum-card.lwp { background: #fff7ed; color: #ea580c; }
        .ead-sum-card.pending { background: #fffbeb; color: #d97706; }

        /* Table Layout */
        .ead-table-container { padding: 12px 24px 24px; }
        .ead-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .ead-table th { text-align: left; padding: 12px 16px; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #f1f5f9; }
        .ead-table td { padding: 16px; font-size: 14px; color: #334155; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
        .ead-table tr:hover td { background: #f8fafc; }
        
        .ead-td-date { font-weight: 700; color: #1e293b; white-space: nowrap; }
        .ead-td-day { font-size: 11px; color: #94a3b8; font-weight: 600; text-transform: uppercase; margin-top: 2px; }
        .ead-td-type { font-size: 11px; font-weight: 700; color: #475569; background: #f1f5f9; padding: 4px 10px; border-radius: 6px; text-transform: uppercase; display: inline-block; }
        .ead-td-reason { line-height: 1.5; color: #1e293b; font-size: 13px; max-width: 350px; }
        .ead-td-status { font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.03em; }
        .ead-td-status.leave { background: #dbeafe; color: #1e40af; }
        .ead-td-status.pending_leave { background: #fef3c7; color: #92400e; }
        
        .ead-empty { text-align: center; padding: 60px 24px; color: #94a3b8; font-size: 15px; }
        .ead-loader-wrap { display: flex; flex-direction: column; align-items: center; padding: 60px; gap: 16px; color: #64748b; }
      `}</style>

      <div className="ead-modal">
        <div className="ead-header">
          <div className="ead-title-grp">
            <span className="ead-name">{employee.name}</span>
            <span className="ead-dept">{employee.department} • Monthly Leave Log</span>
          </div>
          <button className="ead-close" onClick={onClose}><FiX /></button>
        </div>

        <div className="ead-body">
          {loading ? (
            <div className="ead-loader-wrap">
              <div className="adb-loader"></div>
              <span>Preparing leave report...</span>
            </div>
          ) : (
            <>
              {(() => {
                const leavesOnly = history.filter(h => h.status === 'leave' || h.status === 'pending_leave');
                
                if (leavesOnly.length === 0) {
                  return <div className="ead-empty">No leave entries found for this period.</div>;
                }

                // Calculate Summary Stats
                const stats = leavesOnly.reduce((acc, curr) => {
                  acc.total++;
                  if (curr.status === 'pending_leave') acc.pending++;
                  if (curr.leaveType?.toLowerCase().includes('privilege')) acc.privilege++;
                  else if (curr.leaveType?.toLowerCase().includes('lwp') || curr.leaveType?.toLowerCase().includes('without pay')) acc.lwp++;
                  else acc.others++;
                  return acc;
                }, { total: 0, pending: 0, privilege: 0, lwp: 0, others: 0 });

                return (
                  <div className="ead-content">
                    {/* Summary Bar */}
                    <div className="ead-summary-grid">
                      <div className="ead-sum-card total">
                        <span className="ead-sum-val">{stats.total}</span>
                        <span className="ead-sum-lbl">Total Leaves</span>
                      </div>
                      <div className="ead-sum-card privilege">
                        <span className="ead-sum-val">{stats.privilege}</span>
                        <span className="ead-sum-lbl">Privilege</span>
                      </div>
                      <div className="ead-sum-card lwp">
                        <span className="ead-sum-val">{stats.lwp}</span>
                        <span className="ead-sum-lbl">LWP</span>
                      </div>
                      <div className="ead-sum-card pending">
                        <span className="ead-sum-val">{stats.pending}</span>
                        <span className="ead-sum-lbl">Pending</span>
                      </div>
                    </div>

                    <div className="ead-table-container">
                      <table className="ead-table">
                        <thead>
                          <tr>
                            <th>Date (Day)</th>
                            <th>Type</th>
                            <th>Reason</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leavesOnly.map((h, i) => {
                            const d = new Date(h.attendance_date || h.date);
                            const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                            const dayStr = d.toLocaleDateString('en-IN', { weekday: 'long' });
                            
                            // Prioritize the actual reason over migration markers
                            let finalReason = h.remarks || h.leaveReason || '';
                            if (finalReason.includes('Migrated leave calendar marker')) {
                              finalReason = h.leaveReason || 'Leave applied';
                            }

                            return (
                              <tr key={i}>
                                <td width="150">
                                  <div className="ead-td-date">{dateStr}</div>
                                  <div className="ead-td-day">{dayStr}</div>
                                </td>
                                <td width="140">
                                  <span className="ead-td-type">{h.leaveType || 'General'}</span>
                                </td>
                                <td>
                                  <div className="ead-td-reason">{finalReason}</div>
                                </td>
                                <td width="120" style={{ textAlign: 'right' }}>
                                  <span className={`ead-td-status ${h.status}`}>
                                    {h.status?.replace(/_/g, ' ')}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeAttendanceDetailModal;
