import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import Autocomplete from "@mui/material/Autocomplete";
import { IconButton, MenuItem, TextField } from "@mui/material";
import axios from "axios";
import { calculateColumnWidth } from "../utils/calculateColumnWidth";

function usePrColumns(organisations, containerTypes, locations, truckTypes) {
  const [rows, setRows] = useState([]);
  const [shippingLines, setShippingLines] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_STRING;

  // Optimize data fetching
  const getPrData = useCallback(
    async (page = 1, limit = 50) => {
      setIsLoading(true);

      try {
        const response = await axios.get(`${API_BASE_URL}/get-pr-data/all`, {
          params: { page, limit },
          timeout: 10000,
        });

        const res = response.data;

        setRows(res.data);
        setTotal(res.total || 0);
        setTotalPages(res.totalPages || 0);
        setCurrentPage(res.currentPage || page);

        console.log("✅ PR data loaded successfully:", res);
      } catch (error) {
        console.error("❌ Error fetching PR data:", error);
        if (error.code === "ERR_NETWORK") {
          alert(
            "Network error: Could not connect to the server. Please try again later."
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
    [API_BASE_URL]
  );

  // Memoize API calls
  const fetchShippingLines = useCallback(async () => {
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
  }, [API_BASE_URL]);

  const fetchBranchOptions = useCallback(async () => {
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
  }, [API_BASE_URL]);

  // Memoize data refresh function
  const refreshPrData = useCallback(
    (page = currentPage) => {
      getPrData(page, 50);
    },
    [currentPage, getPrData]
  );

  // Optimize input change handler
  const handleInputChange = useCallback(
    (event, rowIndex, columnId) => {
      const { value } = event.target;

      setRows((prevRows) => {
        const updatedRow = { ...prevRows[rowIndex], [columnId]: value };

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

        return prevRows.map((row, index) =>
          index === rowIndex ? updatedRow : row
        );
      });
    },
    [branchOptions]
  );

  // Memoize save handler
  const handleSavePr = useCallback(
    async (rowIndex) => {
      const row = rows[rowIndex];
      console.log("💾 Preparing to save row:", row);

      const errors = [];

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
        alert(errors.join("\n"));
        return;
      }

      setIsLoading(true);

      try {
        console.log("🚀 Sending POST /update-pr with payload:", row);

        const res = await axios.post(`${API_BASE_URL}/update-pr`, row, {
          timeout: 10000,
        });

        console.log("✅ API Response:", res.data);
        alert(res.data.message);

        setTimeout(() => {
          getPrData(currentPage, 50);
        }, 500);
      } catch (error) {
        console.error("❌ Error while saving PR:", error);
        if (error.code === "ERR_NETWORK") {
          alert(
            "Network error: Save was successful but could not refresh data. Please refresh the page manually."
          );
        } else {
          alert(
            "Failed to save PR. " +
              (error.response?.data?.message || "Check console for details.")
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
    [API_BASE_URL, currentPage, getPrData, rows]
  );

  // Memoize delete handler
  const handleDeletePr = useCallback(
    async (pr_no) => {
      const confirmDelete = window.confirm(
        `Are you sure you want to delete this ${pr_no} PR?`
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

          setTimeout(() => {
            getPrData(currentPage, 50);
          }, 500);
        } catch (error) {
          console.error("❌ Error deleting PR:", error);
          if (error.code === "ERR_NETWORK") {
            alert(
              "Network error: Could not connect to the server. Please refresh the page manually."
            );
          } else {
            alert(
              "Failed to delete PR. " +
                (error.response?.data?.message || "Check console for details.")
            );
          }
        } finally {
          setIsLoading(false);
        }
      }
    },
    [API_BASE_URL, currentPage, getPrData]
  );

  // Optimize page change handler
  const handlePageChange = useCallback(
    (page) => {
      setCurrentPage(page);
      getPrData(page, 50);
    },
    [getPrData]
  );

  // Initial data fetch
  useEffect(() => {
    getPrData(1, 50);
    fetchShippingLines();
    fetchBranchOptions();
  }, [fetchBranchOptions, fetchShippingLines, getPrData]);

  // Handle text input with character limit and show alert
  const handleTextInputChange = (event, rowIndex, columnId, maxLength) => {
    const value = event.target.value;

    // If exceeding limit, show alert and only use the text up to the limit
    if (value.length > maxLength) {
      alert(
        `${
          columnId.charAt(0).toUpperCase() + columnId.slice(1)
        } cannot exceed ${maxLength} characters.`
      );

      // Truncate the input to the maximum length allowed
      const truncatedValue = value.substring(0, maxLength);

      // Update with truncated value
      handleInputChange(
        { target: { value: truncatedValue } },
        rowIndex,
        columnId
      );
    } else {
      // Normal update if within limit
      handleInputChange(event, rowIndex, columnId);
    }
  };

  // Create a DateInputCell reusable component for date fields
  const DateInputCell = ({ rowIndex, columnId, isTime = false }) => {
    const inputRef = useRef(null);

    // Calculate date range limits
    const now = new Date();
    const minDate = new Date(now);
    minDate.setFullYear(now.getFullYear() - 1);
    const maxDate = new Date(now);
    maxDate.setFullYear(now.getFullYear() + 1);

    // Format date strings
    const minDateStr = minDate.toISOString().split("T")[0];
    const maxDateStr = maxDate.toISOString().split("T")[0];

    // For datetime-local, include time
    const minDateTime = minDate.toISOString().slice(0, 16);
    const maxDateTime = maxDate.toISOString().slice(0, 16);

    useEffect(() => {
      const handleFocus = () => {
        setTimeout(() => {
          if (document.activeElement === inputRef.current) {
            try {
              inputRef.current.showPicker();
            } catch (error) {
              console.log("Browser requires direct interaction for picker");
            }
          }
        }, 100);
      };

      if (inputRef.current) {
        inputRef.current.addEventListener("focus", handleFocus);
      }

      return () => {
        if (inputRef.current) {
          inputRef.current.removeEventListener("focus", handleFocus);
        }
      };
    }, []);

    return (
      <TextField
        inputRef={inputRef}
        type={isTime ? "datetime-local" : "date"}
        sx={{ width: "100%" }}
        size="small"
        value={rows[rowIndex]?.[columnId] || ""}
        inputProps={{
          min: isTime ? minDateTime : minDateStr,
          max: isTime ? maxDateTime : maxDateStr,
        }}
        onChange={(event) => {
          const value = event.target.value;

          // Always allow clearing the field
          if (!value) {
            handleInputChange(event, rowIndex, columnId);
            return;
          }

          const selectedDate = new Date(value);

          // Validate if date is within allowed range
          if (selectedDate >= minDate && selectedDate <= maxDate) {
            handleInputChange(event, rowIndex, columnId);
          } else {
            alert(
              "Please select a date between last year and next year from today"
            );
          }
        }}
        onClick={() => {
          try {
            inputRef.current?.showPicker();
          } catch (error) {
            console.log("Error showing picker:", error);
          }
        }}
        onFocus={() => {
          try {
            inputRef.current?.showPicker();
          } catch (error) {
            // Already handled by the useEffect
          }
        }}
      />
    );
  };

  // Memoize columns configuration
  const columns = useMemo(
    () => [
      {
        accessorKey: "delete",
        enableSorting: false,
        enableGrouping: false,
        size: 50,
        Cell: ({ row }) => (
          <IconButton onClick={() => handleDeletePr(row.original.pr_no)}>
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
            >
              {/* Show selected value separately at top, disabled */}
              {currentValue && (
                <MenuItem value={currentValue} disabled>
                  {currentValue}
                </MenuItem>
              )}

              {/* Show selectable options */}
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
            type="number"
            error={
              rows[row.index]?.container_count &&
              (Number(rows[row.index]?.container_count) < 1 ||
                Number(rows[row.index]?.container_count) > 20)
            }
            helperText={
              rows[row.index]?.container_count &&
              (Number(rows[row.index]?.container_count) < 1 ||
                Number(rows[row.index]?.container_count) > 20)
                ? "Value must be between 1 and 20"
                : ""
            }
            inputProps={{
              min: 1,
              max: 20,
              pattern: "[0-9]*",
            }}
            value={rows[row.index]?.container_count || ""}
            onChange={(event) => {
              const value = event.target.value;
              const numValue = Number(value);

              if (value === "") {
                handleInputChange(event, row.index, cell.column.id);
              } else if (numValue < 1) {
                alert("Container count cannot be less than 1");
                event.target.value = rows[row.index]?.container_count || "";
              } else if (numValue > 20) {
                alert("Container count cannot be more than 20");
                event.target.value = rows[row.index]?.container_count || "";
              } else if (Number.isInteger(numValue)) {
                handleInputChange(event, row.index, cell.column.id);
              }
            }}
            onKeyPress={(event) => {
              // Block non-numeric characters and decimal point
              if (!/[0-9]/.test(event.key) || event.key === ".") {
                event.preventDefault();
              }
            }}
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
                (type) =>
                  type.container_type === rows[row.index]?.container_type
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
            />
          );
        },
      },
      {
        accessorKey: "do_validity",
        header: "DO Validity",
        enableSorting: false,
        size: calculateColumnWidth(rows, "do_validity"),
        Cell: ({ cell, row }) => (
          <DateInputCell
            rowIndex={row.index}
            columnId={cell.column.id}
            isTime={true}
          />
        ),
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
          />
        ),
      },
      {
        accessorKey: "type_of_vehicle",
        header: "Type of Vehicle",
        enableSorting: false,
        size: 200,
        Cell: ({ cell, row }) => (
          <Autocomplete
            fullWidth
            disablePortal={false}
            options={truckTypes}
            getOptionLabel={(option) => option}
            value={rows[row.index]?.type_of_vehicle || null}
            onChange={(_, newValue) =>
              handleInputChange(
                { target: { value: newValue || "" } },
                row.index,
                cell.column.id
              )
            }
            renderInput={(params) => <TextField {...params} size="small" />}
          />
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
            onChange={(event) => {
              const value = event.target.value;

              // Allow any characters, but limit to 10
              if (value.length <= 10) {
                handleInputChange(event, row.index, cell.column.id);
              } else {
                alert("Document number must be at most 10 characters.");
              }
            }}
            inputProps={{
              maxLength: 10,
            }}
          />
        ),
      },
      {
        accessorKey: "document_date",
        header: "Document Date",
        enableSorting: false,
        size: calculateColumnWidth(rows, "document_date"),
        Cell: ({ cell, row }) => (
          <DateInputCell rowIndex={row.index} columnId={cell.column.id} />
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        enableSorting: false,
        size: 300,
        Cell: ({ cell, row }) => {
          const currentValue = rows[row.index]?.description || "";
          return (
            <TextField
              sx={{ width: "100%" }}
              size="small"
              multiline
              rows={3}
              value={currentValue}
              onChange={(event) => {
                handleTextInputChange(event, row.index, cell.column.id, 300);
              }}
              inputProps={{
                maxLength: 300,
              }}
            />
          );
        },
      },
      {
        accessorKey: "instructions",
        header: "Instructions",
        enableSorting: false,
        size: 300,
        Cell: ({ cell, row }) => {
          const currentValue = rows[row.index]?.instructions || "";
          return (
            <TextField
              sx={{ width: "100%" }}
              size="small"
              multiline
              rows={3}
              value={currentValue}
              onChange={(event) => {
                handleTextInputChange(event, row.index, cell.column.id, 300);
              }}
              inputProps={{
                maxLength: 300,
              }}
            />
          );
        },
      },
      {
        accessorKey: "pr_no",
        header: "PR No",
        enableSorting: false,
        size: 170,
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
          <IconButton onClick={() => handleSavePr(row.index)}>
            <SaveIcon sx={{ color: "#015C4B" }} />
          </IconButton>
        ),
      },
    ],
    [handleDeletePr, handleSavePr, handleInputChange, rows]
  );

  return {
    rows,
    setRows,
    columns,
    total,
    totalPages,
    currentPage,
    handlePageChange,
    refreshPrData,
    isLoading,
    handleSavePr,
    handleDeletePr,
  };
}

export default usePrColumns;
