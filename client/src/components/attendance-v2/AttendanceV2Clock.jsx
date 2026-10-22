import React, { useState, useEffect } from "react";
import { FiLogIn, FiLogOut, FiCoffee, FiClock, FiActivity, FiMapPin, FiCheckCircle } from "react-icons/fi";
import toast from "react-hot-toast";
import attendanceV2API from "../../api/attendance/attendanceV2.api";

const formatTime12h = (val) => {
  if (!val) return "--:--";
  if (typeof val === "string") {
    const s = val.trim();
    if (/^(0?[1-9]|1[0-2]):[0-5][0-9](:[0-5][0-9])?\s*(AM|PM)$/i.test(s)) {
      return s;
    }
    if (/^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(s)) {
      const parts = s.split(":");
      const h = Number(parts[0]);
      const m = Number(parts[1]);
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
    }
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return typeof val === "string" ? val : "--:--";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

const formatDuration = (totalSeconds) => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = String(Math.floor(safe / 3600)).padStart(2, "0");
  const m = String(Math.floor((safe % 3600) / 60)).padStart(2, "0");
  const s = String(safe % 60).padStart(2, "0");
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
    todayData?.status === "ON_BREAK" ||
    (lastPunch && lastPunch.punch_type === "BREAK_START")
  );

  const isWorking = Boolean(
    !isOnBreak && (
      todayData?.is_punched_in ||
      (lastPunch && (lastPunch.punch_type === "IN" || lastPunch.punch_type === "BREAK_END"))
    )
  );

  const firstIn = todayData?.first_punch_in || todayData?.first_in || todayData?.in_time;
  const lastOut = todayData?.last_punch_out || todayData?.last_out || todayData?.out_time;
  const effectiveMinutes =
    todayData?.effective_minutes ??
    (todayData?.net_work_hours
      ? Math.round(todayData.net_work_hours * 60)
      : todayData?.total_work_hours
      ? Math.round(todayData.total_work_hours * 60)
      : 0);

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

  // Standard 8-hour shift in seconds = 28800s
  const targetSeconds = 8 * 3600;
  const progressRatio = Math.min(1, elapsedSeconds / targetSeconds);
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - progressRatio * circumference;

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
        source: "WEB",
        ...coords,
      });

      let label = "Punch recorded successfully";
      if (punchType === "IN") {
        label = res?.resolved_from_break ? "Checked in after break — Welcome back!" : "Clocked In successfully — Have a productive day!";
      } else if (punchType === "OUT") {
        label = "Clocked Out successfully — Great work today!";
      } else if (punchType === "BREAK_START") {
        label = "Break started — Enjoy your break!";
      } else if (punchType === "BREAK_END") {
        label = "Break ended — Welcome back!";
      }

      toast.success(label);
      if (onRefresh) onRefresh();
    } catch (err) {
      const serverMsg = err?.response?.data?.message || err?.message;
      if (err?.response?.status === 409) {
        if (punchType === "IN") {
          toast.error(serverMsg || "You are currently on break. Please click Check In After Break to resume work.");
        } else {
          toast.error(serverMsg || "Punch state conflict. Please refresh and try again.");
        }
      } else {
        toast.error(serverMsg || "Failed to record punch");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="att-v2-punch-card">
      <div className="att-v2-punch-card-header">
        <div className="att-v2-punch-title">
          <FiClock style={{ color: "var(--att-primary)" }} size={18} />
          <span>Punch Terminal</span>
        </div>
        <div className={`att-v2-punch-state-badge ${isWorking ? "in" : isOnBreak ? "break" : "out"}`}>
          {isWorking && <span className="att-v2-pulse-dot" />}
          {isOnBreak && <span className="att-v2-pulse-dot break" />}
          <span>{isWorking ? "Clocked In" : isOnBreak ? "On Break" : "Clocked Out"}</span>
        </div>
      </div>

      {/* SVG CHRONOGRAPH DIAL */}
      <div className="att-v2-dial-container">
        <svg className="att-v2-dial-svg" viewBox="0 0 210 210">
          <defs>
            <linearGradient id="att-grad-work" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="att-grad-break" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>

          {/* Background Track */}
          <circle
            className="att-v2-dial-bg-circle"
            cx="105"
            cy="105"
            r={radius}
          />

          {/* Dynamic Progress Ring */}
          <circle
            className={`att-v2-dial-progress ${isWorking ? "working" : isOnBreak ? "break" : "idle"}`}
            cx="105"
            cy="105"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>

        {/* Center Clock Readout */}
        <div className="att-v2-dial-content">
          <span className="att-v2-elapsed-label">
            {isOnBreak ? "Break Elapsed" : isWorking ? "Live Session" : "Today's Work"}
          </span>
          <div className="att-v2-elapsed-time">
            {formatDuration(elapsedSeconds)}
          </div>
          <span className="att-v2-status-sub">
            {isWorking
              ? `${Math.round(progressRatio * 100)}% of 8h shift`
              : isOnBreak
              ? "Paused for break"
              : todayData?.status || "Ready to clock in"}
          </span>
        </div>
      </div>

      {/* ACTION PUNCH BUTTONS */}
      <div className="att-v2-punch-actions">
        {isOnBreak ? (
          <>
            <button
              className="att-v2-btn-punch resume"
              onClick={() => handlePunch("BREAK_END")}
              disabled={loading}
            >
              <FiLogIn size={18} />
              <span>{loading ? "Recording..." : "Check In After Break (Resume)"}</span>
            </button>
            <button
              className="att-v2-btn-punch out"
              onClick={() => handlePunch("OUT")}
              disabled={loading}
              style={{ padding: "11px", fontSize: "13px" }}
            >
              <FiLogOut size={16} />
              <span>Clock Out for Day</span>
            </button>
          </>
        ) : isWorking ? (
          <>
            <button
              className="att-v2-btn-punch out"
              onClick={() => handlePunch("OUT")}
              disabled={loading}
            >
              <FiLogOut size={18} />
              <span>{loading ? "Recording..." : "Clock Out"}</span>
            </button>
            <button
              className="att-v2-btn-break"
              onClick={() => handlePunch("BREAK_START")}
              disabled={loading}
            >
              <FiCoffee size={16} />
              <span>Take Break</span>
            </button>
          </>
        ) : (
          <button
            className="att-v2-btn-punch in"
            onClick={() => handlePunch("IN")}
            disabled={loading}
          >
            <FiLogIn size={18} />
            <span>{loading ? "Recording..." : "Clock In (Web Terminal)"}</span>
          </button>
        )}
      </div>

      {/* QUICK STATS */}
      <div className="att-v2-punch-stats">
        <div className="att-v2-stat-box">
          <div className="att-v2-stat-label">First Punch In</div>
          <div className="att-v2-stat-val">{formatTime12h(firstIn)}</div>
        </div>
        <div className="att-v2-stat-box">
          <div className="att-v2-stat-label">Last Punch Out</div>
          <div className="att-v2-stat-val">{formatTime12h(lastOut)}</div>
        </div>
      </div>

      {/* TODAY'S ACTIVITY TIMELINE */}
      {punches.length > 0 && (
        <div className="att-v2-timeline-section">
          <div className="att-v2-timeline-title">
            <span>Today's Timeline</span>
            <span style={{ color: "var(--att-primary)", fontWeight: 800 }}>{punches.length} punches</span>
          </div>
          <div className="att-v2-timeline">
            {punches.map((p, idx) => (
              <div key={p.id || idx} className="att-v2-timeline-item">
                <span className={`att-v2-timeline-badge ${p.punch_type}`}>
                  {p.punch_type.replace("_", " ")}
                </span>
                <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                  {formatTime12h(p.punched_at)}
                </span>
                <span style={{ color: "var(--att-text-muted)", fontSize: "11px", marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px" }}>
                  <FiMapPin size={11} />
                  <span>{p.source || "WEB"}</span>
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
