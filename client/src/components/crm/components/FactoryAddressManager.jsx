import React, { useState } from 'react';
import { Typography, Tag, Tooltip } from 'antd';
import { BankOutlined } from '@ant-design/icons';
import FileUpload from './FileUpload';

const { Text } = Typography;

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal','Andaman and Nicobar Islands','Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu','Delhi','Jammu and Kashmir',
  'Ladakh','Lakshadweep','Puducherry',
];

const GST_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]$/;

function FactoryAddressManager({ value = [], onChange }) {
  const add = () => onChange([...value, {}]);
  const remove = i => onChange(value.filter((_, idx) => idx !== i));
  const update = (i, field, val) => {
    const next = [...value];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue)' }}>FACTORY ADDRESSES ({value.length})</div>
        <button type="button" className="btn btn-outline btn-sm" onClick={add}>+ Add Factory</button>
      </div>

      {value.map((f, i) => (
        <div key={i} className="repeat-entry">
          <div className="repeat-entry-header">
            <div className="repeat-entry-title">
              <BankOutlined style={{ marginRight: 6 }} /> Factory {i + 1}
            </div>
            <button type="button" className="btn-remove" onClick={() => remove(i)}>🗑</button>
          </div>
          <div className="fields">
            <div className="row">
              <div className="field w-half">
                <label>Address Line 1 <span className="req">*</span></label>
                <input type="text" placeholder="Building / Street" value={f.factory_address_line_1 || ''} onChange={e => update(i, 'factory_address_line_1', e.target.value)} />
              </div>
              <div className="field w-half">
                <label>Address Line 2</label>
                <input type="text" placeholder="Locality / Area" value={f.factory_address_line_2 || ''} onChange={e => update(i, 'factory_address_line_2', e.target.value)} />
              </div>
            </div>
            <div className="row mt-2">
              <div className="field w-third">
                <label>City <span className="req">*</span></label>
                <input type="text" placeholder="City" value={f.factory_address_city || ''} onChange={e => update(i, 'factory_address_city', e.target.value)} />
              </div>
              <div className="field w-third">
                <label>State <span className="req">*</span></label>
                <select value={f.factory_address_state || ''} onChange={e => update(i, 'factory_address_state', e.target.value)}>
                  <option value="">Select State</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field w-third">
                <label>PIN Code <span className="req">*</span></label>
                <input type="text" placeholder="6 digits" maxLength={6} value={f.factory_address_pin_code || ''} onChange={e => update(i, 'factory_address_pin_code', e.target.value)} />
              </div>
            </div>
            <div className="row mt-2">
              <div className="field w-full">
                <label>GST Number <Tooltip title="Format: 22AAAAA0000A1Z5"><span style={{ color: '#1890ff', fontSize: 10, cursor: 'pointer', marginLeft: 4 }}>ℹ️</span></Tooltip></label>
                <input type="text" placeholder="22AAAAA0000A1Z5" maxLength={15} style={{ textTransform: 'uppercase', fontFamily: 'monospace' }} value={f.gst || ''} onChange={e => update(i, 'gst', e.target.value.toUpperCase())} />
              </div>
            </div>
            <div className="row mt-2">
              <div className="field w-full">
                <FileUpload label="GST Registration Certificate" value={f.gst_reg || []} onChange={v => update(i, 'gst_reg', v)} bucketPath="crm-docs/factory-gst" />
              </div>
            </div>
          </div>
        </div>
      ))}

      {value.length === 0 && (
        <div className="empty-state">No factory addresses added.</div>
      )}
    </div>
  );
}

export default FactoryAddressManager;
