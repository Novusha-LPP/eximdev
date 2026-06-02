import React, { useState, useEffect, useMemo } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LaunchIcon from "@mui/icons-material/Launch";

export default function NavbarPromoBanner({ onHeightChange, bannerConfig }) {
  const [dismissed, setDismissed] = useState(false);

  const banner = bannerConfig;

  // Evaluate scheduling and dismissal state in real-time
  const isShown = useMemo(() => {
    if (!banner || !banner.enabled) return false;
    
    const bannerId = banner._id || "layout-config";
    const isDismissed = sessionStorage.getItem(`dismissed_banner_${bannerId}`);
    if (isDismissed) return false;

    // Client-side scheduling check
    const now = new Date();
    const startVal = banner.startDate ? new Date(banner.startDate) : null;
    const endVal = banner.endDate ? new Date(banner.endDate) : null;

    if (startVal && startVal > now) return false;
    if (endVal && endVal < now) return false;

    return true;
  }, [banner, dismissed]);

  useEffect(() => {
    if (isShown && banner) {
      if (onHeightChange) {
        const targetHeight = banner.displayMode === "appbar-overlay" ? 0 : (banner.height || 36);
        onHeightChange(targetHeight);
      }
    } else {
      if (onHeightChange) onHeightChange(0);
    }
    return () => {
      if (onHeightChange) onHeightChange(0);
    };
  }, [isShown, banner?.displayMode, banner?.height, onHeightChange]);

  const handleClose = (e) => {
    e.stopPropagation(); // Avoid triggering the banner link click
    if (banner) {
      const bannerId = banner._id || "layout-config";
      sessionStorage.setItem(`dismissed_banner_${bannerId}`, "true");
      setDismissed(true);
      if (onHeightChange) {
        onHeightChange(0);
      }
    }
  };

  const handleBannerClick = () => {
    if (banner && banner.link) {
      if (banner.link.startsWith("http://") || banner.link.startsWith("https://")) {
        window.open(banner.link, "_blank", "noopener,noreferrer");
      } else {
        // Assume internal routing
        window.location.href = banner.link;
      }
    }
  };

  if (!isShown || !banner) return null;

  const {
    text,
    link,
    textColor = "#ffffff",
    backgroundColor = "linear-gradient(90deg, #1a237e 0%, #311b92 100%)",
    animationType = "none",
    height = 36,
    closable = true,
    customCss,
    displayMode = "top-bar",
    opacity = 1.0,
  } = banner;

  const isClickable = !!link;

  // Custom animations using MUI keyframes
  const marqueeAnimation = {
    "@keyframes marquee": {
      "0%": { transform: "translateX(100%)" },
      "100%": { transform: "translateX(-100%)" },
    },
  };

  const pulseAnimation = {
    "@keyframes pulse": {
      "0%": { opacity: 0.9, transform: "scale(0.995)" },
      "50%": { opacity: 1, transform: "scale(1.005)" },
      "100%": { opacity: 0.9, transform: "scale(0.995)" },
    },
  };

  const slideInAnimation = {
    "@keyframes slideDown": {
      "0%": { transform: "translateY(-100%)", opacity: 0 },
      "100%": { transform: "translateY(0)", opacity: 1 },
    },
  };

  let animationStyles = {};
  if (animationType === "marquee") {
    animationStyles = {
      display: "inline-block",
      whiteSpace: "nowrap",
      animation: "marquee 20s linear infinite",
      pl: "10%",
      pr: "10%",
    };
  } else if (animationType === "pulse") {
    animationStyles = {
      animation: "pulse 2.5s ease-in-out infinite",
    };
  }

  return (
    <Box
      id="app-promo-banner"
      sx={{
        width: "100%",
        height: `${height}px`,
        background: displayMode === "top-bar" ? backgroundColor : "transparent",
        color: textColor,
        display: "flex",
        alignItems: "center",
        justifyContent: animationType === "marquee" ? "flex-start" : "center",
        position: displayMode === "top-bar" ? "relative" : "static",
        overflow: "hidden",
        cursor: isClickable ? "pointer" : "default",
        zIndex: 1200,
        boxShadow: displayMode === "top-bar" ? "0 2px 4px rgba(0,0,0,0.1)" : "none",
        userSelect: "none",
        transition: "all 0.3s ease",
        animation: "slideDown 0.4s ease-out forwards",
        "&:hover": isClickable
          ? {
              filter: "brightness(1.08)",
              "& .banner-link-icon": {
                transform: "translateX(3px) translateY(-1px)",
              },
            }
          : {},
        ...slideInAnimation,
        ...pulseAnimation,
        ...marqueeAnimation,
      }}
      onClick={handleBannerClick}
    >
      {customCss && (
        <style dangerouslySetInnerHTML={{ __html: customCss }} />
      )}
      {displayMode === "appbar-overlay" && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: backgroundColor,
            opacity: opacity,
            zIndex: -1,
            pointerEvents: "none",
            transition: "all 0.3s ease",
          }}
        />
      )}
      {/* Dynamic Content */}
      <Box
        sx={{
          width: animationType === "marquee" ? "auto" : "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: closable ? 6 : 2,
          ...animationStyles,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            letterSpacing: "0.5px",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: 1,
            textAlign: "center",
            textShadow: "0 1px 2px rgba(0,0,0,0.2)",
          }}
        >
          {text}
          {isClickable && (
            <LaunchIcon
              className="banner-link-icon"
              sx={{
                fontSize: "0.95rem",
                transition: "transform 0.2s ease",
                ml: 0.5,
              }}
            />
          )}
        </Typography>
      </Box>

      {/* Dismiss button */}
      {closable && (
        <IconButton
          size="small"
          onClick={handleClose}
          sx={{
            position: "absolute",
            right: 12,
            color: "inherit",
            opacity: 0.85,
            transition: "all 0.2s ease",
            "&:hover": {
              opacity: 1,
              backgroundColor: "rgba(255,255,255,0.15)",
            },
          }}
          aria-label="close promo banner"
        >
          <CloseIcon sx={{ fontSize: "1.1rem" }} />
        </IconButton>
      )}
    </Box>
  );
}
