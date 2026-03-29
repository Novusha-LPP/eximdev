import React, { useEffect, useState, useContext, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../../contexts/UserContext";
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Chip,
  Switch,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PreviewIcon from "@mui/icons-material/Preview";
import ScheduleIcon from "@mui/icons-material/Schedule";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

// Returns a human-readable schedule string
function formatSchedule(schedule) {
  if (!schedule) return "No schedule";
  const { start, end } = schedule;
  const fmt = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;
  if (start && end) return `${fmt(start)} → ${fmt(end)}`;
  if (start) return `From ${fmt(start)} onwards`;
  if (end) return `Until ${fmt(end)}`;
  return "No schedule";
}

// Is the theme currently in its scheduled window?
function isLiveNow(theme) {
  if (!theme.isActive) return false;
  const now = new Date();
  const { start, end } = theme.schedule || {};
  if (!start && !end) return true;
  const afterStart = !start || new Date(start) <= now;
  const beforeEnd = !end || new Date(end) >= now;
  return afterStart && beforeEnd;
}

function ThemeCard({ theme, onToggle, onEdit, onDelete, onPreview }) {
  const live = isLiveNow(theme);

  return (
    <Paper
      elevation={0}
      sx={{
        border: live ? "2px solid #2e7d32" : "1px solid #e0e0e0",
        borderRadius: 2,
        overflow: "hidden",
        transition: "all 0.2s ease",
        "&:hover": { boxShadow: "0 4px 20px rgba(0,0,0,0.08)" },
      }}
    >
      {/* Color Bar */}
      <Box
        sx={{
          height: 8,
          background: theme.bgColor
            ? `linear-gradient(90deg, ${theme.bgColor} 0%, ${theme.textColor || "#fff"} 100%)`
            : "linear-gradient(90deg, #1976D2, #42A5F5)",
        }}
      />

      <Box sx={{ p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 0.5 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.3 }}>
                {theme.name}
              </Typography>
              {live && (
                <Chip
                  size="small"
                  label="🟢 LIVE NOW"
                  sx={{ bgcolor: "#e8f5e9", color: "#2e7d32", fontWeight: 700, fontSize: "10px", height: 20 }}
                />
              )}
              {theme.tag && theme.tag !== "Custom" && (
                <Chip size="small" label={theme.tag} variant="outlined" sx={{ fontSize: "10px", height: 20 }} />
              )}
            </Box>
            {theme.description && (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                {theme.description}
              </Typography>
            )}
          </Box>

          {/* Color swatches */}
          <Box sx={{ display: "flex", gap: 0.5, ml: 1, flexShrink: 0 }}>
            <Tooltip title={`Background: ${theme.bgColor || "default"}`}>
              <Box
                sx={{
                  width: 22, height: 22, borderRadius: "50%",
                  bgcolor: theme.bgColor || "#1976D2",
                  border: "2px solid #fff",
                  boxShadow: "0 0 0 1px #ccc",
                }}
              />
            </Tooltip>
            <Tooltip title={`Text: ${theme.textColor || "default"}`}>
              <Box
                sx={{
                  width: 22, height: 22, borderRadius: "50%",
                  bgcolor: theme.textColor || "#FFFFFF",
                  border: "2px solid #fff",
                  boxShadow: "0 0 0 1px #ccc",
                }}
              />
            </Tooltip>
          </Box>
        </Box>

        {/* Schedule row */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1.5 }}>
          <ScheduleIcon sx={{ fontSize: 13, color: "#999" }} />
          <Typography variant="caption" color="text.secondary">
            {formatSchedule(theme.schedule)}
          </Typography>
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        {/* Actions row */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {theme.isActive ? (
              <CheckCircleIcon sx={{ color: "#2e7d32", fontSize: 16, mr: 0.5 }} />
            ) : (
              <RadioButtonUncheckedIcon sx={{ color: "#bbb", fontSize: 16, mr: 0.5 }} />
            )}
            <Switch
              size="small"
              checked={theme.isActive}
              onChange={() => onToggle(theme)}
              color="success"
            />
            <Typography variant="caption" color={theme.isActive ? "success.main" : "text.disabled"} fontWeight={600}>
              {theme.isActive ? "Active" : "Inactive"}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Tooltip title="Preview">
              <IconButton size="small" onClick={() => onPreview(theme)}>
                <PreviewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit in Designer">
              <IconButton size="small" onClick={() => onEdit(theme)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Theme">
              <IconButton size="small" color="error" onClick={() => onDelete(theme)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

function NavbarThemesList() {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [themes, setThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, theme: null });
  const [previewTheme, setPreviewTheme] = useState(null);
  const [toggling, setToggling] = useState(null);

  const loadThemes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_API_STRING}/app-bar-themes`,
        { withCredentials: true }
      );
      setThemes(res.data || []);
    } catch {
      setSnack({ open: true, msg: "Failed to load themes", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadThemes();
  }, [loadThemes]);

  const handleToggle = async (theme) => {
    setToggling(theme._id);
    try {
      const res = await axios.patch(
        `${process.env.REACT_APP_API_STRING}/app-bar-themes/${theme._id}/toggle`,
        { updatedBy: user?.username },
        { withCredentials: true }
      );
      setThemes((prev) =>
        prev.map((t) => (t._id === theme._id ? res.data : t))
      );
      setSnack({
        open: true,
        msg: res.data.isActive ? "Theme activated!" : "Theme deactivated",
        severity: "success",
      });
    } catch {
      setSnack({ open: true, msg: "Failed to toggle theme", severity: "error" });
    } finally {
      setToggling(null);
    }
  };

  const handleDelete = async () => {
    const theme = deleteDialog.theme;
    if (!theme) return;
    try {
      await axios.delete(
        `${process.env.REACT_APP_API_STRING}/app-bar-themes/${theme._id}`,
        { withCredentials: true }
      );
      setThemes((prev) => prev.filter((t) => t._id !== theme._id));
      setSnack({ open: true, msg: "Theme deleted", severity: "success" });
    } catch {
      setSnack({ open: true, msg: "Failed to delete theme", severity: "error" });
    } finally {
      setDeleteDialog({ open: false, theme: null });
    }
  };

  const liveThemes = themes.filter(isLiveNow);
  const inactiveThemes = themes.filter((t) => !isLiveNow(t));

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: "auto" }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            🎨 Navbar Theme Manager
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Design seasonal & festival themes for your app bar. Themes activate automatically based on schedule.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddCircleOutlineIcon />}
          onClick={() => navigate("/admin/navbar-customizer")}
          sx={{ bgcolor: "#1976D2", fontWeight: 700, borderRadius: 2 }}
        >
          New Theme
        </Button>
      </Box>

      {loading ? (
        <Box>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: "center" }}>
            Loading themes...
          </Typography>
        </Box>
      ) : themes.length === 0 ? (
        <Paper
          elevation={0}
          sx={{ p: 6, textAlign: "center", border: "2px dashed #e0e0e0", borderRadius: 3 }}
        >
          <Typography variant="h2" mb={1}>🎨</Typography>
          <Typography variant="h6" fontWeight={700} mb={1}>
            No themes created yet
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Click "New Theme" to create your first festival app bar design.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => navigate("/admin/navbar-customizer")}
            sx={{ bgcolor: "#1976D2" }}
          >
            Create First Theme
          </Button>
        </Paper>
      ) : (
        <>
          {/* Live Themes Section */}
          {liveThemes.length > 0 && (
            <Box mb={4}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  🟢 Currently Live
                </Typography>
                <Chip size="small" label={liveThemes.length} color="success" />
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 2 }}>
                {liveThemes.map((theme) => (
                  <ThemeCard
                    key={theme._id}
                    theme={theme}
                    onToggle={handleToggle}
                    onEdit={(t) => navigate(`/admin/navbar-customizer/${t._id}`)}
                    onDelete={(t) => setDeleteDialog({ open: true, theme: t })}
                    onPreview={(t) => setPreviewTheme(t)}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* All Other Themes */}
          {inactiveThemes.length > 0 && (
            <Box>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>
                📦 All Themes ({inactiveThemes.length})
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 2 }}>
                {inactiveThemes.map((theme) => (
                  <ThemeCard
                    key={theme._id}
                    theme={theme}
                    onToggle={handleToggle}
                    onEdit={(t) => navigate(`/admin/navbar-customizer/${t._id}`)}
                    onDelete={(t) => setDeleteDialog({ open: true, theme: t })}
                    onPreview={(t) => setPreviewTheme(t)}
                  />
                ))}
              </Box>
            </Box>
          )}
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, theme: null })}>
        <DialogTitle>Delete Theme?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>"{deleteDialog.theme?.name}"</strong>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, theme: null })}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quick Preview Dialog */}
      {previewTheme && (
        <Dialog
          open={!!previewTheme}
          onClose={() => setPreviewTheme(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Preview: {previewTheme.name}
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <iframe
              title="quick-preview"
              style={{ width: "100%", height: "200px", border: "none" }}
              srcDoc={`
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="UTF-8"/>
                  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"/>
                  <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Inter', sans-serif; background: #f5f7fa; }
                    .app-bar { background: rgba(249,250,251,0.9); border-bottom: 1px solid #e0e0e0; }
                    .locked-bar { display: flex; align-items: center; height: 64px; padding: 0 16px; gap: 12px; }
                    .logo { font-size: 18px; font-weight: 800; color: #F57C00; }
                    .spacer { flex: 1; }
                    .pill { background: white; border: 1px solid #e0e0e0; border-radius: 4px; padding: 4px 10px; font-size: 12px; }
                    #dynamic-navbar-theme { width: 100%; }
                    ${previewTheme.css || ""}
                  </style>
                </head>
                <body>
                  <div class="app-bar">
                    <div id="dynamic-navbar-theme" style="--theme-bg:${previewTheme.bgColor || "#1976D2"}; --theme-text:${previewTheme.textColor || "#fff"}">
                      ${previewTheme.html || ""}
                    </div>
                    <div class="locked-bar">
                      <span>◀</span>
                      <span class="logo">SURAJ ✦</span>
                      <div class="spacer"></div>
                      <div class="pill">AHEMDABAD (AMD) ▾</div>
                      <div class="pill" style="display:flex; gap:0; overflow:hidden;">
                        <span style="padding:4px 10px; background:#eee; font-weight:700;">SEA</span>
                        <span style="padding:4px 10px;">AIR</span>
                      </div>
                      <span style="font-size:12px; font-weight:700;">Version: 27.03.05</span>
                    </div>
                  </div>
                </body>
                </html>
              `}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => navigate(`/admin/navbar-customizer/${previewTheme._id}`)}>
              Edit in Designer
            </Button>
            <Button variant="contained" onClick={() => setPreviewTheme(null)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snack.severity}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}

export default NavbarThemesList;
