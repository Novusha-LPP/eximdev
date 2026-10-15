import React, { useState, useEffect } from 'react';
import {
  FiActivity, FiRefreshCw, FiCheckCircle, FiAlertCircle, FiUsers,
  FiLink, FiDatabase, FiArrowRight, FiShield, FiSliders
} from 'react-icons/fi';
import attendanceV2API from '../../api/attendance/attendanceV2.api';
import toast from 'react-hot-toast';

const AttendanceV2IntegrationAdmin = () => {
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
      <div className="att-v2-card" style={{ padding: '30px', textAlign: 'center' }}>
        <p>Loading HRMS integration status...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Live Status Cards */}
      <div className="att-v2-kpi-grid">
        <div className="att-v2-kpi-card">
          <div className="att-v2-kpi-icon green">
            <FiActivity />
          </div>
          <div className="att-v2-kpi-info">
            <h4>Live Engine</h4>
            <p style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              Connected
            </p>
          </div>
        </div>

        <div className="att-v2-kpi-card">
          <div className="att-v2-kpi-icon blue">
            <FiDatabase />
          </div>
          <div className="att-v2-kpi-info">
            <h4>Events Feed Cursor</h4>
            <p style={{ fontSize: '15px', fontFamily: 'monospace' }}>{status?.lastCursor || 'c_000000000000'}</p>
          </div>
        </div>

        <div className="att-v2-kpi-card">
          <div className="att-v2-kpi-icon purple">
            <FiUsers />
          </div>
          <div className="att-v2-kpi-info">
            <h4>Events Processed</h4>
            <p>{status?.totalEventsProcessed || 0} Events</p>
          </div>
        </div>

        <div className="att-v2-kpi-card">
          <div className="att-v2-kpi-icon amber">
            <FiShield />
          </div>
          <div className="att-v2-kpi-info">
            <h4>Active API Key</h4>
            <p style={{ fontSize: '13px', fontFamily: 'monospace' }}>{status?.apiKeyPrefix || 'hrms_test_...'}</p>
          </div>
        </div>
      </div>

      {/* Control Panel Card */}
      <div className="att-v2-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: '600' }}>
              HRMS Two-Way Live Synchronization Operations
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--att-text-muted)' }}>
              Target Endpoint: <code>{status?.baseUrl || 'http://hrmsapi.alvision.in'}</code> • System Code: <strong>{status?.systemCode || 'EXIM'}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={dryRunSync}
                onChange={(e) => setDryRunSync(e.target.checked)}
              />
              <span>Dry Run Mode</span>
            </label>

            <button
              className="att-v2-btn-secondary"
              onClick={loadStatus}
              disabled={actionLoading}
              title="Refresh status"
            >
              <FiRefreshCw size={14} className={actionLoading ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          <button
            className="att-v2-btn-primary"
            onClick={handlePollEvents}
            disabled={actionLoading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 16px' }}
          >
            <FiRefreshCw size={16} />
            <span>Poll Events Feed</span>
          </button>

          <button
            className="att-v2-btn-secondary"
            onClick={handleRunReconcile}
            disabled={actionLoading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 16px' }}
          >
            <FiSliders size={16} />
            <span>Run Reconciliation</span>
          </button>

          <button
            className="att-v2-btn-secondary"
            onClick={handleSyncAll}
            disabled={actionLoading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 16px' }}
          >
            <FiDatabase size={16} />
            <span>{dryRunSync ? 'Preview Sync All' : 'Push All to HRMS'}</span>
          </button>

          <button
            className="att-v2-btn-secondary"
            onClick={() => handleLinkEmployees(true)}
            disabled={actionLoading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 16px' }}
          >
            <FiLink size={16} />
            <span>Link Dry Run</span>
          </button>

          <button
            className="att-v2-btn-secondary"
            onClick={() => handleLinkEmployees(false)}
            disabled={actionLoading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px 16px', borderColor: '#10b981', color: '#047857' }}
          >
            <FiCheckCircle size={16} />
            <span>Apply Link Matches</span>
          </button>
        </div>

        {/* Status Metadata details */}
        <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: 'var(--att-text-muted)', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px' }}>
          <div>Last Polled: <strong>{status?.lastPolledAt ? new Date(status.lastPolledAt).toLocaleTimeString() : 'Never'}</strong></div>
          <div>Last Success: <strong>{status?.lastSuccessAt ? new Date(status.lastSuccessAt).toLocaleTimeString() : 'Never'}</strong></div>
          <div>Total Poll Cycles: <strong>{status?.totalPolls || 0}</strong></div>
          {status?.lastError && <div style={{ color: '#ef4444' }}>Error: <strong>{status.lastError}</strong></div>}
        </div>
      </div>

      {/* Reconciliation Results Section */}
      {reconcileResult && (
        <div className="att-v2-card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FiCheckCircle style={{ color: '#10b981' }} />
            <span>Reconciliation Report</span>
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', color: '#065f46', fontWeight: '600' }}>MATCHED IN BOTH</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#047857', marginTop: '4px' }}>{reconcileResult.matched || 0}</div>
            </div>

            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: '600' }}>IN HRMS (AWAITING LINK)</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#1d4ed8', marginTop: '4px' }}>{reconcileResult.active_in_hrms_not_in_app?.length || 0}</div>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', color: '#92400e', fontWeight: '600' }}>IN EXIM (NOT IN HRMS)</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#b45309', marginTop: '4px' }}>{reconcileResult.in_app_not_in_hrms?.length || 0}</div>
            </div>

            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '14px', borderRadius: '10px' }}>
              <div style={{ fontSize: '12px', color: '#991b1b', fontWeight: '600' }}>SEPARATED IN HRMS</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#b91c1c', marginTop: '4px' }}>{reconcileResult.separated_in_hrms_active_in_app?.length || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* Events Feed Audit Log */}
      <div className="att-v2-card" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '17px', fontWeight: '600' }}>
          HRMS Events Stream Audit Log ({eventsLog.length})
        </h3>

        {eventsLog.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--att-text-muted)' }}>
            <p>No events recorded in the sync stream yet. Click "Poll Events Feed" to pull latest events from HRMS.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="att-v2-table" style={{ width: '100%' }}>
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
                      <span className={`att-v2-badge ${ev.eventType?.includes('hired') ? 'green' : ev.eventType?.includes('separated') ? 'red' : 'blue'}`}>
                        {ev.eventType}
                      </span>
                    </td>
                    <td><code style={{ fontSize: '12px' }}>{ev.employmentId || '-'}</code></td>
                    <td><code style={{ fontSize: '12px' }}>{ev.externalId || '-'}</code></td>
                    <td>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        background: ev.outcome === 'FAILED' ? '#fee2e2' : '#dcfce7',
                        color: ev.outcome === 'FAILED' ? '#991b1b' : '#166534',
                      }}>
                        {ev.outcome}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px' }}>{ev.occurredAt ? new Date(ev.occurredAt).toLocaleString() : '-'}</td>
                    <td style={{ fontSize: '12px' }}>{ev.processedAt ? new Date(ev.processedAt).toLocaleString() : '-'}</td>
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
