import React, { useState, useCallback, useMemo } from "react";
import { IconButton, TextField } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShip, faAnchor } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import EditIcon from "@mui/icons-material/Edit";

// Custom hook to manage job columns configuration
function useJobColumns() {
  const navigate = useNavigate();
  const [editETA, setEditETA] = useState(null);
  const [editArrivalDate, setEditArrivalDate] = useState(null);
  const [jobs, setJobs] = useState([]);

  // Optimized handleCopy function using useCallback to avoid re-creation on each render
  // const handleCopy = useCallback((event, text) => {
  //   event.stopPropagation();
  //   navigator.clipboard?.writeText(text).catch((err) => {
  //     console.error("Failed to copy:", err);
  //     alert("Failed to copy text to clipboard.");
  //   });
  // }, []);
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
        header: "Job No",
        size: 100,
        Cell: ({ cell }) => {
          const { job_no, year, type_of_b_e, consignment_type } =
            cell.row.original;
          return (
            <div
              onClick={() => navigate(`/job/${job_no}/${year}`)}
              style={{ cursor: "pointer", color: "blue" }}
            >
              {job_no} <br /> {type_of_b_e} <br /> {consignment_type}
            </div>
          );
        },
      },
      {
        accessorKey: "importer",
        header: "Importer",
        size: 200,
      },
      {
        accessorKey: "custom_house",
        header: "Custom House",
        size: 150,
      },
      {
        accessorKey: "awb_bl_no",
        header: "BL Number",
        size: 200,
        Cell: ({ cell, row }) => {
          const blNumber = cell?.getValue()?.toString();
          const portOfReporting = row?.original?.port_of_reporting;
          const shippingLine = row?.original?.shipping_line_airline;

          // Extract the first container number, if available
          const containerFirst =
            row?.original?.container_nos?.[0]?.container_number;

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
            // Pass both blNumber and containerFirst
            "Trans Asia": `http://182.72.192.230/TASFREIGHT/AppTasnet/ContainerTracking.aspx?&containerno=${containerFirst}&blNo=${blNumber}`,
            "ONE LINE":
              "https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking",
            UNIFEEDER: `https://www.unifeeder.cargoes.com/tracking?ID=${blNumber}`, // Specific example ID
            HMM: "https://www.hmm21.com/e-service/general/trackNTrace/TrackNTrace.do",
            HYUNDI:
              "https://www.hmm21.com/e-service/general/trackNTrace/TrackNTrace.do",
            "Cosco Container Lines":
              "https://elines.coscoshipping.com/ebusiness/cargotracking",
            COSCO: "https://elines.coscoshipping.com/ebusiness/cargotracking",
          };

          // Determine the URL for the specific shipping line
          const shippingLineUrl = shippingLineUrls[shippingLine] || "#";

          return (
            <React.Fragment>
              {blNumber && (
                <React.Fragment>
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

                    {/*{shippingLine && (
                      <abbr title={`Track Shipment at ${shippingLine}`}>
                        <a
                          href={shippingLineUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FontAwesomeIcon
                            icon={faShip}
                            size="1.5x"
                            color="blue"
                          />
                        </a>
                      </abbr>
                    )}*/}

                    {/* Sea IGM Entry Link */}
                    <abbr title={`Sea IGM Entry`}>
                      <a
                        href={`https://enquiry.icegate.gov.in/enquiryatices/seaIgmEntry?IGM_loc_Name=${location}&MAWB_NO=${blNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FontAwesomeIcon
                          icon={faAnchor}
                          size="1.5x"
                          color="blue"
                        />
                      </a>
                    </abbr>
                  </div>
                </React.Fragment>
              )}
            </React.Fragment>
          );
        },
      },
      {
        accessorKey: "vessel_berthing",
        header: "ETA",
        size: 150,
      },
      {
        accessorKey: "discharge_date",
        header: "Discharge Date",
        size: 150,
      },
      {
        accessorKey: "arrival_date",
        header: "Arrival Date",
        size: 150,
        Cell: ({ cell }) =>
          cell.row.original.container_nos?.map((container, id) => (
            <React.Fragment key={id}>
              {container.arrival_date}
              <br />
            </React.Fragment>
          )),
      },
      {
        accessorKey: "be_no",
        header: "BE Number",
        size: 150,
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
                  {" "}
                  <a
                    href={`https://enquiry.icegate.gov.in/enquiryatices/beTrackIces?BE_NO=${beNumber}&BE_DT=${beDate}&beTrack_location=${location}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {beNumber}
                  </a>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={(event) => handleCopy(event, beNumber)}
                    >
                      <abbr title="Copy BE Number">
                        <ContentCopyIcon fontSize="inherit" />
                      </abbr>
                    </IconButton>
                  </div>
                </React.Fragment>
              )}
            </React.Fragment>
          );
        },
      },
      {
        accessorKey: "be_date",
        header: "BE Date",
        size: 150,
      },
      {
        accessorKey: "loading_port",
        header: "Loading Port",
        size: 150,
      },
      {
        accessorKey: "port_of_reporting",
        header: "Port of Discharge",
        size: 150,
      },
      {
        accessorKey: "container_numbers",
        header: "Container Numbers",
        size: 160,
        Cell: ({ cell }) => {
          const containerNos = cell.row.original.container_nos;

          // If container_nos is available, map over it
          if (containerNos) {
            return containerNos.map((container, id) => (
              <React.Fragment key={id}>
                <span style={{ display: "block", marginBottom: "4px" }}>
                  {/* Show the container number if it exists */}
                  <a
                    href={`https://www.ldb.co.in/ldb/containersearch/39/${container.container_number}/1726651147706`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {container.container_number}
                  </a>

                  {/* Show copy icon only if container number exists */}
                  {container.container_number && (
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
                  )}
                </span>
              </React.Fragment>
            ));
          }

          // Return null if container_nos does not exist
          return null;
        },
      },
      {
        accessorKey: "detention_from",
        header: "Detention From",
        size: 150,
        Cell: ({ cell }) =>
          cell.row.original.container_nos?.map((container, id) => (
            <React.Fragment key={id}>
              {container.detention_from}
              <br />
            </React.Fragment>
          )),
      },
    ],
    [formatDate, getPortLocation, getCustomHouseLocation, handleCopy]
  );

  return columns;
}

export default useJobColumns;
