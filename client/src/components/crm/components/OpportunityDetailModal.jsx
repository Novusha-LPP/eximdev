import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { X, Edit2, Trash2, FileText, DollarSign } from 'lucide-react';
import { message, Modal } from 'antd';
import { UserContext } from '../../../contexts/UserContext';
import ActivityTimeline from './ActivityTimeline';
import QuoteFormModal from './QuoteFormModal';
import PricingRequestFormModal from './PricingRequestFormModal';
import TaskFormModal from './TaskFormModal';

const STAGES = ['lead', 'qualified', 'opportunity', 'sales_visit', 'proposal', 'negotiation', 'won', 'lost'];

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
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedTaskForModal, setSelectedTaskForModal] = useState(null);

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
      const standardSources = ['Web / Own Generated Lead', 'IndiaMart Lead', 'Direct Sales Visit', 'Referral', 'Email Campaign'];
      if (opportunity.source && !standardSources.includes(opportunity.source)) {
        setCustomSource(opportunity.source);
      } else {
        setCustomSource('');
      }
    }
  }, [isOpen, opportunity]);

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
        source: formData.source,
        referralSourceName: formData.referralSourceName
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
        maxWidth: '700px',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'white' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1e293b', fontWeight: 700, fontSize: '1.2rem' }}>{formData.name || opportunity.name}</h3>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Stage: {formData.stage || opportunity.stage}</span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {!isEditMode && (
              <>
                <button
                  onClick={() => setIsQuoteModalOpen(true)}
                  style={{ padding: '8px 12px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <FileText size={16} /> Create Quote
                </button>
                <button
                  onClick={() => setIsPricingModalOpen(true)}
                  style={{ padding: '8px 12px', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <DollarSign size={16} /> Request Pricing
                </button>
                <button
                  onClick={() => setIsEditMode(true)}
                  style={{ padding: '8px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Edit2 size={16} /> Edit
                </button>
                <button
                  onClick={handleDelete}
                  style={{ padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Trash2 size={16} /> Delete
                </button>
              </>
            )}
            <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Referral Highlighting Banner */}
          {(formData.isReferral || formData.referredFromTeamId || formData.referredToTeamId) && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 16px', background: '#fef2f2', borderRadius: '8px',
              marginBottom: '20px', border: '1px solid #fecaca', color: '#991b1b'
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>⚡ Cross-Team Referral:</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                Referred from {formData.referredFromTeamId?.teamName || formData.referredFromTeamId?.name || 'Team'} → {formData.referredToTeamId?.teamName || formData.referredToTeamId?.name || 'Team'}
              </span>
            </div>
          )}

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #4f46e5' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Value</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>₹{parseFloat(formData.value || 0).toLocaleString('en-IN')}</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Probability</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{formData.probability || 0}%</div>
            </div>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>Weighted Value</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                ₹{(parseFloat(formData.value || 0) * (parseFloat(formData.probability || 0) / 100)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {/* Created By — non-editable */}
          {(() => {
            const creator = formData.createdBy || formData.ownerId;
            if (!creator) return null;
            return (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 16px', background: '#f8fafc', borderRadius: '8px',
                marginBottom: '20px', border: '1px solid #e2e8f0'
              }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>🔒 Created By:</span>
                <span style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 700 }}>
                  {typeof creator === 'object'
                    ? `${creator.first_name || ''} ${creator.last_name || ''}`.trim() || creator.username
                    : creator}
                </span>
                {formData.createdAt && (
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: 'auto' }}>
                    on {new Date(formData.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
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
                      onChange={(e) => setFormData({ ...formData, closeReason: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #fca5a5', borderRadius: '8px', fontSize: '0.9rem', color: '#991b1b', background: '#ffffff', outline: 'none' }}
                    >
                      <option value="">-- Select a Reason --</option>
                      <option value="Price Lost">Price Lost — Lost due to competitor offering lower price</option>
                      <option value="Product Lost">Product Lost — Product did not meet client specifications</option>
                      <option value="No Reply / No Response">No Reply / No Response — Client became unresponsive</option>
                    </select>
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

              {/* Lead Source */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem' }}>Lead Source</label>
                <select
                  value={formData.source && !['Web / Own Generated Lead', 'IndiaMart Lead', 'Direct Sales Visit', 'Referral', 'Email Campaign'].includes(formData.source) ? 'Other' : (formData.source || '')}
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
                  <option value="Other">Other</option>
                </select>
                {((formData.source && !['Web / Own Generated Lead', 'IndiaMart Lead', 'Direct Sales Visit', 'Referral', 'Email Campaign'].includes(formData.source)) || formData.source === 'Other') && (
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
                <h4 style={{ color: '#475569', fontWeight: 700, marginBottom: '12px', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Details</h4>

                {formData.stage === 'lost' && (
                  <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '12px', border: '1px solid #fca5a5', marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#991b1b', fontWeight: 600 }}>Reason for Loss</div>
                    <p style={{ margin: '4px 0 12px 0', color: '#7f1d1d', fontWeight: 700, fontSize: '0.95rem' }}>
                      {formData.closeReason || 'Not specified'}
                    </p>
                    {formData.closeNotes && (
                      <>
                        <div style={{ fontSize: '0.8rem', color: '#991b1b', fontWeight: 600 }}>Additional Notes</div>
                        <p style={{ margin: '4px 0 0 0', color: '#7f1d1d', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                          {formData.closeNotes}
                        </p>
                      </>
                    )}
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Expected Close</span>
                    <p style={{ margin: '4px 0 0 0', color: '#334155', fontWeight: 600 }}>
                      {formData.expectedCloseDate ? new Date(formData.expectedCloseDate).toLocaleDateString('en-IN') : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Forecast Category</span>
                    <p style={{ margin: '4px 0 0 0', color: '#334155', fontWeight: 600 }}>{formData.forecastCategory || 'Pipeline'}</p>
                  </div>
                </div>

                {formData.crateSize && !['transportation', 'freight forwarding', 'export', 'import'].includes((formData.businessVertical || '').toLowerCase()) && (
                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>📦 Crate Size</span>
                    <p style={{ margin: '4px 0 0 0', color: '#334155', fontWeight: 600 }}>{formData.crateSize}</p>
                  </div>
                )}

                {formData.source && (
                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>📢 Lead Source</span>
                    <p style={{ margin: '4px 0 0 0', color: '#334155', fontWeight: 600 }}>{formData.source}</p>
                  </div>
                )}

                {formData.source === 'Referral' && formData.referralSourceName && (
                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Referral By (Person/Company Name)</span>
                    <p style={{ margin: '4px 0 0 0', color: '#334155', fontWeight: 600 }}>{formData.referralSourceName}</p>
                  </div>
                )}

                {/* Services Display */}
                {(formData.services || []).length > 0 && (
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '8px' }}>Interested Services</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {(formData.services || []).map(service => (
                        <span
                          key={service}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: '#eef2ff',
                            color: '#4f46e5',
                            border: '1px solid #4f46e5'
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
                  <h4 style={{ color: '#475569', fontWeight: 700, marginBottom: '12px', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Planned Visits</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {formData.plannedVisits.map((visit, idx) => (
                      <div key={visit._id || idx} style={{
                        background: visit.isCompleted ? '#f0fdf4' : visit.isCancelled ? '#f8fafc' : '#fff7ed',
                        padding: '12px', borderRadius: '8px',
                        borderLeft: visit.isCompleted ? '4px solid #22c55e' : visit.isCancelled ? '4px solid #94a3b8' : '4px solid #f97316',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                      }}>
                        <div>
                          <div style={{
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            color: visit.isCompleted ? '#15803d' : visit.isCancelled ? '#64748b' : '#9a3412',
                            textDecoration: visit.isCancelled ? 'line-through' : 'none'
                          }}>
                            📅 {visit.visitDate ? new Date(visit.visitDate).toLocaleDateString('en-IN') : 'No date'}
                          </div>
                          {visit.isCompleted && visit.completedAt && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                              Completed on {new Date(visit.completedAt).toLocaleDateString('en-IN')}
                            </div>
                          )}
                          {visit.isCancelled && visit.cancelledAt && (
                            <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px' }}>
                              Cancelled on {new Date(visit.cancelledAt).toLocaleDateString('en-IN')}
                            </div>
                          )}
                        </div>
                        <span style={{
                          fontSize: '0.7rem',
                          background: visit.isCompleted ? '#dcfce7' : visit.isCancelled ? '#fee2e2' : '#ffedd5',
                          color: visit.isCompleted ? '#15803d' : visit.isCancelled ? '#ef4444' : '#c2410c',
                          padding: '2px 10px', borderRadius: '12px', fontWeight: 700,
                          border: visit.isCompleted ? '1px solid #bbf7d0' : visit.isCancelled ? '1px solid #fca5a5' : '1px solid #fed7aa'
                        }}>
                          {visit.isCompleted ? '✓ Completed' : visit.isCancelled ? '❌ Cancelled' : '⏳ Pending'}
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
