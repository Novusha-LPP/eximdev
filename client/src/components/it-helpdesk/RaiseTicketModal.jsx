import React, { useState, useEffect, useRef, useContext } from "react";
import toast from "react-hot-toast";
import { X, UploadCloud, Send, Ticket, Trash2 } from "lucide-react";
import { itHelpdeskAPI } from "../../api/itHelpdeskAPI";
import { UserContext } from "../../contexts/UserContext";
import CustomSelect from "./CustomSelect";

const TICKET_CATEGORIES = ["Hardware", "Software", "Network", "Access", "Other"];
const TICKET_PRIORITIES = ["Low", "Medium", "High", "Critical"];
const TICKET_DEPARTMENTS = [
  "Import",
  "Export",
  "DGFT",
  "Alluvium-IT",
  "Novusha-IT",
  "Paramount",
  "Account",
  "E-sanchit",
  "Admin/Hr",
  "Operations",
  "Sales/CRM",
  "Other",
];

const getTodayFormattedDate = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  return `${day}-${month}-${year}`;
};

const getTodayISODate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function RaiseTicketModal({ open, onClose, onTicketRaised }) {
  const { user } = useContext(UserContext);
  const isAdmin = user?.role === "Admin";
  const fileInputRef = useRef(null);

  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Hardware");
  const [priority, setPriority] = useState("Medium");
  const [department, setDepartment] = useState("");
  const [assignedTo, setAssignedTo] = useState("Vikas Chandra");
  const [users, setUsers] = useState([]);
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    // Reset form when modal opens
    setDescription("");
    setCategory("Hardware");
    setPriority("Medium");
    setDepartment("");
    setFiles([]);
    setSaving(false);

    // Fetch users for assignment dropdown if admin or finding default IT assignee
    const fetchUsers = async () => {
      try {
        const res = await itHelpdeskAPI.users.getAll();
        const userList = res?.data || res || [];
        setUsers(Array.isArray(userList) ? userList : []);

        const vikas = userList.find?.(
          (u) =>
            (u.username || u.first_name || u.name || u.email || "")
              .toLowerCase()
              .includes("vikas")
        );
        if (vikas) {
          setAssignedTo(vikas._id);
        } else {
          setAssignedTo("Vikas Chandra");
        }
      } catch (err) {
        console.warn("Could not fetch IT users for assignee list:", err);
      }
    };

    fetchUsers();
  }, [open]);

  if (!open) return null;

  const handleFileSelect = (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    const fileArray = Array.from(selectedFiles);

    const allowedExtensions = /\.(jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|zip)$/i;
    const validFiles = [];

    for (const file of fileArray) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File "${file.name}" exceeds the 10MB limit.`);
        continue;
      }
      if (!allowedExtensions.test(file.name)) {
        toast.error(`File type for "${file.name}" is not supported.`);
        continue;
      }
      validFiles.push(file);
    }

    setFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error("Issue Description is required");
      return;
    }
    if (!category) {
      toast.error("Category is required");
      return;
    }
    if (!department) {
      toast.error("Department is required");
      return;
    }

    setSaving(true);
    try {
      const autoTitle = `[Incident] ${category}`;
      const todayISO = getTodayISODate();
      let payload;

      if (files.length > 0) {
        const formData = new FormData();
        formData.append("title", autoTitle);
        formData.append("description", description);
        formData.append("category", category);
        formData.append("priority", priority);
        formData.append("type", "Incident");
        formData.append("status", "New");
        formData.append("department", department);
        formData.append("sla_due_date", todayISO);
        formData.append(
          "requester_name",
          user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : user?.username || ""
        );
        if (assignedTo && assignedTo !== "Vikas Chandra") {
          formData.append("assigned_to", assignedTo);
        } else {
          formData.append("assigned_to_name", "Vikas Chandra");
        }
        files.forEach((file) => formData.append("files", file));
        payload = formData;
      } else {
        payload = {
          title: autoTitle,
          description,
          category,
          priority,
          type: "Incident",
          status: "New",
          department,
          sla_due_date: todayISO,
          requester_name: user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : user?.username || "",
          assigned_to: assignedTo !== "Vikas Chandra" ? assignedTo : undefined,
          assigned_to_name: "Vikas Chandra",
        };
      }

      await itHelpdeskAPI.tickets.create(payload);
      toast.success("Ticket raised successfully!");

      // Dispatch event for Helpdesk & Tickets to auto-refresh
      localStorage.setItem("ticketDataRefresh", JSON.stringify({ timestamp: Date.now() }));
      window.dispatchEvent(new Event("ticketDataUpdated"));

      if (onTicketRaised) onTicketRaised();
      onClose();
    } catch (err) {
      console.error("Error raising ticket:", err);
      toast.error(err?.response?.data?.message || "Failed to raise support ticket");
    } finally {
      setSaving(false);
    }
  };

  // Find user display name for Assigned To read-only view
  const getAssigneeDisplayName = () => {
    if (!assignedTo) return "Vikas Chandra";
    const foundUser = users.find((u) => String(u._id) === String(assignedTo));
    if (foundUser) {
      return (
        `${foundUser.first_name || ""} ${foundUser.last_name || ""}`.trim() ||
        foundUser.name ||
        foundUser.username ||
        foundUser.email
      ).toUpperCase();
    }
    return "VIKAS CHANDRA";
  };

  return (
    <div
      className="modal-overlay"
      onClick={() => !saving && onClose()}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "680px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 24px",
            backgroundColor: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                boxShadow: "0 4px 10px rgba(37, 99, 235, 0.25)",
                flexShrink: 0,
              }}
            >
              <Ticket size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0f172a", lineHeight: 1.2 }}>
                Raise Support Ticket
              </h3>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>
                Fill in the details below to request IT assistance
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !saving && onClose()}
            style={{
              background: "transparent",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#64748b",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#e2e8f0")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "22px 24px", overflowY: "auto", flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Issue Description */}
            <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px" }}>
                Issue Description <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <textarea
                placeholder="Please describe the issue, symptoms, or request with as much detail as possible..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: "85px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  color: "#0f172a",
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s ease",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
              />
            </div>

            {/* Category */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px" }}>
                Category <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <CustomSelect
                value={category}
                onChange={(val) => setCategory(val)}
                options={TICKET_CATEGORIES.map((c) => ({ label: c, value: c }))}
                placeholder="Select Category"
                width="100%"
              />
            </div>

            {/* Priority */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px" }}>
                Priority (Optional)
              </label>
              <CustomSelect
                value={priority}
                onChange={(val) => setPriority(val)}
                options={TICKET_PRIORITIES.map((p) => ({ label: p, value: p }))}
                placeholder="Select Priority"
                width="100%"
              />
            </div>

            {/* Assigned To */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px" }}>
                Assigned To
              </label>
              {isAdmin ? (
                <CustomSelect
                  value={assignedTo}
                  onChange={(val) => setAssignedTo(val)}
                  options={[
                    { label: "Vikas Chandra", value: "Vikas Chandra" },
                    ...users.map((u) => ({
                      label: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.name || u.username || u.email,
                      value: u._id,
                    })),
                  ]}
                  placeholder="Select Assignee"
                  width="100%"
                />
              ) : (
                <div
                  style={{
                    height: "38px",
                    padding: "0 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#f1f5f9",
                    color: "#475569",
                    fontSize: "13px",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    boxSizing: "border-box",
                    letterSpacing: "0.3px",
                  }}
                >
                  {getAssigneeDisplayName()}
                </div>
              )}
            </div>

            {/* Department */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px" }}>
                Department <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <CustomSelect
                value={department}
                onChange={(val) => setDepartment(val)}
                options={TICKET_DEPARTMENTS.map((dept) => ({ label: dept, value: dept }))}
                placeholder="Select Department"
                width="100%"
              />
            </div>

            {/* SLA Due Date */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px" }}>
                SLA Due Date <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                disabled
                value={getTodayFormattedDate()}
                style={{
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  color: "#475569",
                  fontSize: "13px",
                  boxSizing: "border-box",
                }}
              />
              <span style={{ fontSize: "11px", color: "#64748b", marginTop: "3px" }}>
                Auto-set to today's date
              </span>
            </div>

            {/* Initial Status */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px" }}>
                Initial Status
              </label>
              <div
                style={{
                  height: "38px",
                  padding: "0 12px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#f8fafc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxSizing: "border-box",
                }}
              >
                <span
                  style={{
                    backgroundColor: "#0284c7",
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: "12px",
                  }}
                >
                  New
                </span>
                <span style={{ fontSize: "11.5px", color: "#64748b" }}>
                  Starts automatically as New
                </span>
              </div>
            </div>

            {/* Attachments Section */}
            <div style={{ gridColumn: "span 2", display: "flex", flexDirection: "column" }}>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", marginBottom: "6px" }}>
                Attachments (Optional)
              </label>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".png,.jpg,.jpeg,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                onChange={(e) => handleFileSelect(e.target.files)}
                style={{ display: "none" }}
              />

              <div
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                  border: isDragging ? "2px dashed #2563eb" : "2px dashed #cbd5e1",
                  borderRadius: "12px",
                  padding: "20px 16px",
                  textAlign: "center",
                  backgroundColor: isDragging ? "#eff6ff" : "#f8fafc",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: "#475569",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    marginBottom: "8px",
                  }}
                >
                  <UploadCloud size={20} />
                </div>
                <div style={{ fontSize: "13.5px", fontWeight: 600, color: "#1e293b" }}>
                  Click to upload or drag &amp; drop screenshots / files
                </div>
                <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "3px" }}>
                  Supported: PNG, JPG, JPEG (Max 10MB each)
                </div>
              </div>

              {/* Uploaded File List */}
              {files.length > 0 && (
                <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {files.map((file, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        backgroundColor: "#f1f5f9",
                        borderRadius: "8px",
                        fontSize: "12.5px",
                        color: "#334155",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                        <span style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "320px" }}>
                          {file.name}
                        </span>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>
                          ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(idx);
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          padding: "4px",
                          display: "flex",
                          alignItems: "center",
                        }}
                        title="Remove file"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #e2e8f0",
            backgroundColor: "#ffffff",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
          <button
            type="button"
            onClick={() => !saving && onClose()}
            disabled={saving}
            style={{
              padding: "9px 20px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#475569",
              fontWeight: 600,
              fontSize: "13.5px",
              cursor: saving ? "not-allowed" : "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseOver={(e) => !saving && (e.currentTarget.style.backgroundColor = "#f1f5f9")}
            onMouseOut={(e) => !saving && (e.currentTarget.style.backgroundColor = "#ffffff")}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            style={{
              padding: "9px 24px",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "13.5px",
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 2px 8px rgba(37, 99, 235, 0.3)",
              transition: "all 0.15s ease",
            }}
            onMouseOver={(e) => !saving && (e.currentTarget.style.opacity = "0.9")}
            onMouseOut={(e) => !saving && (e.currentTarget.style.opacity = "1")}
          >
            <Send size={15} />
            {saving ? "Raising Ticket..." : "Raise Ticket"}
          </button>
        </div>
      </div>
    </div>
  );
}
