import React, { useState, useEffect } from 'react';
import {
  FiArrowLeft, FiActivity, FiRefreshCw, FiCheckCircle, FiAlertCircle, FiUsers,
  FiLink, FiDatabase, FiArrowRight, FiShield, FiSliders, FiClock,
  FiTerminal, FiCheck
} from 'react-icons/fi';
import attendanceV2API from '../../api/attendance/attendanceV2.api';
import toast from 'react-hot-toast';

const AttendanceV2IntegrationAdmin = ({ onBack }) => {
  const [status, setStatus] = useState(null);
  const [eventsLog, setEventsLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [reconcileResult, setReconcileResult] = useState(null);
  const [dryRunSync, setDryRunSync] = useState(true);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const [stRes, evRes] = await Promise.all([
        attendanceV2API.getIntegrationStatus().catch((err) => ({ error: err.message })),
        attendanceV2API.getEventsLog().catch(() => []),
      ]);
      setStatus(stRes);
      setEventsLog(Array.isArray(evRes) ? evRes : []);
      if (stRes?.lastReconcile?.raw) {
        setReconcileResult(stRes.lastReconcile.raw);
      }
    } catch (err) {
      toast.error('Failed to load integration status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handlePollEvents = async () => {
    try {
      setActionLoading(true);
      const res = await attendanceV2API.pollEvents();
      if (res.status === 'SUCCESS') {
        toast.success(`Polled HRMS: ${res.eventsReceived} events received, ${res.eventsApplied} applied!`);
      } else {
        toast('Poll completed: ' + (res.status || 'Done'), { icon: 'ℹ️' });
      }
      loadStatus();
    } catch (err) {
      toast.error('Poll failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunReconcile = async () => {
    try {
      setActionLoading(true);
      const res = await attendanceV2API.runReconciliation();
      setReconcileResult(res);
      toast.success(`Reconciliation finished: ${res.matched || 0} matched identities.`);
      loadStatus();
    } catch (err) {
      toast.error('Reconciliation failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncAll = async () => {
    try {
      setActionLoading(true);
      const res = await attendanceV2API.syncAllUsers(dryRunSync);
      toast.success(
        `Bulk sync ${dryRunSync ? '(Dry Run)' : ''} done! Created: ${res.created}, Updated: ${res.updated}, Unchanged: ${res.unchanged}, Failed: ${res.failed}`
      );
      loadStatus();
    } catch (err) {
      toast.error('Sync failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLinkEmployees = async (dryRun = true) => {
    try {
      setActionLoading(true);
      const res = await attendanceV2API.linkEmployees(dryRun);
      toast.success(
        `Link ${dryRun ? '(Dry Run)' : ''} completed! Matched: ${res.matched?.length || 0}, Already linked: ${res.already_linked?.length || 0}`
      );
      loadStatus();
    } catch (err) {
      toast.error('Link failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="att-v2-card" style={{ padding: '60px', textAlign: 'center' }}>
        <FiActivity size={32} className="spinning" style={{ color: 'var(--att-primary)', marginBottom: '12px' }} />
        <p style={{ margin: 0, color: 'var(--att-text-muted)', fontSize: '14px' }}>Loading HRMS integration status & heartbeat...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Live Status KPI Cards */}
      <div className="att-v2-kpi-grid">
        <div className="att-v2-kpi-card">
          <div className="att-v2-kpi-icon green">
            <FiActivity />
          </div>
          <div className="att-v2-kpi-info">
            <h4>Live Engine</h4>
            <p style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
              <span>{status?.engineActive ? 'Active (5m Interval)' : 'Active (Polling)'}</span>
            </p>
          </div>
        </div>

        <div className="att-v2-kpi-card">
          <div className="att-v2-kpi-icon blue">
            <FiShield />
          </div>
          <div className="att-v2-kpi-info">
            <h4>HRMS API Host</h4>
            <p style={{ fontSize: '15px', color: 'var(--att-text)' }}>hrmsapi.alvision.in</p>
          </div>
        </div>

        <div className="att-v2-kpi-card">
          <div className="att-v2-kpi-icon purple">
            <FiDatabase />
          </div>
          <div className="att-v2-kpi-info">
            <h4>Stream Cursor</h4>
            <p style={{ fontSize: '15px', fontFamily: 'monospace' }}>
              {status?.lastEventCursor ? `#${status.lastEventCursor}` : '#0 (Genesis)'}
            </p>
          </div>
        </div>

        <div className="att-v2-kpi-card">
          <div className="att-v2-kpi-icon amber">
            <FiUsers />
          </div>
          <div className="att-v2-kpi-info">
            <h4>Sync Health</h4>
            <p style={{ fontSize: '15px', color: status?.lastError ? '#ef4444' : '#10b981' }}>
              {status?.lastError ? 'Has Alerts' : '100% Operational'}
            </p>
          </div>
        </div>
      </div>

      {/* Sync Control Center */}
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
            <div>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FiSliders className="text-primary" />
                <span>Bi-Directional Sync Control Center</span>
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--att-text-muted)' }}>
                Execute ad-hoc synchronization runs, inspect event stream deltas, and link identities
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {/* Dry Run Toggle Switch */}
            <label className="att-v2-switch-container">
              <span style={{ fontSize: '13px', fontWeight: 700, color: dryRunSync ? 'var(--att-primary)' : 'var(--att-text-muted)' }}>
                Dry-Run Mode: <strong>{dryRunSync ? 'ON (Safe)' : 'OFF (Live)'}</strong>
              </span>
              <div className="att-v2-switch">
                <input
                  type="checkbox"
                  checked={dryRunSync}
                  onChange={(e) => setDryRunSync(e.target.checked)}
                />
                <span className="att-v2-switch-slider" />
              </div>
            </label>

            <button
              className="att-v2-btn-secondary"
              onClick={loadStatus}
              disabled={actionLoading}
              title="Refresh status"
            >
              <FiRefreshCw size={14} className={actionLoading ? 'spinning' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          <button
            className="att-v2-btn-primary"
            onClick={handlePollEvents}
            disabled={actionLoading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 18px' }}
          >
            <FiRefreshCw size={16} className={actionLoading ? 'spinning' : ''} />
            <span>Poll Events Feed</span>
          </button>

          <button
            className="att-v2-btn-secondary"
            onClick={handleRunReconcile}
            disabled={actionLoading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 18px' }}
          >
            <FiSliders size={16} />
            <span>Run Reconciliation</span>
          </button>

          <button
            className="att-v2-btn-secondary"
            onClick={handleSyncAll}
            disabled={actionLoading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 18px' }}
          >
            <FiDatabase size={16} />
            <span>{dryRunSync ? 'Preview Sync All' : 'Push All to HRMS'}</span>
          </button>

          <button
            className="att-v2-btn-secondary"
            onClick={() => handleLinkEmployees(true)}
            disabled={actionLoading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 18px' }}
          >
            <FiLink size={16} />
            <span>Link Dry Run</span>
          </button>

          <button
            className="att-v2-btn-secondary"
            onClick={() => handleLinkEmployees(false)}
            disabled={actionLoading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 18px', borderColor: '#a7f3d0', background: '#ecfdf5', color: '#047857', fontWeight: 700 }}
          >
            <FiCheckCircle size={16} />
            <span>Apply Link Matches</span>
          </button>
        </div>

        {/* Status Metadata details */}
        <div style={{
          display: 'flex',
          gap: '24px',
          flexWrap: 'wrap',
          fontSize: '12px',
          color: 'var(--att-text-muted)',
          background: 'var(--att-surface-muted)',
          padding: '14px 18px',
          borderRadius: 'var(--att-radius-md)',
          border: '1px solid var(--att-border)'
        }}>
          <div>Last Polled: <strong style={{ color: 'var(--att-text)' }}>{status?.lastPolledAt ? new Date(status.lastPolledAt).toLocaleTimeString() : 'Never'}</strong></div>
          <div>Last Success: <strong style={{ color: '#10b981' }}>{status?.lastSuccessAt ? new Date(status.lastSuccessAt).toLocaleTimeString() : 'Never'}</strong></div>
          <div>Total Poll Cycles: <strong style={{ color: 'var(--att-text)' }}>{status?.totalPolls || 0}</strong></div>
          {status?.lastError && <div style={{ color: '#ef4444' }}>Last Error: <strong>{status.lastError}</strong></div>}
        </div>
      </div>

      {/* Reconciliation Results Section */}
      {reconcileResult && (
        <div className="att-v2-card">
          <div className="att-v2-card-header">
            <h3>
              <FiCheckCircle style={{ color: '#10b981' }} />
              <span>Identity Reconciliation Report</span>
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '18px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', color: '#065f46', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>MATCHED IN BOTH</div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#047857', marginTop: '6px' }}>{reconcileResult.matched || 0}</div>
            </div>

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '18px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>IN HRMS (AWAITING LINK)</div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#1d4ed8', marginTop: '6px' }}>{reconcileResult.active_in_hrms_not_in_app?.length || 0}</div>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '18px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', color: '#92400e', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>IN EXIM (NOT IN HRMS)</div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#b45309', marginTop: '6px' }}>{reconcileResult.in_app_not_in_hrms?.length || 0}</div>
            </div>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '18px', borderRadius: '12px' }}>
              <div style={{ fontSize: '11px', color: '#991b1b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>SEPARATED IN HRMS</div>
              <div style={{ fontSize: '28px', fontWeight: 900, color: '#b91c1c', marginTop: '6px' }}>{reconcileResult.separated_in_hrms_active_in_app?.length || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* Events Feed Audit Log */}
      <div className="att-v2-card">
        <div className="att-v2-card-header">
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiTerminal className="text-primary" />
              <span>HRMS Event Stream Audit Log ({eventsLog.length})</span>
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--att-text-muted)' }}>
              Real-time audit log of lifecycle events pulled from HRMS
            </p>
          </div>
        </div>

        {eventsLog.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--att-text-muted)' }}>
            <p style={{ margin: 0 }}>No events recorded in the sync stream yet. Click "Poll Events Feed" to pull latest events from HRMS.</p>
          </div>
        ) : (
          <div className="att-v2-table-wrapper">
            <table className="att-v2-table">
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Employment ID</th>
                  <th>External ID</th>
                  <th>Outcome</th>
                  <th>Occurred At</th>
                  <th>Processed At</th>
                </tr>
              </thead>
              <tbody>
                {eventsLog.map((ev, idx) => (
                  <tr key={idx}>
                    <td>
                      <span className="att-v2-chip" style={{
                        background: ev.eventType?.includes('hired') ? '#ecfdf5' : ev.eventType?.includes('separated') ? '#fff1f2' : '#eef2ff',
                        color: ev.eventType?.includes('hired') ? '#065f46' : ev.eventType?.includes('separated') ? '#991b1b' : '#3730a3',
                        borderColor: ev.eventType?.includes('hired') ? '#a7f3d0' : ev.eventType?.includes('separated') ? '#fecdd3' : '#c7d2fe',
                        fontWeight: 700,
                        fontSize: '11px',
                      }}>
                        {ev.eventType}
                      </span>
                    </td>
                    <td><code style={{ fontSize: '12px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{ev.employmentId || '-'}</code></td>
                    <td><code style={{ fontSize: '12px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{ev.externalId || '-'}</code></td>
                    <td>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: 'var(--att-radius-pill)',
                        fontSize: '11px',
                        fontWeight: 800,
                        background: ev.outcome === 'FAILED' ? '#fee2e2' : '#dcfce7',
                        color: ev.outcome === 'FAILED' ? '#991b1b' : '#166534',
                      }}>
                        {ev.outcome}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--att-text-secondary)' }}>{ev.occurredAt ? new Date(ev.occurredAt).toLocaleString() : '-'}</td>
                    <td style={{ fontSize: '12px', color: 'var(--att-text-secondary)' }}>{ev.processedAt ? new Date(ev.processedAt).toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceV2IntegrationAdmin;
