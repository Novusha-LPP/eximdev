import React, { useCallback, useMemo } from "react";
import { IconButton, Chip, Tooltip } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useNavigate, useLocation } from "react-router-dom";
import EditableDateCell from "../components/gallery/EditableDateCell";
import BENumberCell from "../components/gallery/BENumberCell.js";
import { useSearchQuery } from "../contexts/SearchQueryContext";
import { getLatestJobDate } from "../utils/getLatestJobDate";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

import BLTrackingCell from "./BLTrackingCell.js";
import axios from "axios";
import RefreshIcon from "@mui/icons-material/Refresh";
import InvoiceDisplay from "../components/import-do/InvoiceDisplay";
import { isAirMode } from "../utils/modeLogic";
import ContainerCellContent from "../components/ContainerCellContent";

// Custom hook to manage job columns configuration
function useJobColumns(
  handleRowDataUpdate,
  onRowUpdate,
  setRows,
  invalidateCache,
  selectedYear,
  clientQueriesStatus = {},
  handleRedClick = () => {},
  handleYellowClick = () => {},
  handleResolveOpenQuery = () => {},
  handleOpenQueryChat = () => {},
  viewMode = "full",
  expandedRowIds = {},
  toggleRowExpanded = () => {}
) {
  const navigate = useNavigate();
  const location = useLocation();
  const { searchQuery, detailedStatus, selectedICD, selectedImporter } =
    useSearchQuery();

  const formatDate = useCallback((dateStr) => {
    if (dateStr) {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}/${month}/${day}`;
    } else {
      return dateStr;
    }
  }, []);

  const handleCopy = (event, text) => {
    event.stopPropagation();
    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      navigator.clipboard
        .writeText(text)
        .then(() => {})
        .catch(() => {});
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
      } catch (err) {}
      document.body.removeChild(textArea);
    }
  };

  // Optimized columns array
  const columns = useMemo(
    () => [
      {
        accessorKey: "job_no",
        header: "Job No",
        muiTableHeadCellProps: { align: "center" },
        muiTableBodyCellProps: { sx: { verticalAlign: "top", textAlign: "center" } },
        enableSorting: false,
        size: 250,
        Cell: ({ cell }) => {
          const row = cell.row.original;
          const isShrunk = viewMode === "shrink" && !expandedRowIds[row._id];
          const isExpanded = viewMode === "shrink" && !!expandedRowIds[row._id];

          const {
            job_no,
            year,
            job_number,
            branch_code,
            trade_type,
            type_of_b_e,
            consignment_type,
            payment_method,
            custom_house,
            detailed_status,
            vessel_berthing,
            container_nos,
          } = row;

          // ----- existing color logic -----
          let bgColor = "";
          let textColor = "blue";
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

          if (detailed_status === "Billing Pending" && container_nos) {
            container_nos.forEach((container) => {
              const targetDate =
                consignment_type === "LCL"
                  ? container.delivery_date
                  : container.emptyContainerOffLoadDate;

              if (targetDate) {
                const daysDifference = calculateDaysDifference(targetDate);
                if (daysDifference <= 0 && daysDifference >= -5) {
                  bgColor = "white";
                  textColor = "blue";
                } else if (daysDifference <= -6 && daysDifference >= -10) {
                  bgColor = "orange";
                  textColor = "black";
                } else if (daysDifference < -10) {
                  bgColor = "red";
                  textColor = "white";
                }
              }
            });
          }

          if (
            (detailed_status === "Custom Clearance Completed" && container_nos) ||
            detailed_status === "BE Noted, Clearance Pending" ||
            detailed_status === "PCV Done, Duty Payment Pending"
          ) {
            container_nos.forEach((container) => {
              const daysDifference = calculateDaysDifference(
                container.detention_from
              );

              if (daysDifference <= 0) {
                bgColor = "darkred";
                textColor = "white";
              } else if (daysDifference === 1) {
                bgColor = "red";
                textColor = "white";
              } else if (daysDifference === 2) {
                bgColor = "orange";
                textColor = "black";
              } else if (daysDifference === 3) {
                bgColor = "yellow";
                textColor = "black";
              }
            });
          }
          // ----- end color logic -----

          const handleRefresh = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
              const res = await axios.get(
                `${process.env.REACT_APP_API_STRING}/get-job/${row.branch_code}/${row.trade_type}/${row.mode}/${year}/${job_no}`
              );
              const updatedJob = res.data;

              setRows((prev) =>
                prev.map((r) =>
                  (r._id && updatedJob._id && r._id === updatedJob._id) ||
                  (!r._id &&
                    r.job_no === updatedJob.job_no &&
                    r.year === updatedJob.year)
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

          // Render compact row when shrunk
          if (isShrunk) {
            return (
              <div style={{ textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRowExpanded(row._id);
                  }}
                  sx={{ p: 0.2 }}
                  title="Click to expand row"
                >
                  <KeyboardArrowRightIcon sx={{ fontSize: 18, color: "#64748b" }} />
                </IconButton>
                <a
                  href={`/import-dsr/job/${branch_code}/${trade_type}/${row.mode}/${job_no}/${year}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    cursor: "pointer",
                    color: textColor,
                    backgroundColor: bgColor || "transparent",
                    padding: "3px 6px",
                    borderRadius: "4px",
                    fontWeight: "bold",
                    display: "inline-block",
                    textDecoration: "none",
                    fontSize: "13px",
                  }}
                >
                  {job_number || job_no}
                </a>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(e, job_number || job_no);
                  }}
                  sx={{ p: 0.2 }}
                  title="Copy Job Number"
                >
                  <ContentCopyIcon sx={{ fontSize: "14px", color: "#64748b" }} />
                </IconButton>
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  ({type_of_b_e})
                </span>
                {queryStat.hasQueries && (
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: queryStat.hasUnseen ? "#ef4444" : queryStat.hasOpenQueries ? "#f59e0b" : "#10b981",
                      display: "inline-block",
                    }}
                  />
                )}
              </div>
            );
          }

          // Render exact full old UI when expanded or in full mode
          return (
            <div style={{ textAlign: "center" }}>
              {viewMode === "shrink" && (
                <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "4px" }}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRowExpanded(row._id);
                    }}
                    sx={{ p: 0.2 }}
                    title="Click to collapse row"
                  >
                    <KeyboardArrowDownIcon sx={{ fontSize: 18, color: "#2563eb" }} />
                  </IconButton>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                <a
                  href={`/import-dsr/job/${branch_code}/${trade_type}/${row.mode}/${job_no}/${year}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    cursor: "pointer",
                    color: textColor,
                    backgroundColor: bgColor || "transparent",
                    padding: "10px",
                    borderRadius: "5px",
                    textAlign: "center",
                    display: "inline-block",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {job_number || job_no} <br /> {type_of_b_e} <br /> {consignment_type}
                  <br /> {custom_house} <br /> {payment_method}
                </a>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(e, job_number || job_no);
                  }}
                  sx={{ p: 0.2 }}
                  title="Copy Job Number"
                >
                  <ContentCopyIcon sx={{ fontSize: "14px", color: "#64748b" }} />
                </IconButton>
              </div>

              {branch_code === "GIM" && row.cfs_name && (
                <div style={{ marginTop: "4px", fontWeight: "bold", color: "#000", fontSize: "0.85rem" }}>
                  CFS Loc: {row.cfs_name}
                </div>
              )}
              <div style={{ marginTop: 4 }}>
                <IconButton
                  size="small"
                  onClick={handleRefresh}
                  aria-label="refresh-job"
                >
                  <RefreshIcon fontSize="inherit" />
                </IconButton>
              </div>
              {row.obl_telex_bl === "OBL" && (
                <div style={{ marginTop: 4, color: "red", fontSize: "15px" }}>
                  Advanced OBL is received <br />
                  {formatDate(row.document_received_date)}
                </div>
              )}

              {/* Query Action Buttons & Status inside Job No Cell */}
              <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  {/* Red Dot - Raise Query to Client */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRedClick(row); }}
                    style={{
                      width: "14px",
                      height: "14px",
                      padding: 0,
                      backgroundColor: "#ef4444",
                      borderRadius: "50%",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    title="Raise query to client"
                  />

                  {/* Yellow Dot - View & Reply Chat */}
                  {queryStat.hasQueries && (
                    <div style={{ position: "relative", display: "inline-flex" }}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleYellowClick(row); }}
                        style={{
                          width: "14px",
                          height: "14px",
                          padding: 0,
                          backgroundColor: "#f59e0b",
                          borderRadius: "50%",
                          border: "none",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        title="View replies & reply back"
                      />
                      {queryStat.hasUnseen && (
                        <span
                          style={{
                            position: "absolute",
                            top: "-3px",
                            right: "-3px",
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            backgroundColor: "#ef4444",
                            border: "1px solid #fff",
                            pointerEvents: "none",
                          }}
                        />
                      )}
                    </div>
                  )}

                  {/* Green Dot - Resolve Query */}
                  {queryStat.hasOpenQueries && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleResolveOpenQuery(row); }}
                      style={{
                        width: "14px",
                        height: "14px",
                        padding: 0,
                        backgroundColor: "#10b981",
                        borderRadius: "50%",
                        border: "none",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      title="Resolve open query"
                    />
                  )}
                </div>

                {/* Status Pill */}
                {queryStat.hasQueries && (
                  <span
                    style={{
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "9px",
                      fontWeight: "700",
                      cursor: "pointer",
                      backgroundColor: queryStat.hasUnseen ? "#fee2e2" : queryStat.hasOpenQueries ? "#fef3c7" : "#dcfce7",
                      border: `1px solid ${queryStat.hasUnseen ? "#ef4444" : queryStat.hasOpenQueries ? "#f59e0b" : "#22c55e"}`,
                      color: queryStat.hasUnseen ? "#b91c1c" : queryStat.hasOpenQueries ? "#b45309" : "#15803d",
                    }}
                    onClick={(e) => { e.stopPropagation(); handleOpenQueryChat(row); }}
                  >
                    {queryStat.hasUnseen ? "● New Message" : queryStat.hasOpenQueries ? "Open Query" : "Resolved"}
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "importer",
        header: "Importer",
        size: 200,
        Cell: ({ cell, row }) => {
          const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
          const importer = cell?.getValue()?.toString() || "";
          const supplier_exporter = row?.original?.supplier_exporter || "";
          const origin_country = row?.original?.origin_country || "";
          const saller_name = row?.original?.saller_name || "";
          const fta_Benefit_date_time = row?.original?.fta_Benefit_date_time;
          const hss = row?.original?.hss;
          const hasHss = !!hss && hss === "Yes";
          const hssDisplay = hasHss ? `Yes - ${saller_name}` : "No";
          const hasFTABenefit = !!fta_Benefit_date_time;
          const ftaDisplay = hasFTABenefit ? `Yes - ${origin_country}` : "No";
          const adCode = row?.original?.adCode || "";
          const RMS = row?.original?.RMS || "";

          if (isShrunk) {
            return (
              <div>
                <strong>{importer}</strong>
                {supplier_exporter && (
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    {supplier_exporter}
                  </div>
                )}
              </div>
            );
          }

          return (
            <>
              <span>
                <strong>Importer: </strong>
                {importer}
              </span>

              <Tooltip title="Supplier/Exporter" arrow>
                <div style={{ marginTop: "5px" }}>
                  <strong>Exporter: </strong>
                  {supplier_exporter}
                </div>
              </Tooltip>

              <Tooltip title="FTA Benefit" arrow>
                <div
                  style={{ marginTop: "5px", fontWeight: "bold" }}
                >{`FTA Benefit: ${ftaDisplay}`}</div>
              </Tooltip>
              <Tooltip title="Hss" arrow>
                <span style={{ marginTop: "5px" }}>{`Hss: ${hssDisplay}`}</span>
              </Tooltip>
              <span style={{ marginTop: "5px" }}>
                <strong>AD Code: </strong> {adCode ? adCode : "NA"}
              </span>
              {RMS && (
                <span style={{ marginTop: "5px", display: "inline-block" }}>
                  <strong>RMS: </strong>
                  {RMS}
                </span>
              )}
            </>
          );
        },
      },

      {
        accessorKey: "awb_bl_no",
        header: "BL Number",
        size: 150,
        Cell: ({ cell, row }) => {
          const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];

          if (isShrunk) {
            return (
              <div>
                <span style={{ fontWeight: 600 }}>{cell?.getValue()?.toString() || "-"}</span>
                {row?.original?.shipping_line_airline && (
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    {row.original.shipping_line_airline}
                  </div>
                )}
                {(row?.original?.igm_no || row?.original?.gateway_igm) && (
                  <div style={{ fontSize: "11px", color: "#2563eb", marginTop: "2px" }}>
                    <strong>IGM: </strong>{row.original.igm_no || row.original.gateway_igm}
                  </div>
                )}
              </div>
            );
          }

          return (
            <>
              <BLTrackingCell
                blNumber={cell?.getValue()?.toString() || ""}
                hblNumber={row?.original?.hawb_hbl_no?.toString() || ""}
                shippingLine={row?.original?.shipping_line_airline || ""}
                customHouse={row?.original?.custom_house || ""}
                container_nos={row?.original?.container_nos || []}
                jobId={row.original._id}
                branch_code={row?.original?.branch_code || ""}
                mode={row?.original?.mode || ""}
                portOfReporting={row?.original?.port_of_reporting || ""}
                containerNos={row?.original?.container_nos || []}
                onCopy={handleCopy}
                onUpdateSuccess={handleRowDataUpdate}
                invalidateCache={invalidateCache}
                selectedYear={selectedYear}
              />

              {/* REST OF YOUR CUSTOM CONTENT */}
              <div>
                <strong> {row?.original?.shipping_line_airline} </strong>
                <div>
                  <strong>
                    Gross(KGS): {row?.original?.gross_weight || "N/A"}{" "}
                  </strong>
                </div>
                <div>
                  <strong>
                    Net(KGS): {row?.original?.job_net_weight || "N/A"}
                  </strong>
                </div>
                <div>
                  <strong>LO :</strong>{" "}
                  {row?.original?.loading_port?.replace(/\(.*?\)\s*/, "") ||
                    "N/A"}{" "}
                  <br />
                  <strong>POD :</strong>{" "}
                  {row?.original?.port_of_reporting?.replace(/\(.*?\)\s*/, "") ||
                    "N/A"}
                </div>
              </div>
            </>
          );
        },
      },

      {
        accessorKey: "dates",
        header: "Dates",
        size: 470,
        Cell: ({ cell, row }) => {
          const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];

          if (isShrunk) {
            const latest = getLatestJobDate(row?.original);
            return (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <Chip
                  size="small"
                  label={`${latest.label}: ${latest.formattedDate}`}
                  sx={{
                    bgcolor: `${latest.badgeColor}15`,
                    color: latest.badgeColor,
                    fontWeight: 800,
                    fontSize: "11px",
                    border: `1px solid ${latest.badgeColor}40`,
                    height: "22px",
                  }}
                />
                {(row?.original?.igm_date || row?.original?.gateway_igm_date) && (
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    IGM Dt: {formatDate(row.original.igm_date || row.original.gateway_igm_date)}
                  </span>
                )}
              </div>
            );
          }

          return (
            <EditableDateCell cell={cell} onRowDataUpdate={handleRowDataUpdate} />
          );
        },
      },

      {
        accessorKey: "be_no",
        header: "BE Number and Date",
        size: 200,
        Cell: ({ cell, row }) => {
          const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];

          if (isShrunk) {
            return (
              <div>
                <strong>{row?.original?.be_no || "N/A"}</strong>
                {row?.original?.be_date && (
                  <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "6px" }}>
                    ({formatDate(row.original.be_date)})
                  </span>
                )}
              </div>
            );
          }

          return <BENumberCell cell={cell} copyFn={handleCopy} />;
        },
      },
      {
        accessorKey: "container_numbers",
        header: "Container/Package Numbers",
        size: 200,
        Cell: ({ cell, row }) => {
          const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];

          if (isShrunk) {
            const count = row?.original?.container_nos?.length || 0;
            return (
              <div>
                <strong>
                  {count > 0 ? `${count} Container(s)` : `${row?.original?.no_of_pkgs || 0} Pkg(s)`}
                </strong>
                {row?.original?.container_nos?.[0]?.container_number && (
                  <span style={{ fontSize: "11px", color: "#64748b", marginLeft: "4px" }}>
                    ({row.original.container_nos[0].container_number})
                  </span>
                )}
              </div>
            );
          }

          return <ContainerCellContent cell={cell} handleCopy={handleCopy} />;
        },
      },

      {
        accessorKey: "do_validity",
        header: "DO Completed & Validity",
        enableSorting: false,
        size: 200,
        Cell: ({ row }) => {
          const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
          const do_validity = row.original.do_validity;
          const do_completed = row.original.do_completed;
          const isDoDocRecieved = row.original.is_do_doc_recieved;
          const isOblRecieved = row.original.is_obl_recieved;
          const doDocRecievedDate = row.original.do_doc_recieved_date;
          const ogDocRecievedDate = row.original.og_doc_recieved_date;
          const is_og_doc_recieved = row.original.is_og_doc_recieved;
          const oblRecievedDate = row.original.obl_recieved_date;
          const do_copies = row.original.do_copies;
          const do_list = row.original.do_list;
          const doCopies = do_copies;
          const doCompleted = formatDate(do_completed);
          const doValidity = formatDate(do_validity);
          const formattedOblRecievedDate = formatDate(oblRecievedDate);
          const formattedDoDocRecievedDate = formatDate(doDocRecievedDate);
          const formattedOgDocRecievedDate = formatDate(ogDocRecievedDate);

          if (isShrunk) {
            return (
              <div>
                {doValidity ? (
                  <span><strong>Validity: </strong>{doValidity}</span>
                ) : doCompleted ? (
                  <span><strong>Completed: </strong>{doCompleted}</span>
                ) : (
                  <span style={{ color: "gray", fontSize: "12px" }}>DO Pending</span>
                )}
              </div>
            );
          }

          return (
            <div style={{ textAlign: "left" }}>
              {/* First: Show OBL received status if available */}
              {isOblRecieved && (
                <div style={{ marginBottom: "5px" }}>
                  <span style={{ color: "green", fontWeight: "bold" }}>
                    OBL received by DO team
                  </span>
                  {formattedOblRecievedDate && (
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      Date: {formattedOblRecievedDate}
                    </div>
                  )}
                </div>
              )}

              {/* Second: Show DO document sent status if available */}
              {isDoDocRecieved && (
                <div style={{ marginBottom: "5px" }}>
                  <span style={{ color: "blue", fontWeight: "bold" }}>
                    DO document sent to shipping line
                  </span>
                  {formattedDoDocRecievedDate && (
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      Date: {formattedDoDocRecievedDate}
                    </div>
                  )}
                </div>
              )}
              {/* Second: Show DO document sent status if available */}
              {is_og_doc_recieved && (
                <div style={{ marginBottom: "5px" }}>
                  <span style={{ color: "blue", fontWeight: "bold" }}>
                    OG document Recieved By Do Team
                  </span>
                  {formattedOgDocRecievedDate && (
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      Date: {formattedOgDocRecievedDate}
                    </div>
                  )}
                </div>
              )}

              {/* Rest of the content in current order */}
              <div>
                {doCompleted ? (
                  <strong>DO Completed Date: {doCompleted}</strong>
                ) : (
                  <span style={{ color: "gray" }}>No DO Completed Date</span>
                )}
              </div>

              <div>
                {doValidity ? (
                  <strong>DO Validity: {doValidity}</strong>
                ) : (
                  <span style={{ color: "gray" }}>No DO Validity</span>
                )}
              </div>

              {Array.isArray(doCopies) && doCopies.length > 0 ? (
                <div style={{ marginTop: "4px" }}>
                  {doCopies.map((url, index) => (
                    <div key={index}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#007bff",
                          textDecoration: "underline",
                        }}
                      >
                        DO Copy {index + 1}
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginBottom: "5px" }}>
                  <span style={{ color: "gray" }}>No DO copies</span>
                </div>
              )}
              {!isAirMode(row.original?.mode) && (
                <div>
                  <strong>EmptyOff LOC:</strong> {do_list}
                </div>
              )}

              <div style={{ marginTop: "8px" }}>
                <InvoiceDisplay row={row.original} showOOC={false} showCTH={false} />
              </div>
            </div>
          );
        },
      },

      {
        accessorKey: "cth_documents",
        header: "E-sanchit Doc",
        enableSorting: false,
        size: 400,
        Cell: ({ row }) => {
          const isShrunk = viewMode === "shrink" && !expandedRowIds[row?.original?._id];
          const { cth_documents = [] } = row.original;
          const validDocuments = cth_documents.filter(
            (doc) => doc.document_check_date
          );

          if (isShrunk) {
            return (
              <span style={{ fontSize: "12px", color: validDocuments.length > 0 ? "#007bff" : "gray" }}>
                {validDocuments.length > 0 ? `${validDocuments.length} Document(s)` : "No Documents"}
              </span>
            );
          }

          return (
            <div style={{ textAlign: "left" }}>
              {validDocuments.length > 0 ? (
                validDocuments.map((doc, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      margin: 0,
                      padding: 0,
                      gap: 0,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        margin: 0,
                        padding: 0,
                      }}
                    >
                      <a
                        href={doc.url?.[0] || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          textDecoration: "none",
                          color: "#007bff",
                          display: "inline-block",
                          margin: 0,
                          padding: 0,
                        }}
                      >
                        {`${doc.document_name} - ${doc.irn}`}
                      </a>

                      {/* Copy IRN button; stop propagation to avoid opening the link */}
                      <IconButton
                        size="small"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (doc.irn) handleCopy(event, doc.irn);
                        }}
                        aria-label={`Copy IRN ${doc.irn}`}
                        style={{ padding: 4 }}
                      >
                        <abbr title={`Copy IRN`}>
                          <ContentCopyIcon fontSize="inherit" />
                        </abbr>
                      </IconButton>
                    </div>

                    <div
                      style={{
                        fontSize: "12px",
                        color: "#555",
                        margin: 0,
                        padding: 0,
                      }}
                    >
                      {/* Display the checked date */}
                      {new Date(doc.document_check_date).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ margin: 0, padding: 0 }}>
                  No Documents Available
                </div>
              )}
            </div>
          );
        },
      },
    ],
    [
      navigate,
      location,
      searchQuery,
      detailedStatus,
      selectedICD,
      selectedImporter,
      handleRowDataUpdate,
      formatDate,
      setRows,
      onRowUpdate,
      invalidateCache,
      selectedYear,
      clientQueriesStatus,
      handleRedClick,
      handleYellowClick,
      handleResolveOpenQuery,
      handleOpenQueryChat,
      viewMode,
      expandedRowIds,
      toggleRowExpanded,
    ]
  );

  return columns;
}

export default useJobColumns;
