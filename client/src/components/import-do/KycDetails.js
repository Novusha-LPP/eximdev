import React, { useEffect } from "react";
import { MenuItem, TextField } from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import axios from "axios";
import { MaterialReactTable } from "material-react-table";
import useTableConfig from "../../customHooks/useTableConfig";

function KycDetails() {
  const [selectedValue, setSelectedValue] = React.useState("Importers");
  const [importerData, setImporterData] = React.useState([]);
  const [shippingLineData, setShippingLineData] = React.useState([]);
  const [selectedImporter, setSelectedImporter] = React.useState(null);
  const [selectedShippingLine, setSelectedShippingLine] = React.useState(null);
  const [rows, setRows] = React.useState([]);

  const columns = [
    {
      accessorKey: "importer",
      header: "Importer",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "shipping_line_airline",
      header: "Shipping Line",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "kyc_valid_upto",
      header: "KYC Valid Upto",
      enableSorting: false,
      size: 200,
    },
    {
      accessorKey: "kyc_documents",
      header: "KYC Documents",
      enableSorting: false,
      size: 200,

      Cell: ({ cell }) =>
        cell.row.original.kyc_documents?.map((doc, id) => (
          <React.Fragment key={id}>
            <a href={doc}>View</a>
            <br />
          </React.Fragment>
        )),
    },
    {
      accessorKey: "shipping_line_bond_valid_upto",
      header: "Shipping Line Bond Valid Upto",
      enableSorting: false,
      size: 250,
    },
    {
      accessorKey: "shipping_line_bond_docs",
      header: "Shipping Line Bond Documents",
      enableSorting: false,
      size: 250,

      Cell: ({ cell }) =>
        cell.row.original.shipping_line_bond_docs?.map((doc, id) => (
          <React.Fragment key={id}>
            <a href={doc}>View</a>
            <br />
          </React.Fragment>
        )),
    },
  ];

  const table = useTableConfig(rows, columns);

  const getUniqueImporterNames = (importerData) => {
    const uniqueImporters = new Set();
    return importerData
      ?.filter((importer) => {
        if (uniqueImporters.has(importer.importer)) {
          return false;
        } else {
          uniqueImporters.add(importer.importer);
          return true;
        }
      })
      .map((importer, index) => {
        return {
          label: importer.importer,
          key: `${importer.importer}-${index}`,
        };
      });
  };

  const getUniqueShippingLines = (shippingLineData) => {
    const uniqueImporters = new Set();
    return shippingLineData
      ?.filter((importer) => {
        if (uniqueImporters.has(importer.shipping_line_airline)) {
          return false;
        } else {
          uniqueImporters.add(importer.shipping_line_airline);
          return true;
        }
      })
      .map((importer, index) => {
        return {
          label: importer.shipping_line_airline,
          key: `${importer.shipping_line_airline}-${index}`,
        };
      });
  };

  useEffect(() => {
    async function getData() {
      if (selectedValue === "Importers") {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-importer-list/24-25`
        );
        setImporterData(res.data);
      } else if (selectedValue === "Shipping Lines") {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-shipping-lines/24-25`
        );
        setShippingLineData(res.data);
      }
    }

    getData();
  }, [selectedValue]);

  const handleImporterChange = (event, newValue) => {
    setSelectedImporter(newValue?.label || null);
  };

  const handleShippingLineChange = (event, newValue) => {
    setSelectedShippingLine(newValue?.label || null);
  };

  const importerNames = getUniqueImporterNames(importerData);
  const shippingLineNames = getUniqueShippingLines(shippingLineData);

  useEffect(() => {
    const getImporterData = async () => {
      if (selectedImporter) {
        const res = await axios.post(
          `${process.env.REACT_APP_API_STRING}/get-kyc-docs-by-importer`,
          {
            importer: selectedImporter,
          }
        );
        setRows(res.data);
      }
    };

    getImporterData();
  }, [selectedImporter]);

  useEffect(() => {
    const getImporterData = async () => {
      if (selectedShippingLine) {
        const res = await axios.post(
          `${process.env.REACT_APP_API_STRING}/get-kyc-docs-by-shipping-line`,
          {
            shipping_line_airline: selectedShippingLine,
          }
        );
        setRows(res.data);
      }
    };

    getImporterData();
  }, [selectedShippingLine]);

  return (
    <div>
      <div className="flex-div">
        <TextField
          select
          size="small"
          label="Select"
          value={selectedValue}
          sx={{ width: 200 }}
          onChange={(e) => setSelectedValue(e.target.value)}
        >
          <MenuItem value="Importers">Importers</MenuItem>
          <MenuItem value="Shipping Lines">Shipping Lines</MenuItem>
        </TextField>
        {selectedValue === "Importers" ? (
          <Autocomplete
            disablePortal
            options={importerNames}
            getOptionLabel={(option) => option.label}
            value={
              importerNames.find(
                (option) => option.label === selectedImporter
              ) || null
            }
            onChange={handleImporterChange}
            renderInput={(params) => (
              <TextField
                {...params}
                sx={{ width: 500, marginLeft: "20px" }}
                size="small"
                label="Select importer"
              />
            )}
          />
        ) : (
          <Autocomplete
            disablePortal
            options={shippingLineNames}
            getOptionLabel={(option) => option.label}
            value={
              shippingLineNames.find(
                (option) => option.label === selectedShippingLine
              ) || null
            }
            onChange={handleShippingLineChange}
            renderInput={(params) => (
              <TextField
                {...params}
                sx={{ width: 500, marginLeft: "20px" }}
                size="small"
                label="Select shipping line"
              />
            )}
          />
        )}
      </div>
      <br />
      <MaterialReactTable table={table} />
    </div>
  );
}

export default KycDetails;
