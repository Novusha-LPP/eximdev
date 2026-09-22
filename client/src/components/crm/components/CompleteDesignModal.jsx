import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Upload, Plus, Trash2, Video, FileText, CheckCircle, ExternalLink, Loader2, Sparkles } from 'lucide-react';
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

export default function CompleteDesignModal({ isOpen, onClose, onSuccess, designRequest }) {
  const isDirect = !designRequest?._id;

  const [companyName, setCompanyName] = useState('');
  const [designTitle, setDesignTitle] = useState('');
  const [requestType, setRequestType] = useState('Brochure Design');
  const [remarks, setRemarks] = useState('');
  const [publishToBrochures, setPublishToBrochures] = useState(true);

  const [files, setFiles] = useState([]);
  const [videoLinks, setVideoLinks] = useState([]);
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    if (isOpen) {
      if (designRequest) {
        setCompanyName(designRequest.companyName || '');
        setDesignTitle(designRequest.title || '');
        setRequestType(designRequest.requestType || 'Brochure Design');
        setRemarks(designRequest.remarks || '');
      } else {
        setCompanyName('');
        setDesignTitle('');
        setRequestType('Brochure Design');
        setRemarks('');
      }
      setFiles([]);
      setVideoLinks([]);
      setPublishToBrochures(true);

      axios.get(`${process.env.REACT_APP_API_STRING}/crm/accounts`, getHeaders())
        .then(res => setAccounts(res.data?.accounts || res.data || []))
        .catch(err => console.error('Failed to load accounts for suggestions:', err));
    }
  }, [isOpen, designRequest]);

  if (!isOpen) return null;

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

      const updated = [...files];
      updated[index] = {
        ...updated[index],
        name: updated[index].name || file.name.replace(/\.[^/.]+$/, ''),
        url: res.data.url,
        fileKey: res.data.fileKey,
        fileSize: res.data.fileSize,
        fileType: file.name.split('.').pop().toLowerCase()
      };
      setFiles(updated);
      message.success(`Uploaded ${file.name}`);
    } catch (err) {
      console.error('File upload failed:', err);
      message.error('Failed to upload design file');
    } finally {
      setUploadingIndex(null);
    }
  };

  const addFileRow = () => {
    setFiles([...files, { name: '', url: '', fileType: 'pdf' }]);
  };

  const removeFileRow = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const updateFileField = (index, field, value) => {
    const updated = [...files];
    updated[index] = { ...updated[index], [field]: value };
    setFiles(updated);
  };

  const addVideoRow = () => {
    setVideoLinks([...videoLinks, { title: '', url: '', platform: 'YouTube' }]);
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
      message.error('Please enter the company name');
      return;
    }
    if (!designTitle.trim()) {
      message.error('Please enter the design title');
      return;
    }

    const validFiles = files.filter(f => f.url);
    const validVideos = videoLinks.filter(v => v.url);

    if (validFiles.length === 0 && validVideos.length === 0) {
      message.error('Please upload at least one completed design file or video link');
      return;
    }

    setIsSubmitting(true);
    try {
      if (designRequest?._id) {
        // Complete existing design request
        await axios.post(
          `${process.env.REACT_APP_API_STRING}/crm/collaterals/design-requests/${designRequest._id}/complete`,
          {
            designTitle: designTitle.trim(),
            files: validFiles,
            videoLinks: validVideos,
            remarks: remarks.trim(),
            publishToBrochures
          },
          getHeaders()
        );
        message.success('Design completed and published successfully!');
      } else {
        // Direct add new design
        await axios.post(
          `${process.env.REACT_APP_API_STRING}/crm/collaterals/add-direct-design`,
          {
            companyName: companyName.trim(),
            title: designTitle.trim(),
            requestType,
            files: validFiles,
            videoLinks: validVideos,
            remarks: remarks.trim(),
            publishToBrochures
          },
          getHeaders()
        );
        message.success('New design created and published successfully!');
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Failed to complete design:', err);
      message.error(err.response?.data?.error || 'Failed to submit completed design');
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
        maxWidth: '800px',
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
          background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} color="#16a34a" /> {isDirect ? '🎨 Add New Design' : '✅ Upload Completed Design'}
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#15803d' }}>
              Kinjal's Designer Portal — Upload finalized files and update company collaterals
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#166534',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1 }}>

            {/* If fulfilling a sales request, show brief banner */}
            {designRequest && (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '1.25rem',
                fontSize: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, color: '#1e293b' }}>
                    Request by: {designRequest.requestedBy?.fullName || designRequest.requestedBy?.username}
                  </span>
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                    Priority: <strong>{designRequest.priority}</strong>
                  </span>
                </div>
                <div style={{ color: '#475569', fontSize: '0.82rem' }}>
                  <strong>Description:</strong> {designRequest.description}
                </div>
              </div>
            )}

            {/* Company & Title */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Company Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  list="accounts-suggest-comp"
                  placeholder="e.g. Paramount Logistics"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={!isDirect}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: !isDirect ? '#f1f5f9' : '#ffffff'
                  }}
                />
                <datalist id="accounts-suggest-comp">
                  {accounts.map((acc, idx) => (
                    <option key={acc._id || idx} value={acc.name || acc.companyName} />
                  ))}
                </datalist>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Design Title / Asset Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026 Company Profile v2"
                  value={designTitle}
                  onChange={(e) => setDesignTitle(e.target.value)}
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

            {/* Upload Design Files */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileText size={16} color="#16a34a" /> Final Design Document(s) & Files
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Attach completed PDF brochures, flyer graphics, high-res designs, or presentations
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addFileRow}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#f0fdf4',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={15} /> Add File
                </button>
              </div>

              {files.length === 0 ? (
                <div style={{
                  padding: '1.25rem',
                  textAlign: 'center',
                  background: '#ffffff',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  color: '#94a3b8',
                  fontSize: '0.82rem'
                }}>
                  No design files added yet. Click <strong>"+ Add File"</strong> to upload finalized files.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {files.map((f, idx) => (
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
                        placeholder="File / Section Title (e.g. Full Brochure 2026)"
                        value={f.name}
                        onChange={(e) => updateFileField(idx, 'name', e.target.value)}
                        style={{
                          padding: '7px 10px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          fontSize: '0.85rem',
                          outline: 'none'
                        }}
                      />

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {f.url ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, overflow: 'hidden' }}>
                            <CheckCircle size={16} color="#10b981" />
                            <a
                              href={f.url}
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
                              Ready <ExternalLink size={12} />
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
                              <Upload size={14} /> {f.url ? 'Replace' : 'Upload'}
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
                        onClick={() => removeFileRow(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '6px'
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Video Links */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Video size={16} color="#8b5cf6" /> Final Video Links (Optional)
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Attach edited video links (YouTube, Vimeo, Google Drive, MP4)
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

              {videoLinks.length > 0 && (
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
                        placeholder="Video Title"
                        value={v.title}
                        onChange={(e) => updateVideoField(idx, 'title', e.target.value)}
                        style={{ padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                      />
                      <select
                        value={v.platform}
                        onChange={(e) => updateVideoField(idx, 'platform', e.target.value)}
                        style={{ padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
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
                        style={{ padding: '7px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
                      />
                      <button
                        type="button"
                        onClick={() => removeVideoRow(idx)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Designer Remarks */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                Designer Notes / Changes Made
              </label>
              <textarea
                rows={2}
                placeholder="Notes for the sales team (e.g. Added cold storage section, revised contact details)..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
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

            {/* Publish Checkbox */}
            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '10px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <input
                type="checkbox"
                id="publish-brochures-check"
                checked={publishToBrochures}
                onChange={(e) => setPublishToBrochures(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
              />
              <label htmlFor="publish-brochures-check" style={{ fontSize: '0.85rem', color: '#1e40af', cursor: 'pointer', fontWeight: 500 }}>
                <strong>Publish directly to Company-wise Existing Brochures & Videos:</strong> Sales team will immediately be able to view and download this new design in the company list.
              </label>
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
              disabled={isSubmitting || uploadingIndex !== null}
              style={{
                padding: '9px 24px',
                borderRadius: '8px',
                border: 'none',
                background: isSubmitting ? '#94a3b8' : '#16a34a',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(22, 163, 74, 0.2)'
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="spin-animate" /> Saving...
                </>
              ) : 'Complete & Publish Design'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
