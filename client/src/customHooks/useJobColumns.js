import React, { useCallback, useMemo } from "react";
import { IconButton, Chip, Tooltip } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopyOutlined";
import { useNavigate, useLocation } from "react-router-dom";
import EditableDateCell from "../components/gallery/EditableDateCell";
import BENumberCell from "../components/gallery/BENumberCell.js";
import { useSearchQuery } from "../contexts/SearchQueryContext";
import { getLatestJobDate } from "../utils/getLatestJobDate";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CheckIcon from "@mui/icons-material/Check";
import { getJobUrgency, getJobStatusLabel } from "../utils/jobStatusStyle";

import BLTrackingCell from "./BLTrackingCell.js";
import axios from "axios";
import RefreshIcon from "@mui/icons-material/RefreshOutlined";
import InvoiceDisplay from "../components/import-do/InvoiceDisplay";
import { isAirMode } from "../utils/modeLogic";
import { prefetchJob } from "../utils/jobPrefetch";
import ContainerCellContent from "../components/ContainerCellContent";

// E-Sanchit documents of a job: the first few are shown, the rest open with "Show n more"
const ES_PREVIEW_COUNT = 4;
function EsanchitDocs({ documents, handleCopy }) {
  const [showAll, setShowAll] = React.useState(false);
  if (!documents.length) return <div className="jc-empty">No Documents Available</div>;
  const visible = showAll ? documents : documents.slice(0, ES_PREVIEW_COUNT);
  const hidden = documents.length - ES_PREVIEW_COUNT;
  return (
    <div className="jc-es">
      <span className="jc-k">
        {documents.length} document{documents.length > 1 ? "s" : ""}
      </span>
      {visible.map((doc, index) => (
        <div key={index} className="jc-es-doc">
          <div className="jc-es-main">
            <a
              className="jc-es-link"
              href={doc.url?.[0] || "#"}
              target="_blank"
              rel="noopener noreferrer"
              title={`${doc.document_name} - ${doc.irn}`}
            >
              <span className="jc-es-name">{doc.document_name}</span>
              <span className="jc-es-irn">
                {doc.irn}
                <span className="jc-es-sep"> · </span>
                {new Date(doc.document_check_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace("Sept", "Sep")}
              </span>
            </a>
          </div>
          {/* Copy IRN button; stop propagation to avoid opening the link */}
          <IconButton
            size="small"
            className="jc-icon-btn"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (doc.irn) handleCopy(event, doc.irn);
            }}
            aria-label={`Copy IRN ${doc.irn}`}
          >
            <abbr title="Copy IRN">
              <ContentCopyIcon fontSize="inherit" />
            </abbr>
          </IconButton>
        </div>
      ))}
      {hidden > 0 && (
        <button
          type="button"
          className="jc-more"
          onClick={(e) => {
            e.stopPropagation();
            setShowAll((prev) => !prev);
          }}
        >
          {showAll ? "Show less" : `Show ${hidden} more`}
          <KeyboardArrowDownIcon className={`jc-more__chev${showAll ? " is-open" : ""}`} fontSize="inherit" />
        </button>
      )}
    </div>
  );
}

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
  toggleRowExpanded = () => {},
  onOpenJob = null
) {
  const navigate = useNavigate();
  const location = useLocation();
  const { searchQuery, detailedStatus, selectedICD, selectedImporter } =
    useSearchQuery();

  // Plain click opens the job in this tab; Ctrl/Cmd/Shift/middle click still opens a new tab
  // Same URL the job page uses, so its request can be answered by this one
  const prefetchJobFor = (branchCode, tradeType, mode, jobNo, yr) =>
    prefetchJob(`${process.env.REACT_APP_API_STRING}/get-job/${branchCode}/${tradeType}/${mode}/${yr}/${jobNo}`);

  const openJobSameTab = (e, path) => {
    if (!onOpenJob || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onOpenJob(path);
  };

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
          } = row;

          // How urgent the job is (same rules the job-number colour always used), as a labelled tag
          const urgency = getJobUrgency(row);
          const statusLabel = getJobStatusLabel(detailed_status);
          const jobPath = `/import-dsr/job/${branch_code}/${trade_type}/${row.mode}/${job_no}/${year}`;
          const prefetch = () => prefetchJobFor(branch_code, trade_type, row.mode, job_no, year);

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

          const jobLink = (
            <a
              className="jc-jobno"
              href={jobPath}
              onMouseEnter={prefetch}
              onFocus={prefetch}
              onTouchStart={prefetch}
              onClick={(e) => {
                e.stopPropagation();
                openJobSameTab(e, jobPath);
              }}
            >
              {job_number || job_no}
            </a>
          );

          const copyJobNumber = (
            <IconButton
              size="small"
              className="jc-icon-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleCopy(e, job_number || job_no);
              }}
              title="Copy Job Number"
            >
              <ContentCopyIcon sx={{ fontSize: "14px" }} />
            </IconButton>
          );

          // Render compact row when shrunk
          if (isShrunk) {
            return (
              <div className="jc-compact">
                <IconButton
                  size="small"
                  className="jc-icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRowExpanded(row._id);
                  }}
                  title="Click to expand row"
                >
                  <KeyboardArrowRightIcon sx={{ fontSize: 18 }} />
                </IconButton>
                {jobLink}
                {copyJobNumber}
                {type_of_b_e && <span className="jc-tag jc-tag--sm">{type_of_b_e}</span>}
                <span className="jc-status jc-status--sm" title={statusLabel}>
                  {statusLabel}
                </span>
                {queryStat.hasQueries && (
                  <span
                    className={`jc-dot ${
                      queryStat.hasUnseen ? "jc-dot--red" : queryStat.hasOpenQueries ? "jc-dot--amber" : "jc-dot--green"
                    }`}
                    title={queryStat.hasUnseen ? "New message" : queryStat.hasOpenQueries ? "Open query" : "Resolved"}
                  />
                )}
              </div>
            );
          }

          // Full card header: job, tags, status, urgency and the query actions
          return (
            <div className="jc-strip">
              <div className="jc-id">
                {isExpanded && (
                  <IconButton
                    size="small"
                    className="jc-icon-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRowExpanded(row._id);
                    }}
                    title="Click to collapse row"
                  >
                    <KeyboardArrowDownIcon sx={{ fontSize: 18, color: "#2563eb" }} />
                  </IconButton>
                )}
                {jobLink}
                {copyJobNumber}
                <IconButton
                  size="small"
                  className="jc-icon-btn"
                  onClick={handleRefresh}
                  aria-label="refresh-job"
                  title="Refresh this job"
                >
                  <RefreshIcon className="ic-refresh" sx={{ fontSize: "15px" }} />
                </IconButton>
              </div>

              <div className="jc-tags">
                {type_of_b_e && <span className="jc-tag">{type_of_b_e}</span>}
                {consignment_type && <span className="jc-tag">{consignment_type}</span>}
                {custom_house && <span className="jc-tag">{custom_house}</span>}
                {payment_method && <span className="jc-tag">{payment_method}</span>}
                {branch_code === "GIM" && row.cfs_name && (
                  <span className="jc-tag jc-tag--brand">CFS Loc: {row.cfs_name}</span>
                )}
              </div>

              {row.obl_telex_bl === "OBL" && (
                <span className="jc-adv">
                  Advanced OBL is received · {formatDate(row.document_received_date)}
                </span>
              )}

              <div className="jc-right">
                {urgency && (
                  <span className="jc-urg" style={{ background: urgency.bg, color: urgency.fg }} title="Urgency">
                    {urgency.label}
                  </span>
                )}
                <span className="jc-status" title="Detailed status">
                  {statusLabel}
                </span>

                <div className="jc-q">
                  {/* Raise a query to the client */}
                  <button
                    type="button"
                    className="jc-qbtn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRedClick(row);
                    }}
                    title="Raise query to client"
                  >
                    <span className="jc-dot jc-dot--red" />
                    Raise query
                  </button>

                  {/* View the replies and reply back */}
                  {queryStat.hasQueries && (
                    <button
                      type="button"
                      className={`jc-qbtn ${
                        queryStat.hasUnseen ? "jc-qbtn--new" : queryStat.hasOpenQueries ? "jc-qbtn--open" : "jc-qbtn--done"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenQueryChat(row);
                      }}
                      title="View replies & reply back"
                    >
                      <span
                        className={`jc-dot ${
                          queryStat.hasUnseen ? "jc-dot--red" : queryStat.hasOpenQueries ? "jc-dot--amber" : "jc-dot--green"
                        }`}
                      />
                      {queryStat.hasUnseen ? "New Message" : queryStat.hasOpenQueries ? "Open Query" : "Resolved"}
                    </button>
                  )}

                  {/* Resolve the open query */}
                  {queryStat.hasOpenQueries && (
                    <button
                      type="button"
                      className="jc-qbtn jc-qbtn--resolve"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResolveOpenQuery(row);
                      }}
                      title="Resolve open query"
                    >
                      <CheckIcon sx={{ fontSize: 15 }} />
                      Resolve
                    </button>
                  )}
                </div>
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
            <div className="jc-imp">
              <div className="jc-imp-name">{importer}</div>
              <Tooltip title="Supplier/Exporter" arrow>
                <div className="jc-imp-ex">
                  <span className="jc-dim">Exporter · </span>
                  {supplier_exporter}
                </div>
              </Tooltip>
              <dl className="jc-kv">
                <dt>FTA Benefit</dt>
                <dd>
                  <span className={`jc-yn${hasFTABenefit ? " jc-yn--yes" : ""}`}>{ftaDisplay}</span>
                </dd>
                <dt>HSS</dt>
                <dd>
                  <span className={`jc-yn${hasHss ? " jc-yn--yes" : ""}`}>{hssDisplay}</span>
                </dd>
                <dt>AD Code</dt>
                <dd className="jc-mono">{adCode ? adCode : "NA"}</dd>
                {RMS && (
                  <>
                    <dt>RMS</dt>
                    <dd>
                      <span className="jc-yn jc-yn--warn">{RMS}</span>
                    </dd>
                  </>
                )}
              </dl>
            </div>
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

          const cleanPort = (v) => (v ? v.replace(/\(.*?\)\s*/, "") : "") || "N/A";
          return (
            <div className="jc-bl">
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

              <div className="jc-line">{row?.original?.shipping_line_airline}</div>
              <div className="jc-wt">
                <div>
                  <span className="jc-k">Gross (KGS)</span>
                  <b>{row?.original?.gross_weight || "N/A"}</b>
                </div>
                <div>
                  <span className="jc-k">Net (KGS)</span>
                  <b>{row?.original?.job_net_weight || "N/A"}</b>
                </div>
              </div>
              <div className="jc-route">
                <div>
                  <span className="jc-k">LO</span>
                  <b>{cleanPort(row?.original?.loading_port)}</b>
                </div>
                <span className="jc-route-line" />
                <div className="jc-route-end">
                  <span className="jc-k">POD</span>
                  <b>{cleanPort(row?.original?.port_of_reporting)}</b>
                </div>
              </div>
            </div>
          );
        },
      },

      {
        accessorKey: "dates",
        header: "Dates",
        enableSorting: false,
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
            <EditableDateCell cell={cell} onRowDataUpdate={handleRowDataUpdate} compact showDoPlanningDate />
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

          return (
            <div className="jc-be">
              <span className="jc-k">BE number</span>
              <BENumberCell cell={cell} copyFn={handleCopy} compact />
            </div>
          );
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

          return (
            <div className="jc-ctr-wrap">
              <span className="jc-k">
                {isAirMode(row.original.mode) ? "Packages" : "Containers"} · {row.original.container_nos?.length || 0}
              </span>
              <div className="jc-ctr">
                <ContainerCellContent cell={cell} handleCopy={handleCopy} compact />
              </div>
            </div>
          );
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

          const dateLine = (label, value) => (
            <li className={value ? "ok" : "none"}>
              <b>{value ? `${label}: ${value}` : `No ${label}`}</b>
            </li>
          );
          return (
            <div className="jc-do">
              <ul className="jc-tl">
                {/* OBL received status */}
                {isOblRecieved && (
                  <li className="ok">
                    <b>OBL received by DO team</b>
                    {formattedOblRecievedDate && <span>Date: {formattedOblRecievedDate}</span>}
                  </li>
                )}
                {/* DO document sent status */}
                {isDoDocRecieved && (
                  <li className="info">
                    <b>DO document sent to shipping line</b>
                    {formattedDoDocRecievedDate && <span>Date: {formattedDoDocRecievedDate}</span>}
                  </li>
                )}
                {is_og_doc_recieved && (
                  <li className="info">
                    <b>OG document Recieved By Do Team</b>
                    {formattedOgDocRecievedDate && <span>Date: {formattedOgDocRecievedDate}</span>}
                  </li>
                )}
                {dateLine("DO Completed Date", doCompleted)}
                {dateLine("DO Validity", doValidity)}
              </ul>

              {Array.isArray(doCopies) && doCopies.length > 0 ? (
                <div className="jc-chiprow">
                  {doCopies.map((url, index) => (
                    <a
                      key={index}
                      className="jc-doc-link"
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      DO Copy {index + 1}
                    </a>
                  ))}
                </div>
              ) : (
                <div className="jc-empty">No DO copies</div>
              )}
              {!isAirMode(row.original?.mode) && (
                <div className="jc-eo">
                  <span className="jc-k">EmptyOff LOC</span>
                  <b>{do_list || "—"}</b>
                </div>
              )}

              <div className="jc-inv">
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

          return <EsanchitDocs documents={validDocuments} handleCopy={handleCopy} />;
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
