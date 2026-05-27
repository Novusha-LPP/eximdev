import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../dgft/dgft.scss";

// ===================== Constants =====================
const ROWS_PER_PAGE_OPTIONS = [25, 50, 100];

const TABLE_COLUMNS = [
  { key: "job_no",       label: "JOB NUMBER",          width: 120 },
  { key: "date",         label: "DATE",                width: 100 },
  { key: "party_name",   label: "FIRM NAME",           width: 250 },
  { key: "iec_no",       label: "IEC NAME",            width: 130 },
  { key: "bg_number",    label: "BG NUMBER",           width: 130 },
  { key: "bg_expiry_date", label: "BG EXPIRY DATE",    width: 150 },
  { key: "bg_amount",    label: "BG AMOUNT",           width: 130 },
  { key: "bond_number",  label: "BOND NUMBER",         width: 130 },
  { key: "bond_expiry_date", label: "BOND EXPIRY DATE",  width: 150 },
  { key: "bond_amount",  label: "BOND AMOUNT",         width: 130 },
  { key: "documents_send_to_icd", label: "DOCUMENTS SENT TO ICD", width: 180 },
  { key: "_actions",     label: "ACTIONS",             width: 110 },
];

// Sort icon
function SortIcon({ dir }) {
  return (
    <span className="ar-sort-icon">
      {dir === "asc" ? "↑" : dir === "desc" ? "↓" : "↕"}
    </span>
  );
}

// ── DatePickerInput ───────────────────────────────────────────────
function DatePickerInput({ value, onChange, placeholder = "dd/mm/yyyy" }) {
  const hiddenRef = useRef(null);

  const toNativeValue = (ddmmyyyy) => {
    if (!ddmmyyyy) return "";
    const parts = ddmmyyyy.split("/");
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      if (dd && mm && yyyy && yyyy.length === 4)
        return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
    return "";
  };

  const fromNativeValue = (yyyymmdd) => {
    if (!yyyymmdd) return "";
    const [yyyy, mm, dd] = yyyymmdd.split("-");
    return `${dd}/${mm}/${yyyy}`;
  };

  const handleNativeChange = (e) => onChange(fromNativeValue(e.target.value));

  const handleTextChange = (e) => {
    let raw = e.target.value.replace(/[^0-9/]/g, "");
    if (raw.length === 2 && !raw.includes("/")) raw = raw + "/";
    else if (raw.length === 5 && raw.split("/").length === 2) raw = raw + "/";
    if (raw.length <= 10) onChange(raw);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px", width: "100%" }}>
      <input
        type="text"
        value={value || ""}
        onChange={handleTextChange}
        placeholder={placeholder}
        style={{
          flex: 1,
          minWidth: 0,          /* ← prevents overflow on laptop widths */
          height: "28px",
          padding: "0 6px",
          fontSize: "12px",
          border: "1px solid #d1d5db",
          borderRadius: "4px",
          outline: "none",
          backgroundColor: "#fff",
          boxSizing: "border-box",
        }}
      />
      <button
        type="button"
        onClick={() => hiddenRef.current && hiddenRef.current.showPicker()}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "2px",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        📅
      </button>
      <input
        ref={hiddenRef}
        type="date"
        value={toNativeValue(value)}
        onChange={handleNativeChange}
        style={{
          position: "absolute",
          width: "0px",
          height: "0px",
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function DgftOperationTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterFirmName, setFilterFirmName] = useState("");
  const [filterIec, setFilterIec] = useState("");
  const [sort, setSort] = useState({ key: null, dir: null });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  const navigate = useNavigate();
  const containerRef = useRef(null);

  const getData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/get-authorization-registrations`
      );
      const filtered = res.data.filter(
        (r) => r.documents_send_to_icd && r.documents_send_to_icd.trim() !== ""
      );
      const sorted = filtered.sort((a, b) =>
        String(a.job_no || "").localeCompare(String(b.job_no || ""), undefined, {
          numeric: true,
        })
      );
      setRows(sorted);
    } catch (err) {
      console.error("Error fetching authorization registrations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getData();
  }, [getData]);

  const filterOptions = useMemo(() => {
    const fn = new Set();
    const ic = new Set();
    rows.forEach((r) => {
      if (r.party_name?.trim()) fn.add(r.party_name.trim());
      if (r.iec_no?.trim()) ic.add(r.iec_no.trim());
    });
    return {
      party_name: Array.from(fn).sort(),
      iec_no: Array.from(ic).sort(),
    };
  }, [rows]);

  const handleCellChange = useCallback((id, columnId, value) => {
    setRows((prev) =>
      prev.map((row) => (row._id === id ? { ...row, [columnId]: value } : row))
    );
  }, []);

  const handleSubmitRow = async (row) => {
    if (!row.bond_number || row.bond_number.trim() === "") {
      setToast({
        open: true,
        message: "Bond Number is mandatory to submit!",
        severity: "warning",
      });
      return;
    }
    setSubmittingId(row._id);
    try {
      await axios.put(
        `${process.env.REACT_APP_API_STRING}/update-authorization-registration/${row._id}`,
        {
          bg_number: row.bg_number,
          bg_expiry_date: row.bg_expiry_date,
          bg_amount: row.bg_amount,
          bond_number: row.bond_number,
          bond_expiry_date: row.bond_expiry_date,
          bond_amount: row.bond_amount,
        }
      );
      setToast({
        open: true,
        message: `License details for ${row.job_no} saved successfully!`,
        severity: "success",
      });
    } catch (error) {
      console.error("Error submitting details:", error);
      setToast({
        open: true,
        message: "Failed to save details. Please try again.",
        severity: "error",
      });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleSort = (key) => {
    if (key === "_actions") return;
    setSort((prev) => ({
      key,
      dir: prev.key === key ? (prev.dir === "asc" ? "desc" : "asc") : "asc",
    }));
  };

  useEffect(() => {
    setPage(0);
  }, [search, filterFirmName, filterIec]);

  const displayed = useMemo(() => {
    let result = rows.filter((row) => {
      if (filterFirmName && row.party_name !== filterFirmName) return false;
      if (filterIec && row.iec_no !== filterIec) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (
          !(row.job_no || "").toLowerCase().includes(q) &&
          !(row.party_name || "").toLowerCase().includes(q) &&
          !(row.licence_no || "").toLowerCase().includes(q) &&
          !(row.iec_no || "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
    if (sort.key) {
      result = [...result].sort((a, b) => {
        const va = String(a[sort.key] || "").toLowerCase();
        const vb = String(b[sort.key] || "").toLowerCase();
        return sort.dir === "asc"
          ? va.localeCompare(vb, undefined, { numeric: true })
          : vb.localeCompare(va, undefined, { numeric: true });
      });
    }
    return result;
  }, [rows, search, filterFirmName, filterIec, sort]);

  const totalPages = Math.ceil(displayed.length / rowsPerPage) || 1;
  const paginatedRows = displayed.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  useEffect(() => {
    if (toast.open) {
      const timer = setTimeout(
        () => setToast((prev) => ({ ...prev, open: false })),
        4000
      );
      return () => clearTimeout(timer);
    }
  }, [toast.open]);

  if (loading) {
    return (
      <div style={{ padding: "20px", fontSize: "16px", color: "#475569" }}>
        Loading DGFT authorization details...
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 0" }}>
      {/* ── Toolbar ── */}
      <div className="ar-toolbar">
        {/*
          width: 100% + flex-wrap ensure the toolbar fills the available
          container width on any laptop resolution and wraps gracefully
          when the viewport narrows below ~1100px.
        */}
        <div
          className="ar-toolbar-left"
          style={{ width: "100%", flexWrap: "wrap" }}
        >
          <div className="ar-search-wrap">
            <input
              type="text"
              placeholder="Search Job No, Party, Auth No, IEC…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="ar-filter-select"
            value={filterFirmName}
            onChange={(e) => setFilterFirmName(e.target.value)}
          >
            <option value="">All Firms</option>
            {filterOptions.party_name.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <select
            className="ar-filter-select"
            value={filterIec}
            onChange={(e) => setFilterIec(e.target.value)}
          >
            <option value="">All IEC</option>
            {filterOptions.iec_no.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Table card ── */}
      <div className="ar-table-outer">
        <div
          ref={containerRef}
          className="ar-table-scroll"
          onMouseDown={(e) => {
            if (
              e.target.tagName === "INPUT" ||
              e.target.tagName === "SELECT" ||
              e.target.tagName === "BUTTON"
            )
              return;
            const el = containerRef.current;
            if (!el) return;
            el.dataset.isDown = "true";
            el.dataset.startX = e.pageX - el.offsetLeft;
            el.dataset.scrollLeft = el.scrollLeft;
            el.dataset.dragged = "false";
          }}
          onMouseLeave={() => {
            const el = containerRef.current;
            if (el) el.dataset.isDown = "false";
          }}
          onMouseUp={() => {
            const el = containerRef.current;
            if (el) el.dataset.isDown = "false";
          }}
          onMouseMove={(e) => {
            const el = containerRef.current;
            if (!el || el.dataset.isDown !== "true") return;
            const x = e.pageX - el.offsetLeft;
            const walk = (x - Number(el.dataset.startX)) * 2;
            if (Math.abs(walk) > 5) {
              el.dataset.dragged = "true";
              e.preventDefault();
              el.scrollLeft = Number(el.dataset.scrollLeft) - walk;
            }
          }}
        >
          <table className="ar-table">
            <thead>
              <tr>
                {TABLE_COLUMNS.map((col) => {
                  const sorted = sort.key === col.key;
                  return (
                    <th
                      key={col.key}
                      className={sorted ? "ar-th-sorted" : undefined}
                      style={{ width: col.width, minWidth: col.width }}
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}{" "}
                      {col.key !== "_actions" && (
                        <SortIcon dir={sorted ? sort.dir : null} />
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={TABLE_COLUMNS.length}>
                    <div className="ar-empty-state">No records found</div>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr key={row._id} className="ar-data-row">
                    {TABLE_COLUMNS.map((col) => {
                      const val = row[col.key] || "";

                      if (col.key === "job_no") {
                        const sVal = String(val);
                        const displayVal = sVal.includes("/")
                          ? sVal
                          : `LIC/${sVal}`;
                        return (
                          <td
                            key={col.key}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                `/dgft/authorization-details/${row._id}`
                              );
                            }}
                          >
                            <span className="ar-job-link">{displayVal}</span>
                          </td>
                        );
                      }

                      if (
                        col.key === "date" ||
                        col.key === "iec_no" ||
                        col.key === "documents_send_to_icd"
                      ) {
                        return <td key={col.key}>{val}</td>;
                      }

                      if (col.key === "party_name") {
                        return (
                          <td
                            key={col.key}
                            style={{
                              whiteSpace: "normal",
                              wordBreak: "break-word",
                              maxWidth: 200,
                            }}
                          >
                            {val}
                          </td>
                        );
                      }

                      if (
                        col.key === "bg_number" ||
                        col.key === "bond_number" ||
                        col.key === "bg_amount" ||
                        col.key === "bond_amount"
                      ) {
                        return (
                          <td key={col.key}>
                            <input
                              type="text"
                              value={val}
                              onChange={(e) =>
                                handleCellChange(row._id, col.key, e.target.value)
                              }
                              style={{
                                width: "100%",
                                boxSizing: "border-box",
                                height: "28px",
                                padding: "0 6px",
                                fontSize: "12px",
                                border: "1px solid #d1d5db",
                                borderRadius: "4px",
                                outline: "none",
                                backgroundColor: "#fff",
                              }}
                            />
                          </td>
                        );
                      }

                      if (
                        col.key === "bg_expiry_date" ||
                        col.key === "bond_expiry_date"
                      ) {
                        return (
                          <td key={col.key}>
                            <DatePickerInput
                              value={val}
                              onChange={(v) =>
                                handleCellChange(row._id, col.key, v)
                              }
                            />
                          </td>
                        );
                      }

                      if (col.key === "_actions") {
                        const isSaving = submittingId === row._id;
                        return (
                          <td key={col.key} style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleSubmitRow(row)}
                              disabled={isSaving}
                              style={{
                                textTransform: "none",
                                fontSize: "11px",
                                padding: "4px 10px",
                                borderRadius: "4px",
                                background:
                                  "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                border: "none",
                                color: "#ffffff",
                                fontWeight: 600,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {isSaving ? "Saving..." : "Submit"}
                            </button>
                          </td>
                        );
                      }

                      return <td key={col.key}>{val}</td>;
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="ar-pagination">
          <div className="ar-pagination-info">
            Showing{" "}
            {displayed.length === 0 ? 0 : page * rowsPerPage + 1}–
            {Math.min((page + 1) * rowsPerPage, displayed.length)} of{" "}
            {displayed.length} records
          </div>
          <div className="ar-pagination-controls">
            <span style={{ color: "#000000ff" }}>Rows:</span>
            <select
              className="ar-rows-select"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(0);
              }}
            >
              {ROWS_PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <button
              className="ar-page-btn"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              ‹ Prev
            </button>
            <span>
              Page {page + 1} of {totalPages}
            </span>
            <button
              className="ar-page-btn"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next ›
            </button>
          </div>
        </div>
      </div>

      {/* Floating toast */}
      {toast.open && (
        <div className={`dgft-toast ${toast.severity}`}>
          {toast.message}
          <button
            onClick={() => setToast((prev) => ({ ...prev, open: false }))}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export default React.memo(DgftOperationTab);