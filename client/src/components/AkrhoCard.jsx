import React from "react";
import "../styles/akrho-card.scss";

/**
 * AkrhoCard - A themed card component with Akrho fraternity colors (Red and Black)
 * 
 * @param {Object} props
 * @param {string} props.title - Card title
 * @param {string} props.icon - Icon element to display
 * @param {number|string} props.value - Main value to display
 * @param {string} props.subtitle - Optional subtitle
 * @param {string} props.trend - Optional trend indicator (up/down)
 * @param {number} props.trendValue - Optional trend percentage
 * @param {Function} props.onClick - Optional click handler
 * @param {string} props.variant - Card variant (default, success, warning, danger)
 * @param {boolean} props.loading - Show loading state
 */
const AkrhoCard = ({
  title,
  icon,
  value,
  subtitle,
  trend,
  trendValue,
  onClick,
  variant = "default",
  loading = false,
}) => {
  return (
    <div 
      className={`akrho-card akrho-card-${variant} ${onClick ? "clickable" : ""}`}
      onClick={onClick}
    >
      {loading ? (
        <div className="akrho-card-loading">
          <div className="akrho-spinner"></div>
        </div>
      ) : (
        <>
          <div className="akrho-card-header">
            <div className="akrho-card-icon">{icon}</div>
            {trend && (
              <div className={`akrho-card-trend ${trend}`}>
                {trend === "up" ? "↑" : "↓"} {trendValue}%
              </div>
            )}
          </div>

          <div className="akrho-card-body">
            <div className="akrho-card-value">{value}</div>
            <div className="akrho-card-title">{title}</div>
            {subtitle && <div className="akrho-card-subtitle">{subtitle}</div>}
          </div>

          <div className="akrho-card-footer">
            <div className="akrho-card-accent"></div>
          </div>
        </>
      )}
    </div>
  );
};

export default AkrhoCard;
