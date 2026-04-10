import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FiPlus, FiX, FiAlertCircle, FiFileText, FiInfo, FiSend,
  FiCalendar, FiBookOpen, FiClock, FiShield, FiCheckCircle,
  FiActivity, FiChevronLeft, FiChevronRight, FiSearch, FiFilter, FiXCircle
} from 'react-icons/fi';
import leaveAPI from '../../api/attendance/leave.api';
import masterAPI from '../../api/attendance/master.api';
import { API_BASE_URL } from './utils/constants';
import { formatDate } from './utils/helpers';
import toast from 'react-hot-toast';
import { Modal } from 'antd';
import './LeaveManagement.css';

/* -- helpers -- */
const rowClass = status => {
  const map = { approved: 'row-approved', pending: 'row-pending', rejected: 'row-rejected', cancelled: 'row-cancelled' };
  return map[status] || '';
};

const formatSession = (s) => {
  if (!s) return '';
  return s === 'first_half' ? '1st Half' : '2nd Half';
};

const PER_PAGE = 15;

const LeaveManagement = () => {
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState([24]);
  const [applications, setApplications] = useState([]);
  const [settings, setSettings] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  /* filters */
  const [search, setSearch] = useState('');
  const [statusFilt, setStatusFilt] = useState('all');
  const [curPage, setCurPage] = useState(1);

  const [form, setForm] = useState({
    leave_policy_id: '', from_date: '', to_date: '',
    reason: '', is_half_day: false, half_day_session: '', attachment: null,
  });

  const pending = applications.filter(a => a.status === 'pending');
  const selectedPolicy = balances.find(b => b._id === form.leave_policy_id);
  const isLwpPolicy = (policy) => String(policy?.leave_type || '').toLowerCase() === 'lwp';

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [br, ar, sr] = await Promise.all([
        leaveAPI.getBalance(),
        leaveAPI.getApplications(),
        masterAPI.getCompanySettings(),
      ]);
      setBalances(br?.data || []);
      setApplications((ar?.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setSettings(sr || null);
    } catch { toast.error('Failed to load leave data'); }
    finally { setLoading(false); }
  };

  // Real-time Preview Effect
  useEffect(() => {
    const getPreview = async () => {
      // Validate form readiness
      if (form.leave_policy_id && form.from_date && (form.to_date || form.is_half_day)) {
        if (form.is_half_day && !form.from_date) return;
        if (!form.is_half_day && (!form.from_date || !form.to_date)) return;

        setLoadingPreview(true);
        try {
          const res = await leaveAPI.previewLeave({
            leave_policy_id: form.leave_policy_id,
            from_date: form.from_date,
            to_date: form.is_half_day ? form.from_date : form.to_date,
            is_half_day: form.is_half_day.toString()
          });
          
          if (res.success) {
            setPreview(res.data);
          }
        } catch (err) {
          console.error('[Preview Error]', err);
          setPreview(null);
        } finally {
          setLoadingPreview(false);
        }
      } else {
        setPreview(null);
      }
    };

    const timer = setTimeout(getPreview, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [form.leave_policy_id, form.from_date, form.to_date, form.is_half_day]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append('leave_policy_id', form.leave_policy_id);
      fd.append('from_date', form.from_date);
      fd.append('to_date', form.is_half_day ? form.from_date : form.to_date);
      fd.append('reason', form.reason);
      fd.append('is_half_day', form.is_half_day);
      if (form.is_half_day && form.half_day_session) fd.append('half_day_session', form.half_day_session);
      if (form.attachment) fd.append('attachment', form.attachment);

      await leaveAPI.applyLeave(fd);
      toast.success('Leave application submitted');
      setShowModal(false);
      fetchData();
      setForm({ leave_policy_id: '', from_date: '', to_date: '', reason: '', is_half_day: false, half_day_session: '', attachment: null });
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to submit'); }
    finally { setSubmitting(false); }
  };


  const cancel = async (id) => {
    Modal.confirm({
      title: 'Cancel Application',
      content: 'Are you sure you want to cancel this leave application? This action cannot be undone.',
      okText: 'Yes, Cancel',
      okType: 'danger',
      cancelText: 'No, Keep it',
      onOk: async () => {
        try {
          await leaveAPI.cancelLeave(id);
          toast.success('Leave application cancelled');
          fetchData();
        } catch (err) {
          toast.error(err?.response?.data?.message || 'Failed to cancel');
        }
      }
    });
  };

  /* -- filtered + paginated table data -- */
  const filtered = applications.filter(a => {
    const matchStatus = statusFilt === 'all' || a.status === statusFilt;
    const matchSearch = !search ||
      a.leave_type?.toLowerCase().includes(search.toLowerCase()) ||
      a.reason?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const pageRows = filtered.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE);

  const goPage = n => { setCurPage(n); };
  const onFilter = v => { setStatusFilt(v); setCurPage(1); };
  const onSearch = v => { setSearch(v); setCurPage(1); };

  return (
    <div className="lm-page">

      {/* -- Header -- */}
      <div className="lm-hdr">
        <div>
          <h1>Leave Management</h1>
          <p>Your balances and application history</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="lm-guide-btn" onClick={() => setShowGuidelines(v => !v)}>
            <FiBookOpen size={14} /> {showGuidelines ? 'Hide' : 'Guidelines'}
          </button>
          <button className="lm-btn" onClick={() => setShowModal(true)}>
            <FiPlus size={14} /> Apply Leave
          </button>
        </div>
      </div>

      {/* -- Guidelines -- */}
      {showGuidelines && (
        <div className="guide-panel ani-in">
          <div className="guide-hdr">
            <FiShield size={15} color="#6b7280" />
            <h3>Company Leave Guidelines</h3>
          </div>
          <div className="guide-grid">
            <div className="guide-item">
              <div className="guide-icon"><FiClock size={15} /></div>
              <div className="guide-info">
                <span className="guide-lbl">Advance Notice</span>
                <span className="guide-val">
                  {balances.some(b => b.policy?.advance_notice_days > 0)
                    ? `Min. ${Math.min(...balances.filter(b => b.policy?.advance_notice_days > 0).map(b => b.policy.advance_notice_days))} day(s)`
                    : 'No requirement'}
                </span>
              </div>
            </div>
            <div className="guide-item">
              <div className="guide-icon"><FiActivity size={15} /></div>
              <div className="guide-info">
                <span className="guide-lbl">Half Day Leave</span>
                <span className="guide-val">
                  {balances.some(b => b.policy?.half_day_allowed) ? 'Allowed' : 'Not allowed'}
                </span>
              </div>
            </div>
            <div className="guide-item">
              <div className="guide-icon"><FiCheckCircle size={15} /></div>
              <div className="guide-info">
                <span className="guide-lbl">Carry Forward</span>
                <span className="guide-val">
                  {settings?.leave_config?.carry_forward_enabled
                    ? `Max ${settings?.leave_config?.max_carry_forward_days || 0} days`
                    : 'Not allowed'}
                </span>
              </div>
            </div>
            <div className="guide-item">
              <div className="guide-icon"><FiShield size={15} /></div>
              <div className="guide-info">
                <span className="guide-lbl">Probation Period</span>
                <span className="guide-val">
                  {settings?.leave_config?.probation_leave_allowed ? 'Leaves allowed' : 'Leaves restricted'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -- Balance grid -- */}
      {loading ? (
        <div className="lm-load"><div className="lm-spin" /></div>
      ) : balances.length === 0 ? (
        <div className="lm-empty"><FiInfo size={22} /><p>No leave policies assigned yet.</p></div>
      ) : (
        <div className="bal-grid">
          {balances.map(b => {
            const total = b.opening_balance || b.total || b.annual_quota || 0;
            const used = b.used ?? 0;
            // The server now returns 'available' as Opening - Used - Pending (Net)
            const availableDisplay = isLwpPolicy(b) ? 'Unlimited' : (b.available ?? (total - used - (b.pending || 0)));
            const pend = b.pending || 0;
            const usedPct = total > 0 ? (used / total) * 100 : 0;
            const exhausted = (total - used) <= 0 && !isLwpPolicy(b);
            return (
              <div key={b._id} className={`bal-tile${exhausted ? ' exhausted' : ''}`}>
                <div className="bal-head">
                  <FiFileText size={13} />
                  {b.name || b.leave_type}
                </div>
                <div className="bal-body">
                  <div className="bal-nums">
                    {isLwpPolicy(b) ? (
                      <span className="bal-big" style={{ fontSize: '1.375rem' }}>Unlimited</span>
                    ) : (
                        <span className="bal-big">{availableDisplay}</span>
                    )}
                  </div>
                  <span className="bal-lbl">Available Days</span>
                  <div className="bal-bar">
                    <div className="bal-fill" style={{ width: isLwpPolicy(b) ? '0%' : `${usedPct}%` }} />
                  </div>
                  <div className="bal-meta">
                    <span className="meta-used">Used: {used}</span>
                    {pend > 0 && <span className="bal-pend">Pending: {pend}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* -- Pending alert -- */}
      {pending.length > 0 && (
        <div className="lm-alert">
          <div className="lm-alert-head">
            <FiAlertCircle size={14} />
            <h3>Awaiting Approval • {pending.length} request{pending.length > 1 ? 's' : ''}</h3>
          </div>
          <div className="lm-alert-rows">
            {pending.map(app => (
              <div key={app._id} className="lm-alert-row">
                <div className="lm-alert-info">
                  <span className="lm-alert-type">{app.leave_type}</span>
                  <span className="lm-alert-dates">
                    {formatDate(app.from_date, 'dd MMM')} – {formatDate(app.to_date, 'dd MMM')} • {app.is_half_day ? `Half Day (${formatSession(app.half_day_session)})` : `${app.total_days}d`}
                  </span>
                </div>
                <button className="lm-cancel" onClick={() => cancel(app._id)}>Cancel</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -- History table -- */}
      <div className="lm-tcard">
        <div className="lm-thead">
          <h3>Application History</h3>
          {/* inline filter bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <FiSearch size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => onSearch(e.target.value)}
                className="sf-input"
                style={{ paddingLeft: 28, width: 160, height: 30 }}
              />
            </div>
            <select
              value={statusFilt}
              onChange={e => onFilter(e.target.value)}
              className="sf-select"
              style={{ height: 30 }}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <span style={{ fontSize: '.75rem', color: 'var(--t3)', whiteSpace: 'nowrap' }}>
              {filtered.length} record{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="tscroll">
          <table className="dtable">
            <thead>
              <tr>
                <th>Leave Type</th>
                <th>Date Range</th>
                <th>Days</th>
                <th>Status</th>
                <th>Applied On</th>
                <th>Reviewed By</th>
                <th>Reason</th>
                <th>Decision Remark</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length > 0 ? pageRows.map((app, i) => (
                <tr key={i} className={rowClass(app.status)}>

                  {/* Leave type */}
                  <td>
                    <div className="dt-type">
                      <span className="dt-type-name">{app.leave_type}</span>
                      {app.is_half_day && <span className="dt-type-half" style={{ textTransform: 'none' }}>{formatSession(app.half_day_session)}</span>}
                    </div>
                  </td>

                  {/* Date range */}
                  <td>
                    <div className="dt-dates">
                      <span className="dt-date-range">
                        {formatDate(app.from_date, 'dd MMM yyyy')}
                        {app.from_date !== app.to_date && ` – ${formatDate(app.to_date, 'dd MMM yyyy')}`}
                      </span>
                      {app.half_day_session && (
                        <span className="dt-date-days" style={{ textTransform: 'none' }}>
                          {formatSession(app.half_day_session)}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Days */}
                  <td>
                    <span className="dt-days">{app.is_half_day ? 'Half Day' : `${app.total_days}d`}</span>
                  </td>

                  {/* Status badge */}
                  <td>
                    <span className={`lmbadge ${app.status || 'default'}`}>
                      {app.status || '-'}
                    </span>
                  </td>

                  {/* Applied on */}
                  <td>
                    <span className="dt-applied">{formatDate(app.createdAt, 'dd MMM yyyy')}</span>
                  </td>

                  {/* Reviewed by */}
                  <td>
                    <span className="dt-applied">
                      {app.reviewed_by || '-'}
                      {app.reviewed_by_role ? ` (${app.reviewed_by_role})` : ''}
                    </span>
                  </td>

                  {/* Reason */}
                  <td title={app.reason} style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {app.attachment_urls && app.attachment_urls.length > 0 && (
                      <a
                        href={`${API_BASE_URL.replace('/api', '')}/${app.attachment_urls[0]}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ marginRight: 6, color: 'var(--t3)' }}
                        title="View Document"
                      >
                        <FiFileText size={12} />
                      </a>
                    )}
                    {app.reason || '-'}
                  </td>

                  {/* Decision Remark */}
                  <td
                    title={app.reviewer_remark || app.rejection_reason || ''}
                    style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {app.reviewer_remark || app.rejection_reason || '-'}
                  </td>

                </tr>
              )) : (
                <tr>
                  <td colSpan={8} className="dt-empty">No applications found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="atn-pages">
            <span className="atn-pinfo">
              Showing {(curPage - 1) * PER_PAGE + 1} to {Math.min(curPage * PER_PAGE, filtered.length)} of {filtered.length}
            </span>
            <div className="atn-pnums">
              <button className="atn-pnum" disabled={curPage === 1} onClick={() => goPage(curPage - 1)}>
                <FiChevronLeft size={12} />
              </button>
              {(() => {
                const range = [];
                const left = Math.max(2, curPage - 2);
                const right = Math.min(totalPages - 1, curPage + 2);
                range.push(1);
                if (left > 2) range.push('...');
                for (let n = left; n <= right; n++) range.push(n);
                if (right < totalPages - 1) range.push('...');
                if (totalPages > 1) range.push(totalPages);
                return range.map((n, idx) => n === '...' ? (
                  <span key={`e${idx}`} style={{ padding: '0 4px', color: 'var(--t3)', fontSize: '.8125rem' }}>...</span>
                ) : (
                  <button key={n} className={`atn-pnum${curPage === n ? ' on' : ''}`} onClick={() => goPage(n)}>{n}</button>
                ));
              })()}
              <button className="atn-pnum" disabled={curPage === totalPages} onClick={() => goPage(curPage + 1)}>
                <FiChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* -- Apply Modal -- */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="lm-modal" onClick={e => e.stopPropagation()}>
            <div className="lm-modal-head">
              <h2><FiCalendar size={15} /> Apply for Leave</h2>
              <button className="lm-mclose" onClick={() => setShowModal(false)}>
                <FiX size={13} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="lm-form">

              {/* Leave type */}
              <div className="fg">
                <label>Leave Type</label>
                <select
                  value={form.leave_policy_id}
                  onChange={e => setForm({ ...form, leave_policy_id: e.target.value })}
                  required
                >
                  <option value="">Select leave type...</option>
                  {balances
                    .map(b => {
                      const netBalance = isLwpPolicy(b) ? 'Unlimited' : (b.available ?? (b.opening_balance - (b.used || 0) - (b.pending || 0)));
                      return (
                        <option key={b._id} value={b._id}>
                          {b.name}
                          {isLwpPolicy(b) ? ' (Unlimited)' : ` • ${netBalance} days left`}
                        </option>
                      );
                    })
                  }
                </select>
              </div>

              {/* Policy preview */}
              {selectedPolicy && (
                <div className="policy-highlight ani-in">
                  <div className="ph-item">
                    <FiClock size={12} className="ph-icon" />
                    Notice: <span className="ph-val">{selectedPolicy.policy?.advance_notice_days || 0}d</span>
                  </div>
                  <div className="ph-item">
                    <FiInfo size={12} className="ph-icon" />
                    Max/app: <span className="ph-val">{selectedPolicy.policy?.max_days_per_application || '-'}d</span>
                  </div>
                  <div className="ph-item">
                    <FiActivity size={12} className="ph-icon" />
                    Half day: <span className="ph-val">{selectedPolicy.policy?.half_day_allowed ? 'Allowed' : 'No'}</span>
                  </div>
                  <div className="ph-item">
                    <FiFileText size={12} className="ph-icon" />
                    Doc req: <span className="ph-val">{selectedPolicy.policy?.document_required_after_days ? `>${selectedPolicy.policy.document_required_after_days}d` : 'No'}</span>
                  </div>
                </div>
              )}

              {/* Zero-balance warning specifically for PL */}
              {selectedPolicy && 
               (selectedPolicy.leave_type === 'privilege' || selectedPolicy.leave_code === 'PL') && 
               (selectedPolicy.available <= 0) && (
                <div className="lm-alert ani-in" style={{ 
                    margin: '10px 0', 
                    padding: '10px 12px', 
                    background: 'var(--s-red-bg)', 
                    borderColor: 'var(--s-red-br, var(--s-red-bg))' 
                }}>
                  <div className="lm-alert-head" style={{ marginBottom: 0, color: 'var(--s-red)' }}>
                    <FiXCircle size={14} />
                    <h3 style={{ color: 'var(--s-red)', fontSize: '.8125rem' }}>Contact admin for update PL</h3>
                  </div>
                </div>
              )}

              {/* Half day toggle */}
              <div className="toggle-row">
                <div>
                  <div className="toggle-txt">Half Day Leave</div>
                  <div style={{ fontSize: '.6875rem', color: '#9ca3af', marginTop: 2 }}>
                    {form.is_half_day ? 'Select one date only' : 'Select a date range'}
                  </div>
                </div>
                <label className="sw">
                  <input
                    type="checkbox"
                    checked={form.is_half_day}
                    onChange={e => setForm({ ...form, is_half_day: e.target.checked, to_date: '', half_day_session: '' })}
                  />
                  <span className="sw-slider" />
                </label>
              </div>

              {/* Dates */}
              {form.is_half_day ? (
                <div className="fg">
                  <label>Date</label>
                  <input
                    type="date"
                    value={form.from_date}
                    onChange={e => setForm({ ...form, from_date: e.target.value })}
                    required
                  />
                </div>
              ) : (
                <div className="fg2">
                  <div className="fg">
                    <label>From</label>
                    <input type="date" value={form.from_date} onChange={e => setForm({ ...form, from_date: e.target.value })} required />
                  </div>
                  <div className="fg">
                    <label>To</label>
                    <input type="date" value={form.to_date} onChange={e => setForm({ ...form, to_date: e.target.value })} required />
                  </div>
                </div>
              )}

              {/* Session */}
              {form.is_half_day && (
                <div className="fg ani-in">
                  <label>Session</label>
                  <select value={form.half_day_session} onChange={e => setForm({ ...form, half_day_session: e.target.value })} required>
                    <option value="">Select session...</option>
                    <option value="first_half">First Half (Morning)</option>
                    <option value="second_half">Second Half (Afternoon)</option>
                  </select>
                </div>
              )}

              {/* Reason */}
              <div className="fg">
                <label>Reason</label>
                <textarea
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  required
                  rows={3}
                  placeholder="Briefly describe the reason..."
                />
              </div>

              {/* Attachment */}
              <div className="fg">
                <label>Supporting Document <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
                <input type="file" onChange={e => setForm({ ...form, attachment: e.target.files[0] })} />
              </div>

              {/* Projected Balance Preview */}
              {form.leave_policy_id && form.from_date && (form.to_date || form.is_half_day) && (
                <div className={`projection-card ani-in${loadingPreview ? ' loading' : ''}`}>
                  {loadingPreview ? (
                    <div className="proj-loader">Calculating remaining balance...</div>
                  ) : preview ? (
                    isLwpPolicy(selectedPolicy) ? (
                      <div className="proj-row final">
                        <span>Remaining Balance:</span>
                        <span className="final-val">Unlimited</span>
                      </div>
                    ) : (
                      <div className="proj-row final">
                        <span>Remaining Balance:</span>
                        <span className="final-val">
                          {preview.projected_balance} days
                        </span>
                      </div>
                    )
                  ) : (
                    <div className="proj-error">Select a valid date range</div>
                  )}
                </div>
              )}

              <div className="lm-mfooter">
                <button type="submit" className="lm-submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : <><FiSend size={14} /> Submit Request</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default LeaveManagement;
