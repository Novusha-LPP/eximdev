import React, { useState } from 'react';
import { TextField, Button, Chip, IconButton, Tooltip, Collapse } from '@mui/material';
import { Add, Delete, Check, Undo, ExpandMore, ExpandLess, QuestionAnswer } from '@mui/icons-material';

/**
 * Compact Reusable Queries Component
 * @param {Object} props
 * @param {Array} props.queries - Array of query objects
 * @param {Function} props.onQueriesChange - Callback when queries change
 * @param {String} props.title - Title for the queries section
 * @param {Array} props.modules - Available modules for selection
 * @param {Boolean} props.readOnlyReply - Whether reply field should be read-only
 * @param {Boolean} props.showResolveButton - Whether to show resolve button
 * @param {Function} props.onResolveQuery - Callback when query is resolved
 */
const QueriesComponent = ({
  queries = [],
  onQueriesChange,
  title = "Queries",
  modules = ["DSR", "DO", "Documentation", "E-Sanchit", "Submission", "Operations", "Accounts"],
  readOnlyReply = true,
  showResolveButton = true,
  onResolveQuery = null
}) => {

  const [expanded, setExpanded] = useState(false);

  // Update a specific query
  const updateQuery = (index, field, value) => {
    const updated = [...queries];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    onQueriesChange(updated);
  };

  // Add new query
  const addQuery = () => {
    const newQuery = {
      query: "",
      reply: "",
      select_module: "",
      resolved: false
    };
    onQueriesChange([...queries, newQuery]);
    setExpanded(true); // Auto expand when adding
  };

  // Remove query
  const removeQuery = (index) => {
    const updated = queries.filter((_, i) => i !== index);
    onQueriesChange(updated);
  };

  // Resolve query
  const resolveQuery = (index) => {
    const updated = [...queries];
    updated[index] = {
      ...updated[index],
      resolved: true
    };
    onQueriesChange(updated);
    
    if (onResolveQuery) {
      onResolveQuery(updated[index], index);
    }
  };

  // Unresolve query
  const unresolveQuery = (index) => {
    const updated = [...queries];
    updated[index] = {
      ...updated[index],
      resolved: false
    };
    onQueriesChange(updated);
  };

  const resolvedCount = queries.filter(q => q.resolved === true || (!!q.reply && q.reply.trim() !== "")).length;
  const pendingCount = queries.length - resolvedCount;

  return (
    <div style={{ 
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      backgroundColor: '#ffffff',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      {/* Compact Header - Fixed 60px height */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '12px 16px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          height: '60px',
          cursor: queries.length > 0 ? 'pointer' : 'default'
        }}
        onClick={() => queries.length > 0 && setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <QuestionAnswer style={{ fontSize: '20px', color: '#64748b' }} />
          <span style={{ 
            fontSize: '16px',
            fontWeight: '600',
            color: '#1e293b'
          }}>
            {title}
          </span>
          
          {queries.length > 0 && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <Chip 
                label={`${queries.length} total`}
                size="small"
                style={{ 
                  backgroundColor: '#e2e8f0',
                  color: '#64748b',
                  fontSize: '12px',
                  height: '24px'
                }}
              />
              {pendingCount > 0 && (
                <Chip 
                  label={`${pendingCount} pending`}
                  size="small"
                  style={{ 
                    backgroundColor: '#fef3c7',
                    color: '#d97706',
                    fontSize: '12px',
                    height: '24px'
                  }}
                />
              )}
              {resolvedCount > 0 && (
                <Chip 
                  label={`${resolvedCount} resolved`}
                  size="small"
                  style={{ 
                    backgroundColor: '#dcfce7',
                    color: '#16a34a',
                    fontSize: '12px',
                    height: '24px'
                  }}
                />
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Add />}
            onClick={(e) => {
              e.stopPropagation();
              addQuery();
            }}
            style={{
              borderRadius: '8px',
              textTransform: 'none',
              fontSize: '12px',
              padding: '4px 12px',
              height: '32px',
              borderColor: '#d1d5db',
              color: '#374151'
            }}
          >
            Add
          </Button>
          
          {queries.length > 0 && (
            <IconButton 
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(!expanded);
              }}
              style={{ color: '#64748b' }}
            >
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
        </div>
      </div>

      {/* Expandable Content */}
      <Collapse in={expanded && queries.length > 0}>
        <div style={{ 
          maxHeight: '400px', 
          overflowY: 'auto',
          padding: '16px'
        }}>
          {queries.map((item, index) => {
            const isResolved = item.resolved === true || (!!item.reply && item.reply.trim() !== "");

            return (
              <div 
                key={index}
                style={{
                  padding: '16px',
                  marginBottom: '12px',
                  border: isResolved ? '1px solid #22c55e' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  backgroundColor: isResolved ? '#f0fdf4' : '#ffffff',
                  position: 'relative'
                }}
              >
                {isResolved && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    backgroundColor: '#22c55e',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Check style={{ color: 'white', fontSize: '12px' }} />
                  </div>
                )}

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr auto auto', 
                  gap: '12px',
                  alignItems: 'start'
                }}>
                  {/* Query Field */}
                  <TextField
                    multiline
                    rows={1}
                    size="small"
                    label="Query"
                    value={item.query}
                    onChange={(e) => updateQuery(index, 'query', e.target.value)}
                    disabled={isResolved}
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: '14px',
                        borderRadius: '6px'
                      }
                    }}
                  />

                  {/* Reply Field */}
                  <TextField
                    multiline
                    rows={1}
                    size="small"
                    label="Reply"
                    value={item.reply}
                    onChange={(e) => updateQuery(index, 'reply', e.target.value)}
                    InputProps={{ readOnly: readOnlyReply }}
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: '14px',
                        borderRadius: '6px'
                      }
                    }}
                  />

                  {/* Module Selection */}
                  <TextField
                    select
                    size="small"
                    value={item.select_module || ""}
                    onChange={(e) => updateQuery(index, 'select_module', e.target.value)}
                    disabled={isResolved}
                    SelectProps={{ native: true }}
                    variant="outlined"
                    style={{ minWidth: '120px' }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        fontSize: '14px',
                        borderRadius: '6px'
                      }
                    }}
                  >
                    <option value="">Select</option>
                    {modules.map(module => (
                      <option key={module} value={module}>{module}</option>
                    ))}
                  </TextField>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {isResolved ? (
                      showResolveButton && (
                        <Tooltip title="Reopen">
                          <IconButton
                            size="small"
                            onClick={() => unresolveQuery(index)}
                            style={{ color: '#f59e0b' }}
                          >
                            <Undo fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )
                    ) : (
                      showResolveButton && (
                        <Tooltip title="Resolve">
                          <IconButton
                            size="small"
                            onClick={() => resolveQuery(index)}
                            disabled={!item.query.trim()}
                            style={{ color: '#22c55e' }}
                          >
                            <Check fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )
                    )}
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => removeQuery(index)}
                        style={{ color: '#ef4444' }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Collapse>

      {/* Empty State - Only shown when no queries and collapsed */}
      {queries.length === 0 && (
        <div style={{ 
          padding: '20px',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '14px'
        }}>
          No queries yet. Click "Add" to create your first query.
        </div>
      )}
    </div>
  );
};

export default QueriesComponent;