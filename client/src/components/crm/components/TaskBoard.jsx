import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { message, Modal } from 'antd';
import { Plus, Trash2 } from 'lucide-react';
import TaskFormModal from './TaskFormModal';

const STATUSES = ['open', 'in_progress', 'completed'];
const STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In Progress',
  completed: 'Completed'
};
const STATUS_COLORS = {
  open: '#f1f5f9',
  in_progress: '#dbeafe',
  completed: '#dcfce7'
};

export default function TaskBoard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);

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
          await axios.delete(`${process.env.REACT_APP_API_STRING}/crm/tasks/${id}`, getHeaders());
          message.success('Task deleted successfully');
          fetchTasks();
        } catch (error) {
          message.error('Error deleting task');
        }
      }
    });
  };

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== newStatus) {
      handleUpdateStatus(draggedTask._id, newStatus);
      setDraggedTask(null);
    }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      // Update state immediately for instant visual feedback
      const updatedTasks = tasks.map(t => t._id === taskId ? { ...t, status: newStatus } : t);
      setTasks(updatedTasks);
      
      // Save to database
      await axios.put(`${process.env.REACT_APP_API_STRING}/crm/tasks/${taskId}`, { status: newStatus }, getHeaders());
      message.success('Task moved successfully');
    } catch (error) {
      message.error('Error updating task');
      // Revert on error
      fetchTasks();
    }
  };


  const getTasksByStatus = (status) => {
    const priorityWeights = { urgent: 4, high: 3, medium: 2, low: 1 };
    return tasks
      .filter(t => t.status === status)
      .sort((a, b) => {
        const weightA = priorityWeights[a.priority || 'medium'] || 2;
        const weightB = priorityWeights[b.priority || 'medium'] || 2;
        if (weightA !== weightB) {
          return weightB - weightA;
        }
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate) - new Date(b.dueDate);
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return { bg: '#fee2e2', text: '#dc2626' };
      case 'high': return { bg: '#fef3c7', text: '#d97706' };
      case 'medium': return { bg: '#dbeafe', text: '#2563eb' };
      case 'low': return { bg: '#e0e7ff', text: '#4f46e5' };
      default: return { bg: '#f1f5f9', text: '#64748b' };
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const isOverdue = (task) => {
    if (!task.dueDate || task.status === 'completed') return false;
    return new Date(task.dueDate) < new Date(new Date().toDateString());
  };

  const getAssigneeName = (task) => {
    if (!task.assignedTo) return null;
    if (typeof task.assignedTo === 'string') return null;
    const u = task.assignedTo;
    if (u.first_name) return `${u.first_name} ${u.last_name || ''}`.trim();
    return u.username || null;
  };

  const getAssigneeInitials = (task) => {
    const name = getAssigneeName(task);
    if (!name) return '?';
    const parts = name.split(' ');
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  if (loading) return <div style={{ padding: '20px', color: '#64748b' }}>Loading tasks...</div>;

  return (
    <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '12px', minHeight: '70vh' }}>
      <TaskFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTask(null);
        }}
        onRefresh={fetchTasks}
        task={editingTask}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, color: '#1e293b', fontWeight: 700 }}>Task Board</h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Kanban view - Organize by status</span>
        </div>
        <button
          onClick={() => setIsFormOpen(true)}
          style={{ background: '#4f46e5', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Plus size={18} /> New Task
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {STATUSES.map(status => {
          const statusTasks = getTasksByStatus(status);
          const overdueCount = statusTasks.filter(isOverdue).length;
          return (
            <div key={status}>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#475569', fontWeight: 700, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {STATUS_LABELS[status]}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{statusTasks.length} tasks</span>
                </div>
                {overdueCount > 0 && (
                  <span style={{
                    background: '#fef2f2', color: '#dc2626', fontSize: '0.7rem', fontWeight: 700,
                    padding: '3px 8px', borderRadius: '99px', border: '1px solid #fecaca'
                  }}>
                    ⚠️ {overdueCount} overdue
                  </span>
                )}
              </div>

              <div 
                style={{
                  background: STATUS_COLORS[status],
                  borderRadius: '12px',
                  padding: '16px',
                  minHeight: '400px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  border: '2px dashed transparent',
                  transition: 'border-color 0.2s'
                }}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
                onDragEnter={(e) => e.currentTarget.style.borderColor = '#4f46e5'}
                onDragLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
              >
                {statusTasks.length === 0 ? (
                  <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: '0.9rem',
                    fontStyle: 'italic'
                  }}>
                    No tasks
                  </div>
                ) : (
                  statusTasks.map(task => {
                    const overdue = isOverdue(task);
                    const priorityStyle = getPriorityColor(task.priority);
                    const assignee = getAssigneeName(task);
                    return (
                    <div
                      key={task._id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      style={{
                        background: '#fff',
                        padding: '14px',
                        borderRadius: '10px',
                        border: overdue ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                        borderLeft: overdue ? '4px solid #ef4444' : '4px solid transparent',
                        cursor: 'grab',
                        transition: 'all 0.2s',
                        opacity: draggedTask?._id === task._id ? 0.5 : 1,
                        boxShadow: overdue ? '0 0 0 1px rgba(239,68,68,0.1)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (draggedTask?._id !== task._id) {
                          e.currentTarget.style.boxShadow = overdue
                            ? '0 4px 12px rgba(239,68,68,0.15)'
                            : '0 4px 12px rgba(0,0,0,0.08)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = overdue ? '0 0 0 1px rgba(239,68,68,0.1)' : 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      {/* Header: Title + Action Buttons */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <h4 style={{ margin: 0, color: '#1e293b', fontWeight: 600, fontSize: '0.9rem', flex: 1, lineHeight: 1.3 }}>{task.title}</h4>
                        <div style={{ display: 'flex', gap: '6px', marginLeft: '8px', flexShrink: 0 }}>
                          <button
                            onClick={() => { setEditingTask(task); setIsFormOpen(true); }}
                            title="Edit task"
                            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '2px' }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(task._id)}
                            title="Delete task"
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Overdue Badge */}
                      {overdue && (
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          background: '#fef2f2', color: '#dc2626', fontSize: '0.7rem', fontWeight: 700,
                          padding: '2px 8px', borderRadius: '99px', marginBottom: '6px',
                          border: '1px solid #fecaca'
                        }}>
                          ⚠️ Overdue
                        </div>
                      )}

                      {task.description && (
                        <p style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: '0.82rem', lineHeight: 1.4 }}>
                          {task.description.length > 60 ? task.description.substring(0, 60) + '...' : task.description}
                        </p>
                      )}

                      {/* Priority + Due Date Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                        <span style={{
                          background: priorityStyle.bg,
                          color: priorityStyle.text,
                          padding: '2px 10px',
                          borderRadius: '99px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px'
                        }}>
                          {task.priority || 'Medium'}
                        </span>
                        {task.dueDate && (
                          <span style={{
                            fontSize: '0.78rem',
                            color: overdue ? '#dc2626' : '#64748b',
                            fontWeight: overdue ? 700 : 500,
                            display: 'flex', alignItems: 'center', gap: '4px'
                          }}>
                            📅 {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>

                      {/* Assignee + Related Link Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap', gap: '6px' }}>
                        {assignee && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{
                              width: '24px', height: '24px', borderRadius: '50%',
                              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                              color: '#fff', fontSize: '0.6rem', fontWeight: 700,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {getAssigneeInitials(task)}
                            </div>
                            <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 500 }}>{assignee}</span>
                          </div>
                        )}

                        {task.relatedTo?.model && task.relatedTo?.id && (
                          <div style={{ 
                            fontSize: '0.7rem', color: '#4f46e5', background: '#eef2ff',
                            padding: '2px 8px', borderRadius: '99px', border: '1px solid #dbeafe',
                            fontWeight: 600, whiteSpace: 'nowrap'
                          }}>
                            🔗 {task.relatedTo.model}: {task.relatedTo.name?.split(' (')[0] || 'Link'}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {status !== 'completed' && (
                        <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                          {status !== 'in_progress' && (
                            <button
                              onClick={() => handleUpdateStatus(task._id, 'in_progress')}
                              style={{
                                flex: 1, padding: '6px',
                                background: '#3b82f6', color: 'white',
                                border: 'none', borderRadius: '6px',
                                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer'
                              }}
                            >
                              ▶ Start
                            </button>
                          )}
                          <button
                            onClick={() => handleUpdateStatus(task._id, 'completed')}
                            style={{
                              flex: 1, padding: '6px',
                              background: '#10b981', color: 'white',
                              border: 'none', borderRadius: '6px',
                              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer'
                            }}
                          >
                            ✓ Complete
                          </button>
                        </div>
                      )}
                    </div>
                  );})
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
