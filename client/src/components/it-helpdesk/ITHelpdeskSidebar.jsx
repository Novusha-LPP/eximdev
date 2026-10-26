import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Ticket,
  Laptop,
  HardDrive,
  ShoppingCart,
  Users,
  Key,
  Globe,
  Clock,
  BarChart3,
  ShieldCheck,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Tooltip from "@mui/material/Tooltip";

export const IT_SIDEBAR_SECTIONS = [
  {
    title: "Operations",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        to: "/it-helpdesk",
        exact: true,
        icon: LayoutDashboard,
      },
      {
        id: "tickets",
        label: "Helpdesk & Tickets",
        to: "/it-helpdesk/tickets",
        icon: Ticket,
      },
      {
        id: "assets",
        label: "Asset Management",
        to: "/it-helpdesk/unified-assets",
        altMatch: ["/it-helpdesk/assets", "/it-helpdesk/unified-assets"],
        icon: Laptop,
      },
      {
        id: "inventory",
        label: "Inventory & Spares",
        to: "/it-helpdesk/inventory",
        icon: HardDrive,
      },
      {
        id: "procurement",
        label: "Procurement & Approvals",
        to: "/it-helpdesk/procurement",
        icon: ShoppingCart,
      },
    ],
  },
  {
    title: "Contracts & Compliance",
    items: [
      {
        id: "vendors",
        label: "Vendors & AMC",
        to: "/it-helpdesk/vendors",
        icon: Users,
      },
      {
        id: "licenses",
        label: "Software Licenses",
        to: "/it-helpdesk/licenses",
        icon: Key,
      },
      {
        id: "domains",
        label: "Domains & SSL",
        to: "/it-helpdesk/notifications?category=domain",
        altMatch: ["/it-helpdesk/domains"],
        icon: Globe,
      },
      {
        id: "warranty",
        label: "Warranty & Expiry",
        to: "/it-helpdesk/notifications?category=warranty",
        altMatch: ["/it-helpdesk/warranty"],
        icon: Clock,
      },
    ],
  },
  {
    title: "Governance",
    items: [
      {
        id: "reports",
        label: "Reports & Analytics",
        to: "/it-helpdesk/reports",
        icon: BarChart3,
      },
      {
        id: "audit",
        label: "Audit Logs",
        to: "/it-helpdesk/administration/audit",
        altMatch: ["/it-helpdesk/audit", "/it-helpdesk/administration/audit"],
        icon: ShieldCheck,
      },
      {
        id: "notifications",
        label: "Notifications",
        to: "/it-helpdesk/notifications",
        icon: Bell,
      },
      {
        id: "settings",
        label: "Master Data / Settings",
        to: "/it-helpdesk/administration/roles",
        altMatch: [
          "/it-helpdesk/administration/roles",
          "/it-helpdesk/roles",
          "/it-helpdesk/administration/users",
          "/it-helpdesk/users",
          "/it-helpdesk/settings",
        ],
        icon: Settings,
      },
    ],
  },
];

export default function ITHelpdeskSidebar({ collapsed, onToggle, isLimitedUser = false }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isItemActive = (item) => {
    const currentPath = location.pathname.replace(/\/+$/, "");
    const currentSearch = location.search.toLowerCase();

    // 1. Dashboard: MUST be strictly exact match to /it-helpdesk or /it-helpdesk/
    if (item.id === "dashboard") {
      return currentPath === "/it-helpdesk" || currentPath === "";
    }

    // 2. Query param checks for domains / warranty
    if (item.id === "domains") {
      return (
        currentPath === "/it-helpdesk/domains" ||
        (currentPath === "/it-helpdesk/notifications" && currentSearch.includes("domain"))
      );
    }
    if (item.id === "warranty") {
      return (
        currentPath === "/it-helpdesk/warranty" ||
        (currentPath === "/it-helpdesk/notifications" && currentSearch.includes("warranty"))
      );
    }

    // 3. Notifications: only active when NOT viewing domain or warranty tab
    if (item.id === "notifications") {
      return (
        currentPath === "/it-helpdesk/notifications" &&
        !currentSearch.includes("domain") &&
        !currentSearch.includes("warranty")
      );
    }

    // 4. Alt paths match
    if (
      item.altMatch &&
      item.altMatch.some((p) => currentPath === p || currentPath.startsWith(p + "/"))
    ) {
      return true;
    }

    // 5. Standard sub-route match
    const targetPath = item.to.split("?")[0].replace(/\/+$/, "");
    return currentPath === targetPath || currentPath.startsWith(targetPath + "/");
  };

  // If limited user, only show Helpdesk & Tickets
  const visibleSections = isLimitedUser
    ? [
        {
          title: "Operations",
          items: [
            {
              id: "tickets",
              label: "Helpdesk & Tickets",
              to: "/it-helpdesk/tickets",
              icon: Ticket,
            },
          ],
        },
      ]
    : IT_SIDEBAR_SECTIONS;

  return (
    <aside className={`it-sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Brand Header */}
      <div className="it-sidebar-brand">
        <div
          className="it-sidebar-brand-left"
          onClick={() => navigate("/it-helpdesk")}
          title="Suraj IT Service Management"
        >
          <div className="it-sidebar-logo">S</div>
          <div className="it-sidebar-brand-text">
            <b>SURAJ IT</b>
            <small>IT Service Management</small>
          </div>
        </div>

        <button
          type="button"
          className="it-sidebar-toggle-btn"
          onClick={onToggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      {/* Navigation Menu */}
      <div className="it-sidebar-nav">
        {visibleSections.map((section, sIdx) => (
          <React.Fragment key={sIdx}>
            <div className="it-nav-title">{section.title}</div>
            {section.items.map((item) => {
              const active = isItemActive(item);
              const IconComp = item.icon;

              const linkContent = (
                <NavLink
                  key={item.id}
                  to={item.to}
                  className={`it-nav-item ${active ? "active" : ""}`}
                >
                  <i>
                    <IconComp size={15} />
                  </i>
                  <span className="it-nav-label">{item.label}</span>
                  {active && <span className="it-active-pill" />}
                </NavLink>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.id} title={item.label} placement="right" arrow>
                    {linkContent}
                  </Tooltip>
                );
              }

              return linkContent;
            })}
          </React.Fragment>
        ))}

        {/* Footer System Status Widget */}
        {!collapsed && (
          <div className="it-sidebar-foot">
            <b>SYSTEM STATUS</b>
            <span className="it-status-online">
              <span className="it-status-dot" /> All Systems Operational
            </span>
            <div className="it-foot-bar">
              <i />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
