import React, { useEffect, useState, useMemo } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import Autocomplete from "@mui/material/Autocomplete";
import SaveIcon from "@mui/icons-material/Save";
import { calculateColumnWidth } from "../utils/calculateColumnWidth";
import { IconButton, MenuItem, TextField } from "@mui/material";
import axios from "axios";

function usePrColumns(organisations, containerTypes, locations, truckTypes) {
  const [rows, setRows] = useState([]);
  const [shippingLines, setShippingLines] = useState([]);
  const [branchOptions, setBranchOptions] = useState([]);
  const [total, setTotal] = useState(0); // Added state for total
  const [totalPages, setTotalPages] = useState(0); // Added state for totalPages
  const [currentPage, setCurrentPage] = useState(1); // Added state for currentPage
  const [isSaving, setIsSaving] = useState(false); // Track save operation status

  const fetchShippingLines = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-shipping-line`
      );
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
      const response = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-port-types`
      );

      const branchOptionsData = response.data.data
        .filter((item) => item.isBranch) // Only include items where isBranch is true
        .map((item) => ({
          isBranch: item.isBranch,
          label: item.icd_code,
          value: item.icd_code,
          suffix: item.suffix, // Include suffix
          prefix: item.prefix, // Include prefix
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

  async function getPrData(page = 1, limit = 50) {
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-pr-data/all?page=${page}&limit=${limit}`
      );

      setRows(res.data.data); // Access `data` from response
      setTotal(res.data.total); // Optional: total count
      setTotalPages(res.data.totalPages); // Optional: for pagination
      setCurrentPage(res.data.currentPage); // Optional: current page
    } catch (error) {
      console.error("❌ Error fetching PR data:", error);
    }
  }

  const handleSavePr = async (rowIndex) => {
    if (isSaving) return; // Prevent multiple simultaneous save operations

    setIsSaving(true);
    const row = rows[rowIndex]; // Get the updated row from latest state
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
      setIsSaving(false);
      return;
    }

    try {
      console.log("🚀 Sending POST /update-pr with payload:", row);

      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/update-pr`,
        row
      );
      console.log("✅ API Response:", res.data);
      alert(res.data.message);

      // Add a delay before fetching data again to ensure server has completed processing
      setTimeout(() => {
        getPrData(currentPage, 50);
        setIsSaving(false);
      }, 500);
    } catch (error) {
      console.error("❌ Error while saving PR:", error);
      alert("Failed to save PR. Check console for details.");
      setIsSaving(false);
    }
  };

  useEffect(() => {
    getPrData(currentPage, 50); // Load first page by default
    fetchShippingLines();
    fetchBranchOptions();
  }, []);

  const handleDeletePr = async (pr_no) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this PR?"
    );

    if (confirmDelete) {
      try {
        const res = await axios.post(
          `${process.env.REACT_APP_API_STRING}/delete-pr`,
          {
            pr_no,
          }
        );
        alert(res.data.message);

        // Add a delay before fetching data again
        setTimeout(() => {
          getPrData(currentPage, 50);
        }, 500);
      } catch (error) {
        console.error("❌ Error deleting PR:", error);
        alert("Failed to delete PR. Check console for details.");
      }
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    getPrData(page, 50); // Fetch data for the selected page
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
          disabled={isSaving}
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
    // Rest of the columns remain the same
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
          value={rows[row.index]?.document_no || ""}
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
      Cell: ({ cell, row }) => (
        <TextField
          type="date"
          sx={{ width: "100%" }}
          size="small"
          value={rows[row.index]?.document_date || ""}
          onChange={(event) =>
            handleInputChange(event, row.index, cell.column.id)
          }
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
        <IconButton onClick={() => handleSavePr(row.index)} disabled={isSaving}>
          <SaveIcon sx={{ color: isSaving ? "#ccc" : "#015C4B" }} />
        </IconButton>
      ),
    },
  ];

  return { rows, setRows, columns, totalPages, currentPage, handlePageChange };
}

export default usePrColumns;
