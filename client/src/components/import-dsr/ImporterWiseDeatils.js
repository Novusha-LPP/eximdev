import React, { useContext, useEffect, useState } from "react";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import axios from "axios";
import ReactApexChart from "react-apexcharts";
import { SelectedYearContext } from "../../contexts/SelectedYearContext";
import { BranchContext } from "../../contexts/BranchContext";

function ImporterWiseDetails() {
  const { selectedYear } = useContext(SelectedYearContext);
  const { selectedBranch, selectedCategory } = useContext(BranchContext);
  const [importerData, setImporterData] = useState([]);
  const [selectedImporter, setSelectedImporter] = useState(null);
  const [assignedUsers, setAssignedUsers] = useState([]);

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
        try {
          const res = await axios.get(
            `${process.env.REACT_APP_API_STRING}/get-importer-list/${selectedYear}`,
            {
              params: { branchId: selectedBranch, category: selectedCategory },
            },
          );
          setImporterData(res.data);
          // Check if importerData is not empty before setting the selectedImporter
          if (res.data.length > 0) {
            setSelectedImporter(res.data[0].importer);
          }
        } catch (error) {
          console.error("Error fetching importer list:", error);
        }
      }
    }
    getImporterList();
  }, [selectedYear, selectedBranch, selectedCategory]);

  // Set selected importer on autocomplete onChange
  const handleImporterChange = (event, newValue) => {
    setSelectedImporter(newValue?.label || null);
  };

  // Fetch the details of the selected importer
  useEffect(() => {
    async function getImporterData() {
      if (selectedImporter) {
        try {
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
              .replace(/,/g, "")}/${selectedYear}`,
            {
              params: { branchId: selectedBranch, category: selectedCategory },
            },
          );

          setData(res.data);
        } catch (error) {
          console.error("Error fetching importer jobs:", error);
          setData([]);
        }
      }
    }
    getImporterData();
  }, [selectedImporter, selectedYear, selectedBranch, selectedCategory]);

  // Fetch assigned users for the selected importer
  useEffect(() => {
    async function getAssignedUsers() {
      if (selectedImporter) {
        try {
          const res = await axios.get(
            `${process.env.REACT_APP_API_STRING}/get-importer-users`,
            {
              params: {
                importerName: selectedImporter,
              },
            },
          );
          setAssignedUsers(res.data);
        } catch (error) {
          console.error("Error fetching assigned users:", error);
          setAssignedUsers([]);
        }
      } else {
        setAssignedUsers([]);
      }
    }
    getAssignedUsers();
  }, [selectedImporter]);

  // Series from the API: [all, pending, completed, cancelled]. The ring shows the three
  // parts; "all" is written in the middle.
  const [allJobs = 0, pendingJobs = 0, completedJobs = 0, cancelledJobs = 0] =
    Array.isArray(data) ? data : [];
  const parts = [
    { label: "Pending jobs", value: pendingJobs, color: "#ea7a1a" },
    { label: "Completed jobs", value: completedJobs, color: "#0ea44b" },
    { label: "Cancelled jobs", value: cancelledJobs, color: "#64748b" },
  ];
  const ringHasData = parts.some((p) => p.value > 0);
  const donutState = {
    series: ringHasData ? parts.map((p) => p.value) : [1],
    options: {
      chart: {
        type: "donut",
        fontFamily: "Inter, system-ui, sans-serif",
        sparkline: { enabled: true },
      },
      labels: ringHasData ? parts.map((p) => p.label) : ["No jobs"],
      colors: ringHasData ? parts.map((p) => p.color) : ["#e4e8f0"],
      stroke: { width: 0 },
      plotOptions: { pie: { donut: { size: "74%" } } },
      dataLabels: { enabled: false },
      legend: { show: false },
      tooltip: { enabled: ringHasData },
      states: { hover: { filter: { type: "none" } } },
    },
  };

  const importerNames = getUniqueImporterNames(importerData);

  // Handling by: everyone assigned to this importer, first few as chips, the rest behind "+n more"
  const [showAllPeople, setShowAllPeople] = useState(false);
  const PEOPLE_PREVIEW = 12;
  const AVATAR_COLORS = [
    "#2563eb",
    "#7c3aed",
    "#0891b2",
    "#16a34a",
    "#ea7a1a",
    "#db2777",
    "#4f46e5",
    "#0d9488",
  ];
  const initials = (name) =>
    String(name || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  const people = showAllPeople
    ? assignedUsers
    : assignedUsers.slice(0, PEOPLE_PREVIEW);
  const hiddenPeople = assignedUsers.length - PEOPLE_PREVIEW;

  return (
    <div className="dsr-dash-grid">
      <section className="dsr-panel">
        <h3 className="dsr-panel__title">Importer-wise jobs</h3>
        <label className="dsr-panel__label">Importer</label>
        <Autocomplete
          disablePortal
          fullWidth
          className="dsr-importer"
          options={importerNames}
          getOptionLabel={(option) => option.label}
          value={
            importerNames.find(
              (option) =>
                (option.label || "").trim().toLowerCase() ===
                (selectedImporter || "").trim().toLowerCase(),
            ) || null
          }
          onChange={handleImporterChange}
          renderInput={(params) => (
            <TextField {...params} size="small" placeholder="Select importer" />
          )}
        />
        <div className="dsr-ring">
          <div className="dsr-ring__chart">
            <ReactApexChart
              options={donutState.options}
              series={donutState.series}
              type="donut"
              width={190}
              height={190}
            />
            <div className="dsr-ring__center">
              <b>{allJobs}</b>
              <span>All jobs</span>
            </div>
          </div>
          <ul className="dsr-ring__legend">
            {parts.map((p) => (
              <li key={p.label}>
                <i style={{ background: p.color }} />
                <span>{p.label}</span>
                <b>{p.value}</b>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="dsr-panel">
        <div className="dsr-panel__head">
          <h3 className="dsr-panel__title">Handling by</h3>
          {assignedUsers.length > 0 && (
            <span className="dsr-panel__meta">
              {assignedUsers.length}{" "}
              {assignedUsers.length === 1 ? "person" : "people"}
            </span>
          )}
        </div>
        {assignedUsers.length === 0 ? (
          <p className="dsr-panel__empty">
            No one is assigned to this importer.
          </p>
        ) : (
          <div className="dsr-people">
            {people.map((name, i) => (
              <span key={`${name}-${i}`} className="dsr-person">
                <i
                  style={{
                    background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                  }}
                >
                  {initials(name)}
                </i>
                {name}
              </span>
            ))}
            {hiddenPeople > 0 && (
              <button
                type="button"
                className="dsr-person dsr-person--more"
                onClick={() => setShowAllPeople((v) => !v)}
              >
                {showAllPeople ? "Show less" : `+${hiddenPeople} more`}
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default React.memo(ImporterWiseDetails);
