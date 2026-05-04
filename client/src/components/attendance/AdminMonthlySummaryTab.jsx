import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiUsers, FiCalendar, FiSearch, FiDownload, FiFilter, FiChevronLeft, FiChevronRight, FiGrid
} from 'react-icons/fi';
import attendanceAPI from '../../api/attendance/attendance.api';
import masterAPI from '../../api/attendance/master.api';
import EmployeeAttendanceDetailModal from './EmployeeAttendanceDetailModal';
import toast from 'react-hot-toast';
import moment from 'moment';

const AdminMonthlySummaryTab = ({ currentMonth, onMonthChange, companies = [], selectedCompanyId, onCompanyChange }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const itemsPerPage = 15;

  const loadData = useCallback(async () => {
    if (!selectedCompanyId) return;
    try {
      setLoading(true);
      const [year, month] = currentMonth.split('-');
      const res = await attendanceAPI.getPayrollData(month, year, selectedCompanyId);
      if (res?.success) {
        setData(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load monthly summary', err);
      toast.error('Failed to load monthly summary');
    } finally {
      setLoading(false);
    }
  }, [currentMonth, selectedCompanyId]);

  const loadTeams = useCallback(async () => {
    if (!selectedCompanyId) {
        setTeams([]);
        return;
    }
    try {
      const res = await masterAPI.getTeamsByCompany(selectedCompanyId);
      if (res?.success) setTeams(res.teams || []);
    } catch (err) {
      console.error('Failed to load teams', err);
    }
  }, [selectedCompanyId]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadTeams(); }, [loadTeams]);

  const filteredData = data.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          emp.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeam = selectedTeamId === 'all' || emp.teamId === selectedTeamId; // Note: Ensure backend provides teamId if possible, or filter locally if needed
    return matchesSearch && matchesTeam;
  });

  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const handleExport = () => {
      // Basic CSV export logic
      const headers = ['Name', 'Code', 'Department', 'Present', 'Absent', 'Leave', 'Weekly Off', 'Payable Days'];
      const rows = filteredData.map(e => [
          e.name, e.code, e.department, e.stats.present, e.stats.absent, e.stats.leave, e.stats.weeklyOffs, e.stats.payableDays
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(r => r.join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Monthly_Summary_${currentMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="adb-monthly-tab">
      <style>{`
        .adb-monthly-tab { padding: 24px; }
        .adb-mon-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
        .adb-mon-controls { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .adb-filter-group { display: flex; align-items: center; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 4px 12px; gap: 8px; }
        .adb-filter-lbl { font-size: 12px; color: #6b7280; font-weight: 500; }
        .adb-mon-input { border: none; font-size: 14px; color: #111827; font-weight: 600; outline: none; background: transparent; }
        .adb-mon-select { border: none; font-size: 14px; color: #111827; font-weight: 600; outline: none; background: transparent; min-width: 120px; }
        
        .adb-mon-grid { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .adb-mon-table { width: 100%; border-collapse: collapse; }
        .adb-mon-table th { background: #f9fafb; padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #4b5563; border-bottom: 1px solid #e5e7eb; }
        .adb-mon-table td { padding: 14px 16px; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6; }
        .adb-mon-row:hover { background: #f8fafc; }
        
        .adb-mon-stat-pill { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 99px; font-size: 12px; font-weight: 600; }
        .adb-mon-stat-pill.present { background: #ecfdf5; color: #059669; }
        .adb-mon-stat-pill.absent { background: #fef2f2; color: #dc2626; }
        .adb-mon-stat-pill.leave { background: #eff6ff; color: #1e40af; }
        
        .adb-mon-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px; color: #6b7280; gap: 16px; }
        .adb-mon-pagination { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: #fff; border-top: 1px solid #e5e7eb; }
        .adb-pag-btn { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 6px; border: 1px solid #e5e7eb; background: #fff; color: #374151; cursor: pointer; }
        .adb-pag-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .adb-pag-info { font-size: 13px; color: #6b7280; }

        .adb-export-btn { display: flex; align-items: center; gap: 8px; background: #111827; color: #fff; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; transition: 0.2s; }
        .adb-export-btn:hover { background: #1f2937; }
      `}</style>

      <div className="adb-mon-header">
        <div className="adb-mon-controls">
          <div className="adb-filter-group">
            <span className="adb-filter-lbl">Organization:</span>
            <select 
              className="adb-mon-select"
              value={selectedCompanyId || ''}
              onChange={(e) => onCompanyChange(e.target.value)}
            >
              <option value="">Select Organization</option>
              {companies.map(c => (
                <option key={c._id} value={c._id}>{c.company_name}</option>
              ))}
            </select>
          </div>

          <div className="adb-filter-group">
            <span className="adb-filter-lbl">Month:</span>
            <FiCalendar size={14} color="#9ca3af" />
            <input 
              type="month" 
              className="adb-mon-input" 
              value={currentMonth}
              onChange={(e) => onMonthChange(e.target.value)}
            />
          </div>

          <div className="adb-filter-group">
            <span className="adb-filter-lbl">Team:</span>
            <FiUsers size={14} color="#9ca3af" />
            <select 
              className="adb-mon-select"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
            >
              <option value="all">All Teams</option>
              {teams.map(t => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="adb-filter-group">
            <FiSearch size={14} color="#9ca3af" />
            <input 
              type="text" 
              placeholder="Search employee..." 
              className="adb-mon-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <button className="adb-export-btn" onClick={handleExport}>
          <FiDownload /> Export CSV
        </button>
      </div>

      {loading ? (
        <div className="adb-mon-loading">
          <div className="adb-loader"></div>
          <span>Loading monthly summary...</span>
        </div>
      ) : (
        <div className="adb-mon-grid">
          <table className="adb-mon-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Leave</th>
                <th>Payable Days</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
                    {!selectedCompanyId ? 'Please select an organization to view the summary.' : 'No records found for this period.'}
                  </td>
                </tr>
              ) : paginatedData.map(emp => (
                <tr key={emp.id} className="adb-mon-row" onClick={() => setSelectedEmployee(emp)} style={{ cursor: 'pointer', position: 'relative' }}>
                  <td className="adb-user-td" style={{ fontWeight: 600, color: '#111827' }}>
                    {emp.name} <br/> <small style={{ color: '#6b7280', fontWeight: 400 }}>{emp.code}</small>
                    {/* Hover Tooltip for Leave Dates */}
                    {emp.attendance && emp.attendance.some(a => a.status === 'leave') && (
                      <div className="adb-leave-tooltip">
                        <div className="adb-lt-title">Monthly Leave Details</div>
                        {emp.attendance
                          .filter(a => a.status === 'leave' || a.status === 'pending_leave')
                          .map((a, i) => (
                            <div key={i} className="adb-lt-item">
                              <span className="adb-lt-date">{moment(a.date).format('DD MMM')} ({moment(a.date).format('ddd')})</span>
                              <span className="adb-lt-reason"> — {a.remarks || 'Leave'}</span>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </td>
                  <td>{emp.department}</td>
                  <td><span className="adb-mon-stat-pill present">{emp.stats.present}</span></td>
                  <td><span className="adb-mon-stat-pill absent">{emp.stats.absent}</span></td>
                  <td><span className="adb-mon-stat-pill leave">{emp.stats.leave}</span></td>
                  <td style={{ fontWeight: 700, color: '#111827' }}>{emp.stats.payableDays}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="adb-mon-pagination">
              <span className="adb-pag-info">Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredData.length)} of {filteredData.length} employees</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="adb-pag-btn" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <FiChevronLeft />
                </button>
                <button 
                  className="adb-pag-btn" 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  <FiChevronRight />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <EmployeeAttendanceDetailModal 
        isOpen={!!selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        employee={selectedEmployee}
        startDate={currentMonth + '-01'}
        endDate={moment(currentMonth).endOf('month').format('YYYY-MM-DD')}
        companyId={selectedCompanyId}
      />
    </div>
  );
};

export default AdminMonthlySummaryTab;
