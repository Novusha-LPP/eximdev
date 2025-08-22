import React, { useState, useCallback, useMemo } from "react";
import {
  TextField,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
} from "@mui/material";
import {
  Add,
  Delete,
  Check,
  Undo,
  ExpandMore,
  ExpandLess,
  QuestionAnswer,
} from "@mui/icons-material";

/**
 * Enhanced Compact Reusable Queries Component
 * @param {Object} props
 * @param {Array} props.queries - Array of query objects
 * @param {Function} props.onQueriesChange - Callback when queries change
 * @param {String} props.title - Title for the queries section
 * @param {Array} props.modules - Available modules for selection
 * @param {Boolean} props.readOnlyReply - Whether reply field should be read-only
 * @param {Boolean} props.showResolveButton - Whether to show resolve button
 * @param {Function} props.onResolveQuery - Callback when query is resolved
 * @param {String} props.currentModule - Current module name to track query source
 * @param {String} props.userName - Current Username name to track query source
 */
const QueriesComponent = ({
  queries = [],
  onQueriesChange,
  title = "Queries",
  modules = [
    "DSR",
    "DO",
    "Documentation",
    "E-Sanchit",
    "Submission",
    "Operations",
    "Accounts",
  ],
  readOnlyReply = false,
  showResolveButton = true,
  onResolveQuery = null,
  currentModule = "DSR", // New prop to track current module
  userName = "",
}) => {
  const [expanded, setExpanded] = useState(false);

  // Debounced update function to reduce re-renders
  const debouncedUpdate = useCallback(
    (updatedQueries) => {
      onQueriesChange(updatedQueries);
    },
    [onQueriesChange]
  );

  // Update a specific query with optimized performance
  const updateQuery = useCallback(
    (index, field, value) => {
      const updated = [...queries];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      debouncedUpdate(updated);
    },
    [queries, debouncedUpdate]
  );

  // Add new query with source module tracking
  const addQuery = useCallback(() => {
    const newQuery = {
      query: "",
      reply: "",
      select_module: "",
      current_module: currentModule, // Track where the query originated from
      resolved: false,
      created_at: new Date().toISOString(),
    };
    debouncedUpdate([...queries, newQuery]);
    setExpanded(true); // Auto expand when adding
  }, [queries, currentModule, debouncedUpdate]);

  // Remove query
  const removeQuery = useCallback(
    (index) => {
      const updated = queries.filter((_, i) => i !== index);
      debouncedUpdate(updated);
    },
    [queries, debouncedUpdate]
  );

  // Resolve query - only when explicitly called
  const resolveQuery = useCallback(
    (index) => {
      const updated = [...queries];
      updated[index] = {
        ...updated[index],
        resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: userName || "Unknown", // <-- track resolver
      };
      debouncedUpdate(updated);

      if (onResolveQuery) {
        onResolveQuery(updated[index], index);
      }
    },
    [queries, onResolveQuery, debouncedUpdate, userName]
  );
  // Unresolve query
  const unresolveQuery = useCallback(
    (index) => {
      const updated = [...queries];
      updated[index] = {
        ...updated[index],
        resolved: false,
        resolved_at: null,
      };
      debouncedUpdate(updated);
    },
    [queries, debouncedUpdate]
  );

  // Memoized calculations for performance
  const { resolvedCount, pendingCount } = useMemo(() => {
    const resolved = queries.filter((q) => q.resolved === true).length;
    const pending = queries.length - resolved;
    return { resolvedCount: resolved, pendingCount: pending };
  }, [queries]);

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "12px",
        backgroundColor: "#ffffff",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        margin: "20px 0",
      }}
    >
      {/* Compact Header - Fixed 60px height */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          backgroundColor: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          height: "60px",
          cursor: queries.length > 0 ? "pointer" : "default",
        }}
        onClick={() => queries.length > 0 && setExpanded(!expanded)}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flex: 1,
          }}
        >
          <QuestionAnswer style={{ fontSize: "20px", color: "#64748b" }} />
          <span
            style={{
              fontSize: "16px",
              fontWeight: "600",
              color: "#1e293b",
            }}
          >
            {title}
          </span>

          {queries.length > 0 && (
            <div style={{ display: "flex", gap: "6px" }}>
              <Chip
                label={`${queries.length} total`}
                size="small"
                style={{
                  backgroundColor: "#e2e8f0",
                  color: "#64748b",
                  fontSize: "12px",
                  height: "24px",
                }}
              />
              {pendingCount > 0 && (
                <Chip
                  label={`${pendingCount} pending`}
                  size="small"
                  style={{
                    backgroundColor: "#fef3c7",
                    color: "#d97706",
                    fontSize: "12px",
                    height: "24px",
                  }}
                />
              )}
              {resolvedCount > 0 && (
                <Chip
                  label={`${resolvedCount} resolved`}
                  size="small"
                  style={{
                    backgroundColor: "#dcfce7",
                    color: "#16a34a",
                    fontSize: "12px",
                    height: "24px",
                  }}
                />
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Add />}
            onClick={(e) => {
              e.stopPropagation();
              addQuery();
            }}
            style={{
              borderRadius: "8px",
              textTransform: "none",
              fontSize: "12px",
              padding: "4px 12px",
              height: "32px",
              borderColor: "#d1d5db",
              color: "#374151",
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
              style={{ color: "#64748b" }}
            >
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
        </div>
      </div>

      {/* Expandable Content */}
      <Collapse in={expanded && queries.length > 0}>
        <div
          style={{
            maxHeight: "400px",
            overflowY: "auto",
            padding: "16px",
          }}
        >
          {queries.map((item, index) => {
            const isResolved = item.resolved === true;

            return (
              <div
                key={index}
                style={{
                  padding: "16px",
                  marginBottom: "12px",
                  border: isResolved
                    ? "1px solid #22c55e"
                    : "1px solid #e2e8f0",
                  borderRadius: "8px",
                  backgroundColor: isResolved ? "#f0fdf4" : "#ffffff",
                  position: "relative",
                }}
              >
                {isResolved && (
                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      backgroundColor: "#22c55e",
                      borderRadius: "50%",
                      width: "20px",
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check style={{ color: "white", fontSize: "12px" }} />
                  </div>
                )}

                {/* Source Module Indicator */}
                {item.current_module && (
                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      left: "8px",
                      backgroundColor: "#3b82f6",
                      color: "white",
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontWeight: "500",
                    }}
                  >
                    From: {item.current_module}
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 120px auto",
                    gap: "12px",
                    alignItems: "start",
                    marginTop: item.current_module ? "20px" : "0",
                  }}
                >
                  {/* Query Field */}
                  <TextField
                    multiline
                    rows={1}
                    size="small"
                    label="Query"
                    value={item.query}
                    onChange={(e) =>
                      updateQuery(index, "query", e.target.value)
                    }
                    disabled={isResolved}
                    variant="outlined"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        fontSize: "14px",
                        borderRadius: "6px",
                      },
                    }}
                  />

                  {/* Reply Field - Optimized for better performance */}
                  <TextField
                    multiline
                    rows={1}
                    size="small"
                    label="Reply"
                    value={item.reply || ""}
                    onChange={(e) => {
                      // Direct update without auto-resolve
                      updateQuery(index, "reply", e.target.value);
                    }}
                    InputProps={{
                      readOnly: readOnlyReply,
                      style: { transition: "none" }, // Remove transitions for faster typing
                    }}
                    variant="outlined"
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        fontSize: "14px",
                        borderRadius: "6px",
                      },
                      "& .MuiInputBase-input": {
                        transition: "none !important", // Remove input transitions
                      },
                    }}
                  />

                  {/* Module Selection with Actions in horizontal layout */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <TextField
                      select
                      size="small"
                      value={item.select_module || ""}
                      onChange={(e) =>
                        updateQuery(index, "select_module", e.target.value)
                      }
                      disabled={isResolved}
                      SelectProps={{ native: true }}
                      variant="outlined"
                      style={{ minWidth: "80px", flex: 1 }}
                      sx={{
                        "& .MuiOutlinedInput-root": {
                          fontSize: "14px",
                          borderRadius: "6px",
                        },
                      }}
                    >
                      <option value="">Select</option>
                      {modules.map((module) => (
                        <option key={module} value={module}>
                          {module}
                        </option>
                      ))}
                    </TextField>
                  </div>

                  {/* Actions - Now horizontal */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {isResolved
                      ? showResolveButton && (
                          <Tooltip title="Reopen">
                            <IconButton
                              size="small"
                              onClick={() => unresolveQuery(index)}
                              style={{ color: "#f59e0b" }}
                            >
                              <Undo fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )
                      : showResolveButton && (
                          <Tooltip title="Mark as Resolved">
                            <IconButton
                              size="small"
                              onClick={() => resolveQuery(index)}
                              disabled={!item.query.trim()}
                              style={{ color: "#22c55e" }}
                            >
                              <Check fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                    <Tooltip title="Delete Query">
                      <IconButton
                        size="small"
                        onClick={() => removeQuery(index)}
                        style={{ color: "#ef4444" }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </div>
                </div>

                {/* Query metadata for debugging/tracking */}
                {item.created_at && (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#94a3b8",
                      marginTop: "8px",
                      display: "flex",
                      gap: "16px",
                    }}
                  >
                    <span>
                      Created: {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Source Module Indicator (left corner) */}
                {item.current_module && (
                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      left: "8px",
                      backgroundColor: "#3b82f6",
                      color: "white",
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontWeight: "500",
                    }}
                  >
                    From: {item.current_module}
                  </div>
                )}

                {/* Resolved By Username (right corner) */}
                {item.resolved && item.resolved_by && (
                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      backgroundColor: "#16a34a", // green background
                      color: "white",
                      fontSize: "10px",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontWeight: "500",
                    }}
                  >
                    By: {item.resolved_by}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Collapse>

      {/* Empty State - Only shown when no queries and collapsed */}
      {queries.length === 0 && (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            color: "#64748b",
            fontSize: "14px",
          }}
        >
          No queries yet. Click "Add" to create your first query.
        </div>
      )}
    </div>
  );
};

export default QueriesComponent;
