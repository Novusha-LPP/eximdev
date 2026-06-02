import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { scorecardAPI } from "../api/scorecardAPI";
import { computeScores, getScoreBadgeClass, getRatingLabel, getStatusClass } from "../utils";
import "../styles/scorecard.scss";

const EMPTY_COMPLAINT = {
  date: "", issue: "", responseTime: "", resolutionTime: "",
  status: "Open", remarks: "",
};

export default function ScorecardForm() {
  const navigate = useNavigate();
  const { id } = useParams(); // undefined = create mode
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  // ── Form state ─────────────────────────────────────────────────────────
  const [meta, setMeta] = useState({
    supplierName: "", serviceType: "", evaluationPeriod: "",
    evaluatedBy: "", branch: "All Branches",
    date: new Date().toISOString().split("T")[0],
  });
  const [items, setItems] = useState([]);
  const [complaints, setComplaints] = useState([{ ...EMPTY_COMPLAINT }]);
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState("Draft");

  // ── Computed totals ────────────────────────────────────────────────────
  const { items: scoredItems, total, maxTotal, percentage } = computeScores(items);
  const overall = percentage > 0 ? getRatingLabel(percentage) : null;

  // ── Load template or existing scorecard ───────────────────────────────
  useEffect(() => {
    if (isEdit) {
      scorecardAPI.getById(id)
        .then(({ data }) => {
          setMeta({
            supplierName: data.supplierName,
            serviceType: data.serviceType || "",
            evaluationPeriod: data.evaluationPeriod || "",
            evaluatedBy: data.evaluatedBy || "",
            branch: data.branch,
            date: data.date?.split("T")[0] || "",
          });
          setItems(data.evaluationItems);
          setComplaints(data.complaints?.length ? data.complaints : [{ ...EMPTY_COMPLAINT }]);
          setRemarks(data.overallRemarks || "");
          setStatus(data.status);
        })
        .catch(() => toast.error("Failed to load scorecard"))
        .finally(() => setLoading(false));
    } else {
      scorecardAPI.getTemplate()
        .then(({ data }) => setItems(data.evaluationItems))
        .catch(() => toast.error("Failed to load template"));
    }
  }, [id, isEdit]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleMeta = (e) =>
    setMeta((m) => ({ ...m, [e.target.name]: e.target.value }));

  const handleRating = useCallback((idx, val) => {
    const v = parseFloat(val);
    setItems((prev) =>
      prev.map((item, i) =>
        i === idx ? { ...item, rating: isNaN(v) ? 0 : Math.min(10, Math.max(0, v)) } : item
      )
    );
  }, []);

  const handleComplaint = (idx, field, val) =>
    setComplaints((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: val } : c))
    );

  const addComplaintRow = () =>
    setComplaints((prev) => [...prev, { ...EMPTY_COMPLAINT }]);

  const removeComplaintRow = (idx) =>
    setComplaints((prev) => prev.filter((_, i) => i !== idx));

  const buildPayload = () => ({
    ...meta,
    evaluationItems: scoredItems,
    complaints,
    overallRemarks: remarks,
    status,
  });

  const handleSave = async (nextStatus) => {
    if (!meta.supplierName.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    setSaving(true);
    const payload = { ...buildPayload(), status: nextStatus || status };
    try {
      if (isEdit) {
        await scorecardAPI.update(id, payload);
        toast.success("Scorecard updated");
      } else {
        const { data } = await scorecardAPI.create(payload);
        toast.success("Scorecard created");
        navigate(`/scorecards/${data._id}/edit`);
      }
    } catch {
      toast.error("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-body text-muted">Loading…</div>;

  return (
    <>
      {/* ── Topbar ─────────────────────────────────────────────────── */}
      <div className="topbar">
        <div className="topbar-left">
          <button className="btn btn-icon" onClick={() => navigate("/scorecards")} title="Back">
            ←
          </button>
          <div>
            <div className="topbar-title">
              {isEdit ? "Edit Scorecard" : "New Scorecard"}
            </div>
          </div>
        </div>
        <div className="topbar-right">
          {isEdit && (
            <span className={`score-badge ${getStatusClass(status)}`}>{status}</span>
          )}
          <button className="btn" onClick={() => navigate("/scorecards")}>Cancel</button>
          <button className="btn" onClick={() => handleSave("Draft")} disabled={saving}>
            {saving ? "Saving…" : "Save Draft"}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleSave("Submitted")}
            disabled={saving}
          >
            Submit
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* ── Supplier Info ─────────────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📋 Supplier Information</div>
            {overall && (
              <span className={`score-badge ${overall.badgeClass}`}>
                {overall.label} — {percentage}%
              </span>
            )}
          </div>
          <div className="card-body">
            <div className="form-grid">
              {[
                { label: "Supplier Name *", name: "supplierName", type: "text", placeholder: "Enter supplier name" },
                { label: "Service / AMC Type", name: "serviceType", type: "text", placeholder: "e.g. HVAC, Generator AMC" },
                { label: "Evaluation Period", name: "evaluationPeriod", type: "month" },
                { label: "Evaluated By", name: "evaluatedBy", type: "text", placeholder: "Name / Designation" },
                { label: "Date", name: "date", type: "date" },
              ].map(({ label, name, type, placeholder }) => (
                <div className="form-field" key={name}>
                  <label>{label}</label>
                  <input
                    type={type}
                    name={name}
                    value={meta[name]}
                    onChange={handleMeta}
                    placeholder={placeholder}
                  />
                </div>
              ))}
              <div className="form-field">
                <label>Branch</label>
                <select name="branch" value={meta.branch} onChange={handleMeta}>
                  {["All Branches", "SEA", "AIR", "HQ"].map((b) => (
                    <option key={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* ── Score Card Table ───────────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📊 Evaluation Score Card</div>
            <div className="stat-grid" style={{ marginBottom: 0, minWidth: 280 }}>
              <div className="stat-card">
                <div className="stat-val">{total.toFixed(2)}</div>
                <div className="stat-lbl">Total Score</div>
              </div>
              <div className="stat-card">
                <div className="stat-val">{maxTotal}</div>
                <div className="stat-lbl">Max Score</div>
              </div>
              <div className="stat-card">
                <div className="stat-val">{percentage}%</div>
                <div className="stat-lbl">Percentage</div>
              </div>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>Sr.</th>
                  <th>Evaluation Criteria</th>
                  <th style={{ width: 100, textAlign: "center" }}>Weightage (%)</th>
                  <th style={{ width: 140, textAlign: "center" }}>Rating (1–10)</th>
                  <th style={{ width: 90, textAlign: "center" }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {scoredItems.map((item, idx) => (
                  <tr key={item.srNo}>
                    <td className="text-muted">{item.srNo}</td>
                    <td>{item.criteria}</td>
                    <td className="text-center">{item.weightage}</td>
                    <td className="text-center">
                      <input
                        className="rating-input"
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={item.rating || ""}
                        placeholder="–"
                        onChange={(e) => handleRating(idx, e.target.value)}
                      />
                    </td>
                    <td className="text-center">
                      <span
                        className={`score-badge ${getScoreBadgeClass(item.score, item.weightage)}`}
                      >
                        {item.rating ? item.score.toFixed(2) : "–"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="tfoot-row">
                  <td colSpan={2} className="fw-600">Total</td>
                  <td className="text-center fw-600">{maxTotal}</td>
                  <td />
                  <td className="text-center fw-600">
                    {total.toFixed(2)} / {maxTotal}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Rating Criteria Legend ─────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🏆 Rating Criteria</div>
          </div>
          <div className="card-body">
            <div className="legend-grid">
              {[
                { range: "9 – 10", label: "Excellent",         dot: "#2e7d32" },
                { range: "7 – 8",  label: "Good",              dot: "#1565c0" },
                { range: "6 – 7",  label: "Satisfactory",      dot: "#e65100" },
                { range: "5 – 6",  label: "Needs Improvement", dot: "#880e4f" },
                { range: "< 5",    label: "Poor",              dot: "#b71c1c" },
              ].map(({ range, label, dot }) => (
                <div className="legend-item" key={label}>
                  <div className="legend-dot" style={{ background: dot }} />
                  <span><strong>{range}</strong> : {label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Complaint Tracking ─────────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🔧 Complaint & Service Tracking</div>
            <button className="btn btn-sm" onClick={addComplaintRow}>+ Add Row</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: 110 }}>Date</th>
                  <th style={{ minWidth: 180 }}>Complaint / Issue</th>
                  <th style={{ minWidth: 110 }}>Response Time</th>
                  <th style={{ minWidth: 120 }}>Resolution Time</th>
                  <th style={{ minWidth: 110 }}>Status</th>
                  <th style={{ minWidth: 160 }}>Remarks</th>
                  <th style={{ width: 36 }} />
                </tr>
              </thead>
              <tbody>
                {complaints.map((c, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        className="cell-input"
                        type="date"
                        value={c.date}
                        onChange={(e) => handleComplaint(idx, "date", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="cell-input"
                        type="text"
                        placeholder="Describe issue…"
                        value={c.issue}
                        onChange={(e) => handleComplaint(idx, "issue", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="cell-input"
                        type="text"
                        placeholder="e.g. 2 hrs"
                        value={c.responseTime}
                        onChange={(e) => handleComplaint(idx, "responseTime", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="cell-input"
                        type="text"
                        placeholder="e.g. 1 day"
                        value={c.resolutionTime}
                        onChange={(e) => handleComplaint(idx, "resolutionTime", e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        className="cell-input"
                        value={c.status}
                        onChange={(e) => handleComplaint(idx, "status", e.target.value)}
                      >
                        <option>Open</option>
                        <option>In Progress</option>
                        <option>Resolved</option>
                      </select>
                    </td>
                    <td>
                      <input
                        className="cell-input"
                        type="text"
                        placeholder="Remarks…"
                        value={c.remarks}
                        onChange={(e) => handleComplaint(idx, "remarks", e.target.value)}
                      />
                    </td>
                    <td>
                      <button
                        className="btn btn-icon btn-danger"
                        onClick={() => removeComplaintRow(idx)}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Overall Remarks ────────────────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📝 Overall Remarks & Recommendations</div>
          </div>
          <div className="card-body">
            <div className="form-field">
              <textarea
                rows={4}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter overall remarks, recommendations, or action items…"
              />
            </div>
          </div>
        </div>

        {/* ── Bottom Actions ─────────────────────────────────────────── */}
        <div className="flex gap-8" style={{ justifyContent: "flex-end", paddingBottom: 20 }}>
          <button className="btn" onClick={() => navigate("/scorecards")}>Cancel</button>
          <button className="btn" onClick={() => handleSave("Draft")} disabled={saving}>
            Save Draft
          </button>
          <button
            className="btn btn-primary"
            onClick={() => handleSave("Submitted")}
            disabled={saving}
          >
            {saving ? "Submitting…" : "Submit Scorecard"}
          </button>
        </div>
      </div>
    </>
  );
}
