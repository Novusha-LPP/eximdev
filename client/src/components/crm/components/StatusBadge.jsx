import React from 'react';
import { Tag } from 'antd';

const config = {
  Suspect:          { color: 'blue',    label: 'Suspect' },
  Prospect:         { color: 'orange',  label: 'Prospect' },
  Customer:         { color: 'green',   label: 'Customer' },
  Pending:          { color: 'gold',    label: 'Pending' },
  Approved:         { color: 'success', label: 'Approved' },
  'Approved by HOD':{ color: 'cyan',    label: 'Approved by HOD' },
  'Sent for revision': { color: 'volcano', label: 'Sent for Revision' },
  Draft:            { color: 'default', label: 'Draft' },
};

export function StatusBadge({ status, draft }) {
  const key = draft === 'true' ? 'Suspect' : status;
  const { color, label } = config[key] || { color: 'default', label: key || '—' };
  return <Tag color={color}>{label}</Tag>;
}

export default StatusBadge;
