import React, { useState, useEffect } from 'react';
import { FiPlus, FiX, FiClock, FiAlertCircle, FiCheckCircle, FiEdit3 } from 'react-icons/fi';
import attendanceAPI from '../../api/attendance/attendance.api';
import { formatDate, formatTime12Hr } from './utils/helpers';
import toast from 'react-hot-toast';
import './Regularization.css';

const TYPE_LABELS = { missing_punch: 'Missing Punch', late_in: 'Late Check-in', early_out: 'Early Check-out' };

const StatusIcon = ({ status }) => {
  if (status === 'approved') return <FiCheckCircle size={16} />;
  if (status === 'rejected') return <FiX size={16} />;
  return <FiClock size={16} />;
};

const Regularization = () => {
  const [loading,  setLoading]  = useState(true);
  const [requests, setRequests] = useState([]);
  const [modal,    setModal]    = useState(false);
  const [submitting, setSub]    = useState(false);
  const [form, setForm] = useState({ date:'', type:'missing_punch', in_time:'', out_time:'', reason:'' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { setLoading(true); const r = await attendanceAPI.getRegularizations(); setRequests(r?.data || []); }
    catch { toast.error('Failed to load requests'); }
    finally { setLoading(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      setSub(true);
      await attendanceAPI.requestRegularization(form);
      toast.success('Request submitted');
      setModal(false); load();
      setForm({ date:'', type:'missing_punch', in_time:'', out_time:'', reason:'' });
    } catch { toast.error('Failed to submit'); }
    finally { setSub(false); }
  };

  const cancel = async (id) => {
    if (!window.confirm('Cancel this request?')) return;
    try { toast.success('Request cancelled'); load(); }
    catch { toast.error('Failed to cancel'); }
  };

  return (
    <div className="reg-page">
      <div className="rg-hdr">
        <div><h1>Regularization</h1><p>Attendance correction requests</p></div>
        <button className="rg-btn" onClick={() => setModal(true)}><FiPlus size={14} /> New Request</button>
      </div>

      {loading ? (
        <div className="rg-load"><div className="rg-spin" /></div>
      ) : requests.length > 0 ? (
        <div className="rg-list">
          {requests.map((r, i) => (
            <div key={i} className={`rg-card ${r.status}`}>
              <div className="rg-ic"><StatusIcon status={r.status} /></div>
              <div className="rg-main">
                <div className="rg-top">
                  <div>
                    <div className="rg-date">{formatDate(r.attendance_date, 'dd MMM yyyy')}</div>
                    <div className="rg-dow">{new Date(r.attendance_date).toLocaleDateString('en', { weekday: 'long' })}</div>
                  </div>
                  <span className={`rgbadge ${r.status}`}>{r.status}</span>
                </div>

                <div className="rg-type">
                  <FiAlertCircle size={14} />
                  {TYPE_LABELS[r.regularization_type] || r.regularization_type}
                </div>

                {(r.requested_in_time || r.requested_out_time) && (
                  <div className="rg-times">
                    {r.requested_in_time && (
                      <div className="rg-chip">
                        <span className="rg-chip-lbl">In</span>
                        <span className="rg-chip-val">{formatTime12Hr(r.requested_in_time)}</span>
                      </div>
                    )}
                    {r.requested_out_time && (
                      <div className="rg-chip">
                        <span className="rg-chip-lbl">Out</span>
                        <span className="rg-chip-val">{formatTime12Hr(r.requested_out_time)}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="rg-reason">
                  <div className="rg-rlbl">Reason</div>
                  <div className="rg-rtxt">{r.reason}</div>
                </div>

                <div className="rg-foot">
                  <span>Submitted {formatDate(r.createdAt, 'dd MMM � hh:mm a')}</span>
                  {r.status === 'pending' && (
                    <button className="rg-cancel-btn" onClick={() => cancel(r._id)}>Cancel Request</button>
                  )}
                  {r.approved_by && <span>� Reviewed by Manager</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rg-empty">
          <FiEdit3 size={36} />
          <h3>No Requests Yet</h3>
          <p>You haven't submitted any regularization requests.</p>
          <button className="rg-btn" onClick={() => setModal(true)}><FiPlus size={14} /> Create Request</button>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="rg-modal" onClick={e => e.stopPropagation()}>
            <div className="rg-mhead">
              <h3>Regularization Request</h3>
              <button className="rg-mclose" onClick={() => setModal(false)}><FiX size={13} /></button>
            </div>
            <form onSubmit={submit} className="rg-mform">
              <div className="mfg">
                <label>Date</label>
                <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
              </div>
              <div className="mfg">
                <label>Issue Type</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} required>
                  <option value="missing_punch">Missing Punch</option>
                  <option value="late_in">Late Check-in</option>
                  <option value="early_out">Early Check-out</option>
                </select>
              </div>
              <div className="mfg2">
                <div className="mfg">
                  <label>Check-in Time</label>
                  <input type="time" value={form.in_time} onChange={e => setForm({...form, in_time: e.target.value})} />
                </div>
                <div className="mfg">
                  <label>Check-out Time</label>
                  <input type="time" value={form.out_time} onChange={e => setForm({...form, out_time: e.target.value})} />
                </div>
              </div>
              <div className="mfg">
                <label>Reason</label>
                <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} required rows={3} placeholder="Explain why the correction is needed�" />
              </div>
              <div className="rg-mactions">
                <button type="button" className="rg-mcancel" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="rg-msub" disabled={submitting}>{submitting ? 'Submitting�' : 'Submit'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Regularization;


