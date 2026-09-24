import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const formatINR = (val) => {
  const num = Number(val || 0);
  return `₹ ${num.toLocaleString("en-IN")}`;
};

export default function SundryDebtorsTab({ activeUserId }) {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchSundryDocs = async () => {
    setLoading(true);
    try {
      const start = `${selectedMonth}-01`;
      const end = `${selectedMonth}-31`;
      let url = `${process.env.REACT_APP_API_STRING}/transport-invoicing/sundry-debtors?startDate=${start}&endDate=${end}`;
      if (activeUserId) url += `&userId=${activeUserId}`;

      const res = await axios.get(url, { withCredentials: true });
      if (res.data?.success) {
        setDocs(res.data.docs || []);
      }
    } catch (err) {
      console.error("Failed to load sundry debtors:", err);
      toast.error(err.response?.data?.message || "Failed to load sundry debtors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSundryDocs();
  }, [selectedMonth, activeUserId]);

  const handleStartEdit = (doc) => {
    setEditingId(doc._id);
    setEditAmount(doc.amount);
  };

  const handleSaveEdit = async (docId) => {
    if (Number(editAmount) < 0) {
      toast.error("Sundry Debtor amount cannot be negative");
      return;
    }
    setSaving(true);
    try {
      const res = await axios.put(
        `${process.env.REACT_APP_API_STRING}/transport-invoicing/sundry-debtors/${docId}`,
        { amount: Number(editAmount), reason: "Inline manual edit" },
        { withCredentials: true }
      );
      if (res.data?.success) {
        toast.success("Sundry debtor amount updated!");
        setEditingId(null);
        fetchSundryDocs();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update amount");
    } finally {
      setSaving(false);
    }
  };

  const totalSundryAmount = docs.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  return (
    <div className="ti-sundry-tab">
      <div className="ti-filter-bar">
        <div className="ti-filter-group">
          <span style={{ fontWeight: 700, color: "#334155" }}>Month Filter:</span>
          <input
            type="month"
            className="ti-input"
            style={{ width: "auto", fontWeight: 700 }}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
          <button
            type="button"
            className="ti-btn ti-btn-secondary"
            onClick={fetchSundryDocs}
            disabled={loading}
          >
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
        </div>
        <div className="ti-filter-group">
          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
            Monthly Total: <strong style={{ color: "#4f46e5", fontSize: "1.05rem" }}>{formatINR(totalSundryAmount)}</strong>
          </span>
        </div>
      </div>

      <div className="ti-card">
        <div className="ti-card-header">
          <h3 className="ti-card-title">
            <span>👥</span> Sundry Debtors Entries ({selectedMonth})
          </h3>
          <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
            Categories: Direct Party | Suraj Forwarders Pvt. Ltd. | Additional Transporter
          </span>
        </div>
        <div className="ti-card-body" style={{ padding: 0 }}>
          <div className="ti-table-responsive">
            <table className="ti-table">
              <thead>
                <tr>
                  <th style={{ width: "160px" }}>Date</th>
                  <th>Particulars</th>
                  <th style={{ width: "220px" }} className="text-right">Amount (₹)</th>
                  <th style={{ width: "160px" }}>Updated By</th>
                  <th style={{ width: "160px" }} className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                      Loading sundry debtor records...
                    </td>
                  </tr>
                ) : docs.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                      No sundry debtor records found for {selectedMonth}. Add entries via Daily Invoicing or Excel Upload.
                    </td>
                  </tr>
                ) : (
                  docs.map((doc) => {
                    const isEditing = editingId === doc._id;
                    return (
                      <tr key={doc._id}>
                        <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{doc.date}</td>
                        <td style={{ fontWeight: 600, color: "#1e293b" }}>{doc.particulars}</td>
                        <td className="text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              min="0"
                              step="any"
                              className="ti-input text-right"
                              value={editAmount}
                              onChange={(e) => setEditAmount(e.target.value)}
                              autoFocus
                            />
                          ) : (
                            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                              {formatINR(doc.amount)}
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: "0.8rem", color: "#64748b" }}>
                          {doc.updated_by || doc.created_by || "Ayan"}
                        </td>
                        <td className="text-center">
                          {isEditing ? (
                            <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
                              <button
                                type="button"
                                className="ti-btn ti-btn-success"
                                style={{ padding: "0.25rem 0.6rem", fontSize: "0.78rem" }}
                                onClick={() => handleSaveEdit(doc._id)}
                                disabled={saving}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="ti-btn ti-btn-secondary"
                                style={{ padding: "0.25rem 0.6rem", fontSize: "0.78rem" }}
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className="ti-btn ti-btn-secondary"
                              style={{ padding: "0.25rem 0.65rem", fontSize: "0.78rem" }}
                              onClick={() => handleStartEdit(doc)}
                            >
                              ✏️ Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="2">TOTAL SUNDRY DEBTORS</td>
                  <td className="text-right" style={{ color: "#4f46e5", fontSize: "1.05rem" }}>
                    {formatINR(totalSundryAmount)}
                  </td>
                  <td colSpan="2">—</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
