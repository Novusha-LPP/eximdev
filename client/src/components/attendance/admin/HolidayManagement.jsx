import React, { useState, useRef, useEffect } from 'react';
import { FiPlus, FiTrash2, FiCalendar, FiArrowLeft, FiChevronLeft, FiChevronRight, FiList } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import masterAPI from '../../../api/attendance/master.api';
import toast from 'react-hot-toast';
import EnterpriseTable from '../common/EnterpriseTable';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, subMonths, addMonths, format, isSameMonth, isSameDay } from 'date-fns';
import './AdminSettings.css';
import './HolidayCalendar.css';
import './HolidayCards.css';

/* --- Holiday emoji / color config --- */
const HOLIDAY_CONFIG = {
  national: { emoji: '🏛️', cls: 'national', label: 'National' },
  company: { emoji: '🏢', cls: 'company', label: 'Company' },
  optional: { emoji: '🌟', cls: 'optional', label: 'Optional' },
  restricted: { emoji: '🔒', cls: 'restricted', label: 'Restricted' },
};

const HOLIDAY_EMOJIS = {
  holi: '🎨', diwali: '🪔', christmas: '🎄',
  'new year': '🎆', eid: '🌙', independence: '🇮🇳',
  republic: '🇮🇳', gandhi: '🏛️', navratri: '🕉️',
  pongal: '🍚', ugadi: '🌿', onam: '🥣',
  'good friday': '✝️', easter: '🥚', thanksgiving: '🦃',
  dussehra: '🏹', janmashtami: '🏺', raksha: '🧶',
};

const getHolidayEmoji = (name = '', type = '') => {
  const n = name.toLowerCase();
  const found = Object.entries(HOLIDAY_EMOJIS).find(([k]) => n.includes(k));
  if (found) return found[1];
  return HOLIDAY_CONFIG[type]?.emoji || '📅';
};

const getHolidayCfg = (type = '') =>
  HOLIDAY_CONFIG[type] || { emoji: '📅', cls: 'national', label: type };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/* --- Employee / HOD read-only card view --- */
const HolidayCardView = ({ holidays, loading }) => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [typeFilter, setTypeFilter] = useState('all');

  const today = new Date(); today.setHours(0, 0, 0, 0);

  /* filter by year + type */
  const filtered = holidays
    .filter(h => {
      const d = new Date(h.holiday_date);
      const matchYear = d.getFullYear() === year;
      const matchType = typeFilter === 'all' || h.holiday_type === typeFilter;
      return matchYear && matchType;
    })
    .sort((a, b) => new Date(a.holiday_date) - new Date(b.holiday_date));

  /* group by month */
  const grouped = {};
  filtered.forEach(h => {
    const m = new Date(h.holiday_date).getMonth();
    if (!grouped[m]) grouped[m] = [];
    grouped[m].push(h);
  });

  /* year-level counts */
  const yearHols = holidays.filter(h => new Date(h.holiday_date).getFullYear() === year);
  const counts = {
    total: yearHols.length,
    national: yearHols.filter(h => h.holiday_type === 'national' || !h.holiday_type).length,
    optional: yearHols.filter(h => h.holiday_type === 'optional' || h.holiday_type === 'company').length,
    upcoming: yearHols.filter(h => new Date(h.holiday_date) >= today).length,
  };

  /* next upcoming holiday + days remaining */
  const nextHoliday = yearHols
    .filter(h => new Date(h.holiday_date) >= today)
    .sort((a, b) => new Date(a.holiday_date) - new Date(b.holiday_date))[0];

  const daysUntilNext = nextHoliday
    ? Math.round((new Date(nextHoliday.holiday_date) - today) / (1000 * 60 * 60 * 24))
    : null;

  /* type filter pills – built from actual data */
  const allTypes = [...new Set(yearHols.map(h => h.holiday_type || 'national'))];
  const FILTERS = [
    { key: 'all', emoji: '🗓️', label: 'All', count: yearHols.length },
    ...allTypes.map(t => ({
      key: t,
      emoji: getHolidayCfg(t).emoji,
      label: getHolidayCfg(t).label,
      count: yearHols.filter(h => (h.holiday_type || 'national') === t).length,
    })),
  ];

  return (
    <div className="hc-view">

      {/* -- Header -- */}
      <div className="hc-header">
        <div className="hc-header-left">
          <h1 className="hc-title">📅 Holiday Calendar</h1>
          <p className="hc-sub">Official holidays for {year}</p>
        </div>
        <div className="hc-year-nav">
          <button className="hc-ynav-btn" onClick={() => setYear(y => y - 1)} aria-label="Previous year">‹</button>
          <span className="hc-year-lbl">{year}</span>
          <button className="hc-ynav-btn" onClick={() => setYear(y => y + 1)} aria-label="Next year">›</button>
        </div>
      </div>

      {/* -- Summary strip -- */}
      <div className="hc-summary">
        <div className="hc-sum-tile">
          <div className="hc-sum-emoji">📅</div>
          <div className="hc-sum-val">{counts.total}</div>
          <div className="hc-sum-lbl">Total Holidays</div>
        </div>
        <div className="hc-sum-tile">
          <div className="hc-sum-emoji">🏛️</div>
          <div className="hc-sum-val">{counts.national}</div>
          <div className="hc-sum-lbl">National</div>
        </div>
        <div className="hc-sum-tile">
          <div className="hc-sum-emoji">🌟</div>
          <div className="hc-sum-val">{counts.optional}</div>
          <div className="hc-sum-lbl">Optional</div>
        </div>
        <div className="hc-sum-tile">
          <div className="hc-sum-emoji">🚀</div>
          <div className="hc-sum-val">{counts.upcoming}</div>
          <div className="hc-sum-lbl">Upcoming</div>
        </div>
      </div>

      {/* -- Next holiday banner -- */}
      {nextHoliday && (
        <div className="hc-next-banner">
          <span className="hc-next-emoji">{getHolidayEmoji(nextHoliday.holiday_name, nextHoliday.holiday_type)}</span>
          <div className="hc-next-info">
            <span className="hc-next-label">Next Holiday</span>
            <span className="hc-next-name">{nextHoliday.holiday_name}</span>
          </div>
          <div className="hc-next-date">
            {new Date(nextHoliday.holiday_date).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          {daysUntilNext === 0 ? (
            <span className="hc-next-days-badge">Today! 🎉</span>
          ) : daysUntilNext === 1 ? (
            <span className="hc-next-days-badge">Tomorrow</span>
          ) : daysUntilNext <= 30 ? (
            <span className="hc-next-days-badge">in {daysUntilNext} days</span>
          ) : null}
        </div>
      )}

      {/* -- Filter pills -- */}
      <div className="hc-filter-bar" role="group" aria-label="Filter by holiday type">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={'hc-filter-pill' + (typeFilter === f.key ? ' active' : '')}
            onClick={() => setTypeFilter(f.key)}
            aria-pressed={typeFilter === f.key}
          >
            {f.emoji} {f.label}
            <span className="hc-pill-count">{f.count}</span>
          </button>
        ))}
      </div>

      {/* -- Content -- */}
      {loading ? (
        <div className="hc-loading">
          <div className="hc-spin" aria-label="Loading..." role="status" />
          <span>Loading holidays...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="hc-empty" role="status">
          <div className="hc-empty-icon">🏜️</div>
          <p>No holidays found for this filter.</p>
        </div>
      ) : (
        <div className="hc-months">
          {Object.keys(grouped).sort((a, b) => +a - +b).map(mi => {
            const mHols = grouped[mi];
            return (
              <div key={mi} className="hc-month-group">
                <div className="hc-month-head">
                  <span className="hc-month-name">
                    <FiCalendar size={13} style={{ color: '#aab3cc', flexShrink: 0 }} />
                    {MONTHS[mi]}
                  </span>
                  <span className="hc-month-count">{mHols.length} holiday{mHols.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="hc-month-rows">
                  {mHols.map((h, i) => {
                    const d = new Date(h.holiday_date);
                    const isToday = d.getTime() === today.getTime();
                    const isPast = d < today;
                    const type = h.holiday_type || 'national';
                    const cfg = getHolidayCfg(type);
                    const emoji = getHolidayEmoji(h.holiday_name, type);
                    const isNext = nextHoliday && h.holiday_date === nextHoliday.holiday_date;
                    return (
                      <div
                        key={i}
                        className={'hc-row' + (isPast ? ' hc-row-past' : '')}
                      >
                        {/* Date badge */}
                        <div className={'hc-date-badge hc-date-' + type + (isToday ? ' hc-date-today' : '')}>
                          <span className="hc-date-emoji">{emoji}</span>
                          <span className="hc-date-mo">{d.toLocaleString('default', { month: 'short' })}</span>
                          <span className="hc-date-d">{d.getDate()}</span>
                        </div>

                        {/* Info */}
                        <div className="hc-row-info">
                          <div className="hc-row-name">
                            {h.holiday_name}
                            {isToday && <span className="hc-today-tag">Today</span>}
                          </div>
                          <div className="hc-row-sub">
                            {d.toLocaleString('default', { weekday: 'long' })}
                          </div>
                        </div>

                        {/* Right tags */}
                        <div className="hc-row-right">
                          <span className={'hc-type-pill hc-pill-' + type}>
                            {cfg.emoji} {cfg.label}
                          </span>
                          {isNext && !isToday && (
                            <span className="hc-next-chip">Next!</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const HolidayManagement = ({ embedded = false, readOnly = false }) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('calendar'); // 'list' or 'calendar'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState([]);
  const [loadingHolidays, setLoadingHolidays] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newHoliday, setNewHoliday] = useState({
    holiday_date: '',
    holiday_name: '',
    holiday_type: 'national'
  });

  useEffect(() => {
    loadHolidays();
  }, []);

  const loadHolidays = async () => {
    try {
      setLoadingHolidays(true);
      const res = await masterAPI.getHolidays({ limit: 1000 });
      setHolidays(res.data || []);
      setLoadingHolidays(false);
    } catch (err) {
      console.error('Holiday load error:', err);
      toast.error('Failed to load holidays: ' + (err.message || 'Unknown error'));
      setHolidays([]);
      setLoadingHolidays(false);
    }
  };

  const columns = [
    {
      label: 'Holiday Date',
      key: 'holiday_date',
      sortable: true,
      render: (val, row) => {
        const d = new Date(val);
        const cfg = getHolidayCfg(row.holiday_type);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              width: '40px', background: 'var(--as-s2)', borderRadius: '8px', padding: '4px',
              border: '1px solid var(--as-border2)'
            }}>
              <span style={{ fontSize: '.55rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--as-t4)' }}>
                {d.toLocaleString('default', { month: 'short' })}
              </span>
              <span style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--as-t1)', lineHeight: 1 }}>
                {d.getDate()}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontWeight: 700, color: 'var(--as-t1)', fontSize: '.9375rem' }}>{row.holiday_name}</div>
              <div style={{ fontSize: '.6875rem', color: 'var(--as-t3)' }}>{d.toLocaleString('default', { weekday: 'long' })}</div>
            </div>
          </div>
        );
      }
    },
    {
      label: 'Holiday Type',
      key: 'holiday_type',
      sortable: true,
      render: (val) => {
        const cfg = getHolidayCfg(val);
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '4px 10px', borderRadius: '999px', fontSize: '.6875rem', fontWeight: 700,
            background: `var(--as-${cfg.cls}-lt)`, color: `var(--as-${cfg.cls})`,
            border: `1px solid var(--as-${cfg.cls}-mid)`
          }}>
            {cfg.emoji} {cfg.label}
          </span>
        );
      }
    },
    ...(!readOnly ? [{
      label: 'Actions',
      width: '80px',
      render: (_, row) => (
        <button
          className="btn-icon danger"
          onClick={() => handleDelete(row._id)}
          title="Delete"
        >
          <FiTrash2 size={13} />
        </button>
      )
    }] : [])
  ];

  const handleAdd = async () => {
    if (!newHoliday.holiday_date || !newHoliday.holiday_name) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      await masterAPI.createHoliday(newHoliday);
      setNewHoliday({ holiday_date: '', holiday_name: '', holiday_type: 'national' });
      setShowAddModal(false);
      toast.success('Holiday added successfully');
      loadHolidays();
    } catch (err) {
      toast.error(err.message || 'Failed to add holiday');
    }
  };

  const handleDelete = async (id) => {
    try {
      await masterAPI.deleteHoliday(id);
      toast.success('Holiday deleted successfully');
      loadHolidays();
    } catch (err) {
      toast.error(err.message || 'Failed to delete holiday');
    }
  };


  // Calendar rendering logic
  const renderCalendar = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;

        // Check for holiday
        const dayHolidays = holidays.filter(h => isSameDay(new Date(h.holiday_date), cloneDay));

        days.push(
          <div
            className={`calendar-cell ${!isSameMonth(day, monthStart)
              ? "disabled"
              : dayHolidays.length > 0 ? "has-event" : ""
              }`}
            key={day}
            onClick={() => {
              if (!readOnly) {
                setNewHoliday({ ...newHoliday, holiday_date: format(cloneDay, 'yyyy-MM-dd') });
                setShowAddModal(true);
              }
            }}
            style={{ cursor: readOnly ? 'default' : 'pointer' }}
          >
            <span className="calendar-number">{formattedDate}</span>
            <div className="calendar-events">
              {dayHolidays.map((h, idx) => (
                <div key={idx} className={`event-badge type-${h.holiday_type}`}>
                  {h.holiday_name}
                </div>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="calendar-row" key={day}>
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div className="calendar-container card">
        <div className="calendar-header">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="icon-btn"><FiChevronLeft size={20} /></button>
          <h3>{format(currentDate, "MMMM yyyy")}</h3>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="icon-btn"><FiChevronRight size={20} /></button>
        </div>
        <div className="calendar-days-header">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div className="day-name" key={d}>{d}</div>
          ))}
        </div>
        <div className="calendar-body">{rows}</div>
      </div>
    );
  };

  // Employee / HOD: beautiful card view
  if (readOnly) {
    return <HolidayCardView holidays={holidays} loading={loadingHolidays} />;
  }

  return (
    <div className={embedded ? "" : "settings-container"}>
      {!embedded && (
        <div className="settings-header">
          <div className="settings-header-content">
            <h2>Holiday Management</h2>
            <p>Configure company holidays and observances with enterprise-level tools.</p>
          </div>
          <div className="settings-header-actions" style={{ display: 'flex', gap: '1rem' }}>
            {!readOnly && (
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                <FiPlus size={18} style={{ marginRight: 8 }} />
                Add Holiday
              </button>
            )}
            <div className="view-toggle">
              <button
                className={viewMode === 'list' ? 'active' : ''}
                onClick={() => setViewMode('list')}
                title="List View"
              ><FiList /></button>
              <button
                className={viewMode === 'calendar' ? 'active' : ''}
                onClick={() => setViewMode('calendar')}
                title="Calendar View"
              ><FiCalendar /></button>
            </div>
            <button className="btn btn-outline" onClick={() => navigate('/')}>
              <FiArrowLeft size={18} />
              Back
            </button>
          </div>
        </div>
      )}

      {embedded && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <div className="view-toggle" style={{ display: 'flex', gap: '8px', background: 'var(--bg-main)', padding: '4px', borderRadius: '6px' }}>
            <button
              className={`btn-icon ${viewMode === 'list' ? 'active-view' : ''}`}
              onClick={() => setViewMode('list')}
              style={{ background: viewMode === 'list' ? 'white' : 'transparent', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 600 }}
            >List</button>
            <button
              className={`btn-icon ${viewMode === 'calendar' ? 'active-view' : ''}`}
              onClick={() => setViewMode('calendar')}
              style={{ background: viewMode === 'calendar' ? 'white' : 'transparent', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 600 }}
            >Calendar</button>
          </div>
        </div>
      )}

      {/* -- ADD HOLIDAY MODAL -- */}
      {!readOnly && showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <FiPlus size={18} color="#fff" />
              <h3>Add Company Holiday</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ background: '#fff', padding: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '.875rem' }}>Holiday Date</label>
                <input
                  type="date"
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #eef0f7', borderRadius: '8px' }}
                  value={newHoliday.holiday_date}
                  onChange={e => setNewHoliday({ ...newHoliday, holiday_date: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '.875rem' }}>Holiday Name</label>
                <input
                  type="text"
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #eef0f7', borderRadius: '8px' }}
                  placeholder="e.g., Diwali, New Year's Day"
                  value={newHoliday.holiday_name}
                  onChange={e => setNewHoliday({ ...newHoliday, holiday_name: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '.875rem' }}>Holiday Type</label>
                <select
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #eef0f7', borderRadius: '8px', appearance: 'none', background: 'white' }}
                  value={newHoliday.holiday_type}
                  onChange={e => setNewHoliday({ ...newHoliday, holiday_type: e.target.value })}
                >
                  <option value="national">National Holiday</option>
                  <option value="company">Company Specific</option>
                  <option value="optional">Optional Holiday</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                  onClick={() => setShowAddModal(false)}
                >Cancel</button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={handleAdd}
                >Add Holiday</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'list' ? (
        <EnterpriseTable
          title="Holidays List"
          columns={columns}
          fetchData={() => masterAPI.getHolidays()}
          searchPlaceholder="Search by holiday name..."
          selectable={false}
        />
      ) : (
        renderCalendar()
      )}
    </div>
  );
};

export default HolidayManagement;
