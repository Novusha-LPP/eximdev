import React, { useCallback } from "react";
import { Box, Tooltip, IconButton } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RefreshIcon from "@mui/icons-material/Refresh";
import axios from "axios";
import EditableDateCell from "../gallery/EditableDateCell";
import BENumberCell from "../gallery/BENumberCell";
import BLTrackingCell from "../../customHooks/BLTrackingCell";
import ContainerCellContent from "../ContainerCellContent";
import InvoiceDisplay from "../import-do/InvoiceDisplay";
import { isAirMode } from "../../utils/modeLogic";

function ExpandedJobDetails({
  row,
  handleRowDataUpdate,
  invalidateCache,
  selectedYear,
  setRows,
  clientQueriesStatus = {},
  handleRedClick = () => {},
  handleYellowClick = () => {},
  handleResolveOpenQuery = () => {},
  handleOpenQueryChat = () => {},
}) {
  const original = row?.original || row || {};
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
  } = original;

  const handleCopy = useCallback((event, text) => {
    event.stopPropagation();
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }, []);

  const formatDate = useCallback((dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}/${m}/${d}`;
  }, []);

  // Color logic for Job No
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
    container_nos?.forEach((container) => {
      const daysDifference = calculateDaysDifference(container.detention_from);
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

  const handleRefresh = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-job/${original.branch_code}/${original.trade_type}/${original.mode}/${year}/${job_no}`
      );
      const updatedJob = res.data;
      if (typeof setRows === "function") {
        setRows((prev) =>
          prev.map((r) =>
            (r._id && updatedJob._id && r._id === updatedJob._id) ||
            (!r._id && r.job_no === updatedJob.job_no && r.year === updatedJob.year)
              ? { ...r, ...updatedJob }
              : r
          )
        );
      }
    } catch (err) {
      console.error("Error refreshing job:", err);
    }
  };

  const queryStat = clientQueriesStatus[job_no] || {
    hasQueries: false,
    hasUnseen: false,
    hasOpenQueries: false,
  };

  // Importer variables
  const importer = original.importer?.toString() || "";
  const supplier_exporter = original.supplier_exporter || "";
  const origin_country = original.origin_country || "";
  const saller_name = original.saller_name || "";
  const fta_Benefit_date_time = original.fta_Benefit_date_time;
  const hss = original.hss;
  const hasHss = !!hss && hss === "Yes";
  const hssDisplay = hasHss ? `Yes - ${saller_name}` : "No";
  const hasFTABenefit = !!fta_Benefit_date_time;
  const ftaDisplay = hasFTABenefit ? `Yes - ${origin_country}` : "No";
  const adCode = original.adCode || "";
  const RMS = original.RMS || "";

  // DO variables
  const do_validity = original.do_validity;
  const do_completed = original.do_completed;
  const isDoDocRecieved = original.is_do_doc_recieved;
  const isOblRecieved = original.is_obl_recieved;
  const doDocRecievedDate = original.do_doc_recieved_date;
  const ogDocRecievedDate = original.og_doc_recieved_date;
  const is_og_doc_recieved = original.is_og_doc_recieved;
  const oblRecievedDate = original.obl_recieved_date;
  const do_copies = original.do_copies;
  const do_list = original.do_list;
  const doCompleted = formatDate(do_completed);
  const doValidity = formatDate(do_validity);
  const formattedOblRecievedDate = formatDate(oblRecievedDate);
  const formattedDoDocRecievedDate = formatDate(doDocRecievedDate);
  const formattedOgDocRecievedDate = formatDate(ogDocRecievedDate);

  // E-sanchit documents
  const validDocuments = (original.cth_documents || []).filter(
    (doc) => doc.document_check_date
  );

  return (
    <Box
      sx={{
        width: "100%",
        overflowX: "auto",
        backgroundColor: "#f8fafc",
        p: 1.5,
        border: "1px solid #e2e8f0",
        borderRadius: "6px",
        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          minWidth: "1200px",
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "2px solid #cbd5e1" }}>
            <th style={{ padding: "8px 10px", textAlign: "center", fontSize: "12px", fontWeight: 700, color: "#334155", width: "220px", borderRight: "1px solid #e2e8f0" }}>Job No</th>
            <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "12px", fontWeight: 700, color: "#334155", width: "180px", borderRight: "1px solid #e2e8f0" }}>Importer</th>
            <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "12px", fontWeight: 700, color: "#334155", width: "170px", borderRight: "1px solid #e2e8f0" }}>BL Number</th>
            <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "12px", fontWeight: 700, color: "#334155", width: "420px", borderRight: "1px solid #e2e8f0" }}>Dates</th>
            <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "12px", fontWeight: 700, color: "#334155", width: "180px", borderRight: "1px solid #e2e8f0" }}>BE Number and Date</th>
            <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "12px", fontWeight: 700, color: "#334155", width: "180px", borderRight: "1px solid #e2e8f0" }}>Container/Package Numbers</th>
            <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "12px", fontWeight: 700, color: "#334155", width: "190px", borderRight: "1px solid #e2e8f0" }}>DO Completed &amp; Validity</th>
            <th style={{ padding: "8px 10px", textAlign: "left", fontSize: "12px", fontWeight: 700, color: "#334155", width: "220px" }}>E-sanchit Doc</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {/* Column 1: Job No */}
            <td style={{ padding: "10px", verticalAlign: "top", textAlign: "center", borderRight: "1px solid #e2e8f0" }}>
              <div style={{ textAlign: "center" }}>
                <a
                  href={`/import-dsr/job/${branch_code}/${trade_type}/${original.mode}/${job_no}/${year}`}
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

                {branch_code === "GIM" && original.cfs_name && (
                  <div style={{ marginTop: "4px", fontWeight: "bold", color: "#000", fontSize: "0.85rem" }}>
                    CFS Loc: {original.cfs_name}
                  </div>
                )}
                <div style={{ marginTop: 4 }}>
                  <IconButton size="small" onClick={handleRefresh} aria-label="refresh-job">
                    <RefreshIcon fontSize="inherit" />
                  </IconButton>
                </div>
                {original.obl_telex_bl === "OBL" && (
                  <div style={{ marginTop: 4, color: "red", fontSize: "15px" }}>
                    Advanced OBL is received <br />
                    {formatDate(original.document_received_date)}
                  </div>
                )}

                {/* Query Action Buttons & Status */}
                <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRedClick(original); }}
                      style={{
                        width: "14px",
                        height: "14px",
                        padding: 0,
                        backgroundColor: "#ef4444",
                        borderRadius: "50%",
                        border: "none",
                        cursor: "pointer",
                      }}
                      title="Raise query to client"
                    />

                    {queryStat.hasQueries && (
                      <div style={{ position: "relative", display: "inline-flex" }}>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleYellowClick(original); }}
                          style={{
                            width: "14px",
                            height: "14px",
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

                    {queryStat.hasOpenQueries && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleResolveOpenQuery(original); }}
                        style={{
                          width: "14px",
                          height: "14px",
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
                      onClick={(e) => { e.stopPropagation(); handleOpenQueryChat(original); }}
                    >
                      {queryStat.hasUnseen ? "● New Message" : queryStat.hasOpenQueries ? "Open Query" : "Resolved"}
                    </span>
                  )}
                </div>
              </div>
            </td>

            {/* Column 2: Importer */}
            <td style={{ padding: "10px", verticalAlign: "top", textAlign: "left", borderRight: "1px solid #e2e8f0" }}>
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
                <div style={{ marginTop: "5px", fontWeight: "bold" }}>{`FTA Benefit: ${ftaDisplay}`}</div>
              </Tooltip>
              <Tooltip title="Hss" arrow>
                <span style={{ marginTop: "5px" }}>{`Hss: ${hssDisplay}`}</span>
              </Tooltip>
              <span style={{ marginTop: "5px", display: "block" }}>
                <strong>AD Code: </strong> {adCode ? adCode : "NA"}
              </span>
              {RMS && (
                <span style={{ marginTop: "5px", display: "inline-block" }}>
                  <strong>RMS: </strong>
                  {RMS}
                </span>
              )}
            </td>

            {/* Column 3: BL Number */}
            <td style={{ padding: "10px", verticalAlign: "top", textAlign: "left", borderRight: "1px solid #e2e8f0" }}>
              <BLTrackingCell
                blNumber={original.awb_bl_no || ""}
                hblNumber={original.hawb_hbl_no || ""}
                mbl_details={original.mbl_details}
                hbl_details={original.hbl_details}
                shippingLine={original.shipping_line_airline || ""}
                customHouse={original.custom_house || ""}
                container_nos={original.container_nos || []}
                jobId={original._id}
                branch_code={original.branch_code || ""}
                mode={original.mode || ""}
                portOfReporting={original.port_of_reporting || ""}
                containerNos={original.container_nos || []}
                onCopy={handleCopy}
                onUpdateSuccess={handleRowDataUpdate}
                invalidateCache={invalidateCache}
                selectedYear={selectedYear}
              />

              <div>
                <strong> {original.shipping_line_airline} </strong>
                <div>
                  <strong>Gross(KGS): {original.gross_weight || "N/A"} </strong>
                </div>
                <div>
                  <strong>Net(KGS): {original.job_net_weight || "N/A"}</strong>
                </div>
                <div>
                  <strong>LO :</strong> {original.loading_port?.replace(/\(.*?\)\s*/, "") || "N/A"} <br />
                  <strong>POD :</strong> {original.port_of_reporting?.replace(/\(.*?\)\s*/, "") || "N/A"}
                </div>
              </div>
            </td>

            {/* Column 4: Dates */}
            <td style={{ padding: "10px", verticalAlign: "top", textAlign: "left", borderRight: "1px solid #e2e8f0" }}>
              <EditableDateCell
                cell={{
                  getValue: () => original.dates,
                  row: { original: original, id: original._id || "" },
                }}
                onRowDataUpdate={handleRowDataUpdate}
              />
            </td>

            {/* Column 5: BE Number and Date */}
            <td style={{ padding: "10px", verticalAlign: "top", textAlign: "left", borderRight: "1px solid #e2e8f0" }}>
              <BENumberCell
                cell={{
                  getValue: () => original.be_no || "",
                  row: { original: original, id: original._id || "" },
                }}
                copyFn={handleCopy}
              />
            </td>

            {/* Column 6: Container/Package Numbers */}
            <td style={{ padding: "10px", verticalAlign: "top", textAlign: "left", borderRight: "1px solid #e2e8f0" }}>
              <ContainerCellContent
                cell={{
                  getValue: () => original.container_numbers || "",
                  row: { original: original, id: original._id || "" },
                }}
                handleCopy={handleCopy}
              />
            </td>

            {/* Column 7: DO Completed & Validity */}
            <td style={{ padding: "10px", verticalAlign: "top", textAlign: "left", borderRight: "1px solid #e2e8f0" }}>
              <div style={{ textAlign: "left" }}>
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

                {Array.isArray(do_copies) && do_copies.length > 0 ? (
                  <div style={{ marginTop: "4px" }}>
                    {do_copies.map((url, index) => (
                      <div key={index}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#007bff", textDecoration: "underline" }}
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

                {!isAirMode(original.mode) && do_list && (
                  <div>
                    <strong>EmptyOff LOC:</strong> {do_list}
                  </div>
                )}

                <div style={{ marginTop: "8px" }}>
                  <InvoiceDisplay row={original} showOOC={false} showCTH={false} />
                </div>
              </div>
            </td>

            {/* Column 8: E-sanchit Doc */}
            <td style={{ padding: "10px", verticalAlign: "top", textAlign: "left" }}>
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
                      <div style={{ display: "flex", alignItems: "center", gap: 6, margin: 0, padding: 0 }}>
                        <a
                          href={doc.url?.[0] || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ textDecoration: "none", color: "#007bff", display: "inline-block", margin: 0, padding: 0 }}
                        >
                          {`${doc.document_name} - ${doc.irn}`}
                        </a>

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
                          <abbr title="Copy IRN">
                            <ContentCopyIcon fontSize="inherit" />
                          </abbr>
                        </IconButton>
                      </div>

                      <div style={{ fontSize: "12px", color: "#555", margin: 0, padding: 0 }}>
                        {new Date(doc.document_check_date).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ margin: 0, padding: 0 }}>No Documents Available</div>
                )}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </Box>
  );
}

export default React.memo(ExpandedJobDetails);
