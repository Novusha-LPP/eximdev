const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const IDEMPOTENT_TYPES = new Set(['lwp', 'privilege']);

const getLeaveType = (row) => String(row?.leave_type || row?.leave_policy_id?.leave_type || row?.name || row?.policy_name || '').toLowerCase().trim();

const getPolicyName = (row) => row?.leave_policy_id?.policy_name || row?.policy_name || row?.name || row?.leave_type || 'Policy';

const getBalanceKey = (row, leaveType) => {
  if (IDEMPOTENT_TYPES.has(leaveType)) {
    return leaveType;
  }

  const policyId = row?.leave_policy_id?._id || row?.leave_policy_id || row?._id;
  return policyId ? String(policyId) : `${leaveType}:${getPolicyName(row).toLowerCase()}`;
};

export const normalizeLeaveBalanceRows = (rows = []) => {
  const seen = new Set();
  const normalizedRows = [];

  for (const row of rows) {
    if (!row) continue;

    const leaveType = getLeaveType(row);
    const policyName = getPolicyName(row);
    const openingBalance = toNumber(row.opening_balance);
    const used = toNumber(row.used ?? row.consumed);
    const computedPending = Math.max(0, openingBalance - used);
    const pending = leaveType === 'lwp' ? 0 : computedPending;
    const closingBalance = leaveType === 'lwp' ? 0 : pending;
    const available = leaveType === 'lwp' ? 0 : pending;

    const key = getBalanceKey(row, leaveType);
    if (seen.has(key)) continue;
    seen.add(key);

    normalizedRows.push({
      ...row,
      name: policyName,
      leave_type: leaveType || row.leave_type || '',
      opening_balance: openingBalance,
      used,
      consumed: row.consumed ?? used,
      pending,
      pending_approval: pending,
      available,
      balance: available,
      closing_balance: closingBalance,
      total: row.total ?? openingBalance,
      display: {
        ...(row.display || {}),
        used,
        total: row.total ?? openingBalance,
        pending,
        remaining: available
      }
    });
  }

  return normalizedRows;
};
