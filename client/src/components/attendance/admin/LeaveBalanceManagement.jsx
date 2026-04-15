import React, { useEffect, useMemo, useState } from 'react';
import { FiRefreshCw, FiSave, FiSearch, FiUser } from 'react-icons/fi';
import { Modal } from 'antd';
import toast from 'react-hot-toast';
import masterAPI from '../../../api/attendance/master.api';
import leaveAPI from '../../../api/attendance/leave.api';

const toNum = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const userLabel = (u) => {
  const full = [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(' ').trim();
  if (full) return `${full} (${u.username || 'N/A'})`;
  return u.username || u.email || 'Unknown User';
};

const LeaveBalanceManagement = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [users, setUsers] = useState([]);
  const [policies, setPolicies] = useState([]);

  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState('');

  const [balances, setBalances] = useState([]);
  const [form, setForm] = useState({ opening_balance: 0, used: 0, pending: 0 });
  const [pendingMode, setPendingMode] = useState('manual');

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(u => {
      const full = [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(' ').toLowerCase();
      return full.includes(q) || (u.username || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
    });
  }, [users, search]);

  const currentPolicyBalance = useMemo(() => {
    return balances.find(b => String(b._id) === String(selectedPolicy)) || null;
  }, [balances, selectedPolicy]);

  const mapBalanceToForm = (row) => {
    const opening = row?.opening_balance ?? 0;
    const used = row?.used ?? 0;
    const pending = row?.pending ?? 0;
    return {
      opening_balance: opening,
      used,
      pending,
    };
  };

  const previewClosing = useMemo(() => {
    return toNum(form.pending);
  }, [form.pending]);

  const autoPending = useMemo(() => {
    const computed = toNum(form.opening_balance) - toNum(form.used);
    return computed > 0 ? computed : 0;
  }, [form.opening_balance, form.used]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [uRes, pRes] = await Promise.all([
        masterAPI.getUsers({ limit: 2000, isActive: true }),
        masterAPI.getLeavePolicies({ limit: 500, status: 'active' })
      ]);

      const userRows = uRes?.data || [];
      const policyRows = pRes?.data || [];

      setUsers(userRows);
      setPolicies(policyRows);

      if (userRows.length > 0) {
        setSelectedUser(String(userRows[0]._id));
      }
      if (policyRows.length > 0) {
        setSelectedPolicy(String(policyRows[0]._id));
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to load users or leave policies');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBalances = async (employeeId) => {
    if (!employeeId) return;
    try {
      setRefreshing(true);
      const res = await leaveAPI.getBalance(employeeId);
      const rows = res?.data || [];
      setBalances(rows);

      const next = rows.find(b => String(b._id) === String(selectedPolicy));
      setForm(mapBalanceToForm(next));
      setPendingMode('manual');
    } catch (err) {
      toast.error(err?.message || 'Failed to load employee leave balances');
      setBalances([]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchUserBalances(selectedUser);
  }, [selectedUser]);

  useEffect(() => {
    const next = balances.find(b => String(b._id) === String(selectedPolicy));
    setForm(mapBalanceToForm(next));
    setPendingMode('manual');
  }, [selectedPolicy, balances]);

  useEffect(() => {
    if (pendingMode !== 'auto') return;
    setForm(prev => ({ ...prev, pending: autoPending }));
  }, [autoPending, pendingMode]);

  const saveBalance = async (e) => {
    e.preventDefault();
    if (!selectedUser || !selectedPolicy) {
      toast.error('Please select user and leave policy');
      return;
    }

    const payload = {
      opening_balance: toNum(form.opening_balance),
      used: toNum(form.used),
      pending: toNum(form.pending),
    };

    const currentOpening = currentPolicyBalance?.opening_balance ?? 0;
    const currentUsed = currentPolicyBalance?.used ?? 0;
    const currentPending = currentPolicyBalance?.pending ?? 0;

    Modal.confirm({
      title: 'Update Leave Balance',
      content: (
        <div style={{ marginTop: 10 }}>
          <p>Are you sure you want to update the leave balance for this user?</p>
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', marginTop: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <span style={{ color: '#64748b' }}>Opening:</span>
              <span style={{ fontWeight: 600 }}>{currentOpening} &rarr; {payload.opening_balance}</span>
              <span style={{ color: '#64748b' }}>Used:</span>
              <span style={{ fontWeight: 600 }}>{currentUsed} &rarr; {payload.used}</span>
              <span style={{ color: '#64748b' }}>Pending:</span>
              <span style={{ fontWeight: 600 }}>{currentPending} &rarr; {payload.pending}</span>
            </div>
          </div>
        </div>
      ),
      okText: 'Update',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          setSaving(true);
          await leaveAPI.updateBalance(selectedUser, {
            leave_policy_id: selectedPolicy,
            opening_balance: payload.opening_balance,
            used: payload.used,
            pending: payload.pending,
          });
          toast.success('Leave balance updated');
          await fetchUserBalances(selectedUser);
        } catch (err) {
          toast.error(err?.message || 'Failed to update leave balance');
        } finally {
          setSaving(false);
        }
      }
    });
  };

  return (
    <div className="ap-card">
      <div className="ap-card-head">
        <div>
          <div className="ap-card-title">Leave Balance Corrections</div>
          <div className="ap-card-sub">Adjust opening balance and corrections for individual users</div>
        </div>
        <button className="ap-icon-btn" onClick={() => fetchUserBalances(selectedUser)} disabled={refreshing || !selectedUser}>
          <FiRefreshCw size={13} /> Refresh
        </button>
      </div>

      <div style={{ padding: '14px 18px', display: 'grid', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <FiSearch size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user by name, username, email"
            style={{ width: '100%', height: 36, borderRadius: 8, border: '1px solid #e5e7eb', padding: '0 12px 0 31px' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            disabled={loading || filteredUsers.length === 0}
            style={{ height: 36, borderRadius: 8, border: '1px solid #e5e7eb', padding: '0 10px' }}
          >
            {filteredUsers.length === 0 && <option value="">No users found</option>}
            {filteredUsers.map(u => (
              <option key={u._id} value={u._id}>{userLabel(u)}</option>
            ))}
          </select>

          <select
            value={selectedPolicy}
            onChange={(e) => setSelectedPolicy(e.target.value)}
            disabled={loading || policies.length === 0}
            style={{ height: 36, borderRadius: 8, border: '1px solid #e5e7eb', padding: '0 10px' }}
          >
            {policies.length === 0 && <option value="">No leave policies found</option>}
            {policies.map(p => (
              <option key={p._id} value={p._id}>{p.policy_name} ({p.leave_code})</option>
            ))}
          </select>
        </div>

        <form onSubmit={saveBalance} style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: '.75rem', color: '#475569', fontWeight: 600 }}>
              Opening Balance
              <input
                type="number"
                step="0.5"
                value={form.opening_balance}
                onChange={(e) => setForm(prev => ({ ...prev, opening_balance: e.target.value, pending: Math.max(0, toNum(e.target.value) - toNum(prev.used)) }))}
                style={{ height: 36, borderRadius: 8, border: '1px solid #e5e7eb', padding: '0 10px' }}
                title="Base quota at the start of the year"
              />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: '.75rem', color: '#475569', fontWeight: 600 }}>
              Used
              <input
                type="number"
                step="0.5"
                value={form.used}
                onChange={(e) => setForm(prev => ({ ...prev, used: e.target.value, pending: Math.max(0, toNum(prev.opening_balance) - toNum(e.target.value)) }))}
                style={{ height: 36, borderRadius: 8, border: '1px solid #e5e7eb', padding: '0 10px' }}
                title="Consolidated used days"
              />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: '.75rem', color: '#475569', fontWeight: 600 }}>
              Pending
              <input
                type="number"
                step="0.5"
                value={form.pending}
                onChange={(e) => setForm(prev => ({ ...prev, pending: e.target.value }))}
                disabled={pendingMode === 'auto'}
                style={{ height: 36, borderRadius: 8, border: '1px solid #e5e7eb', padding: '0 10px' }}
                title={pendingMode === 'auto' ? 'Auto calculated from opening balance minus used' : 'Manual pending value'}
              />
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.75rem', color: '#475569', fontWeight: 600 }}>
                <input
                  type="radio"
                  name="pendingMode"
                  checked={pendingMode === 'auto'}
                  onChange={() => setPendingMode('auto')}
                />
                Pending Auto
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '.75rem', color: '#475569', fontWeight: 600 }}>
                <input
                  type="radio"
                  name="pendingMode"
                  checked={pendingMode === 'manual'}
                  onChange={() => setPendingMode('manual')}
                />
                Pending Manual
              </label>
            </div>
            <div style={{ fontSize: '.75rem', color: '#64748b' }}>
              Auto pending = max(opening - used, 0) = <strong>{autoPending}</strong>
            </div>
          </div>

          <div style={{
            background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
            padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 15, color: '#334155', fontSize: '.8125rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }}></div>
                Available: <strong>{currentPolicyBalance?.available ?? 0}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }}></div>
                Pending: <strong>{currentPolicyBalance?.pending ?? 0}</strong>
              </div>
            </div>
            <div style={{ fontSize: '.8125rem', color: '#0f172a', fontWeight: 600 }}>
              Updated Available: <span style={{ color: '#10b981', fontSize: '0.9rem' }}>{previewClosing}</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="ap-btn approve" type="submit" disabled={saving || loading} style={{ width: 180 }}>
              <FiSave size={14} /> {saving ? 'Saving...' : 'Save Balance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveBalanceManagement;
