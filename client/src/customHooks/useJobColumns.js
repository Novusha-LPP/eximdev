import React from "react";
import { IconButton } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useNavigate } from "react-router-dom";
function useJobColumns() {
  const navigate = useNavigate();
  // const handleCopy = (event, text) => {
  //   event.stopPropagation();
  //   navigator.clipboard
  //     .writeText(text)
  //     .then(() => {})
  //     .catch((err) => {
  //       console.error("Failed to copy:", err);
  //     });
  // };

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
    {
      accessorKey: "awb_bl_no",
      header: "BL Number",
      size: 200,
      Cell: ({ cell }) => {
        return cell?.getValue()?.toString();
      },
      Cell: ({ cell }) => {
        return (
          <React.Fragment>
            {cell?.getValue()?.toString()}

            <IconButton
              size="small"
              onClick={(event) => {
                handleCopy(event, cell?.getValue()?.toString());
              }}
            >
              <ContentCopyIcon fontSize="inherit" />
            </IconButton>
            <br />
          </React.Fragment>
        );
      },
    },
    {
      accessorKey: "be_no",
      header: "BE Number",
      size: 150,
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
              {container.container_number}
              <IconButton
                size="small"
                onClick={(event) => {
                  handleCopy(event, container.container_number);
                }}
              >
                <ContentCopyIcon fontSize="inherit" />
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
