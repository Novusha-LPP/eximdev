import React, { useState, useEffect } from "react";
import ITHelpdeskSidebar from "./ITHelpdeskSidebar";
import "./ITHelpdeskLayout.css";

export default function ITHelpdeskLayout({ children, isLimitedUser = false }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem("it_sidebar_collapsed");
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("it_sidebar_collapsed", JSON.stringify(collapsed));
    } catch (e) {
      console.warn("Could not save it_sidebar_collapsed state", e);
    }
  }, [collapsed]);

  const handleToggle = () => {
    setCollapsed((prev) => !prev);
  };

  return (
    <div className="it-helpdesk-layout">
      <ITHelpdeskSidebar
        collapsed={collapsed}
        onToggle={handleToggle}
        isLimitedUser={isLimitedUser}
      />
      <div className="it-main-content">{children}</div>
    </div>
  );
}
