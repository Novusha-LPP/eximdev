import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Search, User, Check, Plus } from 'lucide-react';
import { message } from 'antd';

export default function TaskFormModal({ isOpen, onClose, onRefresh, task }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'open',
    priority: 'medium',
    dueDate: '',
    assignedTo: '', // This will store the ID
    reminder: false
  });
  
  const [users, setUsers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-all-users`, { withCredentials: true });
      setUsers(res.data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  useEffect(() => {
    if (task) {
      setFormData({
        ...task,
        assignedTo: task.assignedTo?._id || task.assignedTo || '',
        reminder: !!task.reminder
      });
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'open',
        priority: 'medium',
        dueDate: '',
        assignedTo: '',
        reminder: false
      });
      setUserSearch('');
    }
  }, [task, isOpen]);

  // Sync search text when users load or assignedTo changes
  useEffect(() => {
    if (formData.assignedTo && users.length > 0) {
      const user = users.find(u => (u._id || u.id)?.toString() === formData.assignedTo.toString());
      if (user) {
        setUserSearch(getDisplayName(user));
      }
    }
  }, [formData.assignedTo, users]);

  const filteredUsers = users.filter(u => {
    const search = userSearch.toLowerCase();
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    return (
      u.username?.toLowerCase().includes(search) ||
      fullName.includes(search) ||
      u.email?.toLowerCase().includes(search)
    );
  });

  const getDisplayName = (user) => {
    if (!user) return '';
    return user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username;
  };

  const currentAssignee = users.find(u => (u._id || u.id)?.toString() === formData.assignedTo);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.assignedTo) {
      return message.error('Please assign this task to a user');
    }
    
    setIsSubmitting(true);
    try {
      const dataToSubmit = {
        ...formData,
        reminder: formData.reminder ? (formData.dueDate || new Date()) : null
      };

      if (task?._id) {
        await axios.put(`${process.env.REACT_APP_API_STRING}/crm/tasks/${task._id}`, dataToSubmit, { withCredentials: true });
        message.success('Task updated successfully');
      } else {
        await axios.post(`${process.env.REACT_APP_API_STRING}/crm/tasks`, dataToSubmit, { withCredentials: true });
        message.success('Task created successfully');
      }
      onRefresh();
      onClose();
    } catch (error) {
      message.error('Error: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, padding: '20px'
    }}>
      <div style={{
        background: '#fff', width: '100%', maxWidth: '540px',
        borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        position: 'relative', display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', 
          justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc',
          borderTopLeftRadius: '20px', borderTopRightRadius: '20px'
        }}>
          <div>
            <h3 style={{ margin: 0, color: '#0f172a', fontWeight: 800, fontSize: '1.25rem' }}>
              {task ? 'Edit Task Details' : 'Create New Task'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              {task ? 'Update the assignment and schedule' : 'Assign activities to your team members'}
            </p>
          </div>
          <button onClick={onClose} style={{ 
            background: '#fff', border: '1px solid #e2e8f0', cursor: 'pointer', 
            color: '#64748b', borderRadius: '10px', padding: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s'
          }} onMouseEnter={e => e.currentTarget.style.borderColor = '#cbd5e1'} onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Title */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#334155', fontWeight: 700, fontSize: '0.875rem' }}>TASK TITLE <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="text" required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="What needs to be done?"
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.95rem', transition: 'all 0.2s', outline: 'none', background: '#fbfcfd' }}
              onFocus={e => e.currentTarget.style.borderColor = '#4f46e5'}
              onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#334155', fontWeight: 700, fontSize: '0.875rem' }}>DESCRIPTION</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add specific context or instructions..."
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.95rem', minHeight: '100px', fontFamily: 'inherit', resize: 'vertical', transition: 'all 0.2s', outline: 'none', background: '#fbfcfd' }}
              onFocus={e => e.currentTarget.style.borderColor = '#4f46e5'}
              onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Status */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#334155', fontWeight: 700, fontSize: '0.875rem' }}>STATUS</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.95rem', background: '#fbfcfd', outline: 'none', cursor: 'pointer' }}
              >
                <option value="open">Opened</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            {/* Priority */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#334155', fontWeight: 700, fontSize: '0.875rem' }}>PRIORITY</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.95rem', background: '#fbfcfd', outline: 'none', cursor: 'pointer' }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Due Date */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: '#334155', fontWeight: 700, fontSize: '0.875rem' }}>DUE DATE</label>
              <input
                type="date"
                value={formData.dueDate ? formData.dueDate.substring(0, 10) : ''}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                style={{ width: '100%', padding: '12px 16px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.95rem', background: '#fbfcfd', outline: 'none' }}
              />
            </div>
            
            {/* Assigned To - Searchable Dropdown */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#334155', fontWeight: 700, fontSize: '0.875rem' }}>ASSIGNED TO <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search teammate..."
                  value={userSearch}
                  onChange={e => {
                    setUserSearch(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  style={{ width: '100%', padding: '12px 16px 12px 40px', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '0.95rem', outline: 'none', background: '#fbfcfd' }}
                />
                <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>

              {isDropdownOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 100,
                  border: '1px solid #e2e8f0', borderRadius: '12px', maxHeight: '200px',
                  overflowY: 'auto', background: '#fff', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)'
                }}>
                  {filteredUsers.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>No matching teammates</div>
                  ) : filteredUsers.map(user => {
                    const userId = (user._id || user.id)?.toString();
                    const isSelected = formData.assignedTo === userId;
                    return (
                      <div
                        key={userId}
                        onClick={() => {
                          setFormData({ ...formData, assignedTo: userId });
                          setUserSearch(getDisplayName(user));
                          setIsDropdownOpen(false);
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                          background: isSelected ? '#f1f5f9' : 'transparent',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#f1f5f9' : 'transparent'; }}
                      >
                        <div style={{ 
                          width: '32px', height: '32px', borderRadius: '50%', 
                          background: isSelected ? '#4f46e5' : '#e2e8f0',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSelected ? '#fff' : '#64748b'
                        }}>
                          <User size={16} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>{getDisplayName(user)}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{user.role || 'Sales Representative'}</div>
                        </div>
                        {isSelected && <Check size={16} style={{ color: '#4f46e5' }} />}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {isDropdownOpen && (
                <div 
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                  onClick={() => setIsDropdownOpen(false)}
                />
              )}
            </div>
          </div>

          <div style={{ 
            marginTop: '10px', padding: '16px', background: '#f8fafc', 
            borderRadius: '12px', border: '1px solid #e2e8f0',
            display: 'flex', alignItems: 'center', gap: '12px' 
          }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="checkbox" id="reminder"
                checked={formData.reminder}
                onChange={(e) => setFormData({ ...formData, reminder: e.target.checked })}
                style={{ 
                  width: '20px', height: '20px', cursor: 'pointer', accentColor: '#4f46e5',
                  borderRadius: '6px'
                }}
              />
            </div>
            <label htmlFor="reminder" style={{ color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', flex: 1 }}>
              Set a reminder notification for this task's due date
            </label>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ 
                padding: '12px 24px', border: '1px solid #e2e8f0', background: 'white', 
                borderRadius: '12px', cursor: 'pointer', fontWeight: 700, color: '#64748b',
                fontSize: '0.95rem', transition: 'all 0.2s'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ 
                padding: '12px 32px', background: '#4f46e5', color: 'white', 
                border: 'none', borderRadius: '12px', cursor: 'pointer', 
                fontWeight: 700, fontSize: '0.95rem', opacity: isSubmitting ? 0.6 : 1,
                boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.4)',
                display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
              }}
              onMouseEnter={e => { if(!isSubmitting) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {isSubmitting ? (
                <>⏳ Processing...</>
              ) : (
                <> {task ? <Check size={18} /> : <Plus size={18} />} {task ? 'Update Task' : 'Create Task'} </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
