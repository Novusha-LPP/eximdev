import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Box, Button, Chip, InputAdornment, MenuItem, Skeleton, Stack, TextField, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { formatIST, ACTION_STYLE, INK, LINE, MUTED, TimelineEntry, cardSx, fieldSx, groupByDay } from "./auditUi";

const API = process.env.REACT_APP_API_STRING;
const MODULES = ["Job", "User", "Importer", "Branch", "Team", "inwardRegister", "outwardRegister", "KPI_Sheet", "MRM_Item", "CurrencyRate"];

const AuditFeed = ({ range, username, onUsernameChange }) => {
  const [action, setAction] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = async (pageNum, replace) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/audit-trail`, {
        params: {
          page: pageNum,
          limit: 30,
          action: action || undefined,
          username: username || undefined,
          documentType: documentType || undefined,
          search: debounced || undefined,
          fromDate: range.from || undefined,
          toDate: range.to || undefined,
          allDates: !range.from && !range.to ? "true" : undefined,
        },
      });
      setEntries((prev) => (replace ? data.auditTrail : [...prev, ...data.auditTrail]));
      setPage(data.pagination.currentPage);
      setTotalPages(data.pagination.totalPages);
      setTotalItems(data.pagination.totalItems ?? data.pagination.total ?? 0);
    } catch (err) {
      console.error("Failed to load activity feed", err);
      if (replace) setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, username, documentType, debounced, range.from, range.to]);

  const days = useMemo(() => groupByDay(entries), [entries]);

  return (
    <Box>
      <Box sx={{ ...cardSx, p: 2, mb: 2.5 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search job number, heading or field…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={fieldSx}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
          <TextField size="small" label="User" value={username} onChange={(e) => onUsernameChange(e.target.value)} sx={{ minWidth: 170, ...fieldSx }} />
          <TextField select size="small" label="Module" value={documentType} onChange={(e) => setDocumentType(e.target.value)} sx={{ minWidth: 160, ...fieldSx }}>
            <MenuItem value="">All modules</MenuItem>
            {MODULES.map((m) => (
              <MenuItem key={m} value={m}>{m}</MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Action" value={action} onChange={(e) => setAction(e.target.value)} sx={{ minWidth: 150, ...fieldSx }}>
            <MenuItem value="">All actions</MenuItem>
            {Object.entries(ACTION_STYLE).map(([k, v]) => (
              <MenuItem key={k} value={k}>{v.label}</MenuItem>
            ))}
          </TextField>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
          <Typography sx={{ fontSize: 13, color: MUTED }}>{totalItems.toLocaleString()} matching actions</Typography>
          {username && <Chip size="small" label={`User: ${username}`} onDelete={() => onUsernameChange("")} />}
          {documentType && <Chip size="small" label={`Module: ${documentType}`} onDelete={() => setDocumentType("")} />}
          {action && <Chip size="small" label={`Action: ${ACTION_STYLE[action]?.label || action}`} onDelete={() => setAction("")} />}
        </Stack>
      </Box>

      {days.map((day) => (
        <Box key={day.key} sx={{ mb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
            <Chip label={formatIST(day.date, "day")} sx={{ fontWeight: 700, bgcolor: INK, color: "#fff", height: 26, fontSize: 12 }} />
            <Box sx={{ flex: 1, height: 1, bgcolor: LINE }} />
            <Typography sx={{ fontSize: 12, color: MUTED }}>{day.items.length}</Typography>
          </Stack>
          {day.items.map((entry, i) => (
            <TimelineEntry key={entry._id} entry={entry} last={i === day.items.length - 1} showContext />
          ))}
        </Box>
      ))}

      {loading && [0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={72} sx={{ mb: 2, ml: 7 }} />)}
      {!loading && entries.length === 0 && <Typography sx={{ textAlign: "center", py: 8, color: MUTED }}>No activity matches these filters.</Typography>}
      {!loading && page < totalPages && (
        <Box sx={{ textAlign: "center", py: 1 }}>
          <Button variant="outlined" onClick={() => load(page + 1, false)} sx={{ textTransform: "none", borderRadius: 2, borderColor: "#93B4F5", color: "#2563EB" }}>
            Load more
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default AuditFeed;
