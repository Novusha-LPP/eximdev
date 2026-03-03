import React, { useState, useRef, useCallback, useContext } from 'react';
import axios from 'axios';
import { message } from 'antd';
import { useKyc } from './hooks/useKyc';
import { UserContext } from '../../contexts/UserContext';
import '../customerKyc/KycForm.scss';

/* ─── Colour tokens matching the Phase 1 spec ─────────────────────────────── */
const C = {
  bg:           '#0F172A',   // slate-950
  card:         '#1E293B',   // slate-800
  cardBorder:   '#334155',   // slate-700
  inputBg:      '#334155',   // slate-700
  inputBorder:  '#475569',   // slate-600
  inputFocus:   '#3B82F6',   // blue-500
  inputText:    '#F1F5F9',   // slate-100
  label:        '#CBD5E1',   // slate-300
  helper:       '#94A3B8',   // slate-400
  placeholder:  '#64748B',   // slate-500
  success:      '#22C55E',   // green-500
  error:        '#EF4444',   // red-500
  btnPrimary:   '#3B82F6',   // blue-500
  btnPrimaryHov:'#2563EB',   // blue-600
  btnSecBg:     '#334155',
  btnSecBorder: '#475569',
  btnSecText:   '#CBD5E1',
  divider:      '#1E293B',
  sectionIcon:  'rgba(59,130,246,0.15)',
  infoBox:      'rgba(30,41,59,0.6)',
  white:        '#FFFFFF',
};

const CATEGORIES = [
  'Individual/ Proprietary Firm',
  'Partnership Firm',
  'Company',
  'Trust Foundations',
];
const STATUSES = ['Manufacturer', 'Trader'];

/* ─── Tiny inline components ──────────────────────────────────────────────── */
function ErrorMsg({ msg }) {
  if (!msg) return null;
  return (
    <p style={{ marginTop: 6, fontSize: 13, color: C.error, display: 'flex', alignItems: 'center', gap: 4, animation: 'slideIn 0.3s ease-out' }}>
      <span>⚠</span> {msg}
    </p>
  );
}
function SuccessMsg({ msg }) {
  if (!msg) return null;
  return (
    <p style={{ marginTop: 6, fontSize: 13, color: C.success, display: 'flex', alignItems: 'center', gap: 4, animation: 'slideIn 0.3s ease-out' }}>
      <span>✓</span> {msg}
    </p>
  );
}

/* ─── Main Component ──────────────────────────────────────────────────────── */
function AddSuspectKYC({ onNavigate, editRecord }) {
  const { user } = useContext(UserContext);
  const { createSuspect, updateSuspect, submitSuspect, loading } = useKyc();
  const isEdit = !!editRecord;

  const [form, setForm] = useState({
    name_of_individual: editRecord?.name_of_individual || '',
    iec_no:             editRecord?.iec_no || '',
    category:           editRecord?.category || '',
    status:             editRecord?.status || '',
  });
  const [errors, setErrors]       = useState({});
  const [iecState, setIecState]   = useState({ checking: false, available: null, message: '' });
  const [focusedField, setFocused] = useState(null);
  const iecTimer = useRef(null);

  /* ── Field change ─────────────────────────────────────────────────────── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'iec_no') {
      const v = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
      setForm(p => ({ ...p, iec_no: v }));
      setIecState({ checking: false, available: null, message: '' });
    } else {
      setForm(p => ({ ...p, [name]: value }));
    }
    setErrors(p => ({ ...p, [name]: '' }));
  };

  /* ── IEC check on blur ────────────────────────────────────────────────── */
  const handleIecBlur = useCallback(async () => {
    const iec = form.iec_no.trim();
    if (!iec || iec.length !== 10 || (isEdit && iec === editRecord?.iec_no)) {
      setIecState({ checking: false, available: null, message: '' });
      return;
    }
    if (!/^[A-Z0-9]{10}$/.test(iec)) {
      setErrors(p => ({ ...p, iec_no: 'IEC must be exactly 10 alphanumeric characters.' }));
      return;
    }
    setIecState({ checking: true, available: null, message: '' });
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/suspects/check-iec/${iec}`,
        { withCredentials: true }
      );
      const available = res.data.available;
      setIecState({ checking: false, available, message: res.data.message });
      if (!available) {
        setErrors(p => ({ ...p, iec_no: res.data.message || 'IEC already registered.' }));
      }
    } catch {
      setIecState({ checking: false, available: null, message: '' });
    }
  }, [form.iec_no, isEdit, editRecord]);

  /* ── Validation ───────────────────────────────────────────────────────── */
  const validate = () => {
    const e = {};
    const name = form.name_of_individual.trim();
    if (!name) e.name_of_individual = 'Company / Individual name is required.';
    else if (name.length < 3) e.name_of_individual = 'Name must be at least 3 characters.';

    const iec = form.iec_no.trim();
    if (!iec) e.iec_no = 'IEC number is required.';
    else if (iec.length !== 10) e.iec_no = 'IEC must be exactly 10 characters.';
    else if (!/^[A-Z0-9]{10}$/.test(iec)) e.iec_no = 'IEC must contain only letters and numbers.';
    else if (iecState.available === false) e.iec_no = 'This IEC is already registered.';

    if (!form.category) e.category = 'Category is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── Submit ───────────────────────────────────────────────────────────── */
  const handleSubmit = async (saveAsDraft) => {
    if (!validate()) {
      message.error('Please fix the highlighted errors before continuing.');
      return;
    }
    const payload = {
      name_of_individual: form.name_of_individual.trim(),
      iec_no:             form.iec_no.trim(),
      category:           form.category,
      status:             form.status || undefined,
    };
    try {
      if (isEdit) {
        await updateSuspect(editRecord._id, payload);
        if (!saveAsDraft) {
          await submitSuspect(editRecord._id);
          message.success('Submitted for approval!');
          onNavigate('prospects');
        } else {
          message.success('Draft saved.');
          onNavigate('suspects');
        }
      } else {
        await createSuspect({ ...payload, draft: saveAsDraft ? 'true' : 'false' });
        if (saveAsDraft) {
          message.success('Draft saved successfully.');
          onNavigate('suspects');
        } else {
          message.success('Submitted for approval! Record moved to Prospects.');
          onNavigate('prospects');
        }
      }
    } catch (_) {}
  };

  /* ── Input style factory ─────────────────────────────────────────────── */
  const inputStyle = (fieldName, extra = {}) => ({
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 16px',
    height: 48,
    background: 'var(--surface-1)',
    border: `1px solid ${errors[fieldName] ? 'var(--error)' : focusedField === fieldName ? 'var(--primary-500)' : 'var(--slate-300)'}`,
    borderRadius: 'var(--radius-md)',
    color: 'var(--slate-800)',
    fontSize: 15,
    fontFamily: 'var(--font-body)',
    outline: 'none',
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
    boxShadow: focusedField === fieldName ? `0 0 0 3px var(--primary-100)` : 'none',
    ...extra,
  });

  /* ─── Render ──────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div className="app customer-kyc-wrapper" style={{ minHeight: 'auto', padding: 0, background: 'transparent' }}>
        <div className="page" style={{ padding: 0 }}>
          
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <button
                onClick={() => onNavigate('suspects')}
                style={{ background: 'none', border: 'none', color: 'var(--blue)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: 0, fontWeight: 600 }}
              >
                ← Back
              </button>
              <h2 className="page-title" style={{ margin: 0, textTransform: 'uppercase' }}>
                {isEdit ? 'Edit Suspect Draft' : 'Create New Suspect'}
              </h2>
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: '13px' }}>
            Quickly capture a new lead — complete the full KYC later.
          </p>

          <div className="kyc-card">
            <div className="panels" style={{ gridTemplateColumns: '1fr' }}>
              <div className="panel" style={{ borderLeft: 'none' }}>
                <div className="section" style={{ borderBottom: 'none' }}>
                  <div className="section-header">
                    <span className="section-title section-title-accent">Basic Information</span>
                  </div>
                  <div className="fields" style={{ padding: '16px' }}>
                    <div className="row" style={{ marginBottom: 12 }}>
                      <div className="field w-half">
                        <label>Company / Individual Name <span className="req">*</span></label>
                        <input
                          type="text"
                          name="name_of_individual"
                          value={form.name_of_individual}
                          onChange={handleChange}
                          placeholder="Enter company or individual name"
                          className={errors.name_of_individual ? 'error' : ''}
                          autoComplete="organization"
                        />
                        <ErrorMsg msg={errors.name_of_individual} />
                      </div>

                      <div className="field w-half">
                        <label>IEC Number <span style={{ fontSize: 10, color: 'var(--text-faint)', marginLeft: 4 }}>(10 characters)</span> <span className="req">*</span></label>
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            name="iec_no"
                            value={form.iec_no}
                            onChange={handleChange}
                            onBlur={handleIecBlur}
                            placeholder="AAAA123456"
                            maxLength={10}
                            disabled={isEdit}
                            className={errors.iec_no ? 'error' : ''}
                            style={{ textTransform: 'uppercase', paddingRight: 44 }}
                          />
                          <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
                            {iecState.checking && (
                              <div style={{ width: 14, height: 14, border: `2px solid var(--blue)`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                            )}
                            {!iecState.checking && iecState.available === true && (
                              <span style={{ color: 'var(--green)', fontSize: 14 }}>✓</span>
                            )}
                            {!iecState.checking && iecState.available === false && (
                              <span style={{ color: 'var(--red)', fontSize: 14 }}>✕</span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                          <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>{form.iec_no.length}/10 characters</span>
                          {iecState.available === true && !errors.iec_no && (
                            <span style={{ fontSize: 10, color: 'var(--green)' }}>✓ IEC is available</span>
                          )}
                        </div>
                        <ErrorMsg msg={errors.iec_no} />
                      </div>
                    </div>

                    <div className="row">
                      <div className="field w-half">
                        <label>Category <span className="req">*</span></label>
                        <select
                          name="category"
                          value={form.category}
                          onChange={handleChange}
                          className={errors.category ? 'error' : ''}
                        >
                          <option value="">Select category</option>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ErrorMsg msg={errors.category} />
                      </div>

                      <div className="field w-half">
                        <label>Status <span style={{ fontSize: 10, color: 'var(--text-faint)', marginLeft: 4 }}>(Optional)</span></label>
                        <select
                          name="status"
                          value={form.status}
                          onChange={handleChange}
                        >
                          <option value="">Select status (optional)</option>
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="form-footer">
              <div className="footer-info">
                All fields marked with an asterisk (*) are required.
              </div>
              <div className="footer-actions">
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={loading}
                  className="btn btn-draft"
                >
                  {loading ? 'Saving…' : 'Save Draft'}
                </button>
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={loading || iecState.available === false}
                  className="btn btn-success"
                >
                  {loading ? 'Submitting…' : 'Submit for Approval'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default React.memo(AddSuspectKYC);
