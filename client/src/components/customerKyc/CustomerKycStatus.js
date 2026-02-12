import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { UserContext } from "../../contexts/UserContext";
import { useNavigation } from "../../contexts/NavigationContext";
import CustomTable from "./CustomTable";
import {
  Visibility,
  CheckCircle,
  Settings as Edit, // Changed to simple edit icon
  Search,
  Group,
  HourglassEmpty,
} from "@mui/icons-material";

function CustomerKycStatus() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    sentForRevision: 0,
  });
  const { user } = useContext(UserContext);
  const { navigateWithRef } = useNavigation();

  useEffect(() => {
    async function getData() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/view-all-customer-kyc`
        );
        setData(res.data);
        setFilteredData(res.data);
        calculateStats(res.data);
      } catch (error) {
        console.error("Error fetching KYC status data:", error);
      }
    }
    getData();
  }, []);

  const calculateStats = (data) => {
    const newStats = {
      total: data.length,
      pending: data.filter((item) => item.approval === "Pending").length,
      approved: data.filter(
        (item) =>
          item.approval === "Approved" || item.approval === "Approved by HOD"
      ).length,
      sentForRevision: data.filter(
        (item) => item.approval === "Sent for revision"
      ).length,
    };
    setStats(newStats);
  };

  useEffect(() => {
    let filtered = data;

    // Apply status filter
    if (statusFilter !== "All") {
      filtered = filtered.filter((item) => item.approval === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name_of_individual?.toLowerCase().includes(query) ||
          item.iec_no?.toLowerCase().includes(query) ||
          item.pan_no?.toLowerCase().includes(query)
      );
    }

    setFilteredData(filtered);
  }, [data, statusFilter, searchQuery]);

  // --- Helper Components for Table Cells ---

  const getStatusChip = (status) => {
    let type = "neutral";
    if (status === "Approved" || status === "Approved by HOD") type = "success";
    else if (status === "Pending") type = "warning";
    else if (status === "Sent for revision") type = "error";

    return (
      <span className={`status-pill ${type}`}>
        {status === "Approved by HOD" ? "Approved" : status}
      </span>
    );
  };

  const getCategoryChip = (category) => {
    return (
      <span
        className="status-pill info"
        style={{ fontWeight: 500, textTransform: "none" }}
      >
        {category}
      </span>
    );
  };

  // --- Columns Definition ---

  const columns = [
    {
      accessorKey: "name_of_individual",
      header: "Customer Name",
      size: 250,
      Cell: ({ cell }) => (
        <span
          style={{
            fontWeight: 600,
            color: "var(--primary-600)",
            cursor: "pointer",
          }}
          onClick={() => {
            const status = cell.row.original.approval;
            if (status === "Pending")
              navigateWithRef(`/view-customer-kyc/${cell.row.original._id}`);
            else if (status.includes("Approved"))
              navigateWithRef(`/view-completed-kyc/${cell.row.original._id}`);
            else if (status === "Sent for revision")
              navigateWithRef(`/revise-customer-kyc/${cell.row.original._id}`);
          }}
        >
          {cell.getValue() || "N/A"}
        </span>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      size: 180,
      Cell: ({ cell }) => getCategoryChip(cell.getValue()),
    },
    {
      accessorKey: "iec_no",
      header: "IEC Code",
      Cell: ({ cell }) => (
        <span style={{ fontFamily: "monospace", color: "var(--slate-600)" }}>
          {cell.getValue()}
        </span>
      ),
    },
    {
      accessorKey: "pan_no",
      header: "PAN Number",
      Cell: ({ cell }) => (
        <span style={{ fontFamily: "monospace", color: "var(--slate-600)" }}>
          {cell.getValue()}
        </span>
      ),
    },
    {
      accessorKey: "permanent_address_telephone",
      header: "Mobile",
    },
    {
      accessorKey: "approval",
      header: "Status",
      Cell: ({ cell }) => getStatusChip(cell.getValue()),
    },
    {
      accessorKey: "approved_by",
      header: "Processed By",
      Cell: ({ cell }) => (
        <span
          style={{
            color: "var(--slate-500)",
            fontStyle: cell.getValue() ? "normal" : "italic",
          }}
        >
          {cell.getValue() || "Pending Review"}
        </span>
      ),
    },
    // {
    //   accessorKey: "actions",
    //   header: "Actions",
    //   size: 100,
    //   Cell: ({ cell }) => (
    //     <button
    //       className="table-action-btn"
    //       title="View Details"
    //       onClick={() => {
    //         const status = cell.row.original.approval;
    //         if (status === "Pending")
    //           navigateWithRef(`/view-customer-kyc/${cell.row.original._id}`);
    //         else if (status.includes("Approved"))
    //           navigateWithRef(`/view-completed-kyc/${cell.row.original._id}`);
    //         else if (status === "Sent for revision")
    //           navigateWithRef(`/revise-customer-kyc/${cell.row.original._id}`);
    //       }}
    //     >
    //       <Visibility fontSize="small" />
    //     </button>
    //   ),
    // },
  ];

  // --- Main Render ---

  return (
    <div className="premium-card">
      <div className="card-header">
        <h2 className="page-title" style={{ fontSize: "1.5rem", paddingBottom: "0.5rem" }}>
          KYC Status Overview
        </h2>
        <p className="page-subtitle" >
          Monitor and manage customer applications
        </p>
      </div>

      <div className="card-body">
        {/* Statistics Cards */}
        <div
          className="grid-3"
          style={{
            marginBottom: "2rem",
            gridTemplateColumns: "repeat(4, 1fr)",
          }}
        >
          <div
            className="form-section"
            style={{
              padding: "1.5rem",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              borderLeft: "4px solid var(--primary-500)",
            }}
          >
            <div
              style={{
                background: "var(--primary-50)",
                padding: "1rem",
                borderRadius: "50%",
                color: "var(--primary-600)",
              }}
            >
              <Group />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.5rem" }}>{stats.total}</h3>
              <p style={{ margin: 0, fontSize: "0.85rem" }}>Total Customers</p>
            </div>
          </div>

          <div
            className="form-section"
            style={{
              padding: "1.5rem",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              borderLeft: "4px solid var(--warning)",
            }}
          >
            <div
              style={{
                background: "var(--warning-light)",
                padding: "1rem",
                borderRadius: "50%",
                color: "var(--warning)",
              }}
            >
              <HourglassEmpty />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.5rem" }}>{stats.pending}</h3>
              <p style={{ margin: 0, fontSize: "0.85rem" }}>Pending</p>
            </div>
          </div>

          <div
            className="form-section"
            style={{
              padding: "1.5rem",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              borderLeft: "4px solid var(--success)",
            }}
          >
            <div
              style={{
                background: "var(--success-light)",
                padding: "1rem",
                borderRadius: "50%",
                color: "var(--success)",
              }}
            >
              <CheckCircle />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.5rem" }}>
                {stats.approved}
              </h3>
              <p style={{ margin: 0, fontSize: "0.85rem" }}>Approved</p>
            </div>
          </div>

          <div
            className="form-section"
            style={{
              padding: "1.5rem",
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              borderLeft: "4px solid var(--info)",
            }}
          >
            <div
              style={{
                background: "var(--info-light)",
                padding: "1rem",
                borderRadius: "50%",
                color: "var(--info)",
              }}
            >
              <Edit />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.5rem" }}>
                {stats.sentForRevision}
              </h3>
              <p style={{ margin: 0, fontSize: "0.85rem" }}>Revisions</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div
          className="premium-card"
          style={{
            padding: "1.5rem",
            marginBottom: "2rem",
            background: "var(--slate-50)",
            border: "none",
          }}
        >
          <div className="grid-2">
            <div>
              <label className="form-label">Search</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name, IEC, or PAN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ paddingLeft: "2.5rem" }}
                />
                <Search
                  style={{
                    position: "absolute",
                    left: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--slate-400)",
                    fontSize: "1.2rem",
                  }}
                />
              </div>
            </div>
            <div>
              <label className="form-label">Filter Status</label>
              <select
                className="form-control"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Sent for revision">Sent for Revision</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div
          style={{
            marginBottom: "1rem",
            color: "var(--slate-500)",
            fontSize: "0.9rem",
            fontStyle: "italic",
          }}
        >
          Showing {filteredData.length} result(s)
        </div>

        {/* Data Table */}
        <CustomTable columns={columns} data={filteredData} />
      </div>
    </div>
  );
}

export default React.memo(CustomerKycStatus);
