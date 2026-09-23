import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { X, Edit2, Trash2, FileText, DollarSign, MapPin, Hash, Calendar, Building2, Tag, AlertOctagon, User, Clock, TrendingUp, Percent, Briefcase, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { message, Modal, AutoComplete, Input } from 'antd';
import { UserContext } from '../../../contexts/UserContext';
import ActivityTimeline from './ActivityTimeline';
import QuoteFormModal from './QuoteFormModal';
import PricingRequestFormModal from './PricingRequestFormModal';
import TaskFormModal from './TaskFormModal';
import { LOST_REASONS, STANDARD_LOST_REASON_VALUES } from '../crmConstants';

const STAGES = ['lead', 'qualified', 'opportunity', 'sales_visit', 'proposal', 'negotiation', 'won', 'lost'];

const STAGE_CONFIG = {
  lead: { label: 'Lead', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', dot: '#64748b' },
  qualified: { label: 'Qualified', bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', dot: '#22c55e' },
  opportunity: { label: 'Opportunity', bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe', dot: '#6366f1' },
  sales_visit: { label: 'Sales Visit', bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff', dot: '#a855f7' },
  proposal: { label: 'Proposal', bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', dot: '#f97316' },
  negotiation: { label: 'Negotiation', bg: '#fdf2f8', color: '#be185d', border: '#fbcfe8', dot: '#ec4899' },
  won: { label: 'Closed – Won', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', dot: '#10b981' },
  lost: { label: 'Closed – Lost', bg: '#fff1f2', color: '#be123c', border: '#fecdd3', dot: '#f43f5e' }
};

const ALLOWED_SERVICES = [
  'freight forwarding',
  'dgft',
  'e-lock',
  'client',
  'transportation',
  'paramount',
  'rabs',
  'auto rack'
];

export default function OpportunityDetailModal({ isOpen, onClose, opportunity, onRefresh }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newRemark, setNewRemark] = useState('');
  const [editingRemarkId, setEditingRemarkId] = useState(null);
  const [editingRemarkText, setEditingRemarkText] = useState('');
  const [newVisitDate, setNewVisitDate] = useState('');
  const [completingVisitId, setCompletingVisitId] = useState(null);
  const [postponingVisitId, setPostponingVisitId] = useState(null);
  const [postponeDate, setPostponeDate] = useState('');
  const [customSource, setCustomSource] = useState('');
  const [customCompanyType, setCustomCompanyType] = useState('');
  const [isOtherCompanyType, setIsOtherCompanyType] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState(null);
  const [users, setUsers] = useState([]);

  const { user } = useContext(UserContext);
  const fullUserName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username : 'Unknown User';

  const handleClose = () => {
    setIsEditMode(false);
    onClose();
  };

  useEffect(() => {
    if (isOpen && opportunity?._id) {
      setIsEditMode(false);
      setFormData(opportunity);
      setNewRemark('');
      const standardSources = ['Web / Own Generated Lead', 'IndiaMart Lead', 'Direct Sales Visit', 'Referral', 'Email Campaign', 'Company Branding'];
      if (opportunity.source && !standardSources.includes(opportunity.source)) {
        setCustomSource(opportunity.source);
      } else {
        setCustomSource('');
      }

      const standardTypes = ['OEM', 'Tier 1', 'Tier 2', 'Tier 3'];
      if (opportunity.companyType) {
        if (!standardTypes.includes(opportunity.companyType)) {
          setCustomCompanyType(opportunity.companyType);
          setIsOtherCompanyType(true);
        } else {
          setCustomCompanyType('');
          setIsOtherCompanyType(false);
        }
      } else {
        setCustomCompanyType('');
        setIsOtherCompanyType(false);
      }
    }
  }, [isOpen, opportunity]);

  useEffect(() => {
    if (isOpen) {
      const fetchUsers = async () => {
        try {
          const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-all-users`, getHeaders());
          setUsers(res.data || []);
        } catch (err) {
          console.error('Failed to load users list in opportunity detail modal:', err);
        }
      };
      fetchUsers();
    }
  }, [isOpen]);

  const toggleService = (service) => {
    const currentServices = formData.services || [];
    if (currentServices.includes(service)) {
      setFormData({
        ...formData,
        services: currentServices.filter(s => s !== service)
      });
    } else {
      setFormData({
        ...formData,
        services: [...currentServices, service]
      });
    }
  };

  const [customService, setCustomService] = useState('');
  const handleAddCustomService = () => {
    if (!customService.trim()) return;
    const currentServices = formData.services || [];
    if (!currentServices.includes(customService.trim())) {
      setFormData({
        ...formData,
        services: [...currentServices, customService.trim()]
      });
    }
    setCustomService('');
  };

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

  const garudaUserOptions = useMemo(() => {
    const list = (users || []).map(u => {
      const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
      const displayName = fullName || u.username || '';
      return {
        value: displayName,
        searchStr: `${displayName} ${u.username || ''} ${u.department || ''} ${u.employee_code || ''} ${u.designation || ''}`.toLowerCase(),
        label: (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
            <div>
              <span style={{ fontWeight: 600, color: '#1e293b' }}>{displayName}</span>
              {u.username && displayName !== u.username && (
                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '6px' }}>({u.username})</span>
              )}
            </div>
            {u.department && (
              <span style={{ fontSize: '0.7rem', color: '#4f46e5', background: '#eef2ff', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                {u.department}
              </span>
            )}
          </div>
        )
      };
    }).filter(opt => opt.value);

    const seen = new Set();
    return list.filter(item => {
      const key = item.value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [users]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const currentStage = opportunity.stage;
      const newStage = formData.stage;
      const stageChanged = newStage && newStage !== currentStage;

      // Only send the fields the form actually edits — never send stageHistory, __v, _id etc.
      const payload = {
        name: formData.name,
        value: formData.value,
        probability: formData.probability,
        expectedCloseDate: formData.expectedCloseDate,
        services: formData.services || [],
        newRemark: newRemark,
        userName: fullUserName,
        closeReason: formData.closeReason,
        closeNotes: formData.closeNotes,
        crateSize: formData.crateSize,
        location: formData.location,
        hsnCode: formData.hsnCode,
        source: formData.source,
        referralSourceName: formData.referralSourceName,
        garudaTeamMemberName: formData.garudaTeamMemberName,
        companyType: isOtherCompanyType ? (customCompanyType.trim() || 'Other') : (formData.companyType || '')
      };

      const isProposalOrAfter = ['proposal', 'negotiation', 'won'].includes(newStage);
      if (isProposalOrAfter) {
        const dealValue = formData.value !== undefined ? Number(formData.value) : opportunity.value;
        if (!dealValue || dealValue <= 0) {
          message.error('Deal value must be greater than 0 before transitioning to the Proposal, Negotiation, or Won stages. Please add a value first.');
          setIsSaving(false);
          return;
        }
      }

      if (stageChanged && newStage === 'lost' && !formData.closeReason) {
        message.error('Please select a Reason for Loss');
        setIsSaving(false);
        return;
      }

      // If stage changed, use the dedicated PATCH /stage endpoint
      if (stageChanged) {
        await axios.patch(
          `${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunity._id}/stage`,
          {
            stage: newStage,
            closeReason: formData.closeReason,
            closeNotes: formData.closeNotes
          },
          getHeaders()
        );
      }

      // Update other fields via PUT (without stage in payload to skip validation)
      await axios.put(
        `${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunity._id}`,
        payload,
        getHeaders()
      );

      message.success('Opportunity updated successfully');
      setIsEditMode(false);
      onRefresh();
      onClose();
    } catch (error) {
      message.error('Error updating opportunity: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: 'Delete Opportunity',
      content: 'Are you sure you want to delete this opportunity?',
      okText: 'Delete',
      okType: 'danger',
      async onOk() {
        try {
          await axios.delete(`${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunity._id}`, getHeaders());
          message.success('Opportunity deleted successfully');
          onRefresh();
          onClose();
        } catch (error) {
          message.error('Error deleting opportunity');
        }
      }
    });
  };

  const handleEditRemark = async (remarkId) => {
    if (!editingRemarkText.trim()) return;
    try {
      await axios.put(
        `${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunity._id}/remarks/${remarkId}`,
        { text: editingRemarkText },
        { withCredentials: true }
      );
      message.success('Remark updated');
      setEditingRemarkId(null);
      onRefresh();
      // Update local state to show change immediately if possible, but onRefresh is safer
    } catch (error) {
      message.error('Error updating remark');
    }
  };

  const handleAddVisit = async () => {
    if (!newVisitDate) {
      message.error('Please select a visit date');
      return;
    }
    try {
      await axios.post(
        `${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunity._id}/planned-visits`,
        { visitDate: newVisitDate },
        { withCredentials: true }
      );
      message.success('Visit planned successfully');
      setNewVisitDate('');
      onRefresh();
      // Refresh local form data to show new visit
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunity._id}`,
        { withCredentials: true }
      );
      setFormData(res.data);
    } catch (error) {
      message.error('Error planning visit: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleCompleteVisit = async (visitId) => {
    setCompletingVisitId(visitId);
    try {
      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunity._id}/planned-visits/${visitId}/complete`,
        {},
        { withCredentials: true }
      );
      message.success('Visit marked as completed');
      onRefresh();
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunity._id}`,
        { withCredentials: true }
      );
      setFormData(res.data);
    } catch (error) {
      message.error('Error completing visit: ' + (error.response?.data?.message || error.message));
    } finally {
      setCompletingVisitId(null);
    }
  };

  const handleCancelVisit = async (visitId) => {
    try {
      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunity._id}/planned-visits/${visitId}/cancel`,
        {},
        { withCredentials: true }
      );
      message.success('Visit cancelled successfully');
      onRefresh();
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunity._id}`,
        { withCredentials: true }
      );
      setFormData(res.data);
    } catch (error) {
      message.error('Error cancelling visit: ' + (error.response?.data?.message || error.message));
    }
  };

  const handlePostponeVisit = async (visitId) => {
    if (!postponeDate) {
      message.error('Please select a new date');
      return;
    }
    try {
      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunity._id}/planned-visits/${visitId}/postpone`,
        { visitDate: postponeDate },
        { withCredentials: true }
      );
      message.success('Visit postponed successfully');
      setPostponingVisitId(null);
      setPostponeDate('');
      onRefresh();
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunity._id}`,
        { withCredentials: true }
      );
      setFormData(res.data);
    } catch (error) {
      message.error('Error postponing visit: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteRemark = (remarkId) => {
    Modal.confirm({
      title: 'Delete Remark',
      content: 'Are you sure you want to delete this remark?',
      okText: 'Delete',
      okType: 'danger',
      async onOk() {
        try {
          await axios.delete(
            `${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunity._id}/remarks/${remarkId}`,
            { withCredentials: true }
          );
          message.success('Remark deleted');
          onRefresh();
        } catch (error) {
          message.error('Error deleting remark');
        }
      }
    });
  };

  const handleAddTaskClick = () => {
    setSelectedTaskForModal({
      relatedTo: {
        model: 'Opportunity',
        id: opportunity._id,
        name: opportunity.name
      }
    });
    setIsTaskModalOpen(true);
  };

  const handleEditTaskClick = (task) => {
    setSelectedTaskForModal({
      ...task,
      relatedTo: task.relatedTo || {
        model: 'Opportunity',
        id: opportunity._id,
        name: opportunity.name
      }
    });
    setIsTaskModalOpen(true);
  };

  const handleToggleTaskComplete = async (task) => {
    try {
      const newStatus = task.status === 'completed' ? 'open' : 'completed';
      await axios.put(
        `${process.env.REACT_APP_API_STRING}/crm/tasks/${task._id}`,
        { status: newStatus },
        getHeaders()
      );
      message.success(newStatus === 'completed' ? 'Task marked as completed' : 'Task marked as open');
      onRefresh();
      // Refresh local modal data
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunity._id}`,
        getHeaders()
      );
      setFormData(res.data);
    } catch (err) {
      message.error(err.response?.data?.message || err.message || 'Failed to update task status');
    }
  };

  const handleDeleteTask = async (taskId) => {
    Modal.confirm({
      title: 'Delete Task',
      content: 'Are you sure you want to delete this task?',
      okText: 'Delete',
      okType: 'danger',
      async onOk() {
        try {
          await axios.delete(
            `${process.env.REACT_APP_API_STRING}/crm/tasks/${taskId}`,
            getHeaders()
          );
          message.success('Task deleted successfully');
          onRefresh();
          // Refresh local modal data
          const res = await axios.get(
            `${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunity._id}`,
            getHeaders()
          );
          setFormData(res.data);
        } catch (err) {
          message.error(err.response?.data?.message || err.message || 'Failed to delete task');
        }
      }
    });
  };

  if (!isOpen || !opportunity) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1010,
      padding: '20px'
    }}>
      <div style={{
        background: '#fff',
        width: '100%',
        maxWidth: '820px',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        maxHeight: '88vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <style>{`
          .crm-modal-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .crm-modal-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .crm-modal-scroll::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
          }
          .crm-modal-scroll::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}</style>

        {/* Modal Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #f1f5f9',
          background: '#ffffff',
          position: 'relative',
          flexShrink: 0
        }}>
          {/* Top row: Category Breadcrumb & Close button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', paddingRight: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Briefcase size={12} color="#6366f1" /> Deal Overview
              </span>
              {formData.accountId?.name && (
                <>
                  <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>•</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Building2 size={12} color="#94a3b8" /> {formData.accountId.name}
                  </span>
                </>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={handleClose}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                color: '#64748b',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Title & Stage Pill Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: !isEditMode ? '16px' : '0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', maxWidth: 'calc(100% - 40px)' }}>
              <h3 style={{ margin: 0, color: '#0f172a', fontWeight: 800, fontSize: '1.4rem', lineHeight: '1.25', letterSpacing: '-0.02em' }}>
                {formData.name || opportunity.name}
              </h3>
              {(() => {
                const stageKey = (formData.stage || opportunity.stage || 'lead').toLowerCase();
                const config = STAGE_CONFIG[stageKey] || { label: stageKey, bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', dot: '#94a3b8' };
                return (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: config.bg,
                    color: config.color,
                    border: `1px solid ${config.border}`,
                    padding: '3px 10px',
                    borderRadius: '16px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: config.dot }}></span>
                    {config.label}
                  </span>
                );
              })()}
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          {!isEditMode && (
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
              <button
                onClick={() => setIsEditMode(true)}
                style={{
                  padding: '7px 14px',
                  background: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  boxShadow: '0 1px 3px rgba(79, 70, 229, 0.3)',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#4338ca'}
                onMouseOut={(e) => e.currentTarget.style.background = '#4f46e5'}
              >
                <Edit2 size={14} /> Edit Deal
              </button>

              <button
                onClick={() => setIsQuoteModalOpen(true)}
                style={{
                  padding: '7px 14px',
                  background: '#f8fafc',
                  color: '#1e293b',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
              >
                <FileText size={14} color="#6366f1" /> Create Quote
              </button>

              <button
                onClick={() => setIsPricingModalOpen(true)}
                style={{
                  padding: '7px 14px',
                  background: '#f0fdf4',
                  color: '#15803d',
                  border: '1px solid #bbf7d0',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#dcfce7'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#f0fdf4'; }}
              >
                <DollarSign size={14} color="#16a34a" /> Request Pricing
              </button>

              <button
                onClick={handleDelete}
                style={{
                  marginLeft: 'auto',
                  padding: '7px 12px',
                  background: '#ffffff',
                  color: '#e11d48',
                  border: '1px solid #fecdd3',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#fff1f2'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#ffffff'; }}
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>

        {/* Modal Body - Scrollable */}
        <div className="crm-modal-scroll" style={{ padding: '24px', overflowY: 'auto', flexGrow: 1 }}>
          {/* Referral Highlighting Banner */}
          {(formData.isReferral || formData.referredFromTeamId || formData.referredToTeamId) && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px',
              padding: '10px 16px', background: '#fef2f2', borderRadius: '10px',
              marginBottom: '20px', border: '1px solid #fecaca', color: '#991b1b'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>⚡ Cross-Team Referral:</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  Referred from {formData.referredFromTeamId?.teamName || formData.referredFromTeamId?.name || 'Team'} → {formData.referredToTeamId?.teamName || formData.referredToTeamId?.name || 'Team'}
                </span>
              </div>
              {(formData.referredAt || formData.createdAt) && (
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#b91c1c' }}>
                  📅 Referred on: {new Date(formData.referredAt || formData.createdAt).toLocaleDateString('en-IN')} {new Date(formData.referredAt || formData.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          )}

          {/* Quick Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {/* Value Card */}
            <div style={{
              background: '#ffffff',
              padding: '14px 18px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deal Value</span>
                <span style={{ width: '26px', height: '26px', borderRadius: '6px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={14} />
                </span>
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                ₹{parseFloat(formData.value || 0).toLocaleString('en-IN')}
              </div>
            </div>

            {/* Probability Card */}
            <div style={{
              background: '#ffffff',
              padding: '14px 18px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Win Probability</span>
                <span style={{ width: '26px', height: '26px', borderRadius: '6px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Percent size={13} />
                </span>
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                {formData.probability || 0}%
              </div>
              <div style={{ width: '100%', height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden', marginTop: '6px' }}>
                <div style={{ width: `${Math.min(100, Math.max(0, formData.probability || 0))}%`, height: '100%', background: (formData.probability || 0) > 50 ? '#10b981' : '#f59e0b', borderRadius: '2px' }} />
              </div>
            </div>

            {/* Weighted Value Card */}
            <div style={{
              background: '#ffffff',
              padding: '14px 18px',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Weighted Forecast</span>
                <span style={{ width: '26px', height: '26px', borderRadius: '6px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={14} />
                </span>
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>
                ₹{(parseFloat(formData.value || 0) * (parseFloat(formData.probability || 0) / 100)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {/* Assigned Owner & Meta Ribbon */}
          {(() => {
            const creator = formData.createdBy || formData.ownerId;
            if (!creator) return null;
            const creatorName = typeof creator === 'object'
              ? `${creator.first_name || ''} ${creator.last_name || ''}`.trim() || creator.username
              : creator;
            const initial = (creatorName || 'U').charAt(0).toUpperCase();

            return (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '9px 14px',
                background: '#f8fafc',
                borderRadius: '10px',
                marginBottom: '20px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: '#6366f1',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}>
                    {initial}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Assigned Owner:</span>
                  <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 700 }}>
                    {creatorName}
                  </span>
                </div>
                {formData.createdAt && (
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} color="#94a3b8" /> Created on {new Date(formData.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            );
          })()}

          {/* ── Freight Forwarding Info Section (Auto-synced from Export) ── */}
          {formData.freightEnquiryRef && formData.freightData && (
            <div style={{
              marginBottom: '20px', padding: '16px', background: '#eff6ff',
              borderRadius: '12px', border: '1px solid #bfdbfe'
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'
              }}>
                <h4 style={{ margin: 0, color: '#1e40af', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🚢 Freight Forwarding Status
                </h4>
                <span style={{
                  fontSize: '0.7rem', background: '#dbeafe', color: '#1e40af',
                  padding: '3px 10px', borderRadius: '12px', fontWeight: 700, border: '1px solid #93c5fd'
                }}>
                  {formData.freightData.pipelineStage || 'Synced'}
                </span>
              </div>

              {/* Freight Pipeline Progress Bar */}
              {(() => {
                const stages = ['Enquiry', 'Draft BL', 'SOB', 'Billing', 'ETA Pending', 'Delivery', 'Completed'];
                const currentIdx = stages.indexOf(formData.freightData.pipelineStage);
                return (
                  <div style={{ display: 'flex', gap: '2px', marginBottom: '14px' }}>
                    {stages.map((s, i) => (
                      <div key={s} style={{
                        flex: 1, height: '6px', borderRadius: '3px',
                        background: i <= currentIdx ? '#3b82f6' : '#e2e8f0',
                        transition: 'background 0.3s'
                      }} title={s} />
                    ))}
                  </div>
                );
              })()}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                {formData.freightData.enquiryNo && (
                  <div><span style={{ color: '#64748b' }}>Enquiry No: </span><strong style={{ color: '#1e293b' }}>{formData.freightData.enquiryNo}</strong></div>
                )}
                {formData.freightData.successNo && (
                  <div><span style={{ color: '#64748b' }}>Job No: </span><strong style={{ color: '#1e293b' }}>{formData.freightData.successNo}</strong></div>
                )}
                {formData.freightData.portOfLoading && (
                  <div><span style={{ color: '#64748b' }}>POL: </span><strong style={{ color: '#1e293b' }}>{formData.freightData.portOfLoading}</strong></div>
                )}
                {formData.freightData.portOfDestination && (
                  <div><span style={{ color: '#64748b' }}>POD: </span><strong style={{ color: '#1e293b' }}>{formData.freightData.portOfDestination}</strong></div>
                )}
                {formData.freightData.consignmentType && (
                  <div><span style={{ color: '#64748b' }}>Type: </span><strong style={{ color: '#1e293b' }}>{formData.freightData.consignmentType}</strong></div>
                )}
                {formData.freightData.containerSize && (
                  <div><span style={{ color: '#64748b' }}>Container: </span><strong style={{ color: '#1e293b' }}>{formData.freightData.containerSize}</strong></div>
                )}
                {formData.freightData.shippingLine && (
                  <div><span style={{ color: '#64748b' }}>S/Line: </span><strong style={{ color: '#1e293b' }}>{formData.freightData.shippingLine}</strong></div>
                )}
                {formData.freightData.vesselName && (
                  <div><span style={{ color: '#64748b' }}>Vessel: </span><strong style={{ color: '#1e293b' }}>{formData.freightData.vesselName}</strong></div>
                )}
                {formData.freightData.bookingNo && (
                  <div><span style={{ color: '#64748b' }}>Booking: </span><strong style={{ color: '#1e293b' }}>{formData.freightData.bookingNo}</strong></div>
                )}
                {formData.freightData.blNo && (
                  <div><span style={{ color: '#64748b' }}>BL No: </span><strong style={{ color: '#1e293b' }}>{formData.freightData.blNo}</strong></div>
                )}
                {formData.freightData.sailingDate && (
                  <div><span style={{ color: '#64748b' }}>Sailing: </span><strong style={{ color: '#1e293b' }}>{formData.freightData.sailingDate}</strong></div>
                )}
                {formData.freightData.etaDate && (
                  <div><span style={{ color: '#64748b' }}>ETA: </span><strong style={{ color: '#1e293b' }}>{formData.freightData.etaDate}</strong></div>
                )}
                {formData.freightData.arrivalDate && (
                  <div><span style={{ color: '#64748b' }}>Arrival: </span><strong style={{ color: '#1e293b' }}>{formData.freightData.arrivalDate}</strong></div>
                )}
                {formData.freightData.finalDeliveryDate && (
                  <div><span style={{ color: '#64748b' }}>Delivery: </span><strong style={{ color: '#1e293b' }}>{formData.freightData.finalDeliveryDate}</strong></div>
                )}
              </div>

              {formData.freightData.lastSyncedAt && (
                <div style={{ marginTop: '10px', fontSize: '0.7rem', color: '#94a3b8', textAlign: 'right' }}>
                  Last synced: {new Date(formData.freightData.lastSyncedAt).toLocaleString('en-IN')}
                </div>
              )}
            </div>
          )}
          {isEditMode ? (
            // Edit Form
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Name</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Stage</label>
                  <select
                    value={formData.stage || 'lead'}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                  >
                    {STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              {formData.stage === 'lost' && (
                <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '12px', border: '1.5px solid #fca5a5', marginBottom: '16px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', color: '#991b1b', fontWeight: 600, fontSize: '0.85rem' }}>
                      Reason for Loss <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      value={formData.closeReason || ''}
                      onChange={(e) => setFormData({ ...formData, closeReason: e.target.value === 'Other (Manual)' ? '' : e.target.value, _closeReasonMode: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '0.9rem', color: '#991b1b', background: '#ffffff', outline: 'none' }}
                    >
                      <option value="">-- Select a Reason --</option>
                      {LOST_REASONS.map(r => (
                        <option key={r.code} value={r.value}>
                          {r.code}: {r.label} — {r.description}
                        </option>
                      ))}
                      <option value="Other (Manual)">Other — Enter reason manually</option>
                    </select>
                    {(formData._closeReasonMode === 'Other (Manual)' || (formData.closeReason && !STANDARD_LOST_REASON_VALUES.includes(formData.closeReason))) && (
                      <input
                        type="text"
                        value={STANDARD_LOST_REASON_VALUES.includes(formData.closeReason) ? '' : formData.closeReason || ''}
                        onChange={(e) => setFormData({ ...formData, closeReason: e.target.value, _closeReasonMode: 'Other (Manual)' })}
                        placeholder="Describe the reason for losing this deal..."
                        style={{ width: '100%', marginTop: '8px', padding: '10px 12px', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '0.9rem', color: '#991b1b', outline: 'none', boxSizing: 'border-box' }}
                      />
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', color: '#991b1b', fontWeight: 600, fontSize: '0.85rem' }}>
                      Additional Notes
                    </label>
                    <textarea
                      value={formData.closeNotes || ''}
                      onChange={(e) => setFormData({ ...formData, closeNotes: e.target.value })}
                      placeholder="Enter details on why the deal was lost..."
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '0.9rem', minHeight: '80px', color: '#991b1b', outline: 'none' }}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Deal Value (₹)</label>
                  <input
                    type="number"
                    value={formData.value || ''}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Probability (%)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.probability || 0}
                      onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) })}
                      style={{ flex: 1 }}
                    />
                    <span style={{ minWidth: '40px', textAlign: 'center', fontWeight: 700, color: '#4f46e5' }}>{formData.probability || 0}%</span>
                  </div>
                </div>
              </div>

              {/* Location and HSN Code */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#0369a1', fontWeight: 700, fontSize: '0.9rem' }}>📍 Location / Port</label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Ex. Mumbai / Nhava Sheva / Mundra"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #bae6fd', borderRadius: '8px', fontSize: '0.9rem', background: '#f0f9ff' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>🏷️ HSN Code</label>
                  <input
                    type="text"
                    value={formData.hsnCode || ''}
                    onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                    placeholder="Ex. 8471, 7308"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: !['transportation', 'freight forwarding', 'export', 'import'].includes((formData.businessVertical || '').toLowerCase()) ? '1fr 1fr' : '1fr',
                gap: '16px',
                marginBottom: '16px'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Expected Close Date</label>
                  <input
                    type="date"
                    value={formData.expectedCloseDate?.substring(0, 10) || ''}
                    onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                  />
                </div>
                {!['transportation', 'freight forwarding', 'export', 'import'].includes((formData.businessVertical || '').toLowerCase()) && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Crate Size</label>
                    <input
                      type="text"
                      value={formData.crateSize || ''}
                      onChange={(e) => setFormData({ ...formData, crateSize: e.target.value })}
                      placeholder="Ex. 40ft x 20 units"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem' }}
                    />
                  </div>
                )}
              </div>

              {/* Company Type */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Company Type</label>
                <select
                  value={isOtherCompanyType ? 'Other' : (['OEM', 'Tier 1', 'Tier 2', 'Tier 3'].includes(formData.companyType) ? formData.companyType : '')}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'Other') {
                      setIsOtherCompanyType(true);
                      setFormData(prev => ({ ...prev, companyType: customCompanyType || 'Other' }));
                    } else {
                      setIsOtherCompanyType(false);
                      setCustomCompanyType('');
                      setFormData(prev => ({ ...prev, companyType: val }));
                    }
                  }}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', color: '#334155', background: '#ffffff', outline: 'none' }}
                >
                  <option value="">-- Select Company Type --</option>
                  <option value="OEM">OEM</option>
                  <option value="Tier 1">Tier 1</option>
                  <option value="Tier 2">Tier 2</option>
                  <option value="Tier 3">Tier 3</option>
                  <option value="Other">Other (Manual)</option>
                </select>
                {isOtherCompanyType && (
                  <div style={{ marginTop: '8px' }}>
                    <input
                      type="text"
                      value={customCompanyType}
                      onChange={e => {
                        const text = e.target.value;
                        setCustomCompanyType(text);
                        setFormData(prev => ({ ...prev, companyType: text }));
                      }}
                      placeholder="Specify company type manually..."
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid #3b82f6',
                        outline: 'none',
                        fontSize: '0.9rem',
                        background: '#f8fafc',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Lead Source */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Lead Source</label>
                <select
                  value={formData.source && !['Web / Own Generated Lead', 'IndiaMart Lead', 'Direct Sales Visit', 'Referral', 'Email Campaign', 'Company Branding'].includes(formData.source) ? 'Other' : (formData.source || '')}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'Other') {
                      setFormData({ ...formData, source: customSource || 'Other' });
                    } else {
                      setFormData({ ...formData, source: val });
                    }
                  }}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', color: '#334155', background: '#ffffff', outline: 'none' }}
                >
                  <option value="">-- Select Lead Source --</option>
                  <option value="Web / Own Generated Lead">Web / Own Generated Lead</option>
                  <option value="IndiaMart Lead">IndiaMart Lead</option>
                  <option value="Direct Sales Visit">Direct Sales Visit</option>
                  <option value="Referral">Referral</option>
                  <option value="Email Campaign">Email Campaign</option>
                  <option value="Company Branding">Company Branding</option>
                  <option value="Other">Other</option>
                </select>
                {((formData.source && !['Web / Own Generated Lead', 'IndiaMart Lead', 'Direct Sales Visit', 'Referral', 'Email Campaign', 'Company Branding'].includes(formData.source)) || formData.source === 'Other') && (
                  <div style={{ marginTop: '8px' }}>
                    <input
                      required
                      type="text"
                      value={customSource || (formData.source === 'Other' ? '' : formData.source)}
                      onChange={e => {
                        setCustomSource(e.target.value);
                        setFormData({ ...formData, source: e.target.value });
                      }}
                      placeholder="Enter custom source (e.g. LinkedIn, Exhibition)"
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', outline: 'none' }}
                    />
                  </div>
                )}
              </div>

              {formData.source === 'Referral' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Referral By (Person/Company Name) *</label>
                  <input
                    required
                    type="text"
                    value={formData.referralSourceName || ''}
                    onChange={(e) => setFormData({ ...formData, referralSourceName: e.target.value })}
                    placeholder="Who referred this deal?"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
                  />
                </div>
              )}

              {/* Garuda Team Member Name (Conditional - only show when lead source is Company Branding) */}
              {formData.source?.trim().toLowerCase() === 'company branding' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>
                    Garuda Team Member Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <AutoComplete
                    style={{ width: '100%' }}
                    value={formData.garudaTeamMemberName || ''}
                    options={garudaUserOptions}
                    filterOption={(inputValue, option) =>
                      (option?.searchStr || option?.value || '').toLowerCase().indexOf((inputValue || '').toLowerCase()) !== -1
                    }
                    onChange={(val) => setFormData({ ...formData, garudaTeamMemberName: val })}
                    placeholder="Search or enter Garuda team member name..."
                    allowClear
                  >
                    <Input
                      required
                      size="large"
                      placeholder="Search or enter Garuda team member name..."
                      style={{
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        borderColor: '#e2e8f0'
                      }}
                    />
                  </AutoComplete>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                    💡 Select from the Garuda user suggestions or manually enter any team member name.
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#475569', marginBottom: '12px' }}>Interested Services</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  {ALLOWED_SERVICES.map(service => (
                    <button
                      key={service}
                      type="button"
                      onClick={() => toggleService(service)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: (formData.services || []).includes(service) ? '#4f46e5' : '#e2e8f0',
                        background: (formData.services || []).includes(service) ? '#eef2ff' : '#fff',
                        color: (formData.services || []).includes(service) ? '#4f46e5' : '#64748b',
                        transition: 'all 0.2s'
                      }}
                    >
                      {service.charAt(0).toUpperCase() + service.slice(1)}
                    </button>
                  ))}
                  {(formData.services || []).filter(s => !ALLOWED_SERVICES.includes(s)).map(service => (
                    <button
                      key={service}
                      type="button"
                      onClick={() => toggleService(service)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid #4f46e5',
                        background: '#eef2ff',
                        color: '#4f46e5',
                        transition: 'all 0.2s'
                      }}
                    >
                      {service}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={customService}
                    onChange={(e) => setCustomService(e.target.value)}
                    placeholder="Add custom service..."
                    style={{ flex: 1, padding: '6px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem' }}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomService())}
                  />
                  <button
                    onClick={handleAddCustomService}
                    style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Add
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Add Remark</label>
                <textarea
                  value={newRemark}
                  onChange={(e) => setNewRemark(e.target.value)}
                  placeholder="Type a new remark here..."
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              {/* Planned Visits Section */}
              <div style={{ marginBottom: '16px', background: '#fff7ed', padding: '16px', borderRadius: '12px', border: '1px solid #fed7aa' }}>
                <label style={{ display: 'block', marginBottom: '10px', color: '#9a3412', fontWeight: 600, fontSize: '0.9rem' }}>
                  📅 Planned Visits
                </label>

                {/* Existing visits */}
                {formData.plannedVisits && formData.plannedVisits.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {formData.plannedVisits.map((visit, idx) => (
                      <div key={visit._id || idx} style={{
                        display: 'flex', flexDirection: 'column', gap: '8px',
                        background: visit.isCompleted ? '#f0fdf4' : visit.isCancelled ? '#f8fafc' : '#ffffff',
                        padding: '10px 12px', borderRadius: '8px',
                        border: visit.isCompleted ? '1px solid #bbf7d0' : visit.isCancelled ? '1px solid #cbd5e1' : '1px solid #fed7aa'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="checkbox"
                              checked={visit.isCompleted}
                              onChange={() => !visit.isCompleted && !visit.isCancelled && handleCompleteVisit(visit._id)}
                              disabled={visit.isCompleted || visit.isCancelled || completingVisitId === visit._id}
                              style={{ cursor: (visit.isCompleted || visit.isCancelled) ? 'default' : 'pointer', width: '16px', height: '16px' }}
                            />
                            <div>
                              <div style={{
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                color: visit.isCompleted ? '#15803d' : visit.isCancelled ? '#64748b' : '#9a3412',
                                textDecoration: visit.isCancelled ? 'line-through' : 'none'
                              }}>
                                {visit.visitDate ? new Date(visit.visitDate).toLocaleDateString('en-IN') : 'No date'}
                              </div>
                              {visit.isCompleted && visit.completedAt && (
                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                  Completed on {new Date(visit.completedAt).toLocaleDateString('en-IN')}
                                </div>
                              )}
                              {visit.isCancelled && visit.cancelledAt && (
                                <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                  Cancelled on {new Date(visit.cancelledAt).toLocaleDateString('en-IN')}
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {visit.isCompleted && (
                              <span style={{ fontSize: '0.7rem', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, border: '1px solid #bbf7d0' }}>
                                ✓ Done
                              </span>
                            )}
                            {visit.isCancelled && (
                              <span style={{ fontSize: '0.7rem', background: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: '12px', fontWeight: 700, border: '1px solid #fca5a5' }}>
                                ❌ Cancelled
                              </span>
                            )}
                            {!visit.isCompleted && !visit.isCancelled && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPostponingVisitId(postponingVisitId === visit._id ? null : visit._id);
                                    setPostponeDate(visit.visitDate ? visit.visitDate.substring(0, 10) : '');
                                  }}
                                  style={{ padding: '4px 8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                >
                                  Postpone
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCancelVisit(visit._id)}
                                  style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                            {completingVisitId === visit._id && (
                              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Saving...</span>
                            )}
                          </div>
                        </div>

                        {/* Inline Reschedule / Postpone form */}
                        {postponingVisitId === visit._id && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', background: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            <input
                              type="date"
                              value={postponeDate}
                              onChange={(e) => setPostponeDate(e.target.value)}
                              style={{ flex: 1, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.85rem' }}
                            />
                            <button
                              type="button"
                              onClick={() => handlePostponeVisit(visit._id)}
                              style={{ padding: '4px 8px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Save Date
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPostponingVisitId(null);
                                setPostponeDate('');
                              }}
                              style={{ padding: '4px 8px', background: '#64748b', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Close
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '16px' }}>No visits planned yet.</p>
                )}

                {/* Add new visit */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="date"
                    value={newVisitDate}
                    onChange={(e) => setNewVisitDate(e.target.value)}
                    style={{ flex: 1, padding: '8px 12px', border: '1px solid #fdba74', borderRadius: '8px', fontSize: '0.9rem', color: '#7c2d12' }}
                  />
                  <button
                    onClick={handleAddVisit}
                    style={{ padding: '8px 16px', background: '#f97316', color: 'white', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Add Visit
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                <button
                  onClick={() => setIsEditMode(false)}
                  style={{ padding: '10px 20px', border: '1px solid #e2e8f0', background: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{ padding: '10px 20px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, opacity: isSaving ? 0.6 : 1 }}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Opportunity Details */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: '#475569', fontWeight: 700, marginBottom: '14px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Deal Details
                </h4>

                {/* Reason for Loss Banner */}
                {formData.stage === 'lost' && (
                  <div style={{
                    background: 'linear-gradient(135deg, #fff5f5 0%, #fff1f2 100%)',
                    borderRadius: '12px',
                    border: '1.5px solid #fecdd3',
                    padding: '16px 18px',
                    marginBottom: '20px',
                    boxShadow: '0 2px 8px -2px rgba(225, 29, 72, 0.08)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#ffe4e6', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <AlertOctagon size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Deal Status</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#881337' }}>Closed – Lost</div>
                        </div>
                      </div>
                      <span style={{
                        background: '#ffffff',
                        color: '#be123c',
                        border: '1px solid #fca5a5',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                      }}>
                        {formData.closeReason || 'Not specified'}
                      </span>
                    </div>

                    {formData.closeNotes && (
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.7)',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        borderLeft: '3px solid #e11d48',
                        marginTop: '8px'
                      }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9f1239', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '2px' }}>
                          Additional Notes & Feedback
                        </div>
                        <p style={{ margin: 0, color: '#4c0519', fontSize: '0.85rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                          {formData.closeNotes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Details Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                  marginBottom: '20px'
                }}>
                  {/* Expected Close */}
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                      <Calendar size={13} color="#94a3b8" /> Expected Close
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: formData.expectedCloseDate ? '#0f172a' : '#94a3b8' }}>
                      {formData.expectedCloseDate ? new Date(formData.expectedCloseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </div>
                  </div>

                  {/* Forecast Category */}
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                      <TrendingUp size={13} color="#94a3b8" /> Forecast Category
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', textTransform: 'capitalize' }}>
                      {formData.forecastCategory || 'Pipeline'}
                    </div>
                  </div>

                  {/* Location / Port */}
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                      <MapPin size={13} color="#0284c7" /> Location / Port
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: (formData.location || formData.pol || formData.pod) ? '#0369a1' : '#94a3b8' }}>
                      {formData.location || (formData.pol || formData.pod ? `${formData.pol || ''}${formData.pol && formData.pod ? ' → ' : ''}${formData.pod || ''}` : '—')}
                    </div>
                  </div>

                  {/* HSN Code */}
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                      <Hash size={13} color="#94a3b8" /> HSN Code
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: formData.hsnCode ? '#0f172a' : '#94a3b8', fontFamily: formData.hsnCode ? 'monospace' : 'inherit' }}>
                      {formData.hsnCode || '—'}
                    </div>
                  </div>

                  {/* Lead Source */}
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                      <Tag size={13} color="#94a3b8" /> Lead Source
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: formData.source ? '#0f172a' : '#94a3b8' }}>
                      {formData.source || '—'}
                    </div>
                  </div>

                  {/* Company Type */}
                  <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                      <Building2 size={13} color="#94a3b8" /> Company Type
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: formData.companyType ? '#0f172a' : '#94a3b8' }}>
                      {formData.companyType || '—'}
                    </div>
                  </div>

                  {/* Crate Size (if applicable) */}
                  {formData.crateSize && !['transportation', 'freight forwarding', 'export', 'import'].includes((formData.businessVertical || '').toLowerCase()) && (
                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                        📦 Crate Size
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>
                        {formData.crateSize}
                      </div>
                    </div>
                  )}

                  {/* Referral Source */}
                  {formData.source === 'Referral' && formData.referralSourceName && (
                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #f1f5f9', gridColumn: 'span 2' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                        Referred By
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>
                        {formData.referralSourceName}
                      </div>
                    </div>
                  )}

                  {/* Garuda Team Member */}
                  {formData.garudaTeamMemberName && (
                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #f1f5f9', gridColumn: 'span 2' }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                        Garuda Team Member
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>
                        👤 {formData.garudaTeamMemberName}
                      </div>
                    </div>
                  )}
                </div>

                {/* Interested Services */}
                {(formData.services || []).length > 0 && (
                  <div style={{ background: '#ffffff', padding: '14px 16px', borderRadius: '10px', border: '1px solid #f1f5f9', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                      <Layers size={13} color="#6366f1" /> Interested Services
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {(formData.services || []).map(service => (
                        <span
                          key={service}
                          style={{
                            padding: '4px 12px',
                            borderRadius: '16px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            background: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe'
                          }}
                        >
                          {service.charAt(0).toUpperCase() + service.slice(1)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Planned Visits Display (View Mode) */}
              {formData.plannedVisits && formData.plannedVisits.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ color: '#475569', fontWeight: 700, marginBottom: '12px', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Planned Visits ({formData.plannedVisits.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {formData.plannedVisits.map((visit, idx) => (
                      <div key={visit._id || idx} style={{
                        background: visit.isCompleted ? '#f0fdf4' : visit.isCancelled ? '#f8fafc' : '#fff7ed',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: visit.isCompleted ? '1px solid #bbf7d0' : visit.isCancelled ? '1px solid #e2e8f0' : '1px solid #fed7aa',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: visit.isCompleted ? '#dcfce7' : visit.isCancelled ? '#f1f5f9' : '#ffedd5',
                            color: visit.isCompleted ? '#16a34a' : visit.isCancelled ? '#94a3b8' : '#ea580c',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Calendar size={16} />
                          </span>
                          <div>
                            <div style={{
                              fontSize: '0.9rem',
                              fontWeight: 700,
                              color: visit.isCompleted ? '#15803d' : visit.isCancelled ? '#64748b' : '#9a3412',
                              textDecoration: visit.isCancelled ? 'line-through' : 'none'
                            }}>
                              {visit.visitDate ? new Date(visit.visitDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'No date'}
                            </div>
                            {visit.isCompleted && visit.completedAt && (
                              <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '2px' }}>
                                ✓ Completed on {new Date(visit.completedAt).toLocaleDateString('en-IN')}
                              </div>
                            )}
                            {visit.isCancelled && visit.cancelledAt && (
                              <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '2px' }}>
                                ❌ Cancelled on {new Date(visit.cancelledAt).toLocaleDateString('en-IN')}
                              </div>
                            )}
                          </div>
                        </div>

                        <span style={{
                          fontSize: '0.75rem',
                          background: visit.isCompleted ? '#dcfce7' : visit.isCancelled ? '#fee2e2' : '#ffedd5',
                          color: visit.isCompleted ? '#15803d' : visit.isCancelled ? '#ef4444' : '#c2410c',
                          padding: '3px 12px',
                          borderRadius: '16px',
                          fontWeight: 700,
                          border: visit.isCompleted ? '1px solid #bbf7d0' : visit.isCancelled ? '1px solid #fca5a5' : '1px solid #fed7aa'
                        }}>
                          {visit.isCompleted ? 'Completed' : visit.isCancelled ? 'Cancelled' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks Checklist Section */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ color: '#475569', fontWeight: 700, margin: 0, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Tasks
                  </h4>
                  <button
                    onClick={handleAddTaskClick}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#4f46e5',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#4338ca'}
                    onMouseLeave={e => e.currentTarget.style.background = '#4f46e5'}
                  >
                    <span>➕ Add Task</span>
                  </button>
                </div>

                {formData.tasks && formData.tasks.length > 0 ? (() => {
                  const total = formData.tasks.length;
                  const completed = formData.tasks.filter(t => t.status === 'completed').length;
                  const pct = Math.round((completed / total) * 100);
                  const sortedTasks = [...formData.tasks].sort((a, b) => {
                    if (a.status === 'completed' && b.status !== 'completed') return 1;
                    if (a.status !== 'completed' && b.status === 'completed') return -1;
                    return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
                  });

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* Tasks Progress Bar */}
                      <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                          <span>Progress ({completed}/{total} Completed)</span>
                          <span style={{ color: pct === 100 ? '#10b981' : '#4f46e5' }}>{pct}%</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#10b981' : '#4f46e5', borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
                        </div>
                      </div>

                      {/* Tasks List */}
                      {sortedTasks.map((task) => {
                        const taskCreatorId = task.createdBy?._id || task.createdBy;
                        const isCreator = taskCreatorId && (taskCreatorId.toString() === (user?._id || user?.id)?.toString());
                        const isAdminUser = user?.role?.toLowerCase() === 'admin';
                        const canModify = isCreator || isAdminUser;
                        const isOverdue = task.dueDate && task.status !== 'completed' && new Date(task.dueDate) < new Date(new Date().toDateString());

                        return (
                          <div
                            key={task._id}
                            style={{
                              background: '#fff',
                              padding: '12px 16px',
                              borderRadius: '10px',
                              border: isOverdue ? '1.5px solid #fca5a5' : '1px solid #e2e8f0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '12px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                              <input
                                type="checkbox"
                                checked={task.status === 'completed'}
                                onChange={() => handleToggleTaskComplete(task)}
                                style={{ cursor: 'pointer', width: '16px', height: '16px', flexShrink: 0 }}
                              />
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <span
                                  style={{
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                                    color: task.status === 'completed' ? '#94a3b8' : '#1e293b',
                                    display: 'block',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                  title={task.title}
                                >
                                  {task.title}
                                </span>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '2px' }}>
                                  {task.dueDate && (
                                    <span style={{ fontSize: '0.75rem', color: isOverdue ? '#dc2626' : '#64748b', fontWeight: isOverdue ? 700 : 500 }}>
                                      📅 Due: {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                    </span>
                                  )}
                                  {task.assignedTo && (
                                    <span style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 500 }}>
                                      👤 {task.assignedTo.first_name ? `${task.assignedTo.first_name} ${task.assignedTo.last_name || ''}`.trim() : task.assignedTo.username}
                                    </span>
                                  )}
                                  {isOverdue && (
                                    <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: '0.65rem', fontWeight: 800, padding: '1px 6px', borderRadius: '4px', border: '1px solid #fecaca' }}>
                                      ⚠️ OVERDUE
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {canModify && (
                              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                <button
                                  type="button"
                                  onClick={() => handleEditTaskClick(task)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', padding: '4px' }}
                                  title="Edit Task"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTask(task._id)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                                  title="Delete Task"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })() : (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <div style={{ fontSize: '0.85rem', fontStyle: 'italic', marginBottom: '8px' }}>No tasks assigned to this opportunity yet.</div>
                    <button
                      onClick={handleAddTaskClick}
                      style={{ background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      ➕ Create First Task
                    </button>
                  </div>
                )}
              </div>

              {/* Remarks History */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: '#475569', fontWeight: 700, marginBottom: '12px', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Remarks History</h4>
                {formData.remarks && formData.remarks.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {formData.remarks.slice().reverse().map((remark, idx) => (
                      <div key={remark._id || idx} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #4f46e5', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.85rem' }}>{remark.userName || 'Unknown'}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {new Date(remark.createdAt).toLocaleDateString('en-IN')} {new Date(remark.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={() => {
                                  setEditingRemarkId(remark._id);
                                  setEditingRemarkText(remark.text);
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '2px' }}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteRemark(remark._id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {editingRemarkId === remark._id ? (
                          <div style={{ marginTop: '8px' }}>
                            <textarea
                              value={editingRemarkText}
                              onChange={(e) => setEditingRemarkText(e.target.value)}
                              style={{ width: '100%', padding: '8px', border: '1px solid #3b82f6', borderRadius: '6px', fontSize: '0.9rem', minHeight: '60px' }}
                            />
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                              <button onClick={() => setEditingRemarkId(null)} style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', border: '1px solid #e2e8f0', background: 'white' }}>Cancel</button>
                              <button onClick={() => handleEditRemark(remark._id)} style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', background: '#4f46e5', color: 'white', border: 'none' }}>Update</button>
                            </div>
                          </div>
                        ) : (
                          <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{remark.text}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>No remarks added yet.</p>
                )}
              </div>

              {/* Activity Timeline */}
              <div style={{ marginTop: '24px' }}>
                <ActivityTimeline linkedId={opportunity._id} linkedType="opportunity" />
              </div>
            </>
          )}
        </div>
      </div>
      <QuoteFormModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        initialTitle={`${opportunity.name} - Quote`}
        initialAccountId={typeof opportunity.accountId === 'object' ? opportunity.accountId?._id : opportunity.accountId}
        initialCompany={typeof opportunity.accountId === 'object' ? opportunity.accountId?.name : ''}
        initialContactId={typeof opportunity.primaryContactId === 'object' ? opportunity.primaryContactId?._id : opportunity.primaryContactId}
        initialContactName={typeof opportunity.primaryContactId === 'object' ? `${opportunity.primaryContactId?.firstName || ''} ${opportunity.primaryContactId?.lastName || ''}`.trim() : ''}
        initialOpportunityId={opportunity._id}
        initialOpportunityName={opportunity.name}
        onRefresh={onRefresh}
      />
      <PricingRequestFormModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        initialRelatedType="Opportunity"
        initialRelatedId={opportunity._id}
        initialSubject={`Pricing rate request for Opportunity: ${opportunity.name}`}
        initialTargetPrice={formData.value || opportunity.value}
        onRefresh={onRefresh}
      />
      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTaskForModal(null);
        }}
        onRefresh={async () => {
          onRefresh();
          const res = await axios.get(
            `${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunity._id}`,
            getHeaders()
          );
          setFormData(res.data);
        }}
        task={selectedTaskForModal}
      />
    </div>
  );
}
