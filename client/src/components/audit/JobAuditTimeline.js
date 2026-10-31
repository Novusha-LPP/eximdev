import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import { Box, Button, Chip, InputAdornment, MenuItem, Skeleton, Stack, TextField, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import HistoryIcon from "@mui/icons-material/History";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import {
  formatIST,
  ACTION_STYLE, BRAND, INK, LINE, MUTED, SURFACE, StatTile, TimelineEntry, cardSx, fieldSx, groupByDay,
} from "./auditUi";

const API = process.env.REACT_APP_API_STRING;

const JobAuditTimeline = () => {
  const [year, setYear] = useState("");
  const [years, setYears] = useState([]);
  const [search, setSearch] = useState("");
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [selected, setSelected] = useState(null);

  const [entries, setEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // First load asks the server for the newest year; the year it picked is adopted without a second fetch
  const adoptedYear = useRef(false);
  const skipNextFetch = useRef(false);

  // Job list (debounced on search)
  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return undefined;
    }
    let live = true;
    const t = setTimeout(async () => {
      setJobsLoading(true);
      try {
        const first = !adoptedYear.current && !year && !search;
        const { data } = await axios.get(`${API}/audit-trail/jobs`, { params: { year, search, limit: 50, latest: first ? 1 : undefined } });
        if (!live) return;
        setJobs(data.jobs || []);
        setYears(data.years || []);
        if (first) {
          adoptedYear.current = true;
          if (data.year) {
            skipNextFetch.current = true;
            setYear(data.year);
          }
        }
      } catch (err) {
        if (!live) return;
        console.error("Failed to load audited jobs", err);
        setJobs([]);
      } finally {
        if (live) setJobsLoading(false);
      }
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [year, search]);

  const loadTimeline = useCallback(
    async (job, pageNum, replace) => {
      if (!job) return;
      setTimelineLoading(true);
      try {
        const params = { page: pageNum, limit: 50, username: userFilter, action: actionFilter };
        if (job.documentId) params.documentId = job.documentId;
        else Object.assign(params, { job_no: job.job_no, year: job.year, branch_code: job.branch_code });
        const { data } = await axios.get(`${API}/audit-trail/job-timeline`, { params });
        setEntries((prev) => (replace ? data.entries : [...prev, ...data.entries]));
        setUsers(data.users || []);
        setPage(data.pagination.currentPage);
        setTotalPages(data.pagination.totalPages);
        setTotalItems(data.pagination.totalItems);
      } catch (err) {
        console.error("Failed to load job timeline", err);
        if (replace) setEntries([]);
      } finally {
        setTimelineLoading(false);
      }
    },
    [userFilter, actionFilter]
  );

  useEffect(() => {
    if (selected) loadTimeline(selected, 1, true);
  }, [selected, loadTimeline]);

  const days = useMemo(() => groupByDay(entries), [entries]);

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "330px 1fr" }, gap: 2.5 }}>
      {/* Job picker */}
      <Box sx={{ ...cardSx, p: 2, alignSelf: "start", maxHeight: "78vh", display: "flex", flexDirection: "column", position: { md: "sticky" }, top: 12 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.5 }}>
          <Box sx={{ width: 32, height: 32, flexShrink: 0, borderRadius: 2, background: BRAND, color: "#fff", display: "grid", placeItems: "center", "& svg": { color: "inherit !important" } }}>
            <Inventory2OutlinedIcon sx={{ fontSize: 17 }} />
          </Box>
          <Typography sx={{ fontWeight: 700, color: INK }}>Jobs</Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
          <TextField select size="small" label="Year" value={year} onChange={(e) => setYear(e.target.value)} sx={{ minWidth: 104, ...fieldSx }}>
            <MenuItem value="">All</MenuItem>
            {years.map((y) => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            fullWidth
            placeholder="Search job no."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={fieldSx}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
        </Stack>
        <Box sx={{ overflowY: "auto", flex: 1, mx: -0.5, px: 0.5 }}>
          {jobsLoading && [0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={68} sx={{ mb: 1 }} />)}
          {!jobsLoading && jobs.length === 0 && (
            <Typography sx={{ p: 3, textAlign: "center", fontSize: 13, color: MUTED }}>No audited jobs found.</Typography>
          )}
          {!jobsLoading && jobs.map((job) => {
            const active = selected && String(selected._id) === String(job._id);
            return (
              <Box
                key={job._id}
                onClick={() => setSelected(job)}
                sx={{
                  p: 1.5,
                  mb: 1,
                  borderRadius: 2.5,
                  cursor: "pointer",
                  border: "1px solid",
                  borderColor: active ? "#2563EB" : LINE,
                  bgcolor: active ? "#EAF1FF" : SURFACE,
                  boxShadow: active ? "0 4px 14px rgba(37,99,235,0.18)" : "none",
                  transition: "all .15s",
                  "&:hover": { borderColor: "#93B4F5", transform: "translateY(-1px)" },
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography sx={{ fontWeight: 700, color: INK }}>
                    {job.job_no || "—"} <Box component="span" sx={{ fontSize: 12, fontWeight: 500, color: MUTED }}>/ {job.year}</Box>
                  </Typography>
                  <Chip size="small" label={job.totalActions} sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: active ? "#2563EB" : "#F1F5F9", color: active ? "#fff" : MUTED }} />
                </Stack>
                <Typography sx={{ fontSize: 12, color: MUTED }}>
                  {[job.branch_code, job.trade_type, job.mode].filter(Boolean).join(" · ") || "—"}
                </Typography>
                <Typography sx={{ fontSize: 12, color: MUTED }}>
                  {job.lastUser} · {formatDistanceToNow(new Date(job.lastActivity), { addSuffix: true })}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Timeline */}
      <Box sx={{ minWidth: 0 }}>
        {!selected ? (
          <Box sx={{ ...cardSx, p: { xs: 4, md: 8 }, textAlign: "center" }}>
            <Box sx={{ width: 64, height: 64, mx: "auto", mb: 2, borderRadius: 4, background: BRAND, color: "#fff", display: "grid", placeItems: "center", "& svg": { color: "inherit !important" } }}>
              <HistoryIcon sx={{ fontSize: 34 }} />
            </Box>
            <Typography sx={{ fontSize: 20, fontWeight: 700, color: INK }}>Job audit history</Typography>
            <Typography sx={{ color: MUTED, maxWidth: 420, mx: "auto", mt: 0.5 }}>
              Choose a job on the left to see every action taken on it — who did it, when, and exactly what changed.
            </Typography>
          </Box>
        ) : (
          <>
            <Box sx={{ borderRadius: "16px", p: 3, mb: 2, background: BRAND, color: "#fff", boxShadow: "0 10px 30px rgba(37,99,235,0.25)" }}>
              <Typography sx={{ fontSize: 12, letterSpacing: 1, textTransform: "uppercase", opacity: 0.8 }}>
                Financial year {selected.year}
              </Typography>
              <Typography sx={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2 }}>Job {selected.job_no}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                {[selected.branch_code, selected.trade_type, selected.mode].filter(Boolean).map((t) => (
                  <Chip key={t} size="small" label={t} sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "#fff", fontWeight: 600 }} />
                ))}
              </Stack>
            </Box>

            <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
              <StatTile tone="blue" icon={<HistoryIcon fontSize="small" />} label="Recorded actions" value={selected.totalActions} />
              <StatTile tone="emerald" icon={<PeopleOutlineIcon fontSize="small" />} label="People involved" value={users.length || selected.users?.length || 0} />
              <StatTile tone="cyan" icon={<AddCircleOutlineIcon fontSize="small" />} label="First activity" value={formatIST(selected.firstActivity, "date")} />
              <StatTile tone="amber" icon={<EditOutlinedIcon fontSize="small" />} label="Last activity" value={formatIST(selected.lastActivity, "date")} />
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2.5 }}>
              <TextField select size="small" label="User" value={userFilter} onChange={(e) => setUserFilter(e.target.value)} sx={{ minWidth: 190, ...fieldSx }}>
                <MenuItem value="">All users</MenuItem>
                {users.map((u) => (
                  <MenuItem key={u} value={u}>{u}</MenuItem>
                ))}
              </TextField>
              <TextField select size="small" label="Action" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} sx={{ minWidth: 170, ...fieldSx }}>
                <MenuItem value="">All actions</MenuItem>
                {Object.entries(ACTION_STYLE).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v.label}</MenuItem>
                ))}
              </TextField>
              <Box sx={{ flex: 1 }} />
              <Typography sx={{ alignSelf: "center", fontSize: 13, color: MUTED }}>
                Showing {entries.length} of {totalItems}
              </Typography>
            </Stack>

            {days.map((day) => (
              <Box key={day.key} sx={{ mb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
                  <Chip label={formatIST(day.date, "day")} sx={{ fontWeight: 700, bgcolor: INK, color: "#fff", height: 26, fontSize: 12 }} />
                  <Box sx={{ flex: 1, height: 1, bgcolor: LINE }} />
                  <Typography sx={{ fontSize: 12, color: MUTED }}>{day.items.length} action{day.items.length === 1 ? "" : "s"}</Typography>
                </Stack>
                {day.items.map((entry, i) => (
                  <TimelineEntry key={entry._id} entry={entry} last={i === day.items.length - 1} />
                ))}
              </Box>
            ))}

            {timelineLoading && [0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={72} sx={{ mb: 2, ml: 7 }} />)}
            {!timelineLoading && entries.length === 0 && (
              <Typography sx={{ textAlign: "center", py: 6, color: MUTED }}>No actions match these filters.</Typography>
            )}
            {!timelineLoading && page < totalPages && (
              <Box sx={{ textAlign: "center", py: 1 }}>
                <Button variant="outlined" onClick={() => loadTimeline(selected, page + 1, false)} sx={{ textTransform: "none", borderRadius: 2, borderColor: "#93B4F5", color: "#2563EB" }}>
                  Load older activity
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default JobAuditTimeline;
