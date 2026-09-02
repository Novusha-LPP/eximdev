import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckCircle2,
  MinusCircle,
  XCircle,
  Download,
  RotateCcw,
  Search,
  User,
  Filter
} from 'lucide-react';

export default function ActivityReport() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter States
  const [filterType, setFilterType] = useState('month'); // 'month' | 'date-range'
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [activityType, setActivityType] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');

  // Summary Metrics State
  const [summary, setSummary] = useState({
    totalCount: 0,
    typeBreakdown: { call: 0, email: 0, meeting: 0, demo: 0, note: 0 },
    outcomeBreakdown: { positive: 0, neutral: 0, negative: 0 }
  });

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

  // Fetch all users on mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-all-users`,
          { withCredentials: true }
        );
        if (Array.isArray(res.data)) {
          setUsers(res.data);
        }
      } catch (err) {
        console.error('Error fetching users for filter:', err);
      }
    };
    fetchUsers();
  }, []);

  // Fetch report data when filters change
  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = {};

      if (activityType !== 'all') {
        params.type = activityType;
      }
      if (selectedUser !== 'all') {
        params.userId = selectedUser;
      }

      if (filterType === 'date-range') {
        if (dateRange.start && dateRange.end) {
          params.startDate = dateRange.start;
          params.endDate = dateRange.end;
        }
      } else {
        params.period = selectedMonth;
      }

      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/crm/reports/activity-report`,
        { params, withCredentials: true }
      );

      if (res.data && res.data.success) {
        setActivities(res.data.activities || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err) {
      console.error('Error fetching activity report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [filterType, selectedMonth, dateRange, activityType, selectedUser]);

  const handleResetFilters = () => {
    setFilterType('month');
    setSelectedMonth(new Date().toISOString().substring(0, 7));
    setDateRange({ start: '', end: '' });
    setActivityType('all');
    setSelectedUser('all');
    setSearchTerm('');
  };

  const handleExportCSV = () => {
    if (activities.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Activity Type,Subject,Description,Related Record Type,Related Record Name,Outcome,Recorded By\n";

    activities.forEach(act => {
      const date = new Date(act.activityDate).toLocaleDateString('en-IN');
      const type = (act.type || 'N/A').toUpperCase();
      const subject = `"${(act.subject || '').replace(/"/g, '""')}"`;
      const description = `"${(act.description || '').replace(/"/g, '""')}"`;
      const relType = act.relatedTo?.model || 'N/A';
      const relName = `"${(act.relatedName || 'N/A').replace(/"/g, '""')}"`;
      const outcome = (act.outcome || 'N/A').toUpperCase();
      const recordedBy = act.userId
        ? `"${(`${act.userId.first_name || ''} ${act.userId.last_name || ''}`.trim() || act.userId.username).replace(/"/g, '""')}"`
        : 'Unknown';

      csvContent += `${date},${type},${subject},${description},${relType},${relName},${outcome},${recordedBy}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `crm_activity_report_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter activities locally by search term
  const filteredActivities = activities.filter(act => {
    const term = searchTerm.toLowerCase();
    const subject = (act.subject || '').toLowerCase();
    const desc = (act.description || '').toLowerCase();
    const relName = (act.relatedName || '').toLowerCase();
    const recordedBy = act.userId
      ? `${act.userId.first_name || ''} ${act.userId.last_name || ''}`.toLowerCase()
      : '';
    return subject.includes(term) || desc.includes(term) || relName.includes(term) || recordedBy.includes(term);
  });

  const totalAct = summary.totalCount;
  const positivePercent = totalAct > 0
    ? Math.round((summary.outcomeBreakdown.positive / totalAct) * 100)
    : 0;

  return (
    <div className="report-content" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 className="report-title" style={{ margin: 0 }}>Activity & Pipeline Outreach Report</h2>
        <button
          onClick={handleExportCSV}
          disabled={activities.length === 0}
          className="nucleus-input"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: activities.length === 0 ? '#f3f4f6' : '#2563eb',
            color: activities.length === 0 ? '#9ca3af' : '#ffffff',
            border: 'none',
            cursor: activities.length === 0 ? 'not-allowed' : 'pointer',
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '14px',
            transition: 'background 0.2s'
          }}
        >
          <Download size={16} /> Export Activity CSV
        </button>
      </div>

      {/* Filter Section */}
      <div className="nucleus-filter-section" style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', width: '100%' }}>
          {/* Period selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="filter-label" style={{ fontWeight: 700, fontSize: '14px', color: '#374151' }}>Period:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="nucleus-select"
              style={{ minWidth: '130px' }}
            >
              <option value="month">Month Wise</option>
              <option value="date-range">Date Range</option>
            </select>
          </div>

          {/* Month selector / Custom Date input */}
          {filterType === 'month' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="nucleus-select"
                style={{ minWidth: '180px' }}
              >
                {getMonthsList().map(m => (
                  <option key={m.val} value={m.val}>{m.label}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="custom-inputs" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="nucleus-input"
              />
              <span style={{ color: '#9ca3af' }}>to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="nucleus-input"
              />
            </div>
          )}

          {/* Activity Type filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="filter-label" style={{ fontWeight: 700, fontSize: '14px', color: '#374151' }}>Activity:</span>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              className="nucleus-select"
              style={{ minWidth: '140px' }}
            >
              <option value="all">All Types</option>
              <option value="call">Call</option>
              <option value="email">Email</option>
              <option value="meeting">Meeting</option>
              <option value="demo">Demo</option>
              <option value="note">Note</option>
            </select>
          </div>

          {/* Recorded By / Salesperson filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="filter-label" style={{ fontWeight: 700, fontSize: '14px', color: '#374151' }}>Salesperson:</span>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="nucleus-select"
              style={{ minWidth: '180px' }}
            >
              <option value="all">All Salespeople</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>
                  {`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters button */}
          <button
            onClick={handleResetFilters}
            style={{
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              color: '#4b5563',
              borderRadius: '6px',
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 600,
              fontSize: '14px',
              marginLeft: 'auto',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#e5e7eb'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f3f4f6'; }}
            title="Reset Filters"
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '20px',
        marginBottom: '24px'
      }}>
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', borderLeft: '4px solid #3b82f6', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Total Activities</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827' }}>{totalAct}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>Outreach logs</div>
        </div>

        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', borderLeft: '4px solid #10b981', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Calls Logged</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827' }}>{summary.typeBreakdown.call || 0}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>Phone dials</div>
        </div>

        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', borderLeft: '4px solid #6366f1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Emails Sent</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827' }}>{summary.typeBreakdown.email || 0}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>Email updates</div>
        </div>

        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', borderLeft: '4px solid #f59e0b', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Meetings & Demos</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827' }}>{(summary.typeBreakdown.meeting || 0) + (summary.typeBreakdown.demo || 0)}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>Face-to-face / online</div>
        </div>

        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', borderLeft: '4px solid #ec4899', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Positive Rate</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#111827' }}>{positivePercent}%</div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>{summary.outcomeBreakdown.positive || 0} successful logs</div>
        </div>
      </div>

      {/* Search and Table */}
      <div className="nucleus-table-wrapper" style={{ margin: 0, overflow: 'visible' }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f9fafb'
        }}>
          <div style={{ fontWeight: 600, fontSize: '16px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={18} style={{ color: '#4f46e5' }} /> Detailed Activity Log ({filteredActivities.length} items)
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text"
              placeholder="Search activity, description, customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="nucleus-input"
              style={{
                paddingLeft: '32px',
                fontSize: '13px',
                minWidth: '280px'
              }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#4b5563' }}>
            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>⏳ Fetching Activity Report...</div>
            <div style={{ fontSize: '13px', color: '#9ca3af' }}>Pulling CRM activities and matching related metadata</div>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: '#6b7280' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>No matching outreach logs found</div>
            <div style={{ fontSize: '13px', color: '#9ca3af' }}>Try adjusting your filters or search term</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="nucleus-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>Date</th>
                  <th style={{ width: '110px' }}>Type</th>
                  <th>Subject</th>
                  <th style={{ width: '300px' }}>Description</th>
                  <th>Related Record</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Outcome</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((act) => {
                  const date = new Date(act.activityDate).toLocaleDateString('en-IN');
                  const typeLabel = act.type || 'note';
                  const outcomeLabel = act.outcome || 'neutral';

                  let typeIcon = <FileText size={13} />;
                  let typeColor = '#6b7280';
                  if (typeLabel === 'call') { typeIcon = <Phone size={13} />; typeColor = '#10b981'; }
                  else if (typeLabel === 'email') { typeIcon = <Mail size={13} />; typeColor = '#3b82f6'; }
                  else if (typeLabel === 'meeting') { typeIcon = <Calendar size={13} />; typeColor = '#8b5cf6'; }
                  else if (typeLabel === 'demo') { typeIcon = <CheckCircle2 size={13} />; typeColor = '#f59e0b'; }

                  let outcomeStyle = { background: '#f3f4f6', color: '#4b5563' };
                  let outcomeIcon = <MinusCircle size={12} />;
                  if (outcomeLabel === 'positive') {
                    outcomeStyle = { background: '#d1fae5', color: '#065f46' };
                    outcomeIcon = <CheckCircle2 size={12} />;
                  } else if (outcomeLabel === 'negative') {
                    outcomeStyle = { background: '#fee2e2', color: '#991b1b' };
                    outcomeIcon = <XCircle size={12} />;
                  }

                  const userName = act.userId
                    ? `${act.userId.first_name || ''} ${act.userId.last_name || ''}`.trim() || act.userId.username
                    : 'Unknown';

                  return (
                    <tr key={act._id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ fontWeight: 500, fontSize: '13px', color: '#4b5563' }}>{date}</td>
                      <td>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: `${typeColor}15`,
                          color: typeColor,
                          textTransform: 'uppercase',
                          border: `1px solid ${typeColor}25`
                        }}>
                          {typeIcon} {typeLabel}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, fontSize: '13px', color: '#111827' }}>{act.subject}</td>
                      <td
                        style={{
                          fontSize: '13px',
                          color: '#4b5563',
                          maxWidth: '300px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={act.description}
                      >
                        {act.description || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No description</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>{act.relatedName}</span>
                          <span style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>
                            {act.relatedTo?.model || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          textTransform: 'capitalize',
                          ...outcomeStyle
                        }}>
                          {outcomeIcon} {outcomeLabel}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', color: '#4b5563', fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={12} style={{ color: '#9ca3af' }} /> {userName}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
