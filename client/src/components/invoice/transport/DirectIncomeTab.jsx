import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const formatINR = (val) => {
  const num = Number(val || 0);
  return `₹ ${num.toLocaleString("en-IN")}`;
};

export default function DirectIncomeTab({ activeUserId }) {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchDirectIncomeDocs = async () => {
    setLoading(true);
    try {
      const start = `${selectedMonth}-01`;
      const end = `${selectedMonth}-31`;
      let url = `${process.env.REACT_APP_API_STRING}/transport-invoicing/direct-income?startDate=${start}&endDate=${end}`;
      if (activeUserId) url += `&userId=${activeUserId}`;

      const res = await axios.get(url, { withCredentials: true });
      if (res.data?.success) {
        setDocs(res.data.docs || []);
      }
    } catch (err) {
      console.error("Failed to load direct income:", err);
      toast.error(err.response?.data?.message || "Failed to load direct income records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectIncomeDocs();
  }, [selectedMonth, activeUserId]);

  const handleStartEdit = (doc) => {
    setEditingId(doc._id);
    setEditAmount(doc.amount);
  };

  const handleSaveEdit = async (docId) => {
    if (Number(editAmount) < 0) {
      toast.error("Direct Income amount cannot be negative");
      return;
    }
    setSaving(true);
    try {
      const res = await axios.put(
        `${process.env.REACT_APP_API_STRING}/transport-invoicing/direct-income/${docId}`,
        { amount: Number(editAmount), reason: "Inline manual edit" },
        { withCredentials: true }
      );
      if (res.data?.success) {
        toast.success("Direct Income amount updated!");
        setEditingId(null);
        fetchDirectIncomeDocs();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update amount");
    } finally {
      setSaving(false);
    }
  };

  const totalDirectIncome = docs.reduce((sum, d) => sum + Number(d.amount || 0), 0);

  return (
    <div className="ti-direct-income-tab">
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
            onClick={fetchDirectIncomeDocs}
            disabled={loading}
          >
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
        </div>
        <div className="ti-filter-group">
          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
            Monthly Direct Income: <strong style={{ color: "#059669", fontSize: "1.05rem" }}>{formatINR(totalDirectIncome)}</strong>
          </span>
        </div>
      </div>

      <div className="ti-card">
        <div className="ti-card-header">
          <h3 className="ti-card-title">
            <span>📈</span> Direct Income Total Records ({selectedMonth})
          </h3>
          <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
            Section 6: Single total amount head. Individual ledger heads are not required.
          </span>
        </div>
        <div className="ti-card-body" style={{ padding: 0 }}>
          <div className="ti-table-responsive">
            <table className="ti-table">
              <thead>
                <tr>
                  <th style={{ width: "200px" }}>Date</th>
                  <th>Description</th>
                  <th style={{ width: "240px" }} className="text-right">Direct Income Total (₹)</th>
                  <th style={{ width: "180px" }}>Updated By</th>
                  <th style={{ width: "160px" }} className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                      Loading direct income records...
                    </td>
                  </tr>
                ) : docs.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>
                      No direct income records found for {selectedMonth}.
                    </td>
                  </tr>
                ) : (
                  docs.map((doc) => {
                    const isEditing = editingId === doc._id;
                    return (
                      <tr key={doc._id}>
                        <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{doc.date}</td>
                        <td style={{ color: "#475569" }}>Direct Income - Daily Aggregate Head</td>
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
                            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#059669" }}>
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
                  <td colSpan="2">TOTAL DIRECT INCOME</td>
                  <td className="text-right" style={{ color: "#059669", fontSize: "1.05rem" }}>
                    {formatINR(totalDirectIncome)}
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
