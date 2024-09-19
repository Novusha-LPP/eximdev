import React from "react";
import { IconButton } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShip, faTrainSubway } from "@fortawesome/free-solid-svg-icons";
function useJobColumns() {
  const navigate = useNavigate();
  const handleCopy = (event, text) => {
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
  const columns = [
    {
      accessorKey: "job_no",
      header: "Job No",
      size: 100,
      Cell: ({ cell }) => {
        const { job_no, year, type_of_b_e, consignment_type } =
          cell.row.original;

        // Add console.log here to debug

        return (
          <div
            onClick={() => navigate(`/job/${job_no}/${year}`)}
            style={{ cursor: "pointer", color: "blue" }}
          >
            {job_no} <br />
            {type_of_b_e} <br />
            {consignment_type}
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
    // {
    //   accessorKey: "awb_bl_no",
    //   header: "BL Number",
    //   size: 200,
    //   Cell: ({ cell }) => {
    //     const blNumber = cell?.getValue()?.toString();

    //     return (
    //       <React.Fragment>
    //         <a
    //           href={`https://enquiry.icegate.gov.in/enquiryatices/blStatusIces?mawbNo=${blNumber}&HAWB_NO=`}
    //           target="_blank"
    //           rel="noopener noreferrer"
    //         >
    //           {" "}
    //           {blNumber ? blNumber : ""}
    //         </a>

    //         <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
    //           <IconButton
    //             size="small"
    //             onPointerOver={(e) => (e.target.style.cursor = "pointer")}
    //             onClick={(event) => {
    //               handleCopy(event, blNumber);
    //             }}
    //           >
    //             <abbr title="Copy BL Number">
    //               <ContentCopyIcon fontSize="inherit" />
    //             </abbr>
    //           </IconButton>

    //           {/* Ship icon */}
    //           <abbr title="Sea IGM Entry">
    //             <a
    //               href={`https://enquiry.icegate.gov.in/enquiryatices/seaIgmEntry`}
    //               target="_blank"
    //               rel="noopener noreferrer"
    //             >
    //               <FontAwesomeIcon icon={faShip} size="1.5x" color="blue" />
    //             </a>
    //           </abbr>

    //           {/* Train icon, dynamic BL number */}
    //           {/* <abbr title="BL Status ICES">
    //             <a
    //               href={`https://enquiry.icegate.gov.in/enquiryatices/blStatusIces?mawbNo=${blNumber}&HAWB_NO=`}
    //               target="_blank"
    //               rel="noopener noreferrer"
    //             >
    //               <FontAwesomeIcon icon={faTrainSubway} size="1x" color="red" />
    //             </a>
    //           </abbr> */}
    //         </div>

    //         <br />
    //       </React.Fragment>
    //     );
    //   },
    // },
    {
      accessorKey: "awb_bl_no",
      header: "BL Number",
      size: 200,
      Cell: ({ cell, row }) => {
        const blNumber = cell?.getValue()?.toString();
        const portOfReporting = row?.original?.port_of_reporting; // Assuming this data comes in the network response

        // Map of port_of_reporting to full port name

        const location =
          portOfReporting === "(INMUN1) Mundra Sea"
            ? "MUNDRA SEA (INMUN1)"
            : portOfReporting === "(INNSA1) Nhava Sheva Sea"
            ? "NHAVA SHEVA SEA (INNSA1)"
            : portOfReporting === "(INPAV1) Pipavav"
            ? "PIPAVAV - VICTOR PORT GUJARAT SEA (INPAV1)"
            : portOfReporting === "(INPAV6) Pipavav (Victor) Port"
            ? "PIPAVAV - VICTOR PORT GUJARAT SEA (INPAV1)"
            : portOfReporting === "(INHZA1) Hazira"
            ? "HAZIRA PORT SURAT (INHZA1)"
            : portOfReporting;

        return (
          <React.Fragment>
            <a
              href={`https://enquiry.icegate.gov.in/enquiryatices/blStatusIces?mawbNo=${blNumber}&HAWB_NO=`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {blNumber ? blNumber : ""}
            </a>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <IconButton
                size="small"
                onPointerOver={(e) => (e.target.style.cursor = "pointer")}
                onClick={(event) => {
                  handleCopy(event, blNumber);
                }}
              >
                <abbr title="Copy BL Number">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>

              {/* Ship icon with dynamic IGM location */}
              <abbr title={`Sea IGM Entry`}>
                <a
                  href={`https://enquiry.icegate.gov.in/enquiryatices/seaIgmEntry?IGM_loc_Name=${location}&MAWB_NO=${blNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FontAwesomeIcon icon={faShip} size="1.5x" color="blue" />
                </a>
              </abbr>
            </div>

            <br />
          </React.Fragment>
        );
      },
    },
    {
      accessorKey: "be_no",
      header: "BE Number",
      size: 150,
      Cell: ({ cell }) => {
        const beNumber = cell?.getValue()?.toString();
        const rawBeDate = cell.row.original.be_date;
        const customHouse = cell.row.original.custom_house;

        // Function to format date to YYYY/MM/DD
        const formatDate = (dateStr) => {
          const date = new Date(dateStr);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          return `${year}/${month}/${day}`;
        };

        // Format the date
        const beDate = formatDate(rawBeDate);

        // Conditionally set the location
        const location =
          customHouse === "ICD SACHANA"
            ? "SACHANA ICD (INJKA6)"
            : customHouse === "ICD SANAND"
            ? "THAR DRY PORT ICD/AHMEDABAD GUJARAT ICD (INSAU6)"
            : customHouse === "ICD KHODIYAR"
            ? "AHEMDABAD ICD (INSBI6)"
            : customHouse;

        return (
          <React.Fragment>
            <a
              href={`https://enquiry.icegate.gov.in/enquiryatices/beTrackIces?BE_NO=${beNumber}&BE_DT=${beDate}&beTrack_location=${location}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {beNumber}
            </a>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <IconButton
                size="small"
                onPointerOver={(e) => (e.target.style.cursor = "pointer")}
                onClick={(event) => {
                  handleCopy(event, beNumber);
                }}
              >
                <abbr title="Copy BE Number">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </div>
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
      Cell: ({ cell }) =>
        cell.row.original.container_nos?.map((container, id) => (
          <React.Fragment key={id}>
            <span style={{ display: "block", marginBottom: "4px" }}>
              <a
                href={`https://www.ldb.co.in/ldb/containersearch/39/${container.container_number}/1726651147706`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {container.container_number}
              </a>
              <IconButton
                size="small"
                onPointerOver={(e) => (e.target.style.cursor = "pointer")}
                onClick={(event) => {
                  handleCopy(event, container.container_number);
                }}
              >
                <abbr title="Copy Container Number">
                  <ContentCopyIcon fontSize="inherit" />
                </abbr>
              </IconButton>
            </span>
          </React.Fragment>
        )),
      filterFn: "includes",
      accessorFn: (row) =>
        row.container_nos
          ?.map((container) => container.container_number)
          .join(", "),
    },
    {
      accessorKey: "vessel_berthing",
      header: "ETA",
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
  ];

  return columns;
}

export default useJobColumns;
