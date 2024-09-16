import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import axios from "axios";
import { SelectedYearContext } from "../../contexts/SelectedYearContext";
import { convertToExcel } from "../../utils/convertToExcel";
import { downloadAllReport } from "../../utils/downloadAllReport";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 600,
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 4,
};

export default function SelectImporterModal(props) {
  const { selectedYear } = React.useContext(SelectedYearContext);
  const [importerData, setImporterData] = React.useState([]);
  const [selectedImporter, setSelectedImporter] = React.useState("");
  const [checked, setChecked] = React.useState(false);

  // Function to remove duplicates and map data with unique keys
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

  // Get importer list for MUI autocomplete
  React.useEffect(() => {
    async function getImporterList() {
      if (selectedYear) {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-importer-list/${selectedYear}`
        );
        setImporterData(res.data);
        // Check if importerData is not empty before setting the selectedImporter
        if (res.data.length > 0) {
          setSelectedImporter(res.data[0].importer);
        }
      }
    }
    getImporterList();
  }, [selectedYear]);

  // Set selected importer on autocomplete onChange
  const handleImporterChange = (event, newValue) => {
    setSelectedImporter(newValue?.label || null);
  };

  const importerNames = getUniqueImporterNames(importerData);

  const handleReportDownload = async () => {
    if (selectedImporter !== "") {
      const res = await axios.get(
        `${
          process.env.REACT_APP_API_STRING
        }/download-report/${selectedYear}/${selectedImporter
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^\w]+/g, "")
          .replace(/_+/g, "_")
          .replace(/^_|_$/g, "")}/${props.status}`
      );

      convertToExcel(
        res.data,
        selectedImporter,
        props.status,
        props.detailedStatus
      );
    }
  };

  const handleDownloadAll = async () => {
    const res = await axios.get(
      `${process.env.REACT_APP_API_STRING}/download-report/${selectedYear}/${props.status}`
    );

    downloadAllReport(res.data, props.status, props.detailedStatus);
  };

  return (
    <div>
      <Modal
        open={props.open}
        onClose={props.handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <Typography id="modal-modal-title" variant="h6" component="h2">
            Select an importer to download DSR
          </Typography>
          <br />

          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={checked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setChecked(true);
                    } else {
                      setChecked(false);
                    }
                  }}
                />
              }
              label="Download all importers"
            />
          </FormGroup>

          <br />
          {!checked && (
            <Autocomplete
              disablePortal
              fullWidth
              options={importerNames}
              getOptionLabel={(option) => option.label}
              value={
                importerNames.find(
                  (option) => option.label === selectedImporter
                ) || null
              }
              onChange={handleImporterChange}
              renderInput={(params) => (
                <TextField {...params} size="small" label="Select importer" />
              )}
            />
          )}

          <button
            className="btn"
            onClick={checked ? handleDownloadAll : handleReportDownload}
          >
            Download
          </button>
        </Box>
      </Modal>
    </div>
  );
}
