import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Typography,
  Box,
  CircularProgress
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import HistoryIcon from "@mui/icons-material/History";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const DUTY_HEAD_COLORS = {
  BCD: { bg: "#dbeafe", color: "#1e40af" },
  IGST: { bg: "#f3e8ff", color: "#6b21a8" },
  SWS: { bg: "#fef3c7", color: "#92400e" },
  CAIDC: { bg: "#d1fae5", color: "#065f46" },
  EAIDC: { bg: "#ccfbf1", color: "#115e59" },
  "INFRA CES": { bg: "#ffedd5", color: "#9a3412" },
  "PETR CUS": { bg: "#fee2e2", color: "#991b1b" },
  ADD: { bg: "#fae8ff", color: "#86198f" },
  CVD_05: { bg: "#e0e7ff", color: "#3730a3" },
  CHCESS: { bg: "#e2e8f0", color: "#334155" }
};

export default function NotificationTable({
  items = [],
  loading = false,
  onEdit,
  onDelete,
  onViewHistory
}) {
  if (loading) {
    return (
      <Box sx={{ p: 6, display: "flex", justifyContent: "center", alignItems: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (items.length === 0) {
    return (
      <Paper elevation={0} sx={{ p: 5, textAlign: "center", border: "1px dashed #cbd5e1", borderRadius: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: "#64748b" }}>
          No notification records found matching your filters.
        </Typography>
        <Typography variant="body2" sx={{ color: "#94a3b8", mt: 0.5 }}>
          Upload a Bill of Entry or click "Add Notification" to create a new rule.
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid #cbd5e1", borderRadius: 2 }}>
      <Table size="small" sx={{ minWidth: 800 }}>
        <TableHead sx={{ background: "#f1f5f9" }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, color: "#334155" }}>Notification No</TableCell>
            <TableCell sx={{ fontWeight: 700, color: "#334155" }}>Sr No</TableCell>
            <TableCell sx={{ fontWeight: 700, color: "#334155" }}>Duty Head</TableCell>
            <TableCell sx={{ fontWeight: 700, color: "#334155" }}>CTH / Tariff</TableCell>
            <TableCell sx={{ fontWeight: 700, color: "#334155", textAlign: "center" }}>Rate</TableCell>
            <TableCell sx={{ fontWeight: 700, color: "#334155" }}>Flag / COO</TableCell>
            <TableCell sx={{ fontWeight: 700, color: "#334155" }}>Status / Health</TableCell>
            <TableCell sx={{ fontWeight: 700, color: "#334155", textAlign: "center" }}>Usage</TableCell>
            <TableCell sx={{ fontWeight: 700, color: "#334155", textAlign: "center" }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((row) => {
            const headColor = DUTY_HEAD_COLORS[row.duty_head] || { bg: "#f1f5f9", color: "#334155" };
            const hasVariance = row.has_rate_variance;
            const historyCount = row.rate_history?.length || 1;

            return (
              <TableRow
                key={row._id}
                hover
                sx={{
                  background: hasVariance ? "#fffdf5" : "inherit",
                  "&:last-child td, &:last-child th": { border: 0 }
                }}
              >
                {/* Notification No */}
                <TableCell sx={{ fontWeight: 700, color: "#0f172a" }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {row.notn_no}
                  </Typography>
                  {row.description && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#64748b",
                        display: "-webkit-box",
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        maxWidth: 220
                      }}
                    >
                      {row.description}
                    </Typography>
                  )}
                </TableCell>

                {/* Serial No */}
                <TableCell sx={{ fontWeight: 600, color: "#475569" }}>
                  {row.notn_sno || "N/A"}
                </TableCell>

                {/* Duty Head */}
                <TableCell>
                  <Chip
                    label={row.duty_head}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      fontSize: "11px",
                      background: headColor.bg,
                      color: headColor.color
                    }}
                  />
                </TableCell>

                {/* CTH Code */}
                <TableCell sx={{ fontFamily: "monospace", fontWeight: 600, color: "#334155" }}>
                  {row.cth_code || "ALL"}
                </TableCell>

                {/* Rate */}
                <TableCell sx={{ textAlign: "center", fontWeight: 800, color: "#1d4ed8", fontSize: "0.95rem" }}>
                  {row.current_rate}{row.unit || "%"}
                </TableCell>

                {/* Duty Flag / COO */}
                <TableCell>
                  <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                    {row.current_duty_flag && (
                      <Chip label={`Flag: ${row.current_duty_flag}`} size="small" variant="outlined" sx={{ height: 20, fontSize: "10px" }} />
                    )}
                    {row.coo && row.coo !== "ALL" && (
                      <Chip label={`COO: ${row.coo}`} size="small" color="secondary" variant="outlined" sx={{ height: 20, fontSize: "10px" }} />
                    )}
                  </Box>
                </TableCell>

                {/* Status / Health */}
                <TableCell>
                  {hasVariance ? (
                    <Tooltip title="Multiple different rates detected for this notification. Click History to review & resolve." arrow>
                      <Chip
                        icon={<WarningAmberIcon sx={{ fontSize: "14px !important" }} />}
                        label="⚡ Rate Variance"
                        size="small"
                        color="warning"
                        onClick={() => onViewHistory(row)}
                        sx={{ fontWeight: 700, cursor: "pointer", fontSize: "11px" }}
                      />
                    </Tooltip>
                  ) : historyCount > 1 ? (
                    <Chip
                      icon={<CheckCircleIcon sx={{ fontSize: "14px !important" }} />}
                      label={`Amended (${historyCount} rates)`}
                      size="small"
                      color="info"
                      onClick={() => onViewHistory(row)}
                      sx={{ fontWeight: 600, cursor: "pointer", fontSize: "11px" }}
                    />
                  ) : (
                    <Chip
                      label="🟢 Stable"
                      size="small"
                      sx={{ fontWeight: 600, background: "#dcfce7", color: "#15803d", fontSize: "11px" }}
                    />
                  )}
                </TableCell>

                {/* Usage Count */}
                <TableCell sx={{ textAlign: "center" }}>
                  <Tooltip title={`Used in ${row.usage_count || 0} shipments / BOE items`} arrow>
                    <Chip
                      label={`${row.usage_count || 0} jobs`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: "11px", fontWeight: 600 }}
                    />
                  </Tooltip>
                </TableCell>

                {/* Actions */}
                <TableCell sx={{ textAlign: "center" }}>
                  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <Tooltip title="View Rate History & Timeline" arrow>
                      <IconButton size="small" color="primary" onClick={() => onViewHistory(row)}>
                        <HistoryIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Notification" arrow>
                      <IconButton size="small" color="default" onClick={() => onEdit(row)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete" arrow>
                      <IconButton size="small" color="error" onClick={() => onDelete(row)}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
