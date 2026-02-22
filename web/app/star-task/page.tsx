"use client";

import {
  ChevronDown,
  ChevronUp,
  Database,
  Send,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StarTaskResult } from "@/types";
import { useI18n } from "../../dictionaries/i18n";
import s from "./star-task.module.css";

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

const EXAMPLES = [
  { icon: "🏙️", text: "Покажи жалобы по городам" },
  { icon: "👑", text: "Сколько VIP тикетов по каждому офису?" },
  { icon: "📊", text: "Топ-10 менеджеров по нагрузке" },
  { icon: "😊", text: "Распределение тональности по сегментам" },
  { icon: "🌐", text: "Сколько тикетов на каждом языке?" },
  { icon: "⚡", text: "Средний приоритет по типам обращений" },
];

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  result?: StarTaskResult;
};

export default function StarTaskPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  // Set initial message only after translation is loaded
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        { id: "welcome", role: "assistant", content: t.starTask.welcome },
      ]);
    }
  }, [t.starTask.welcome, messages.length]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  async function handleSubmit(forcedQuery?: string) {
    const text = forcedQuery || query.trim();
    if (!text || loading) return;

    const newMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, newMsg]);
    setQuery("");
    setLoading(true);

    try {
      // Send the entire chat history for Context
      const historyToSend = [...messages, newMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://fire.api.depa-team.com"}/star-task/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messages: historyToSend }),
      });
      const data = (await res.json()) as StarTaskResult;

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.text || t.starTask.noAnswer,
          result: data,
        },
      ]);
    } catch (e: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `${t.starTask.error} ${e instanceof Error ? e.message : t.starTask.unknownError}`,
        },
      ]);
    }
    setLoading(false);
  }

  return (
    <div className={`page ${s.pageChat}`}>
      {/* ── Chat Header ────────────────────────────────────────────── */}
      <div className={s.chatHeader}>
        <div className={s.heroIcon} style={{ width: 32, height: 32 }}>
          <Sparkles size={16} />
        </div>
        <div>
          <h1 className={s.chatTitle}>Star Task AI</h1>
          <div className={s.caps} style={{ marginTop: 4 }}>
            <span className={s.cap}>
              <Database size={12} />
              PostgreSQL Agent
            </span>
            <span className={s.cap}>
              <Zap size={12} />
              Qwen2.5 JSON Mode
            </span>
          </div>
        </div>
      </div>

      {/* ── Chat Messages ──────────────────────────────────────────── */}
      <div className={s.chatScroll}>
        <div className={s.chatMessages}>
          {messages.map((m) => (
            <div
              key={m.id}
              className={`${s.messageRow} ${m.role === "user" ? s.messageRowUser : s.messageRowAssistant}`}
            >
              <div className={s.avatar}>
                {m.role === "user" ? (
                  <User size={16} />
                ) : (
                  <Sparkles size={16} />
                )}
              </div>
              <div
                className={m.role === "user" ? s.bubbleUser : s.bubbleAssistant}
              >
                <div className={s.messageContent}>{m.content}</div>

                {/* Embed Chart if SQL Result */}
                {m.result?.type === "sql_result" && m.result.data && (
                  <div className={s.embeddedChart}>
                    <ChartBlock data={m.result.data} t={t} />
                  </div>
                )}

                {/* Embedded Error */}
                {m.result?.type === "error" && (
                  <div className={s.embeddedError}>⚠️ {m.result.text}</div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className={`${s.messageRow} ${s.messageRowAssistant}`}>
              <div className={s.avatar}>
                <Sparkles size={16} />
              </div>
              <div className={s.bubbleAssistant}>
                <div className={s.typingIndicator}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} style={{ height: 1 }} />
        </div>
      </div>

      {/* ── Input Footer ───────────────────────────────────────────── */}
      <div className={s.chatFooter}>
        <div className={s.chipsScroll}>
          {EXAMPLES.map((ex) => (
            <button
              type="button"
              key={ex.text}
              className={s.chip}
              onClick={() => handleSubmit(ex.text)}
            >
              {ex.icon} {ex.text}
            </button>
          ))}
        </div>

        <div className={s.searchRow}>
          <div className={s.searchInputWrap}>
            <input
              ref={inputRef}
              className={s.searchInput}
              placeholder={t.starTask.placeholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              disabled={loading}
            />
          </div>
          <button
            type="button"
            className={s.searchBtn}
            onClick={() => handleSubmit()}
            disabled={!query.trim() || loading}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Chart Block inside Chat ──────────────────────────────────────────────────

function ChartBlock({
  data,
  t,
}: {
  data: NonNullable<StarTaskResult["data"]>;
  // biome-ignore lint/suspicious/noExplicitAny: i18n
  t: any;
}) {
  const [sqlOpen, setSqlOpen] = useState(false);

  return (
    <div className={s.chartBlock}>
      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-header">
          <h3 className="card-title" style={{ fontSize: 14 }}>
            {data.chartTitle}
          </h3>
          <span
            className="badge badge-new"
            style={{ fontSize: 10, textTransform: "uppercase" }}
          >
            {data.chartType}
          </span>
        </div>
        <div className="card-body" style={{ padding: "16px 8px" }}>
          <DynamicChart dataObj={data} />
        </div>
      </div>

      <button
        type="button"
        className={s.sqlToggleChat}
        onClick={() => setSqlOpen((v) => !v)}
      >
        <Database size={12} />
        <span>{sqlOpen ? t.starTask.hideSql : t.starTask.showSql}</span>
        {sqlOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {sqlOpen && <pre className={s.sqlPreChat}>{data.sql}</pre>}
    </div>
  );
}

function DynamicChart({
  dataObj,
}: {
  dataObj: NonNullable<StarTaskResult["data"]>;
}) {
  const { columns, rows } = dataObj;

  // 1. Identify numeric and string columns
  const numericIdx = rows[0]?.findIndex((val) => typeof val === "number") ?? -1;
  const valueIdx = numericIdx !== -1 ? numericIdx : 1; // Default to 2nd col if no number found
  const valueKey = columns[valueIdx];

  const data = rows.map((row) => {
    const obj: Record<string, unknown> = {};
    const stringParts: string[] = [];

    columns.forEach((col, i) => {
      const val = (row as unknown[])[i];
      obj[col] = val;
      if (i !== valueIdx && val !== null && val !== undefined) {
        stringParts.push(String(val));
      }
    });

    // nameKey will be a combination of all other columns if there are many
    obj["_name"] = stringParts.join(" - ") || "Data";
    return obj;
  });

  const nameKey = "_name";
  const isVertical = data.length > 6;

  if (dataObj.chartType === "pie") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ name, percent }) =>
              `${String(name).slice(0, 14)} ${((percent ?? 0) * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {data.map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: order is stable
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
              borderRadius: "8px",
            }}
            itemStyle={{ color: "var(--text-primary)" }}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (dataObj.chartType === "line") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
              borderRadius: "8px",
            }}
            itemStyle={{ color: "var(--text-primary)" }}
          />
          <Line
            type="monotone"
            dataKey={valueKey}
            stroke="#2563EB"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer
      width="100%"
      height={isVertical ? Math.max(260, data.length * 32) : 260}
    >
      <BarChart
        data={data}
        layout={isVertical ? "vertical" : "horizontal"}
        margin={{ left: 16, right: 24, top: 8, bottom: 8 }}
      >
        {isVertical ? (
          <>
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis
              type="category"
              dataKey={nameKey}
              tick={{ fontSize: 11 }}
              width={120}
            />
          </>
        ) : (
          <>
            <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
          </>
        )}
        <Tooltip
          cursor={{ fill: "var(--bg-hover)" }}
          contentStyle={{
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border)",
            color: "var(--text-primary)",
            borderRadius: "8px",
          }}
          itemStyle={{ color: "var(--text-primary)" }}
        />
        <Bar
          dataKey={valueKey}
          fill="#2563EB"
          radius={isVertical ? [0, 4, 4, 0] : [4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
