import React, { useState, useEffect } from 'react';
import { FiLogIn, FiLogOut, FiCoffee, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import attendanceV2API from '../../api/attendance/attendanceV2.api';

const formatTime12h = (iso) => {
  if (!iso) return '--:--';
  const d = new Date(iso);
  if (isNaN(d)) return '--:--';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatDuration = (totalSeconds) => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = String(Math.floor(safe / 3600)).padStart(2, '0');
  const m = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
  const s = String(safe % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const AttendanceV2Clock = ({ todayData, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const punches = todayData?.punches || [];
  const sortedPunches = [...punches].sort((a, b) => new Date(a.punched_at) - new Date(b.punched_at));
  const lastPunch = sortedPunches.length > 0 ? sortedPunches[sortedPunches.length - 1] : null;

  // Determine current exact state
  const isOnBreak = Boolean(
    todayData?.is_on_break ||
    todayData?.status === 'ON_BREAK' ||
    (lastPunch && lastPunch.punch_type === 'BREAK_START')
  );

  const isWorking = Boolean(
    !isOnBreak && (
      todayData?.is_punched_in ||
      (lastPunch && (lastPunch.punch_type === 'IN' || lastPunch.punch_type === 'BREAK_END'))
    )
  );

  const firstIn = todayData?.first_punch_in;
  const lastOut = todayData?.last_punch_out;
  const effectiveMinutes = todayData?.effective_minutes || 0;

  // Calculate live elapsed seconds when actively working
  useEffect(() => {
    let interval = null;

    if (isWorking && firstIn) {
      const inTs = new Date(firstIn).getTime();
      const calculateSeconds = () => {
        const now = Date.now();
        const diff = Math.max(0, Math.floor((now - inTs) / 1000));
        setElapsedSeconds(diff);
      };

      calculateSeconds();
      interval = setInterval(calculateSeconds, 1000);
    } else {
      setElapsedSeconds(effectiveMinutes * 60);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWorking, firstIn, effectiveMinutes]);

  const handlePunch = async (punchType) => {
    setLoading(true);
    let coords = { latitude: null, longitude: null };

    // Attempt to capture browser location if granted
    if (navigator.geolocation) {
      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
        }).catch(() => null);

        if (pos?.coords) {
          coords.latitude = pos.coords.latitude;
          coords.longitude = pos.coords.longitude;
        }
      } catch (e) {
        // Fallback without coordinates
      }
    }

    try {
      const res = await attendanceV2API.punch({
        punch_type: punchType,
        source: 'WEB',
        ...coords,
      });

      let label = 'Punch recorded successfully';
      if (punchType === 'IN') {
        label = res?.resolved_from_break ? 'Checked in after break — Welcome back!' : 'Punched In successfully';
      } else if (punchType === 'OUT') {
        label = 'Punched Out successfully';
      } else if (punchType === 'BREAK_START') {
        label = 'Break started — Enjoy your break!';
      } else if (punchType === 'BREAK_END') {
        label = 'Break ended — Welcome back!';
      }

      toast.success(label);
      if (onRefresh) onRefresh();
    } catch (err) {
      const serverMsg = err?.response?.data?.message || err?.message;
      if (err?.response?.status === 409) {
        if (punchType === 'IN') {
          // If 409 on IN, prompt that active break should be ended or try ending break
          toast.error(serverMsg || 'You are currently on break. Please click "Check In After Break" to resume work.');
        } else {
          toast.error(serverMsg || 'Punch state conflict. Please refresh and try again.');
        }
      } else {
        toast.error(serverMsg || 'Failed to record punch');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="att-v2-punch-card">
      <div className="att-v2-punch-card-header">
        <div className="att-v2-punch-title">
          <FiClock className="text-primary" />
          <span>Punch Terminal</span>
        </div>
        <div className={`att-v2-punch-state-badge ${isWorking ? 'in' : isOnBreak ? 'break' : 'out'}`}>
          {isWorking && <span className="att-v2-pulse-dot" />}
          {isOnBreak && <span className="att-v2-pulse-dot break" />}
          <span>{isWorking ? 'Clocked In' : isOnBreak ? 'On Break' : 'Clocked Out'}</span>
        </div>
      </div>

      {/* Circular Clock Display */}
      <div className={`att-v2-clock-ring ${isWorking ? 'active' : ''} ${isOnBreak ? 'break' : ''}`}>
        <span className="att-v2-elapsed-label">
          {isOnBreak ? 'Break Active' : "Today's Work Time"}
        </span>
        <div className="att-v2-elapsed-time">{formatDuration(elapsedSeconds)}</div>
        <span className="att-v2-status-sub">
          {isWorking ? 'Working now' : isOnBreak ? 'On Break • Relaxing' : todayData?.status || 'Ready to clock in'}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="att-v2-punch-actions">
        {isOnBreak ? (
          <>
            <button
              className="att-v2-btn-punch resume"
              onClick={() => handlePunch('BREAK_END')}
              disabled={loading}
            >
              <FiLogIn size={18} />
              <span>{loading ? 'Recording...' : 'Check In After Break (Resume)'}</span>
            </button>
            <button
              className="att-v2-btn-punch out"
              onClick={() => handlePunch('OUT')}
              disabled={loading}
              style={{ padding: '10px', fontSize: '13px' }}
            >
              <FiLogOut size={15} />
              <span>Clock Out for Day</span>
            </button>
          </>
        ) : isWorking ? (
          <>
            <button
              className="att-v2-btn-punch out"
              onClick={() => handlePunch('OUT')}
              disabled={loading}
            >
              <FiLogOut size={18} />
              <span>{loading ? 'Recording...' : 'Clock Out'}</span>
            </button>
            <button
              className="att-v2-btn-break"
              onClick={() => handlePunch('BREAK_START')}
              disabled={loading}
            >
              <FiCoffee size={15} />
              <span>Take Break</span>
            </button>
          </>
        ) : (
          <button
            className="att-v2-btn-punch in"
            onClick={() => handlePunch('IN')}
            disabled={loading}
          >
            <FiLogIn size={18} />
            <span>{loading ? 'Recording...' : 'Clock In (Web)'}</span>
          </button>
        )}
      </div>

      {/* Stats Summary */}
      <div className="att-v2-punch-stats">
        <div className="att-v2-stat-box">
          <div className="att-v2-stat-label">First In</div>
          <div className="att-v2-stat-val">{formatTime12h(firstIn)}</div>
        </div>
        <div className="att-v2-stat-box">
          <div className="att-v2-stat-label">Last Out</div>
          <div className="att-v2-stat-val">{formatTime12h(lastOut)}</div>
        </div>
      </div>

      {/* Today's Punches Timeline */}
      {punches.length > 0 && (
        <div style={{ width: '100%', marginTop: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
            Today's Activity ({punches.length})
          </div>
          <div className="att-v2-timeline">
            {punches.map((p, idx) => (
              <div key={p.id || idx} className="att-v2-timeline-item">
                <span className={`att-v2-timeline-badge ${p.punch_type}`}>
                  {p.punch_type}
                </span>
                <span style={{ fontWeight: 600 }}>{formatTime12h(p.punched_at)}</span>
                <span style={{ color: '#94a3b8', fontSize: '11px', marginLeft: 'auto' }}>
                  {p.source || 'WEB'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceV2Clock;
