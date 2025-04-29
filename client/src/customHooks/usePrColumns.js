import React, { useEffect, useState, useMemo } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import Autocomplete from "@mui/material/Autocomplete";
import SaveIcon from "@mui/icons-material/Save";
import { calculateColumnWidth } from "../utils/calculateColumnWidth";
import { IconButton, MenuItem, TextField } from "@mui/material";
import axios from "axios";

// Import handleSavePr utility if it's needed elsewhere, but don't use it directly here
// import { handleSavePr } from "../utils/handleSavePr";

function usePrColumns(organisations, containerTypes, locations, truckTypes) {
  const [rows, setRows] = useState([]);
  const [shippingLines, setShippingLines] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false); // Add loading state

  // Create a base URL constant to ensure consistency
  const API_BASE_URL = process.env.REACT_APP_API_STRING;

  const fetchShippingLines = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/get-shipping-line`);
      setShippingLines(
        response.data.data.map((item) => ({
          code: item.code || "",
          name: item.name || "",
        }))
      );
    } catch (error) {
      console.error("❌ Error fetching shipping lines:", error);
    }
  };

  const fetchBranchOptions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/get-port-types`);

      const branchOptionsData = response.data.data
        .filter((item) => item.isBranch)
        .map((item) => ({
          isBranch: item.isBranch,
          label: item.icd_code,
          value: item.icd_code,
          suffix: item.suffix,
          prefix: item.prefix,
        }));

      setBranchOptions(branchOptionsData);
    } catch (error) {
      console.error("❌ Error fetching branch options:", error);
    }
  };

  const handleInputChange = (event, rowIndex, columnId) => {
    const { value } = event.target;

    setRows((prevRows) => {
      const updatedRow = { ...prevRows[rowIndex], [columnId]: value };

      // Handle branch-specific logic
      if (columnId === "branch") {
        const selectedBranch = branchOptions.find(
          (option) => option.value === value
        );

        if (selectedBranch) {
          updatedRow.suffix = selectedBranch.suffix || "";
          updatedRow.prefix = selectedBranch.prefix || "";
          updatedRow.isBranch = selectedBranch.isBranch || "";
        } else {
          updatedRow.suffix = "";
          updatedRow.prefix = "";
          updatedRow.isBranch = false;
        }
      }

      console.log(`🧩 Updated row ${rowIndex}:`, updatedRow);

      // Return updated rows with only the specific row modified
      return prevRows.map((row, index) =>
        index === rowIndex ? updatedRow : row
      );
    });
  };

  // Define getPrData function before using it in handleSavePr
  const getPrData = async (page = 1, limit = 50) => {
    setIsLoading(true);
    try {
      // Use axios for consistency instead of fetch
      const response = await axios.get(
        `${API_BASE_URL}/get-pr-data/all?page=${page}&limit=${limit}`,
        { timeout: 10000 } // Add timeout to prevent hanging requests
      );

      if (response.status === 200) {
        const res = response.data;

        setRows(res.data);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setCurrentPage(res.currentPage);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ Error fetching PR data:", error);

      // More descriptive error handling
      if (error.code === "ERR_CONNECTION_REFUSED") {
        alert(
          "Unable to connect to the server. Please check your network or server status."
        );
      } else if (error.code === "ECONNABORTED") {
        alert("Request timed out. The server may be under heavy load.");
      } else {
        alert(`Failed to load PR data: ${error.message}`);
      }

      // Initialize with empty data to prevent UI errors
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePr = async (rowIndex) => {
    const row = rows[rowIndex];
    console.log("💾 Preparing to save row:", row);

    const errors = [];

    // Validation logic
    if (row.branch === "") {
      errors.push("Please select branch");
    }
    if (row.consignor === "") {
      errors.push("Please select consignor");
    }
    if (row.consignee === "") {
      errors.push("Please select consignee");
    }
    if (
      !row.container_count ||
      isNaN(row.container_count) ||
      Number(row.container_count) <= 0
    ) {
      errors.push(
        "Invalid container count. Container count must be a positive number."
      );
    }

    if (errors.length > 0) {
      console.error("❌ Validation Errors:", errors);
      alert(errors.join("\\n"));
      return;
    }

    try {
      setIsLoading(true);
      console.log("🚀 Sending POST /update-pr with payload:", row);

      const res = await axios.post(
        `${API_BASE_URL}/update-pr`,
        row,
        { timeout: 10000 } // Add timeout
      );

      console.log("✅ API Response:", res.data);
      alert(res.data.message);

      // Refresh data with error handling
      try {
        await getPrData(currentPage, 50);
      } catch (refreshError) {
        console.error("Failed to refresh data after save:", refreshError);
        // Data refresh failed, but save was successful, so don't alert again
      }
    } catch (error) {
      console.error("❌ Error while saving PR:", error);

      if (error.code === "ERR_CONNECTION_REFUSED") {
        alert(
          "Unable to connect to the server. Your changes may not have been saved."
        );
      } else if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        alert(
          `Save failed: ${
            error.response.data.message || error.response.statusText
          }`
        );
      } else if (error.request) {
        // The request was made but no response was received
        alert("No response from server. Please check your network connection.");
      } else {
        // Something happened in setting up the request
        alert(`Failed to save PR: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      try {
        await getPrData(1, 50);
        await fetchShippingLines();
        await fetchBranchOptions();
      } catch (error) {
        console.error("Error during initialization:", error);
      }
    };

    initializeData();
  }, []);

  const handleDeletePr = async (pr_no) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this PR?"
    );

    if (confirmDelete) {
      setIsLoading(true);
      try {
        const res = await axios.post(
          `${API_BASE_URL}/delete-pr`,
          { pr_no },
          { timeout: 10000 }
        );

        alert(res.data.message);
        await getPrData(currentPage, 50);
      } catch (error) {
        console.error("❌ Error deleting PR:", error);
        alert(`Failed to delete PR: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    getPrData(page, 50);
  };

  const columns = [
    {
      accessorKey: "delete",
      enableSorting: false,
      enableGrouping: false,
      size: 50,
      Cell: ({ row }) => (
        <IconButton
          onClick={() => handleDeletePr(row.original.pr_no)}
          disabled={isLoading}
        >
          <DeleteIcon
            sx={{ color: "#BE3838", cursor: "pointer", fontSize: "18px" }}
          />
        </IconButton>
      ),
    },
    {
      accessorKey: "import_export",
      header: "Imp/Exp",
      enableSorting: false,
      size: 100,
      Cell: ({ cell, row }) => {
        const currentValue = rows[row.index]?.import_export || "";

        let options = [];
        if (currentValue === "Import") {
          options = ["Export"];
        } else if (currentValue === "Export") {
          options = ["Import"];
        } else {
          options = ["Import", "Export"];
        }

        return (
          <TextField
            select
            fullWidth
            size="small"
            value={currentValue}
            onChange={(event) => {
              handleInputChange(event, row.index, cell.column.id);
            }}
            placeholder="Select Imp/Exp"
            disabled={isLoading}
          >
            {currentValue && (
              <MenuItem value={currentValue} disabled>
                {currentValue}
              </MenuItem>
            )}

            {options.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        );
      },
    },
    {
      accessorKey: "branch",
      header: "Branch",
      enableSorting: false,
      size: 150,
      Cell: ({ cell, row }) =>
        !row.original.pr_no ? (
          <Autocomplete
            fullWidth
            disablePortal={false}
            options={branchOptions}
            getOptionLabel={(option) => option.label || ""}
            value={
              branchOptions.find(
                (option) => option.value === rows[row.index]?.branch
              ) || null
            }
            onChange={(_, newValue) =>
              handleInputChange(
                { target: { value: newValue?.value || "" } },
                row.index,
                cell.column.id
              )
            }
            renderInput={(params) => <TextField {...params} size="small" />}
            disabled={isLoading}
          />
        ) : (
          cell.getValue()
        ),
    },
    {
      accessorKey: "container_count",
      header: "Container Count",
      enableSorting: false,
      size: calculateColumnWidth(rows, "container_count"),
      Cell: ({ cell, row }) => (
        <TextField
          sx={{ width: "100%" }}
          size="small"
          value={rows[row.index]?.container_count || ""}
          onChange={(event) =>
            handleInputChange(event, row.index, cell.column.id)
          }
          disabled={isLoading}
        />
      ),
    },
    {
      accessorKey: "container_type",
      header: "Container Type",
      enableSorting: false,
      size: calculateColumnWidth(rows, "container_type"),
      Cell: ({ cell, row }) => (
        <Autocomplete
          fullWidth
          disablePortal={false}
          options={containerTypes}
          getOptionLabel={(option) => option.container_type || ""}
          value={
            containerTypes.find(
              (type) => type.container_type === rows[row.index]?.container_type
            ) || null
          }
          onChange={(_, newValue) =>
            handleInputChange(
              { target: { value: newValue?.container_type || "" } },
              row.index,
              cell.column.id
            )
          }
          renderInput={(params) => <TextField {...params} size="small" />}
          disabled={isLoading}
        />
      ),
    },
    {
      accessorKey: "consignor",
      header: "Consignor",
      enableSorting: false,
      size: calculateColumnWidth(rows, "consignor"),
      Cell: ({ cell, row }) => {
        const currentValue = rows[row.index]?.consignor || "";
        const selectedOption = organisations.find(
          (org) => org === currentValue
        );

        return (
          <Autocomplete
            fullWidth
            disablePortal={false}
            options={organisations}
            getOptionLabel={(option) => option || ""}
            value={selectedOption || currentValue}
            onChange={(_, newValue) => {
              handleInputChange(
                { target: { value: newValue || "" } },
                row.index,
                cell.column.id
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="Select or enter consignor"
              />
            )}
            freeSolo
            disabled={isLoading}
          />
        );
      },
    },
    {
      accessorKey: "consignee",
      header: "Consignee",
      enableSorting: false,
      size: calculateColumnWidth(rows, "consignee"),
      Cell: ({ cell, row }) => {
        const currentValue = rows[row.index]?.consignee || "";
        const selectedOption = organisations.find(
          (org) => org === currentValue
        );

        return (
          <Autocomplete
            fullWidth
            disablePortal={false}
            options={organisations}
            getOptionLabel={(option) => option || ""}
            value={selectedOption || currentValue}
            onChange={(_, newValue) => {
              handleInputChange(
                { target: { value: newValue || "" } },
                row.index,
                cell.column.id
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="Select or enter consignee"
              />
            )}
            freeSolo
            disabled={isLoading}
          />
        );
      },
    },
    {
      accessorKey: "shipping_line",
      header: "Shipping Line",
      enableSorting: false,
      size: calculateColumnWidth(rows, "shipping_line"),
      Cell: ({ cell, row }) => {
        const currentValue = rows[row.index]?.shipping_line || "";
        const selectedOption = shippingLines.find(
          (line) => line.code === currentValue
        );

        return (
          <Autocomplete
            fullWidth
            disablePortal={false}
            options={shippingLines}
            getOptionLabel={(option) => option.name || ""}
            value={selectedOption || { name: currentValue }}
            onChange={(_, newValue) => {
              handleInputChange(
                { target: { value: newValue?.code || "" } },
                row.index,
                cell.column.id
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="Select or enter shipping line"
              />
            )}
            freeSolo
            disabled={isLoading}
          />
        );
      },
    },
    {
      accessorKey: "do_validity",
      header: "DO Validity",
      enableSorting: false,
      size: calculateColumnWidth(rows, "do_validity"),
      Cell: ({ cell, row }) => {
        const currentValue = rows[row.index]?.do_validity || "";
        return (
          <TextField
            type="datetime-local"
            sx={{ width: "100%" }}
            size="small"
            value={currentValue}
            onChange={(event) =>
              handleInputChange(event, row.index, cell.column.id)
            }
            disabled={isLoading}
          />
        );
      },
    },
    {
      accessorKey: "goods_pickup",
      header: "Goods Pickup",
      enableSorting: false,
      size: calculateColumnWidth(rows, "goods_pickup"),
      Cell: ({ cell, row }) => (
        <Autocomplete
          fullWidth
          disablePortal={false}
          options={locations}
          getOptionLabel={(option) => option}
          value={rows[row.index]?.goods_pickup || null}
          onChange={(_, newValue) =>
            handleInputChange(
              { target: { value: newValue || "" } },
              row.index,
              cell.column.id
            )
          }
          renderInput={(params) => <TextField {...params} size="small" />}
          disabled={isLoading}
        />
      ),
    },
    {
      accessorKey: "goods_delivery",
      header: "Goods Delivery",
      enableSorting: false,
      size: calculateColumnWidth(rows, "goods_delivery"),
      Cell: ({ cell, row }) => (
        <Autocomplete
          fullWidth
          disablePortal={false}
          options={locations}
          getOptionLabel={(option) => option}
          value={rows[row.index]?.goods_delivery || null}
          onChange={(_, newValue) =>
            handleInputChange(
              { target: { value: newValue || "" } },
              row.index,
              cell.column.id
            )
          }
          renderInput={(params) => <TextField {...params} size="small" />}
          disabled={isLoading}
        />
      ),
    },
    {
      accessorKey: "container_offloading",
      header: "Container Offloading",
      enableSorting: false,
      size: calculateColumnWidth(rows, "container_offloading"),
      Cell: ({ cell, row }) => (
        <Autocomplete
          fullWidth
          disablePortal={false}
          options={locations}
          getOptionLabel={(option) => option}
          value={rows[row.index]?.container_offloading || null}
          onChange={(_, newValue) =>
            handleInputChange(
              { target: { value: newValue || "" } },
              row.index,
              cell.column.id
            )
          }
          renderInput={(params) => <TextField {...params} size="small" />}
          disabled={isLoading}
        />
      ),
    },
    {
      accessorKey: "container_loading",
      header: "Container Loading",
      enableSorting: false,
      size: calculateColumnWidth(rows, "container_loading"),
      Cell: ({ cell, row }) => (
        <Autocomplete
          fullWidth
          disablePortal={false}
          options={locations}
          getOptionLabel={(option) => option}
          value={rows[row.index]?.container_loading || null}
          onChange={(_, newValue) =>
            handleInputChange(
              { target: { value: newValue || "" } },
              row.index,
              cell.column.id
            )
          }
          renderInput={(params) => <TextField {...params} size="small" />}
          disabled={isLoading}
        />
      ),
    },
    {
      accessorKey: "type_of_vehicle",
      header: "Type of Vehicle",
      enableSorting: false,
      size: 200,
      Cell: ({ cell, row }) => (
        <TextField
          select
          sx={{ width: "100%" }}
          size="small"
          value={cell.getValue() || ""}
          onChange={(event) =>
            handleInputChange(event, row.index, cell.column.id)
          }
          disabled={isLoading}
        >
          {truckTypes?.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </TextField>
      ),
    },
    {
      accessorKey: "document_no",
      header: "Document No",
      enableSorting: false,
      size: calculateColumnWidth(rows, "document_no"),
      Cell: ({ cell, row }) => (
        <TextField
          sx={{ width: "100%" }}
          size="small"
          value={rows[row.index]?.document_no || ""}
          onChange={(event) =>
            handleInputChange(event, row.index, cell.column.id)
          }
          disabled={isLoading}
        />
      ),
    },
    {
      accessorKey: "document_date",
      header: "Document Date",
      enableSorting: false,
      size: calculateColumnWidth(rows, "document_date"),
      Cell: ({ cell, row }) => (
        <TextField
          type="date"
          sx={{ width: "100%" }}
          size="small"
          value={rows[row.index]?.document_date || ""}
          onChange={(event) =>
            handleInputChange(event, row.index, cell.column.id)
          }
          disabled={isLoading}
        />
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      enableSorting: false,
      size: calculateColumnWidth(rows, "description"),
      Cell: ({ cell, row }) => {
        const currentValue = rows[row.index]?.description || "";
        return (
          <TextField
            sx={{ width: "100%" }}
            size="small"
            value={currentValue}
            onChange={(event) =>
              handleInputChange(event, row.index, cell.column.id)
            }
            disabled={isLoading}
          />
        );
      },
    },
    {
      accessorKey: "instructions",
      header: "Instructions",
      enableSorting: false,
      size: calculateColumnWidth(rows, "instructions"),
      Cell: ({ cell, row }) => {
        const currentValue = rows[row.index]?.instructions || "";
        return (
          <TextField
            sx={{ width: "100%" }}
            size="small"
            value={currentValue}
            onChange={(event) =>
              handleInputChange(event, row.index, cell.column.id)
            }
            disabled={isLoading}
          />
        );
      },
    },
    {
      accessorKey: "pr_no",
      header: "PR No",
      enableSorting: false,
      size: 150,
    },
    {
      accessorKey: "pr_date",
      header: "PR Date",
      enableSorting: false,
      size: 100,
    },
    {
      accessorKey: "action",
      header: "Save",
      enableSorting: false,
      size: 100,
      Cell: ({ cell, row }) => (
        <IconButton
          onClick={() => handleSavePr(row.index)}
          disabled={isLoading}
        >
          <SaveIcon sx={{ color: "#015C4B" }} />
        </IconButton>
      ),
    },
  ];

  return {
    rows,
    setRows,
    columns,
    totalPages,
    currentPage,
    handlePageChange,
    isLoading,
  };
}

export default usePrColumns;
