import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Slider,
  Card,
  CardContent,
  IconButton,
  Chip,
  Tooltip,
  Stack,
  Badge,
  Avatar,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";

// Icons
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import ClearIcon from "@mui/icons-material/Clear";
import AddIcon from "@mui/icons-material/Add";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ComputerIcon from "@mui/icons-material/Computer";
import PhoneIphoneIcon from "@mui/icons-material/PhoneIphone";
import PaletteIcon from "@mui/icons-material/Palette";
import DashboardCustomizeIcon from "@mui/icons-material/DashboardCustomize";
import PhoneAndroidIcon from "@mui/icons-material/PhoneAndroid";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MenuIcon from "@mui/icons-material/Menu";
import CampaignIcon from "@mui/icons-material/Campaign";
import CloseIcon from "@mui/icons-material/Close";
import LaunchIcon from "@mui/icons-material/Launch";
import StyleIcon from "@mui/icons-material/Style";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import CodeIcon from "@mui/icons-material/Code";
import ScheduleIcon from "@mui/icons-material/Schedule";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";

// ─── PRESETS ───
const PRESETS = [
  {
    name: "Glassmorphism",
    appbar: { backgroundColor: "rgba(249, 250, 251, 0.3)", backgroundOpacity: 0.3, blurIntensity: 12, textColor: "#000000", shadow: "0 4px 30px rgba(0,0,0,0.05)", borderBottom: "1px solid rgba(255,255,255,0.3)" },
    sidebar: { backgroundColor: "#111b21", iconColor: "#ffffff9f", activeItemColor: "#ffffff", hoverColor: "#ffffff", hoverBgColor: "rgba(255,255,255,0.08)", glassEffect: false, borderRight: "none" },
  },
  {
    name: "Solid Navy",
    appbar: { backgroundColor: "#1a237e", backgroundOpacity: 1, blurIntensity: 0, textColor: "#ffffff", shadow: "0 2px 8px rgba(0,0,0,0.15)", borderBottom: "none" },
    sidebar: { backgroundColor: "#0d1642", iconColor: "#a5b4fc", activeItemColor: "#ffffff", hoverColor: "#ffffff", hoverBgColor: "rgba(255,255,255,0.1)", glassEffect: false, borderRight: "none" },
  },
  {
    name: "Minimal White",
    appbar: { backgroundColor: "#ffffff", backgroundOpacity: 1, blurIntensity: 0, textColor: "#1f2937", shadow: "0 1px 3px rgba(0,0,0,0.08)", borderBottom: "1px solid #e5e7eb" },
    sidebar: { backgroundColor: "#f9fafb", iconColor: "#6b7280", activeItemColor: "#1a237e", hoverColor: "#1f2937", hoverBgColor: "#e5e7eb", glassEffect: false, borderRight: "1px solid #e5e7eb" },
  },
  {
    name: "Dark Mode",
    appbar: { backgroundColor: "#111827", backgroundOpacity: 1, blurIntensity: 0, textColor: "#f3f4f6", shadow: "0 2px 8px rgba(0,0,0,0.3)", borderBottom: "1px solid #374151" },
    sidebar: { backgroundColor: "#030712", iconColor: "#9ca3af", activeItemColor: "#f3f4f6", hoverColor: "#f3f4f6", hoverBgColor: "rgba(255,255,255,0.06)", glassEffect: false, borderRight: "1px solid #374151" },
  },
  {
    name: "Emerald Luxe",
    appbar: { backgroundColor: "#064e3b", backgroundOpacity: 1, blurIntensity: 0, textColor: "#ecfdf5", shadow: "0 2px 8px rgba(0,0,0,0.12)", borderBottom: "none" },
    sidebar: { backgroundColor: "#022c22", iconColor: "#6ee7b7", activeItemColor: "#ffffff", hoverColor: "#ffffff", hoverBgColor: "rgba(255,255,255,0.08)", glassEffect: false, borderRight: "none" },
  },
  {
    name: "Rose Gold",
    appbar: { backgroundColor: "#881337", backgroundOpacity: 1, blurIntensity: 0, textColor: "#fff1f2", shadow: "0 2px 8px rgba(0,0,0,0.12)", borderBottom: "none" },
    sidebar: { backgroundColor: "#4c0519", iconColor: "#fda4af", activeItemColor: "#ffffff", hoverColor: "#ffffff", hoverBgColor: "rgba(255,255,255,0.08)", glassEffect: false, borderRight: "none" },
  },
];

const PRESET_GRADIENTS = [
  { name: "Deep Space", value: "linear-gradient(90deg, #1e3c72 0%, #2a5298 100%)" },
  { name: "Sunset Crimson", value: "linear-gradient(90deg, #ff416c 0%, #ff4b2b 100%)" },
  { name: "Emerald Luxe", value: "linear-gradient(90deg, #11998e 0%, #38ef7d 100%)" },
  { name: "Ocean Breeze", value: "linear-gradient(90deg, #00c6ff 0%, #0072ff 100%)" },
  { name: "Royal Violet", value: "linear-gradient(90deg, #9d50bb 0%, #6e48aa 100%)" },
  { name: "Dark Shadow", value: "linear-gradient(90deg, #0f2027 0%, #203a43 50%, #2c5364 100%)" },
  { name: "Hot Plasma", value: "linear-gradient(90deg, #e65c00 0%, #f9d423 100%)" },
];

const EMOJIS = ["🎉", "🔥", "⚡", "🚀", "📢", "✨", "🎁", "🔔", "🎯", "⏳", "💥", "👉", "👑", "🌟", "💡", "🏆", "🔥", "❤️", "🔵", "🟢"];

const DEFAULT_APPBAR = {
  enabled: true, backgroundColor: "rgba(249, 250, 251, 0.3)", backgroundOpacity: 0.3,
  blurIntensity: 6, textColor: "#000000", shadow: "none", height: 64, borderBottom: "none", extraContent: [],
};
const DEFAULT_SIDEBAR = {
  enabled: true, backgroundColor: "#111b21", iconColor: "#ffffff9f", activeItemColor: "#ffffff",
  hoverColor: "#ffffff", hoverBgColor: "rgba(255,255,255,0.08)", width: 60, mode: "icon-only",
  backgroundImage: "sidebar-bg.webp", glassEffect: false, borderRight: "none", itemSpacing: 0,
};
const DEFAULT_BANNER = {
  enabled: false, text: "", link: "", textColor: "#ffffff",
  backgroundColor: "linear-gradient(90deg, #1e3c72 0%, #2a5298 100%)", height: 36,
  animationType: "none", displayMode: "top-bar", opacity: 1.0, closable: true,
  customCss: "", startDate: "", endDate: "",
};

// ─── STUDIO COLORS ───
const STUDIO_BG = "#0b0c10";
const PANEL_BG = "#15161a";
const PANEL_BORDER = "#2a2b30";
const ACCENT = "#6366f1";
const TEXT_PRIMARY = "#f1f5f9";
const TEXT_SECONDARY = "#94a3b8";

export default function LayoutStudio() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [previewDevice, setPreviewDevice] = useState("desktop");
  const [showGlobalCss, setShowGlobalCss] = useState(false);
  const textRef = useRef(null);

  const [name, setName] = useState("New Theme");
  const [appbar, setAppbar] = useState({ ...DEFAULT_APPBAR });
  const [sidebar, setSidebar] = useState({ ...DEFAULT_SIDEBAR });
  const [banner, setBanner] = useState({ ...DEFAULT_BANNER });
  const [globalCss, setGlobalCss] = useState("");

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_STRING}/layout-config`, { withCredentials: true });
      setConfigs(res.data);
    } catch (err) {
      toast.error("Failed to fetch layout configs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  const resetForm = () => {
    setEditingId(null); setName("New Theme");
    setAppbar({ ...DEFAULT_APPBAR }); setSidebar({ ...DEFAULT_SIDEBAR });
    setBanner({ ...DEFAULT_BANNER }); setGlobalCss("");
  };

  const formatDatetimeForInput = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const tzoffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
  };

  const buildPayload = () => ({
    name: name.trim(),
    appbar,
    sidebar,
    banner: {
      ...banner,
      startDate: banner.startDate ? new Date(banner.startDate) : null,
      endDate: banner.endDate ? new Date(banner.endDate) : null,
    },
    customCss: globalCss,
  });

  const handleSubmit = async (activateAfter = false) => {
    if (!name.trim()) { toast.error("Theme name is required"); return; }
    const payload = buildPayload();
    try {
      let saved;
      if (editingId) {
        const res = await axios.put(`${process.env.REACT_APP_API_STRING}/layout-config/${editingId}`, payload, { withCredentials: true });
        saved = res.data;
        toast.success("Theme updated!");
      } else {
        const res = await axios.post(`${process.env.REACT_APP_API_STRING}/layout-config`, payload, { withCredentials: true });
        saved = res.data;
        toast.success("Theme created!");
      }
      if (activateAfter && saved?._id) {
        await axios.put(`${process.env.REACT_APP_API_STRING}/layout-config/${saved._id}/activate`, {}, { withCredentials: true });
        toast.success("Theme activated! Live in ~60s.");
      }
      resetForm();
      fetchConfigs();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save theme");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this theme?")) {
      try {
        await axios.delete(`${process.env.REACT_APP_API_STRING}/layout-config/${id}`, { withCredentials: true });
        toast.success("Theme deleted");
        fetchConfigs();
      } catch { toast.error("Failed to delete theme"); }
    }
  };

  const handleActivate = async (id) => {
    try {
      await axios.put(`${process.env.REACT_APP_API_STRING}/layout-config/${id}/activate`, {}, { withCredentials: true });
      toast.success("Theme activated! Live in ~60s.");
      fetchConfigs();
    } catch { toast.error("Failed to activate theme"); }
  };

  const handleEdit = (config) => {
    setEditingId(config._id);
    setName(config.name || "Unnamed");
    setAppbar({ ...DEFAULT_APPBAR, ...config.appbar });
    setSidebar({ ...DEFAULT_SIDEBAR, ...config.sidebar });
    setBanner({
      ...DEFAULT_BANNER, ...config.banner,
      startDate: config.banner?.startDate ? formatDatetimeForInput(config.banner.startDate) : "",
      endDate: config.banner?.endDate ? formatDatetimeForInput(config.banner.endDate) : "",
    });
    setGlobalCss(config.customCss || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const applyPreset = (preset) => {
    setAppbar((p) => ({ ...p, ...preset.appbar }));
    setSidebar((p) => ({ ...p, ...preset.sidebar }));
    toast.success(`"${preset.name}" preset applied`);
  };

  const updateAppbar = (field, value) => setAppbar((p) => ({ ...p, [field]: value }));
  const updateSidebar = (field, value) => setSidebar((p) => ({ ...p, [field]: value }));
  const updateBanner = (field, value) => setBanner((p) => ({ ...p, [field]: value }));

  const insertEmoji = (emoji) => {
    const input = textRef.current;
    if (input) {
      const start = input.selectionStart || banner.text.length;
      const end = input.selectionEnd || banner.text.length;
      const newText = banner.text.slice(0, start) + emoji + banner.text.slice(end);
      updateBanner("text", newText);
      setTimeout(() => { input.selectionStart = input.selectionEnd = start + emoji.length; input.focus(); }, 0);
    } else {
      updateBanner("text", banner.text + emoji);
    }
  };

  // ─── PREVIEW STYLES ───
  const previewAppbarStyles = {
    backgroundColor: appbar.backgroundColor,
    backdropFilter: `blur(${appbar.blurIntensity}px)`,
    boxShadow: appbar.shadow,
    borderBottom: appbar.borderBottom,
    color: appbar.textColor,
    height: appbar.height,
    display: "flex",
    alignItems: "center",
    px: 2,
    transition: "all 0.3s ease",
    position: "relative",
  };
  const previewSidebarStyles = {
    width: sidebar.width,
    backgroundColor: sidebar.glassEffect ? `${sidebar.backgroundColor}cc` : sidebar.backgroundColor,
    backdropFilter: sidebar.glassEffect ? "blur(12px)" : "none",
    borderRight: sidebar.borderRight,
    display: "flex",
    flexDirection: "column",
    alignItems: sidebar.width > 80 ? "stretch" : "center",
    py: 2,
    gap: 1,
    transition: "all 0.3s ease",
  };

  const marqueeAnimation = { "@keyframes preview-marquee": { "0%": { transform: "translateX(100%)" }, "100%": { transform: "translateX(-100%)" } } };
  const pulseAnimation = { "@keyframes preview-pulse": { "0%": { opacity: 0.9, transform: "scale(0.995)" }, "50%": { opacity: 1, transform: "scale(1.005)" }, "100%": { opacity: 0.9, transform: "scale(0.995)" } } };
  let previewAnimationStyles = {};
  if (banner.animationType === "marquee") previewAnimationStyles = { display: "inline-block", whiteSpace: "nowrap", animation: "preview-marquee 15s linear infinite", pl: "10%", pr: "10%" };
  else if (banner.animationType === "pulse") previewAnimationStyles = { animation: "preview-pulse 2s ease-in-out infinite" };

  const isMobilePreview = previewDevice === "mobile";

  // ─── RENDERERS ───
  const SectionHeader = ({ icon: Icon, title }) => (
    <Typography variant="caption" sx={{ fontWeight: 700, color: TEXT_SECONDARY, textTransform: "uppercase", letterSpacing: "0.08em", mb: 1.5, display: "flex", alignItems: "center", gap: 0.8 }}>
      {Icon && <Icon sx={{ fontSize: "0.95rem" }} />} {title}
    </Typography>
  );

  const ControlCard = ({ children, sx }) => (
    <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: PANEL_BG, borderColor: PANEL_BORDER, ...sx }}>
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>{children}</CardContent>
    </Card>
  );

  const ColorPicker = ({ label, value, onChange }) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <Box sx={{ position: "relative", width: 36, height: 36, borderRadius: 2, overflow: "hidden", border: `1px solid ${PANEL_BORDER}`, flexShrink: 0 }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          style={{ position: "absolute", top: -8, left: -8, width: 60, height: 60, border: "none", cursor: "pointer", padding: 0 }}
        />
      </Box>
      <TextField label={label} size="small" value={value} onChange={(e) => onChange(e.target.value)} sx={{ flexGrow: 1, input: { color: TEXT_PRIMARY, fontSize: "0.8rem" } }} InputLabelProps={{ sx: { color: TEXT_SECONDARY, fontSize: "0.75rem" } }} />
    </Box>
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: STUDIO_BG, color: TEXT_PRIMARY }}>
      {/* ─── TOP BAR ─── */}
      <Box sx={{ height: 64, px: 3, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${PANEL_BORDER}`, bgcolor: PANEL_BG }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <DashboardCustomizeIcon sx={{ color: ACCENT, fontSize: "1.5rem" }} />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2, color: TEXT_PRIMARY }}>Layout Studio</Typography>
            <Typography variant="caption" sx={{ color: TEXT_SECONDARY }}>Design your workspace experience</Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <TextField placeholder="Theme name" size="small" value={name} onChange={(e) => setName(e.target.value)}
            sx={{ width: 220, input: { color: TEXT_PRIMARY, fontSize: "0.85rem" }, bgcolor: "rgba(255,255,255,0.03)", borderRadius: 1, "& fieldset": { borderColor: PANEL_BORDER } }}
            InputProps={{ startAdornment: <InputAdornment position="start"><StyleIcon sx={{ color: TEXT_SECONDARY, fontSize: "1rem" }} /></InputAdornment> }}
          />
          <Button variant="contained" startIcon={<SaveIcon />} onClick={() => handleSubmit(false)}
            sx={{ bgcolor: ACCENT, "&:hover": { bgcolor: "#4f46e5" }, fontWeight: 700, textTransform: "none", borderRadius: 2 }}>
            {editingId ? "Update" : "Save"}
          </Button>
          <Button variant="outlined" startIcon={<RocketLaunchIcon />} onClick={() => handleSubmit(true)}
            sx={{ color: "#22c55e", borderColor: "#22c55e", fontWeight: 700, textTransform: "none", borderRadius: 2, "&:hover": { borderColor: "#16a34a", bgcolor: "rgba(34,197,94,0.08)" } }}>
            Save & Activate
          </Button>
          {editingId && (
            <Button variant="text" color="inherit" onClick={resetForm} startIcon={<ClearIcon />} sx={{ color: TEXT_SECONDARY, textTransform: "none" }}>
              Cancel
            </Button>
          )}
        </Box>
      </Box>

      {/* ─── MAIN WORKSPACE ─── */}
      <Box sx={{ display: "flex", height: "calc(100vh - 64px)" }}>
        {/* LEFT NAV */}
        <Box sx={{ width: 72, borderRight: `1px solid ${PANEL_BORDER}`, display: "flex", flexDirection: "column", alignItems: "center", py: 2, gap: 0.5, bgcolor: PANEL_BG }}>
          {[
            { icon: ComputerIcon, label: "App Bar" },
            { icon: PhoneAndroidIcon, label: "Side Nav" },
            { icon: CampaignIcon, label: "Banner" },
            { icon: CodeIcon, label: "CSS" },
          ].map((item, i) => (
            <Tooltip key={item.label} title={item.label} placement="right">
              <IconButton onClick={() => { setActiveTab(i); setShowGlobalCss(i === 3); }}
                sx={{
                  width: 48, height: 48, borderRadius: 2,
                  color: (activeTab === i && !showGlobalCss) || (i === 3 && showGlobalCss) ? ACCENT : TEXT_SECONDARY,
                  bgcolor: (activeTab === i && !showGlobalCss) || (i === 3 && showGlobalCss) ? "rgba(99,102,241,0.12)" : "transparent",
                  "&:hover": { bgcolor: "rgba(99,102,241,0.08)" },
                }}>
                <item.icon sx={{ fontSize: "1.3rem" }} />
              </IconButton>
            </Tooltip>
          ))}
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Global CSS" placement="right">
            <IconButton onClick={() => setShowGlobalCss(!showGlobalCss)}
              sx={{ width: 48, height: 48, borderRadius: 2, color: showGlobalCss ? "#f59e0b" : TEXT_SECONDARY, bgcolor: showGlobalCss ? "rgba(245,158,11,0.12)" : "transparent" }}>
              <AutoFixHighIcon sx={{ fontSize: "1.3rem" }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* PROPERTIES PANEL */}
        <Box sx={{ width: 340, borderRight: `1px solid ${PANEL_BORDER}`, overflowY: "auto", p: 3, bgcolor: PANEL_BG, display: showGlobalCss ? "none" : "flex", flexDirection: "column", gap: 2.5 }}>

          {/* === APP BAR === */}
          {activeTab === 0 && (
            <>
              <ControlCard>
                <SectionHeader icon={VisibilityIcon} title="Visibility" />
                <FormControlLabel
                  control={<Switch checked={appbar.enabled} onChange={(e) => updateAppbar("enabled", e.target.checked)} color="primary" />}
                  label={appbar.enabled ? "Enabled" : "Hidden"}
                  sx={{ color: TEXT_PRIMARY }}
                />
              </ControlCard>
              <ControlCard>
                <SectionHeader icon={PaletteIcon} title="Appearance" />
                <Stack spacing={2}>
                  <ColorPicker label="Background" value={appbar.backgroundColor} onChange={(v) => updateAppbar("backgroundColor", v)} />
                  <ColorPicker label="Text Color" value={appbar.textColor} onChange={(v) => updateAppbar("textColor", v)} />
                  <Box>
                    <Typography variant="caption" sx={{ color: TEXT_SECONDARY }}>Background Opacity: {Math.round((appbar.backgroundOpacity || 0) * 100)}%</Typography>
                    <Slider value={appbar.backgroundOpacity || 0} min={0} max={1} step={0.05} onChange={(e, val) => updateAppbar("backgroundOpacity", val)} sx={{ color: ACCENT }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: TEXT_SECONDARY }}>Glass Blur: {appbar.blurIntensity || 0}px</Typography>
                    <Slider value={appbar.blurIntensity || 0} min={0} max={30} step={1} onChange={(e, val) => updateAppbar("blurIntensity", val)} sx={{ color: ACCENT }} />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: TEXT_SECONDARY }}>Height: {appbar.height || 64}px</Typography>
                    <Slider value={appbar.height || 64} min={48} max={120} step={4} onChange={(e, val) => updateAppbar("height", val)} sx={{ color: ACCENT }} />
                  </Box>
                  <TextField label="Box Shadow (CSS)" size="small" value={appbar.shadow || "none"} onChange={(e) => updateAppbar("shadow", e.target.value)}
                    sx={{ input: { color: TEXT_PRIMARY, fontSize: "0.8rem" } }} InputLabelProps={{ sx: { color: TEXT_SECONDARY, fontSize: "0.75rem" } }} />
                  <TextField label="Border Bottom (CSS)" size="small" value={appbar.borderBottom || "none"} onChange={(e) => updateAppbar("borderBottom", e.target.value)}
                    sx={{ input: { color: TEXT_PRIMARY, fontSize: "0.8rem" } }} InputLabelProps={{ sx: { color: TEXT_SECONDARY, fontSize: "0.75rem" } }} />
                </Stack>
              </ControlCard>
              <ControlCard>
                <SectionHeader icon={AddIcon} title="Extra Widgets" />
                <Stack spacing={1.5}>
                  {appbar.extraContent?.map((item, idx) => (
                    <Paper key={idx} variant="outlined" sx={{ p: 1.5, borderRadius: 2, display: "flex", gap: 1, alignItems: "center", bgcolor: "rgba(255,255,255,0.02)", borderColor: PANEL_BORDER }}>
                      <TextField size="small" label="Label" value={item.label} onChange={(e) => { const next = [...appbar.extraContent]; next[idx] = { ...next[idx], label: e.target.value }; updateAppbar("extraContent", next); }} sx={{ flex: 1, input: { color: TEXT_PRIMARY, fontSize: "0.75rem" } }} InputLabelProps={{ sx: { fontSize: "0.7rem" } }} />
                      <TextField size="small" label="Icon" value={item.icon} onChange={(e) => { const next = [...appbar.extraContent]; next[idx] = { ...next[idx], icon: e.target.value }; updateAppbar("extraContent", next); }} sx={{ width: 90, input: { color: TEXT_PRIMARY, fontSize: "0.75rem" } }} InputLabelProps={{ sx: { fontSize: "0.7rem" } }} />
                      <IconButton size="small" color="error" onClick={() => updateAppbar("extraContent", appbar.extraContent.filter((_, i) => i !== idx))}><DeleteIcon fontSize="small" /></IconButton>
                    </Paper>
                  ))}
                  <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => updateAppbar("extraContent", [...(appbar.extraContent || []), { type: "link", label: "New", icon: "LinkIcon", href: "" }])}
                    sx={{ color: TEXT_SECONDARY, borderColor: PANEL_BORDER, textTransform: "none" }}>
                    Add Widget
                  </Button>
                </Stack>
              </ControlCard>
              <ControlCard>
                <SectionHeader icon={PaletteIcon} title="Quick Presets" />
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                  {PRESETS.map((preset) => (
                    <Chip key={preset.name} label={preset.name} onClick={() => applyPreset(preset)}
                      sx={{
                        bgcolor: preset.appbar.backgroundColor, color: preset.appbar.textColor, fontWeight: 600,
                        border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
                        textShadow: preset.appbar.textColor === "#ffffff" ? "0 1px 2px rgba(0,0,0,0.3)" : "none",
                        "&:hover": { transform: "scale(1.05)", boxShadow: 2 }, transition: "all 0.2s",
                      }} />
                  ))}
                </Box>
              </ControlCard>
            </>
          )}

          {/* === SIDEBAR === */}
          {activeTab === 1 && (
            <>
              <ControlCard>
                <SectionHeader icon={VisibilityIcon} title="Visibility" />
                <FormControlLabel control={<Switch checked={sidebar.enabled} onChange={(e) => updateSidebar("enabled", e.target.checked)} color="primary" />}
                  label={sidebar.enabled ? "Enabled" : "Hidden"} sx={{ color: TEXT_PRIMARY }} />
              </ControlCard>
              <ControlCard>
                <SectionHeader icon={PaletteIcon} title="Appearance" />
                <Stack spacing={2}>
                  <ColorPicker label="Background" value={sidebar.backgroundColor} onChange={(v) => updateSidebar("backgroundColor", v)} />
                  <ColorPicker label="Icon Color" value={sidebar.iconColor} onChange={(v) => updateSidebar("iconColor", v)} />
                  <ColorPicker label="Active Item" value={sidebar.activeItemColor} onChange={(v) => updateSidebar("activeItemColor", v)} />
                  <ColorPicker label="Hover BG" value={sidebar.hoverBgColor} onChange={(v) => updateSidebar("hoverBgColor", v)} />
                  <Box>
                    <Typography variant="caption" sx={{ color: TEXT_SECONDARY }}>Width: {sidebar.width || 60}px</Typography>
                    <Slider value={sidebar.width || 60} min={48} max={260} step={4} onChange={(e, val) => updateSidebar("width", val)} sx={{ color: ACCENT }} />
                  </Box>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: TEXT_SECONDARY, fontSize: "0.75rem" }}>Display Mode</InputLabel>
                    <Select value={sidebar.mode || "icon-only"} label="Display Mode" onChange={(e) => updateSidebar("mode", e.target.value)}
                      sx={{ color: TEXT_PRIMARY, fontSize: "0.85rem", "& .MuiOutlinedInput-notchedOutline": { borderColor: PANEL_BORDER } }}>
                      <MenuItem value="icon-only">Icon Only</MenuItem>
                      <MenuItem value="icon-label">Icon + Label</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField label="Border Right (CSS)" size="small" value={sidebar.borderRight || "none"} onChange={(e) => updateSidebar("borderRight", e.target.value)}
                    sx={{ input: { color: TEXT_PRIMARY, fontSize: "0.8rem" } }} InputLabelProps={{ sx: { color: TEXT_SECONDARY, fontSize: "0.75rem" } }} />
                  <FormControlLabel control={<Switch checked={sidebar.glassEffect} onChange={(e) => updateSidebar("glassEffect", e.target.checked)} />}
                    label="Glass Effect" sx={{ color: TEXT_PRIMARY }} />
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: TEXT_SECONDARY, fontSize: "0.75rem" }}>Background Image</InputLabel>
                    <Select value={sidebar.backgroundImage || "none"} label="Background Image" onChange={(e) => updateSidebar("backgroundImage", e.target.value)}
                      sx={{ color: TEXT_PRIMARY, fontSize: "0.85rem", "& .MuiOutlinedInput-notchedOutline": { borderColor: PANEL_BORDER } }}>
                      <MenuItem value="none">None</MenuItem>
                      <MenuItem value="sidebar-bg.webp">WhatsApp Dark</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </ControlCard>
            </>
          )}

          {/* === BANNER === */}
          {activeTab === 2 && (
            <>
              <ControlCard>
                <SectionHeader icon={VisibilityIcon} title="Visibility" />
                <FormControlLabel control={<Switch checked={banner.enabled} onChange={(e) => updateBanner("enabled", e.target.checked)} color="primary" />}
                  label={banner.enabled ? "Enabled" : "Hidden"} sx={{ color: TEXT_PRIMARY }} />
              </ControlCard>
              <ControlCard>
                <SectionHeader icon={CampaignIcon} title="Content" />
                <Stack spacing={2}>
                  <TextField inputRef={textRef} fullWidth label="Announcement Text" size="small" value={banner.text} onChange={(e) => updateBanner("text", e.target.value)}
                    placeholder="e.g. 🎉 New Portal is Live!"
                    sx={{ input: { color: TEXT_PRIMARY } }} InputLabelProps={{ sx: { color: TEXT_SECONDARY } }} />
                  {/* Emoji Picker */}
                  <Box>
                    <Typography variant="caption" sx={{ color: TEXT_SECONDARY, mb: 0.5, display: "block" }}>
                      <EmojiEmotionsIcon sx={{ fontSize: "0.85rem", verticalAlign: "middle", mr: 0.5 }} /> Emoji Picker
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {EMOJIS.map((emoji) => (
                        <Button key={emoji} size="small" variant="outlined" onClick={() => insertEmoji(emoji)}
                          sx={{ minWidth: 34, height: 34, p: 0, fontSize: "1.1rem", borderColor: PANEL_BORDER, color: TEXT_PRIMARY, "&:hover": { borderColor: ACCENT, bgcolor: "rgba(99,102,241,0.1)" } }}>
                          {emoji}
                        </Button>
                      ))}
                    </Box>
                  </Box>
                  <TextField fullWidth label="Link" size="small" value={banner.link} onChange={(e) => updateBanner("link", e.target.value)}
                    sx={{ input: { color: TEXT_PRIMARY } }} InputLabelProps={{ sx: { color: TEXT_SECONDARY } }} />
                </Stack>
              </ControlCard>
              <ControlCard>
                <SectionHeader icon={PaletteIcon} title="Style" />
                <Stack spacing={2}>
                  <ColorPicker label="Text Color" value={banner.textColor} onChange={(v) => updateBanner("textColor", v)} />
                  <TextField fullWidth label="Background" size="small" value={banner.backgroundColor} onChange={(e) => updateBanner("backgroundColor", e.target.value)}
                    helperText="CSS color or gradient" sx={{ input: { color: TEXT_PRIMARY, fontSize: "0.8rem" } }} InputLabelProps={{ sx: { color: TEXT_SECONDARY } }} FormHelperTextProps={{ sx: { color: TEXT_SECONDARY } }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: TEXT_SECONDARY }}>Height: {banner.height}px</Typography>
                    <Slider value={banner.height} min={24} max={60} step={2} onChange={(e, val) => updateBanner("height", val)} sx={{ color: ACCENT }} />
                  </Box>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {PRESET_GRADIENTS.map((p) => (
                      <Chip key={p.name} label={p.name} onClick={() => updateBanner("backgroundColor", p.value)}
                        sx={{ background: p.value, color: "#fff", fontWeight: "bold", textShadow: "0 1px 2px rgba(0,0,0,0.3)", cursor: "pointer", "&:hover": { transform: "scale(1.05)" } }} />
                    ))}
                  </Box>
                </Stack>
              </ControlCard>
              <ControlCard>
                <SectionHeader icon={AutoFixHighIcon} title="Behavior" />
                <Stack spacing={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: TEXT_SECONDARY }}>Animation</InputLabel>
                    <Select value={banner.animationType} label="Animation" onChange={(e) => updateBanner("animationType", e.target.value)}
                      sx={{ color: TEXT_PRIMARY, "& .MuiOutlinedInput-notchedOutline": { borderColor: PANEL_BORDER } }}>
                      <MenuItem value="none">None</MenuItem>
                      <MenuItem value="marquee">Marquee</MenuItem>
                      <MenuItem value="pulse">Pulse</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: TEXT_SECONDARY }}>Display Mode</InputLabel>
                    <Select value={banner.displayMode} label="Display Mode" onChange={(e) => updateBanner("displayMode", e.target.value)}
                      sx={{ color: TEXT_PRIMARY, "& .MuiOutlinedInput-notchedOutline": { borderColor: PANEL_BORDER } }}>
                      <MenuItem value="top-bar">Top Bar (Push Content)</MenuItem>
                      <MenuItem value="appbar-overlay">AppBar Overlay</MenuItem>
                    </Select>
                  </FormControl>
                  <Box>
                    <Typography variant="caption" sx={{ color: TEXT_SECONDARY }}>Overlay Opacity: {Math.round((banner.opacity || 1) * 100)}%</Typography>
                    <Slider value={banner.opacity || 1} min={0} max={1} step={0.05} onChange={(e, val) => updateBanner("opacity", val)} sx={{ color: ACCENT }} />
                  </Box>
                  <FormControlLabel control={<Switch checked={banner.closable} onChange={(e) => updateBanner("closable", e.target.checked)} />}
                    label="User can dismiss" sx={{ color: TEXT_PRIMARY }} />
                </Stack>
              </ControlCard>
              <ControlCard>
                <SectionHeader icon={ScheduleIcon} title="Scheduler" />
                <Stack spacing={2}>
                  <TextField fullWidth label="Start Date" type="datetime-local" size="small" value={banner.startDate}
                    onChange={(e) => updateBanner("startDate", e.target.value)} InputLabelProps={{ shrink: true, sx: { color: TEXT_SECONDARY } }}
                    sx={{ input: { color: TEXT_PRIMARY } }} />
                  <TextField fullWidth label="End Date" type="datetime-local" size="small" value={banner.endDate}
                    onChange={(e) => updateBanner("endDate", e.target.value)} InputLabelProps={{ shrink: true, sx: { color: TEXT_SECONDARY } }}
                    sx={{ input: { color: TEXT_PRIMARY } }} />
                </Stack>
              </ControlCard>
              <ControlCard>
                <SectionHeader icon={CodeIcon} title="Custom CSS (Banner Only)" />
                <TextField fullWidth multiline rows={4} label="Banner CSS" size="small" value={banner.customCss || ""}
                  onChange={(e) => updateBanner("customCss", e.target.value)}
                  placeholder={`/* Target: #app-promo-banner */\n#app-promo-banner {\n  font-size: 1.1rem;\n}`}
                  helperText="Scoped to banner. Use Global CSS tab for app-wide rules."
                  sx={{ "& textarea": { color: TEXT_PRIMARY, fontFamily: "monospace", fontSize: "0.8rem" } }} InputLabelProps={{ sx: { color: TEXT_SECONDARY } }} FormHelperTextProps={{ sx: { color: TEXT_SECONDARY } }} />
              </ControlCard>
            </>
          )}
        </Box>

        {/* GLOBAL CSS OVERLAY (when CSS tab clicked) */}
        {showGlobalCss && (
          <Box sx={{ width: 380, borderRight: `1px solid ${PANEL_BORDER}`, overflowY: "auto", p: 3, bgcolor: PANEL_BG, display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: TEXT_PRIMARY, display: "flex", alignItems: "center", gap: 1 }}>
              <CodeIcon sx={{ color: "#f59e0b" }} /> Global Stylesheet
            </Typography>
            <Typography variant="body2" sx={{ color: TEXT_SECONDARY }}>
              Write CSS that targets any element in the application. This is injected globally and affects all users.
            </Typography>
            <TextField fullWidth multiline rows={20} label="Global Custom CSS" size="small" value={globalCss}
              onChange={(e) => setGlobalCss(e.target.value)}
              placeholder={`/* Examples */\n#appbar-main {\n  border-bottom: 2px solid #6366f1 !important;\n}\n\n#appbar-toolbar {\n  padding-left: 24px;\n}\n\n.appbar-links:hover {\n  transform: scale(1.05);\n}`}
              sx={{
                flexGrow: 1,
                "& textarea": { color: TEXT_PRIMARY, fontFamily: "'Fira Code', 'Courier New', monospace", fontSize: "0.8rem", lineHeight: 1.6, bgcolor: "#0f1014", borderRadius: 1, p: 1.5 },
                "& fieldset": { borderColor: PANEL_BORDER },
              }} InputLabelProps={{ sx: { color: TEXT_SECONDARY } }} />
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button variant="outlined" fullWidth onClick={() => setGlobalCss("")} sx={{ color: TEXT_SECONDARY, borderColor: PANEL_BORDER, textTransform: "none" }}>Clear</Button>
              <Button variant="contained" fullWidth onClick={() => handleSubmit(false)} sx={{ bgcolor: ACCENT, textTransform: "none", fontWeight: 700 }}>Save CSS</Button>
            </Box>
          </Box>
        )}

        {/* CENTER CANVAS */}
        <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", bgcolor: "#08090c", position: "relative" }}>
          {/* Canvas Toolbar */}
          <Box sx={{ height: 48, px: 2, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${PANEL_BORDER}` }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: TEXT_SECONDARY, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              <VisibilityIcon sx={{ fontSize: "0.85rem", verticalAlign: "middle", mr: 0.5 }} /> Live Preview
            </Typography>
            <ToggleButtonGroup size="small" value={previewDevice} exclusive onChange={(e, val) => val && setPreviewDevice(val)}
              sx={{ bgcolor: "rgba(255,255,255,0.04)", borderRadius: 2, "& .MuiToggleButton-root": { color: TEXT_SECONDARY, border: "none", px: 1.5, py: 0.5, "&.Mui-selected": { color: ACCENT, bgcolor: "rgba(99,102,241,0.12)" } } }}>
              <ToggleButton value="desktop"><ComputerIcon fontSize="small" /></ToggleButton>
              <ToggleButton value="mobile"><PhoneIphoneIcon fontSize="small" /></ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Preview Stage */}
          <Box sx={{ flexGrow: 1, p: 4, display: "flex", justifyContent: "center", alignItems: "center", overflow: "auto" }}>
            {/* Device Frame */}
            <Box sx={{
              width: isMobilePreview ? 360 : "100%",
              maxWidth: isMobilePreview ? 360 : 900,
              height: isMobilePreview ? 640 : "85%",
              minHeight: 400,
              bgcolor: "#F9FAFB",
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 25px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
              display: "flex",
              flexDirection: "column",
              transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              position: "relative",
            }}>
              {/* Browser Chrome */}
              <Box sx={{ height: 32, bgcolor: "#e2e8f0", display: "flex", alignItems: "center", px: 2, gap: 0.6 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#ef4444" }} />
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#f59e0b" }} />
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#22c55e" }} />
                <Box sx={{ ml: 2, flexGrow: 1, height: 18, bgcolor: "rgba(255,255,255,0.6)", borderRadius: 1 }} />
              </Box>

              {/* Inject global + banner custom CSS into preview */}
              {(globalCss || banner.customCss) && (
                <style dangerouslySetInnerHTML={{ __html: `${globalCss || ""}\n${banner.customCss || ""}` }} />
              )}

              {/* App Layout */}
              <Box sx={{ display: "flex", flexGrow: 1, overflow: "hidden", position: "relative" }}>
                {/* Sidebar */}
                {sidebar.enabled && (
                  <Box sx={previewSidebarStyles}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: sidebar.iconColor, opacity: 0.5, mb: 2, alignSelf: sidebar.width > 80 ? "flex-start" : "center", ml: sidebar.width > 80 ? 1 : 0 }} />
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Box key={i} sx={{ width: sidebar.width > 80 ? "85%" : 28, height: 28, borderRadius: sidebar.width > 80 ? 1 : "50%", bgcolor: sidebar.iconColor, opacity: 0.3, mb: 1, alignSelf: sidebar.width > 80 ? "stretch" : "center", ml: sidebar.width > 80 ? 1 : 0 }} />
                    ))}
                  </Box>
                )}
                {!sidebar.enabled && (
                  <Box sx={{ position: "absolute", left: 8, top: 8, zIndex: 10, bgcolor: "rgba(239,68,68,0.9)", color: "#fff", fontSize: "0.6rem", fontWeight: 700, px: 1, py: 0.3, borderRadius: 1 }}>SIDEBAR OFF</Box>
                )}

                {/* Main */}
                <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
                  {/* AppBar */}
                  {appbar.enabled && (
                    <Box id="appbar-main" sx={{ position: "relative" }}>
                      {/* Banner Top Bar */}
                      {banner.enabled && banner.displayMode === "top-bar" && (
                        <Box id="app-promo-banner" sx={{ position: "relative", overflow: "hidden" }}>
                          <Box sx={{ width: "100%", height: `${banner.height}px`, background: banner.backgroundColor, color: banner.textColor, display: "flex", alignItems: "center", justifyContent: banner.animationType === "marquee" ? "flex-start" : "center", position: "relative", ...pulseAnimation, ...marqueeAnimation }}>
                            <Box sx={{ ...previewAnimationStyles, px: 2, fontSize: "0.7rem", fontWeight: 600 }}>{banner.text || "Your announcement here"}</Box>
                            {banner.closable && <CloseIcon sx={{ position: "absolute", right: 8, fontSize: "0.8rem", opacity: 0.7 }} />}
                          </Box>
                        </Box>
                      )}
                      {/* Toolbar */}
                      <Box id="appbar-toolbar" sx={{ ...previewAppbarStyles, position: "relative" }}>
                        {banner.enabled && banner.displayMode === "appbar-overlay" && (
                          <Box id="app-promo-banner" sx={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: banner.animationType === "marquee" ? "flex-start" : "center", overflow: "hidden", ...pulseAnimation, ...marqueeAnimation }}>
                            <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: banner.backgroundColor, opacity: banner.opacity, zIndex: 0 }} />
                            <Box sx={{ ...previewAnimationStyles, px: 2, fontSize: "0.7rem", fontWeight: 600, position: "relative", zIndex: 1, color: banner.textColor }}>{banner.text || "Your announcement here"}</Box>
                            {banner.closable && <CloseIcon sx={{ position: "absolute", right: 8, fontSize: "0.8rem", opacity: 0.7, zIndex: 1, color: banner.textColor }} />}
                          </Box>
                        )}
                        <Box sx={{ display: "flex", alignItems: "center", width: "100%", position: "relative", zIndex: banner.displayMode === "appbar-overlay" ? 0 : 1 }}>
                          {isMobilePreview && <MenuIcon sx={{ fontSize: "1rem", mr: 1, opacity: 0.6 }} />}
                          <ArrowBackIcon sx={{ fontSize: "1rem", mr: 1, opacity: 0.6 }} />
                          <Box sx={{ width: 80, height: 20, bgcolor: appbar.textColor, opacity: 0.15, borderRadius: 0.5 }} />
                          <Box sx={{ flexGrow: 1 }} />
                          <Box sx={{ width: 60, height: 16, bgcolor: appbar.textColor, opacity: 0.1, borderRadius: 0.5 }} />
                          <Box sx={{ width: 40, height: 16, bgcolor: appbar.textColor, opacity: 0.1, borderRadius: 0.5, ml: 1 }} />
                          {appbar.extraContent?.map((_, i) => (
                            <Box key={i} sx={{ width: 20, height: 20, bgcolor: appbar.textColor, opacity: 0.2, borderRadius: "50%", ml: 1 }} />
                          ))}
                        </Box>
                      </Box>
                    </Box>
                  )}
                  {!appbar.enabled && (
                    <Box sx={{ position: "absolute", right: 8, top: 36, zIndex: 10, bgcolor: "rgba(239,68,68,0.9)", color: "#fff", fontSize: "0.6rem", fontWeight: 700, px: 1, py: 0.3, borderRadius: 1 }}>APPBAR OFF</Box>
                  )}

                  {/* Fake Content */}
                  <Box sx={{ p: 2.5, flexGrow: 1 }}>
                    <Box sx={{ width: "55%", height: 18, bgcolor: "#e2e8f0", borderRadius: 1, mb: 2 }} />
                    <Box sx={{ width: "92%", height: 10, bgcolor: "#e2e8f0", borderRadius: 0.5, mb: 1 }} />
                    <Box sx={{ width: "88%", height: 10, bgcolor: "#e2e8f0", borderRadius: 0.5, mb: 1 }} />
                    <Box sx={{ width: "72%", height: 10, bgcolor: "#e2e8f0", borderRadius: 0.5, mb: 3 }} />
                    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5 }}>
                      {[1, 2, 3].map((i) => <Box key={i} sx={{ height: 70, bgcolor: "#e2e8f0", borderRadius: 1.5 }} />)}
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ─── SAVED THEMES STRIP ─── */}
      <Box sx={{ borderTop: `1px solid ${PANEL_BORDER}`, bgcolor: PANEL_BG, px: 3, py: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: TEXT_PRIMARY }}>
            Saved Themes ({configs.length})
          </Typography>
          {loading && <Typography variant="caption" sx={{ color: TEXT_SECONDARY }}>Loading…</Typography>}
        </Box>
        {configs.length === 0 ? (
          <Typography variant="body2" sx={{ color: TEXT_SECONDARY, textAlign: "center", py: 3 }}>
            No saved themes yet. Design and save your first layout theme.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", gap: 2, overflowX: "auto", pb: 1, "&::-webkit-scrollbar": { height: 6 }, "&::-webkit-scrollbar-thumb": { bgcolor: PANEL_BORDER, borderRadius: 3 } }}>
            {configs.map((c) => (
              <Card key={c._id} sx={{
                minWidth: 220,
                maxWidth: 220,
                bgcolor: "#1a1b1f",
                border: `1px solid ${c.isActive ? ACCENT : PANEL_BORDER}`,
                borderRadius: 2.5,
                position: "relative",
                transition: "all 0.2s",
                "&:hover": { borderColor: ACCENT, transform: "translateY(-2px)", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" },
              }}>
                {c.isActive && (
                  <Badge sx={{ position: "absolute", top: 10, right: 10, zIndex: 2 }}>
                    <Chip size="small" label="LIVE" color="success" sx={{ fontWeight: 800, fontSize: "0.6rem", height: 20 }} />
                  </Badge>
                )}
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
                    <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: c.appbar?.backgroundColor || "#ccc", border: `1px solid ${PANEL_BORDER}` }} />
                    <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: c.sidebar?.backgroundColor || "#ccc", border: `1px solid ${PANEL_BORDER}` }} />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: TEXT_PRIMARY, mb: 0.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</Typography>
                  <Typography variant="caption" sx={{ color: TEXT_SECONDARY, display: "block", mb: 1.5 }}>
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    {!c.isActive && (
                      <Button size="small" variant="outlined" startIcon={<CheckCircleIcon />} onClick={() => handleActivate(c._id)}
                        sx={{ color: "#22c55e", borderColor: "#22c55e", fontSize: "0.7rem", fontWeight: 700, textTransform: "none", flexGrow: 1, py: 0.3, "&:hover": { bgcolor: "rgba(34,197,94,0.08)" } }}>
                        Activate
                      </Button>
                    )}
                    <IconButton size="small" onClick={() => handleEdit(c)} sx={{ color: TEXT_SECONDARY, bgcolor: "rgba(255,255,255,0.04)", "&:hover": { bgcolor: "rgba(255,255,255,0.08)", color: ACCENT } }}><EditIcon sx={{ fontSize: "0.95rem" }} /></IconButton>
                    <IconButton size="small" onClick={() => {
                      setEditingId(null); setName(`${c.name} (Copy)`);
                      setAppbar({ ...DEFAULT_APPBAR, ...c.appbar });
                      setSidebar({ ...DEFAULT_SIDEBAR, ...c.sidebar });
                      setBanner({ ...DEFAULT_BANNER, ...c.banner, startDate: c.banner?.startDate ? formatDatetimeForInput(c.banner.startDate) : "", endDate: c.banner?.endDate ? formatDatetimeForInput(c.banner.endDate) : "" });
                      setGlobalCss(c.customCss || "");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }} sx={{ color: TEXT_SECONDARY, bgcolor: "rgba(255,255,255,0.04)", "&:hover": { bgcolor: "rgba(255,255,255,0.08)", color: ACCENT } }}><ContentCopyIcon sx={{ fontSize: "0.95rem" }} /></IconButton>
                    <IconButton size="small" onClick={() => handleDelete(c._id)} sx={{ color: TEXT_SECONDARY, bgcolor: "rgba(255,255,255,0.04)", "&:hover": { bgcolor: "rgba(239,68,68,0.12)", color: "#ef4444" } }}><DeleteIcon sx={{ fontSize: "0.95rem" }} /></IconButton>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
