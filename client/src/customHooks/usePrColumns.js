import React, { useEffect, useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete";
import Autocomplete from "@mui/material/Autocomplete";
import SaveIcon from "@mui/icons-material/Save";
import { calculateColumnWidth } from "../utils/calculateColumnWidth";
import { IconButton, MenuItem, TextField } from "@mui/material";
import axios from "axios";
import { handleSavePr } from "../utils/handleSavePr";

function usePrColumns(organisations, containerTypes, locations, truckTypes) {
  const [rows, setRows] = useState([]);

  async function getPrData() {
    const res = await axios.get(
      `${process.env.REACT_APP_API_STRING}/get-pr-data/all`
    );
    setRows(res.data);
  }

  useEffect(() => {
    getPrData();
  }, []);

  const handleInputChange = (event, rowIndex, columnId) => {
    const localDateTimeString = event.target.value; // "2025-03-31T23:59"
    // Convert to JS Date, which automatically interprets "YYYY-MM-DDTHH:mm"
    const dateObj = new Date(localDateTimeString);
    console.log(dateObj.toISOString()); // "2025-03-31T23:59:00.000Z"
    const { value } = event.target;
    setRows((prevRows) => {
      const newRows = [...prevRows];
      newRows[rowIndex][columnId] = value;
      return newRows;
    });
  };

  const handleDeletePr = async (pr_no) => {
    // Show confirmation dialog
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this PR?"
    );

    if (confirmDelete) {
      // If user confirms deletion, proceed with deletion
      const res = await axios.post(
        `${process.env.REACT_APP_API_STRING}/delete-pr`,
        {
          pr_no,
        }
      );
      alert(res.data.message);
      getPrData();
    }
  };

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
      header: "Import/Export",
      enableSorting: false,
      size: 150,
      // Cell: ({ cell, row }) =>
      //   !row.original.pr_no ? (
      //     <TextField
      //       select
      //       sx={{ width: "100%" }}
      //       size="small"
      //       defaultValue={cell.getValue()}
      //       onBlur={(event) =>
      //         handleInputChange(event, row.index, cell.column.id)
      //       }
      //     >
      //       <MenuItem value="Import">Import</MenuItem>
      //       <MenuItem value="Export">Export</MenuItem>
      //     </TextField>
      //   ) : (
      //     // If PR number is not empty, do not allow user to update branch
      //     cell.getValue()
      //   ),
      Cell: ({ cell, row }) => (
        <TextField
          select
          sx={{ width: "100%" }}
          size="small"
          defaultValue={cell.getValue()}
          onBlur={(event) =>
            handleInputChange(event, row.index, cell.column.id)
          }
        >
          <MenuItem value="Import">Import</MenuItem>
          <MenuItem value="Export">Export</MenuItem>
        </TextField>
      ),
    },
    {
      accessorKey: "branch",
      header: "Branch",
      enableSorting: false,
      size: 150,
      Cell: ({ cell, row }) =>
        // If PR number is empty, show dropdown menu for branch
        !row.original.pr_no ? (
          <TextField
            select
            sx={{ width: "100%" }}
            size="small"
            defaultValue={cell.getValue()}
            onBlur={(event) =>
              handleInputChange(event, row.index, cell.column.id)
            }
          >
            <MenuItem value="ICD SANAND">ICD SANAND</MenuItem>
            <MenuItem value="ICD SACHANA">ICD SACHANA</MenuItem>
            <MenuItem value="ICD KHODIYAR">ICD KHODIYAR</MenuItem>
            <MenuItem value="HAZIRA">HAZIRA</MenuItem>
            <MenuItem value="MUNDRA PORT">MUNDRA PORT</MenuItem>
            <MenuItem value="BARODA">BARODA</MenuItem>
          </TextField>
        ) : (
          // If PR number is not empty, do not allow user to update branch
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
          defaultValue={cell.getValue()}
          onBlur={(event) =>
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
          getOptionLabel={(option) => option.container_type || ""} // ✅ Get container_type field
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
      Cell: ({ cell, row }) => (
        <Autocomplete
          fullWidth
          disablePortal={false}
          options={organisations}
          getOptionLabel={(option) => option}
          value={rows[row.index]?.consignor || null}
          onBlur={(event) =>
            handleInputChange(event, row.index, cell.column.id)
          }
          renderInput={(params) => <TextField {...params} size="small" />}
        />
      ),
    },
    {
      accessorKey: "consignee",
      header: "Consignee",
      enableSorting: false,
      size: calculateColumnWidth(rows, "consignee"),
      Cell: ({ cell, row }) => (
        <Autocomplete
          fullWidth
          disablePortal={false}
          options={organisations}
          getOptionLabel={(option) => option}
          value={rows[row.index]?.consignee || null}
          onBlur={(event) =>
            handleInputChange(event, row.index, cell.column.id)
          }
          renderInput={(params) => <TextField {...params} size="small" />}
        />
      ),
    },
    {
      accessorKey: "shipping_line",
      header: "Shipping Line",
      enableSorting: false,
      size: calculateColumnWidth(rows, "shipping_line"),
      Cell: ({ cell, row }) => (
        <TextField
          sx={{ width: "100%" }}
          size="small"
          defaultValue={cell.getValue()}
          onBlur={(event) =>
            handleInputChange(event, row.index, cell.column.id)
          }
        />
      ),
    },

    {
      accessorKey: "do_validity",
      header: "DO Validity",
      enableSorting: false,
      size: calculateColumnWidth(rows, "do_validity"),
      Cell: ({ cell, row }) => {
        // 1) Get the raw value from the cell (could be "2024-08-14" or "2024-08-14T12:30", etc.)
        const rawValue = cell.getValue() || "";

        // 2) If it’s strictly YYYY-MM-DD with no time, append "T23:59"
        let initialValue = rawValue;
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
          initialValue += "T23:59";
        }

        // 3) Use local state to store the date+time string
        const [value, setValue] = React.useState(initialValue);

        // 4) On blur, if user only picks date, append "T23:59" again
        const handleBlur = (event) => {
          let newValue = event.target.value; // e.g. "2025-03-31T14:45" or "2025-03-31"
          if (newValue && newValue.length === 10) {
            newValue += "T23:59";
          }
          setValue(newValue);

          // Update your row data with the new string
          handleInputChange(
            { ...event, target: { ...event.target, value: newValue } },
            row.index,
            cell.column.id
          );
        };

        return (
          <TextField
            type="datetime-local"
            sx={{ width: "100%" }}
            size="small"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
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
          onBlur={(event) =>
            handleInputChange(event, row.index, cell.column.id)
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
          onBlur={(event) =>
            handleInputChange(event, row.index, cell.column.id)
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
          onBlur={(event) =>
            handleInputChange(event, row.index, cell.column.id)
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
          onBlur={(event) =>
            handleInputChange(event, row.index, cell.column.id)
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
          defaultValue={cell.getValue()}
          onBlur={(event) =>
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
          defaultValue={cell.getValue()}
          onBlur={(event) =>
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
      Cell: ({ cell, row }) => (
        <TextField
          sx={{ width: "100%" }}
          size="small"
          defaultValue={cell.getValue()}
          onBlur={(event) =>
            handleInputChange(event, row.index, cell.column.id)
          }
        />
      ),
    },
    {
      accessorKey: "instructions",
      header: "Instructions",
      enableSorting: false,
      size: calculateColumnWidth(rows, "instructions"),
      Cell: ({ cell, row }) => (
        <TextField
          sx={{ width: "100%" }}
          size="small"
          defaultValue={cell.getValue()}
          onBlur={(event) =>
            handleInputChange(event, row.index, cell.column.id)
          }
        />
      ),
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
        <IconButton onClick={() => handleSavePr(row.original, getPrData)}>
          <SaveIcon sx={{ color: "#015C4B" }} />
        </IconButton>
      ),
    },
  ];

  return { rows, setRows, columns };
}

export default usePrColumns;
