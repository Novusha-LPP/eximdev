import React, { useState } from "react";
import { IconButton, TextField } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShip, faTrainSubway } from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import EditIcon from "@mui/icons-material/Edit";
function useJobColumns() {
  const navigate = useNavigate();
  // State to track editable fields
  const [editETA, setEditETA] = useState(null);
  const [editArrivalDate, setEditArrivalDate] = useState(null);
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
  // Handle API patch request
  // Handle API patch request for updating fields
  const handlePatchRequest = async (
    jobId,
    updatedData,
    containerIndex = null
  ) => {
    try {
      // Construct the PATCH request URL with year and job ID
      // const url = `/api/update-job/fields/${updatedData.year}/${jobId}`;

      // Build the patch data dynamically, only including the field to be updated
      const patchData = {};
      if (updatedData.vessel_berthing) {
        patchData.vessel_berthing = updatedData.vessel_berthing;
      }
      if (updatedData.arrival_date && typeof containerIndex === "number") {
        patchData.arrival_date = updatedData.arrival_date;
        patchData.container_index = containerIndex; // Include container index for arrival_date updates
      }

      // Send the PATCH request to the backend API
      await axios.patch(
        `${process.env.REACT_APP_API_STRING}/update-job/fields/${updatedData.year}/${jobId}`,
        patchData
      );
      console.log("Patch request successful", patchData);
    } catch (error) {
      console.error("Error with patch request", error);
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
      accessorKey: "vessel_berthing",
      header: "ETA",
      size: 150,
      Cell: ({ cell }) => {
        const eta = cell.getValue();
        const jobId = cell.row.original.job_no;
        const year = cell.row.original.year; // Fetch the year from the original row data

        return editETA === jobId ? (
          <TextField
            type="date"
            defaultValue={eta}
            onBlur={(e) => {
              setEditETA(null);
              handlePatchRequest(jobId, {
                year,
                vessel_berthing: e.target.value,
              });
            }}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center" }}>
            {eta}
            <IconButton
              size="small"
              onClick={() => setEditETA(jobId)}
              style={{ marginLeft: "8px" }}
            >
              <EditIcon fontSize="inherit" />
            </IconButton>
          </div>
        );
      },
    },
    {
      accessorKey: "arrival_date",
      header: "Arrival Date",
      size: 150,
      Cell: ({ cell }) => {
        const containers = cell.row.original.container_nos;
        const jobId = cell.row.original.job_no;
        const year = cell.row.original.year; // Fetch the year from the original row data

        return containers?.map((container, index) => {
          const arrivalDate = container.arrival_date;

          return editArrivalDate === `${jobId}-${index}` ? (
            <div key={index}>
              <TextField
                type="date"
                defaultValue={arrivalDate}
                onBlur={(e) => {
                  setEditArrivalDate(null);
                  handlePatchRequest(
                    jobId,
                    { year, arrival_date: e.target.value },
                    index // Pass the container index to update the correct container
                  );
                }}
              />
            </div>
          ) : (
            <div key={index} style={{ display: "flex", alignItems: "center" }}>
              {arrivalDate}
              <IconButton
                size="small"
                onClick={() => setEditArrivalDate(`${jobId}-${index}`)}
                style={{ marginLeft: "8px" }}
              >
                <EditIcon fontSize="inherit" />
              </IconButton>
            </div>
          );
        });
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
