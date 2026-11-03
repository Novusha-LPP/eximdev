import React, { useEffect, useState } from "react";
import axios from "axios";
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import { Box, Skeleton, Stack, Typography } from "@mui/material";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import HistoryIcon from "@mui/icons-material/History";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDayLabel, ACTION_STYLE, INK, LINE, MUTED, StatTile, UserAvatar, cardSx } from "./auditUi";

const API = process.env.REACT_APP_API_STRING;

const Panel = ({ title, subtitle, children, sx }) => (
  <Box sx={{ ...cardSx, p: 2.5, ...sx }}>
    <Typography sx={{ fontWeight: 700, fontSize: 16, color: INK, letterSpacing: "-0.01em" }}>{title}</Typography>
    {subtitle && <Typography sx={{ fontSize: 12.5, color: MUTED, mb: 1.5 }}>{subtitle}</Typography>}
    {children}
  </Box>
);

const AuditOverview = ({ range, onOpenUser }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    axios
      .get(`${API}/audit-trail/stats`, { params: { fromDate: range.from || undefined, toDate: range.to || undefined, groupBy: "day" } })
      .then((r) => live && setData(r.data))
      .catch(() => live && setData(null))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [range.from, range.to]);

  if (loading) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={72} />
        <Skeleton variant="rounded" height={300} />
      </Stack>
    );
  }
  if (!data) return <Typography sx={{ color: MUTED, p: 4, textAlign: "center" }}>Could not load statistics.</Typography>;

  const s = data.summary || {};
  const daily = (data.dailyActivity || []).map((d) => ({ ...d, label: formatDayLabel(d.date) }));
  const actions = (data.actionBreakdown || []).map((a) => ({
    name: ACTION_STYLE[a._id]?.label || a._id,
    value: a.count,
    color: ACTION_STYLE[a._id]?.color || "#94A3B8",
  }));
  const total = actions.reduce((n, a) => n + a.value, 0);
  const maxUser = Math.max(1, ...(data.topUsers || []).map((u) => u.count));

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
        <StatTile tone="blue" icon={<HistoryIcon fontSize="small" />} label="Total actions" value={(s.totalActions || 0).toLocaleString()} />
        <StatTile tone="emerald" icon={<PeopleOutlineIcon fontSize="small" />} label="Active users" value={(s.totalUsers || 0).toLocaleString()} />
        <StatTile tone="amber" icon={<Inventory2OutlinedIcon fontSize="small" />} label="Records touched" value={(s.totalDocuments || 0).toLocaleString()} />
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "2fr 1fr" }, gap: 2.5 }}>
        <Panel title="Activity over time" subtitle="Recorded actions per day">
          <Box sx={{ height: 280 }}>
            <ResponsiveContainer>
              <AreaChart data={daily} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="auditArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={LINE} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}` }} />
                <Area type="monotone" dataKey="count" name="Actions" stroke="#2563EB" strokeWidth={2.5} fill="url(#auditArea)" />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Panel>

        <Panel title="What people did" subtitle="Share of each action type">
          <Box sx={{ height: 210, position: "relative" }}>
            <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
              <Box sx={{ textAlign: "center" }}>
                <Typography sx={{ fontSize: 26, fontWeight: 800, color: INK, lineHeight: 1 }}>{total.toLocaleString()}</Typography>
                <Typography sx={{ fontSize: 11.5, color: MUTED, textTransform: "uppercase", letterSpacing: 0.8 }}>actions</Typography>
              </Box>
            </Box>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={actions} dataKey="value" nameKey="name" innerRadius={66} outerRadius={92} paddingAngle={3} cornerRadius={6} stroke="none">
                  {actions.map((a) => (
                    <Cell key={a.name} fill={a.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${LINE}` }} />
              </PieChart>
            </ResponsiveContainer>
          </Box>
          <Stack spacing={0.75} sx={{ mt: 1 }}>
            {actions.map((a) => (
              <Stack key={a.name} direction="row" alignItems="center" spacing={1}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: a.color }} />
                <Typography sx={{ fontSize: 13, color: INK, flex: 1 }}>{a.name}</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: INK }}>{a.value.toLocaleString()} <Box component="span" sx={{ color: MUTED, fontWeight: 500 }}>· {total ? Math.round((a.value / total) * 100) : 0}%</Box></Typography>
              </Stack>
            ))}
          </Stack>
        </Panel>
      </Box>

      <Panel title="Most active people" subtitle="Click a person to see everything they did">
        <Stack spacing={1}>
          {(data.topUsers || []).map((u) => (
            <Box
              key={u._id}
              onClick={() => onOpenUser(u._id)}
              sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1, borderRadius: 2, cursor: "pointer", "&:hover": { bgcolor: "#F3F5FA" } }}
            >
              <UserAvatar name={u._id} size={34} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ fontWeight: 600, color: INK, fontSize: 14 }}>{u._id}</Typography>
                  <Typography sx={{ fontWeight: 700, color: INK, fontSize: 14 }}>{u.count.toLocaleString()}</Typography>
                </Stack>
                <Box sx={{ height: 6, bgcolor: "#EAF1FF", borderRadius: 3, mt: 0.5 }}>
                  <Box sx={{ height: 6, borderRadius: 3, width: `${(u.count / maxUser) * 100}%`, background: "linear-gradient(90deg,#2563EB,#38BDF8)" }} />
                </Box>
                {u.lastActivity && (
                  <Typography sx={{ fontSize: 11.5, color: MUTED, mt: 0.25 }}>
                    Last active {formatDistanceToNow(new Date(u.lastActivity), { addSuffix: true })}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Stack>
      </Panel>
    </Stack>
  );
};

export default AuditOverview;
