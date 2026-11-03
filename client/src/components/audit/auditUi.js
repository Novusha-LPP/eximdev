import React, { useState } from "react";
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import BoltIcon from "@mui/icons-material/Bolt";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

export const ACTION_STYLE = {
  CREATE: { label: "Created", color: "#059669", soft: "#E7F8F0", Icon: AddCircleOutlineIcon },
  UPDATE: { label: "Updated", color: "#2563EB", soft: "#EAF1FF", Icon: EditOutlinedIcon },
  DELETE: { label: "Deleted", color: "#E11D48", soft: "#FFE9EE", Icon: DeleteOutlineIcon },
  BULK_CREATE_UPDATE: { label: "Bulk update", color: "#D97706", soft: "#FFF4E0", Icon: BoltIcon },
};

// Design tokens: change ACCENT/BRAND here to re-theme the whole audit module
export const FONT = '"Inter","Segoe UI",system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif';
export const INK = "#0B1220";
export const MUTED = "#64748B";
export const LINE = "#E6EAF2";
export const SURFACE = "#FFFFFF";
export const CANVAS = "#F3F5FA";
export const ACCENT = "#2563EB";
export const ACCENT_SOFT = "#EAF1FF";
export const BRAND = "linear-gradient(135deg, #2563EB 0%, #0EA5E9 100%)";
export const HERO = "radial-gradient(900px 320px at 90% -30%, rgba(14,165,233,0.45), transparent 60%), radial-gradient(700px 300px at -5% 130%, rgba(37,99,235,0.45), transparent 60%), #0B1220";
export const TONES = {
  blue: ["#2563EB", "#60A5FA"],
  emerald: ["#059669", "#34D399"],
  amber: ["#F59E0B", "#FCD34D"],
  cyan: ["#0891B2", "#22D3EE"],
  rose: ["#E11D48", "#FB7185"],
};
export const cardSx = {
  bgcolor: SURFACE,
  border: `1px solid ${LINE}`,
  borderRadius: "16px",
  boxShadow: "0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)",
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

const titleCase = (s) =>
  String(s)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());

// "containers.1.container_rail_out_date" -> "Containers › Row 2 › Container Rail Out Date"

// All audit times are shown in Indian Standard Time, whatever the viewer's browser/OS timezone is.
export const IST = "Asia/Kolkata";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const istFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: IST, year: "numeric", month: "numeric", day: "numeric", weekday: "long",
  hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23",
});
const istParts = (value) => {
  const out = {};
  istFmt.formatToParts(new Date(value)).forEach((p) => { out[p.type] = p.value; });
  return {
    year: Number(out.year), month: Number(out.month), day: Number(out.day), weekday: out.weekday,
    hour: Number(out.hour), minute: Number(out.minute), second: Number(out.second),
  };
};
const p2 = (n) => String(n).padStart(2, "0");
const clock = (h, m, s) => `${p2(h % 12 === 0 ? 12 : h % 12)}:${p2(m)}${s === undefined ? "" : `:${p2(s)}`} ${h < 12 ? "AM" : "PM"}`;

// kind: date | time | timeSec | datetime | datetimeSec | day (heading) | short (30 Oct)
export const formatIST = (value, kind = "datetime") => {
  if (!value || isNaN(new Date(value))) return "—";
  const t = istParts(value);
  const date = `${p2(t.day)} ${MONTHS[t.month - 1]} ${t.year}`;
  switch (kind) {
    case "date": return date;
    case "time": return `${clock(t.hour, t.minute)} IST`;
    case "timeSec": return `${clock(t.hour, t.minute, t.second)} IST`;
    case "datetimeSec": return `${date}, ${clock(t.hour, t.minute, t.second)} IST`;
    case "day": return `${t.weekday}, ${p2(t.day)} ${FULL_MONTHS[t.month - 1]} ${t.year}`;
    case "short": return `${p2(t.day)} ${MONTHS[t.month - 1]}`;
    default: return `${date}, ${clock(t.hour, t.minute)} IST`;
  }
};
// yyyy-MM-dd of the IST calendar day (used for grouping and date-range filters)
export const istDayKey = (value) => {
  const t = istParts(value);
  return `${t.year}-${p2(t.month)}-${p2(t.day)}`;
};
// "2026-10-29" or "2026-10-29T10:30" carry no zone: they are wall-clock values typed by users, so never shifted
const NAIVE = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?(?::\d{2}(?:\.\d+)?)?$/;
const formatNaive = (m) => {
  const date = `${m[3]} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
  return m[4] === undefined ? date : `${date}, ${clock(Number(m[4]), Number(m[5]))}`;
};
export const formatDayLabel = (key) => {
  const m = NAIVE.exec(key || "");
  return m ? `${m[3]} ${MONTHS[Number(m[2]) - 1]}` : "";
};

export const humanizePath = (path, fallback) => {
  if (!path) return titleCase(fallback || "Document");
  return path
    .split(".")
    .map((seg) => (/^\d+$/.test(seg) ? `Row ${Number(seg) + 1}` : titleCase(seg)))
    .join(" › ");
};

export const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && ISO_DATE.test(value)) {
    const naive = NAIVE.exec(value);
    if (naive) return formatNaive(naive);
    return formatIST(value);
  }
  if (Array.isArray(value)) return value.length === 0 ? "—" : `${value.length} item${value.length > 1 ? "s" : ""}`;
  if (typeof value === "object") {
    const text = JSON.stringify(
      Object.fromEntries(Object.entries(value).filter(([k]) => !k.startsWith("_")))
    );
    return text.length > 140 ? `${text.slice(0, 140)}…` : text;
  }
  return String(value);
};

export const initials = (name = "") =>
  name
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("") || "?";

export const avatarColor = (name = "") => {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `linear-gradient(135deg, hsl(${h}, 62%, 46%), hsl(${(h + 40) % 360}, 66%, 58%))`;
};

export const UserAvatar = ({ name, size = 36 }) => (
  <Avatar sx={{ background: avatarColor(name), color: "#fff", width: size, height: size, fontSize: size / 2.6, fontWeight: 700, boxShadow: "0 0 0 3px #fff, 0 2px 6px rgba(16,24,40,0.15)" }}>
    {initials(name)}
  </Avatar>
);

export const FieldDiff = ({ change }) => {
  const isAdd = change.changeType === "ADDED";
  const isRemove = change.changeType === "REMOVED";
  const pill = (text, bg, fg, strike) => (
    <Box component="span" sx={{ px: 1.1, py: 0.3, borderRadius: "8px", bgcolor: bg, color: fg, fontSize: 13, fontWeight: 600, border: `1px solid ${fg}1F`, textDecoration: strike ? "line-through" : "none", wordBreak: "break-word" }}>
      {text}
    </Box>
  );
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "220px 1fr" }, gap: { xs: 0.5, sm: 2 }, py: 1, borderTop: `1px dashed ${LINE}`, "&:first-of-type": { borderTop: 0 } }}>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: INK }}>{humanizePath(change.fieldPath, change.field)}</Typography>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        {isAdd ? (
          <>
            {pill("NEW", "#E0ECFF", "#1E40AF")}
            {pill(formatValue(change.newValue), "#DCFCE7", "#166534")}
          </>
        ) : isRemove ? (
          <>
            {pill("Removed", "#FEE2E2", "#991B1B")}
            {pill(formatValue(change.oldValue), "#F1F5F9", MUTED, true)}
          </>
        ) : (
          <>
            {change.oldValue === null || change.oldValue === undefined || change.oldValue === ""
              ? pill("Empty", "#F1F5F9", MUTED)
              : pill(formatValue(change.oldValue), "#FEE2E2", "#991B1B", true)}
            <ArrowForwardIcon sx={{ fontSize: 16, color: MUTED }} />
            {pill(formatValue(change.newValue), "#DCFCE7", "#166534")}
          </>
        )}
      </Stack>
    </Box>
  );
};

export const summarize = (entry) => {
  const changes = entry.changes || [];
  if (entry.action === "CREATE") return `Job created with ${changes.length} field${changes.length === 1 ? "" : "s"} set`;
  if (entry.action === "DELETE") return "Job deleted";
  if (entry.action === "BULK_CREATE_UPDATE") return "Part of a bulk update";
  const names = [...new Set(changes.map((c) => humanizePath(c.fieldPath, c.field).split(" › ")[0]))];
  const shown = names.slice(0, 3).join(", ");
  return `${changes.length} change${changes.length === 1 ? "" : "s"} · ${shown}${names.length > 3 ? ` +${names.length - 3} more` : ""}`;
};

export const TimelineEntry = ({ entry, last, showContext = false }) => {
  const style = ACTION_STYLE[entry.action] || { label: entry.action, color: MUTED, soft: "#F1F5F9", Icon: EditOutlinedIcon };
  const { Icon } = style;
  const changes = entry.changes || [];
  const [open, setOpen] = useState(entry.action !== "CREATE" && changes.length <= 4);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? changes : changes.slice(0, 10);
  const when = new Date(entry.timestamp);

  return (
    <Box sx={{ display: "flex", gap: 2 }}>
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", width: 40 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: "50%", bgcolor: style.color, color: "#fff", display: "grid", placeItems: "center", "& svg": { color: "inherit !important" }, boxShadow: `0 0 0 5px ${style.soft}` }}>
          <Icon sx={{ fontSize: 18 }} />
        </Box>
        {!last && <Box sx={{ flex: 1, width: 2, bgcolor: LINE, my: 0.75 }} />}
      </Box>
      <Box sx={{ ...cardSx, flex: 1, minWidth: 0, mb: 2, overflow: "hidden", borderLeft: `4px solid ${style.color}`, transition: "box-shadow .2s, transform .2s", "&:hover": { boxShadow: "0 10px 28px rgba(16,24,40,0.10)", transform: "translateY(-1px)" } }}>
        <Box onClick={() => setOpen((v) => !v)} sx={{ p: 1.75, cursor: "pointer", display: "flex", alignItems: "center", gap: 1.5 }}>
          <UserAvatar name={entry.username} size={34} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography sx={{ fontWeight: 700, fontSize: 14.5, color: INK }}>{entry.username}</Typography>
              {entry.userRole && <Chip size="small" label={entry.userRole} sx={{ height: 20, fontSize: 11, bgcolor: "#F1F5F9", color: MUTED }} />}
              <Chip size="small" label={style.label} sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: style.soft, color: style.color }} />
            </Stack>
            {showContext && (
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "#2563EB" }} noWrap>
                {entry.documentType === "Job" && entry.job_no ? `Job ${entry.job_no} / ${entry.year || ""}` : entry.documentType}
              </Typography>
            )}
            <Typography sx={{ fontSize: 13, color: MUTED }} noWrap>{summarize(entry)}</Typography>
          </Box>
          <Tooltip title={formatIST(when, "datetimeSec")}>
            <Box sx={{ textAlign: "right", flexShrink: 0 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: INK }}>{formatIST(when, "time")}</Typography>
              <Typography sx={{ fontSize: 11.5, color: MUTED }}>{formatDistanceToNow(when, { addSuffix: true })}</Typography>
            </Box>
          </Tooltip>
        </Box>
        {open && entry.action !== "CREATE" && (
          <Box sx={{ px: 2, pb: 1.5, pt: 0.5, bgcolor: CANVAS, borderTop: `1px solid ${LINE}` }}>
            {visible.map((c, i) => (
              <FieldDiff key={`${c.fieldPath}-${i}`} change={c} />
            ))}
            {changes.length > 10 && (
              <Button size="small" onClick={() => setShowAll((v) => !v)} sx={{ textTransform: "none", mt: 0.5 }}>
                {showAll ? "Show fewer" : `Show ${changes.length - 10} more`}
              </Button>
            )}
          </Box>
        )}
        {open && entry.action === "CREATE" && (
          <Box sx={{ px: 2, pb: 1.5, pt: 0.5, bgcolor: CANVAS, borderTop: `1px solid ${LINE}` }}>
            {changes.filter((c) => !Array.isArray(c.newValue)).slice(0, 12).map((c, i) => (
              <FieldDiff key={`${c.fieldPath}-${i}`} change={c} />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export const groupByDay = (entries) => {
  const groups = [];
  entries.forEach((e) => {
    const key = istDayKey(e.timestamp);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(e);
    else groups.push({ key, date: new Date(e.timestamp), items: [e] });
  });
  return groups;
};

export const StatTile = ({ icon, label, value, tone = "blue" }) => {
  const [c1, c2] = TONES[tone] || TONES.blue;
  return (
    <Box sx={{ ...cardSx, p: 2, flex: 1, minWidth: 190, position: "relative", overflow: "hidden" }}>
      <Box sx={{ position: "absolute", right: -28, top: -28, width: 110, height: 110, borderRadius: "50%", background: `linear-gradient(135deg, ${c1}22, ${c2}11)` }} />
      <Box sx={{ width: 42, height: 42, borderRadius: "12px", background: `linear-gradient(135deg, ${c1}, ${c2})`, color: "#fff", display: "grid", placeItems: "center", "& svg": { color: "inherit !important" }, boxShadow: `0 6px 14px ${c1}55`, mb: 1.5, position: "relative" }}>{icon}</Box>
      <Typography sx={{ fontSize: 26, fontWeight: 800, color: INK, lineHeight: 1.1, letterSpacing: "-0.02em", position: "relative" }} noWrap>{value}</Typography>
      <Typography sx={{ fontSize: 12, color: MUTED, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600, mt: 0.5, position: "relative" }}>{label}</Typography>
    </Box>
  );
};

export const fieldSx = { "& .MuiOutlinedInput-root": { bgcolor: SURFACE, borderRadius: 2 } };

