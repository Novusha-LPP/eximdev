import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Upload, Plus, Trash2, Video, FileText, CheckCircle, ExternalLink, Loader2 } from 'lucide-react';
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

export default function AddCompanyBrochureModal({ isOpen, onClose, onSuccess, initialData }) {
  const isEditing = !!initialData?._id;

  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  
  const [brochures, setBrochures] = useState([]);
  const [videoLinks, setVideoLinks] = useState([]);

  // Uploading state
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Suggested CRM accounts
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setCompanyName(initialData.companyName || '');
        setIndustry(initialData.industry || '');
        setDescription(initialData.description || '');
        setTagsInput((initialData.tags || []).join(', '));
        setBrochures(initialData.brochures || []);
        setVideoLinks(initialData.videoLinks || []);
      } else {
        setCompanyName('');
        setIndustry('');
        setDescription('');
        setTagsInput('');
        setBrochures([]);
        setVideoLinks([]);
      }

      // Fetch accounts for autocomplete
      axios.get(`${process.env.REACT_APP_API_STRING}/crm/accounts`, getHeaders())
        .then(res => setAccounts(res.data?.accounts || res.data || []))
        .catch(err => console.error('Failed to load accounts for suggestions:', err));
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  // Handle brochure file upload
  const handleFileUpload = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingIndex(index);
    const formData = new FormData();
    formData.append('file', file);

    const user = JSON.parse(localStorage.getItem('exim_user') || '{}');

    try {
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/crm/collaterals/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'user-id': user._id || user.id || '',
            'username': user.username || '',
            'user-role': user.role || '',
          },
          withCredentials: true
        }
      );

      const updated = [...brochures];
      updated[index] = {
        ...updated[index],
        title: updated[index].title || file.name.replace(/\.[^/.]+$/, ''),
        fileUrl: res.data.url,
        fileKey: res.data.fileKey,
        fileSize: res.data.fileSize,
        fileType: file.name.split('.').pop().toLowerCase()
      };
      setBrochures(updated);
      message.success(`Uploaded ${file.name}`);
    } catch (err) {
      console.error('File upload failed:', err);
      message.error('Failed to upload file. Please try again.');
    } finally {
      setUploadingIndex(null);
    }
  };

  const addBrochureRow = () => {
    setBrochures([...brochures, { title: '', fileUrl: '', fileType: 'pdf' }]);
  };

  const removeBrochureRow = (index) => {
    setBrochures(brochures.filter((_, i) => i !== index));
  };

  const updateBrochureField = (index, field, value) => {
    const updated = [...brochures];
    updated[index] = { ...updated[index], [field]: value };
    setBrochures(updated);
  };

  const addVideoRow = () => {
    setVideoLinks([...videoLinks, { title: '', url: '', platform: 'YouTube', description: '' }]);
  };

  const removeVideoRow = (index) => {
    setVideoLinks(videoLinks.filter((_, i) => i !== index));
  };

  const updateVideoField = (index, field, value) => {
    const updated = [...videoLinks];
    updated[index] = { ...updated[index], [field]: value };
    setVideoLinks(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) {
      message.error('Please specify a company name');
      return;
    }

    // Validate brochures
    const validBrochures = brochures.filter(b => b.title && b.fileUrl);
    // Validate video links
    const validVideos = videoLinks.filter(v => v.title && v.url);

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const payload = {
      companyName: companyName.trim(),
      industry: industry.trim(),
      description: description.trim(),
      tags,
      brochures: validBrochures,
      videoLinks: validVideos
    };

    setIsSubmitting(true);
    try {
      if (isEditing) {
        await axios.put(
          `${process.env.REACT_APP_API_STRING}/crm/collaterals/${initialData._id}`,
          payload,
          getHeaders()
        );
        message.success('Company brochure updated successfully');
      } else {
        await axios.post(
          `${process.env.REACT_APP_API_STRING}/crm/collaterals`,
          payload,
          getHeaders()
        );
        message.success('Company brochure added successfully');
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Failed to save brochure:', err);
      const errMsg = err.response?.data?.error || 'Failed to save company brochure';
      message.error(errMsg);
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
        maxWidth: '850px',
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
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
              {isEditing ? '✏️ Edit Company Collaterals' : '📁 Add Company Brochure & Video'}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              Kinjal's Collateral Manager — Add brochures and video links for sales team reference
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1 }}>
            
            {/* Company Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Company Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  list="crm-accounts-list"
                  placeholder="e.g. Acme Logistics Ltd."
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
                <datalist id="crm-accounts-list">
                  {accounts.map((acc, idx) => (
                    <option key={acc._id || idx} value={acc.name || acc.companyName} />
                  ))}
                </datalist>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Industry / Sector
                </label>
                <input
                  type="text"
                  placeholder="e.g. Chemicals, Auto, Pharma"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
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

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Description / Key Highlights
              </label>
              <textarea
                rows={2}
                placeholder="Brief summary of company services, key products, or target markets..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Tags (Comma separated)
              </label>
              <input
                type="text"
                placeholder="e.g. Freight Forwarding, Cold Chain, DGFT, 2026 Presentation"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
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

            {/* Brochures Section */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FileText size={18} color="#3b82f6" /> Attached Company Brochures & Decks
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Upload PDF brochures, presentations, or datasheets for sales reps to download
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addBrochureRow}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={15} /> Add Brochure
                </button>
              </div>

              {brochures.length === 0 ? (
                <div style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  background: '#ffffff',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  color: '#94a3b8',
                  fontSize: '0.85rem'
                }}>
                  No brochures attached yet. Click <strong>"+ Add Brochure"</strong> to upload PDF files.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {brochures.map((b, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#ffffff',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        display: 'grid',
                        gridTemplateColumns: '2fr 2fr auto',
                        gap: '12px',
                        alignItems: 'center'
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Brochure Title (e.g. Corporate Profile 2026)"
                        value={b.title}
                        onChange={(e) => updateBrochureField(idx, 'title', e.target.value)}
                        style={{
                          padding: '7px 10px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          outline: 'none'
                        }}
                      />

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {b.fileUrl ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, overflow: 'hidden' }}>
                            <CheckCircle size={16} color="#10b981" />
                            <a
                              href={b.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                fontSize: '0.8rem',
                                color: '#2563eb',
                                textDecoration: 'underline',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              Uploaded File <ExternalLink size={12} />
                            </a>
                          </div>
                        ) : null}

                        <label style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}>
                          {uploadingIndex === idx ? (
                            <>
                              <Loader2 size={14} className="spin-animate" /> Uploading...
                            </>
                          ) : (
                            <>
                              <Upload size={14} /> {b.fileUrl ? 'Replace File' : 'Upload File'}
                            </>
                          )}
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                            style={{ display: 'none' }}
                            onChange={(e) => handleFileUpload(e, idx)}
                            disabled={uploadingIndex === idx}
                          />
                        </label>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeBrochureRow(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '6px'
                        }}
                        title="Remove Brochure"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Video Links Section */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Video size={18} color="#8b5cf6" /> Company Video Links
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Add YouTube, Vimeo, Google Drive, or video showcase URLs
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addVideoRow}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#f5f3ff',
                    color: '#7c3aed',
                    border: '1px solid #ddd6fe',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={15} /> Add Video Link
                </button>
              </div>

              {videoLinks.length === 0 ? (
                <div style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  background: '#ffffff',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  color: '#94a3b8',
                  fontSize: '0.85rem'
                }}>
                  No video links added yet. Click <strong>"+ Add Video Link"</strong> to add one.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {videoLinks.map((v, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#ffffff',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        display: 'grid',
                        gridTemplateColumns: '1.5fr 1fr 2fr auto',
                        gap: '10px',
                        alignItems: 'center'
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Video Title (e.g. Warehouse Walkthrough)"
                        value={v.title}
                        onChange={(e) => updateVideoField(idx, 'title', e.target.value)}
                        style={{
                          padding: '7px 10px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          outline: 'none'
                        }}
                      />

                      <select
                        value={v.platform}
                        onChange={(e) => updateVideoField(idx, 'platform', e.target.value)}
                        style={{
                          padding: '7px 10px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          outline: 'none',
                          background: '#ffffff'
                        }}
                      >
                        <option value="YouTube">YouTube</option>
                        <option value="Vimeo">Vimeo</option>
                        <option value="Google Drive">Google Drive</option>
                        <option value="Direct Video">Direct Video</option>
                        <option value="Other">Other</option>
                      </select>

                      <input
                        type="url"
                        placeholder="URL (https://...)"
                        value={v.url}
                        onChange={(e) => updateVideoField(idx, 'url', e.target.value)}
                        style={{
                          padding: '7px 10px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          outline: 'none'
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => removeVideoRow(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '6px'
                        }}
                        title="Remove Video"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Footer Actions */}
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
              disabled={isSubmitting || uploadingIndex !== null}
              style={{
                padding: '9px 22px',
                borderRadius: '8px',
                border: 'none',
                background: isSubmitting ? '#94a3b8' : '#2563eb',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spin-animate" /> Saving...
                </>
              ) : isEditing ? 'Save Changes' : 'Publish Collaterals'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
