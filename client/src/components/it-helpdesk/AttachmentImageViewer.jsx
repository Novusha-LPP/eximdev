import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  Box,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
  Fade,
} from "@mui/material";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  ExternalLink,
  Image as ImageIcon,
  FileText,
  Paperclip,
} from "lucide-react";

// Helper to check if file is an image
export const isImageAttachment = (file) => {
  if (!file) return false;
  if (file.mime_type && file.mime_type.startsWith("image/")) return true;
  const name = file.file_name || file.name || file.file_url || "";
  const ext = name.split(".").pop().toLowerCase().split("?")[0];
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext);
};

// Format file size helper
const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 KB";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export default function AttachmentImageViewer({
  open,
  onClose,
  attachments = [],
  initialIndex = 0,
  ticketId = "",
}) {
  // Normalize attachments to ensure we have a valid list
  const fileList = Array.isArray(attachments) ? attachments : [];

  // Filter or prioritize viewable files
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Sync index when modal opens or initialIndex changes
  useEffect(() => {
    if (open) {
      const validIndex = Math.min(Math.max(0, initialIndex), Math.max(0, fileList.length - 1));
      setCurrentIndex(validIndex);
      setZoomLevel(1);
      setLoading(true);
      setLoadError(false);
    }
  }, [open, initialIndex, fileList.length]);

  // Reset states when moving to next/prev image
  const handleSelectImage = useCallback((index) => {
    setCurrentIndex(index);
    setZoomLevel(1);
    setLoading(true);
    setLoadError(false);
  }, []);

  const handlePrev = useCallback(() => {
    if (fileList.length <= 1) return;
    const nextIdx = currentIndex > 0 ? currentIndex - 1 : fileList.length - 1;
    handleSelectImage(nextIdx);
  }, [currentIndex, fileList.length, handleSelectImage]);

  const handleNext = useCallback(() => {
    if (fileList.length <= 1) return;
    const nextIdx = currentIndex < fileList.length - 1 ? currentIndex + 1 : 0;
    handleSelectImage(nextIdx);
  }, [currentIndex, fileList.length, handleSelectImage]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handlePrev, handleNext, onClose]);

  if (!open || fileList.length === 0) return null;

  const currentFile = fileList[currentIndex] || {};
  const isImage = isImageAttachment(currentFile);
  const fileName = currentFile.file_name || currentFile.name || `Attachment-${currentIndex + 1}`;
  const fileUrl = currentFile.file_url || currentFile.url || "";
  const totalCount = fileList.length;

  const toggleZoom = () => {
    setZoomLevel((prev) => (prev === 1 ? 1.75 : 1));
  };

  const handleDownload = () => {
    if (!fileUrl) return;
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = fileName;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      TransitionComponent={Fade}
      transitionDuration={200}
      PaperProps={{
        sx: {
          m: 0,
          p: 0,
          width: "100vw",
          height: "100vh",
          maxWidth: "100vw",
          maxHeight: "100vh",
          borderRadius: 0,
          bgcolor: "rgba(10, 15, 29, 0.95)",
          backdropFilter: "blur(12px)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "none",
        },
      }}
      sx={{
        zIndex: 1500, // Render cleanly above any open Drawer or table
      }}
    >
      {/* ── Top Header Toolbar ────────────────────────────────────────── */}
      <Box
        sx={{
          height: 60,
          px: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: "rgba(15, 23, 42, 0.8)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          color: "#ffffff",
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        {/* Left: Ticket & Filename Info */}
        <Box display="flex" alignItems="center" gap={1.5} minWidth={0}>
          {ticketId && (
            <span
              style={{
                fontSize: "11.5px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "6px",
                backgroundColor: "rgba(59, 130, 246, 0.2)",
                color: "#60a5fa",
                border: "1px solid rgba(59, 130, 246, 0.35)",
                fontFamily: "monospace",
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
              }}
            >
              {ticketId}
            </span>
          )}

          <Box display="flex" alignItems="center" gap={1} minWidth={0}>
            {isImage ? (
              <ImageIcon size={16} color="#60a5fa" style={{ flexShrink: 0 }} />
            ) : (
              <FileText size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
            )}
            <Typography
              sx={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#f8fafc",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: { xs: 140, sm: 300, md: 500 },
              }}
              title={fileName}
            >
              {fileName}
            </Typography>
          </Box>

          {currentFile.file_size && (
            <Typography
              sx={{
                fontSize: "12px",
                color: "#94a3b8",
                display: { xs: "none", sm: "inline" },
              }}
            >
              ({formatSize(currentFile.file_size)})
            </Typography>
          )}
        </Box>

        {/* Center: Counter Indicator */}
        {totalCount > 1 && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              px: 1.75,
              py: 0.5,
              borderRadius: "20px",
              bgcolor: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              fontSize: "12.5px",
              fontWeight: 700,
              color: "#e2e8f0",
              letterSpacing: "0.3px",
            }}
          >
            <span>{currentIndex + 1}</span>
            <span style={{ color: "#64748b" }}>/</span>
            <span style={{ color: "#94a3b8" }}>{totalCount}</span>
          </Box>
        )}

        {/* Right: Actions (Zoom, Download, Open, Close) */}
        <Box display="flex" alignItems="center" gap={1}>
          {isImage && (
            <Tooltip title={zoomLevel === 1 ? "Zoom In" : "Reset Zoom"}>
              <IconButton
                onClick={toggleZoom}
                size="small"
                sx={{
                  color: "#cbd5e1",
                  bgcolor: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.15)", color: "#ffffff" },
                }}
              >
                {zoomLevel === 1 ? <ZoomIn size={16} /> : <ZoomOut size={16} />}
              </IconButton>
            </Tooltip>
          )}

          {fileUrl && (
            <Tooltip title="Download File">
              <IconButton
                onClick={handleDownload}
                size="small"
                sx={{
                  color: "#cbd5e1",
                  bgcolor: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.15)", color: "#ffffff" },
                }}
              >
                <Download size={16} />
              </IconButton>
            </Tooltip>
          )}

          {fileUrl && (
            <Tooltip title="Open in New Tab">
              <IconButton
                component="a"
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                sx={{
                  color: "#cbd5e1",
                  bgcolor: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.15)", color: "#ffffff" },
                }}
              >
                <ExternalLink size={16} />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Close Viewer (Esc)">
            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                color: "#f87171",
                bgcolor: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.25)",
                ml: 0.5,
                "&:hover": { bgcolor: "rgba(239, 68, 68, 0.25)", color: "#fca5a5" },
              }}
            >
              <X size={18} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ── Main Display Viewport ────────────────────────────────────── */}
      <Box
        sx={{
          flex: 1,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          p: { xs: 1.5, sm: 3 },
          userSelect: "none",
        }}
      >
        {/* Left Navigation Arrow */}
        {totalCount > 1 && (
          <Box
            sx={{
              position: "absolute",
              left: { xs: 10, sm: 24 },
              zIndex: 20,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            <Tooltip title="Previous Image (← Left Arrow)" placement="right">
              <button
                type="button"
                onClick={handlePrev}
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(15, 23, 42, 0.75)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
                  outline: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(37, 99, 235, 0.85)";
                  e.currentTarget.style.transform = "scale(1.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(15, 23, 42, 0.75)";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <ChevronLeft size={28} />
              </button>
            </Tooltip>
          </Box>
        )}

        {/* Right Navigation Arrow */}
        {totalCount > 1 && (
          <Box
            sx={{
              position: "absolute",
              right: { xs: 10, sm: 24 },
              zIndex: 20,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          >
            <Tooltip title="Next Image (→ Right Arrow)" placement="left">
              <button
                type="button"
                onClick={handleNext}
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(15, 23, 42, 0.75)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
                  outline: "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(37, 99, 235, 0.85)";
                  e.currentTarget.style.transform = "scale(1.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(15, 23, 42, 0.75)";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <ChevronRight size={28} />
              </button>
            </Tooltip>
          </Box>
        )}

        {/* Image Content Container */}
        <Box
          sx={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {/* Loading Spinner */}
          {loading && isImage && (
            <Box
              sx={{
                position: "absolute",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1.5,
                color: "#60a5fa",
              }}
            >
              <CircularProgress size={42} color="inherit" />
              <Typography sx={{ fontSize: "13px", color: "#94a3b8" }}>
                Loading image...
              </Typography>
            </Box>
          )}

          {/* Render Active Image */}
          {isImage && !loadError ? (
            <Box
              sx={{
                maxHeight: "100%",
                maxWidth: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: zoomLevel > 1 ? "auto" : "hidden",
                cursor: zoomLevel === 1 ? "zoom-in" : "zoom-out",
                transition: "all 0.25s ease-out",
              }}
              onClick={toggleZoom}
            >
              <img
                key={fileUrl}
                src={fileUrl}
                alt={fileName}
                onLoad={() => setLoading(false)}
                onError={() => {
                  setLoading(false);
                  setLoadError(true);
                }}
                style={{
                  maxHeight: zoomLevel === 1 ? "78vh" : "none",
                  maxWidth: zoomLevel === 1 ? "86vw" : "none",
                  transform: zoomLevel > 1 ? `scale(${zoomLevel})` : "none",
                  transformOrigin: "center center",
                  transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  borderRadius: "8px",
                  boxShadow: "0 10px 40px rgba(0, 0, 0, 0.6)",
                  objectFit: "contain",
                  display: loading ? "none" : "block",
                }}
              />
            </Box>
          ) : !isImage ? (
            /* Non-Image Document Fallback View */
            <Box
              sx={{
                p: 4,
                borderRadius: "14px",
                bgcolor: "rgba(30, 41, 59, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                textAlign: "center",
                maxWidth: 420,
                color: "#ffffff",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  bgcolor: "rgba(59, 130, 246, 0.15)",
                  color: "#60a5fa",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mx: "auto",
                  mb: 2,
                }}
              >
                <FileText size={32} />
              </Box>
              <Typography sx={{ fontSize: "16px", fontWeight: 700, mb: 1, color: "#f8fafc" }}>
                {fileName}
              </Typography>
              <Typography sx={{ fontSize: "13px", color: "#94a3b8", mb: 3 }}>
                This file format is not an image. You can download or open it directly in a new tab.
              </Typography>

              <Box display="flex" justifyContent="center" gap={1.5}>
                {fileUrl && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 18px",
                      borderRadius: "8px",
                      background: "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <Download size={15} />
                    <span>Download</span>
                  </button>
                )}
                {fileUrl && (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 18px",
                      borderRadius: "8px",
                      background: "rgba(255, 255, 255, 0.08)",
                      color: "#e2e8f0",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      fontSize: "13px",
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    <ExternalLink size={15} />
                    <span>Open File</span>
                  </a>
                )}
              </Box>
            </Box>
          ) : (
            /* Image Load Error Fallback */
            <Box
              sx={{
                p: 4,
                borderRadius: "14px",
                bgcolor: "rgba(30, 41, 59, 0.8)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                textAlign: "center",
                maxWidth: 420,
                color: "#ffffff",
              }}
            >
              <Typography sx={{ fontSize: "15px", fontWeight: 700, color: "#f87171", mb: 1 }}>
                Unable to display image preview
              </Typography>
              <Typography sx={{ fontSize: "13px", color: "#94a3b8", mb: 2.5 }}>
                The image could not be loaded or the URL has expired.
              </Typography>
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    borderRadius: "7px",
                    background: "#2563eb",
                    color: "#ffffff",
                    textDecoration: "none",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  <ExternalLink size={14} />
                  <span>Try Opening in Browser</span>
                </a>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* ── Bottom Thumbnail Strip (Only when multiple files exist) ──── */}
      {totalCount > 1 && (
        <Box
          sx={{
            py: 1.5,
            px: 3,
            bgcolor: "rgba(15, 23, 42, 0.85)",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1.25,
            overflowX: "auto",
            flexShrink: 0,
            zIndex: 10,
            "&::-webkit-scrollbar": { height: "5px" },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              borderRadius: "4px",
            },
          }}
        >
          {fileList.map((item, idx) => {
            const isActive = idx === currentIndex;
            const itemIsImg = isImageAttachment(item);
            const itemUrl = item.file_url || item.url || "";
            const itemTitle = item.file_name || item.name || `Image ${idx + 1}`;

            return (
              <Box
                key={idx}
                onClick={() => handleSelectImage(idx)}
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: "8px",
                  overflow: "hidden",
                  cursor: "pointer",
                  position: "relative",
                  border: isActive ? "2.5px solid #3b82f6" : "1.5px solid rgba(255, 255, 255, 0.15)",
                  boxShadow: isActive ? "0 0 12px rgba(59, 130, 246, 0.6)" : "none",
                  transform: isActive ? "scale(1.08)" : "scale(1)",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                  bgcolor: "rgba(30, 41, 59, 0.9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  "&:hover": {
                    borderColor: isActive ? "#3b82f6" : "rgba(255, 255, 255, 0.4)",
                    transform: "scale(1.06)",
                  },
                }}
                title={itemTitle}
              >
                {itemIsImg && itemUrl ? (
                  <img
                    src={itemUrl}
                    alt={itemTitle}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <Paperclip size={20} color="#94a3b8" />
                )}

                {/* Number Badge */}
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 2,
                    right: 2,
                    bgcolor: "rgba(0, 0, 0, 0.75)",
                    color: "#ffffff",
                    fontSize: "9px",
                    fontWeight: 700,
                    px: 0.5,
                    borderRadius: "3px",
                    lineHeight: 1.2,
                  }}
                >
                  {idx + 1}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
    </Dialog>
  );
}
