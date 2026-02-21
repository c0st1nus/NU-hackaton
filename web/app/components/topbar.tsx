"use client";

import { useEffect, useState } from "react";
import { Bell, GitBranch, Menu, Search, Sun, Moon } from "lucide-react";
import Link from "next/link";
import { useI18n } from "../../dictionaries/i18n";
import { useAuth } from "../../lib/auth-context";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { lang, setLang, t } = useI18n();
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored) {
      setTheme(stored);
      document.documentElement.setAttribute("data-theme", stored);
    } else {
      const isLight = window.matchMedia("(prefers-color-scheme: light)").matches;
      setTheme(isLight ? "light" : "dark");
      document.documentElement.setAttribute("data-theme", isLight ? "light" : "dark");
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  return (
    <header className="topbar">
      <button
        type="button"
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

        <button type="button" className="topbar-icon-btn" onClick={toggleTheme} aria-label="Toggle Theme">
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button type="button" className="topbar-icon-btn" aria-label="Notifications">
          <Bell size={18} />
        </button>

        {user ? (
          <>
            <div
              className="topbar-avatar"
              style={{
                borderLeft: "1px solid var(--border)",
                paddingLeft: "12px",
              }}
            >
              <div
                className="topbar-avatar-circle"
                style={{
                  backgroundColor: user.role === "ADMIN" ? "#4f46e5" : "#333",
                }}
              >
                {user.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="topbar-user-name">{user.name}</div>
                <div className="topbar-user-role capitalize">{user.role}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="ml-2 text-xs text-red-500 hover:text-red-600 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-colors"
              title={t.auth.logOut as string}
            >
              {t.auth.logOut as string}
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="text-sm font-medium text-blue-500 hover:text-blue-400"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
