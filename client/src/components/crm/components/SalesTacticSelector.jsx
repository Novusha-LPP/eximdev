import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Select, Tag, Spin } from 'antd';
import { Sparkles, Users } from 'lucide-react';

const { Option, OptGroup } = Select;

export default function SalesTacticSelector({
  selectedTactics = [],
  onChangeTactics,
  selectedPartner = null,
  onChangePartner,
  service = '',
  required = true,
  disabled = false
}) {
  const [tactics, setTactics] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTacticsAndPartners();
  }, [service]);

  const fetchTacticsAndPartners = async () => {
    try {
      setLoading(true);
      const serviceParam = service ? `?service=${encodeURIComponent(service)}` : '';
      const [tacticsRes, partnersRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_STRING}/crm/tactics${serviceParam}`, { withCredentials: true }),
        axios.get(`${process.env.REACT_APP_API_STRING}/crm/tactics/partners`, { withCredentials: true })
      ]);

      if (tacticsRes.data?.data) {
        setTactics(tacticsRes.data.data);
      }
      if (partnersRes.data?.data) {
        setPartners(partnersRes.data.data);
      }
    } catch (err) {
      console.error('Error fetching tactics and partners:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group tactics by stage
  const stages = ['Foundations', 'Attraction', 'Upsell', 'Downsell', 'Continuity', 'Optimisation'];
  const groupedTactics = stages.reduce((acc, stage) => {
    acc[stage] = tactics.filter(t => t.stage === stage);
    return acc;
  }, {});

  // Check if T29 is selected
  const hasT29 = (selectedTactics || []).some(t => {
    if (typeof t === 'string') return t === 'T29' || t.startsWith('T29');
    return t?.code === 'T29' || t?._id === 'T29';
  });

  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', fontWeight: 700, color: '#334155' }}>
          <Sparkles size={13} color="#6366f1" />
          Sales Tactics Used {required && <span style={{ color: '#ef4444' }}>*</span>}
        </label>
        {service && (
          <span style={{ fontSize: '0.7rem', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '3px' }}>
            ★ Gold stars highlight Playbook-recommended tactics
          </span>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '8px', textAlign: 'center' }}><Spin size="small" /> Loading Playbook tactics...</div>
      ) : (
        <Select
          mode="multiple"
          placeholder="Select 1 or more tactics (e.g. T01 Money Model, T12 Decoy)..."
          value={selectedTactics}
          onChange={onChangeTactics}
          disabled={disabled}
          style={{ width: '100%' }}
          size="middle"
          optionLabelProp="label"
          filterOption={(input, option) => {
            const search = (input || '').toLowerCase();
            const childText = String(option?.children || option?.label || '').toLowerCase();
            return childText.includes(search);
          }}
        >
          {stages.map(stage => {
            const list = groupedTactics[stage] || [];
            if (list.length === 0) return null;
            return (
              <OptGroup key={stage} label={`── ${stage.toUpperCase()} ──`}>
                {list.map(t => (
                  <Option
                    key={t.code}
                    value={t.code}
                    label={`${t.code} ${t.name}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>
                        <strong style={{ color: '#4f46e5', marginRight: '6px' }}>{t.code}</strong>
                        {t.name}
                      </span>
                      {t.is_starred && (
                        <Tag color="gold" style={{ fontSize: '0.68rem', margin: 0, padding: '0 4px', lineHeight: '18px' }}>
                          ★ Suggested
                        </Tag>
                      )}
                    </div>
                  </Option>
                ))}
              </OptGroup>
            );
          })}
        </Select>
      )}

      {/* Conditional Partner Source when T29 is selected */}
      {hasT29 && (
        <div style={{
          marginTop: '10px',
          padding: '10px 12px',
          background: '#f8fafc',
          borderRadius: '8px',
          border: '1.5px solid #e0e7ff',
          animation: 'fadeIn 0.25s ease'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 700, color: '#3730a3', marginBottom: '5px' }}>
            <Users size={12} color="#4338ca" />
            Partner Source (Mandatory for T29 Strategic Affiliates) <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <Select
            placeholder="Select strategic partner or CFS..."
            value={selectedPartner}
            onChange={onChangePartner}
            style={{ width: '100%' }}
            size="middle"
            showSearch
            filterOption={(input, option) => {
              const search = (input || '').toLowerCase();
              return String(option?.children || '').toLowerCase().includes(search);
            }}
          >
            {partners.map(p => (
              <Option key={p._id} value={p._id}>
                {p.name} {p.office ? `(${p.office})` : ''} — <span style={{ color: '#64748b' }}>{p.partner_type}</span>
              </Option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
}
