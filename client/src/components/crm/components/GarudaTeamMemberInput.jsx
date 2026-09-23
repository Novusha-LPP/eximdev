import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { Search, X, ChevronDown, Check } from 'lucide-react';

export default function GarudaTeamMemberInput({
  value,
  onChange,
  required = true,
  placeholder = "Search or enter Garuda team member name...",
  style = {}
}) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Fetch users on mount
  useEffect(() => {
    let isMounted = true;
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const user = JSON.parse(localStorage.getItem('exim_user') || '{}');
        const res = await axios.get(`${process.env.REACT_APP_API_STRING}/get-all-users`, {
          headers: {
            'Content-Type': 'application/json',
            'user-id': user._id || user.id || '',
            'username': user.username || '',
            'user-role': user.role || '',
          },
          withCredentials: true
        });

        const rawList = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : [];

        if (isMounted) {
          setUsers(rawList);
        }
      } catch (err) {
        console.error('Failed to load Garuda users list:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  // Format and deduplicate options
  const formattedUsers = useMemo(() => {
    const list = (users || []).map((u) => {
      const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim();
      const displayName = fullName || u.username || '';
      return {
        _id: u._id,
        displayName,
        username: u.username || '',
        department: u.department || '',
        designation: u.designation || '',
        employeeCode: u.employee_code || '',
        searchStr: `${displayName} ${u.username || ''} ${u.department || ''} ${u.employee_code || ''} ${u.designation || ''}`.toLowerCase(),
      };
    }).filter((u) => u.displayName);

    const seen = new Set();
    const unique = [];
    for (const item of list) {
      const key = item.displayName.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    return unique.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [users]);

  // Filter based on input value
  const query = (value || '').trim().toLowerCase();
  const filteredUsers = useMemo(() => {
    if (!query) return formattedUsers;
    return formattedUsers.filter((u) => u.searchStr.includes(query));
  }, [formattedUsers, query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('.garuda-user-item');
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (displayName) => {
    onChange(displayName);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev < filteredUsers.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : filteredUsers.length - 1));
      }
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && filteredUsers[highlightedIndex]) {
        e.preventDefault();
        handleSelect(filteredUsers[highlightedIndex].displayName);
      } else {
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', ...style }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="text"
          required={required}
          value={value || ''}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            padding: '10px 65px 10px 36px',
            borderRadius: '8px',
            border: isOpen ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
            outline: 'none',
            fontSize: '0.95rem',
            color: '#1e293b',
            background: '#ffffff',
            boxShadow: isOpen ? '0 0 0 3px rgba(59, 130, 246, 0.12)' : 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        />

        {/* Leading Search Icon */}
        <Search
          size={16}
          style={{
            position: 'absolute',
            left: '12px',
            color: '#94a3b8',
            pointerEvents: 'none',
          }}
        />

        {/* Trailing Controls: Clear and Dropdown Arrow */}
        <div style={{ position: 'absolute', right: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {value ? (
            <button
              type="button"
              onClick={handleClear}
              title="Clear selection"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                color: '#94a3b8',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
            >
              <X size={15} />
            </button>
          ) : null}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen((prev) => !prev);
              inputRef.current?.focus();
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease',
            }}
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={listRef}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 1000,
            background: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
            maxHeight: '260px',
            overflowY: 'auto',
          }}
        >
          {loading && formattedUsers.length === 0 ? (
            <div style={{ padding: '14px 16px', color: '#64748b', fontSize: '0.875rem', textAlign: 'center' }}>
              Loading Garuda team members...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: '14px 16px' }}>
              <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '8px' }}>
                No Garuda team member found matching "<strong>{value}</strong>"
              </div>
              <div
                onClick={() => setIsOpen(false)}
                style={{
                  fontSize: '0.8rem',
                  color: '#2563eb',
                  background: '#eff6ff',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'inline-block',
                }}
              >
                ✓ Use "{value}" as manual entry
              </div>
            </div>
          ) : (
            <>
              <div
                style={{
                  padding: '6px 12px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  background: '#f8fafc',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>Garuda Team Members ({filteredUsers.length})</span>
                <span>Click to select</span>
              </div>
              {filteredUsers.map((member, index) => {
                const isSelected = value && member.displayName.toLowerCase() === value.trim().toLowerCase();
                const isHighlighted = highlightedIndex === index;

                return (
                  <div
                    key={member._id || member.displayName}
                    className="garuda-user-item"
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => handleSelect(member.displayName)}
                    style={{
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f8fafc',
                      background: isSelected
                        ? '#eff6ff'
                        : isHighlighted
                        ? '#f1f5f9'
                        : '#ffffff',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: isSelected ? '#dbeafe' : '#f1f5f9',
                          color: isSelected ? '#1d4ed8' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {member.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>
                            {member.displayName}
                          </span>
                          {member.username && member.displayName !== member.username && (
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              (@{member.username})
                            </span>
                          )}
                        </div>
                        {(member.department || member.designation || member.employeeCode) && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>
                            {[member.department, member.designation, member.employeeCode].filter(Boolean).join(' • ')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {member.department && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            color: '#4f46e5',
                            background: '#eef2ff',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: 600,
                          }}
                        >
                          {member.department}
                        </span>
                      )}
                      {isSelected && <Check size={16} color="#2563eb" />}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
