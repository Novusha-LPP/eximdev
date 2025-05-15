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

export default function CSelectImporterModal(props) {
  const { selectedYear } = React.useContext(SelectedYearContext);
  const { importers, setImporters } = useImportersContext();
  const [importerData, setImporterData] = React.useState([]);
  const [selectedImporter, setSelectedImporter] = React.useState("");
  const [checked, setChecked] = React.useState(false);
  const [selectedApiYears, setSelectedApiYears] = React.useState([]);

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

  React.useEffect(() => {
    async function getImporterList() {
      if (selectedYear) {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/get-importer-list/${selectedYear}`
        );
        setImporterData(res.data);
        setImporters(res.data);
        if (res.data.length > 0) {
          setSelectedImporter(res.data[0].importer);
        }
      }
    }
    getImporterList();
  }, [selectedYear]);

  const handleImporterChange = (event, newValue) => {
    setSelectedImporter(newValue?.label || null);
  };

  const handleYearChange = (event) => {
    const year = event.target.value;
    setSelectedApiYears((prevYears) =>
      prevYears.includes(year)
        ? prevYears.filter((y) => y !== year)
        : [...prevYears, year]
    );
  };

  const importerNames = getUniqueImporterNames(importerData);

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
