import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Tag, message, Button, Modal, Select } from 'antd';
import { Sparkles, Plus, CheckCircle, XCircle, MinusCircle, Users, Trash2 } from 'lucide-react';
import { UserContext } from '../../../contexts/UserContext';
import SalesTacticSelector from './SalesTacticSelector';

export default function DealTacticsList({
  dealId,
  tactics = [],
  partner = null,
  service = '',
  dealStage = 'lead',
  onRefresh
}) {
  const { user } = useContext(UserContext) || {};
  const userRole = (user?.role || '').toLowerCase();
  const crmRole = (user?.crmRole || '').toLowerCase();
  const username = (user?.username || '').toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'superadmin' || crmRole === 'admin' || username === 'dev_master' || username.includes('ajay');

  const [dealTactics, setDealTactics] = useState(tactics || []);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTactics, setNewTactics] = useState([]);
  const [newPartner, setNewPartner] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  const fetchDealTactics = async () => {
    if (!dealId) return;
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/opportunities/${dealId}/tactics`,
        { withCredentials: true }
      );
      if (res.data?.success && Array.isArray(res.data.data)) {
        setDealTactics(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching deal tactics:', err);
    }
  };

  useEffect(() => {
    if (dealId) {
      fetchDealTactics();
    }
  }, [dealId]);

  const handleAddTactics = async () => {
    if (newTactics.length === 0) {
      message.error('Please select at least one tactic to add.');
      return;
    }
    if (newTactics.includes('T29') && !newPartner) {
      message.error('Partner source is mandatory when T29 is selected.');
      return;
    }

    try {
      setIsAdding(true);
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/crm/opportunities/${dealId}/tactics`,
        {
          tactic_ids: newTactics,
          partner_source_id: newPartner
        },
        { withCredentials: true }
      );

      message.success('Tactic(s) added successfully!');
      setIsAddModalOpen(false);
      setNewTactics([]);
      setNewPartner(null);
      await fetchDealTactics();
      if (onRefresh) onRefresh();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to add tactic');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveTactic = (tactic) => {
    const code = tactic.tactic_code || tactic.tactic_id?.code || 'this tactic';
    Modal.confirm({
      zIndex: 100025,
      title: `Remove Tactic ${code}?`,
      content: (
        <div>
          <p>Are you sure you want to remove <strong>{code}</strong> from this deal?</p>
          <p style={{ color: '#dc2626', fontSize: '0.78rem', marginTop: '4px' }}>
            Only administrators are authorized to remove sales tactics.
          </p>
        </div>
      ),
      okText: 'Remove',
      okButtonProps: { danger: true },
      async onOk() {
        try {
          const targetId = tactic._id || tactic.tactic_code;
          const res = await axios.delete(
            `${process.env.REACT_APP_API_STRING}/crm/opportunities/${dealId}/tactics/${targetId}`,
            { withCredentials: true }
          );
          if (res.data?.success) {
            message.success(`Tactic ${code} removed successfully.`);
            await fetchDealTactics();
            if (onRefresh) onRefresh();
          }
        } catch (err) {
          message.error(err.response?.data?.message || 'Failed to remove tactic');
        }
      }
    });
  };

  const getResultBadge = (result, note) => {
    if (result === 'worked') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <Tag color="success" style={{ display: 'flex', alignItems: 'center', gap: '3px', margin: 0, fontWeight: 700 }}>
            <CheckCircle size={11} /> Worked
          </Tag>
          {note && <span style={{ fontSize: '0.7rem', color: '#15803d', fontStyle: 'italic' }}>"{note}"</span>}
        </div>
      );
    }
    if (result === 'did_not_work') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <Tag color="error" style={{ display: 'flex', alignItems: 'center', gap: '3px', margin: 0, fontWeight: 700 }}>
            <XCircle size={11} /> Did not work
          </Tag>
          {note && <span style={{ fontSize: '0.7rem', color: '#b91c1c', fontStyle: 'italic' }}>"{note}"</span>}
        </div>
      );
    }
    if (result === 'not_used') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <Tag color="default" style={{ display: 'flex', alignItems: 'center', gap: '3px', margin: 0, fontWeight: 600 }}>
            <MinusCircle size={11} /> Not used
          </Tag>
          {note && <span style={{ fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic' }}>"{note}"</span>}
        </div>
      );
    }
    return (
      <Tag color="processing" style={{ margin: 0, fontSize: '0.7rem' }}>
        Pending Close
      </Tag>
    );
  };

  return (
    <div style={{
      background: '#ffffff',
      padding: '12px 14px',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={14} color="#6366f1" />
          <h4 style={{ margin: 0, color: '#334155', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Playbook Tactics Used ({dealTactics.length})
          </h4>
        </div>
        <Button
          type="primary"
          size="small"
          icon={<Plus size={12} />}
          onClick={() => setIsAddModalOpen(true)}
          style={{ background: '#4f46e5', borderColor: '#4f46e5', display: 'flex', alignItems: 'center', fontSize: '0.75rem', borderRadius: '6px' }}
        >
          Add Tactic
        </Button>
      </div>

      {partner && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          padding: '6px 10px',
          borderRadius: '6px',
          marginBottom: '10px',
          fontSize: '0.75rem',
          color: '#334155'
        }}>
          <Users size={12} color="#4f46e5" />
          <span>Strategic Partner Source: <strong>{partner.name || partner}</strong> {partner.office ? `(${partner.office})` : ''}</span>
        </div>
      )}

      {dealTactics.length === 0 ? (
        <div style={{ padding: '14px', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem', background: '#f8fafc', borderRadius: '6px' }}>
          No sales tactics attached yet. Click <strong>Add Tactic</strong> to tag a Playbook strategy.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {dealTactics.map(dt => {
            const author = dt.added_by?.first_name ? `${dt.added_by.first_name} ${dt.added_by.last_name || ''}`.trim() : (dt.added_by?.username || 'Sales Rep');
            const tacticTitle = dt.tactic_id?.name ? `${dt.tactic_code} ${dt.tactic_id.name}` : dt.tactic_code;
            const stage = dt.tactic_id?.stage || 'Strategy';

            return (
              <div
                key={dt._id || dt.tactic_code}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 10px',
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  borderRadius: '6px',
                  flexWrap: 'wrap',
                  gap: '6px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.8rem' }}>
                      {tacticTitle}
                    </span>
                    <Tag color="purple" style={{ fontSize: '0.65rem', margin: 0, padding: '0 4px', lineHeight: '16px' }}>
                      {stage}
                    </Tag>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                    Added by {author} • Stage: <span style={{ textTransform: 'capitalize' }}>{dt.deal_status_when_added || 'lead'}</span> • {new Date(dt.added_at).toLocaleDateString('en-IN')}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {getResultBadge(dt.result, dt.result_note)}
                  {isAdmin && (
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<Trash2 size={13} />}
                      onClick={() => handleRemoveTactic(dt)}
                      title="Remove Tactic (Admin Only)"
                      style={{ padding: '0 4px', height: '24px', display: 'flex', alignItems: 'center' }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Tactic Modal */}
      <Modal
        title="Add Sales Tactic to Deal"
        open={isAddModalOpen}
        onCancel={() => setIsAddModalOpen(false)}
        onOk={handleAddTactics}
        confirmLoading={isAdding}
        okText="Add to Deal"
        width={500}
        zIndex={100005}
      >
        <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '12px' }}>
          Select any additional tactics used during your sales cycle. Note: Tactics are permanent history and cannot be deleted once saved.
        </p>
        <SalesTacticSelector
          selectedTactics={newTactics}
          onChangeTactics={setNewTactics}
          onChange={setNewTactics}
          selectedPartner={newPartner}
          onChangePartner={setNewPartner}
          onPartnerChange={setNewPartner}
          service={service}
          required={true}
        />
      </Modal>
    </div>
  );
}
