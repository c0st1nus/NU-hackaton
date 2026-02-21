"use client";

import { Bell, GitBranch, Menu, Search } from "lucide-react";
import Link from "next/link";
import { useI18n } from "../../dictionaries/i18n";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { lang, setLang, t } = useI18n();

  return (
    <header className="topbar">
      <button
        className="topbar-menu-btn"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <Link href="/dashboard" style={{ textDecoration: "none" }}>
        <div className="topbar-logo">
          <div className="topbar-logo-icon">
            <GitBranch size={14} />
          </div>
          <span>FIRE</span>
          <span className="topbar-demo">DEMO</span>
        </div>
      </Link>

      <div className="topbar-search">
        <Search
          size={15}
          style={{ color: "var(--text-muted)", flexShrink: 0 }}
        />
        <input type="search" placeholder="Search tickets..." />
      </div>

      <div className="topbar-right">
        {/* Language Switcher */}
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as any)}
          style={{
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 13,
            color: "var(--text-secondary)",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="ru">RU</option>
          <option value="en">EN</option>
          <option value="kz">KZ</option>
        </select>

        <button className="topbar-icon-btn" aria-label="Notifications">
          <Bell size={18} />
        </button>

        <div className="topbar-avatar">
          <div className="topbar-avatar-circle">SC</div>
          <div>
            <div className="topbar-user-name">Sarah Chen</div>
            <div className="topbar-user-role">Support Supervisor</div>
          </div>
        </div>
      </div>
    </header>
  );
}
