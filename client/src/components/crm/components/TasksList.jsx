import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { message, Modal } from 'antd';
import { Edit2, Plus, Trash2, Check } from 'lucide-react';
import TaskFormModal from './TaskFormModal';

const PRIORITY_COLORS = {
  low: { bg: '#dbeafe', text: '#0c4a6e' },
  medium: { bg: '#fef3c7', text: '#92400e' },
  high: { bg: '#fee2e2', text: '#991b1b' },
  urgent: { bg: '#fecaca', text: '#7f1d1d' }
};

const STATUS_COLORS = {
  open: { bg: '#f1f5f9', text: '#475569' },
  in_progress: { bg: '#dbeafe', text: '#0c4a6e' },
  completed: { bg: '#dcfce7', text: '#166534' },
  cancelled: { bg: '#e5e7eb', text: '#6b7280' }
};

export default function TasksList() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('exim_user') || '{}');
    setCurrentUser(user);
    fetchTasks();
  }, []);

  const getHeaders = () => {
    const user = JSON.parse(localStorage.getItem('exim_user') || '{}');
    return {
      headers: {
        'Content-Type': 'application/json',
        'user-id': user._id || user.id || '',
        'username': user.username || '',
        'user-role': user.role || '',
        'Authorization': user.token ? `Bearer ${user.token}` : undefined
      },
      withCredentials: true
    };
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/crm/tasks`, getHeaders());
      setTasks(res.data || []);
    } catch (err) {
      setTasks([]);
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const canEditOrDelete = (task) => {
    if (!currentUser) return false;
    const isOwner = task.createdBy === currentUser._id || task.createdBy?._id === currentUser._id;
    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'Admin';
    return isOwner || isAdmin;
  };

  const canUpdateStatus = (task) => {
    if (!currentUser) return false;
    const assignedId = task.assignedTo?._id || task.assignedTo;
    const isAssignee = assignedId === currentUser._id;
    const isOwner = task.createdBy === currentUser._id || task.createdBy?._id === currentUser._id;
    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'Admin';
    return isAssignee || isOwner || isAdmin;
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete Task',
      content: 'Are you sure you want to delete this task?',
      okText: 'Delete',
      okType: 'danger',
      async onOk() {
        try {
          await axios.delete(`${process.env.REACT_APP_API_STRING}/crm/tasks/${id}`, getHeaders());
          message.success('Task deleted successfully');
          fetchTasks();
        } catch (error) {
          message.error('Error deleting task');
        }
      }
    });
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      // Update state immediately for instant visual feedback
      const updatedTasks = tasks.map(t => t._id === taskId ? { ...t, status: newStatus } : t);
      setTasks(updatedTasks);
      
      // Save to database
      await axios.put(`${process.env.REACT_APP_API_STRING}/crm/tasks/${taskId}`, { status: newStatus }, getHeaders());
      message.success('Task status updated');
    } catch (error) {
      message.error('Error updating task');
      // Revert on error
      fetchTasks();
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const filteredTasks = tasks.filter(task => {
    const statusMatch = !filterStatus || task.status === filterStatus;
    const priorityMatch = !filterPriority || task.priority === filterPriority;
    const assignedMatch = !filterAssigned || task.assignedTo === filterAssigned;
    return statusMatch && priorityMatch && assignedMatch;
  });

  if (loading) return <div style={{ padding: '20px', color: '#64748b' }}>Loading tasks...</div>;

  return (
    <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', minHeight: '600px' }}>
      <TaskFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTask(null);
        }}
        onRefresh={fetchTasks}
        task={editingTask}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, color: '#0f172a', fontWeight: 800, fontSize: '1.75rem', letterSpacing: '-0.025em' }}>Task Management</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>
            {filteredTasks.length === 0 ? 'No active tasks found' : `Currently tracking ${filteredTasks.length} tasks`}
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          style={{ 
            background: '#4f46e5', color: 'white', padding: '12px 24px', border: 'none', 
            borderRadius: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', 
            alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.4)',
            transition: 'all 0.2s', fontSize: '0.95rem'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <Plus size={20} /> New Task
        </button>
      </div>

      {/* Filters Bar */}
      <div style={{ 
        display: 'flex', gap: '12px', marginBottom: '2rem', flexWrap: 'wrap', 
        padding: '16px', background: '#fff', borderRadius: '12px', 
        border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Filter By:</span>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', background: '#fbfcfd', outline: 'none', cursor: 'pointer', minWidth: '140px' }}
        >
          <option value="">All Statuses</option>
          <option value="open">Opened</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          style={{ padding: '8px 16px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', background: '#fbfcfd', outline: 'none', cursor: 'pointer', minWidth: '140px' }}
        >
          <option value="">All Priorities</option>
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {filteredTasks.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: '16px', border: '1px dashed #e2e8f0' }}>
            <div style={{ marginBottom: '16px', opacity: 0.5 }}>📂</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#64748b' }}>No tasks found</div>
            <p style={{ margin: '8px 0 0', fontSize: '0.9rem' }}>Try adjusting your filters or create a new task above.</p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const hasStatusPermission = canUpdateStatus(task);
            const hasEditPermission = canEditOrDelete(task);
            
            return (
              <div
                key={task._id}
                style={{
                  background: '#fff',
                  padding: '20px',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '20px',
                  transition: 'all 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  opacity: (hasStatusPermission || hasEditPermission) ? 1 : 0.8
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.05)';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1 }}>
                  <div style={{ 
                    width: '4px', height: '40px', borderRadius: '2px', 
                    background: PRIORITY_COLORS[task.priority || 'medium']?.text || '#475569',
                    opacity: 0.8
                  }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                      <h4 style={{ margin: 0, color: '#1e293b', fontWeight: 700, fontSize: '1.05rem' }}>{task.title}</h4>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span style={{
                          background: STATUS_COLORS[task.status]?.bg || '#f1f5f9',
                          color: STATUS_COLORS[task.status]?.text || '#475569',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.025em'
                        }}>
                          {task.status?.replace('_', ' ') || 'Open'}
                        </span>
                        <span style={{
                          background: PRIORITY_COLORS[task.priority]?.bg || '#f1f5f9',
                          color: PRIORITY_COLORS[task.priority]?.text || '#475569',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.025em'
                        }}>
                          {task.priority || 'Medium'}
                        </span>
                      </div>
                    </div>
                    {task.description && (
                      <p style={{ margin: '0 0 10px 0', color: '#64748b', fontSize: '0.875rem', lineHeight: 1.5 }}>{task.description}</p>
                    )}
                    <div style={{ display: 'flex', gap: '24px', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#cbd5e1' }}>📅</span> Due: <span style={{ color: '#64748b' }}>{formatDate(task.dueDate)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#cbd5e1' }}>👤</span> Assigned to: 
                        <span style={{ color: '#4f46e5' }}>
                          {typeof task.assignedTo === 'object' && task.assignedTo
                            ? (task.assignedTo.first_name ? `${task.assignedTo.first_name} ${task.assignedTo.last_name || ''}`.trim() : task.assignedTo.username || 'Unassigned') 
                            : (task.assignedTo || 'Unassigned')}
                        </span>
                      
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  {task.status !== 'completed' && hasStatusPermission && (
                    <button
                      onClick={() => handleUpdateStatus(task._id, 'completed')}
                      style={{ background: '#ecfdf5', color: '#059669', padding: '10px', border: '1px solid #d1fae5', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#d1fae5'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#ecfdf5'; }}
                      title="Mark as complete"
                    >
                      <Check size={18} />
                    </button>
                  )}
                  {hasEditPermission && (
                    <>
                      <button
                        onClick={() => {
                          setEditingTask(task);
                          setIsFormOpen(true);
                        }}
                        style={{ background: '#eff6ff', color: '#2563eb', padding: '10px', border: '1px solid #dbeafe', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; }}
                        title="Edit details"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(task._id)}
                        style={{ background: '#fef2f2', color: '#dc2626', padding: '10px', border: '1px solid #fee2e2', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#fee2e2'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; }}
                        title="Remove task"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
