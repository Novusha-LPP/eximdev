import React, { useState, useEffect, useContext } from 'react';
import {
  FiClock, FiCalendar, FiFileText, FiAlertTriangle, FiCheckCircle,
  FiRefreshCw, FiAward, FiActivity, FiUserCheck
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { UserContext } from '../../contexts/UserContext';
import attendanceV2API from '../../api/attendance/attendanceV2.api';
import AttendanceV2Clock from './AttendanceV2Clock';
import AttendanceV2Ledger from './AttendanceV2Ledger';
import AttendanceV2Leaves from './AttendanceV2Leaves';
import AttendanceV2Corrections from './AttendanceV2Corrections';
import AttendanceV2Approvals from './AttendanceV2Approvals';
import './AttendanceV2.css';

const AttendanceV2Dashboard = () => {
  const { user } = useContext(UserContext);

  const [activeTab, setActiveTab] = useState('overview');
  const [sessionData, setSessionData] = useState(null);
  const [todayData, setTodayData] = useState(null);
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [inboxCount, setInboxCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [regularizeDate, setRegularizeDate] = useState(null);
  const [hrmsOffline, setHrmsOffline] = useState(false);
  const [linking, setLinking] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date());

  // Live second clock for the header
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setHrmsOffline(false);
    try {
      const [meRes, todayRes, balRes] = await Promise.all([
        attendanceV2API.getMe().catch((err) => {
          const status = err?.response?.status;
          if (status === 530 || status === 503 || status === 502) {
            setHrmsOffline(true);
          }
          return null;
        }),
        attendanceV2API.getTodayStatus().catch((err) => {
          const status = err?.response?.status;
          if (status === 530 || status === 503 || status === 502) {
            setHrmsOffline(true);
          }
          return null;
        }),
        attendanceV2API.getLeaveBalances().catch(() => []),
      ]);

      setSessionData(meRes);
      setTodayData(todayRes);
      setLeaveBalances(Array.isArray(balRes) ? balRes : []);

      // Check approvals inbox count if manager or admin
      const isMgr = meRes?.hrms?.roles?.includes('MANAGER') || user?.role === 'Admin' || user?.isHod;
      if (isMgr) {
        attendanceV2API.getApprovalsInbox().then((inbox) => {
          if (Array.isArray(inbox)) setInboxCount(inbox.length);
        }).catch(() => { });
      }
    } catch (err) {
      console.error('Failed to load Attendance V2 dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleAutoLink = async () => {
    setLinking(true);
    try {
      const res = await attendanceV2API.autoLink();
      if (res?.success) {
        toast.success(res.message || 'Profile linked successfully!');
        loadDashboardData();
      } else {
        toast.error(res?.message || 'Unable to auto-link profile.');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Auto-link failed');
    } finally {
      setLinking(false);
    }
  };

  const isManagerOrAdmin =
    sessionData?.hrms?.roles?.includes('MANAGER') ||
    user?.role === 'Admin' ||
    user?.isHod;

  const totalLeaveAvail = leaveBalances.reduce((sum, b) => sum + (b.available_days || 0), 0);

  const handleRequestCorrectionFromLedger = (workDate) => {
    setRegularizeDate(workDate);
    setActiveTab('corrections');
  };

  return (
    <div className="attendance-v2-container">
      {/* Top Banner Header */}
      <div className="att-v2-header">
        <div className="att-v2-title-area">
          <h1>Attendance V2</h1>
          <p className="att-v2-subtitle">
            <span>Welcome, {user?.first_name || user?.username || 'Employee'}</span>
            <span>•</span>
            <span>{sessionData?.employment?.legal_entity_name || user?.company || 'Company'}</span>
            <span>•</span>
            <span>{sessionData?.employment?.department || user?.department || 'Operations'}</span>
          </p>
        </div>

        <div className="att-v2-header-meta">
          <button
            className="att-v2-btn-secondary"
            onClick={loadDashboardData}
            disabled={loading}
            style={{
              background: 'rgba(255,255,255,0.15)',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FiRefreshCw className={loading ? 'spinning' : ''} size={14} />
            <span>Sync</span>
          </button>

          <div className="att-v2-time-display">
            <div className="att-v2-live-clock">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="att-v2-live-date">
              {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Linking Banner if user is not linked in HRMS */}
      {sessionData?.unlinked && (
        <div className="att-v2-link-banner">
          <div className="att-v2-link-banner-left">
            <div className="att-v2-link-banner-icon">
              <FiUserCheck size={24} />
            </div>
            <div>
              <h4>Employee Profile Linking</h4>
              <p>
                Your EXIM account (<strong>{user?.username}</strong>) is not yet mapped to an active employment profile.
                Click <strong>Auto-Link</strong> to automatically match your profile.
              </p>
            </div>
          </div>
          <div className="att-v2-link-banner-actions">
            <button
              className="att-v2-btn-primary"
              onClick={handleAutoLink}
              disabled={linking}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <FiRefreshCw className={linking ? 'spinning' : ''} size={14} />
              <span>{linking ? 'Linking Profile...' : 'Auto-Link Profile Now'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Offline Alert Banner */}
      {hrmsOffline && (
        <div className="att-v2-offline-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div className="att-v2-offline-icon">
              <FiAlertTriangle size={24} />
            </div>
            <div>
              <div style={{ fontWeight: '700', color: '#9f1239', fontSize: '15px' }}>
                Attendance Service Temporarily Unavailable
              </div>
              <div style={{ color: '#881337', fontSize: '13px', marginTop: '2px' }}>
                The live attendance synchronization server is currently unreachable. Live punches and balance sync will resume once the service reconnects.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="att-v2-btn-secondary"
              onClick={loadDashboardData}
              style={{ background: '#ffffff', color: '#e11d48', border: '1px solid #fda4af' }}
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="att-v2-nav-tabs">
        <button
          className={`att-v2-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <FiClock size={16} />
          <span>Clock & Overview</span>
        </button>

        <button
          className={`att-v2-tab-btn ${activeTab === 'ledger' ? 'active' : ''}`}
          onClick={() => setActiveTab('ledger')}
        >
          <FiCalendar size={16} />
          <span>Monthly Ledger</span>
        </button>

        <button
          className={`att-v2-tab-btn ${activeTab === 'leaves' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaves')}
        >
          <FiFileText size={16} />
          <span>Leaves & Balances</span>
        </button>

        <button
          className={`att-v2-tab-btn ${activeTab === 'corrections' ? 'active' : ''}`}
          onClick={() => setActiveTab('corrections')}
        >
          <FiAlertTriangle size={16} />
          <span>Regularization</span>
        </button>

        {isManagerOrAdmin && (
          <>
            <button
              className={`att-v2-tab-btn ${activeTab === 'approvals' ? 'active' : ''}`}
              onClick={() => setActiveTab('approvals')}
            >
              <FiCheckCircle size={16} />
              <span>Approvals</span>
              {inboxCount > 0 && <span className="att-v2-tab-count">{inboxCount}</span>}
            </button>

          </>
        )}
      </div>

      {/* TAB 1: OVERVIEW & PUNCH CLOCK */}
      {activeTab === 'overview' && (
        <>
          {/* Quick Stat Highlights */}
          <div className="att-v2-kpi-grid">
            {(() => {
              const punches = todayData?.punches || [];
              const sorted = [...punches].sort((a, b) => new Date(a.punched_at) - new Date(b.punched_at));
              const lastPunch = sorted.length > 0 ? sorted[sorted.length - 1] : null;
              const isOnBreak = Boolean(
                todayData?.is_on_break ||
                todayData?.status === 'ON_BREAK' ||
                (lastPunch && lastPunch.punch_type === 'BREAK_START')
              );
              const isWorking = Boolean(!isOnBreak && (todayData?.is_punched_in || (lastPunch && (lastPunch.punch_type === 'IN' || lastPunch.punch_type === 'BREAK_END'))));

              return (
                <div className="att-v2-kpi-card">
                  <div className={`att-v2-kpi-icon ${isWorking ? 'green' : isOnBreak ? 'amber' : 'amber'}`}>
                    <FiClock />
                  </div>
                  <div className="att-v2-kpi-info">
                    <h4>Today's State</h4>
                    <p style={{ color: isWorking ? '#059669' : isOnBreak ? '#d97706' : '#64748b', fontWeight: 700 }}>
                      {isWorking ? 'In Office' : isOnBreak ? 'On Break' : todayData?.status || 'Not Checked In'}
                    </p>
                  </div>
                </div>
              );
            })()}

            <div className="att-v2-kpi-card">
              <div className="att-v2-kpi-icon blue">
                <FiFileText />
              </div>
              <div className="att-v2-kpi-info">
                <h4>Leave Balance</h4>
                <p>{totalLeaveAvail} Days</p>
              </div>
            </div>

            <div className="att-v2-kpi-card">
              <div className="att-v2-kpi-icon purple">
                <FiActivity />
              </div>
              <div className="att-v2-kpi-info" style={{ width: '100%' }}>
                <h4>Effective Time</h4>
                <p>{Math.floor((todayData?.effective_minutes || 0) / 60)}h {(todayData?.effective_minutes || 0) % 60}m</p>
                <div className="att-v2-progress-track">
                  <div
                    className="att-v2-progress-fill"
                    style={{
                      width: `${Math.min(100, Math.round(((todayData?.effective_minutes || 0) / 480) * 100))}%`
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="att-v2-kpi-card">
              <div className="att-v2-kpi-icon amber">
                <FiAward />
              </div>
              <div className="att-v2-kpi-info">
                <h4>Role</h4>
                <p style={{ fontSize: '18px' }}>{sessionData?.hrms?.roles?.join(', ') || 'Employee'}</p>
              </div>
            </div>
          </div>

          <div className="att-v2-grid-dashboard">
            {/* Live Clock Card */}
            <AttendanceV2Clock todayData={todayData} onRefresh={loadDashboardData} />

            {/* Monthly mini ledger preview */}
            <AttendanceV2Ledger onRequestCorrection={handleRequestCorrectionFromLedger} />
          </div>
        </>
      )}

      {/* TAB 2: MONTHLY LEDGER */}
      {activeTab === 'ledger' && (
        <AttendanceV2Ledger onRequestCorrection={handleRequestCorrectionFromLedger} />
      )}

      {/* TAB 3: LEAVES & BALANCES */}
      {activeTab === 'leaves' && <AttendanceV2Leaves />}

      {/* TAB 4: REGULARIZATION & CORRECTIONS */}
      {activeTab === 'corrections' && (
        <AttendanceV2Corrections initialDate={regularizeDate} />
      )}

      {/* TAB 5: APPROVALS */}
      {activeTab === 'approvals' && isManagerOrAdmin && <AttendanceV2Approvals />}


    </div>
  );
};

export default AttendanceV2Dashboard;
