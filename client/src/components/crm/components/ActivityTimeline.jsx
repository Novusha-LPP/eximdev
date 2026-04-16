import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { message, Modal } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import ActivityFormModal from './ActivityFormModal';

const ACTIVITY_TYPES = {
  call: { color: '#3b82f6', icon: '☎️' },
  email: { color: '#8b5cf6', icon: '✉️' },
  meeting: { color: '#10b981', icon: '👥' },
  demo: { color: '#f59e0b', icon: '🎬' },
  note: { color: '#64748b', icon: '📝' }
};

const OUTCOME_COLORS = {
  positive: '#dcfce7',
  neutral: '#f1f5f9',
  negative: '#fee2e2'
};

export default function ActivityTimeline({ linkedId, linkedType = 'opportunity' }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      // Map linkedType to Model names expected by backend
      const modelMap = {
        opportunity: 'Opportunity',
        account: 'Account',
        contact: 'Contact',
        lead: 'Lead'
      };
      
      const relatedModel = modelMap[linkedType];
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/crm/activities?relatedModel=${relatedModel}&relatedId=${linkedId}`, { withCredentials: true });
      setActivities(res.data);
    } catch (err) {
      message.error('Failed to load activities');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (linkedId) {
      fetchActivities();
    }
  }, [linkedId, linkedType]);

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete Activity',
      content: 'Are you sure you want to delete this activity?',
      okText: 'Delete',
      okType: 'danger',
      async onOk() {
        try {
          await axios.delete(`${process.env.REACT_APP_API_STRING}/crm/activities/${id}`, { withCredentials: true });
          message.success('Activity deleted successfully');
          fetchActivities();
        } catch (error) {
          message.error('Error deleting activity');
        }
      }
    });
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) return <div style={{ padding: '12px', color: '#64748b', fontSize: '0.9rem' }}>Loading activities...</div>;

  return (
    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
      <ActivityFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingActivity(null);
        }}
        onRefresh={fetchActivities}
        activity={editingActivity}
        linkedId={linkedId}
        linkedType={linkedType}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: '#475569', fontWeight: 700, fontSize: '0.95rem' }}>Activity Timeline</h3>
        <button
          onClick={() => setIsFormOpen(true)}
          style={{ background: '#4f46e5', color: 'white', padding: '6px 12px', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
        >
          <Plus size={16} /> Log Activity
        </button>
      </div>

      {activities.length === 0 ? (
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0, padding: '12px', textAlign: 'center' }}>No activities logged yet.</p>
      ) : (
        <div>
          {activities.map((activity, index) => (
            <div key={activity._id} style={{ position: 'relative', display: 'flex', gap: '12px', marginBottom: '16px' }}>
              {/* Timeline line */}
              {index !== activities.length - 1 && (
                <div style={{
                  position: 'absolute',
                  left: '14px',
                  top: '40px',
                  bottom: '-16px',
                  width: '2px',
                  background: '#e2e8f0'
                }} />
              )}

              {/* Timeline dot */}
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: ACTIVITY_TYPES[activity.type]?.color || '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '14px',
                flexShrink: 0,
                position: 'relative',
                zIndex: 1
              }}>
                {ACTIVITY_TYPES[activity.type]?.icon || '●'}
              </div>

              {/* Activity content */}
              <div style={{
                flex: 1,
                background: 'white',
                padding: '12px',
                borderRadius: '6px',
                border: `1px solid ${OUTCOME_COLORS[activity.outcome] ? 'transparent' : '#e2e8f0'}`,
                backgroundColor: OUTCOME_COLORS[activity.outcome] || 'white',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, color: '#1e293b', fontWeight: 700, fontSize: '0.9rem' }}>
                      {activity.subject}
                    </h4>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                      {activity.type}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(activity._id)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', flexShrink: 0 }}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {activity.description && (
                  <p style={{ margin: '8px 0', color: '#475569', fontSize: '0.9rem' }}>{activity.description}</p>
                )}

                <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: '#64748b', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.05)', flexWrap: 'wrap' }}>
                  <span>{formatDate(activity.createdAt)}</span>
                  {activity.userId && (
                    <span style={{ fontWeight: 600 }}>
                      Logged by: {activity.userId.first_name || ''} {activity.userId.last_name || activity.userId.username || 'System'}
                    </span>
                  )}
                  {activity.duration && <span>Duration: {activity.duration} mins</span>}
                  {activity.outcome && <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>Outcome: {activity.outcome}</span>}
                </div>

                {activity.nextSteps && (
                  <div style={{ marginTop: '8px', padding: '8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '0.85rem', color: '#475569', borderLeft: '3px solid #4f46e5' }}>
                    <strong>Next Steps:</strong> {activity.nextSteps}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
