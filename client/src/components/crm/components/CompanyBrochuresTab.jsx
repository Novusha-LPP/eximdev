import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  FileText,
  Video,
  Download,
  ExternalLink,
  Plus,
  Search,
  Filter,
  Sparkles,
  Edit2,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Building2,
  Share2,
  PlayCircle,
  Tag,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Paperclip
} from 'lucide-react';
import { message, Modal } from 'antd';
import AddCompanyBrochureModal from './AddCompanyBrochureModal';
import NewDesignRequestModal from './NewDesignRequestModal';
import CompleteDesignModal from './CompleteDesignModal';

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

export default function CompanyBrochuresTab() {
  const currentUser = JSON.parse(localStorage.getItem('exim_user') || '{}');

  // Permission: Kinjal or Admin
  const isKinjalOrAdmin = useMemo(() => {
    const uname = (currentUser.username || '').toLowerCase();
    const role = (currentUser.role || '').toLowerCase();
    return uname === 'kinjal_khatri' || uname.includes('kinjal') || role === 'admin';
  }, [currentUser]);

  // Main Active Sub-tab: 'brochures' or 'requests'
  const [subTab, setSubTab] = useState('brochures');

  // Data State
  const [companies, setCompanies] = useState([]);
  const [designRequests, setDesignRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals state
  const [isAddBrochureOpen, setIsAddBrochureOpen] = useState(false);
  const [editingBrochure, setEditingBrochure] = useState(null);

  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [targetCompanyForRequest, setTargetCompanyForRequest] = useState('');

  const [isCompleteDesignOpen, setIsCompleteDesignOpen] = useState(false);
  const [selectedRequestForCompletion, setSelectedRequestForCompletion] = useState(null);

  // Request detail view modal (for sales reps & Kinjal)
  const [viewingRequest, setViewingRequest] = useState(null);

  // Video playback modal
  const [playingVideo, setPlayingVideo] = useState(null);

  // Fetch Companies & Brochures
  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/collaterals`,
        getHeaders()
      );
      setCompanies(res.data || []);
    } catch (err) {
      console.error('Failed to load company collaterals:', err);
      message.error('Failed to load company brochures');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Design Requests
  const fetchDesignRequests = async () => {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/collaterals/design-requests/list`,
        getHeaders()
      );
      setDesignRequests(res.data || []);
    } catch (err) {
      console.error('Failed to load design requests:', err);
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchDesignRequests();
  }, []);

  const handleRefreshAll = () => {
    fetchCompanies();
    fetchDesignRequests();
    message.success('Refreshed collaterals & design requests');
  };

  // Delete company brochure (Kinjal only)
  const handleDeleteCompanyBrochure = (id, name) => {
    Modal.confirm({
      title: `Delete ${name} Brochures & Videos?`,
      content: 'Are you sure you want to remove this company collateral record? This will archive all brochures and video links for this company.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await axios.delete(
            `${process.env.REACT_APP_API_STRING}/crm/collaterals/${id}`,
            getHeaders()
          );
          message.success('Company collaterals removed');
          fetchCompanies();
        } catch (err) {
          message.error('Failed to remove company collaterals');
        }
      }
    });
  };

  // Update request status
  const handleUpdateStatus = async (requestId, newStatus) => {
    try {
      await axios.put(
        `${process.env.REACT_APP_API_STRING}/crm/collaterals/design-requests/${requestId}/status`,
        { status: newStatus },
        getHeaders()
      );
      message.success(`Status updated to ${newStatus}`);
      fetchDesignRequests();
    } catch (err) {
      message.error('Failed to update status');
    }
  };

  // Unique tags across all companies
  const allTags = useMemo(() => {
    const tagsSet = new Set();
    companies.forEach(c => {
      (c.tags || []).forEach(t => tagsSet.add(t));
    });
    return Array.from(tagsSet);
  }, [companies]);

  // Filtered companies
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => {
      const matchesSearch = !searchTerm.trim() || 
        c.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.brochures?.some(b => b.title?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        c.videoLinks?.some(v => v.title?.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesTag = selectedTag === 'All' || (c.tags || []).includes(selectedTag);

      return matchesSearch && matchesTag;
    });
  }, [companies, searchTerm, selectedTag]);

  // Filtered design requests
  const filteredRequests = useMemo(() => {
    return designRequests.filter(r => {
      const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
      const matchesSearch = !searchTerm.trim() ||
        r.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.requestedBy?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [designRequests, statusFilter, searchTerm]);

  // Design Requests Stats
  const requestStats = useMemo(() => {
    return {
      total: designRequests.length,
      pending: designRequests.filter(r => r.status === 'Pending').length,
      inProgress: designRequests.filter(r => r.status === 'In Progress').length,
      completed: designRequests.filter(r => r.status === 'Completed').length,
    };
  }, [designRequests]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', minHeight: '80vh' }}>
      
      {/* Top Banner / Role Notification */}
      <div style={{
        background: isKinjalOrAdmin
          ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)'
          : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        border: `1px solid ${isKinjalOrAdmin ? '#a7f3d0' : '#bfdbfe'}`,
        borderRadius: '12px',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: isKinjalOrAdmin ? '#10b981' : '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            {isKinjalOrAdmin ? <Sparkles size={22} /> : <Building2 size={22} />}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: isKinjalOrAdmin ? '#065f46' : '#1e40af' }}>
              {isKinjalOrAdmin
                ? '🎨 Designer Manager Active (Kinjal Khatri / Admin)'
                : '💼 Sales Collateral Hub — Company Brochures & Videos'}
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: isKinjalOrAdmin ? '#047857' : '#1e3a8a' }}>
              {isKinjalOrAdmin
                ? 'You have permission to add/edit company brochures & video links, and fulfill or add new designs.'
                : 'Browse, view, and download all company brochures attached by Kinjal. Need a design change? Request it directly below.'}
            </p>
          </div>
        </div>

        {/* Quick Actions in Banner */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {isKinjalOrAdmin ? (
            <>
              <button
                onClick={() => {
                  setSelectedRequestForCompletion(null);
                  setIsCompleteDesignOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(16, 185, 129, 0.25)'
                }}
              >
                <Sparkles size={15} /> Add New Design
              </button>
              <button
                onClick={() => {
                  setEditingBrochure(null);
                  setIsAddBrochureOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#047857',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(4, 120, 87, 0.2)'
                }}
              >
                <Plus size={15} /> Add Company Brochure
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setTargetCompanyForRequest('');
                setIsNewRequestOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)'
              }}
            >
              <Sparkles size={15} /> Request Design / Changes to Kinjal
            </button>
          )}

          <button
            onClick={handleRefreshAll}
            title="Refresh list"
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              padding: '8px 10px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: '#475569'
            }}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '2px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setSubTab('brochures')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              border: 'none',
              background: subTab === 'brochures' ? '#ffffff' : 'transparent',
              color: subTab === 'brochures' ? '#2563eb' : '#64748b',
              fontWeight: 700,
              fontSize: '0.92rem',
              borderRadius: '8px 8px 0 0',
              borderBottom: subTab === 'brochures' ? '3px solid #2563eb' : '3px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <FileText size={18} /> Company Brochures & Videos
            <span style={{
              background: subTab === 'brochures' ? '#dbeafe' : '#e2e8f0',
              color: subTab === 'brochures' ? '#1e40af' : '#475569',
              fontSize: '0.75rem',
              padding: '2px 8px',
              borderRadius: '12px',
              fontWeight: 600
            }}>
              {companies.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('requests')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              border: 'none',
              background: subTab === 'requests' ? '#ffffff' : 'transparent',
              color: subTab === 'requests' ? '#c026d3' : '#64748b',
              fontWeight: 700,
              fontSize: '0.92rem',
              borderRadius: '8px 8px 0 0',
              borderBottom: subTab === 'requests' ? '3px solid #c026d3' : '3px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Sparkles size={18} /> Design Requirements Desk
            {requestStats.pending > 0 && (
              <span style={{
                background: '#fce7f3',
                color: '#be185d',
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 700
              }}>
                {requestStats.pending} Pending
              </span>
            )}
          </button>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '260px' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder={subTab === 'brochures' ? 'Search companies, brochures, tags...' : 'Search design requests...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.85rem',
              outline: 'none',
              background: '#ffffff',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────── */}
      {/* VIEW 1: COMPANY-WISE BROCHURES & VIDEOS                  */}
      {/* ──────────────────────────────────────────────────────── */}
      {subTab === 'brochures' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Tag Filter Pills */}
          {allTags.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Tag size={13} /> Filter:
              </span>
              <button
                onClick={() => setSelectedTag('All')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  background: selectedTag === 'All' ? '#2563eb' : '#e2e8f0',
                  color: selectedTag === 'All' ? '#ffffff' : '#475569'
                }}
              >
                All
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: selectedTag === tag ? '#2563eb' : '#e2e8f0',
                    color: selectedTag === tag ? '#ffffff' : '#475569'
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Loading or Empty State */}
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <Loader2 size={32} className="spin-animate" color="#2563eb" />
              <span>Loading company collaterals...</span>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div style={{
              background: '#ffffff',
              border: '1px dashed #cbd5e1',
              borderRadius: '16px',
              padding: '3.5rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                <FileText size={28} />
              </div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                {searchTerm ? 'No matching companies found' : 'No Company Brochures Added Yet'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', maxWidth: '460px' }}>
                {searchTerm
                  ? `No company collateral matched "${searchTerm}". Try resetting your search filter.`
                  : isKinjalOrAdmin
                    ? 'Start by adding company brochures and video links so your sales team can download and share them.'
                    : 'Kinjal has not uploaded any company brochures yet. You can request a new design below!'}
              </p>
              {isKinjalOrAdmin ? (
                <button
                  onClick={() => {
                    setEditingBrochure(null);
                    setIsAddBrochureOpen(true);
                  }}
                  style={{
                    marginTop: '8px',
                    padding: '8px 18px',
                    background: '#2563eb',
                    color: '#ffffff',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  Add First Company Brochure
                </button>
              ) : (
                <button
                  onClick={() => setIsNewRequestOpen(true)}
                  style={{
                    marginTop: '8px',
                    padding: '8px 18px',
                    background: '#c026d3',
                    color: '#ffffff',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  <Sparkles size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  Request Design from Kinjal
                </button>
              )}
            </div>
          ) : (
            /* Companies Grid */
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
              gap: '1.25rem'
            }}>
              {filteredCompanies.map(item => {
                const totalBrochures = (item.brochures || []).length;
                const totalVideos = (item.videoLinks || []).length;

                return (
                  <div
                    key={item._id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.07)'}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.03)'}
                  >
                    {/* Card Header */}
                    <div style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid #f1f5f9',
                      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.95rem'
                        }}>
                          {item.companyName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#0f172a' }}>
                            {item.companyName}
                          </h4>
                          {item.industry && (
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                              {item.industry}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Kinjal & Admin Controls */}
                      {isKinjalOrAdmin && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            onClick={() => {
                              setEditingBrochure(item);
                              setIsAddBrochureOpen(true);
                            }}
                            title="Edit Brochures & Videos"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#64748b',
                              padding: '5px',
                              borderRadius: '6px'
                            }}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteCompanyBrochure(item._id, item.companyName)}
                            title="Delete Company Collaterals"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#ef4444',
                              padding: '5px',
                              borderRadius: '6px'
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                      {item.description && (
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: '1.4' }}>
                          {item.description}
                        </p>
                      )}

                      {/* Tags */}
                      {item.tags && item.tags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {item.tags.map((t, idx) => (
                            <span
                              key={idx}
                              style={{
                                background: '#f1f5f9',
                                color: '#475569',
                                fontSize: '0.72rem',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontWeight: 500
                              }}
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Brochures List */}
                      <div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#334155'
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <FileText size={14} color="#2563eb" /> Brochures & Presentations ({totalBrochures})
                          </span>
                        </div>

                        {totalBrochures === 0 ? (
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', padding: '6px 0' }}>
                            No brochures uploaded yet.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {item.brochures.map((b, idx) => (
                              <div
                                key={b._id || idx}
                                style={{
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '8px',
                                  padding: '8px 10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '8px'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                                  <span style={{
                                    background: '#fee2e2',
                                    color: '#b91c1c',
                                    fontSize: '0.68rem',
                                    padding: '2px 5px',
                                    borderRadius: '4px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase'
                                  }}>
                                    {b.fileType || 'PDF'}
                                  </span>
                                  <span
                                    title={b.title}
                                    style={{
                                      fontSize: '0.82rem',
                                      fontWeight: 600,
                                      color: '#1e293b',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {b.title}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                  <a
                                    href={b.fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="View / Open File"
                                    style={{
                                      padding: '4px 8px',
                                      background: '#ffffff',
                                      border: '1px solid #cbd5e1',
                                      borderRadius: '6px',
                                      fontSize: '0.75rem',
                                      color: '#334155',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      textDecoration: 'none'
                                    }}
                                  >
                                    <ExternalLink size={12} /> View
                                  </a>
                                  <a
                                    href={b.fileUrl}
                                    download
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Download File"
                                    style={{
                                      padding: '4px 8px',
                                      background: '#2563eb',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontSize: '0.75rem',
                                      color: '#ffffff',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontWeight: 600,
                                      textDecoration: 'none'
                                    }}
                                  >
                                    <Download size={12} /> Download
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Video Links List */}
                      <div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#334155'
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Video size={14} color="#7c3aed" /> Videos & Showcases ({totalVideos})
                          </span>
                        </div>

                        {totalVideos === 0 ? (
                          <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', padding: '4px 0' }}>
                            No videos added yet.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {item.videoLinks.map((v, idx) => (
                              <div
                                key={v._id || idx}
                                style={{
                                  background: '#faf5ff',
                                  border: '1px solid #e9d5ff',
                                  borderRadius: '8px',
                                  padding: '8px 10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '8px'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                                  <span style={{
                                    background: '#f3e8ff',
                                    color: '#7e22ce',
                                    fontSize: '0.68rem',
                                    padding: '2px 5px',
                                    borderRadius: '4px',
                                    fontWeight: 700
                                  }}>
                                    {v.platform || 'Video'}
                                  </span>
                                  <span
                                    title={v.title}
                                    style={{
                                      fontSize: '0.82rem',
                                      fontWeight: 600,
                                      color: '#1e293b',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {v.title}
                                  </span>
                                </div>

                                <a
                                  href={v.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    padding: '4px 10px',
                                    background: '#7c3aed',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '0.75rem',
                                    color: '#ffffff',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontWeight: 600,
                                    textDecoration: 'none'
                                  }}
                                >
                                  <PlayCircle size={13} /> Watch
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Card Footer: Sales Request Option */}
                    <div style={{
                      padding: '10px 16px',
                      background: '#f8fafc',
                      borderTop: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        By {item.updatedBy || item.createdBy || 'Kinjal'}
                      </span>

                      <button
                        onClick={() => {
                          setTargetCompanyForRequest(item.companyName);
                          setIsNewRequestOpen(true);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#c026d3',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: 0
                        }}
                      >
                        <Sparkles size={13} /> Request Design Change
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* VIEW 2: DESIGN REQUIREMENTS DESK & REQUESTS              */}
      {/* ──────────────────────────────────────────────────────── */}
      {subTab === 'requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Status Metrics Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px'
          }}>
            {[
              { label: 'All Requests', count: requestStats.total, color: '#3b82f6', bg: '#eff6ff', key: 'All' },
              { label: 'Pending Review', count: requestStats.pending, color: '#eab308', bg: '#fefce8', key: 'Pending' },
              { label: 'In Progress', count: requestStats.inProgress, color: '#8b5cf6', bg: '#f5f3ff', key: 'In Progress' },
              { label: 'Completed', count: requestStats.completed, color: '#10b981', bg: '#ecfdf5', key: 'Completed' },
            ].map(stat => (
              <div
                key={stat.key}
                onClick={() => setStatusFilter(stat.key)}
                style={{
                  background: statusFilter === stat.key ? stat.bg : '#ffffff',
                  border: `1.5px solid ${statusFilter === stat.key ? stat.color : '#e2e8f0'}`,
                  borderRadius: '10px',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  transition: 'all 0.2s'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                    {stat.label}
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: stat.color, marginTop: '2px' }}>
                    {stat.count}
                  </div>
                </div>
                {statusFilter === stat.key && (
                  <CheckCircle size={18} color={stat.color} />
                )}
              </div>
            ))}
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Showing <strong>{filteredRequests.length}</strong> design requirements assigned to <strong>Kinjal Khatri</strong>
            </span>

            <div style={{ display: 'flex', gap: '10px' }}>
              {isKinjalOrAdmin && (
                <button
                  onClick={() => {
                    setSelectedRequestForCompletion(null);
                    setIsCompleteDesignOpen(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Sparkles size={15} /> Add New Design
                </button>
              )}

              <button
                onClick={() => {
                  setTargetCompanyForRequest('');
                  setIsNewRequestOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#c026d3',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Plus size={15} /> Request New Design
              </button>
            </div>
          </div>

          {/* Requests Table / Cards */}
          {filteredRequests.length === 0 ? (
            <div style={{
              background: '#ffffff',
              border: '1px dashed #cbd5e1',
              borderRadius: '16px',
              padding: '3rem 2rem',
              textAlign: 'center',
              color: '#64748b'
            }}>
              <Sparkles size={32} color="#c026d3" style={{ marginBottom: '10px' }} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                No Design Requirements in "{statusFilter}"
              </h3>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem' }}>
                Sales reps can request brochure updates, custom presentations, or video edits to Kinjal.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredRequests.map(req => {
                const isPending = req.status === 'Pending';
                const isInProgress = req.status === 'In Progress';
                const isCompleted = req.status === 'Completed';

                return (
                  <div
                    key={req._id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '16px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                  >
                    {/* Header Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            color: '#2563eb',
                            background: '#eff6ff',
                            padding: '3px 8px',
                            borderRadius: '6px'
                          }}>
                            {req.companyName}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            {req.requestType}
                          </span>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            background: req.priority === 'Urgent' ? '#fee2e2' : req.priority === 'High' ? '#ffedd5' : '#f1f5f9',
                            color: req.priority === 'Urgent' ? '#b91c1c' : req.priority === 'High' ? '#c2410c' : '#475569'
                          }}>
                            {req.priority === 'Urgent' ? '🔥 Urgent' : req.priority === 'High' ? '⚡ High' : req.priority}
                          </span>
                        </div>

                        <h4 style={{ margin: '6px 0 2px 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                          {req.title}
                        </h4>
                      </div>

                      {/* Status Badge & Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: '12px',
                          background: isCompleted ? '#dcfce7' : isInProgress ? '#ede9fe' : '#fef9c3',
                          color: isCompleted ? '#166534' : isInProgress ? '#6b21a8' : '#854d0e'
                        }}>
                          {req.status}
                        </span>

                        {/* Kinjal Action: Add New Design / Complete */}
                        {isKinjalOrAdmin && !isCompleted && (
                          <button
                            onClick={() => {
                              setSelectedRequestForCompletion(req);
                              setIsCompleteDesignOpen(true);
                            }}
                            style={{
                              background: '#10b981',
                              color: '#ffffff',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                            }}
                          >
                            <Sparkles size={14} /> Add New Design / Fulfill
                          </button>
                        )}

                        {/* Status Change Dropdown (Kinjal or Admin) */}
                        {isKinjalOrAdmin && (
                          <select
                            value={req.status}
                            onChange={(e) => handleUpdateStatus(req._id, e.target.value)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.78rem',
                              background: '#ffffff',
                              color: '#334155'
                            }}
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Changes Requested">Changes Requested</option>
                            <option value="Closed">Closed</option>
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.4' }}>
                      {req.description}
                    </div>

                    {/* Reference Attachments & Details Bar */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px',
                      paddingTop: '6px',
                      borderTop: '1px dashed #e2e8f0',
                      fontSize: '0.78rem',
                      color: '#64748b'
                    }}>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <span>
                          👤 Requested by: <strong>{req.requestedBy?.fullName || req.requestedBy?.username}</strong>
                        </span>
                        {req.neededByDate && (
                          <span>
                            📅 Deadline: <strong>{new Date(req.neededByDate).toLocaleDateString()}</strong>
                          </span>
                        )}
                        <span>
                          🎨 Assigned to: <strong>Kinjal Khatri</strong>
                        </span>
                      </div>

                      {/* Reference Files if any */}
                      {req.referenceAttachments && req.referenceAttachments.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Paperclip size={13} />
                          <span style={{ fontWeight: 600 }}>{req.referenceAttachments.length} reference file(s) attached</span>
                          <button
                            onClick={() => setViewingRequest(req)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#2563eb',
                              cursor: 'pointer',
                              fontWeight: 600,
                              textDecoration: 'underline'
                            }}
                          >
                            View
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Completed Design Box (if completed) */}
                    {isCompleted && req.completedDesign && (
                      <div style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        marginTop: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle size={15} color="#16a34a" /> Completed by Kinjal Khatri
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#15803d' }}>
                            {req.completedDesign.completedAt ? new Date(req.completedDesign.completedAt).toLocaleDateString() : ''}
                          </span>
                        </div>

                        {req.completedDesign.remarks && (
                          <div style={{ fontSize: '0.8rem', color: '#14532d' }}>
                            <strong>Designer Notes:</strong> {req.completedDesign.remarks}
                          </div>
                        )}

                        {/* Completed Files */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                          {(req.completedDesign.files || []).map((file, fIdx) => (
                            <a
                              key={fIdx}
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#ffffff',
                                border: '1px solid #86efac',
                                color: '#15803d',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                textDecoration: 'none'
                              }}
                            >
                              <Download size={13} /> {file.name || 'Download Completed Design'}
                            </a>
                          ))}

                          {(req.completedDesign.videoLinks || []).map((v, vIdx) => (
                            <a
                              key={vIdx}
                              href={v.url}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: '#ffffff',
                                border: '1px solid #c084fc',
                                color: '#7e22ce',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                textDecoration: 'none'
                              }}
                            >
                              <PlayCircle size={13} /> {v.title || 'Watch Video'}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ──────────────────────────────────────────────────────── */}
      {/* MODALS                                                  */}
      {/* ──────────────────────────────────────────────────────── */}

      {/* Add / Edit Company Brochure Modal (Kinjal Only) */}
      <AddCompanyBrochureModal
        isOpen={isAddBrochureOpen}
        onClose={() => setIsAddBrochureOpen(false)}
        onSuccess={() => {
          fetchCompanies();
        }}
        initialData={editingBrochure}
      />

      {/* Request New Design Modal (Sales Team) */}
      <NewDesignRequestModal
        isOpen={isNewRequestOpen}
        onClose={() => setIsNewRequestOpen(false)}
        onSuccess={() => {
          fetchDesignRequests();
          setSubTab('requests');
        }}
        initialCompany={targetCompanyForRequest}
      />

      {/* Complete Design Modal ("Add New Design" - Kinjal Only) */}
      <CompleteDesignModal
        isOpen={isCompleteDesignOpen}
        onClose={() => setIsCompleteDesignOpen(false)}
        onSuccess={() => {
          fetchCompanies();
          fetchDesignRequests();
        }}
        designRequest={selectedRequestForCompletion}
      />

      {/* View Request Details Modal */}
      {viewingRequest && (
        <Modal
          title={`Design Requirement: ${viewingRequest.title}`}
          open={!!viewingRequest}
          onCancel={() => setViewingRequest(null)}
          footer={null}
          width={600}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
            <div>
              <span style={{ fontWeight: 600, color: '#64748b', fontSize: '0.82rem' }}>Company:</span>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>{viewingRequest.companyName}</div>
            </div>
            <div>
              <span style={{ fontWeight: 600, color: '#64748b', fontSize: '0.82rem' }}>Requirement Details:</span>
              <div style={{ fontSize: '0.88rem', color: '#334155', marginTop: '4px' }}>{viewingRequest.description}</div>
            </div>
            {viewingRequest.referenceAttachments?.length > 0 && (
              <div>
                <span style={{ fontWeight: 600, color: '#64748b', fontSize: '0.82rem' }}>Attached Reference Files:</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  {viewingRequest.referenceAttachments.map((att, idx) => (
                    <a
                      key={idx}
                      href={att.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '6px 10px',
                        background: '#f1f5f9',
                        borderRadius: '6px',
                        color: '#2563eb',
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        textDecoration: 'none'
                      }}
                    >
                      <Download size={14} /> {att.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

    </div>
  );
}
