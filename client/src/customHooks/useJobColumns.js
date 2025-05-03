import React, { useCallback, useMemo } from "react";
import { IconButton } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShip, faAnchor } from "@fortawesome/free-solid-svg-icons";
import Tooltip from "@mui/material/Tooltip";
import EditableDateCell from "../components/gallery/EditableDateCell";
import BENumberCell from "../components/gallery/BENumberCell.js"; // adjust path
import { getUser } from "../utils/cookie.js";
// Custom hook to manage job columns configuration

const user = getUser();
function useJobColumns() {
  const navigate = useNavigate();

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

  // const getCustomHouseLocation = useMemo(
  //   () => (customHouse) => {
  //     const houseMap = {
  //       "ICD SACHANA": "SACHANA ICD (INJKA6)",
  //       "ICD SANAND": "THAR DRY PORT ICD/AHMEDABAD GUJARAT ICD (INSAU6)",
  //       "ICD KHODIYAR": "AHEMDABAD ICD (INSBI6)",
  //     };
  //     return houseMap[customHouse] || customHouse;
  //   },
  //   []
  // );

  // const formatDate = useCallback((dateStr) => {
  //   const date = new Date(dateStr);
  //   const year = date.getFullYear();
  //   const month = String(date.getMonth() + 1).padStart(2, "0");
  //   const day = String(date.getDate()).padStart(2, "0");
  //   return `${year}/${month}/${day}`;
  // }, []);

  // Optimized columns array
  const columns = useMemo(
    () => [
      {
        accessorKey: "job_no",
        header: "Job No",
        size: 150,
        Cell: ({ cell }) => {
          const {
            job_no,
            year,
            type_of_b_e,
            consignment_type,
            vessel_berthing,
            container_nos, // Assume this field holds an array of container objects
            detailed_status,
            custom_house,
            // delivery_date,
            emptyContainerOffLoadDate,
          } = cell.row.original;

          // Default background and text colors
          let bgColor = "";
          let textColor = "blue"; // Default text color

          const currentDate = new Date();

          // Function to calculate the days difference
          const calculateDaysDifference = (targetDate) => {
            const date = new Date(targetDate);
            const timeDifference = date.getTime() - currentDate.getTime();
            return Math.ceil(timeDifference / (1000 * 3600 * 24));
          };

          // Check if the detailed status is "Estimated Time of Arrival"
          if (detailed_status === "Estimated Time of Arrival") {
            const daysDifference = calculateDaysDifference(vessel_berthing);

            // Only apply the background color if the berthing date is today or in the future
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
          // Check if the detailed status is "Billing Pending"
          if (detailed_status === "Billing Pending") {
            const daysDifference = calculateDaysDifference(
              emptyContainerOffLoadDate
            );

            // Apply colors based on past and current dates only
            if (daysDifference <= 0 && daysDifference >= -5) {
              // delivery_date up to the next 5 days - White background for current and past dates
              bgColor = "white";
              textColor = "blue";
            } else if (daysDifference <= -6 && daysDifference >= -10) {
              // 5 days following the white period - Orange background for past dates
              bgColor = "orange";
              textColor = "black";
            } else if (daysDifference < -10) {
              // Any date beyond the orange period - Red background for past dates
              bgColor = "red";
              textColor = "white";
            }
          }

          // Apply logic for multiple containers' "detention_from" for "Custom Clearance Completed"
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

              // Apply background color based on the days difference before the current date
              if (daysDifference <= 0) {
                // Dark Red Background for current date or older detention dates
                bgColor = "darkred";
                textColor = "white"; // White text on dark red background
              } else if (daysDifference === 1) {
                // Red Background for 1 day before current date
                bgColor = "red";
                textColor = "white"; // White text on red background
              } else if (daysDifference === 2) {
                // Orange Background for 2 days before current date
                bgColor = "orange";
                textColor = "black"; // Black text on orange background
              } else if (daysDifference === 3) {
                // Yellow Background for 3 days before current date
                bgColor = "yellow";
                textColor = "black"; // Black text on yellow background
              }
            });
          }

          return (
            <div
              onClick={() => navigate(`/job/${job_no}/${year}`)}
              style={{
                cursor: "pointer",
                color: textColor,
                backgroundColor: bgColor,
              }}
            >
              {job_no} <br /> {type_of_b_e} <br /> {consignment_type} <br />{" "}
              {custom_house}
              <br />
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
          
          return (
            <>
              <span><strong>Importer: </strong>{importer}</span>
          
              <Tooltip title="Supplier/Exporter" arrow>
                <div style={{marginTop :"5px"}}><strong>Exporter: </strong>{supplier_exporter}</div>
              </Tooltip>
           
              <Tooltip title="FTA Benefit" arrow>
                <span style={{marginTop :"5px"}}>{`FTA Benefit: ${ftaDisplay}`}</span>
              </Tooltip>
              <Tooltip title="Hss" arrow>
                <span style={{marginTop :"5px"}}>{`Hss: ${hssDisplay}`}</span>
              </Tooltip>
              <span style={{ marginTop: "5px" }}>
  <strong>AD Code: </strong> {adCode ? adCode : "NA"}
</span>
            </>
          );
        },
      },

      {
        accessorKey: "awb_bl_no",
        header: "BL Number",
        size: 150,
        Cell: ({ cell, row }) => {
          // Safely retrieve the BL Number, defaulting to an empty string if undefined
          const blNumber = cell?.getValue()?.toString() || "";

          const portOfReporting = row?.original?.port_of_reporting || "";
          const shippingLine = row?.original?.shipping_line_airline || "";
          // const supplier_exporter = row?.original?.supplier_exporter || "";
          const gross_weight = row?.original?.gross_weight || "";
          const job_net_weight = row?.original?.job_net_weight || "";
          const loading_port = row?.original.loading_port || "";
          const port_of_reporting = row?.original.port_of_reporting || "";

          // Remove the codes from the port names if they are in the format "(CODE) PortName"
          const cleanLoadingPort = loading_port
            ? loading_port.replace(/\(.*?\)\s*/, "")
            : "N/A";
          const cleanPortOfReporting = port_of_reporting
            ? port_of_reporting.replace(/\(.*?\)\s*/, "")
            : "N/A";

          const containerFirst =
            row?.original?.container_nos?.[0]?.container_number || "";

          // Memoize the location for sea IGM entry
          const location = getPortLocation(portOfReporting);

          // Define the shipping line URLs, incorporating the first container number (if available)
          const shippingLineUrls = {
            MSC: `https://www.msc.com/en/track-a-shipment`,
            "M S C": `https://www.msc.com/en/track-a-shipment`,
            "MSC LINE": `https://www.msc.com/en/track-a-shipment`,
            "Maersk Line": `https://www.maersk.com/tracking/${blNumber}`,
            "CMA CGM AGENCIES INDIA PVT. LTD":
              "https://www.cma-cgm.com/ebusiness/tracking/search",
            "Hapag-Lloyd": `https://www.hapag-lloyd.com/en/online-business/track/track-by-booking-solution.html?blno=${blNumber}`,
            "Trans Asia": `http://182.72.192.230/TASFREIGHT/AppTasnet/ContainerTracking.aspx?&containerno=${containerFirst}&blNo=${blNumber}`,
            "ONE LINE":
              "https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking",

            HMM: "https://www.hmm21.com/e-service/general/trackNTrace/TrackNTrace.do",
            HYUNDI:
              "https://www.hmm21.com/e-service/general/trackNTrace/TrackNTrace.do",
            "Cosco Container Lines":
              "https://elines.coscoshipping.com/ebusiness/cargotracking",
            COSCO: "https://elines.coscoshipping.com/ebusiness/cargotracking",
            "Unifeeder Agencies India Pvt Ltd": blNumber
              ? `https://www.unifeeder.cargoes.com/tracking?ID=${blNumber.slice(
                  0,
                  3
                )}%2F${blNumber.slice(3, 6)}%2F${blNumber.slice(
                  6,
                  8
                )}%2F${blNumber.slice(8)}`
              : "#",
            UNIFEEDER: blNumber
              ? `https://www.unifeeder.cargoes.com/tracking?ID=${blNumber.slice(
                  0,
                  3
                )}%2F${blNumber.slice(3, 6)}%2F${blNumber.slice(
                  6,
                  8
                )}%2F${blNumber.slice(8)}`
              : "#",
          };

          // Determine the URL for the specific shipping line
          const shippingLineUrl = shippingLineUrls[shippingLine] || "#";

          return (
            <React.Fragment>
              {blNumber && (
                <React.Fragment>
                  {/* BL Number as a clickable link */}
                  <a
                    href={`https://enquiry.icegate.gov.in/enquiryatices/blStatusIces?mawbNo=${blNumber}&HAWB_NO=`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {blNumber}
                  </a>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    {/* Copy BL Number */}
                    <IconButton
                      size="small"
                      onClick={(event) => handleCopy(event, blNumber)}
                    >
                      <abbr title="Copy BL Number">
                        <ContentCopyIcon fontSize="inherit" />
                      </abbr>
                    </IconButton>

                    {/* Shipping Line Tracking Link */}
                    {shippingLine && shippingLineUrl !== "#" && (
                      <abbr title={`Track Shipment at ${shippingLine}`}>
                        <a
                          href={shippingLineUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FontAwesomeIcon
                            icon={faShip}
                            size="1x"
                            color="blue"
                          />
                        </a>
                      </abbr>
                    )}

                    {/* Sea IGM Entry Link */}
                    <abbr title={`Sea IGM Entry`}>
                      <a
                        href={`https://enquiry.icegate.gov.in/enquiryatices/seaIgmEntry?IGM_loc_Name=${location}&MAWB_NO=${blNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FontAwesomeIcon
                          icon={faAnchor}
                          size="1x"
                          color="blue"
                        />
                      </a>
                    </abbr>
                  </div>

                  <Tooltip title="shippingLine" arrow>
                    <strong> {shippingLine} </strong>
                  </Tooltip>
                  {/* <Tooltip title="Supplier/Exporter" arrow>
                    <span>{supplier_exporter}</span>
                  </Tooltip> */}
                  <Tooltip title="Gross Weight" arrow>
                    <>
                      <strong>Gross(KGS): {gross_weight || "N/A"} </strong>{" "}
                    </>
                  </Tooltip>
                  <Tooltip title="Net Weight" arrow>
                    <strong>Net(KGS): {job_net_weight || "N/A"}</strong>
                  </Tooltip>
                  <div>
                    <strong>LO :</strong> {cleanLoadingPort} <br />
                    <strong>POD :</strong> {cleanPortOfReporting} <br />
                  </div>
                </React.Fragment>
              )}
            </React.Fragment>
          );
        },
      },
      {
        accessorKey: "dates",
        header: "Dates",
        size: 470,
        Cell: EditableDateCell,
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
          return (
            <React.Fragment>
              {containerNos?.map((container, id) => (
                <div key={id} style={{ marginBottom: "4px" }}>
                  <a
                    href={`https://www.ldb.co.in/ldb/containersearch/39/${container.container_number}/1726651147706`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {container.container_number}
                  </a>
                  | "{container.size}"
                  <IconButton
                    size="small"
                    onClick={(event) =>
                      handleCopy(event, container.container_number)
                    }
                  >
                    <abbr title="Copy Container Number">
                      <ContentCopyIcon fontSize="inherit" />
                    </abbr>
                  </IconButton>
                </div>
              ))}
            </React.Fragment>
          );
        },
      },
      // {
      //   accessorKey: "arrival_date",
      //   header: "Arrival Date",
      //   size: 150,
      //   Cell: ({ cell }) =>
      //     cell.row.original.container_nos?.map((container, id) => (
      //       <React.Fragment key={id}>
      //         {container.arrival_date}
      //         <br />
      //       </React.Fragment>
      //     )),
      // },
      // {
      //   accessorKey: "detention_from",
      //   header: "Detention From",
      //   size: 150,
      //   Cell: ({ cell }) =>
      //     cell.row.original.container_nos?.map((container, id) => (
      //       <React.Fragment key={id}>
      //         {container.detention_from}
      //         <br />
      //       </React.Fragment>
      //     )),
      // },

      {
        accessorKey: "do_validity",
        header: "DO Completed & Validity",
        enableSorting: false,
        size: 200,
        Cell: ({ row }) => {
          const doValidity = row.original.do_validity;
          const doCompleted = row.original.do_completed;

          return (
            <div style={{ textAlign: "center" }}>
              <div>
                <strong>Completed:</strong>{" "}
                {doCompleted
                  ? new Date(doCompleted).toLocaleString("en-US", {
                      timeZone: "Asia/Kolkata",
                      hour12: true,
                    })
                  : "Not Completed"}
              </div>
              <div>
                <strong>Validity:</strong> {doValidity || "N/A"}
              </div>
            </div>
          );
        },
      },

      {
        accessorKey: "cth_documents",
        header: "E-sanchit Doc",
        enableSorting: false,
        size: 180,
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
                      marginBottom: "5px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                    }}
                  >
                    <a
                      href={doc.url[0]}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        textDecoration: "none",
                        color: "#007bff",
                        display: "block",
                      }}
                    >
                      {`${doc.document_name}`}
                    </a>
                    <div style={{ fontSize: "12px", color: "#555" }}>
                      {/* Display the checked date */}
                      Checked Date:{" "}
                      {new Date(doc.document_check_date).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <div>No Documents Available</div>
              )}
            </div>
          );
        },
      },
    ],
    [getPortLocation, handleCopy, navigate]
  );

  return columns;
}

export default useJobColumns;
