import React from 'react';
import { Tooltip, Chip } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';

/**
 * Renders an alert badge when an operational blocker recurs across months
 */
const RecurringBlockerBadge = ({ blocker, isChronic = false, consecutiveCount = 2, affectedMembers = [] }) => {
    const isHighAlert = isChronic || consecutiveCount >= 3;
    const title = isHighAlert 
        ? `🔥 Chronic Blocker (${consecutiveCount} consecutive months) — Escalated to Suraj Rajan` 
        : `⚠️ Recurring Blocker (${consecutiveCount} consecutive months)`;

    const tooltipContent = (
        <div style={{ padding: '4px' }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{title}</div>
            {blocker && <div style={{ fontSize: '12px', fontStyle: 'italic', marginBottom: '4px' }}>"{blocker}"</div>}
            {affectedMembers?.length > 0 && (
                <div style={{ fontSize: '11px', opacity: 0.9 }}>
                    Affected: {affectedMembers.join(', ')}
                </div>
            )}
        </div>
    );

    return (
        <Tooltip title={tooltipContent} arrow placement="top">
            <Chip
                icon={isHighAlert ? <LocalFireDepartmentIcon style={{ fontSize: 16 }} /> : <WarningAmberIcon style={{ fontSize: 15 }} />}
                label={isHighAlert ? `Chronic (${consecutiveCount}M)` : `Recurring (${consecutiveCount}M)`}
                size="small"
                style={{
                    backgroundColor: isHighAlert ? '#ffebee' : '#fff8e1',
                    color: isHighAlert ? '#c62828' : '#e65100',
                    border: `1px solid ${isHighAlert ? '#ef9a9a' : '#ffe082'}`,
                    fontWeight: 700,
                    fontSize: '11px',
                    height: '22px',
                    cursor: 'pointer'
                }}
            />
        </Tooltip>
    );
};

export default RecurringBlockerBadge;
