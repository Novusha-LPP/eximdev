import React, { useState } from 'react';
import { Typography, Space, Tag } from 'antd';
import { HomeOutlined } from '@ant-design/icons';

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

function BranchManager({ value = [], onChange }) {
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
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue)' }}>BRANCHES ({value.length})</div>
        <button type="button" className="btn btn-outline btn-sm" onClick={add}>+ Add Branch</button>
      </div>

      {value.map((b, i) => (
        <div key={i} className="repeat-entry">
          <div className="repeat-entry-header">
            <div className="repeat-entry-title">
              <HomeOutlined style={{ marginRight: 6 }} /> Branch {i + 1}
            </div>
            <button type="button" className="btn-remove" onClick={() => remove(i)}>🗑</button>
          </div>
          <div className="fields">
            <div className="row">
              <div className="field w-half">
                <label>Branch Name <span className="req">*</span></label>
                <input type="text" placeholder="e.g. Mumbai South Branch" value={b.branch_name || ''} onChange={e => update(i, 'branch_name', e.target.value)} />
              </div>
              <div className="field w-quarter">
                <label>Branch Code</label>
                <input type="text" placeholder="e.g. MUM-001" value={b.branch_code || ''} onChange={e => update(i, 'branch_code', e.target.value)} />
              </div>
              <div className="field w-quarter">
                <label>GST Number</label>
                <input type="text" placeholder="22AAAAA0000A1Z5" maxLength={15} style={{ textTransform: 'uppercase', fontFamily: 'monospace' }} value={b.gst_no || ''} onChange={e => update(i, 'gst_no', e.target.value.toUpperCase())} />
              </div>
            </div>
            <div className="row mt-2">
              <div className="field w-full">
                <label>Address</label>
                <input type="text" placeholder="Street / Building" value={b.address || ''} onChange={e => update(i, 'address', e.target.value)} />
              </div>
            </div>
            <div className="row mt-2">
              <div className="field w-quarter">
                <label>City</label>
                <input type="text" placeholder="City" value={b.city || ''} onChange={e => update(i, 'city', e.target.value)} />
              </div>
              <div className="field w-quarter">
                <label>State</label>
                <select value={b.state || ''} onChange={e => update(i, 'state', e.target.value)}>
                  <option value="">Select State</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="field w-quarter">
                <label>Postal Code</label>
                <input type="text" placeholder="6 digits" maxLength={6} value={b.postal_code || ''} onChange={e => update(i, 'postal_code', e.target.value)} />
              </div>
              <div className="field w-quarter">
                <label>Country</label>
                <input type="text" placeholder="Country" value={b.country || 'India'} onChange={e => update(i, 'country', e.target.value)} />
              </div>
            </div>
            <div className="row mt-2">
              <div className="field w-half">
                <label>Mobile</label>
                <input type="text" placeholder="10-digit mobile" maxLength={10} value={b.mobile || ''} onChange={e => update(i, 'mobile', e.target.value)} />
              </div>
              <div className="field w-half">
                <label>Email</label>
                <input type="email" placeholder="branch@company.com" value={b.email || ''} onChange={e => update(i, 'email', e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      ))}

      {value.length === 0 && (
        <div className="empty-state">No branches added.</div>
      )}
    </div>
  );
}

export default BranchManager;
