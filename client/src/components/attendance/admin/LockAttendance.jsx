import React, { useState } from 'react';
import { Modal } from 'antd';
import { FiLock, FiUnlock, FiAlertTriangle, FiCheckCircle, FiArrowLeft, FiRefreshCw } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import attendanceAPI from '../../../api/attendance/attendance.api';
import toast from 'react-hot-toast';
import EnterpriseTable from '../common/EnterpriseTable';
import Button from '../common/Button';
import Badge from '../common/Badge';
import './AdminSettings.css';

const LockAttendance = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));

  const columns = [
    { label: 'Year-Month', key: 'year_month', sortable: true },
    {
      label: 'Lock Status',
      key: 'is_locked',
      sortable: true,
      render: (val) => (
        <Badge variant={val ? 'danger' : 'success'}>
          {val ? <><FiLock size={12} /> Locked</> : <><FiUnlock size={12} /> Unlocked</>}
        </Badge>
      )
    },
    {
      label: 'Locked By',
      key: 'locked_by',
      render: (val) => val ? `${val.first_name || ''} ${val.last_name || ''}`.trim() || val.username : '---'
    },
    {
      label: 'Action Date',
      key: 'locked_at',
      render: (val) => val ? new Date(val).toLocaleDateString() : '---'
    },
    {
      label: 'Actions',
      render: (_, row) => (
        <Button
          variant={row.is_locked ? "outline" : "danger"}
          size="sm"
          onClick={() => handleToggleLock(row.year_month, !row.is_locked)}
        >
          {row.is_locked ? 'Unlock' : 'Lock'}
        </Button>
      )
    }
  ];

  const fetchLocks = async (params) => {
    return await attendanceAPI.getPayrollLocks(params);
  };

  const handleToggleLock = (month, isLocked) => {
    Modal.confirm({
      title: `${isLocked ? 'Lock' : 'Unlock'} Attendance`,
      content: `Are you sure you want to ${isLocked ? 'LOCK' : 'UNLOCK'} attendance for ${month}?`,
      okText: 'Confirm',
      okType: isLocked ? 'danger' : 'primary',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setLoading(true);
          await attendanceAPI.togglePayrollLock(month, isLocked);
          toast.success(`${isLocked ? 'Locked' : 'Unlocked'} successfully`);
          window.location.reload();
        } catch (err) {
          toast.error(err.message || 'Operation failed');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleNewLock = () => {
    handleToggleLock(selectedMonth, true);
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <div className="settings-header-content">
          <h2>Attendance Lock Control</h2>
          <p>Manage manual overrides for monthly payroll cycles across the organization.</p>
        </div>
        <div className="settings-header-actions">
          <button className="btn btn-outline" onClick={() => navigate('/admin-dashboard')}>
            <FiArrowLeft size={18} />
            Back to Dashboard
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3><FiLock size={20} /> Manual Month Lock</h3>
        <div className="elite-form-grid" style={{ alignItems: 'flex-end' }}>
          <div className="form-group">
            <label>Select Month</label>
            <input
              type="month"
              className="form-input"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
            />
          </div>
          <div className="form-group">
            <Button variant="danger" onClick={handleNewLock} disabled={loading}>
              <FiLock style={{ marginRight: 8 }} />
              Lock Month Now
            </Button>
          </div>
        </div>
        <div className="info-note warning" style={{ marginTop: '1rem' }}>
          <FiAlertTriangle size={20} />
          <div>
            <strong>Security Note:</strong> Manual locks override automated cutoff rules and apply strictly to all employees.
          </div>
        </div>
      </div>

      <EnterpriseTable
        title="Historical & Active Locks"
        columns={columns}
        fetchData={fetchLocks}
        searchPlaceholder="Search month (YYYY-MM)..."
      />
    </div>
  );
};

export default LockAttendance;


