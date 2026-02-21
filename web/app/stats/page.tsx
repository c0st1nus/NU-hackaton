"use client";

import { AlertTriangle, BarChart3, TrendingUp, Users } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import type { Stats } from "@/types";
import { useI18n } from "../../dictionaries/i18n";

const COLORS = [
  "#2563EB",
  "#16A34A",
  "#D97706",
  "#DC2626",
  "#7C3AED",
  "#0891B2",
  "#EA580C",
  "#65A30D",
];
const SEG_COLORS: Record<string, string> = {
  VIP: "#D97706",
  Priority: "#EA580C",
  Mass: "#6B7280",
};

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const { t: tr } = useI18n();

  useEffect(() => {
    api.stats
      .get()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const t = stats?.totals;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{tr.stats.title}</h1>
        <p className="page-subtitle">{tr.stats.subtitle}</p>
      </div>

      {/* KPI */}
      <div className="kpi-grid">
        <KpiCard
          label={tr.stats.totalTickets}
          value={loading ? "..." : String(t?.total_tickets ?? 0)}
          icon={<BarChart3 size={18} />}
          iconBg="#DBEAFE"
          iconColor="#2563EB"
        />
        <KpiCard
          label={tr.stats.avgPriority}
          value={loading ? "..." : String(t?.avg_priority ?? 0)}
          icon={<TrendingUp size={18} />}
          iconBg="#DCFCE7"
          iconColor="#16A34A"
        />
        <KpiCard
          label={tr.stats.negative}
          value={loading ? "..." : String(t?.negative_count ?? 0)}
          icon={<AlertTriangle size={18} />}
          iconBg="#FEE2E2"
          iconColor="#DC2626"
        />
        <KpiCard
          label={tr.stats.vipPriorityTitle}
          value={loading ? "..." : String(t?.vip_count ?? 0)}
          icon={<Users size={18} />}
          iconBg="#FEF3C7"
          iconColor="#D97706"
        />
      </div>

      {/* Charts */}
      {loading ? (
        <div className="charts-grid">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: 320, borderRadius: 12 }}
            />
          ))}
        </div>
      ) : !stats ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 0",
            color: "var(--text-muted)",
          }}
        >
          {tr.dashboard.pressProcess}
        </div>
      ) : (
        <div className="charts-grid">
          {/* 1. By ticket type */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{tr.stats.ticketsByType}</h3>
            </div>
            <div className="card-body" style={{ padding: "12px 8px" }}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={stats.byType}
                  layout="vertical"
                  margin={{ left: 10, right: 20 }}
                >
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip
                    formatter={(v) => [v, tr.ticketDetail.ticketsSuffix]}
                  />
                  <Bar dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. By segment */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{tr.stats.segments}</h3>
            </div>
            <div className="card-body" style={{ padding: "12px 8px" }}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={stats.bySegment}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={90}
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {stats.bySegment.map((s, i) => (
                      <Cell
                        key={i}
                        fill={SEG_COLORS[s.name] ?? COLORS[i % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [v, tr.ticketDetail.ticketsSuffix]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. By office */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{tr.stats.ticketsByOffice}</h3>
            </div>
            <div className="card-body" style={{ padding: "12px 8px" }}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={stats.byOffice}
                  layout="vertical"
                  margin={{ left: 10, right: 20 }}
                >
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    width={100}
                  />
                  <Tooltip
                    formatter={(v) => [v, tr.ticketDetail.ticketsSuffix]}
                  />
                  <Bar dataKey="count" fill="#16A34A" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. Manager load top-15 */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{tr.stats.managerLoadTop}</h3>
            </div>
            <div className="card-body" style={{ padding: "12px 8px" }}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={stats.managerLoads.slice(0, 15)}
                  layout="vertical"
                  margin={{ left: 10, right: 20 }}
                >
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    width={100}
                  />
                  <Tooltip
                    formatter={(v) => [v, tr.ticketDetail.ticketsSuffix]}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div
                          style={{
                            background: "#fff",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            padding: "8px 12px",
                            fontSize: 13,
                          }}
                        >
                          <p style={{ fontWeight: 600, margin: "0 0 4px" }}>
                            {d.name}
                          </p>
                          <p style={{ margin: 0, color: "var(--text-muted)" }}>
                            {d.office} • {d.position}
                          </p>
                          <p
                            style={{
                              margin: "4px 0 0",
                              color: "var(--primary)",
                              fontWeight: 700,
                            }}
                          >
                            {d.load} {tr.ticketDetail.ticketsSuffix}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="load" fill="#7C3AED" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="kpi-card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <p className="kpi-label">{label}</p>
        <div
          className="kpi-icon-wrap"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
      </div>
      <p className="kpi-value">{value}</p>
    </div>
  );
}
