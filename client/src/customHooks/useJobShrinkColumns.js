import React, { useMemo, useCallback } from "react";
import { Typography, Chip, IconButton, Box } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import axios from "axios";
import { getLatestJobDate } from "../utils/getLatestJobDate";
import { getTableRowInlineStyle } from "../utils/getTableRowsClassname";

function useJobShrinkColumns(
  handleRowDataUpdate,
  onRowUpdate,
  setRows,
  invalidateCache,
  selectedYear,
  clientQueriesStatus = {},
  handleRedClick = () => {},
  handleYellowClick = () => {},
  handleResolveOpenQuery = () => {},
  handleOpenQueryChat = () => {}
) {
  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return "";
    const s = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  }, []);

  const columns = useMemo(
    () => [
      {
        accessorKey: "job_no",
        header: "Job No",
        size: 230,
        muiTableHeadCellProps: { align: "center" },
        muiTableBodyCellProps: { sx: { verticalAlign: "top", textAlign: "center" } },
        Cell: ({ row }) => {
          const original = row.original;
          const {
            job_no,
            year,
            job_number,
            branch_code,
            trade_type,
            type_of_b_e,
            consignment_type,
            custom_house,
            detailed_status,
            vessel_berthing,
          } = original;

          let bgColor = "";
          let textColor = "#2563eb";
          const currentDate = new Date();

          const calculateDaysDifference = (targetDate) => {
            const date = new Date(targetDate);
            const timeDifference = date.getTime() - currentDate.getTime();
            return Math.ceil(timeDifference / (1000 * 3600 * 24));
          };

          if (detailed_status === "Estimated Time of Arrival") {
            const daysDifference = calculateDaysDifference(vessel_berthing);
            if (daysDifference >= 0) {
              if (daysDifference === 0) {
                bgColor = "#ff1111";
                textColor = "white";
              } else if (daysDifference <= 2) {
                bgColor = "#f85a5a";
                textColor = "black";
              } else if (daysDifference <= 5) {
                bgColor = "#fd8e8e";
                textColor = "black";
              }
            }
          }

          const handleRefresh = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
              const res = await axios.get(
                `${process.env.REACT_APP_API_STRING}/get-job/${original.branch_code}/${original.trade_type}/${original.mode}/${year}/${job_no}`
              );
              const updatedJob = res.data;
              setRows((prev) =>
                prev.map((r) =>
                  (r._id && updatedJob._id && r._id === updatedJob._id) ||
                  (!r._id && r.job_no === updatedJob.job_no && r.year === updatedJob.year)
                    ? { ...r, ...updatedJob }
                    : r
                )
              );
            } catch (err) {
              console.error("Error refreshing job:", err);
            }
          };

          const queryStat = clientQueriesStatus[job_no] || {
            hasQueries: false,
            hasUnseen: false,
            hasOpenQueries: false,
          };

          return (
            <div style={{ textAlign: "center", position: "relative" }}>
              <a
                href={`/import-dsr/job/${branch_code}/${trade_type}/${original.mode}/${job_no}/${year}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{
                  cursor: "pointer",
                  color: textColor,
                  backgroundColor: bgColor || "transparent",
                  padding: "4px 8px",
                  borderRadius: "5px",
                  fontWeight: "bold",
                  display: "inline-block",
                  textDecoration: "none",
                  fontSize: "14px",
                }}
              >
                {job_number || job_no}
              </a>

              <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                <span>{type_of_b_e}</span> • <span>{consignment_type}</span>
                {custom_house && <span> • {custom_house}</span>}
              </div>

              {branch_code === "GIM" && original.cfs_name && (
                <div style={{ marginTop: "2px", fontWeight: "bold", color: "#000", fontSize: "11px" }}>
                  CFS: {original.cfs_name}
                </div>
              )}

              {/* Action buttons & query dots */}
              <div
                style={{
                  marginTop: "4px",
                  display: "flex",
                  gap: "6px",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconButton
                  size="small"
                  onClick={handleRefresh}
                  aria-label="refresh-job"
                  sx={{ p: 0.3 }}
                >
                  <RefreshIcon sx={{ fontSize: 14 }} />
                </IconButton>

                {/* Red Dot - Raise Query */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRedClick(original);
                  }}
                  style={{
                    width: "12px",
                    height: "12px",
                    padding: 0,
                    backgroundColor: "#ef4444",
                    borderRadius: "50%",
                    border: "none",
                    cursor: "pointer",
                  }}
                  title="Raise query to client"
                />

                {/* Yellow Dot - View Query Chat */}
                {queryStat.hasQueries && (
                  <div style={{ position: "relative", display: "inline-flex" }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleYellowClick(original);
                      }}
                      style={{
                        width: "12px",
                        height: "12px",
                        padding: 0,
                        backgroundColor: "#f59e0b",
                        borderRadius: "50%",
                        border: "none",
                        cursor: "pointer",
                      }}
                      title="View replies & reply back"
                    />
                    {queryStat.hasUnseen && (
                      <span
                        style={{
                          position: "absolute",
                          top: "-3px",
                          right: "-3px",
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          backgroundColor: "#ef4444",
                          border: "1px solid #fff",
                        }}
                      />
                    )}
                  </div>
                )}

                {/* Green Dot - Resolve Query */}
                {queryStat.hasOpenQueries && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResolveOpenQuery(original);
                    }}
                    style={{
                      width: "12px",
                      height: "12px",
                      padding: 0,
                      backgroundColor: "#10b981",
                      borderRadius: "50%",
                      border: "none",
                      cursor: "pointer",
                    }}
                    title="Resolve open query"
                  />
                )}
              </div>

              {queryStat.hasQueries && (
                <div style={{ marginTop: "2px" }}>
                  <span
                    style={{
                      padding: "1px 5px",
                      borderRadius: "3px",
                      fontSize: "9px",
                      fontWeight: "700",
                      cursor: "pointer",
                      backgroundColor: queryStat.hasUnseen
                        ? "#fee2e2"
                        : queryStat.hasOpenQueries
                        ? "#fef3c7"
                        : "#dcfce7",
                      border: `1px solid ${
                        queryStat.hasUnseen
                          ? "#ef4444"
                          : queryStat.hasOpenQueries
                          ? "#f59e0b"
                          : "#22c55e"
                      }`,
                      color: queryStat.hasUnseen
                        ? "#b91c1c"
                        : queryStat.hasOpenQueries
                        ? "#b45309"
                        : "#15803d",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenQueryChat(original);
                    }}
                  >
                    {queryStat.hasUnseen
                      ? "● New Message"
                      : queryStat.hasOpenQueries
                      ? "Open Query"
                      : "Resolved"}
                  </span>
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "importer",
        header: "Importer",
        size: 200,
        Cell: ({ cell, row }) => {
          const importer = cell?.getValue()?.toString() || "";
          const supplier = row?.original?.supplier_exporter || "";
          return (
            <div>
              <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "13px" }}>
                {importer}
              </div>
              {supplier && (
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                  Exporter: {supplier}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "igm",
        header: "IGM",
        size: 180,
        Cell: ({ row }) => {
          const original = row.original;
          const { igm_no, igm_date, gateway_igm, gateway_igm_date } = original;
          const hasIgm = igm_no || igm_date;
          const hasGatewayIgm = gateway_igm || gateway_igm_date;

          if (!hasIgm && !hasGatewayIgm) {
            return <span style={{ color: "#94a3b8", fontSize: "12px" }}>N/A</span>;
          }

          return (
            <div style={{ fontSize: "12px" }}>
              {hasIgm && (
                <div>
                  <strong>IGM: </strong>
                  <span>{igm_no || "-"}</span>
                  {igm_date && (
                    <span style={{ color: "#64748b", marginLeft: "4px" }}>
                      ({formatDate(igm_date)})
                    </span>
                  )}
                </div>
              )}
              {hasGatewayIgm && (
                <div style={{ marginTop: "2px" }}>
                  <strong>G-IGM: </strong>
                  <span>{gateway_igm || "-"}</span>
                  {gateway_igm_date && (
                    <span style={{ color: "#64748b", marginLeft: "4px" }}>
                      ({formatDate(gateway_igm_date)})
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "latest_date_in_seq",
        header: "Latest Date in Seq",
        size: 180,
        muiTableHeadCellProps: { align: "center" },
        muiTableBodyCellProps: { sx: { textAlign: "center" } },
        Cell: ({ row }) => {
          const latestInfo = getLatestJobDate(row.original);
          return (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
              <Chip
                size="small"
                label={latestInfo.label}
                sx={{
                  bgcolor: `${latestInfo.badgeColor}15`,
                  color: latestInfo.badgeColor,
                  fontWeight: 800,
                  fontSize: "11px",
                  border: `1px solid ${latestInfo.badgeColor}40`,
                  height: "20px",
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: "#334155",
                  fontSize: "12px",
                }}
              >
                {latestInfo.formattedDate}
              </Typography>
            </Box>
          );
        },
      },
      {
        accessorKey: "detailed_status",
        header: "Status",
        size: 190,
        Cell: ({ cell, row }) => {
          const status = cell?.getValue() || "N/A";
          const rowStyle = getTableRowInlineStyle(row);
          const rowBg = rowStyle?.backgroundColor;
          return (
            <div>
              <Chip
                size="small"
                label={status}
                sx={{
                  fontWeight: 700,
                  fontSize: "11px",
                  bgcolor: rowBg ? `${rowBg}` : "#f1f5f9",
                  color: "#0f172a",
                  border: "1px solid #94a3b8",
                  maxWidth: "180px",
                  "& .MuiChip-label": {
                    whiteSpace: "normal",
                    lineHeight: "1.2",
                    padding: "4px 6px",
                  },
                }}
              />
            </div>
          );
        },
      },
      {
        accessorKey: "bl_and_containers",
        header: "BL & Cargo Summary",
        size: 190,
        Cell: ({ row }) => {
          const original = row.original;
          const bl = original.awb_bl_no || "";
          const containers = original.container_nos || [];
          const count = containers.length;
          const shippingLine = original.shipping_line_airline || "";

          return (
            <div style={{ fontSize: "12px" }}>
              {bl && (
                <div>
                  <strong>BL: </strong> {bl}
                </div>
              )}
              {shippingLine && (
                <div style={{ color: "#64748b", fontSize: "11px" }}>{shippingLine}</div>
              )}
              <div style={{ color: "#475569", marginTop: "2px" }}>
                <strong>Qty: </strong>
                {count > 0 ? `${count} Container(s)` : `${original.no_of_pkgs || 0} Pkg(s)`}
              </div>
            </div>
          );
        },
      },
    ],
    [
      clientQueriesStatus,
      formatDate,
      handleOpenQueryChat,
      handleRedClick,
      handleResolveOpenQuery,
      handleYellowClick,
      setRows,
    ]
  );

  return columns;
}

export default useJobShrinkColumns;
