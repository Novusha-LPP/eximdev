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

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/crm/tasks`, { withCredentials: true });
      setTasks(res.data || []);
    } catch (err) {
      setTasks([]);
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete Task',
      content: 'Are you sure you want to delete this task?',
      okText: 'Delete',
      okType: 'danger',
      async onOk() {
        try {
          await axios.delete(`${process.env.REACT_APP_API_STRING}/crm/tasks/${id}`, { withCredentials: true });
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
      await axios.put(`${process.env.REACT_APP_API_STRING}/crm/tasks/${taskId}`, { status: newStatus }, { withCredentials: true });
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
    <div style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
      <TaskFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTask(null);
        }}
        onRefresh={fetchTasks}
        task={editingTask}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', fontWeight: 700 }}>Task List</h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{filteredTasks.length} tasks</span>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          style={{ background: '#4f46e5', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} /> New Task
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.9rem', background: 'white' }}
        >
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.9rem', background: 'white' }}
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {filteredTasks.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px' }}>
            No tasks found matching filters.
          </div>
        ) : (
          filteredTasks.map(task => (
            <div
              key={task._id}
              style={{
                background: '#f8fafc',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '16px'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, color: '#1e293b', fontWeight: 700 }}>{task.title}</h4>
                  <span style={{
                    background: STATUS_COLORS[task.status]?.bg || '#f1f5f9',
                    color: STATUS_COLORS[task.status]?.text || '#475569',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>
                    {task.status?.replace('_', ' ') || 'Open'}
                  </span>
                  <span style={{
                    background: PRIORITY_COLORS[task.priority]?.bg || '#f1f5f9',
                    color: PRIORITY_COLORS[task.priority]?.text || '#475569',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'capitalize'
                  }}>
                    {task.priority || 'Medium'}
                  </span>
                </div>
                {task.description && (
                  <p style={{ margin: '8px 0 0 0', color: '#475569', fontSize: '0.9rem' }}>{task.description}</p>
                )}
                <div style={{ display: 'flex', gap: '20px', marginTop: '8px', fontSize: '0.85rem', color: '#64748b' }}>
                  <span>Due: {formatDate(task.dueDate)}</span>
                  <span>Assigned to: {task.assignedTo || 'Unassigned'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                {task.status !== 'completed' && (
                  <button
                    onClick={() => handleUpdateStatus(task._id, 'completed')}
                    style={{ background: '#10b981', color: 'white', padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}
                    title="Mark as complete"
                  >
                    <Check size={16} />
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingTask(task);
                    setIsFormOpen(true);
                  }}
                  style={{ background: '#3b82f6', color: 'white', padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}
                  title="Edit"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(task._id)}
                  style={{ background: '#ef4444', color: 'white', padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', fontWeight: 600 }}
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
