"use client";

import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Manager } from "@/types";
import { useI18n } from "../../dictionaries/i18n";

export default function ManagersPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    api.managers
      .list()
      .then(setManagers)
      .catch(() => setManagers([]))
      .finally(() => setLoading(false));
  }, []);

  const maxLoad = Math.max(...managers.map((m) => m.currentLoad ?? 0), 1);

  return (
    <div className="page">
      <div className="page-header">
        <h1
          className="page-title"
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          <Users size={20} />
          {t.sidebar.managers}
        </h1>
        <p className="page-subtitle">{t.managers.subtitle}</p>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t.dashboard.tableManager}</th>
                <th>Должность</th>
                <th>{t.dashboard.tableOffice}</th>
                <th>{t.managers.skills}</th>
                <th style={{ minWidth: 160 }}>{t.managers.load}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} style={{ cursor: "default" }}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j}>
                        <div
                          className="skeleton"
                          style={{ height: 16, width: "75%" }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : managers.length === 0 ? (
                <tr style={{ cursor: "default" }}>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      padding: "40px 0",
                      color: "var(--text-muted)",
                    }}
                  >
                    Нет данных
                  </td>
                </tr>
              ) : (
                managers.map((m) => {
                  const pct = Math.round(
                    ((m.currentLoad ?? 0) / maxLoad) * 100,
                  );
                  const cls = pct >= 80 ? "danger" : pct >= 60 ? "warn" : "";
                  return (
                    <tr key={m.id} style={{ cursor: "default" }}>
                      <td style={{ fontWeight: 600, fontSize: 14 }}>
                        {m.name}
                      </td>
                      <td
                        style={{ fontSize: 13, color: "var(--text-secondary)" }}
                      >
                        {m.position ?? "—"}
                      </td>
                      <td style={{ fontSize: 13 }}>{m.office ?? "—"}</td>
                      <td>
                        <div
                          style={{ display: "flex", flexWrap: "wrap", gap: 4 }}
                        >
                          {(m.skills ?? []).map((s) => (
                            <span key={s} className="skill-tag">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div className="workload-bar-bg" style={{ flex: 1 }}>
                            <div
                              className={`workload-bar-fill ${cls}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color:
                                cls === "danger"
                                  ? "var(--danger)"
                                  : "var(--text-secondary)",
                              minWidth: 28,
                              textAlign: "right",
                            }}
                          >
                            {m.currentLoad ?? 0}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
