import React, { useEffect, useState, useMemo } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import Autocomplete from "@mui/material/Autocomplete";
import SaveIcon from "@mui/icons-material/Save";
import { calculateColumnWidth } from "../utils/calculateColumnWidth";
import { IconButton, MenuItem, TextField } from "@mui/material";
import axios from "axios";

import { handleSavePr } from "../utils/handleSavePr";

function usePrColumns(organisations, containerTypes, locations, truckTypes) {
  const [rows, setRows] = useState([]);
  const [shippingLines, setShippingLines] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [total, setTotal] = useState(0); // Added state for total
  const [totalPages, setTotalPages] = useState(0); // Added state for totalPages
  const [currentPage, setCurrentPage] = useState(1); // Added state for currentPage
  const [isLoading, setIsLoading] = useState(false); // Add loading state

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

  const refreshPrData = (page = currentPage) => {
    getPrData(page, 50);
  };

  const handleInputChange = (event, rowIndex, columnId) => {
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
  };

  // Use axios consistently instead of mixing fetch and axios
  async function getPrData(page = 1, limit = 50) {
    setIsLoading(true); // Set loading state to true

    try {
      const response = await axios.get(`${API_BASE_URL}/get-pr-data/all`, {
        params: { page, limit },
        timeout: 10000, // 10 second timeout
      });

      // Using axios, the data is in response.data
      const res = response.data;

      setRows(res.data);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 0);
      setCurrentPage(res.currentPage || page);

      console.log("✅ PR data loaded successfully:", res);
    } catch (error) {
      console.error("❌ Error fetching PR data:", error);
      // Handle specific error types
      if (error.code === "ERR_NETWORK") {
        alert(
          "Network error: Could not connect to the server. Please try again later."
        );
      }
    } finally {
      setIsLoading(false); // Reset loading state regardless of outcome
    }
  }

  const handleSavePr = async (rowIndex) => {
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

    setIsLoading(true); // Set loading state before save operation

    try {
      console.log("🚀 Sending POST /update-pr with payload:", row);

      const res = await axios.post(
        `${API_BASE_URL}/update-pr`,
        row,
        { timeout: 10000 } // Add timeout
      );

      console.log("✅ API Response:", res.data);
      alert(res.data.message);

      // Add a small delay before fetching data to ensure server has time to process
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
      setIsLoading(false); // Reset loading state regardless of outcome
    }
  };

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

        // Add a small delay before fetching data
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
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    getPrData(page, 50);
  };

  useEffect(() => {
    getPrData(1, 50);
    fetchShippingLines();
    fetchBranchOptions();
  }, []);

  const columns = [
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
        />
      ),
    },
    {
      accessorKey: "consignor",
      header: "Consignor",
      enableSorting: false,
      size: calculateColumnWidth(rows, "consignor"),
      Cell: ({ cell, row }) => {
        const currentValue = rows[row.index]?.consignor || ""; // Current value from the row
        const selectedOption = organisations.find(
          (org) => org === currentValue
        );

        return (
          <Autocomplete
            fullWidth
            disablePortal={false}
            options={organisations}
            getOptionLabel={(option) => option || ""}
            value={selectedOption || currentValue} // Show current value if not in options
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
            freeSolo // Allow user to enter custom values
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
        const currentValue = rows[row.index]?.consignee || ""; // Current value from the row
        const selectedOption = organisations.find(
          (org) => org === currentValue
        );

        return (
          <Autocomplete
            fullWidth
            disablePortal={false}
            options={organisations}
            getOptionLabel={(option) => option || ""}
            value={selectedOption || currentValue} // Show current value if not in options
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
            freeSolo // Allow user to enter custom values
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
        const currentValue = rows[row.index]?.shipping_line || ""; // Current value from the row
        const selectedOption = shippingLines.find(
          (line) => line.code === currentValue
        );

        return (
          <Autocomplete
            fullWidth
            disablePortal={false}
            options={shippingLines}
            getOptionLabel={(option) => option.name || ""}
            value={selectedOption || { name: currentValue }} // Show current value if not in options
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
            freeSolo // Allow user to enter custom values
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
        const inputRef = React.useRef(null);

        // Setup effect to open picker on focus (including tab navigation)
        React.useEffect(() => {
          const handleFocus = () => {
            // Small delay to ensure browser has completed focus
            setTimeout(() => {
              if (document.activeElement === inputRef.current) {
                try {
                  inputRef.current.showPicker();
                } catch (error) {
                  // Some browsers require direct user interaction
                  console.log("Browser requires direct interaction for picker");
                }
              }
            }, 100);
          };

          // Attach focus listener
          if (inputRef.current) {
            inputRef.current.addEventListener("focus", handleFocus);
          }

          // Cleanup
          return () => {
            if (inputRef.current) {
              inputRef.current.removeEventListener("focus", handleFocus);
            }
          };
        }, []);

        // Calculate dates: 1 year back and 1 year ahead
        const now = new Date();
        const minDate = new Date(now);
        minDate.setFullYear(now.getFullYear() - 1);
        const maxDate = new Date(now);
        maxDate.setFullYear(now.getFullYear() + 1);

        // Format dates for datetime-local input
        const minDateTime = minDate.toISOString().slice(0, 16);
        const maxDateTime = maxDate.toISOString().slice(0, 16);

        return (
          <TextField
            inputRef={inputRef}
            type="datetime-local"
            sx={{ width: "100%" }}
            size="small"
            value={rows[row.index]?.do_validity || ""}
            inputProps={{
              min: minDateTime,
              max: maxDateTime,
            }}
            onChange={(event) => {
              const value = event.target.value;

              // Always allow clearing the field
              if (!value) {
                handleInputChange(event, row.index, cell.column.id);
                return;
              }

              const selectedDate = new Date(value);

              // Validate if date is within allowed range
              if (selectedDate >= minDate && selectedDate <= maxDate) {
                handleInputChange(event, row.index, cell.column.id);
              } else {
                alert(
                  "Please select a date between last year and next year from today"
                );
              }
            }}
            onClick={(event) => {
              // This ensures the picker shows when clicking on the input field
              try {
                inputRef.current?.showPicker();
              } catch (error) {
                console.log("Error showing picker:", error);
              }
            }}
            onFocus={(event) => {
              // Backup for browsers that support this
              try {
                inputRef.current?.showPicker();
              } catch (error) {
                // Already handled by the useEffect
              }
            }}
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
          } // Use onChange for immediate updates
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
          } // Use onChange for immediate updates
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
          } // Use onChange for immediate updates
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
          } // Use onChange for immediate updates
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
        <TextField
          select
          sx={{ width: "100%" }}
          size="small"
          value={cell.getValue() || ""}
          onChange={(event) =>
            handleInputChange(event, row.index, cell.column.id)
          }
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
          value={rows[row.index]?.document_no || ""} // Use value instead of defaultValue
          onChange={(event) =>
            handleInputChange(event, row.index, cell.column.id)
          }
        />
      ),
    },
    {
      accessorKey: "document_date",
      header: "Document Date",
      enableSorting: false,
      size: calculateColumnWidth(rows, "document_date"),
      Cell: ({ cell, row }) => {
        const inputRef = React.useRef(null);

        // Setup effect to open picker on focus (including tab navigation)
        React.useEffect(() => {
          const handleFocus = () => {
            // Small delay to ensure browser has completed focus
            setTimeout(() => {
              if (document.activeElement === inputRef.current) {
                try {
                  inputRef.current.showPicker();
                } catch (error) {
                  // Some browsers require direct user interaction
                  console.log("Browser requires direct interaction for picker");
                }
              }
            }, 100);
          };

          // Attach focus listener
          if (inputRef.current) {
            inputRef.current.addEventListener("focus", handleFocus);
          }

          // Cleanup
          return () => {
            if (inputRef.current) {
              inputRef.current.removeEventListener("focus", handleFocus);
            }
          };
        }, []);

        // Calculate dates: 1 year back and 1 year ahead
        const now = new Date();
        const minDate = new Date(now);
        minDate.setFullYear(now.getFullYear() - 1);
        const maxDate = new Date(now);
        maxDate.setFullYear(now.getFullYear() + 1);

        // Format dates for date input
        const minDateStr = minDate.toISOString().split("T")[0];
        const maxDateStr = maxDate.toISOString().split("T")[0];

        return (
          <TextField
            inputRef={inputRef}
            type="date"
            sx={{ width: "100%" }}
            size="small"
            value={rows[row.index]?.document_date || ""}
            inputProps={{
              min: minDateStr,
              max: maxDateStr,
            }}
            onChange={(event) => {
              const value = event.target.value;

              // Always allow clearing the field
              if (!value) {
                handleInputChange(event, row.index, cell.column.id);
                return;
              }

              const selectedDate = new Date(value);

              // Validate if date is within allowed range
              if (selectedDate >= minDate && selectedDate <= maxDate) {
                handleInputChange(event, row.index, cell.column.id);
              } else {
                alert(
                  "Please select a date between last year and next year from today"
                );
              }
            }}
            onClick={(event) => {
              // This ensures the picker shows when clicking on the input field
              try {
                inputRef.current?.showPicker();
              } catch (error) {
                console.log("Error showing picker:", error);
              }
            }}
            onFocus={(event) => {
              // Backup for browsers that support this
              try {
                inputRef.current?.showPicker();
              } catch (error) {
                // Already handled by the useEffect
              }
            }}
          />
        );
      },
    },
    {
      accessorKey: "description",
      header: "Description",
      enableSorting: false,
      size: calculateColumnWidth(rows, "description"),
      Cell: ({ cell, row }) => {
        const currentValue = rows[row.index]?.description || ""; // Current value from the row
        return (
          <TextField
            sx={{ width: "100%" }}
            size="small"
            value={currentValue} // Bind to rows state
            onChange={(event) =>
              handleInputChange(event, row.index, cell.column.id)
            }
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
        const currentValue = rows[row.index]?.instructions || ""; // Current value from the row
        return (
          <TextField
            sx={{ width: "100%" }}
            size="small"
            value={currentValue} // Bind to rows state
            onChange={(event) =>
              handleInputChange(event, row.index, cell.column.id)
            }
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
        <IconButton onClick={() => handleSavePr(row.index)}>
          <SaveIcon sx={{ color: "#015C4B" }} />
        </IconButton>
      ),
    },
  ];

  return {
    rows,
    setRows,
    columns,
    total,
    totalPages,
    currentPage,
    handlePageChange,
    refreshPrData,
  };
}

export default usePrColumns;
