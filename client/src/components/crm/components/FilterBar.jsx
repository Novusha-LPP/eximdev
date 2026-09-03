import React, { useState, useEffect } from 'react';
import { Calendar, Filter, RotateCcw } from 'lucide-react';

export default function FilterBar({ moduleName, onChange }) {
  const getInitialFilters = () => {
    try {
      const stored = localStorage.getItem(`crm_filters_${moduleName}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Error loading filters from storage:', e);
    }
    
    // Default to 'This Month'
    return {
      type: 'this_month', // 'this_month' | 'last_month' | 'this_week' | 'last_7_days' | 'month_picker' | 'custom'
      month: new Date().toISOString().substring(0, 7), // YYYY-MM
      startDate: '',
      endDate: ''
    };
  };

  const [filters, setFilters] = useState(getInitialFilters);

  // Generate last 12 months for dropdown
  const getMonthsList = () => {
    const list = [];
    const date = new Date();
    for (let i = 0; i < 12; i++) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const label = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      list.push({ val: `${year}-${month}`, label });
      date.setMonth(date.getMonth() - 1);
    }
    return list;
  };

  useEffect(() => {
    localStorage.setItem(`crm_filters_${moduleName}`, JSON.stringify(filters));
    onChange(filters);
  }, [filters, moduleName]);

  const handleQuickFilter = (type) => {
    let startDate = '';
    let endDate = '';
    const now = new Date();

    if (type === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().substring(0, 10);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().substring(0, 10);
    } else if (type === 'last_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().substring(0, 10);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().substring(0, 10);
    } else if (type === 'this_week') {
      // Find start of week (Sunday)
      const day = now.getDay();
      const diff = now.getDate() - day;
      startDate = new Date(now.setDate(diff)).toISOString().substring(0, 10);
      endDate = new Date(now.setDate(diff + 6)).toISOString().substring(0, 10);
    } else if (type === 'last_7_days') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
      endDate = new Date().toISOString().substring(0, 10);
    }

    setFilters({
      type,
      month: type === 'this_month' ? now.toISOString().substring(0, 7) : '',
      startDate,
      endDate
    });
  };

  const handleMonthChange = (e) => {
    const month = e.target.value;
    if (!month) return;
    const [year, m] = month.split('-');
    const startDate = new Date(year, parseInt(m) - 1, 1).toISOString().substring(0, 10);
    const endDate = new Date(year, parseInt(m), 0).toISOString().substring(0, 10);

    setFilters({
      type: 'month_picker',
      month,
      startDate,
      endDate
    });
  };

  const handleCustomDateChange = (field, val) => {
    setFilters(prev => ({
      ...prev,
      type: 'custom',
      month: '',
      [field]: val
    }));
  };

  const handleReset = () => {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().substring(0, 10);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().substring(0, 10);

    setFilters({
      type: 'this_month',
      month: now.toISOString().substring(0, 7),
      startDate,
      endDate
    });
  };

  const activeBtnStyle = {
    background: '#4f46e5',
    color: '#ffffff',
    borderColor: '#4f46e5'
  };

  const inactiveBtnStyle = {
    background: '#ffffff',
    color: '#475569',
    borderColor: '#e2e8f0'
  };

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '16px',
      padding: '16px 20px',
      background: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #e2e8f0',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      alignItems: 'center',
      marginBottom: '24px',
      justifyContent: 'space-between'
    }}>
      {/* Quick Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.85rem', fontWeight: 700, marginRight: '8px', textTransform: 'uppercase' }}>
          <Filter size={16} /> Filters
        </div>
        {[
          { id: 'this_month', label: 'This Month' },
          { id: 'last_month', label: 'Last Month' },
          { id: 'this_week', label: 'This Week' },
          { id: 'last_7_days', label: 'Last 7 Days' }
        ].map(btn => {
          const isActive = filters.type === btn.id;
          return (
            <button
              key={btn.id}
              onClick={() => handleQuickFilter(btn.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: '1px solid',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                ...(isActive ? activeBtnStyle : inactiveBtnStyle)
              }}
            >
              {btn.label}
            </button>
          );
        })}
      </div>

      {/* Month & Date Pickers */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Month Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>By Month:</span>
          <select
            value={filters.month || ''}
            onChange={handleMonthChange}
            style={{
              padding: '8px 14px',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '0.85rem',
              color: '#334155',
              background: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="">-- Choose Month --</option>
            {getMonthsList().map(m => (
              <option key={m.val} value={m.val}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Custom Range Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '6px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <Calendar size={14} style={{ color: '#94a3b8' }} />
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}
          />
          <span style={{ color: '#cbd5e1', fontWeight: 700 }}>to</span>
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', color: '#334155', fontWeight: 600 }}
          />
        </div>

        {/* Reset */}
        <button
          onClick={handleReset}
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#64748b',
            borderRadius: '10px',
            padding: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#ffffff'; }}
          title="Reset filters"
        >
          <RotateCcw size={16} />
        </button>
      </div>
    </div>
  );
}
