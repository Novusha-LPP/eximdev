import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useFormik } from "formik";
import * as Yup from "yup";
import { UserContext } from "../../contexts/UserContext";
import { useSnackbar } from "../../contexts/SnackbarContext";
import CustomTable from "./CustomTable";
import {
  Add,
  Edit,
  Delete,
  School,
  CheckCircle,
  PendingOutlined,
  Cancel,
  Star,
  StarBorder,
  OnlinePrediction,
  OfflinePin,
  Close,
  ThumbUp,
  ThumbsUpDown,
  ThumbDown
} from "@mui/icons-material";

function TrainingManagement() {
  const { user } = useContext(UserContext);
  const { showError, showSuccess, showWarning } = useSnackbar();

  const [trainings, setTrainings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Dialog/Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");

  // Fetch trainings & active customers
  const fetchData = async () => {
    setLoading(true);
    try {
      const [trainingsRes, customersRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_STRING}/customer-trainings`),
        axios.get(`${process.env.REACT_APP_API_STRING}/customer-trainings/customers`)
      ]);
      setTrainings(trainingsRes.data);
      setCustomers(customersRes.data);
    } catch (error) {
      console.error("Error loading training management data:", error);
      showError("Failed to load training management records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, []);

  // Formik validation schema for Training
  const trainingValidationSchema = Yup.object().shape({
    customerId: Yup.string().required("Customer is required"),
    training_date: Yup.date().required("Training Date is required"),
    valid_till: Yup.date().nullable().optional(),
    trainer_name: Yup.string().required("Trainer Name is required").trim(),
    trainee_name: Yup.string().required("Trainee Name is required").trim(),
    training_module: Yup.string()
      .oneOf(["Import Module", "Export Module", "Transport Module", "E-Lock Module", "GPS Module"], "Invalid module")
      .required("Training Module is required"),
    training_status: Yup.string()
      .oneOf(["Completed", "Pending", "Expired"], "Invalid status")
      .required("Training Status is required"),
    training_mode: Yup.string()
      .oneOf(["Online", "Offline"], "Invalid mode")
      .required("Training Mode is required"),
    remarks: Yup.string().nullable().optional(),
    feedback_rating: Yup.number().min(1).max(5).nullable().optional(),
    feedback_comments: Yup.string().nullable().optional(),
    satisfaction_status: Yup.string()
      .oneOf(["Satisfied", "Neutral", "Unsatisfied"], "Invalid satisfaction status")
      .nullable()
      .optional()
  });

  const formik = useFormik({
    initialValues: {
      customerId: "",
      training_date: "",
      valid_till: "",
      trainer_name: "",
      trainee_name: "",
      training_module: "Import Module",
      training_status: "Pending",
      training_mode: "Online",
      remarks: "",
      feedback_rating: null,
      feedback_comments: "",
      satisfaction_status: null
    },
    validationSchema: trainingValidationSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        const payload = { ...values };
        if (!payload.valid_till) payload.valid_till = null;
        if (!payload.feedback_rating) payload.feedback_rating = null;
        if (!payload.satisfaction_status) payload.satisfaction_status = null;

        if (editingRecord) {
          // Update Mode
          await axios.put(
            `${process.env.REACT_APP_API_STRING}/customer-trainings/${editingRecord._id}`,
            payload
          );
          showSuccess("Training record updated successfully!");
        } else {
          // Create Mode
          await axios.post(`${process.env.REACT_APP_API_STRING}/customer-trainings`, payload);
          showSuccess("Training record created successfully!");
        }
        
        resetForm();
        setModalOpen(false);
        setEditingRecord(null);
        fetchData();
      } catch (error) {
        console.error("Error saving training record:", error);
        showError(error.response?.data?.message || "An error occurred while saving the record.");
      }
    }
  });

  const handleOpenAddModal = () => {
    setEditingRecord(null);
    formik.resetForm();
    setModalOpen(true);
  };

  const handleOpenEditModal = (record) => {
    setEditingRecord(record);
    formik.setValues({
      customerId: record.customerId || "",
      training_date: record.training_date ? record.training_date.slice(0, 10) : "",
      valid_till: record.valid_till ? record.valid_till.slice(0, 10) : "",
      trainer_name: record.trainer_name || "",
      trainee_name: record.trainee_name || "",
      training_module: record.training_module || "Import Module",
      training_status: record.training_status || "Pending",
      training_mode: record.training_mode || "Online",
      remarks: record.remarks || "",
      feedback_rating: record.feedback_rating || null,
      feedback_comments: record.feedback_comments || "",
      satisfaction_status: record.satisfaction_status || null
    });
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await axios.delete(`${process.env.REACT_APP_API_STRING}/customer-trainings/${deleteId}`);
      showSuccess("Training record deleted successfully!");
      setDeleteId(null);
      fetchData();
    } catch (error) {
      console.error("Error deleting training record:", error);
      showError("Failed to delete the training record.");
    }
  };

  // Metrics Calculations
  const stats = trainings.reduce(
    (acc, tr) => {
      acc.total++;
      if (tr.training_status === "Completed") acc.completed++;
      if (tr.training_status === "Pending") acc.pending++;
      if (tr.training_status === "Expired") acc.expired++;
      if (tr.feedback_rating) {
        acc.ratingSum += tr.feedback_rating;
        acc.ratingCount++;
      }
      return acc;
    },
    { total: 0, completed: 0, pending: 0, expired: 0, ratingSum: 0, ratingCount: 0 }
  );

  const averageRating = stats.ratingCount > 0 ? (stats.ratingSum / stats.ratingCount).toFixed(1) : "—";

  // Filter logic for the table
  const filteredTrainings = trainings.filter((tr) => {
    const matchesStatus = statusFilter === "all" || tr.training_status === statusFilter;
    const matchesModule = moduleFilter === "all" || tr.training_module === moduleFilter;
    return matchesStatus && matchesModule;
  });

  // Table Column definitions
  const columns = [
    {
      accessorKey: "training_code",
      header: "Code",
      size: 150,
      Cell: ({ cell }) => <span className="mono-text" style={{ color: "var(--primary-700)", fontWeight: 600 }}>{cell.getValue()}</span>
    },
    {
      accessorKey: "customerName",
      header: "Customer Entity",
      size: 200,
      Cell: ({ cell }) => <strong style={{ color: "var(--slate-800)" }}>{cell.getValue()}</strong>
    },
    {
      accessorKey: "training_module",
      header: "Module",
      size: 180,
      Cell: ({ cell }) => (
        <span className="status-pill info" style={{ fontWeight: 500 }}>
          {cell.getValue()}
        </span>
      )
    },
    {
      accessorKey: "trainee_name",
      header: "Trainee Name",
      size: 180
    },
    {
      accessorKey: "training_date",
      header: "Date",
      size: 140,
      Cell: ({ cell }) => <span>{cell.getValue() ? new Date(cell.getValue()).toLocaleDateString("en-IN") : "—"}</span>
    },
    {
      accessorKey: "trainer_name",
      header: "Trainer",
      size: 160
    },
    {
      accessorKey: "training_mode",
      header: "Mode",
      size: 120,
      Cell: ({ cell }) => {
        const isOnline = cell.getValue() === "Online";
        return (
          <span
            className={`status-pill ${isOnline ? "success" : "info"}`}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", textTransform: "uppercase", fontSize: "0.75rem", fontWeight: 600 }}
          >
            {isOnline ? <OnlinePrediction style={{ fontSize: "0.95rem" }} /> : <OfflinePin style={{ fontSize: "0.95rem" }} />}
            {cell.getValue()}
          </span>
        );
      }
    },
    {
      accessorKey: "training_status",
      header: "Status",
      size: 140,
      Cell: ({ cell }) => {
        const status = cell.getValue();
        let pillClass = "warning";
        let icon = <PendingOutlined style={{ fontSize: "0.95rem" }} />;
        
        if (status === "Completed") {
          pillClass = "success";
          icon = <CheckCircle style={{ fontSize: "0.95rem" }} />;
        } else if (status === "Expired") {
          pillClass = "error";
          icon = <Cancel style={{ fontSize: "0.95rem" }} />;
        }
        
        return (
          <span
            className={`status-pill ${pillClass}`}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontWeight: 600 }}
          >
            {icon} {status}
          </span>
        );
      }
    },
    {
      accessorKey: "feedback_rating",
      header: "Rating",
      size: 120,
      Cell: ({ cell }) => {
        const rating = cell.getValue();
        if (!rating) return <span style={{ fontStyle: "italic", color: "var(--slate-400)" }}>—</span>;
        return (
          <span style={{ display: "flex", alignItems: "center", gap: "2px", color: "#f59e0b", fontWeight: 600 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              i < rating ? <Star key={i} style={{ fontSize: "1rem" }} /> : <StarBorder key={i} style={{ fontSize: "1rem", color: "var(--slate-300)" }} />
            ))}
          </span>
        );
      }
    },
    {
      accessorKey: "actions",
      header: "Actions",
      size: 140,
      Cell: ({ cell }) => {
        const record = cell.row.original;
        const canWrite = user?.role === "Admin" || (Array.isArray(user?.modules) && user.modules.includes("Customer KYC"));
        
        return canWrite ? (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="table-action-btn"
              title="Edit Training Record"
              onClick={() => handleOpenEditModal(record)}
              style={{ padding: "6px", color: "var(--primary-700)" }}
            >
              <Edit fontSize="small" />
            </button>
            <button
              className="table-action-btn"
              title="Delete Training Record"
              onClick={() => setDeleteId(record._id)}
              style={{ padding: "6px", color: "var(--error)" }}
            >
              <Delete fontSize="small" />
            </button>
          </div>
        ) : (
          <span style={{ color: "var(--slate-400)", fontSize: "0.75rem" }}>Read Only</span>
        );
      }
    }
  ];

  return (
    <div className="kyc-page-wrapper" style={{ animation: "fadeIn 0.4s ease-out" }}>
      
      {/* Visual Stats Summary Grid */}
      <div className="kyc-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        
        <div className="kyc-stat-card glassmorphic" style={{ background: "rgba(255, 255, 255, 0.65)", backdropFilter: "blur(12px)", padding: "1.25rem 1.5rem", borderRadius: "1rem", border: "1px solid rgba(255, 255, 255, 0.4)", boxShadow: "0 8px 32px rgba(31, 38, 135, 0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--slate-500)", fontWeight: 500 }}>Total Trainings</span>
            <School style={{ color: "var(--info)", opacity: 0.8 }} />
          </div>
          <h3 style={{ fontSize: "2rem", margin: "0.5rem 0 0", color: "var(--slate-800)", fontWeight: 800 }}>{stats.total}</h3>
        </div>

        <div className="kyc-stat-card glassmorphic" style={{ background: "rgba(255, 255, 255, 0.65)", backdropFilter: "blur(12px)", padding: "1.25rem 1.5rem", borderRadius: "1rem", border: "1px solid rgba(255, 255, 255, 0.4)", boxShadow: "0 8px 32px rgba(31, 38, 135, 0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--slate-500)", fontWeight: 500 }}>Completed</span>
            <CheckCircle style={{ color: "var(--success)", opacity: 0.8 }} />
          </div>
          <h3 style={{ fontSize: "2rem", margin: "0.5rem 0 0", color: "var(--success)", fontWeight: 800 }}>{stats.completed}</h3>
        </div>

        <div className="kyc-stat-card glassmorphic" style={{ background: "rgba(255, 255, 255, 0.65)", backdropFilter: "blur(12px)", padding: "1.25rem 1.5rem", borderRadius: "1rem", border: "1px solid rgba(255, 255, 255, 0.4)", boxShadow: "0 8px 32px rgba(31, 38, 135, 0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--slate-500)", fontWeight: 500 }}>Pending</span>
            <PendingOutlined style={{ color: "var(--warning)", opacity: 0.8 }} />
          </div>
          <h3 style={{ fontSize: "2rem", margin: "0.5rem 0 0", color: "var(--warning)", fontWeight: 800 }}>{stats.pending}</h3>
        </div>

        <div className="kyc-stat-card glassmorphic" style={{ background: "rgba(255, 255, 255, 0.65)", backdropFilter: "blur(12px)", padding: "1.25rem 1.5rem", borderRadius: "1rem", border: "1px solid rgba(255, 255, 255, 0.4)", boxShadow: "0 8px 32px rgba(31, 38, 135, 0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--slate-500)", fontWeight: 500 }}>Expired</span>
            <Cancel style={{ color: "var(--error)", opacity: 0.8 }} />
          </div>
          <h3 style={{ fontSize: "2rem", margin: "0.5rem 0 0", color: "var(--error)", fontWeight: 800 }}>{stats.expired}</h3>
        </div>

        <div className="kyc-stat-card glassmorphic" style={{ background: "rgba(255, 255, 255, 0.65)", backdropFilter: "blur(12px)", padding: "1.25rem 1.5rem", borderRadius: "1rem", border: "1px solid rgba(255, 255, 255, 0.4)", boxShadow: "0 8px 32px rgba(31, 38, 135, 0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--slate-500)", fontWeight: 500 }}>Average Rating</span>
            <Star style={{ color: "#f59e0b" }} />
          </div>
          <h3 style={{ fontSize: "2rem", margin: "0.5rem 0 0", color: "#f59e0b", fontWeight: 800 }}>
            {averageRating} <span style={{ fontSize: "1rem", color: "var(--slate-400)" }}>/ 5</span>
          </h3>
        </div>

      </div>

      {/* Toolbar / Header */}
      <div className="kyc-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h2 className="kyc-page-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <School style={{ color: "var(--primary-700)" }} /> Customer Training Tracker
          </h2>
          <p style={{ color: "var(--slate-500)", fontSize: "0.85rem", margin: "4px 0 0" }}>
            Monitor and record product walkthroughs, system training, and compliance certifications.
          </p>
        </div>
        
        {(user?.role === "Admin" || (Array.isArray(user?.modules) && user.modules.includes("Customer KYC"))) && (
          <button className="btn btn-primary" onClick={handleOpenAddModal} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <Add fontSize="small" /> Add Training Record
          </button>
        )}
      </div>

      {/* Search and Advanced Filters */}
      <div className="kyc-card glassmorphic" style={{ padding: "1rem", marginBottom: "1.5rem", borderRadius: "0.75rem" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          
          <div className="form-group" style={{ margin: 0, minWidth: "180px" }}>
            <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "4px", color: "var(--slate-500)" }}>Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-control"
              style={{ padding: "6px 12px", fontSize: "0.85rem", background: "white" }}
            >
              <option value="all">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Expired">Expired</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0, minWidth: "180px" }}>
            <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: "4px", color: "var(--slate-500)" }}>Filter by Module</label>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="form-control"
              style={{ padding: "6px 12px", fontSize: "0.85rem", background: "white" }}
            >
              <option value="all">All Modules</option>
              <option value="Import Module">Import Module</option>
              <option value="Export Module">Export Module</option>
              <option value="Transport Module">Transport Module</option>
              <option value="E-Lock Module">E-Lock Module</option>
              <option value="GPS Module">GPS Module</option>
            </select>
          </div>

        </div>
      </div>

      {/* Records Data Table */}
      <div className="kyc-card" style={{ padding: "1.5rem" }}>
        <CustomTable columns={columns} data={filteredTrainings} rowsPerPage={10} enableSearch={true} />
      </div>

      {/* CRUD Modal Dialog (Add / Edit Form) */}
      {modalOpen && (
        <div className="dialog-overlay" style={{ background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div className="dialog-content glassmorphic" style={{ background: "#ffffff", border: "1px solid var(--slate-200)", padding: "1.5rem", borderRadius: "1.25rem", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)", width: "100%", maxWidth: "700px", maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            
            {/* Modal Close */}
            <button
              onClick={() => setModalOpen(false)}
              style={{ position: "absolute", top: "1rem", right: "1rem", background: "transparent", border: "none", color: "var(--slate-400)", cursor: "pointer" }}
            >
              <Close />
            </button>

            {/* Modal Header */}
            <h3 style={{ margin: "0 0 1.25rem", color: "var(--primary-700)", fontWeight: 700, fontSize: "1.25rem" }}>
              {editingRecord ? `Edit Training Record: ${editingRecord.training_code}` : "Add Training Record"}
            </h3>

            <form onSubmit={formik.handleSubmit}>
              <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                
                {/* Customer Dropdown */}
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label required">Customer / Entity</label>
                  <select
                    name="customerId"
                    value={formik.values.customerId}
                    onChange={formik.handleChange}
                    className={`form-control ${formik.touched.customerId && formik.errors.customerId ? "error" : ""}`}
                    disabled={!!editingRecord}
                  >
                    <option value="" disabled>Select a customer...</option>
                    {customers.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name_of_individual} ({c.iec_no})
                      </option>
                    ))}
                  </select>
                  {formik.touched.customerId && formik.errors.customerId && <div className="err-msg">{formik.errors.customerId}</div>}
                </div>

                {/* Training Module */}
                <div className="form-group">
                  <label className="form-label required">Training Module</label>
                  <select
                    name="training_module"
                    value={formik.values.training_module}
                    onChange={formik.handleChange}
                    className="form-control"
                  >
                    <option value="Import Module">Import Module</option>
                    <option value="Export Module">Export Module</option>
                    <option value="Transport Module">Transport Module</option>
                    <option value="E-Lock Module">E-Lock Module</option>
                    <option value="GPS Module">GPS Module</option>
                  </select>
                </div>

                {/* Training Mode */}
                <div className="form-group">
                  <label className="form-label required">Training Mode</label>
                  <select
                    name="training_mode"
                    value={formik.values.training_mode}
                    onChange={formik.handleChange}
                    className="form-control"
                  >
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>

                {/* Trainer Name */}
                <div className="form-group">
                  <label className="form-label required">Trainer Name</label>
                  <input
                    type="text"
                    name="trainer_name"
                    value={formik.values.trainer_name}
                    onChange={formik.handleChange}
                    placeholder="e.g. John Doe"
                    className={`form-control ${formik.touched.trainer_name && formik.errors.trainer_name ? "error" : ""}`}
                  />
                  {formik.touched.trainer_name && formik.errors.trainer_name && <div className="err-msg">{formik.errors.trainer_name}</div>}
                </div>

                {/* Trainee Name */}
                <div className="form-group">
                  <label className="form-label required">Trainee Name</label>
                  <input
                    type="text"
                    name="trainee_name"
                    value={formik.values.trainee_name}
                    onChange={formik.handleChange}
                    placeholder="e.g. Alice Smith"
                    className={`form-control ${formik.touched.trainee_name && formik.errors.trainee_name ? "error" : ""}`}
                  />
                  {formik.touched.trainee_name && formik.errors.trainee_name && <div className="err-msg">{formik.errors.trainee_name}</div>}
                </div>

                {/* Training Date */}
                <div className="form-group">
                  <label className="form-label required">Training Date</label>
                  <input
                    type="date"
                    name="training_date"
                    value={formik.values.training_date}
                    onChange={formik.handleChange}
                    className={`form-control ${formik.touched.training_date && formik.errors.training_date ? "error" : ""}`}
                  />
                  {formik.touched.training_date && formik.errors.training_date && <div className="err-msg">{formik.errors.training_date}</div>}
                </div>

                {/* Valid Till / Expiry Date */}
                <div className="form-group">
                  <label className="form-label">Valid Till / Expiry Date</label>
                  <input
                    type="date"
                    name="valid_till"
                    value={formik.values.valid_till}
                    onChange={formik.handleChange}
                    className="form-control"
                  />
                </div>

                {/* Training Status */}
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label required" style={{ display: "block", marginBottom: "0.5rem" }}>Training Status</label>
                  <div style={{ display: "flex", gap: "1rem" }}>
                    {["Pending", "Completed", "Expired"].map((st) => (
                      <label key={st} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", fontSize: "0.9rem", color: "var(--slate-700)" }}>
                        <input
                          type="radio"
                          name="training_status"
                          value={st}
                          checked={formik.values.training_status === st}
                          onChange={formik.handleChange}
                          style={{ accentColor: "var(--primary-700)" }}
                        />
                        {st}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Remarks */}
                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label className="form-label">Remarks / Notes</label>
                  <textarea
                    name="remarks"
                    value={formik.values.remarks}
                    onChange={formik.handleChange}
                    placeholder="Enter any session notes, remarks, or specific queries raised..."
                    className="form-control"
                    rows="3"
                    style={{ resize: "vertical" }}
                  />
                </div>

              </div>

              {/* FEEDBACK MODULE - Renders only if status is Completed */}
              {formik.values.training_status === "Completed" && (
                <div style={{ background: "rgba(6, 182, 212, 0.04)", border: "1px solid rgba(6, 182, 212, 0.15)", borderRadius: "0.75rem", padding: "1rem", marginBottom: "1.25rem", animation: "slideDown 0.3s ease-out" }}>
                  <h4 style={{ margin: "0 0 0.75rem", color: "var(--primary-900)", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.95rem", fontWeight: 700 }}>
                    <Star style={{ color: "#f59e0b", fontSize: "1.1rem" }} /> Feedback & Customer Satisfaction
                  </h4>
                  
                  <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    
                    {/* Star Rating */}
                    <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                      <label className="form-label" style={{ fontSize: "0.85rem", color: "var(--slate-600)" }}>Feedback Rating</label>
                      <div style={{ display: "flex", gap: "4px", alignItems: "center", marginTop: "4px" }}>
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isFilled = formik.values.feedback_rating >= star;
                          return (
                            <span
                              key={star}
                              onClick={() => formik.setFieldValue("feedback_rating", star)}
                              style={{ cursor: "pointer", color: "#f59e0b", fontSize: "1.5rem" }}
                            >
                              {isFilled ? <Star fontSize="large" /> : <StarBorder fontSize="large" />}
                            </span>
                          );
                        })}
                        {formik.values.feedback_rating && (
                          <span style={{ fontSize: "0.85rem", color: "var(--slate-500)", marginLeft: "0.5rem" }}>
                            ({formik.values.feedback_rating} out of 5 stars)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Satisfaction Toggles */}
                    <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                      <label className="form-label" style={{ fontSize: "0.85rem", color: "var(--slate-600)" }}>Satisfaction Level</label>
                      <div style={{ display: "flex", gap: "0.75rem", marginTop: "4px" }}>
                        {[
                          { val: "Satisfied", color: "#10b981", icon: <ThumbUp fontSize="small" /> },
                          { val: "Neutral", color: "#f59e0b", icon: <ThumbsUpDown fontSize="small" /> },
                          { val: "Unsatisfied", color: "#ef4444", icon: <ThumbDown fontSize="small" /> }
                        ].map((item) => {
                          const isActive = formik.values.satisfaction_status === item.val;
                          return (
                            <button
                              key={item.val}
                              type="button"
                              onClick={() => formik.setFieldValue("satisfaction_status", item.val)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                padding: "6px 12px",
                                border: `1px solid ${isActive ? item.color : "var(--slate-300)"}`,
                                borderRadius: "6px",
                                background: isActive ? `${item.color}15` : "white",
                                color: isActive ? item.color : "var(--slate-600)",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                                fontWeight: isActive ? 600 : 500,
                                transition: "all 0.2s ease"
                              }}
                            >
                              {item.icon} {item.val}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Feedback Comments */}
                    <div className="form-group" style={{ gridColumn: "1 / -1", margin: 0 }}>
                      <label className="form-label" style={{ fontSize: "0.85rem", color: "var(--slate-600)" }}>Feedback Comments</label>
                      <textarea
                        name="feedback_comments"
                        value={formik.values.feedback_comments}
                        onChange={formik.handleChange}
                        placeholder="Enter the customer's comments or specific suggestions about the training..."
                        className="form-control"
                        rows="2"
                        style={{ resize: "vertical" }}
                      />
                    </div>

                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="dialog-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Training Record
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="dialog-overlay" style={{ background: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(4px)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div className="dialog-content" style={{ background: "#ffffff", border: "1px solid var(--slate-200)", padding: "1.5rem", borderRadius: "1rem", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15)", width: "100%", maxWidth: "420px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <span style={{ fontSize: "1.5rem" }}>⚠️</span>
              <h3 style={{ margin: 0, color: "var(--error)", fontSize: "1.25rem", fontWeight: 700 }}>Confirm Deletion</h3>
            </div>
            <p style={{ color: "var(--slate-600)", lineHeight: "1.5", fontSize: "0.95rem", margin: "0 0 1.5rem" }}>
              Are you sure you want to permanently delete this training record? This action is irreversible.
            </p>
            <div className="dialog-actions" style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button className="btn btn-secondary" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button className="btn" onClick={handleDelete} style={{ background: "var(--error)", color: "white" }}>
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default React.memo(TrainingManagement);
