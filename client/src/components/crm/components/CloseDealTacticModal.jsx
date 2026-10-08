import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Radio, Input, Button, Tag, message, Spin, Alert } from 'antd';
import { CheckCircle2, XCircle, AlertTriangle, Sparkles, Building2, IndianRupee } from 'lucide-react';
import confetti from 'canvas-confetti';
import { LOST_REASONS, STANDARD_LOST_REASON_VALUES } from '../crmConstants';
import SalesTacticSelector from './SalesTacticSelector';

export default function CloseDealTacticModal({
  isOpen,
  onClose,
  opportunity,
  targetStage, // 'won' or 'lost'
  onSuccess
}) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dealTactics, setDealTactics] = useState([]);
  const [tacticResults, setTacticResults] = useState({}); // { [tactic_code]: { result, result_note } }

  // Lost fields (if closing lost)
  const [closeReason, setCloseReason] = useState('');
  const [closeReasonMode, setCloseReasonMode] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [competitor, setCompetitor] = useState('');

  // Fallback for deals with 0 tactics (legacy)
  const [selectedNewTactics, setSelectedNewTactics] = useState([]);
  const [selectedNewPartner, setSelectedNewPartner] = useState(null);

  useEffect(() => {
    if (isOpen && opportunity?._id) {
      loadTacticsForDeal();
      setCloseReason(opportunity.closeReason || '');
      setCloseNotes(opportunity.closeNotes || '');
      setCompetitor(opportunity.competitor || '');
      setSelectedNewTactics([]);
      setSelectedNewPartner(null);
    }
  }, [isOpen, opportunity, targetStage]);

  const loadTacticsForDeal = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunity._id}/tactics`,
        { withCredentials: true }
      );

      const existingTactics = res.data?.data || [];
      setDealTactics(existingTactics);

      // Initialize result state
      const initialMap = {};
      existingTactics.forEach(dt => {
        initialMap[dt.tactic_code] = {
          tactic_id: dt.tactic_id?._id || dt.tactic_id,
          tactic_code: dt.tactic_code,
          result: dt.result || null,
          result_note: dt.result_note || ''
        };
      });
      setTacticResults(initialMap);
    } catch (err) {
      console.error('Error fetching deal tactics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResultChange = (tacticCode, tacticId, resultVal) => {
    setTacticResults(prev => ({
      ...prev,
      [tacticCode]: {
        ...(prev[tacticCode] || {}),
        tactic_id: tacticId,
        tactic_code: tacticCode,
        result: resultVal
      }
    }));
  };

  const handleNoteChange = (tacticCode, tacticId, noteVal) => {
    setTacticResults(prev => ({
      ...prev,
      [tacticCode]: {
        ...(prev[tacticCode] || {}),
        tactic_id: tacticId,
        tactic_code: tacticCode,
        result_note: noteVal
      }
    }));
  };

  const handleConfirmClose = async () => {
    // 1. Validation for Lost Reason if targetStage === 'lost'
    if (targetStage === 'lost') {
      const effectiveReason = closeReasonMode === 'Other (Manual)' ? closeReason.trim() : closeReason;
      if (!effectiveReason) {
        message.error('Please select or specify a Reason for Loss.');
        return;
      }
    }

    // 2. Validate tactics
    let tacticsToSubmit = [];

    if (dealTactics.length === 0) {
      // Deal had 0 tactics: check if new tactics were picked
      if (selectedNewTactics.length === 0) {
        message.error('Every deal requires at least one sales tactic before it can be closed.');
        return;
      }

      // Check results for each newly selected tactic
      for (const code of selectedNewTactics) {
        const item = tacticResults[code];
        if (!item?.result) {
          message.error(`Please select an outcome ('Worked', 'Did not work', or 'Not used') for ${code}.`);
          return;
        }
        if (!item?.result_note || !item.result_note.trim()) {
          message.error(`Please provide a one-line reason note for ${code}.`);
          return;
        }
        tacticsToSubmit.push({
          tactic_code: code,
          result: item.result,
          result_note: item.result_note.trim()
        });
      }
    } else {
      // Existing tactics: verify all have result and note
      for (const dt of dealTactics) {
        const item = tacticResults[dt.tactic_code];
        if (!item?.result) {
          message.error(`Please select an outcome for ${dt.tactic_code} (${dt.tactic_id?.name || ''}).`);
          return;
        }
        if (!item?.result_note || !item.result_note.trim()) {
          message.error(`Please provide a one-line reason note for ${dt.tactic_code} (${dt.tactic_id?.name || ''}).`);
          return;
        }
        tacticsToSubmit.push({
          tactic_id: dt.tactic_id?._id || dt.tactic_id,
          tactic_code: dt.tactic_code,
          result: item.result,
          result_note: item.result_note.trim()
        });
      }
    }

    try {
      setSubmitting(true);

      // If new tactics need attaching first
      if (dealTactics.length === 0 && selectedNewTactics.length > 0) {
        await axios.post(
          `${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunity._id}/tactics`,
          {
            tactic_ids: selectedNewTactics,
            partner_source_id: selectedNewPartner,
            results: tacticsToSubmit
          },
          { withCredentials: true }
        );
      }

      // Transition the deal stage to Won or Lost
      const closePayload = {
        stage: targetStage,
        closeReason: targetStage === 'lost' ? closeReason : undefined,
        closeNotes: targetStage === 'lost' ? closeNotes : undefined,
        competitor: targetStage === 'lost' ? competitor : undefined,
        tactic_results: tacticsToSubmit
      };

      await axios.put(
        `${process.env.REACT_APP_API_STRING}/crm/opportunities/${opportunity._id}`,
        closePayload,
        { withCredentials: true }
      );

      if (targetStage === 'won') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        message.success('🎉 Deal Closed as WON and tactic outcomes recorded!');
      } else {
        message.success('Deal marked as Lost and tactic outcomes recorded.');
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error closing deal:', err);
      message.error(err.response?.data?.message || 'Failed to close deal');
    } finally {
      setSubmitting(false);
    }
  };

  const isWon = targetStage === 'won';

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isWon ? <CheckCircle2 size={20} color="#16a34a" /> : <XCircle size={20} color="#dc2626" />}
          <span>Record Outcomes & Close Deal: <strong>{opportunity?.name}</strong></span>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      width={720}
      zIndex={100005}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleConfirmClose}
          loading={submitting}
          style={{
            background: isWon ? '#16a34a' : '#dc2626',
            borderColor: isWon ? '#16a34a' : '#dc2626'
          }}
        >
          {isWon ? 'Confirm Deal Won' : 'Confirm Deal Lost'}
        </Button>
      ]}
    >
      <div style={{ maxHeight: '72vh', overflowY: 'auto', paddingRight: '4px' }}>
        {/* Stage Banner */}
        <div style={{
          padding: '10px 14px',
          borderRadius: '8px',
          background: isWon ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${isWon ? '#bbf7d0' : '#fecdd3'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div>
            <span style={{ fontWeight: 800, color: isWon ? '#15803d' : '#991b1b', fontSize: '0.9rem' }}>
              Target Stage: {isWon ? 'CLOSED – WON' : 'CLOSED – LOST'}
            </span>
            <div style={{ fontSize: '0.75rem', color: isWon ? '#166534' : '#b91c1c' }}>
              Value: ₹{Number(opportunity?.value || 0).toLocaleString('en-IN')}
            </div>
          </div>
          <Tag color={isWon ? 'success' : 'error'} style={{ fontSize: '0.78rem', padding: '3px 8px' }}>
            {isWon ? 'Won Deal' : 'Lost Deal'}
          </Tag>
        </div>

        {/* Reason for Loss Section (only if lost) */}
        {!isWon && (
          <div style={{
            background: '#fff',
            border: '1.5px solid #fecdd3',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '16px'
          }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#991b1b', fontWeight: 700 }}>
              Reason for Loss <span style={{ color: '#ef4444' }}>*</span>
            </h4>
            <div style={{ marginBottom: '10px' }}>
              <select
                value={closeReason}
                onChange={e => {
                  setCloseReason(e.target.value === 'Other (Manual)' ? '' : e.target.value);
                  setCloseReasonMode(e.target.value);
                }}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #fca5a5', fontSize: '0.82rem', background: '#fff' }}
              >
                <option value="">-- Select standard reason for loss --</option>
                {LOST_REASONS.map(r => (
                  <option key={r.code} value={r.value}>{r.code}: {r.label}</option>
                ))}
                <option value="Other (Manual)">Other (Manual entry)</option>
              </select>
            </div>
            {closeReasonMode === 'Other (Manual)' && (
              <Input
                placeholder="Enter custom loss reason..."
                value={closeReason}
                onChange={e => setCloseReason(e.target.value)}
                style={{ marginBottom: '10px' }}
              />
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '3px' }}>Competitor (if known)</label>
                <Input
                  placeholder="Competitor name..."
                  value={competitor}
                  onChange={e => setCompetitor(e.target.value)}
                  size="small"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '3px' }}>Additional Loss Notes</label>
                <Input
                  placeholder="Optional context..."
                  value={closeNotes}
                  onChange={e => setCloseNotes(e.target.value)}
                  size="small"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tactics Outcome Table */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Sparkles size={14} color="#6366f1" />
            <h4 style={{ margin: 0, fontSize: '0.88rem', color: '#1e293b', fontWeight: 700 }}>
              Sales Tactic Outcomes & Notes (Mandatory)
            </h4>
          </div>
          <p style={{ margin: '0 0 12px 0', fontSize: '0.75rem', color: '#64748b' }}>
            Suraj Group Playbook rules require recording whether each applied tactic worked and a short 1-line reason why.
          </p>

          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center' }}><Spin /> Loading tactics...</div>
          ) : dealTactics.length === 0 ? (
            // No tactics attached yet: allow selecting now
            <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <Alert
                type="info"
                showIcon
                message="No tactics currently attached"
                description="Select the tactic(s) that were tried during this deal so their performance is captured in reports."
                style={{ marginBottom: '12px', fontSize: '0.78rem' }}
              />
              <SalesTacticSelector
                selectedTactics={selectedNewTactics}
                onChangeTactics={setSelectedNewTactics}
                selectedPartner={selectedNewPartner}
                onChangePartner={setSelectedNewPartner}
                service={opportunity?.services?.[0] || ''}
                required={true}
              />
              {selectedNewTactics.length > 0 && (
                <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedNewTactics.map(code => (
                    <div key={code} style={{ background: '#fff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 700, color: '#4f46e5', fontSize: '0.82rem', marginBottom: '6px' }}>
                        {code}
                      </div>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Outcome:</span>
                        <Radio.Group
                          value={tacticResults[code]?.result}
                          onChange={e => handleResultChange(code, null, e.target.value)}
                          size="small"
                        >
                          <Radio.Button value="worked" style={{ color: '#16a34a' }}>Worked</Radio.Button>
                          <Radio.Button value="did_not_work" style={{ color: '#dc2626' }}>Did not work</Radio.Button>
                          <Radio.Button value="not_used" style={{ color: '#64748b' }}>Not used</Radio.Button>
                        </Radio.Group>
                      </div>
                      <Input
                        placeholder="One-line reason note (required)..."
                        value={tacticResults[code]?.result_note || ''}
                        onChange={e => handleNoteChange(code, null, e.target.value)}
                        size="small"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Existing tactics list: show each with outcome selector and note
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {dealTactics.map(dt => {
                const code = dt.tactic_code;
                const name = dt.tactic_id?.name || code;
                const currentRes = tacticResults[code]?.result;
                const currentNote = tacticResults[code]?.result_note || '';

                return (
                  <div
                    key={code}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px 14px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.85rem' }}>
                        <span style={{ color: '#4f46e5', marginRight: '6px' }}>{code}</span>
                        {name}
                      </span>
                      <Tag color="purple" style={{ fontSize: '0.68rem', margin: 0 }}>
                        {dt.tactic_id?.stage || 'Playbook'}
                      </Tag>
                    </div>

                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
                        Tactic Result <span style={{ color: '#ef4444' }}>*</span>:
                      </span>
                      <Radio.Group
                        value={currentRes}
                        onChange={e => handleResultChange(code, dt.tactic_id?._id || dt.tactic_id, e.target.value)}
                        size="small"
                      >
                        <Radio.Button value="worked" style={{ color: '#15803d', fontWeight: currentRes === 'worked' ? 700 : 400 }}>
                          ✓ Worked
                        </Radio.Button>
                        <Radio.Button value="did_not_work" style={{ color: '#b91c1c', fontWeight: currentRes === 'did_not_work' ? 700 : 400 }}>
                          ✕ Did not work
                        </Radio.Button>
                        <Radio.Button value="not_used" style={{ color: '#475569', fontWeight: currentRes === 'not_used' ? 700 : 400 }}>
                          – Not used
                        </Radio.Button>
                      </Radio.Group>
                    </div>

                    <div>
                      <Input
                        placeholder="One-line reason note (e.g. 'Customer liked menu options', 'Too complex for client')..."
                        value={currentNote}
                        onChange={e => handleNoteChange(code, dt.tactic_id?._id || dt.tactic_id, e.target.value)}
                        style={{ width: '100%', fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
