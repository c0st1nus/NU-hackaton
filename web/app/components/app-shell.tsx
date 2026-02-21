"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../../lib/auth-context";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading } = useAuth();
  const pathname = usePathname();

  const isPublicPage =
    pathname === "/" ||
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/register") ||
    pathname?.startsWith("/invite");

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">Loading...</div>
    );
  }

  if (isPublicPage) {
    return <main>{children}</main>;
  }

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-area">
        <Topbar onMenuClick={() => setSidebarOpen((v) => !v)} />
        <main>{children}</main>
      </div>
    </div>
  );
}
