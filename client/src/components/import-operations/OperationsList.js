import React, { useState, useCallback, useMemo } from "react";
import "../../styles/import-dsr.scss";
import { MenuItem, TextField, IconButton } from "@mui/material";
import axios from "axios";
import {
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { UserContext } from "../../contexts/UserContext";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

function OperationsList() {
  const [years, setYears] = React.useState([]);
  const [selectedYear, setSelectedYear] = React.useState("");
  const [rows, setRows] = React.useState([]);
  const { user } = React.useContext(UserContext);

  React.useEffect(() => {
    async function getYears() {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-years`
      );
      const filteredYears = res.data.filter((year) => year !== null);
      setYears(filteredYears);
      setSelectedYear(filteredYears[0]);
    }
    getYears();
  }, []);

  React.useEffect(() => {
    async function getRows() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-operations-planning-list/${user.username}`
        );

        // Filter jobs
        const filteredJobs = res.data
          .filter((job) => {
            // 1. Job should have a `be_no`
            if (!job.be_no) {
              return false;
            }

            // 2. `be_no` should not be "cancelled" (case-insensitive)
            if (job.be_no.toLowerCase() === "cancelled") {
              // console.log(`Job ${job.job_no} is cancelled`);
              return false;
            }

            // 3. Exclude jobs where any container has an `arrival_date`
            const anyContainerArrivalDate = job.container_nos?.some(
              (container) => container.arrival_date
            );
            if (anyContainerArrivalDate) {
              // console.log(
              //   `Job ${job.job_no} has container(s) with arrival_date`
              // );
              return false;
            }

            // 4. Exclude jobs that have `out_of_charge` truthy
            if (job.out_of_charge) {
              // console.log(`Job ${job.job_no} has out_of_charge as truthy`);
              return false;
            }

            return true; // Keep the job if none of the above conditions apply
          })
          .sort((a, b) => new Date(a.be_date) - new Date(b.be_date)); // Sort by BE Date in ascending order

        setRows(filteredJobs); // Set the filtered and sorted jobs
      } catch (error) {
        console.error("Error fetching jobs:", error);
      }
    }

    getRows();
  }, [selectedYear, user]);

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

  const formatDate = useCallback((dateStr) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}/${month}/${day}`;
  }, []);

  const columns = [
    {
      accessorKey: "job_no",
      header: "Job No",
      enableSorting: false,
      size: 100,
    },
    {
      accessorKey: "be_no",
      header: "BE Number and Date",
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
    // {
    //   accessorKey: "be_date",
    //   header: "BE Date",
    //   enableSorting: false,
    //   size: 120,
    //   Cell: ({ cell }) => (
    //     <div style={{ textAlign: "center" }}>{cell.getValue()}</div>
    //   ),
    // },
    {
      accessorKey: "importer",
      header: "Importer Name", // Add importer column
      enableSorting: false,
      size: 150,
      Cell: ({ cell }) => (
        <div style={{ textAlign: "center" }}>{cell.getValue()}</div>
      ),
    },
    {
      accessorKey: "custom_house",
      header: "ICD Code",
      enableSorting: false,
      size: 150,
      Cell: ({ cell }) => (
        <div style={{ textAlign: "center" }}>{cell.getValue()}</div>
      ),
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
  ];

  const table = useMaterialReactTable({
    columns,
    data: rows,
    enableColumnResizing: true,
    enableColumnOrdering: true,
    enableDensityToggle: false, // Disable density toggle
    initialState: { density: "compact", showGlobalFilter: true }, // Set initial table density to compact
    enableGlobalFilter: true,
    enableGrouping: true, // Enable row grouping
    enableColumnFilters: false, // Disable column filters
    enableColumnActions: false,
    enableStickyHeader: true, // Enable sticky header
    enablePinning: true, // Enable pinning for sticky columns
    enablePagination: false,
    enableBottomToolbar: false,
    muiTableContainerProps: {
      sx: { maxHeight: "580px", overflowY: "auto" },
    },
    muiTableHeadCellProps: {
      sx: {
        position: "sticky",
        top: 0,
        zIndex: 1,
      },
    },
  });

  return (
    <>
      <TextField
        select
        size="small"
        margin="normal"
        variant="outlined"
        label="Select Year"
        value={selectedYear}
        onChange={(e) => setSelectedYear(e.target.value)}
        sx={{ width: "200px" }}
      >
        {years?.map((year) => {
          return (
            <MenuItem key={year} value={year}>
              {year}
            </MenuItem>
          );
        })}
      </TextField>

      <MaterialReactTable table={table} />
    </>
  );
}

export default React.memo(OperationsList);
