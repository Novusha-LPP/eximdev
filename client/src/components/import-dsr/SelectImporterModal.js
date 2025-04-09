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
import { useImportersContext } from "../../contexts/importersContext";
import { useContext } from "react";
import { YearContext } from "../../contexts/yearContext.js";

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
  const { selectedYearState, setSelectedYearState } = useContext(YearContext);
  const { importers, setImporters } = useImportersContext();
  const [importerData, setImporterData] = React.useState([]);
  const [selectedImporter, setSelectedImporter] = React.useState("");
  const [checked, setChecked] = React.useState(false);
  const [selectedApiYears, setSelectedApiYears] = React.useState([]);

  // Get importer list for MUI autocomplete
  React.useEffect(() => {
    async function getImporterList() {
      if (selectedYearState) {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-importer-list/${selectedYearState}`
        );
        setImporters(res.data);
      }
    }
    getImporterList();
  }, [selectedYearState]);
  // Function to build the search query (not needed on client-side, handled by server)
  // Keeping it in case you want to extend client-side filtering

  const getUniqueImporterNames = (importerData) => {
    if (!importerData || !Array.isArray(importerData)) return [];
    const uniqueImporters = new Set();
    return importerData
      .filter((importer) => {
        if (uniqueImporters.has(importer.importer)) return false;
        uniqueImporters.add(importer.importer);
        return true;
      })
      .map((importer, index) => ({
        label: importer.importer,
        key: `${importer.importer}-${index}`,
      }));
  };

  const importerNames = [...getUniqueImporterNames(importers)];

  const handleYearChange = (event) => {
    const year = event.target.value;
    setSelectedApiYears((prevYears) =>
      prevYears.includes(year)
        ? prevYears.filter((y) => y !== year)
        : [...prevYears, year]
    );
  };

  const handleReportDownload = async () => {
    if (selectedImporter !== "" && selectedApiYears.length > 0) {
      const yearString = selectedApiYears.join(",");
      const res = await axios.get(
        `${
          process.env.REACT_APP_API_STRING
        }/download-report/${yearString}/${selectedImporter
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
    if (selectedApiYears.length > 0) {
      const yearString = selectedApiYears.join(",");
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/download-report/${yearString}/${props.status}`
      );

      downloadAllReport(res.data, props.status, props.detailedStatus);
    }
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
                  onChange={(e) => setChecked(e.target.checked)}
                />
              }
              label="Download all importers"
            />
          </FormGroup>

          <br />

          <div>
            <FormControlLabel
              control={
                <Checkbox
                  value="24-25"
                  checked={selectedApiYears.includes("24-25")}
                  onChange={handleYearChange}
                />
              }
              label="24-25"
            />
            <FormControlLabel
              control={
                <Checkbox
                  value="25-26"
                  checked={selectedApiYears.includes("25-26")}
                  onChange={handleYearChange}
                />
              }
              label="25-26"
            />
          </div>

          <br />
          {!checked && (
            <Autocomplete
                     sx={{ width: "300px", marginRight: "20px" }}
                     freeSolo
                     options={importerNames.map((option) => option.label)}
                     value={selectedImporter || ""} // Controlled value
                     onInputChange={(event, newValue) => setSelectedImporter(newValue)} // Handles input change
                     renderInput={(params) => (
                       <TextField
                         {...params}
                         variant="outlined"
                         size="small"
                         fullWidth
                         label="Select Importer" // Placeholder text
                       />
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
