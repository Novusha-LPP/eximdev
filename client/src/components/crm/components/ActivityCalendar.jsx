import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Plus, ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle2, Circle, X, MapPin, ExternalLink, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { message, Modal } from 'antd';
import TaskFormModal from './TaskFormModal';
import ActivityFormModal from './ActivityFormModal';
import OpportunityDetailModal from './OpportunityDetailModal';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const EVENT_TYPE_COLORS = {
  call: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  email: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
  meeting: { bg: '#ede9fe', text: '#6d28d9', border: '#c4b5fd' },
  demo: { bg: '#fce7f3', text: '#be185d', border: '#f9a8d4' },
  note: { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc' },
  visit: { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
  pre_sale: { bg: '#e0f2fe', text: '#0284c7', border: '#7dd3fc' },
  post_sale: { bg: '#ede9fe', text: '#7c3aed', border: '#c4b5fd' },
  // tasks
  call_task: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  email_task: { bg: '#fef9c3', text: '#713f12', border: '#fde68a' },
  meeting_task: { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' },
  research_task: { bg: '#e0f2fe', text: '#075985', border: '#7dd3fc' },
  visit_task: { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
  other_task: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
};

const getTaskColor = (task) => {
  const key = `${task.type || 'other'}_task`;
  return EVENT_TYPE_COLORS[key] || EVENT_TYPE_COLORS.other_task;
};

const getActivityColor = (activity) => {
  return EVENT_TYPE_COLORS[activity.type] || EVENT_TYPE_COLORS.note;
};

const getVisitColor = (visit) => {
  if (visit.isCompleted || visit.status === 'completed') {
    return { bg: '#dcfce7', text: '#15803d', border: '#86efac' };
  }
  if (visit.isCancelled || visit.status === 'cancelled') {
    return { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' };
  }
  return { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' };
};

const getHeaders = () => {
  const user = JSON.parse(localStorage.getItem('exim_user') || '{}');
  return {
    headers: {
      'Content-Type': 'application/json',
      'user-id': user._id || user.id || '',
      'username': user.username || '',
      'user-role': user.role || '',
    },
    withCredentials: true
  };
};

function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getDayRange(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getMonthRange(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  const da = a instanceof Date ? a : new Date(a);
  const db = b instanceof Date ? b : new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return false;

  // Compare local date components only. Matching UTC components as well made a
  // single event land on two adjacent day cells for anyone not in UTC
  // (e.g. IST: a Sept 23 event also rendered on Sept 24).
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

// Ensure visits ALWAYS appear at the top of any list, followed by pending tasks and activities
function sortEventsWithVisitsFirst(list) {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    const aIsVisit = (a._eventType === 'visit' || a.type === 'visit') ? 1 : 0;
    const bIsVisit = (b._eventType === 'visit' || b.type === 'visit') ? 1 : 0;
    if (aIsVisit !== bIsVisit) {
      return bIsVisit - aIsVisit; // Visits always first!
    }
    if (aIsVisit && bIsVisit) {
      const aPending = !a.isCompleted && !a.isCancelled ? 1 : 0;
      const bPending = !b.isCompleted && !b.isCancelled ? 1 : 0;
      if (aPending !== bPending) return bPending - aPending; // Pending visits before completed/cancelled
    }
    const aTime = new Date(a.dueDate || a.activityDate || a.visitDate || 0).getTime();
    const bTime = new Date(b.dueDate || b.activityDate || b.visitDate || 0).getTime();
    return aTime - bTime;
  });
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function EventPill({ event, onClick }) {
  const isVisit = event._eventType === 'visit' || event.type === 'visit';
  const isTask = event._eventType === 'task';
  const colors = isVisit
    ? getVisitColor(event)
    : isTask
    ? getTaskColor(event)
    : getActivityColor(event);

  const icon = isVisit ? '📍 ' : isTask ? '☑ ' : '● ';
  const title = event.title || event.subject;

  return (
    <div
      onClick={e => { e.stopPropagation(); onClick(event); }}
      title={title}
      style={{
        background: colors.bg,
        color: colors.text,
        border: isVisit ? `1.5px solid ${colors.border}` : `1px solid ${colors.border}`,
        boxShadow: isVisit ? '0 1px 2px rgba(234, 88, 12, 0.15)' : 'none',
        borderRadius: '5px',
        padding: '2px 6px',
        fontSize: '0.7rem',
        fontWeight: isVisit ? 700 : 600,
        cursor: 'pointer',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        marginBottom: '2px',
        textDecoration: event.isCancelled || event.status === 'cancelled' ? 'line-through' : 'none',
        opacity: event.isCancelled || event.status === 'cancelled' ? 0.7 : 1,
        display: 'flex',
        alignItems: 'center',
        gap: '3px'
      }}
    >
      <span>{icon}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
      {event.isCompleted && <span style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>✓</span>}
    </div>
  );
}

// ─── Day View ─────────────────────────────────────────────────────────────────
function DayView({ events, date, onCellClick, onEventClick }) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dayEvents = sortEventsWithVisitsFirst(
    events.filter(e => isSameDay(new Date(e.dueDate || e.activityDate || e.visitDate), date))
  );
  const visitsForDay = dayEvents.filter(e => e._eventType === 'visit' || e.type === 'visit');

  const getEventsForHour = (hour) =>
    sortEventsWithVisitsFirst(
      dayEvents.filter(e => {
        const d = new Date(e.dueDate || e.activityDate || e.visitDate);
        return d.getHours() === hour;
      })
    );

  return (
    <div style={{ overflowY: 'auto', maxHeight: '65vh', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
      {visitsForDay.length > 0 && (
        <div style={{ padding: '12px 16px', background: '#fff7ed', borderBottom: '2px solid #fed7aa' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <MapPin size={14} /> Scheduled Visits For Today ({visitsForDay.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {visitsForDay.map(ev => (
              <div key={ev._id} style={{ minWidth: '200px' }}>
                <EventPill event={ev} onClick={onEventClick} />
              </div>
            ))}
          </div>
        </div>
      )}

      {hours.map(hour => {
        const slotEvents = getEventsForHour(hour);
        const label = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
        return (
          <div
            key={hour}
            onClick={() => onCellClick(date, hour)}
            style={{
              display: 'grid',
              gridTemplateColumns: '64px 1fr',
              borderBottom: '1px solid #f1f5f9',
              minHeight: '56px',
              cursor: 'pointer',
              background: slotEvents.length > 0 ? '#fafaff' : '#fff',
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = slotEvents.length > 0 ? '#fafaff' : '#fff'}
          >
            <div style={{ padding: '6px 8px', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textAlign: 'right', borderRight: '1px solid #f1f5f9' }}>
              {label}
            </div>
            <div style={{ padding: '4px 8px' }}>
              {slotEvents.map(ev => (
                <EventPill key={ev._id} event={ev} onClick={onEventClick} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Week View ─────────────────────────────────────────────────────────────────
function WeekView({ events, weekStart, onCellClick, onEventClick, onMoreClick }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const today = new Date();

  const getEventsForDay = (day) =>
    sortEventsWithVisitsFirst(
      events.filter(e => isSameDay(new Date(e.dueDate || e.activityDate || e.visitDate), day))
    );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
      {days.map((day, idx) => {
        const dayEvents = getEventsForDay(day);
        const isToday = isSameDay(day, today);
        return (
          <div
            key={idx}
            onClick={() => onCellClick(day)}
            style={{
              borderRight: idx < 6 ? '1px solid #e2e8f0' : 'none',
              background: isToday ? '#f5f3ff' : '#fff',
              cursor: 'pointer',
              minHeight: '200px'
            }}
          >
            <div style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', background: isToday ? '#4f46e5' : '#f8fafc' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: isToday ? '#c7d2fe' : '#94a3b8' }}>{DAYS_SHORT[day.getDay()]}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: isToday ? '#ffffff' : '#334155' }}>{day.getDate()}</div>
            </div>
            <div style={{ padding: '4px' }}>
              {dayEvents.slice(0, 5).map(ev => (
                <EventPill key={ev._id} event={ev} onClick={onEventClick} />
              ))}
              {dayEvents.length > 5 && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoreClick(day);
                  }}
                  style={{ fontSize: '0.7rem', color: '#4f46e5', fontWeight: 600, padding: '4px 6px', cursor: 'pointer' }}
                >
                  +{dayEvents.length - 5} more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Month View ─────────────────────────────────────────────────────────────────
function MonthView({ events, year, month, onCellClick, onEventClick, onMoreClick }) {
  const today = new Date();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  // pad start
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getEventsForDay = (d) => {
    if (!d) return [];
    const dt = new Date(year, month, d);
    return sortEventsWithVisitsFirst(
      events.filter(e => isSameDay(new Date(e.dueDate || e.activityDate || e.visitDate), dt))
    );
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, background: '#f8fafc', borderRadius: '12px 12px 0 0', overflow: 'hidden', border: '1px solid #e2e8f0', borderBottom: 'none' }}>
        {DAYS_SHORT.map(d => (
          <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0, border: '1px solid #e2e8f0', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
        {cells.map((d, idx) => {
          const dayEvents = getEventsForDay(d);
          const dt = d ? new Date(year, month, d) : null;
          const isToday = dt && isSameDay(dt, today);
          return (
            <div
              key={idx}
              onClick={() => d && onCellClick(new Date(year, month, d))}
              style={{
                minHeight: '100px',
                padding: '6px',
                borderRight: (idx + 1) % 7 === 0 ? 'none' : '1px solid #e2e8f0',
                borderBottom: '1px solid #e2e8f0',
                background: isToday ? '#f5f3ff' : d ? '#fff' : '#fafafa',
                cursor: d ? 'pointer' : 'default',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => d && (e.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={e => d && (e.currentTarget.style.background = isToday ? '#f5f3ff' : '#fff')}
            >
              {d && (
                <>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: isToday ? '#4f46e5' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.85rem', fontWeight: isToday ? 700 : 500,
                    color: isToday ? '#fff' : '#334155',
                    marginBottom: '4px'
                  }}>{d}</div>
                  {dayEvents.slice(0, 3).map(ev => (
                    <EventPill key={ev._id} event={ev} onClick={onEventClick} />
                  ))}
                  {dayEvents.length > 3 && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoreClick(dt);
                      }}
                      style={{ fontSize: '0.65rem', color: '#4f46e5', fontWeight: 600, cursor: 'pointer', marginTop: '2px' }}
                    >
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Event Detail Panel ────────────────────────────────────────────────────────
function EventDetailPanel({ event, onClose, onEdit, onDelete, onCompleteVisit, onCancelVisit, onPostponeVisit, onOpenDeal }) {
  const [isPostponing, setIsPostponing] = useState(false);
  const [postponeDate, setPostponeDate] = useState('');

  if (!event) return null;
  const isVisit = event._eventType === 'visit' || event.type === 'visit';
  const isTask = event._eventType === 'task';
  const colors = isVisit ? getVisitColor(event) : isTask ? getTaskColor(event) : getActivityColor(event);

  return (
    <>
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.3)', backdropFilter: 'blur(3px)',
          zIndex: 99990
        }}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '400px',
        maxWidth: '90vw',
        background: '#fff', borderLeft: '1px solid #e2e8f0',
        boxShadow: '-8px 0 32px rgba(15, 23, 42, 0.12)', zIndex: 99999,
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: colors.bg }}>
          <div>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: colors.text }}>
              {isVisit ? '📍 Planned Visit' : isTask ? '☑ Task' : `● Activity – ${event.type}`}
            </span>
            <h3 style={{ margin: '4px 0 0 0', fontSize: '1.05rem', fontWeight: 800, color: '#1e293b' }}>
              {event.title || event.subject}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#fff', border: '1px solid #e2e8f0', cursor: 'pointer',
              color: '#64748b', borderRadius: '8px', padding: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Status Banner */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderRadius: '10px',
            background: event.isCompleted || event.status === 'completed' ? '#f0fdf4' : event.isCancelled || event.status === 'cancelled' ? '#fef2f2' : '#fff7ed',
            border: `1px solid ${event.isCompleted || event.status === 'completed' ? '#bbf7d0' : event.isCancelled || event.status === 'cancelled' ? '#fecaca' : '#fed7aa'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color={event.isCompleted || event.status === 'completed' ? '#16a34a' : event.isCancelled || event.status === 'cancelled' ? '#dc2626' : '#ea580c'} />
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: event.isCompleted || event.status === 'completed' ? '#16a34a' : event.isCancelled || event.status === 'cancelled' ? '#dc2626' : '#c2410c', textTransform: 'capitalize' }}>
                Status: {event.isCompleted ? 'Completed' : event.isCancelled ? 'Cancelled' : event.status || 'Scheduled'}
              </span>
            </div>
            {event.completedAt && (
              <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>
                {new Date(event.completedAt).toLocaleDateString('en-IN')}
              </span>
            )}
            {event.cancelledAt && (
              <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: 600 }}>
                {new Date(event.cancelledAt).toLocaleDateString('en-IN')}
              </span>
            )}
          </div>

          {/* Date & Time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: '#334155', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <Clock size={16} color="#64748b" />
            <span style={{ fontWeight: 600 }}>
              {new Date(event.visitDate || event.dueDate || event.activityDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>

          {/* Planned Visit Details */}
          {isVisit && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#fafaf9', padding: '14px', borderRadius: '10px', border: '1px solid #e7e5e4' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deal & Client Information</div>

              {event.accountName && (
                <div style={{ fontSize: '0.85rem', color: '#44403c' }}>
                  <strong>Client / Company:</strong> <span style={{ fontWeight: 600, color: '#1e293b' }}>{event.accountName}</span>
                </div>
              )}

              {event.dealName && (
                <div style={{ fontSize: '0.85rem', color: '#44403c' }}>
                  <strong>Deal Name:</strong> {event.dealName}
                </div>
              )}

              {event.stage && (
                <div style={{ fontSize: '0.85rem', color: '#44403c' }}>
                  <strong>Stage:</strong> <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' }}>{event.stage.replace('_', ' ')}</span>
                </div>
              )}

              {event.dealValue > 0 && (
                <div style={{ fontSize: '0.85rem', color: '#44403c' }}>
                  <strong>Deal Value:</strong> <span style={{ color: '#16a34a', fontWeight: 700 }}>₹{event.dealValue.toLocaleString('en-IN')}</span>
                </div>
              )}

              {event.businessVertical && (
                <div style={{ fontSize: '0.85rem', color: '#44403c' }}>
                  <strong>Vertical:</strong> <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{event.businessVertical}</span>
                </div>
              )}

              {(event.contactName || event.contactPhone || event.contactEmail) && (
                <div style={{ fontSize: '0.85rem', color: '#44403c', borderTop: '1px dashed #d6d3d1', paddingTop: '8px' }}>
                  <strong>Contact:</strong> {event.contactName || 'Primary Contact'}
                  {event.contactPhone && <div>📞 {event.contactPhone}</div>}
                  {event.contactEmail && <div>✉️ {event.contactEmail}</div>}
                </div>
              )}

              {event.ownerName && (
                <div style={{ fontSize: '0.85rem', color: '#44403c', borderTop: '1px dashed #d6d3d1', paddingTop: '8px' }}>
                  <strong>Assigned Owner:</strong> <span style={{ fontWeight: 600 }}>{event.ownerName}</span>
                </div>
              )}
            </div>
          )}

          {/* Description for tasks or activities */}
          {event.description && (
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Description</div>
              <p style={{ margin: '0', color: '#475569', fontSize: '0.9rem', lineHeight: 1.5, background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>{event.description}</p>
            </div>
          )}

          {/* Task fields */}
          {isTask && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.85rem', color: '#475569' }}>Priority: <strong style={{ textTransform: 'capitalize' }}>{event.priority}</strong></div>
              {event.relatedTo?.model && (
                <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                  Linked Record: <span style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{event.relatedTo.model}: {event.relatedTo.name || 'Record'}</span>
                </div>
              )}
            </div>
          )}

          {/* Activity fields */}
          {!isTask && !isVisit && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              {event.outcome && <div style={{ fontSize: '0.85rem', color: '#475569' }}>Outcome: <strong style={{ textTransform: 'capitalize' }}>{event.outcome}</strong></div>}
              {event.duration && <div style={{ fontSize: '0.85rem', color: '#475569' }}>Duration: <strong>{event.duration} min</strong></div>}
              {event.relatedTo?.model && (
                <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                  Linked Record: <span style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{event.relatedTo.model}: {event.relatedTo.name || 'Record'}</span>
                </div>
              )}
            </div>
          )}

          {/* Postpone Form for Visits */}
          {isVisit && isPostponing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#fff7ed', padding: '14px', borderRadius: '10px', border: '1px solid #fdba74' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c2410c' }}>Select New Visit Date:</span>
              <input
                type="date"
                value={postponeDate}
                onChange={e => setPostponeDate(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    onPostponeVisit(event, postponeDate);
                    setIsPostponing(false);
                  }}
                  style={{ flex: 1, padding: '8px', background: '#ea580c', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  Confirm Reschedule
                </button>
                <button
                  onClick={() => setIsPostponing(false)}
                  style={{ padding: '8px 12px', background: '#f1f5f9', border: 'none', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#fafafa', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {isVisit ? (
            <>
              {/* Visit quick action buttons */}
              {!event.isCompleted && !event.isCancelled && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => onCompleteVisit(event)}
                    style={{
                      flex: 1, padding: '9px 12px', background: '#16a34a', color: 'white',
                      border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    ✓ Complete Visit
                  </button>
                  <button
                    onClick={() => setIsPostponing(!isPostponing)}
                    style={{
                      flex: 1, padding: '9px 12px', background: '#ea580c', color: 'white',
                      border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    📅 Postpone
                  </button>
                  <button
                    onClick={() => onCancelVisit(event)}
                    style={{
                      padding: '9px 12px', background: '#fef2f2', color: '#dc2626',
                      border: '1px solid #fee2e2', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem'
                    }}
                  >
                    ✕ Cancel
                  </button>
                </div>
              )}

              {/* View Deal Details & Delete */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => onOpenDeal(event)}
                  style={{
                    flex: 1, padding: '9px 14px', background: '#4f46e5', color: 'white',
                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  <ExternalLink size={14} /> Open Deal Details
                </button>
                <button
                  onClick={() => onDelete(event)}
                  style={{
                    padding: '9px 14px', background: '#fff', color: '#ef4444',
                    border: '1px solid #fee2e2', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
                    display: 'flex', alignItems: 'center', gap: '4px'
                  }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => onEdit(event)}
                style={{
                  flex: 1, padding: '10px 16px', background: '#3b82f6', color: 'white',
                  border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <Edit2 size={15} /> Edit
              </button>
              <button
                onClick={() => onDelete(event)}
                style={{
                  flex: 1, padding: '10px 16px', background: '#fef2f2', color: '#ef4444',
                  border: '1px solid #fee2e2', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
              >
                <Trash2 size={15} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main Calendar Component ───────────────────────────────────────────────────
export default function ActivityCalendar() {
  const [view, setView] = useState('month'); // 'day' | 'week' | 'month'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [prefilledDate, setPrefilledDate] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [addMenuVisible, setAddMenuVisible] = useState(false);

  // Opportunity Detail Modal State
  const [isOpportunityModalOpen, setIsOpportunityModalOpen] = useState(false);
  const [selectedOpportunityForModal, setSelectedOpportunityForModal] = useState(null);

  // Team calendar state
  const [userTeams, setUserTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');

  // Current logged in user info
  const currentUser = JSON.parse(localStorage.getItem('exim_user') || '{}');
  const userRole = currentUser.role || currentUser.crmRole || '';
  const isCrmAdmin = userRole === 'Admin' || (typeof userRole === 'string' && userRole.toLowerCase() === 'admin');

  // Editing state
  const [editingTask, setEditingTask] = useState(null);
  const [editingActivity, setEditingActivity] = useState(null);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/crm/teams`, getHeaders());
      setUserTeams(res.data.teams || []);
    } catch (err) {
      console.error('Error fetching user teams:', err);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      let start, end;
      if (view === 'day') {
        ({ start, end } = getDayRange(currentDate));
      } else if (view === 'week') {
        ({ start, end } = getWeekRange(currentDate));
      } else {
        ({ start, end } = getMonthRange(currentDate));
      }

      const startISO = start.toISOString();
      const endISO = end.toISOString();
      const headers = getHeaders();

      const currentUserId = currentUser._id || currentUser.id || '';

      const taskParams = { startDate: startISO, endDate: endISO };
      const activityParams = { startDate: startISO, endDate: endISO };
      const visitParams = { startDate: startISO, endDate: endISO };

      if (selectedTeamId === 'all') {
        // Admin viewing all - do not filter by team or single user
      } else if (selectedTeamId) {
        taskParams.teamId = selectedTeamId;
        activityParams.teamId = selectedTeamId;
        visitParams.teamId = selectedTeamId;
      } else {
        taskParams.assignedTo = currentUserId;
        activityParams.userId = currentUserId;
        visitParams.userId = currentUserId;
      }

      const [tasksRes, activitiesRes, visitsRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_STRING}/crm/tasks`, {
          ...headers,
          params: taskParams
        }).catch(err => {
          console.error('Calendar: Tasks fetch error:', err.response?.status, err.message);
          return { data: [] };
        }),
        axios.get(`${process.env.REACT_APP_API_STRING}/crm/activities`, {
          ...headers,
          params: activityParams
        }).catch(err => {
          console.error('Calendar: Activities fetch error:', err.response?.status, err.message);
          return { data: [] };
        }),
        axios.get(`${process.env.REACT_APP_API_STRING}/crm/opportunities/planned-visits`, {
          ...headers,
          params: visitParams
        }).catch(err => {
          console.error('Calendar: Visits fetch error:', err.response?.status, err.message);
          return { data: [] };
        })
      ]);

      const tasks = (Array.isArray(tasksRes.data) ? tasksRes.data : []).map(t => ({ ...t, _eventType: 'task' }));
      const activities = (Array.isArray(activitiesRes.data) ? activitiesRes.data : []).map(a => ({ ...a, _eventType: 'activity' }));
      const visits = (Array.isArray(visitsRes.data) ? visitsRes.data : []).map(v => ({ ...v, _eventType: 'visit' }));

      console.log(`Calendar: Fetched ${tasks.length} tasks, ${activities.length} activities, ${visits.length} visits for range ${startISO} to ${endISO}`);

      setEvents(sortEventsWithVisitsFirst([...visits, ...tasks, ...activities]));
    } catch (err) {
      console.error('Calendar fetch error:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [view, currentDate, selectedTeamId]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const navigate = (dir) => {
    const d = new Date(currentDate);
    if (view === 'day') d.setDate(d.getDate() + dir);
    else if (view === 'week') d.setDate(d.getDate() + (dir * 7));
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const getTitle = () => {
    if (view === 'day') {
      return currentDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (view === 'week') {
      const { start, end } = getWeekRange(currentDate);
      return `${start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  const handleCellClick = (date, hour) => {
    const d = new Date(date);
    if (hour !== undefined) d.setHours(hour, 0, 0, 0);
    const tzOffset = d.getTimezoneOffset() * 60000;
    setPrefilledDate(new Date(d.getTime() - tzOffset).toISOString().substring(0, 16));
    setAddMenuVisible(true);
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  const handleEventEdit = (event) => {
    setSelectedEvent(null);
    if (event._eventType === 'task') {
      setEditingTask(event);
      setIsTaskModalOpen(true);
    } else {
      setEditingActivity(event);
      setIsActivityModalOpen(true);
    }
  };

  const handleCompleteVisit = async (event) => {
    const oppId = event.opportunityId || event.relatedTo?.id;
    const visitId = event.visitId || event._id;
    if (!oppId || !visitId) return;
    try {
      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/crm/opportunities/${oppId}/planned-visits/${visitId}/complete`,
        {},
        getHeaders()
      );
      message.success('Visit marked as completed');
      setSelectedEvent(null);
      fetchEvents();
    } catch (err) {
      message.error('Failed to complete visit: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleCancelVisit = async (event) => {
    const oppId = event.opportunityId || event.relatedTo?.id;
    const visitId = event.visitId || event._id;
    if (!oppId || !visitId) return;
    try {
      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/crm/opportunities/${oppId}/planned-visits/${visitId}/cancel`,
        {},
        getHeaders()
      );
      message.success('Visit cancelled successfully');
      setSelectedEvent(null);
      fetchEvents();
    } catch (err) {
      message.error('Failed to cancel visit: ' + (err.response?.data?.message || err.message));
    }
  };

  const handlePostponeVisit = async (event, newDate) => {
    if (!newDate) {
      message.error('Please select a new visit date');
      return;
    }
    const oppId = event.opportunityId || event.relatedTo?.id;
    const visitId = event.visitId || event._id;
    if (!oppId || !visitId) return;
    try {
      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/crm/opportunities/${oppId}/planned-visits/${visitId}/postpone`,
        { visitDate: newDate },
        getHeaders()
      );
      message.success(`Visit postponed to ${newDate}`);
      setSelectedEvent(null);
      fetchEvents();
    } catch (err) {
      message.error('Failed to postpone visit: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenDeal = async (event) => {
    const oppId = event.opportunityId || event.relatedTo?.id;
    if (!oppId) return;
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/crm/opportunities/${oppId}`, getHeaders());
      setSelectedOpportunityForModal(res.data);
      setIsOpportunityModalOpen(true);
      setSelectedEvent(null);
    } catch (err) {
      message.error('Error loading opportunity: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleEventDelete = (event) => {
    const isVisit = event._eventType === 'visit';
    const isTask = event._eventType === 'task';
    const itemType = isVisit ? 'Planned Visit' : isTask ? 'Task' : 'Activity';

    Modal.confirm({
      title: `Delete ${itemType}`,
      content: `Are you sure you want to delete this ${itemType.toLowerCase()}?`,
      okText: 'Delete',
      okType: 'danger',
      async onOk() {
        try {
          if (isVisit) {
            const oppId = event.opportunityId || event.relatedTo?.id;
            const visitId = event.visitId || event._id;
            await axios.delete(`${process.env.REACT_APP_API_STRING}/crm/opportunities/${oppId}/planned-visits/${visitId}`, getHeaders());
          } else {
            const endpoint = isTask ? `/crm/tasks/${event._id}` : `/crm/activities/${event._id}`;
            await axios.delete(`${process.env.REACT_APP_API_STRING}${endpoint}`, getHeaders());
          }
          message.success(`${itemType} deleted successfully`);
          setSelectedEvent(null);
          fetchEvents();
        } catch (error) {
          message.error(`Error deleting ${itemType.toLowerCase()}`);
        }
      }
    });
  };

  const weekStart = getWeekRange(currentDate).start;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0', fontFamily: 'Inter, sans-serif', position: 'relative' }}>

      {/* Task Modal */}
      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); setPrefilledDate(''); }}
        onRefresh={fetchEvents}
        task={editingTask}
      />

      {/* Activity Modal */}
      <ActivityFormModal
        isOpen={isActivityModalOpen}
        onClose={() => { setIsActivityModalOpen(false); setEditingActivity(null); setPrefilledDate(''); }}
        onRefresh={fetchEvents}
        activity={editingActivity}
      />

      {/* Opportunity Detail Modal (when opened from calendar visit) */}
      {selectedOpportunityForModal && (
        <OpportunityDetailModal
          isOpen={isOpportunityModalOpen}
          onClose={() => {
            setIsOpportunityModalOpen(false);
            setSelectedOpportunityForModal(null);
          }}
          opportunity={selectedOpportunityForModal}
          onRefresh={fetchEvents}
        />
      )}

      {/* Event Detail Slide-over */}
      {selectedEvent && (
        <EventDetailPanel
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={handleEventEdit}
          onDelete={handleEventDelete}
          onCompleteVisit={handleCompleteVisit}
          onCancelVisit={handleCancelVisit}
          onPostponeVisit={handlePostponeVisit}
          onOpenDeal={handleOpenDeal}
        />
      )}

      {/* Add Menu Overlay */}
      {addMenuVisible && (
        <div
          onClick={() => setAddMenuVisible(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.05)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              background: '#fff', borderRadius: '16px', padding: '24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)', zIndex: 1000,
              minWidth: '280px', textAlign: 'center'
            }}
          >
            <h3 style={{ margin: '0 0 16px', color: '#1e293b', fontWeight: 700 }}>What do you want to add?</h3>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => { setAddMenuVisible(false); setIsTaskModalOpen(true); }}
                style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
              >
                ☑ Task
              </button>
              <button
                onClick={() => { setAddMenuVisible(false); setIsActivityModalOpen(true); }}
                style={{ background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 24px', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}
              >
                ● Activity / Visit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: '#fff', padding: '20px 24px', borderRadius: '16px 16px 0 0', border: '1px solid #e2e8f0', borderBottom: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => navigate(-1)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex' }}>
              <ChevronLeft size={18} color="#475569" />
            </button>
            <button onClick={() => setCurrentDate(new Date())} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', color: '#475569' }}>
              Today
            </button>
            <button onClick={() => navigate(1)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', display: 'flex' }}>
              <ChevronRight size={18} color="#475569" />
            </button>
          </div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{getTitle()}</h2>
          {loading && <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Loading…</span>}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Team Dropdown Selector */}
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.85rem',
              outline: 'none',
              background: '#fff',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            <option value="">👤 My Calendar (Personal View)</option>
            {isCrmAdmin && (
              <option value="all">🌐 All Teams / Organization</option>
            )}
            {userTeams.map(team => (
              <option key={team._id} value={team._id}>
                👥 Team: {team.name}
              </option>
            ))}
          </select>

          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
            {['day', 'week', 'month'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  background: view === v ? '#4f46e5' : 'transparent',
                  color: view === v ? '#fff' : '#475569',
                  border: 'none', borderRadius: '6px', padding: '6px 14px',
                  fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', textTransform: 'capitalize',
                  transition: 'all 0.15s'
                }}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setPrefilledDate(''); setAddMenuVisible(true); }}
            style={{ background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {/* Calendar Body */}
      <div style={{ background: '#fff', padding: '16px', borderRadius: '0 0 16px 16px', border: '1px solid #e2e8f0' }}>
        {/* Legend */}
        <div style={{ display: 'flex', gap: '14px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center', padding: '4px 8px', background: '#f8fafc', borderRadius: '8px' }}>
          {[
            { label: 'Visit', color: '#ea580c', icon: '📍' },
            { label: 'Task', color: '#4f46e5', icon: '☑' },
            { label: 'Call', color: '#1d4ed8', icon: '●' },
            { label: 'Email', color: '#b45309', icon: '●' },
            { label: 'Meeting', color: '#6d28d9', icon: '●' },
            { label: 'Demo', color: '#be185d', icon: '●' },
            { label: 'Note', color: '#0369a1', icon: '●' },
            { label: 'Pre Sale', color: '#0284c7', icon: '🎯' },
            { label: 'Post Sale', color: '#7c3aed', icon: '🤝' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
              <span style={{ fontSize: '0.75rem' }}>{item.icon}</span>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }}></div>
              {item.label}
            </div>
          ))}
        </div>

        {view === 'day' && (
          <DayView events={events} date={currentDate} onCellClick={handleCellClick} onEventClick={handleEventClick} />
        )}
        {view === 'week' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 0, marginBottom: 0 }}>
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date(weekStart);
                d.setDate(weekStart.getDate() + i);
                return null;
              })}
            </div>
            <WeekView
              events={events}
              weekStart={weekStart}
              onCellClick={handleCellClick}
              onEventClick={handleEventClick}
              onMoreClick={(dt) => {
                setCurrentDate(dt);
                setView('day');
              }}
            />
          </>
        )}
        {view === 'month' && (
          <MonthView
            events={events}
            year={currentDate.getFullYear()}
            month={currentDate.getMonth()}
            onCellClick={handleCellClick}
            onEventClick={handleEventClick}
            onMoreClick={(dt) => {
              setCurrentDate(dt);
              setView('day');
            }}
          />
        )}
      </div>
    </div>
  );
}
