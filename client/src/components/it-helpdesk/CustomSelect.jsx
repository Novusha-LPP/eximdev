import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  style = {},
  className = "",
  width = "100%",
  minWidth = "180px",
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({
    top: undefined,
    bottom: undefined,
    left: 0,
    width: 180,
    placement: "bottom",
  });

  // Normalize options to array of { label, value }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === "object" && opt !== null) {
      return { label: opt.label ?? opt.value, value: opt.value };
    }
    return { label: String(opt), value: opt };
  });

  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(value)
  );

  // Recalculate floating menu coordinates based on trigger viewport position
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const neededHeight = Math.min(260, normalizedOptions.length * 36 + 16);

    // Flip upwards if not enough space below and more space above
    const placeTop = spaceBelow < neededHeight && spaceAbove > spaceBelow;

    // Prevent horizontal overflow off viewport edges
    const calculatedWidth = Math.max(rect.width, parseInt(minWidth, 10) || 180);
    let left = rect.left;
    if (left + calculatedWidth > window.innerWidth - 12) {
      left = window.innerWidth - calculatedWidth - 12;
    }
    if (left < 12) left = 12;

    setMenuPosition({
      top: placeTop ? undefined : rect.bottom + 5,
      bottom: placeTop ? window.innerHeight - rect.top + 5 : undefined,
      left,
      width: rect.width,
      placement: placeTop ? "top" : "bottom",
    });
  }, [normalizedOptions.length, minWidth]);

  // Recalculate position on open, window scroll, and resize
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event) {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target) &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val) => {
    if (disabled) return;
    onChange(val);
    setIsOpen(false);
  };

  return (
    <>
      <div
        ref={triggerRef}
        style={{
          position: "relative",
          width: width,
          minWidth: minWidth,
          userSelect: "none",
          ...style,
        }}
        className={`custom-select-container ${className}`}
      >
        {/* Trigger Button */}
        <div
          onClick={() => {
            if (disabled) return;
            setIsOpen((prev) => !prev);
          }}
          style={{
            height: "38px",
            padding: "0 12px",
            background: disabled ? "#f8fafc" : "#ffffff",
            border: isOpen ? "1.5px solid #4f46e5" : "1px solid #cbd5e1",
            boxShadow: isOpen
              ? "0 0 0 3px rgba(79, 70, 229, 0.12)"
              : "0 1px 2px rgba(0, 0, 0, 0.04)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            cursor: disabled ? "not-allowed" : "pointer",
            transition: "all 0.15s ease",
            color: selectedOption && selectedOption.value !== "" ? "#0f172a" : "#475569",
            fontSize: "13.5px",
            fontWeight: selectedOption && selectedOption.value !== "" ? 600 : 500,
            boxSizing: "border-box",
          }}
        >
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown
            size={15}
            style={{
              color: isOpen ? "#4f46e5" : "#64748b",
              transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              flexShrink: 0,
            }}
          />
        </div>
      </div>

      {/* Portal Popover Dropdown (Decoupled from parent overflow/clipping) */}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: menuPosition.placement === "top" ? undefined : `${menuPosition.top}px`,
              bottom:
                menuPosition.placement === "top"
                  ? `${menuPosition.bottom}px`
                  : undefined,
              left: `${menuPosition.left}px`,
              width: `${menuPosition.width}px`,
              minWidth: minWidth || "180px",
              maxHeight: "260px",
              overflowY: "auto",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              boxShadow:
                "0 12px 32px -4px rgba(15, 23, 42, 0.2), 0 6px 12px -4px rgba(15, 23, 42, 0.1)",
              zIndex: 999999,
              padding: "5px",
              boxSizing: "border-box",
              scrollbarWidth: "thin",
              transformOrigin:
                menuPosition.placement === "top" ? "bottom center" : "top center",
              animation: "fadeInDropdown 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            {normalizedOptions.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div
                  key={String(opt.value)}
                  onClick={() => handleSelect(opt.value)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? "#2563eb" : "#334155",
                    background: isSelected ? "#eff6ff" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                    marginBottom: "2px",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "#f8fafc";
                      e.currentTarget.style.color = "#0f172a";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#334155";
                    }
                  }}
                >
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {opt.label}
                  </span>
                  {isSelected && (
                    <Check
                      size={14}
                      color="#2563eb"
                      style={{ flexShrink: 0, marginLeft: "8px" }}
                    />
                  )}
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
