"use client";

import {
  BarChart3,
  DownloadCloud,
  GitBranch,
  Inbox,
  LayoutDashboard,
  Sparkles,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type Dictionary, useI18n } from "../../dictionaries/i18n";
import { useAuth } from "../../lib/auth-context";

const getNavKeys = (t: Dictionary) => [
  { href: "/dashboard", icon: LayoutDashboard, label: t.sidebar.dashboard },
  {
    href: "/tickets",
    icon: Inbox,
    label: t.sidebar.incomingQueue,
    badge: null,
  },
  { href: "/managers", icon: Users, label: t.sidebar.managers },
  { href: "/stats", icon: BarChart3, label: t.sidebar.analytics },
  { href: "/star-task", icon: Sparkles, label: t.sidebar.starTask },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const path = usePathname();
  const { t } = useI18n();
  const { user } = useAuth();
  const NAV = getNavKeys(t);

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <GitBranch size={16} />
        </div>
        <div>
          <div className="sidebar-logo-text">FIRE</div>
          <div className="sidebar-logo-sub">Routing Engine v1.0</div>
        </div>
        {/* Mobile close */}
        <button
          onClick={onClose}
          style={{
            marginLeft: "auto",
            background: "none",
            border: "none",
            color: "#9CA3AF",
            cursor: "pointer",
            padding: 4,
            display: "flex",
            alignItems: "center",
          }}
          className="lg-hidden"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {NAV.map(({ href, icon: Icon, label, badge }) => (
          <Link
            key={href}
            href={href}
            className={`nav-item ${path.startsWith(href) ? "active" : ""}`}
            onClick={onClose}
          >
            <Icon size={17} />
            <span>{label as string}</span>
            {badge && <span className="nav-badge">{badge as string}</span>}
          </Link>
        ))}

        {user?.role === "ADMIN" && (
          <>
            <div className="mt-8 mb-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Administration
            </div>
            <Link
              href="/dashboard/import"
              className={`nav-item ${path.startsWith("/dashboard/import") ? "active" : ""}`}
              onClick={onClose}
            >
              <DownloadCloud size={17} />
              <span>{t.sidebar.importData as string}</span>
            </Link>
            <Link
              href="/dashboard/team"
              className={`nav-item ${path.startsWith("/dashboard/team") ? "active" : ""}`}
              onClick={onClose}
            >
              <UserPlus size={17} />
              <span>{t.sidebar.manageTeam as string}</span>
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
}
