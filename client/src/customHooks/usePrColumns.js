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
      accessorKey: "container_type",
      header: "Container Type",
      enableSorting: false,
      size: calculateColumnWidth(rows, "container_type"),
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
          {containerTypes.map((type, id) => (
            <MenuItem key={id} value={type}>
              {type}
            </MenuItem>
          ))}
        </TextField>
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
      accessorKey: "type_of_vehicle",
      header: "Type of Vehicle",
      enableSorting: false,
      size: calculateColumnWidth(rows, "type_of_vehicle"),
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
          {truckTypes.map((type, id) => (
            <MenuItem id={id} value={type}>
              {type}
            </MenuItem>
          ))}
        </TextField>
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
      accessorKey: "do_validity",
      header: "DO Validity",
      enableSorting: false,
      size: calculateColumnWidth(rows, "do_validity"),
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
