import { useState } from "react";
import { NavLink } from "react-router-dom";
import "./Sidebar.css";
import { RoadAthena } from "../../assets/svgs";

// ── Icons (inline SVGs so no extra deps needed) ──────────────────────────
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);

const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 13h-2v-4H8l4-4 4 4h-3v4zm1-10V3.5L18.5 9H14z" />
  </svg>
);

const ChevronLeft = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
  </svg>
);

const ChevronRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
  </svg>
);

// ── Nav items config ──────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: "Dashboard", path: "/", Icon: HomeIcon, exact: true },
  { label: "Upload GeoJSON", path: "/upload", Icon: UploadIcon, exact: false },
];

// ── Sidebar component ─────────────────────────────────────────────────────
const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem("sidebar_collapsed", String(next)); } catch {}
      return next;
    });
  };

  return (
    <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
      {/* ── Branding ── */}
      <div className="sidebar__brand">
        <RoadAthena width={24} height={30} />
        {!collapsed && (
          <span className="sidebar__brand-name">RoadAthena</span>
        )}
      </div>

      {/* ── Nav items ── */}
      <nav className="sidebar__nav">
        {NAV_ITEMS.map(({ label, path, Icon, exact }) => (
          <NavLink
            key={path}
            to={path}
            end={exact}
            className={({ isActive }) =>
              `sidebar__item ${isActive ? "sidebar__item--active" : ""}`
            }
            title={collapsed ? label : undefined}
          >
            <span className="sidebar__icon">
              <Icon />
            </span>
            {!collapsed && <span className="sidebar__label">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* ── Toggle button ── */}
      <button
        className="sidebar__toggle"
        onClick={toggle}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight /> : <ChevronLeft />}
      </button>
    </aside>
  );
};

export default Sidebar;
