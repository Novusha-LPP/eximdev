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
    return tasks.filter(t => t.status === status);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#fee2e2';
      case 'high': return '#fef3c7';
      case 'medium': return '#dbeafe';
      case 'low': return '#e0e7ff';
      default: return '#f1f5f9';
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
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
          return (
            <div key={status}>
              <div style={{ marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: '#475569', fontWeight: 700, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {STATUS_LABELS[status]}
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{statusTasks.length} tasks</span>
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
                  statusTasks.map(task => (
                    <div
                      key={task._id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      style={{
                        background: '#fff',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        cursor: 'grab',
                        transition: 'all 0.2s',
                        opacity: draggedTask?._id === task._id ? 0.5 : 1
                      }}
                      onMouseEnter={(e) => {
                        if (draggedTask?._id !== task._id) {
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, color: '#1e293b', fontWeight: 600, fontSize: '0.9rem', flex: 1 }}>{task.title}</h4>
                        <button
                          onClick={() => handleDelete(task._id)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {task.description && (
                        <p style={{ margin: '0 0 8px 0', color: '#64748b', fontSize: '0.85rem', lineHeight: 1.4 }}>
                          {task.description.substring(0, 60)}...
                        </p>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <span style={{
                            background: getPriorityColor(task.priority),
                            color: '#334155',
                            padding: '2px 8px',
                            borderRadius: '3px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textTransform: 'uppercase'
                          }}>
                            {task.priority || 'Medium'}
                          </span>
                        </div>
                        {task.dueDate && (
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            Due: {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>

                      {status !== 'completed' && (
                        <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                          {status !== 'in_progress' && (
                            <button
                              onClick={() => handleUpdateStatus(task._id, 'in_progress')}
                              style={{
                                flex: 1,
                                padding: '6px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Start
                            </button>
                          )}
                          <button
                            onClick={() => handleUpdateStatus(task._id, 'completed')}
                            style={{
                              flex: 1,
                              padding: '6px',
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Complete
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
