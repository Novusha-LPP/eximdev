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
    <div className="premium-card" style={{ padding: "1rem" }}>
      <div
        className="card-header"
        style={{
          padding: "0.5rem 0.75rem",
          marginBottom: "0.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h2
            className="page-title"
            style={{ fontSize: "1.1rem", paddingBottom: "0.25rem" }}
          >
            KYC Status Overview
          </h2>
          <p className="page-subtitle" style={{ fontSize: "0.75rem", margin: 0 }}>
            Monitor and manage customer applications
          </p>
        </div>

        {/* Statistics Cards - Moved to Header */}
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          {[
            {
              icon: <Group style={{ fontSize: "1.1rem" }} />,
              value: stats.total,
              label: "Total",
              color: "var(--primary-500)",
              bg: "var(--primary-50)",
              text: "var(--primary-600)",
            },
            {
              icon: <HourglassEmpty style={{ fontSize: "1.1rem" }} />,
              value: stats.pending,
              label: "Pending",
              color: "var(--warning)",
              bg: "var(--warning-light)",
              text: "var(--warning)",
            },
            {
              icon: <CheckCircle style={{ fontSize: "1.1rem" }} />,
              value: stats.approved,
              label: "Approved",
              color: "var(--success)",
              bg: "var(--success-light)",
              text: "var(--success)",
            },
            {
              icon: <Edit style={{ fontSize: "1.1rem" }} />,
              value: stats.sentForRevision,
              label: "Revisions",
              color: "var(--info)",
              bg: "var(--info-light)",
              text: "var(--info)",
            },
          ].map((stat, index) => (
            <div
              key={index}
              style={{
                padding: "0.4rem 0.75rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "#fff",
                border: "1px solid var(--slate-200)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-sm)",
                minWidth: "120px",
              }}
            >
              <div
                style={{
                  background: stat.bg,
                  padding: "0.3rem",
                  borderRadius: "50%",
                  color: stat.text,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {stat.icon}
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1rem",
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {stat.value}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.65rem",
                    color: "var(--slate-500)",
                    fontWeight: 600,
                  }}
                >
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card-body" style={{ padding: "0 0.5rem" }}>
        
        {/* Filters */}
        <div
          style={{
            padding: "0.75rem",
            marginBottom: "0.75rem",
            background: "var(--slate-50)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--slate-200)",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div style={{ flex: 1 }}>
             <div style={{ position: "relative" }}>
               <input
                type="text"
                className="form-control"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  paddingLeft: "2.2rem",
                  paddingTop: "0.4rem",
                  paddingBottom: "0.4rem",
                  fontSize: "0.85rem",
                }}
              />
              <Search
                style={{
                  position: "absolute",
                  left: "0.75rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--slate-400)",
                  fontSize: "1rem",
                }}
              />
            </div>
          </div>
          <div style={{ width: "200px" }}>
            <select
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                paddingTop: "0.4rem",
                paddingBottom: "0.4rem",
                fontSize: "0.85rem",
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Sent for revision">Sent for Revision</option>
            </select>
          </div>
        </div>

        {/* Results Info */}
        <div
          style={{
            marginBottom: "0.5rem",
            color: "var(--slate-500)",
            fontSize: "0.8rem",
            fontStyle: "italic",
            textAlign: "right",
          }}
        >
          Showing {filteredData.length} record(s)
        </div>

        {/* Data Table */}
        {/* Data Table */}
        <CustomTable columns={columns} data={filteredData} enableSearch={false} />
        
      </div>
    </div>
  );
}

export default React.memo(CustomerKycStatus);
