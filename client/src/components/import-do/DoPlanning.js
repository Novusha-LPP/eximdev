import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import DoPlanningContainerTable from "./DoPlanningContainerTable";
import { useNavigate } from "react-router-dom";
import { IconButton } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

function DoPlanning() {
  const [rows, setRows] = useState([]);
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

  useEffect(() => {
    async function getData() {
      const res = await axios(
        `${process.env.REACT_APP_API_STRING}/get-do-module-jobs`
      );
      setRows(res.data);
    }
    getData();
  }, []);

  const columns = [
    {
      accessorKey: "job_no",
      header: "Job Number",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "importer",
      header: "Party",
      enableSorting: false,
      size: 250,
      Cell: ({ cell }) => {
        return (
          <React.Fragment>
            {cell?.getValue()?.toString()}

            <IconButton
              size="small"
              onPointerOver={(e) => (e.target.style.cursor = "pointer")}
              onClick={(event) => {
                handleCopy(event, cell?.getValue()?.toString());
              }}
            >
              <abbr title="Copy Party Name">
                <ContentCopyIcon fontSize="inherit" />
              </abbr>
            </IconButton>
            <br />
          </React.Fragment>
        );
      },
    },
    {
      accessorKey: "importer_address",
      header: "Address",
      enableSorting: false,
      size: 250,
      Cell: ({ cell }) => {
        return (
          <React.Fragment>
            {cell?.getValue()?.toString()}

            <IconButton
              size="small"
              onPointerOver={(e) => (e.target.style.cursor = "pointer")}
              onClick={(event) => {
                handleCopy(event, cell?.getValue()?.toString());
              }}
            >
              <abbr title="Copy Party Address">
                <ContentCopyIcon fontSize="inherit" />
              </abbr>
            </IconButton>
            <br />
          </React.Fragment>
        );
      },
    },
    {
      accessorKey: "awb_bl_no",
      header: "BL Number",
      enableSorting: false,
      size: 200,
      Cell: ({ cell }) => {
        return (
          <React.Fragment>
            {cell?.getValue()?.toString()}

            <IconButton
              size="small"
              onPointerOver={(e) => (e.target.style.cursor = "pointer")}
              onClick={(event) => {
                handleCopy(event, cell?.getValue()?.toString());
              }}
            >
              <abbr title="Copy BL Number">
                <ContentCopyIcon fontSize="inherit" />
              </abbr>
            </IconButton>
            <br />
          </React.Fragment>
        );
      },
    },
    {
      accessorKey: "shipping_line_airline",
      header: "Shipping Line",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "custom_house",
      header: "Custom House",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "obl_telex_bl",
      header: "OBL Telex BL",
      enableSorting: false,
      size: 100,
    },
    {
      accessorKey: "do_validity_upto_job_level",
      header: "DO Validity",
      enableSorting: false,
      size: 150,
      Cell: ({ cell, row }) => {
        const jobLevelDate = cell.getValue(); // "do_validity_upto_job_level"
        const containerLevelDate =
          row.original.container_nos?.[0]?.required_do_validity_upto || "";

        // Parse dates into JavaScript Date objects
        const jobDate = new Date(jobLevelDate);
        const containerDate = new Date(containerLevelDate);

        // Determine the date to display: the later one
        const isContainerDateHigher = containerDate > jobDate;
        const displayDate = isContainerDateHigher
          ? containerLevelDate
          : jobLevelDate;

        // Calculate the difference in days if container date is higher
        const dayDifference = isContainerDateHigher
          ? Math.ceil((containerDate - jobDate) / (1000 * 60 * 60 * 24))
          : 0;

        return (
          <div
            style={{
              backgroundColor: isContainerDateHigher ? "#d1e7dd" : "inherit", // Green if container date is higher
              padding: "8px",
              borderRadius: "4px",
            }}
          >
            {displayDate}{" "}
            {isContainerDateHigher && <span>(+{dayDifference} days)</span>}
          </div>
        );
      },
    },

    {
      accessorKey: "vessel_flight",
      header: "Vessel",
      enableSorting: false,
      size: 100,
      Cell: ({ cell }) => {
        return (
          <React.Fragment>
            {cell?.getValue()?.toString()}

            <IconButton
              size="small"
              onPointerOver={(e) => (e.target.style.cursor = "pointer")}
              onClick={(event) => {
                handleCopy(event, cell?.getValue()?.toString());
              }}
            >
              <abbr title="Copy Vessel">
                <ContentCopyIcon fontSize="inherit" />
              </abbr>
            </IconButton>
            <br />
          </React.Fragment>
        );
      },
    },
    {
      accessorKey: "voyage_no",
      header: "Voyage No",
      enableSorting: false,
      size: 100,
      Cell: ({ cell }) => {
        return (
          <React.Fragment>
            {cell?.getValue()?.toString()}

            <IconButton
              size="small"
              onPointerOver={(e) => (e.target.style.cursor = "pointer")}
              onClick={(event) => {
                handleCopy(event, cell?.getValue()?.toString());
              }}
            >
              <abbr title="Copy Voyage Number">
                <ContentCopyIcon fontSize="inherit" />
              </abbr>
            </IconButton>
            <br />
          </React.Fragment>
        );
      },
    },
  ];

  const table = useMaterialReactTable({
    columns,
    data: rows,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enableDensityToggle: false, // Disable density toggle
    initialState: {
      density: "compact",
    }, // Set initial table density to compact
    enableGrouping: true, // Enable row grouping
    enableColumnFilters: false, // Disable column filters
    enableColumnActions: false,
    enablePagination: false,
    enableBottomToolbar: false,
    enableExpandAll: false,
    muiTableContainerProps: {
      sx: { maxHeight: "650px", overflowY: "auto" },
    },
    muiTableBodyRowProps: ({ row }) => ({
      className: getTableRowsClassname(row),
      onClick: () => navigate(`/edit-do-planning/${row.original._id}`), // Navigate on row click
      style: { cursor: "pointer" }, // Change cursor to pointer on hover
    }),
    renderDetailPanel: ({ row }) => {
      return (
        <div style={{ padding: "0 !important" }}>
          <DoPlanningContainerTable
            job_no={row.original.job_no}
            year={row.original.year}
          />
        </div>
      );
    },
  });

  const getTableRowsClassname = (params) => {
    const status = params.original.payment_made;
    if (status !== "No" && status !== undefined) {
      return "payment_made";
    } else {
      return "";
    }
  };

  return (
    <>
      <div style={{ height: "80%" }}>
        <MaterialReactTable table={table} />
      </div>
    </>
  );
}

export default React.memo(DoPlanning);
