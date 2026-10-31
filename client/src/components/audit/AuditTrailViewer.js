import React, { useMemo, useState } from "react";
import { Box, Container, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import AuditFeed from "./AuditFeed";
import AuditOverview from "./AuditOverview";
import AuditPeople from "./AuditPeople";
import JobAuditTimeline from "./JobAuditTimeline";
import { BRAND, CANVAS, FONT, HERO, istDayKey } from "./auditUi";

const VIEWS = [
  { key: "overview", label: "Overview" },
  { key: "jobs", label: "Job History" },
  { key: "feed", label: "Activity Feed" },
  { key: "people", label: "People" },
];

const RANGES = [
  { key: "today", label: "Today", days: 0 },
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "all", label: "All time", days: null },
];

const AuditTrailViewer = () => {
  const [view, setView] = useState("overview");
  const [rangeKey, setRangeKey] = useState("30d");
  const [feedUser, setFeedUser] = useState("");

  const range = useMemo(() => {
    const r = RANGES.find((x) => x.key === rangeKey);
    if (r.days === null) return { from: "", to: "" };
    // IST calendar days (India has no DST, so a fixed 24h step is exact)
    const nowMs = Date.now();
    return { from: istDayKey(nowMs - r.days * 864e5), to: istDayKey(nowMs) };
  }, [rangeKey]);

  const openUser = (username) => {
    setFeedUser(username);
    setView("feed");
  };

  const glassGroupSx = {
    bgcolor: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 999,
    p: "4px",
    backdropFilter: "blur(6px)",
    "& .MuiToggleButtonGroup-grouped": {
      border: 0,
      borderRadius: "999px !important",
      textTransform: "none",
      fontWeight: 600,
      color: "#CBD5E1",
      px: 2.25,
      py: 0.75,
      fontFamily: "inherit",
      transition: "all .2s",
      "&:hover": { bgcolor: "rgba(255,255,255,0.10)", color: "#fff" },
      "&.Mui-selected": { bgcolor: "#fff", color: "#0B1220", boxShadow: "0 4px 12px rgba(0,0,0,0.25)", "&:hover": { bgcolor: "#fff" } },
    },
  };

  return (
    <Box sx={{ bgcolor: CANVAS, minHeight: "100%", py: 3, fontFamily: FONT, "& .MuiTypography-root, & .MuiButton-root, & .MuiChip-root, & .MuiInputBase-root, & .MuiInputLabel-root": { fontFamily: "inherit" } }}>
      <Container maxWidth="xl">
        <Box sx={{ background: HERO, borderRadius: "24px", p: { xs: 2.5, md: 4 }, mb: 3, color: "#fff", boxShadow: "0 20px 50px rgba(11,18,32,0.25)" }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} sx={{ mb: 3 }}>
            <Stack direction="row" alignItems="center" sx={{ flex: 1, gap: 2 }}>
              <Box sx={{ width: 52, height: 52, borderRadius: "16px", background: BRAND, color: "#fff", display: "grid", placeItems: "center", "& svg": { color: "inherit !important" }, boxShadow: "0 10px 24px rgba(37,99,235,0.5)" }}>
                <HistoryIcon />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.02em", color: "#fff" }}>Audit Trail</Typography>
                <Typography sx={{ fontSize: 14, color: "#94A3B8", mt: 0.5 }}>A permanent record of who changed what, and when · all times in IST</Typography>
              </Box>
            </Stack>

            {(view === "overview" || view === "feed") && (
              <ToggleButtonGroup exclusive size="small" value={rangeKey} onChange={(_, v) => v && setRangeKey(v)} sx={glassGroupSx}>
                {RANGES.map((r) => (
                  <ToggleButton key={r.key} value={r.key}>{r.label}</ToggleButton>
                ))}
              </ToggleButtonGroup>
            )}
          </Stack>

          <ToggleButtonGroup exclusive value={view} onChange={(_, v) => v && setView(v)} sx={{ ...glassGroupSx, flexWrap: "wrap" }}>
            {VIEWS.map((v) => (
              <ToggleButton key={v.key} value={v.key} sx={{ px: "26px !important", py: "9px !important" }}>{v.label}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {view === "overview" && <AuditOverview range={range} onOpenUser={openUser} />}
        {view === "jobs" && <JobAuditTimeline />}
        {view === "feed" && <AuditFeed range={range} username={feedUser} onUsernameChange={setFeedUser} />}
        {view === "people" && <AuditPeople onOpenUser={openUser} />}
      </Container>
    </Box>
  );
};

export default AuditTrailViewer;
