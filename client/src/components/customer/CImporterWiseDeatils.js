import React, { useContext, useEffect, useState } from "react";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import axios from "axios";
import ReactApexChart from "react-apexcharts";
import { SelectedYearContext } from "../../contexts/SelectedYearContext";

function CImporterWiseDetails() {
  const { selectedYear } = useContext(SelectedYearContext);
  const [importerData, setImporterData] = useState([]);
  const [selectedImporter, setSelectedImporter] = useState(null);

  const [data, setData] = useState([]);

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
  useEffect(() => {
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

  // Fetch the details of the selected importer
  useEffect(() => {
    async function getImporterData() {
      if (selectedImporter) {
        const res = await axios.get(
          `${
            process.env.REACT_APP_API_STRING
          }/get-importer-jobs/${selectedImporter
            .toLowerCase()
            .replace(/ /g, "_")
            .replace(/\./g, "")
            .replace(/\//g, "_")
            .replace(/-/g, "")
            .replace(/_+/g, "_")
            .replace(/\(/g, "")
            .replace(/\)/g, "")
            .replace(/\[/g, "")
            .replace(/\]/g, "")
            .replace(/,/g, "")}/${selectedYear}`
        );

        setData(res.data);
      }
    }
    getImporterData();
  }, [selectedImporter, selectedYear]);

  const donutState = {
    series: data,
    options: {
      chart: {
        width: 380,
        type: "donut",
      },
      labels: ["All Jobs", "Pending Jobs", "Completed Jobs", "Cancelled Jobs"],
      plotOptions: {
        pie: {
          startAngle: -90,
          endAngle: 270,
        },
      },
      dataLabels: {
        enabled: false,
      },
      legend: {
        formatter: function (val, opts) {
          return val + " - " + opts.w.globals.series[opts.seriesIndex];
        },
        position: "right",
      },
      responsive: [
        {
          breakpoint: 1320,
          options: {
            chart: {
              width: "100%",
            },
            legend: {
              position: "bottom",
            },
          },
        },
      ],

      colors: ["#2196F3", "#FEAF1A", "#00E4C5", "#FF6378"],
      fill: {
        type: "gradient",
        gradient: {
          shade: "light",
          type: "vertical",
          shadeIntensity: 0.12,
          gradientToColors: ["#1976D2", "#FFA000", "#00E4C5", "#D32F2F"],
          inverseColors: false,
          opacityFrom: 1,
          opacityTo: 0.75,
          stops: [0, 50, 75, 100],
        },
      },
    },
  };

  const importerNames = getUniqueImporterNames(importerData);

  return (
    <>
      <Autocomplete
        disablePortal
        fullWidth
        options={importerNames}
        getOptionLabel={(option) => option.label}
        value={
          importerNames.find((option) => option.label === selectedImporter) ||
          null
        }
        onChange={handleImporterChange}
        renderInput={(params) => (
          <TextField {...params} size="small" label="Select importer" />
        )}
      />
      <ReactApexChart
        options={donutState.options}
        series={donutState.series}
        type="donut"
        width={500}
      />
    </>
  );
}

export default React.memo(CImporterWiseDetails);
