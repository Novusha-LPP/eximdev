import React, { useState, useCallback, useMemo } from "react";

import { useNavigate } from "react-router-dom";

import { getUser } from "../utils/cookie";

const user = getUser();
// Custom hook to manage job columns configuration
function useCustomerJobList() {
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

  const getCustomHouseLocation = useMemo(
    () => (customHouse) => {
      const houseMap = {
        "ICD SACHANA": "SACHANA ICD (INJKA6)",
        "ICD SANAND": "THAR DRY PORT ICD/AHMEDABAD GUJARAT ICD (INSAU6)",
        "ICD KHODIYAR": "AHEMDABAD ICD (INSBI6)",
      };
      return houseMap[customHouse] || customHouse;
    },
    []
  );
  //   console.log("from customer hook");
  const formatDate = useCallback((dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  }, []);

  // Optimized columns array
  const columns = useMemo(
    () => [
      {
        accessorKey: "job_no",
        header: "Job No & Job Date",
        size: 150,
        Cell: ({ cell }) => {
          const {
            job_no,
            year,
            job_date,
            invoice_number,
            invoice_date,
            inv_currency,
            total_inv_value,
            unit_price,
            description,
            job_net_weight,
            importer,
            custom_house,
            awb_bl_no,
            awb_bl_date,
            container_nos, // Assuming this is an array of container objects
            vessel_berthing,
            gateway_igm_date,
            discharge_date,
            detailed_status,
            be_no,
            be_date,
            loading_port,
            arrival_date,
            free_time,
            detention_from,
            container_number,
            container_size, // Fixed "container.size" reference
            weight_shortage,
            weight_excess,
            assessment_date,
            port_of_reporting,
            type_of_b_e,
            consignment_type,
            shipping_line_airline,
            bill_date,
            out_of_charge,
            pcv_date,
            document_received_date,
            do_validity,
            delivery_date,
            emptyContainerOffLoadDate,
            do_completed,
            rail_out_date,
            cth_documents,
            payment_method,
            supplier_exporter,
            gross_weight,
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
              //   onClick={() => {
              //     console.log(user?.role);
              //     if (user?.role == "Customer") {
              //       navigate(`/cjob/${job_no}/${year}`);
              //     }
              //   }}
              style={{
                cursor: "pointer",
                color: textColor,
                backgroundColor: bgColor,
              }}
            >
              {job_no} <br /> {job_date} <br />
              {custom_house}
              <br />
              {type_of_b_e} <br />
            </div>
          );
        },
      },

      // {
      //   accessorKey: "importer",
      //   header: "Importer",
      //   size: 200,
      // },

      {
        accessorKey: "supplier_exporter",
        header: "supplier_exporter",
        size: 200,
      },
      {
        accessorKey: "invoice_number",
        header: "Invoice Number & Invoice Date",
        size: 150,
        Cell: ({ cell }) => {
          const invoiceNumber = cell.row.original.invoice_number || "";
          const invoiceDate = cell.row.original.invoice_date || "N/A";

          return (
            <React.Fragment>
              {invoiceNumber && (
                <React.Fragment>
                  {/* Invoice Number as a clickable link (assuming there's a tracking URL) */}
                  <a
                    href={`https://example.com/invoice-tracking?invoiceNo=${invoiceNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {invoiceNumber}
                  </a>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <span>{invoiceDate}</span>
                  </div>
                </React.Fragment>
              )}
            </React.Fragment>
          );
        },
      },
      {
        accessorKey: "invoice_value",
        header: "Invoice Value & Unit Price",
        size: 200,
        Cell: ({ cell }) => {
          const item = cell.row.original;
          const invCurrency = item.inv_currency || "N/A";
          const totalInvValue = item.total_inv_value
            ? item.total_inv_value.split(" ")[0]
            : "N/A";
          const unitPrice = item.unit_price || "N/A";

          return (
            <div>
              {invCurrency} | {totalInvValue} | {unitPrice}
            </div>
          );
        },
      },
      {
        accessorKey: "awb_bl_no",
        header: "BL Number & Date",
        size: 150,
        Cell: ({ cell, row }) => {
          // Safely retrieve the BL Number, defaulting to an empty string if undefined
          const blNumber = cell.row.original.awb_bl_no || "";
          const blDate = cell.row.original.awb_bl_date || "N/A";
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
                    <span>{blDate}</span>
                  </div>
                </React.Fragment>
              )}
            </React.Fragment>
          );
        },
      },
      {
        accessorKey: "description",
        header: "Commodity",
        size: 200,
      },
      {
        accessorKey: "job_net_weight",
        header: "Net Weight",
        size: 200,
      },
      {
        accessorKey: "Port",
        header: "Port",
        size: 150,
        Cell: ({ cell }) => {
          const { loading_port, port_of_reporting } = cell.row.original;

          // Remove the codes from the port names if they are in the format "(CODE) PortName"
          const cleanLoadingPort = loading_port
            ? loading_port.replace(/\(.*?\)\s*/, "")
            : "N/A";
          const cleanPortOfReporting = port_of_reporting
            ? port_of_reporting.replace(/\(.*?\)\s*/, "")
            : "N/A";

          return (
            <div>
              <strong>POL :</strong> {cleanLoadingPort} <br />
              <strong>POD :</strong> {cleanPortOfReporting} <br />
            </div>
          );
        },
      },
      {
        accessorKey: "dates",
        header: "Arrival Date",
        size: 350,
        Cell: ({ cell }) => {
          const { container_nos = [] } = cell.row.original;

          return (
            <div style={{ display: "flex", gap: "20px" }}>
              <strong>Arrival :</strong>
              {container_nos.length > 0
                ? container_nos.map((container, id) => (
                    <React.Fragment key={id}>
                      {container.arrival_date || "N/A"} <br />
                    </React.Fragment>
                  ))
                : "N/A"}{" "}
              {/* Show "N/A" only once if container_nos is empty */}
            </div>
          );
        },
      },
      {
        accessorKey: "free_time",
        header: "Free Time",
        size: 150,
      },
      {
        accessorKey: "detention_from",
        header: "Detention From",
        size: 150,
        Cell: ({ cell }) => {
          const { container_nos = [] } = cell.row.original;

          if (container_nos.length === 0) return "N/A"; // Show "N/A" when empty

          return container_nos.map((container, id) => (
            <React.Fragment key={id}>
              {container.detention_from || "N/A"}
              <br />
            </React.Fragment>
          ));
        },
      },
      {
        accessorKey: "shipping_line_airline",
        header: "Shipping Line",
        size: 200,
      },
      {
        accessorKey: "container_numbers",
        header: "Container Numbers & Size",
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
                </div>
              ))}
            </React.Fragment>
          );
        },
      },
      {
        accessorKey: "no_of_container",
        header: "Number of Containers",
        size: 150,
        Cell: ({ cell }) => {
          const containers = cell.row.original.container_nos || [];

          // Group containers by size
          const groupedContainers = containers.reduce((acc, container) => {
            const size = container.size;
            if (acc[size]) {
              acc[size] += 1;
            } else {
              acc[size] = 1;
            }
            return acc;
          }, {});

          // Create a string like "4x40, 2x20"
          const containerNumbersWithSizes = Object.keys(groupedContainers)
            .map((size) => `${groupedContainers[size]}x${size}`)
            .join(", ");

          return (
            <React.Fragment>
              <span>{containerNumbersWithSizes || "N/A"}</span>
            </React.Fragment>
          );
        },
      },
      {
        accessorKey: "be_no",
        header: "BE Number & Date",
        size: 150, // Adjusted size to fit both BE Number and Date
        Cell: ({ cell }) => {
          const beNumber = cell?.getValue()?.toString();
          const rawBeDate = cell.row.original.be_date;
          const customHouse = cell.row.original.custom_house;

          const beDate = formatDate(rawBeDate);
          const location = getCustomHouseLocation(customHouse);

          return (
            <React.Fragment>
              {beNumber && (
                <React.Fragment>
                  <a
                    href={`https://enquiry.icegate.gov.in/enquiryatices/beTrackIces?BE_NO=${beNumber}&BE_DT=${beDate}&beTrack_location=${location}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {beNumber}
                  </a>

                  {beDate}
                </React.Fragment>
              )}
            </React.Fragment>
          );
        },
      },

      {
        accessorKey: "remarks",
        header: "Remarks",
        size: 350,
        Cell: ({ cell }) => {
          const item = cell.row.original;

          const remarks = `${
            item.discharge_date ? "Discharge Date: " : "ETA: "
          }${item.discharge_date ? item.discharge_date : item.vessel_berthing}${
            item.assessment_date
              ? ` | Assessment Date: ${item.assessment_date}`
              : ""
          }${item.rail_out_date ? ` | Rail-Out: ${item.rail_out_date}` : ""}${
            item.examination_date
              ? ` | Examination Date: ${formatDate(item.examination_date)}`
              : ""
          }${
            item.duty_paid_date
              ? ` | Duty Paid Date: ${formatDate(item.duty_paid_date)}`
              : ""
          }${
            item.out_of_charge
              ? ` | OOC Date: ${formatDate(item.out_of_charge)}`
              : ""
          }${item.sims_reg_no ? ` | SIMS Reg No: ${item.sims_reg_no}` : ""}${
            item.sims_date ? ` | SIMS Reg Date: ${item.sims_date}` : ""
          }${item.pims_reg_no ? ` | PIMS Reg No: ${item.pims_reg_no}` : ""}${
            item.pims_date ? ` | PIMS Reg Date: ${item.pims_date}` : ""
          }${
            item.nfmims_reg_no ? ` | NFMIMS Reg No: ${item.nfmims_reg_no}` : ""
          }${
            item.nfmims_date ? ` | NFMIMS Reg Date: ${item.nfmims_date}` : ""
          }${
            item.obl_telex_bl
              ? ` | ${
                  item.obl_telex_bl === "OBL"
                    ? `ORG-RCVD: ${item.document_received_date}`
                    : `DOC-RCVD: ${item.document_received_date}`
                }`
              : ""
          }${item.do_validity ? ` | DO VALIDITY: ${item.do_validity}` : ""}${
            item.remarks ? ` | Remarks: ${item.remarks}` : ""
          }`;

          return <span>{remarks}</span>;
        },
      },
      {
        accessorKey: "detailed_status",
        header: "Detailed Status",
        size: 150,
      },

      //   {
      //     accessorKey: "arrival_date",
      //     header: "Arrival Date",
      //     size: 150,
      //     Cell: ({ cell }) =>
      //       cell.row.original.container_nos?.map((container, id) => (
      //         <React.Fragment key={id}>
      //           {container.arrival_date}
      //           <br />
      //         </React.Fragment>
      //       )),
      //   },

      //   {
      //     accessorKey: "do_validity",
      //     header: "DO Completed & Validity",
      //     enableSorting: false,
      //     size: 200,
      //     Cell: ({ row }) => {
      //       const doValidity = row.original.do_validity;
      //       const doCompleted = row.original.do_completed;

      //       return (
      //         <div style={{ textAlign: "center" }}>
      //           <div>
      //             <strong>Completed:</strong>{" "}
      //             {doCompleted
      //               ? new Date(doCompleted).toLocaleString("en-US", {
      //                   timeZone: "Asia/Kolkata",
      //                   hour12: true,
      //                 })
      //               : "Not Completed"}
      //           </div>
      //           <div>
      //             <strong>Validity:</strong> {doValidity || "N/A"}
      //           </div>
      //         </div>
      //       );
      //     },
      //   },

      //   {
      //     accessorKey: "cth_documents",
      //     header: "E-sanchit Doc",
      //     enableSorting: false,
      //     size: 180,
      //     Cell: ({ row }) => {
      //       const { cth_documents = [] } = row.original;
      //       // Filter out documents that do not have a document_check_date
      //       const validDocuments = cth_documents.filter(
      //         (doc) => doc.document_check_date
      //       );

      //       return (
      //         <div style={{ textAlign: "left" }}>
      //           {validDocuments.length > 0 ? (
      //             validDocuments.map((doc, index) => (
      //               <div
      //                 key={index}
      //                 style={{
      //                   marginBottom: "5px",
      //                   display: "flex",
      //                   flexDirection: "column",
      //                   alignItems: "flex-start",
      //                 }}
      //               >
      //                 <a
      //                   href={doc.url[0]}
      //                   target="_blank"
      //                   rel="noopener noreferrer"
      //                   style={{
      //                     textDecoration: "none",
      //                     color: "#007bff",
      //                     display: "block",
      //                   }}
      //                 >
      //                   {`${doc.document_name}`}
      //                 </a>
      //                 <div style={{ fontSize: "12px", color: "#555" }}>
      //                   {/* Display the checked date */}
      //                   Checked Date:{" "}
      //                   {new Date(doc.document_check_date).toLocaleDateString()}
      //                 </div>
      //               </div>
      //             ))
      //           ) : (
      //             <div>No Documents Available</div>
      //           )}
      //         </div>
      //       );
      //     },
      //   },
    ],
    [formatDate, getPortLocation, getCustomHouseLocation, handleCopy]
  );

  return columns;
}

export default useCustomerJobList;
