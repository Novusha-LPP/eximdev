import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Upload, Plus, Trash2, Calendar, AlertCircle, FileText, CheckCircle, ExternalLink, Loader2, Sparkles, UserCheck } from 'lucide-react';
import { message } from 'antd';

const getHeaders = () => {
  const user = JSON.parse(localStorage.getItem('exim_user') || '{}');
  return {
    headers: {
      'Content-Type': 'application/json',
      'user-id': user._id || user.id || '',
      'username': user.username || '',
      'user-role': user.role || '',
    },
    withCredentials: true
  };
};

const REQUEST_TYPES = [
  'Brochure Design',
  'Brochure Update / Design Change',
  'Video Editing',
  'Product Presentation / Deck',
  'Flyer / Poster',
  'Social Media Creative',
  'Other'
];

export default function NewDesignRequestModal({ isOpen, onClose, onSuccess, initialCompany }) {
  const currentUser = JSON.parse(localStorage.getItem('exim_user') || '{}');

  const [companyName, setCompanyName] = useState('');
  const [title, setTitle] = useState('');
  const [requestType, setRequestType] = useState('Brochure Update / Design Change');
  const [priority, setPriority] = useState('Medium');
  const [neededByDate, setNeededByDate] = useState('');
  const [description, setDescription] = useState('');
  const [referenceAttachments, setReferenceAttachments] = useState([]);

  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setCompanyName(initialCompany || '');
      setTitle('');
      setRequestType('Brochure Update / Design Change');
      setPriority('Medium');
      setNeededByDate('');
      setDescription('');
      setReferenceAttachments([]);

      axios.get(`${process.env.REACT_APP_API_STRING}/crm/accounts`, getHeaders())
        .then(res => setAccounts(res.data?.accounts || res.data || []))
        .catch(err => console.error('Failed to load accounts for suggestions:', err));
    }
  }, [isOpen, initialCompany]);

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await axios.post(
          `${process.env.REACT_APP_API_STRING}/crm/collaterals/upload`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              'user-id': currentUser._id || currentUser.id || '',
              'username': currentUser.username || '',
              'user-role': currentUser.role || '',
            },
            withCredentials: true
          }
        );

        setReferenceAttachments(prev => [
          ...prev,
          {
            name: file.name,
            fileUrl: res.data.url,
            fileType: file.name.split('.').pop().toLowerCase(),
            fileSize: res.data.fileSize
          }
        ]);
      }
      message.success('Reference files attached successfully');
    } catch (err) {
      console.error('File upload failed:', err);
      message.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (idx) => {
    setReferenceAttachments(referenceAttachments.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!companyName.trim()) {
      message.error('Please enter the company name');
      return;
    }
    if (!title.trim()) {
      message.error('Please enter a title for the design requirement');
      return;
    }
    if (!description.trim()) {
      message.error('Please describe the design changes or requirement in detail');
      return;
    }

    const payload = {
      companyName: companyName.trim(),
      title: title.trim(),
      requestType,
      priority,
      neededByDate: neededByDate || null,
      description: description.trim(),
      referenceAttachments,
      requestedByName: currentUser.first_name ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim() : currentUser.username
    };

    setIsSubmitting(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/crm/collaterals/design-requests`,
        payload,
        getHeaders()
      );
      message.success('Design requirement submitted and assigned to Kinjal Khatri!');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Failed to submit design request:', err);
      message.error(err.response?.data?.error || 'Failed to submit design request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '750px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#86198f', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} color="#c026d3" /> Request New Design / Design Change
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#701a75' }}>
              Sales Team Desk — Assign brochure updates, new presentations, or video edits to Kinjal
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#86198f',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1 }}>

            {/* Assigned to banner */}
            <div style={{
              background: '#fdf2f8',
              border: '1px solid #fbcfe8',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#9d174d',
              fontSize: '0.85rem',
              fontWeight: 500
            }}>
              <UserCheck size={18} color="#db2777" />
              <span>Assigned Designer: <strong>Kinjal Khatri</strong> (Marketing & Design Lead)</span>
            </div>

            {/* Company & Title */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Target Company Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  list="accounts-suggest"
                  placeholder="Select or enter company..."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                <datalist id="accounts-suggest">
                  {accounts.map((acc, idx) => (
                    <option key={acc._id || idx} value={acc.name || acc.companyName} />
                  ))}
                </datalist>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Requirement Title <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Update 2026 Warehousing Services Deck"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Type, Priority, Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Requirement Type
                </label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#ffffff'
                  }}
                >
                  {REQUEST_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Priority Level
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#ffffff',
                    fontWeight: 600,
                    color: priority === 'Urgent' ? '#dc2626' : priority === 'High' ? '#ea580c' : '#334155'
                  }}
                >
                  <option value="Urgent">🔥 Urgent</option>
                  <option value="High">⚡ High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Needed By (Deadline)
                </label>
                <input
                  type="date"
                  value={neededByDate}
                  onChange={(e) => setNeededByDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Detailed Instructions & Changes Requested <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                rows={4}
                required
                placeholder="Specify what content to add/remove, client requirements, specific dimensions, branding points, or video instructions..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Reference Attachments */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={16} color="#64748b" /> Reference Materials & Drafts
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Attach client logos, content briefs, old brochures, or sample sketches for Kinjal
                  </p>
                </div>
                <label style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#334155'
                }}>
                  {uploading ? <Loader2 size={14} className="spin-animate" /> : <Upload size={14} />} Attach Files
                  <input
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
              </div>

              {referenceAttachments.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' }}>
                  {referenceAttachments.map((att, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.8rem'
                      }}
                    >
                      <CheckCircle size={14} color="#10b981" />
                      <a href={att.fileUrl} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>
                        {att.name}
                      </a>
                      <button
                        type="button"
                        onClick={() => removeAttachment(idx)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                  No reference files attached yet (optional).
                </div>
              )}
            </div>

          </div>

          {/* Footer */}
          <div style={{
            padding: '1rem 1.75rem',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || uploading}
              style={{
                padding: '9px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isSubmitting ? '#94a3b8' : '#c026d3',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(192, 38, 211, 0.2)'
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spin-animate" /> Submitting...
                </>
              ) : 'Submit Requirement to Kinjal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
