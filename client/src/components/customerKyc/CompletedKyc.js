import React, { useContext, useEffect, useState, useMemo } from "react";
import axios from "axios";
import { UserContext } from "../../contexts/UserContext";
import { useNavigation } from "../../contexts/NavigationContext";
import CustomTable from "./CustomTable";
import {
  Visibility,
  Edit,
  CheckCircle,
  Cancel,
  PendingOutlined,
} from "@mui/icons-material";

function CompletedKyc() {
  const [data, setData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("all");
  const { user } = useContext(UserContext);
  const { navigateWithRef } = useNavigation();

  useEffect(() => {
    async function getData() {
      try {
        const res = await axios.get(
          `${process.env.REACT_APP_API_STRING}/view-completed-kyc`
        );
        setData(res.data);
      } catch (error) {
        console.error("Error fetching completed KYC list:", error);
      }
    }
    getData();
  }, []);

  const getStatusChip = (status) => {
    let type = "neutral";
    let icon = null;

    if (status === "Approved") {
      type = "success";
      icon = <CheckCircle style={{ fontSize: "1rem" }} />;
    } else if (status === "Rejected") {
      type = "error";
      icon = <Cancel style={{ fontSize: "1rem" }} />;
    } else if (status === "Pending") {
      type = "warning";
      icon = <PendingOutlined style={{ fontSize: "1rem" }} />;
    } else if (status === "Sent for revision") {
      type = "info";
      icon = <Edit style={{ fontSize: "1rem" }} />;
    }

    return (
      <span
        className={`status-pill ${type}`}
        style={{ display: "inline-flex", gap: "0.25rem" }}
      >
        {icon} {status}
      </span>
    );
  };

  const getCategoryChip = (category) => {
    let type = "neutral";
    if (category?.includes("Individual")) type = "info";
    if (category?.includes("Company")) type = "success";

    return (
      <span
        className={`status-pill ${type === "neutral" ? "info" : type}`}
        style={{ fontWeight: 500, textTransform: "none" }}
      >
        {category}
      </span>
    );
  };

  const columns = [
    {
      accessorKey: "name_of_individual",
      header: "Customer Name",
      size: 250,
      Cell: ({ cell }) => (
        <span
          className="link-text"
          onClick={() =>
            navigateWithRef(`/view-completed-kyc/${cell.row.original._id}`)
          }
        >
          {cell.getValue()}
        </span>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      size: 250,
      Cell: ({ cell }) => getCategoryChip(cell.getValue()),
    },
    {
      accessorKey: "status",
      header: "Business Type",
      size: 250,
      Cell: ({ cell }) => (
        <span
          className={`status-pill ${
            cell.getValue() === "Manufacturer" ? "success" : "info"
          }`}
        >
          {cell.getValue()}
        </span>
      ),
    },
    {
      accessorKey: "iec_no",
      header: "IEC Number",
      size: 250,
      Cell: ({ cell }) => (
        <span className="mono-text">
          {cell.getValue() || "N/A"}
        </span>
      ),
    },
    {
      accessorKey: "approval",
      header: <>Approval <br /> Status</>,
      size: 200,
      Cell: ({ cell }) => getStatusChip(cell.getValue()),
    },
    {
      accessorKey: "financial_details_approved",
      header: <>Financial <br /> Approval</>,
      size: 200,
      Cell: ({ cell }) => (
        <span
          className={`status-pill ${
            cell.getValue() ? "success" : "warning"
          }`}
          style={{ fontSize: "0.8rem", padding: "2px 8px" }}
        >
          {cell.getValue() ? "Approved" : "Pending"}
        </span>
      ),
    },
    {
      accessorKey: "approved_by",
      header: "Approved By",
      size: 200,
      Cell: ({ cell }) => (
        <span
          style={{
            fontStyle: cell.getValue() ? "normal" : "italic",
            color: "var(--slate-500)",
            fontSize: "0.85rem"
          }}
        >
          {cell.getValue() || (cell.row.original.financial_details_approved_by ? `Fin: ${cell.row.original.financial_details_approved_by}` : "Not Assigned")}
        </span>
      ),
    },
    {
      accessorKey: "remarks",
      header: "Remarks",
      size: 220,
      Cell: ({ cell }) => (
        <span
          title={cell.getValue() || "No remarks"}
          className="truncate-text"
        >
          {cell.getValue() || "No remarks"}
        </span>
      ),
    },
    {
      accessorKey: "view",
      header: "Actions",
      size: 150,
      Cell: ({ cell }) => {
        const canEdit = user?.role === "Admin" || (Array.isArray(user?.modules) && user.modules.includes("Accounts"));
        return canEdit ? (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="table-action-btn"
              title="View Details"
              onClick={() =>
                navigateWithRef(`/view-completed-kyc/${cell.row.original._id}`)
              }
            >
              <Visibility fontSize="small" />
            </button>
            <button
              className="table-action-btn"
              title="Edit KYC"
              onClick={() =>
                navigateWithRef(`/revise-customer-kyc/${cell.row.original._id}`)
              }
            >
              <Edit fontSize="small" />
            </button>
          </div>
        ) : (
          <span style={{ color: "var(--slate-400)", fontSize: "0.75rem" }}>
            No Access
          </span>
        );
      },
    },
  ];

  // Extract unique months for filter dropdown
  const uniqueMonths = useMemo(() => {
    const monthsMap = {};
    data.forEach((item) => {
      const dateVal = item.approvedAt || item.updatedAt || item.createdAt;
      if (dateVal) {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
          const month = d.getMonth(); // 0-11
          const year = d.getFullYear();
          const key = `${year}-${String(month + 1).padStart(2, '0')}`;
          const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
          monthsMap[key] = { value: key, label, dateObj: d };
        }
      }
    });
    return Object.values(monthsMap).sort((a, b) => b.dateObj - a.dateObj);
  }, [data]);

  // Filter completed KYCs based on selection
  const filteredData = useMemo(() => {
    if (selectedMonth === "all") return data;
    return data.filter((item) => {
      const dateVal = item.approvedAt || item.updatedAt || item.createdAt;
      if (!dateVal) return false;
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return false;
      const month = d.getMonth();
      const year = d.getFullYear();
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;
      return key === selectedMonth;
    });
  }, [data, selectedMonth]);

  return (
    <div className="kyc-page-wrapper">
      <div className="kyc-page-header">
        <div className="kyc-header-left" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <h2 className="kyc-page-title" style={{ margin: 0 }}>
            <CheckCircle style={{ fontSize: "1.2rem", color: "var(--success)" }} /> Completed KYC Applications
          </h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="form-control"
            style={{ width: "200px", height: "36px", fontSize: "0.85rem", padding: "0 8px", borderRadius: "6px", border: "1px solid #cbd5e1" }}
          >
            <option value="all">All Months (All Time)</option>
            {uniqueMonths.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <span className="kyc-verified-tag" style={{ margin: 0 }}>
            {filteredData.length} verified record{filteredData.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="kyc-card">
        <div className="kyc-section" style={{ padding: "1.5rem" }}>
          <CustomTable columns={columns} data={filteredData} />
        </div>
      </div>
    </div>
  );
}

export default React.memo(CompletedKyc);
