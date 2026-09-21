import React, { useState, useEffect, useRef } from 'react';

/**
 * CrmFilterAutocomplete
 * Searchable autocomplete filter component that only suggests existing records.
 * Allows custom input or clicking from existing options.
 */
export default function CrmFilterAutocomplete({
  placeholder,
  value,
  onChange,
  options = [],
  loading = false,
  icon = '📍',
  label,
  primary = false,
  width = '190px'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Filter options based on user input
  const query = (value || '').trim().toLowerCase();
  const filteredOptions = options.filter(opt => {
    if (!query) return true;
    return String(opt).toLowerCase().includes(query);
  });

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1 < filteredOptions.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev - 1 >= 0 ? prev - 1 : filteredOptions.length - 1));
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        e.preventDefault();
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: label ? '6px' : '0'
      }}
    >
      {label && (
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: primary ? 800 : 700,
            color: primary ? '#0369a1' : '#64748b',
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            userSelect: 'none',
            whiteSpace: 'nowrap'
          }}
        >
          {icon} {label}:
        </span>
      )}

      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={e => {
            onChange(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          style={{
            padding: '8px 26px 8px 12px',
            border: value
              ? primary ? '1.5px solid #0284c7' : '1.5px solid #6366f1'
              : primary ? '1.5px solid #38bdf8' : '1px solid #e2e8f0',
            background: value
              ? primary ? '#f0f9ff' : '#eef2ff'
              : primary ? '#f0f9ff' : '#ffffff',
            borderRadius: '10px',
            fontSize: '0.85rem',
            color: primary ? '#0369a1' : '#334155',
            fontWeight: 600,
            outline: 'none',
            width: width,
            boxShadow: primary
              ? value ? '0 0 0 2px rgba(2, 132, 199, 0.15)' : '0 1px 2px rgba(56, 189, 248, 0.15)'
              : 'none',
            transition: 'all 0.2s ease'
          }}
        />

        {value ? (
          <button
            type="button"
            onClick={handleClear}
            title="Clear"
            style={{
              position: 'absolute',
              right: '6px',
              background: 'none',
              border: 'none',
              color: primary ? '#0284c7' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%'
            }}
          >
            ✕
          </button>
        ) : (
          <span
            style={{
              position: 'absolute',
              right: '8px',
              pointerEvents: 'none',
              fontSize: '10px',
              color: primary ? '#38bdf8' : '#cbd5e1'
            }}
          >
            ▼
          </span>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: label ? 'auto' : 0,
            right: 0,
            minWidth: width,
            maxWidth: '300px',
            maxHeight: '220px',
            overflowY: 'auto',
            background: '#ffffff',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            zIndex: 9999,
            padding: '4px'
          }}
        >
          {loading ? (
            <div style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
              ⏳ Loading suggestions...
            </div>
          ) : filteredOptions.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
              {options.length === 0 ? 'No existing records found' : 'No matching records found'}
            </div>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isHighlighted = idx === highlightedIndex;
              const isSelected = String(opt).toLowerCase() === query;
              return (
                <div
                  key={opt + '-' + idx}
                  onClick={() => handleSelect(opt)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    background: isSelected
                      ? primary ? '#e0f2fe' : '#e0e7ff'
                      : isHighlighted
                        ? '#f8fafc'
                        : 'transparent',
                    color: isSelected
                      ? primary ? '#0369a1' : '#4338ca'
                      : '#334155',
                    fontWeight: isSelected ? 700 : 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background 0.1s ease',
                    wordBreak: 'break-word'
                  }}
                >
                  <span>{opt}</span>
                  {isSelected && <span style={{ fontSize: '10px', color: primary ? '#0284c7' : '#4f46e5' }}>✓</span>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
