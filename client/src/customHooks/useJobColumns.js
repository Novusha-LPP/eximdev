import React, { useCallback, useMemo } from "react";
import { IconButton } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useNavigate, useLocation } from "react-router-dom";
import Tooltip from "@mui/material/Tooltip";
import EditableDateCell from "../components/gallery/EditableDateCell";
import BENumberCell from "../components/gallery/BENumberCell.js"; // adjust path
import DeliveryChallanPdf from "../components/import-dsr/DeliveryChallanPDF.js";
import IgstCalculationPDF from "../components/import-dsr/IgstCalculationPDF.js";
import { useSearchQuery } from "../contexts/SearchQueryContext";

import BLTrackingCell from "./BLTrackingCell.js";
import axios from "axios";
import RefreshIcon from "@mui/icons-material/Refresh";
import InvoiceDisplay from "../components/import-do/InvoiceDisplay";

// Custom hook to manage job columns configuration
function useJobColumns(
  handleRowDataUpdate,
  onRowUpdate,
  setRows,
  invalidateCache,
  selectedYear
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
    // Optimized handleCopy function using useCallback to avoid re-creation on each render

    event.stopPropagation();

    if (
      navigator.clipboard &&
      typeof navigator.clipboard.writeText === "function"
    ) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          console.log("Text copied to clipboard:", text);
        })
        .catch((err) => {
          alert("Failed to copy text to clipboard.");
          console.error("Failed to copy:", err);
        });
    } else {
      // Fallback approach for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        console.log("Text copied to clipboard using fallback method:", text);
      } catch (err) {
        alert("Failed to copy text to clipboard.");
        console.error("Fallback copy failed:", err);
      }
      document.body.removeChild(textArea);
    }
  };

  // Memoized utility functions to avoid unnecessary re-calculations
  const getPortLocation = useMemo(
    () => (portOfReporting) => {
      const portMap = {
        "(INMUN1) Mundra Sea": "MUNDRA SEA (INMUN1)",
        "(INNSA1) Nhava Sheva Sea": "NHAVA SHEVA SEA (INNSA1)",
        "(INPAV1) Pipavav": "PIPAVAV - VICTOR PORT GUJARAT SEA (INPAV1)",
        "(INPAV6) Pipavav (Victor) Port":
          "PIPAVAV - VICTOR PORT GUJARAT SEA (INPAV1)",
        "(INHZA1) Hazira": "HAZIRA PORT SURAT (INHZA1)",
      };
      return portMap[portOfReporting] || "";
    },
    []
  );

  // Optimized columns array
  const columns = useMemo(
    () => [
      {
        accessorKey: "job_no",
        header: "Job No",
        enableSorting: false,
        size: 150,
        Cell: ({ cell }) => {
          const row = cell.row.original;
          const {
            job_no,
            year,
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
            (detailed_status === "Custom Clearance Completed" &&
              container_nos) ||
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
                `${process.env.REACT_APP_API_STRING}/get-job/${year}/${job_no}`
              );
              const updatedJob = res.data;

              // update only this row, keep others as-is
              setRows((prev) =>
                prev.map((r) =>
                  (r._id && updatedJob._id && r._id === updatedJob._id) ||
                    (!r._id &&
                      r.job_no === updatedJob.job_no &&
                      r.year === updatedJob.year)
                    ? { ...r, ...updatedJob } // merge to keep any client-only fields
                    : r
                )
              );
            } catch (err) {
              console.error("Error refreshing job:", err);
            }
          };

          return (
            <div style={{ textAlign: "center" }}>
              <a
                href={`/import-dsr/job/${job_no}/${year}`}
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
                }}
              >
                {job_no} <br /> {type_of_b_e} <br /> {consignment_type}
                <br /> {custom_house} <br /> {payment_method}
              </a>

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
          const supplier_exporter = row?.original?.supplier_exporter || "";
          const origin_country = row?.original?.origin_country || "";
          const saller_name = row?.original?.saller_name || "";
          const fta_Benefit_date_time = row?.original?.fta_Benefit_date_time;
          const hss = row?.original?.hss;
          const hasHss = !!hss && hss === "Yes"; // tru if not null empty undefined
          const hssDisplay = hasHss ? `Yes - ${saller_name}` : "No";
          const hasFTABenefit = !!fta_Benefit_date_time; // true if not null/empty/undefined
          const ftaDisplay = hasFTABenefit ? `Yes - ${origin_country}` : "No";
          const adCode = row?.original?.adCode || "";
          const RMS = row?.original?.RMS || "";

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
                <span
                  style={{ marginTop: "5px" }}
                >{`FTA Benefit: ${ftaDisplay}`}</span>
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
        Cell: ({ cell, row }) => (
          <>
            <BLTrackingCell
              blNumber={cell?.getValue()?.toString() || ""}
              hblNumber={row?.original?.hawb_hbl_no?.toString() || ""}
              shippingLine={row?.original?.shipping_line_airline || ""}
              customHouse={row?.original?.custom_house || ""}
              container_nos={row?.original?.container_nos || []}
              jobId={row.original._id}
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
        ),
      },

      {
        accessorKey: "dates",
        header: "Dates",
        size: 470,
        Cell: ({ cell }) => (
          <EditableDateCell cell={cell} onRowDataUpdate={handleRowDataUpdate} />
        ),
      },

      {
        accessorKey: "be_no",
        header: "BE Number and Date",
        size: 200,
        Cell: ({ cell }) => <BENumberCell cell={cell} copyFn={handleCopy} />,
      },
      {
        accessorKey: "container_numbers",
        header: "Container Numbers and Size",
        size: 200,
        Cell: ({ cell }) => {
          const containerNos = cell.row.original.container_nos;
          const jobData = cell.row.original;

          // Helper function to get color based on shortage amount
          const getShortageColor = (shortage) => {
            if (shortage < 0) {
              return "#e02251"; // Red for shortage
            } else {
              return "#2e7d32"; // Green for no shortage
            }
          };

          // Helper function to get shortage text for tooltip
          const getShortageText = (shortage) => {
            if (shortage < 0) {
              return `Shortage: -${Math.abs(shortage).toFixed(2)} kg`;
            } else if (shortage > 0) {
              return `Excess: +${Math.abs(shortage).toFixed(2)} kg`;
            } else {
              return "No shortage/excess";
            }
          };

          return (
            <React.Fragment>
              {containerNos?.map((container, id) => {
                const weightShortage =
                  parseFloat(container.weight_shortage) || 0;
                const containerColor = getShortageColor(weightShortage);
                const tooltipText = getShortageText(weightShortage);

                return (
                  <div key={id} style={{ marginBottom: "4px" }}>
                    <Tooltip title={tooltipText} arrow placement="top">
                      <a
                        href={`https://www.ldb.co.in/ldb/containersearch/39/${container.container_number}/1726651147706`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: containerColor,
                          fontWeight: "bold",
                          textDecoration: "none",
                          cursor: "pointer",
                        }}
                        onMouseOver={(e) =>
                          (e.target.style.textDecoration = "underline")
                        }
                        onMouseOut={(e) =>
                          (e.target.style.textDecoration = "none")
                        }
                      >
                        {container.container_number}
                      </a>
                    </Tooltip>
                    | "{container.size}"
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <Tooltip title="Copy Container Number" arrow>
                        <IconButton
                          size="small"
                          onClick={(event) =>
                            handleCopy(event, container.container_number)
                          }
                        >
                          <ContentCopyIcon fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                      {/* Delivery Challan Download Icon */}
                      <DeliveryChallanPdf
                        year={jobData.year}
                        jobNo={jobData.job_no}
                        containerIndex={id}
                        renderAsIcon={true}
                      />
                      <IgstCalculationPDF
                        year={jobData.year}
                        jobNo={jobData.job_no}
                        containerIndex={id}
                        renderAsIcon={true}
                      />
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          );
        },
      },

      {
        accessorKey: "do_validity",
        header: "DO Completed & Validity",
        enableSorting: false,
        size: 200,
        Cell: ({ row }) => {
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
              <div>
                <strong>EmptyOff LOC:</strong> {do_list}
              </div>

              <div style={{ marginTop: "8px" }}>
                <InvoiceDisplay row={row.original} showOOC={false} />
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
          const { cth_documents = [] } = row.original;
          // Filter out documents that do not have a document_check_date
          const validDocuments = cth_documents.filter(
            (doc) => doc.document_check_date
          );

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
      getPortLocation,
      handleCopy,
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
      invalidateCache, // Add to dependencies
      selectedYear, // Add to dependencies
    ]
  );

  return columns;
}

export default useJobColumns;
