import React, {
  useEffect,
  useRef,
  useState,
  useContext,
  useCallback,
} from "react";
import grapesjs from "grapesjs";
import DOMPurify from "dompurify";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { UserContext } from "../../contexts/UserContext";
import {
  Box,
  Button,
  TextField,
  Typography,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import PreviewIcon from "@mui/icons-material/Preview";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PaletteIcon from "@mui/icons-material/Palette";
import ScheduleIcon from "@mui/icons-material/Schedule";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

// --- Festival Presets ---
const FESTIVAL_PRESETS = [
  {
    label: "Diwali 🪔",
    tag: "Diwali",
    bgColor: "#FF6B00",
    textColor: "#FFD700",
    message: "🪔 Happy Diwali! Wishing you joy, prosperity & light! 🪔",
  },
  {
    label: "Holi 🎨",
    tag: "Holi",
    bgColor: "#E91E8C",
    textColor: "#FFFFFF",
    message: "🎨 Happy Holi! May your life be filled with vibrant colors! 🎨",
  },
  {
    label: "New Year 🎉",
    tag: "New Year",
    bgColor: "#1A1A2E",
    textColor: "#FFD700",
    message:
      "🎉 Happy New Year! Wishing you success and happiness in the new year!",
  },
  {
    label: "Independence Day 🇮🇳",
    tag: "Independence Day",
    bgColor: "#138808",
    textColor: "#FFFFFF",
    message:
      "🇮🇳 Happy Independence Day! Proud to be Indian! Jai Hind! 🇮🇳",
  },
  {
    label: "Eid 🌙",
    tag: "Eid",
    bgColor: "#1B5E20",
    textColor: "#FFD700",
    message: "🌙 Eid Mubarak! Wishing you peace, happiness and prosperity!",
  },
  {
    label: "Christmas 🎄",
    tag: "Christmas",
    bgColor: "#B71C1C",
    textColor: "#FFFFFF",
    message: "🎄 Merry Christmas! May this season bring joy and warmth!",
  },
  {
    label: "Custom",
    tag: "Custom",
    bgColor: "#1976D2",
    textColor: "#FFFFFF",
    message: "",
  },
];

// --- GrapesJS Base Template (what the editor loads) ---
const BASE_EDITABLE_HTML = `
<div id="navbar-editable-zone" style="width:100%; box-sizing:border-box;">
  <div class="festival-banner" style="
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px 16px;
    gap: 8px;
    width: 100%;
    box-sizing: border-box;
    background: var(--theme-bg, #1976D2);
    color: var(--theme-text, #fff);
  ">
    <p class="festival-message" style="
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.3px;
      text-align: center;
      color: inherit;
    ">✨ Your festival message goes here ✨</p>
  </div>
</div>
`;

const BASE_EDITABLE_CSS = `
  #navbar-editable-zone { font-family: 'Inter', 'Roboto', sans-serif; }
  .festival-banner { min-height: 36px; overflow: hidden; }
  .festival-message { transition: all 0.3s ease; }
`;

function NavbarCustomizer() {
  const navigate = useNavigate();
  const { id: editId } = useParams(); // Optional: editing existing theme
  const { user } = useContext(UserContext);
  const editorRef = useRef(null);
  const gjsContainerRef = useRef(null);

  // --- Form State ---
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState("Custom");
  const [bgColor, setBgColor] = useState("#1976D2");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [isActive, setIsActive] = useState(false);
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("");

  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState({ html: "", css: "" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: "", severity: "success" });

  // --- Initialize GrapesJS ---
  useEffect(() => {
    const editor = grapesjs.init({
      container: "#gjs-editor",
      height: "400px",
      width: "100%",
      fromElement: false,
      storageManager: false,
      // RESTRICTED: No code editor, no scripts
      plugins: [],
      pluginsOpts: {},
      components: BASE_EDITABLE_HTML,
      style: BASE_EDITABLE_CSS,
      // Panel buttons restriction
      panels: {
        defaults: [
          {
            id: "panel-top",
            el: ".panel__top",
            buttons: [],
          },
          {
            id: "basic-actions",
            el: ".panel__basic-actions",
            buttons: [
              {
                id: "undo",
                className: "btn-undo",
                label: "↩ Undo",
                command: "core:undo",
              },
              {
                id: "redo",
                className: "btn-redo",
                label: "↪ Redo",
                command: "core:redo",
              },
              {
                id: "clear",
                className: "btn-clear",
                label: "🗑 Clear",
                command: "core:canvas-clear",
              },
            ],
          },
        ],
      },
      blockManager: {
        appendTo: "#gjs-blocks",
        blocks: [
          {
            id: "text-block",
            label: "📝 Text",
            category: "🎨 Festival Elements",
            content:
              '<p class="festival-message" style="margin:0; font-size:14px; font-weight:600; text-align:center;">New Message Text</p>',
          },
          {
            id: "icon-block",
            label: "🌟 Icon/Emoji",
            category: "🎨 Festival Elements",
            content:
              '<span style="font-size:24px; display:inline-block;">🪔</span>',
          },
          {
            id: "image-block",
            label: "🖼 Image",
            category: "🎨 Festival Elements",
            content: {
              type: "image",
              style: { height: "32px", "max-width": "100px", "object-fit": "contain" },
              attributes: { src: "https://via.placeholder.com/100x32", alt: "decoration" },
            },
          },
          {
            id: "container-block",
            label: "📦 Container",
            category: "🎨 Festival Elements",
            content:
              '<div style="display:flex; align-items:center; justify-content:center; gap:8px;"></div>',
          },
          {
            id: "separator-block",
            label: "⬢ Separator",
            category: "🎨 Festival Elements",
            content:
              '<span style="display:inline-block; width:1px; height:20px; background:rgba(255,255,255,0.4); margin:0 8px; vertical-align:middle;"></span>',
          },
        ],
      },
      styleManager: {
        appendTo: "#gjs-styles",
        sectors: [
          {
            name: "Text",
            open: true,
            properties: [
              { name: "Font", property: "font-family", type: "select", list: [{ value: "'Inter', sans-serif", name: "Inter" }, { value: "'Roboto', sans-serif", name: "Roboto" }, { value: "Georgia, serif", name: "Georgia" }] },
              { name: "Size", property: "font-size", type: "slider", defaults: "14px", min: 8, max: 36, step: 1, unit: "px" },
              { name: "Weight", property: "font-weight", type: "select", list: [{ value: "400", name: "Normal" }, { value: "600", name: "Semi-Bold" }, { value: "700", name: "Bold" }] },
              { name: "Color", property: "color" },
              { name: "Align", property: "text-align", type: "radio", list: [{ value: "left", name: "Left" }, { value: "center", name: "Center" }, { value: "right", name: "Right" }] },
            ],
          },
          {
            name: "Banner Container",
            open: false,
            properties: [
              { name: "Background", property: "background-color" },
              { name: "Padding", property: "padding", type: "composite", properties: [{ property: "padding-top" }, { property: "padding-right" }, { property: "padding-bottom" }, { property: "padding-left" }] },
              { name: "Border Radius", property: "border-radius" },
            ],
          },
        ],
      },
      canvas: {
        styles: [
          "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap",
        ],
      },
      // Block editor security: disable code view
      commands: {
        defaults: [],
      },
    });

    editorRef.current = editor;

    // Override component selection to lock certain selectors
    editor.on("component:selected", (component) => {
      // Don't allow selecting the root editable zone wrapper
      if (component.get("tagName") === "body") {
        editor.select(null);
      }
    });

    // Disable context menu script injection
    editor.on("canvas:drop", (dataTransfer) => {
      return true;
    });

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
  }, []);

  // --- Load theme for editing ---
  useEffect(() => {
    if (!editId) return;
    setLoading(true);
    axios
      .get(
        `${process.env.REACT_APP_API_STRING}/app-bar-themes/${editId}`,
        { withCredentials: true }
      )
      .then((res) => {
        const t = res.data;
        setName(t.name);
        setDescription(t.description || "");
        setTag(t.tag || "Custom");
        setBgColor(t.bgColor || "#1976D2");
        setTextColor(t.textColor || "#FFFFFF");
        setIsActive(t.isActive || false);
        setScheduleStart(
          t.schedule?.start
            ? new Date(t.schedule.start).toISOString().slice(0, 16)
            : ""
        );
        setScheduleEnd(
          t.schedule?.end
            ? new Date(t.schedule.end).toISOString().slice(0, 16)
            : ""
        );
        if (t.gjsData && editorRef.current) {
          editorRef.current.loadProjectData(t.gjsData);
        } else if (t.html && editorRef.current) {
          editorRef.current.setComponents(t.html);
        }
        setLoading(false);
      })
      .catch(() => {
        setSnack({ open: true, msg: "Failed to load theme", severity: "error" });
        setLoading(false);
      });
  }, [editId]);

  // --- Apply preset ---
  const applyPreset = useCallback(
    (preset) => {
      setTag(preset.tag);
      setBgColor(preset.bgColor);
      setTextColor(preset.textColor);
      setSelectedPreset(preset.tag);

      if (preset.message && editorRef.current) {
        const messages = editorRef.current
          .getWrapper()
          .find(".festival-message");
        if (messages.length > 0) {
          messages[0].set("content", preset.message);
        }
        // Update the banner bg via CSS var through style
        const banners = editorRef.current.getWrapper().find(".festival-banner");
        if (banners.length > 0) {
          banners[0].addStyle({
            background: preset.bgColor,
            color: preset.textColor,
          });
        }
      }
    },
    []
  );

  // --- Build preview data ---
  const handlePreview = () => {
    if (!editorRef.current) return;
    const rawHtml = editorRef.current.getHtml();
    const css = editorRef.current.getCss();
    const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        "div", "span", "p", "h1", "h2", "h3", "h4", "h5", "h6",
        "img", "a", "strong", "em", "br", "ul", "li", "ol",
        "section", "article",
      ],
      ALLOWED_ATTR: ["class", "id", "src", "alt", "href", "style", "data-*"],
    });
    setPreviewData({ html: sanitizedHtml, css });
    setShowPreview(true);
  };

  // --- Save theme ---
  const handleSave = async () => {
    if (!name.trim()) {
      setSnack({ open: true, msg: "Please enter a template name", severity: "warning" });
      return;
    }
    if (!editorRef.current) return;

    setSaving(true);
    try {
      const rawHtml = editorRef.current.getHtml();
      const css = editorRef.current.getCss();
      const gjsData = editorRef.current.getProjectData();
      const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: [
          "div", "span", "p", "h1", "h2", "h3", "h4", "h5", "h6",
          "img", "a", "strong", "em", "br", "ul", "li", "ol",
        ],
        ALLOWED_ATTR: ["class", "id", "src", "alt", "href", "style"],
      });

      const payload = {
        name,
        description,
        tag,
        gjsData,
        html: sanitizedHtml,
        css,
        bgColor,
        textColor,
        isActive,
        schedule: {
          start: scheduleStart ? new Date(scheduleStart) : null,
          end: scheduleEnd ? new Date(scheduleEnd) : null,
        },
        updatedBy: user?.username,
        createdBy: user?.username,
      };

      if (editId) {
        await axios.put(
          `${process.env.REACT_APP_API_STRING}/app-bar-themes/${editId}`,
          payload,
          { withCredentials: true }
        );
        setSnack({ open: true, msg: "Theme updated successfully!", severity: "success" });
      } else {
        await axios.post(
          `${process.env.REACT_APP_API_STRING}/app-bar-themes`,
          payload,
          { withCredentials: true }
        );
        setSnack({ open: true, msg: "Theme saved successfully!", severity: "success" });
        setTimeout(() => navigate("/admin/navbar-themes"), 1200);
      }
    } catch (err) {
      setSnack({
        open: true,
        msg: "Error saving theme. Please try again.",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0, minHeight: "100vh", bgcolor: "#f5f7fa" }}>
      {/* ---- Header ---- */}
      <Paper
        elevation={0}
        sx={{
          px: 3, py: 2,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid #e0e0e0",
          bgcolor: "#fff", position: "sticky", top: 0, zIndex: 100,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton onClick={() => navigate("/admin/navbar-themes")} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              🎨 Navbar Theme Designer
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Design a festival theme for the app bar
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<PreviewIcon />}
            onClick={handlePreview}
            size="small"
          >
            Live Preview
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
            size="small"
            sx={{ bgcolor: "#1976D2" }}
          >
            {saving ? "Saving..." : editId ? "Update Theme" : "Save Theme"}
          </Button>
        </Box>
      </Paper>

      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ---- Left Sidebar: Controls ---- */}
        <Paper
          elevation={0}
          sx={{
            width: 280, flexShrink: 0,
            borderRight: "1px solid #e0e0e0",
            bgcolor: "#fff", overflow: "auto",
            p: 2, display: "flex", flexDirection: "column", gap: 2,
          }}
        >
          {/* Name & Description */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1} color="text.secondary">
              TEMPLATE INFO
            </Typography>
            <TextField
              label="Template Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              size="small"
              fullWidth
              sx={{ mb: 1.5 }}
              placeholder="e.g. Diwali 2024"
            />
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              size="small"
              fullWidth
              multiline
              rows={2}
              placeholder="Optional summary"
            />
          </Box>

          <Divider />

          {/* Festival Presets */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1} color="text.secondary">
              🎉 FESTIVAL PRESETS
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
              {FESTIVAL_PRESETS.map((preset) => (
                <Chip
                  key={preset.tag}
                  label={preset.label}
                  size="small"
                  onClick={() => applyPreset(preset)}
                  variant={selectedPreset === preset.tag ? "filled" : "outlined"}
                  color={selectedPreset === preset.tag ? "primary" : "default"}
                  clickable
                  sx={{ cursor: "pointer", fontSize: "11px" }}
                />
              ))}
            </Box>
          </Box>

          <Divider />

          {/* Colors */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1.5} color="text.secondary">
              <PaletteIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: "middle" }} />
              COLORS (for App Bar)
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-end" }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Background</Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    style={{ width: 40, height: 32, border: "none", borderRadius: 4, cursor: "pointer", padding: 0 }}
                  />
                  <TextField
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    size="small"
                    sx={{ width: 100 }}
                    inputProps={{ style: { fontFamily: "monospace", fontSize: 12 } }}
                  />
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Text Color</Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    style={{ width: 40, height: 32, border: "none", borderRadius: 4, cursor: "pointer", padding: 0 }}
                  />
                  <TextField
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    size="small"
                    sx={{ width: 100 }}
                    inputProps={{ style: { fontFamily: "monospace", fontSize: 12 } }}
                  />
                </Box>
              </Box>
            </Box>
          </Box>

          <Divider />

          {/* Scheduling */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1.5} color="text.secondary">
              <ScheduleIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: "middle" }} />
              SCHEDULE
            </Typography>
            <TextField
              label="Start Date & Time"
              type="datetime-local"
              value={scheduleStart}
              onChange={(e) => setScheduleStart(e.target.value)}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 1.5 }}
            />
            <TextField
              label="End Date & Time"
              type="datetime-local"
              value={scheduleEnd}
              onChange={(e) => setScheduleEnd(e.target.value)}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{ mb: 1.5 }}
            />
            <Alert severity="info" sx={{ fontSize: "11px", py: 0.5 }}>
              Leave blank for no scheduling — use the toggle below to manually activate.
            </Alert>
          </Box>

          <Divider />

          {/* Active Toggle */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  color="success"
                />
              }
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {isActive ? "✅ Active" : "⏸ Inactive"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {isActive
                      ? "This theme is live on the app bar"
                      : "Enable to show this theme"}
                  </Typography>
                </Box>
              }
            />
          </Box>
        </Paper>

        {/* ---- Main Editor Area ---- */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* GrapesJS Canvas */}
          <Box sx={{ flex: 1, position: "relative" }}>
            {loading && (
              <Box sx={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(255,255,255,0.8)", zIndex: 10 }}>
                <CircularProgress />
              </Box>
            )}
            {/* GrapesJS Panel (Undo/Redo/Clear) */}
            <Box
              sx={{
                display: "flex", gap: 1, alignItems: "center",
                px: 2, py: 1,
                bgcolor: "#1e1e2e", color: "#fff",
                "& .panel__basic-actions": { display: "flex", gap: 1 },
              }}
            >
              <Typography variant="caption" sx={{ color: "#aaa", mr: 1 }}>
                🖌 Canvas
              </Typography>
              <div className="panel__basic-actions" />
            </Box>
            {/* Main GrapesJS editor container */}
            <div
              id="gjs-editor"
              ref={gjsContainerRef}
              style={{ height: "420px", border: "1px solid #ddd" }}
            />
          </Box>

          {/* ---- Blocks Panel ---- */}
          <Box sx={{ borderTop: "1px solid #e0e0e0", bgcolor: "#fafafa", p: 1.5 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 1 }}>
              🧩 DRAG ELEMENTS INTO THE CANVAS
            </Typography>
            <div id="gjs-blocks" style={{ display: "flex", flexWrap: "wrap", gap: 4 }} />
          </Box>
        </Box>

        {/* ---- Right: Style Manager ---- */}
        <Paper
          elevation={0}
          sx={{
            width: 240, flexShrink: 0,
            borderLeft: "1px solid #e0e0e0",
            bgcolor: "#fff", overflow: "auto", p: 1.5,
          }}
        >
          <Typography variant="subtitle2" fontWeight={700} mb={1} color="text.secondary">
            🎨 SELECTED ELEMENT STYLES
          </Typography>
          <div id="gjs-styles" />
        </Paper>
      </Box>

      {/* ---- Live Preview Modal ---- */}
      {showPreview && (
        <Box
          sx={{
            position: "fixed", inset: 0, zIndex: 1400,
            bgcolor: "rgba(0,0,0,0.75)", display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setShowPreview(false)}
        >
          <Box
            sx={{ width: "90%", maxWidth: 900, bgcolor: "#fff", borderRadius: 2, overflow: "hidden", boxShadow: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box sx={{ px: 2, py: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "#1e1e2e" }}>
              <Typography variant="subtitle1" fontWeight={700} color="#fff">
                🖥 Live Preview — App Bar
              </Typography>
              <Button size="small" variant="outlined" sx={{ color: "#fff", borderColor: "#fff" }} onClick={() => setShowPreview(false)}>
                Close
              </Button>
            </Box>

            {/* Preview iframe */}
            <Box sx={{ p: 0, bgcolor: "#f5f7fa" }}>
              <iframe
                title="navbar-preview"
                style={{ width: "100%", height: "200px", border: "none" }}
                srcDoc={`
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="UTF-8"/>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"/>
                    <style>
                      * { margin: 0; padding: 0; box-sizing: border-box; }
                      body { font-family: 'Inter', sans-serif; background: #f9fafb; }
                      
                      /* The simulated app bar */
                      .simulated-appbar {
                        position: relative;
                        background: rgba(249,250,251,0.9);
                        backdrop-filter: blur(6px);
                        border-bottom: 1px solid #e0e0e0;
                        display: flex;
                        flex-direction: column;
                      }
                      .simulated-appbar .locked-toolbar {
                        display: flex;
                        align-items: center;
                        height: 64px;
                        padding: 0 16px;
                        gap: 12px;
                      }
                      .simulated-appbar .logo {
                        font-size: 20px;
                        font-weight: 800;
                        color: #F57C00;
                        letter-spacing: -0.5px;
                      }
                      .spacer { flex: 1; }
                      .branch-pill {
                        background: white;
                        border: 1px solid #e0e0e0;
                        border-radius: 4px;
                        padding: 4px 12px;
                        font-size: 13px;
                        color: #333;
                      }
                      .toggle-pill {
                        background: white;
                        border: 1px solid #e0e0e0;
                        border-radius: 4px;
                        font-size: 12px;
                        font-weight: 700;
                        overflow: hidden;
                        display: flex;
                      }
                      .toggle-pill span {
                        padding: 4px 12px;
                        cursor: pointer;
                      }
                      .toggle-pill span.active {
                        background: #eee;
                        color: #000;
                      }
                      .version-text { font-size: 12px; font-weight: 700; color: #333; }
                      
                      /* Dynamic theme zone */
                      #dynamic-navbar-theme { width: 100%; --theme-bg: ${bgColor}; --theme-text: ${textColor}; }
                      
                      /* Injected CSS from GrapesJS (scoped) */
                      ${previewData.css}
                    </style>
                  </head>
                  <body>
                    <div class="simulated-appbar">
                      <!-- Festival banner zone (dynamic) -->
                      <div id="dynamic-navbar-theme">
                        ${previewData.html}
                      </div>
                      <!-- Locked toolbar (not editable) -->
                      <div class="locked-toolbar">
                        <span style="font-size:18px;">◀</span>
                        <span class="logo">SURAJ ✦</span>
                        <div class="spacer"></div>
                        <div class="branch-pill">AHEMDABAD (AMD) ▾</div>
                        <div class="toggle-pill">
                          <span class="active">SEA</span>
                          <span>AIR</span>
                        </div>
                        <span class="version-text">Version: 27.03.05</span>
                      </div>
                    </div>
                    <div style="padding:16px; color:#666; font-size:13px;">
                      ← The main app content goes here. The bar above is a live preview of your theme.
                    </div>
                  </body>
                  </html>
                `}
              />
              {/* Mobile preview */}
              <Box sx={{ display: "flex", justifyContent: "center", pt: 1, pb: 2 }}>
                <Box sx={{ border: "1px dashed #ccc", borderRadius: 1, p: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5, textAlign: "center" }}>
                    📱 Mobile Preview
                  </Typography>
                  <iframe
                    title="navbar-preview-mobile"
                    style={{ width: "375px", height: "140px", border: "none" }}
                    srcDoc={`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <meta charset="UTF-8" name="viewport" content="width=375"/>
                        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet"/>
                        <style>
                          * { margin: 0; padding: 0; box-sizing: border-box; }
                          body { font-family: 'Inter', sans-serif; font-size: 14px; }
                          .simulated-appbar { background: rgba(249,250,251,0.9); border-bottom: 1px solid #eee; }
                          .locked-toolbar { display: flex; align-items: center; height: 52px; padding: 0 12px; gap: 8px; }
                          .logo { font-size: 15px; font-weight: 800; color: #F57C00; }
                          .spacer { flex: 1; }
                          .branch-pill { background: white; border: 1px solid #e0e0e0; border-radius: 4px; padding: 2px 7px; font-size: 10px; }
                          .version-text { font-size: 10px; font-weight: 700; }
                          #dynamic-navbar-theme { width: 100%; --theme-bg: ${bgColor}; --theme-text: ${textColor}; font-size: 11px; }
                          ${previewData.css}
                        </style>
                      </head>
                      <body>
                        <div class="simulated-appbar">
                          <div id="dynamic-navbar-theme">${previewData.html}</div>
                          <div class="locked-toolbar">
                            <span class="logo">SURAJ ✦</span>
                            <div class="spacer"></div>
                            <div class="branch-pill">AMD</div>
                            <span class="version-text">v27.03.05</span>
                          </div>
                        </div>
                      </body>
                      </html>
                    `}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snack.severity} sx={{ width: "100%" }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default NavbarCustomizer;
