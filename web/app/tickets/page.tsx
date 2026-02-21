"use client";

import { Inbox, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { TicketRow } from "@/types";
import { useI18n } from "../../dictionaries/i18n";
import {
  LangBadge,
  PriorityBadge,
  SegmentBadge,
  SentimentBadge,
} from "../components/badges";

const SEGMENTS = ["Все", "Mass", "VIP", "Priority"];
const SENTIMENTS = ["Все", "Позитивный", "Нейтральный", "Негативный"];
const LANGUAGES = ["Все", "RU", "KZ", "ENG"];

export default function TicketsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    segment: "",
    sentiment: "",
    language: "",
  });
  const [page, setPage] = useState(0);
  const limit = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        limit: String(limit),
        offset: String(page * limit),
      };
      if (filters.segment) params.segment = filters.segment;
      if (filters.sentiment) params.sentiment = filters.sentiment;
      if (filters.language) params.language = filters.language;
      setTickets(await api.tickets.list(params));
    } catch {
      setTickets([]);
    }
    setLoading(false);
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="page">
      <div
        className="page-header"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <h1
            className="page-title"
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <Inbox size={20} />
            {t.tickets.title}
          </h1>
          <p className="page-subtitle">{t.tickets.subtitle}</p>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={load}
          disabled={loading}
        >
          <RefreshCw
            size={13}
            style={loading ? { animation: "spin 1s linear infinite" } : {}}
          />
          Обновить
        </button>
      </div>

      <div className="card">
        <div className="filter-bar">
          {(
            [
              { label: t.dashboard.segment, key: "segment", opts: SEGMENTS },
              {
                label: t.dashboard.sentiment,
                key: "sentiment",
                opts: SENTIMENTS,
              },
              { label: t.dashboard.language, key: "language", opts: LANGUAGES },
            ] as const
          ).map(({ label, key, opts }) => (
            <div key={key} className="select-wrap">
              <select
                className="input"
                aria-label={label}
                value={(filters as Record<string, string>)[key] || opts[0]}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilters((f) => ({ ...f, [key]: v === opts[0] ? "" : v }));
                  setPage(0);
                }}
                style={{ height: 34, fontSize: 13, paddingRight: 28 }}
              >
                {opts.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            </div>
          ))}
          {Object.values(filters).some(Boolean) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setFilters({ segment: "", sentiment: "", language: "" });
                setPage(0);
              }}
            >
              {t.dashboard.reset}
            </button>
          )}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Описание</th>
                <th>{t.dashboard.tableSegment}</th>
                <th>{t.dashboard.tableType}</th>
                <th>{t.dashboard.tablePriority}</th>
                <th>{t.dashboard.tableSentiment}</th>
                <th>{t.dashboard.tableLang}</th>
                <th>{t.dashboard.tableManager}</th>
                <th>Город</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ cursor: "default" }}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j}>
                        <div
                          className="skeleton"
                          style={{ height: 16, width: "80%" }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : tickets.length === 0 ? (
                <tr style={{ cursor: "default" }}>
                  <td
                    colSpan={9}
                    style={{
                      textAlign: "center",
                      padding: "40px 0",
                      color: "var(--text-muted)",
                    }}
                  >
                    Нет тикетов
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/tickets/${t.id}`)}
                  >
                    <td
                      style={{
                        color: "var(--primary)",
                        fontWeight: 600,
                        fontSize: 12,
                      }}
                    >
                      #{t.guid?.slice(0, 10) || t.id}
                    </td>
                    <td
                      style={{
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: 13,
                      }}
                    >
                      {t.description?.slice(0, 60) || "—"}
                    </td>
                    <td>
                      <SegmentBadge segment={t.segment} />
                    </td>
                    <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                      {t.ticketType ?? "—"}
                    </td>
                    <td>
                      <PriorityBadge priority={t.priority} />
                    </td>
                    <td>
                      <SentimentBadge sentiment={t.sentimentVal} />
                    </td>
                    <td>
                      <LangBadge lang={t.language} />
                    </td>
                    <td
                      style={{ fontSize: 13, color: "var(--text-secondary)" }}
                    >
                      {t.managerName ?? "—"}
                    </td>
                    <td style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      {t.city ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span className="pagination-info">
            {loading
              ? "..."
              : `${page * limit + 1}–${page * limit + tickets.length} тикетов`}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            ← {t.dashboard.prev}
          </button>
          <button
            className="btn btn-secondary btn-sm"
            disabled={tickets.length < limit}
            onClick={() => setPage((p) => p + 1)}
          >
            {t.dashboard.next} →
          </button>
        </div>
      </div>
    </div>
  );
}
