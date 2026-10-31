import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import { Box, Chip, InputAdornment, Skeleton, Stack, TextField, Typography } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { INK, MUTED, UserAvatar, cardSx, fieldSx } from "./auditUi";

const API = process.env.REACT_APP_API_STRING;

const AuditPeople = ({ onOpenUser }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    axios
      .get(`${API}/audit-trail/all-users-with-activity`)
      .then((r) => setUsers(r.data.users || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const shown = useMemo(
    () => users.filter((u) => !q || `${u.username} ${u.role || ""}`.toLowerCase().includes(q.toLowerCase())),
    [users, q]
  );

  return (
    <Box>
      <TextField
        size="small"
        placeholder="Search people"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        sx={{ mb: 2, minWidth: 280, ...fieldSx }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
      />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" }, gap: 2 }}>
        {loading && [0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={110} />)}
        {shown.map((u) => (
          <Box
            key={u.username}
            onClick={() => onOpenUser(u.username)}
            sx={{ ...cardSx, p: 2, cursor: "pointer", transition: "all .15s", "&:hover": { borderColor: "#93B4F5", transform: "translateY(-2px)", boxShadow: "0 8px 22px rgba(37,99,235,0.12)" } }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <UserAvatar name={u.username} size={42} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, color: INK }} noWrap>{u.username}</Typography>
                <Typography sx={{ fontSize: 12.5, color: MUTED }}>{u.role || "—"}</Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={0.75} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
              {(u.modules || []).slice(0, 3).map((m) => (
                <Chip key={m} size="small" label={m} sx={{ height: 20, fontSize: 11, bgcolor: "#EAF1FF", color: "#2563EB" }} />
              ))}
              {(u.modules || []).length > 3 && <Chip size="small" label={`+${u.modules.length - 3}`} sx={{ height: 20, fontSize: 11 }} />}
            </Stack>
            <Typography sx={{ fontSize: 12, color: MUTED, mt: 1 }}>
              {u.lastActivity ? `Last active ${formatDistanceToNow(new Date(u.lastActivity), { addSuffix: true })}` : "No activity yet"}
            </Typography>
          </Box>
        ))}
      </Box>
      {!loading && shown.length === 0 && <Typography sx={{ textAlign: "center", py: 6, color: MUTED }}>No people found.</Typography>}
    </Box>
  );
};

export default AuditPeople;
