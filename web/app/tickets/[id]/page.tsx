"use client";

import {
  ArrowLeft,
  Brain,
  Calendar,
  MapPin,
  User,
  UserCheck,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { BusinessUnit, Manager, TicketDetail, TicketRow } from "@/types";
import {
  LangBadge,
  SegmentBadge,
  SentimentBadge,
} from "../../../components/badges";
import TicketMap from "../../../components/ticket-map";
import { useI18n } from "../../../dictionaries/i18n";

function calcAge(birthDate: string | null): string {
  if (!birthDate) return "—";
  const age = Math.floor(
    (Date.now() - new Date(birthDate).getTime()) / 31557600000,
  );
  return `${age} лет`;
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t: tr } = useI18n();
  const { user } = useAuth();

  const [data, setData] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<TicketRow>>({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const canFullEdit = user?.role === "ADMIN" || user?.role === "ANALYST";
  const canManageStatus = canFullEdit || user?.role === "MANAGER";

  useEffect(() => {
    api.tickets
      .get(Number(id))
      .then(setData)
      .catch(() => setError("Тикет не найден"))
      .finally(() => setLoading(false));
  }, [id]);

  // Load business units for the dropdown
  const [buList, setBuList] = useState<BusinessUnit[]>([]);
  useEffect(() => {
    api.businessUnits
      .list()
      .then(setBuList)
      .catch(() => {});
  }, []);

  // Load managers for the dropdown
  const [managerList, setManagerList] = useState<Manager[]>([]);
  useEffect(() => {
    if (canFullEdit) {
      api.managers
        .list()
        .then(setManagerList)
        .catch(() => {});
    }
  }, [canFullEdit]);

  if (loading)
    return (
      <div className="page">
        <div className="detail-grid">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="skeleton"
              style={{ height: 320, borderRadius: 12 }}
            />
          ))}
        </div>
      </div>
    );

  if (error || !data)
    return (
      <div className="page" style={{ textAlign: "center", padding: "60px 0" }}>
        <p style={{ color: "hsl(var(--muted-foreground))", fontSize: 16 }}>
          {error || "Загрузка..."}
        </p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => router.push("/dashboard")}
          style={{ marginTop: 16 }}
        >
          ← {tr.ticketDetail.back}
        </button>
      </div>
    );

  const t = data.tickets;
  const a = data.ticket_analysis;
  const m = data.managers;
  const assign = data.assignments;
  const bu = data.business_units;

  // Prefer business unit coordinates, fall back to ticket's own lat/lng
  const mapLat = bu?.latitude ?? t.latitude;
  const mapLng = bu?.longitude ?? t.longitude;

  const priority = a?.priority ?? null;
  const priorityPct = priority != null ? (priority / 10) * 100 : 0;
  const priorityColor =
    priority != null
      ? priority <= 3
        ? "var(--success)"
        : priority <= 6
          ? "var(--warning)"
          : "var(--danger)"
      : "hsl(var(--border))";

  const startEdit = () => {
    setEditData({
      status: t.status || "Новый",
      notes: t.notes || "",
      description: t.description || "",
      segment: t.segment || "Mass",
      contact: t.contact || "",
      source: t.source || "",
      businessUnitId: t.businessUnitId ?? null,
      managerId: m?.id ?? null,
    } as any);
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (canFullEdit) {
        await api.tickets.update(Number(id), editData);
      } else {
        await api.tickets.update(Number(id), {
          status: editData.status,
          notes: editData.notes,
        });
      }
      const newData = await api.tickets.get(Number(id));
      setData(newData);
      setIsEditing(false);
    } catch (_e) {
      alert("Failed to save ticket");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Вы уверены, что хотите удалить этот тикет?")) return;
    setIsDeleting(true);
    try {
      await api.tickets.delete(Number(id));
      router.push("/dashboard");
    } catch (_e) {
      alert("Failed to delete ticket");
      setIsDeleting(false);
    }
  };

  return (
    <div className="page">
      {/* Back button + header */}
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => router.push("/dashboard")}
            style={{ marginBottom: 12 }}
          >
            <ArrowLeft size={14} /> {tr.ticketDetail.back}
          </button>
          <h1 className="page-title">Тикет #{t.guid?.slice(0, 16) || t.id}</h1>
          <p
            className="page-subtitle"
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span
              className="badge"
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                color: "white",
              }}
            >
              {t.status || "Новый"}
            </span>
            <SegmentBadge segment={t.segment} />
            <LangBadge lang={a?.language ?? null} />
            <span
              style={{ color: "hsl(var(--muted-foreground))", fontSize: 13 }}
            >
              {t.createdAt ? new Date(t.createdAt).toLocaleString("ru-RU") : ""}
            </span>
          </p>
        </div>
        {canManageStatus && !isEditing && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={startEdit}
            >
              Редактировать
            </button>
            {canFullEdit && (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                Удалить
              </button>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title">Редактирование тикета</h3>
          </div>
          <div className="card-body mt-4 flex flex-col gap-4 max-w-2xl">
            {canManageStatus && (
              <>
                <div>
                  <label
                    htmlFor="edit-status"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Статус
                  </label>
                  <select
                    id="edit-status"
                    value={editData.status as string}
                    onChange={(e) =>
                      setEditData({ ...editData, status: e.target.value })
                    }
                    className="block w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                  >
                    <option value="Новый">Новый</option>
                    <option value="В работе">В работе</option>
                    <option value="Решен">Решен</option>
                    <option value="Закрыт">Закрыт</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="edit-notes"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Заметки менеджера
                  </label>
                  <textarea
                    id="edit-notes"
                    rows={3}
                    value={editData.notes as string}
                    onChange={(e) =>
                      setEditData({ ...editData, notes: e.target.value })
                    }
                    className="block w-full px-3 py-2 bg-background border border-border rounded-md text-foreground whitespace-pre-wrap"
                  />
                </div>
              </>
            )}

            {canFullEdit && (
              <>
                <div className="border-t border-border pt-4 mt-2">
                  <label
                    htmlFor="edit-desc"
                    className="block text-sm font-medium text-gray-300 mb-1"
                  >
                    Описание обращения
                  </label>
                  <textarea
                    id="edit-desc"
                    rows={4}
                    value={editData.description as string}
                    onChange={(e) =>
                      setEditData({ ...editData, description: e.target.value })
                    }
                    className="block w-full px-3 py-2 bg-background border border-border rounded-md text-foreground whitespace-pre-wrap"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="edit-segment"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      Сегмент
                    </label>
                    <input
                      id="edit-segment"
                      type="text"
                      value={editData.segment as string}
                      onChange={(e) =>
                        setEditData({ ...editData, segment: e.target.value })
                      }
                      className="block w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="edit-contact"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      Контакт
                    </label>
                    <input
                      id="edit-contact"
                      type="text"
                      value={editData.contact as string}
                      onChange={(e) =>
                        setEditData({ ...editData, contact: e.target.value })
                      }
                      className="block w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="edit-source"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      Источник
                    </label>
                    <input
                      id="edit-source"
                      type="text"
                      value={editData.source as string}
                      onChange={(e) =>
                        setEditData({ ...editData, source: e.target.value })
                      }
                      className="block w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                    />
                  </div>
                  <div className="col-span-2">
                    <label
                      htmlFor="edit-office"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      Офис (Business Unit)
                    </label>
                    <select
                      id="edit-office"
                      value={
                        ((editData as Record<string, unknown>)
                          .businessUnitId as string) ?? ""
                      }
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          businessUnitId: e.target.value
                            ? Number(e.target.value)
                            : null,
                        }))
                      }
                      className="block w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                    >
                      <option value="">— Не выбрано —</option>
                      {buList.map((bu) => (
                        <option key={bu.id} value={bu.id}>
                          {bu.office} — {bu.address}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label
                      htmlFor="edit-manager"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      Исполнитель
                    </label>
                    <select
                      id="edit-manager"
                      value={
                        ((editData as Record<string, unknown>)
                          .managerId as string) ?? ""
                      }
                      onChange={(e) =>
                        setEditData((prev) => ({
                          ...prev,
                          managerId: e.target.value
                            ? Number(e.target.value)
                            : null,
                        }))
                      }
                      className="block w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                    >
                      <option value="">— Не назначено —</option>
                      {managerList.map((mgr) => (
                        <option key={mgr.id} value={mgr.id}>
                          {mgr.name} — {mgr.office}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-4 mt-6">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="detail-grid">
        {/* Column 1: Текст обращения + Клиент */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <h3
                className="card-title"
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <User size={15} />
                {tr.ticketDetail.ticketInfo}
              </h3>
            </div>
            <div className="card-body">
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: "hsl(var(--foreground))",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {t.description || "—"}
              </p>
              {t.notes && (
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: "1px solid hsl(var(--border))",
                  }}
                >
                  <h4
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "hsl(var(--muted-foreground))",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    Заметки менеджера
                  </h4>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: "hsl(var(--secondary-foreground))",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {t.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3
                className="card-title"
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <User size={15} />
                {tr.ticketDetail.client}
              </h3>
            </div>
            <div
              className="card-body"
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              <Row label={tr.dashboard.tableSegment}>
                <SegmentBadge segment={t.segment} />
              </Row>
              <Row label="Контакт">{t.contact || "—"}</Row>
              <Row label={tr.ticketDetail.gender}>{t.gender ?? "—"}</Row>
              <Row label={tr.ticketDetail.age}>{calcAge(t.birthDate)}</Row>
              {bu && (
                <>
                  <Row label="Офис">{bu.office ?? "—"}</Row>
                  <Row label={tr.ticketDetail.address}>{bu.address ?? "—"}</Row>
                </>
              )}
              {mapLat != null && mapLng != null && (
                <>
                  <Row label={tr.ticketDetail.coordinates}>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 12,
                        color: "hsl(var(--muted-foreground))",
                      }}
                    >
                      {mapLat.toFixed(4)}, {mapLng.toFixed(4)}
                    </span>
                  </Row>
                  <div style={{ marginTop: 12 }}>
                    <TicketMap center={[mapLat, mapLng]} />
                  </div>
                </>
              )}
              <Row label={tr.ticketDetail.source}>
                <span className="badge badge-new">{t.source ?? "—"}</span>
              </Row>
            </div>
          </div>
        </div>

        {/* Column 2: AI-анализ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div
              className="card-header"
              style={{
                background: "#EFF6FF",
                borderBottom: "1px solid #BFDBFE",
              }}
            >
              <h3
                className="card-title"
                style={{
                  color: "#1E40AF",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Brain size={15} />
                {tr.ticketDetail.aiAnalysis}
              </h3>
            </div>
            <div
              className="card-body"
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "hsl(var(--muted-foreground))",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  {tr.ticketDetail.ticketType}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {a?.ticketType ?? "—"}
                </div>
              </div>
              <Row label={tr.ticketDetail.sentiment}>
                <SentimentBadge sentiment={a?.sentiment ?? null} />
              </Row>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "hsl(var(--muted-foreground))",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  {tr.ticketDetail.priority}{" "}
                  <span style={{ color: priorityColor }}>
                    {priority ?? "—"}/10
                  </span>
                </div>
                <div className="workload-bar-bg">
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 3,
                      background: priorityColor,
                      width: `${priorityPct}%`,
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              </div>
              <Row label={tr.ticketDetail.language}>
                <LangBadge lang={a?.language ?? null} />
              </Row>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{tr.ticketDetail.summary}</h3>
            </div>
            <div className="card-body">
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: "hsl(var(--secondary-foreground))",
                }}
              >
                {a?.summary || (
                  <span style={{ color: "hsl(var(--muted-foreground))" }}>
                    {tr.ticketDetail.notGenerated}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div
            className="card"
            style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
          >
            <div
              className="card-header"
              style={{
                background: "transparent",
                borderBottom: "1px solid #FDE68A",
              }}
            >
              <h3 className="card-title" style={{ color: "#92400E" }}>
                {tr.ticketDetail.recommendation}
              </h3>
            </div>
            <div className="card-body">
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: "#78350F",
                  fontStyle: "italic",
                }}
              >
                {a?.recommendation || (
                  <span style={{ color: "#B45309" }}>
                    {tr.ticketDetail.notGenerated}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Column 3: Назначение */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div
              className="card-header"
              style={{
                background: "#F0FDF4",
                borderBottom: "1px solid #BBF7D0",
              }}
            >
              <h3
                className="card-title"
                style={{
                  color: "#166534",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <UserCheck size={15} />
                {tr.ticketDetail.managerAssigned}
              </h3>
            </div>
            <div
              className="card-body"
              style={{ display: "flex", flexDirection: "column", gap: 12 }}
            >
              {m?.name ? (
                <>
                  <div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: "hsl(var(--foreground))",
                      }}
                    >
                      {m.name}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "hsl(var(--muted-foreground))",
                      }}
                    >
                      {m.position}
                    </div>
                  </div>
                  <Row label={tr.ticketDetail.office}>
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <MapPin size={13} />
                      {m.office}
                    </span>
                  </Row>
                  {m.skills && m.skills.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "hsl(var(--muted-foreground))",
                          textTransform: "uppercase",
                          marginBottom: 6,
                        }}
                      >
                        {tr.ticketDetail.skills}
                      </div>
                      <div
                        style={{ display: "flex", flexWrap: "wrap", gap: 4 }}
                      >
                        {m.skills.map((s) => (
                          <span key={s} className="skill-tag">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <Row label={tr.ticketDetail.load}>
                    {m.currentLoad ?? 0} {tr.ticketDetail.ticketsSuffix}
                  </Row>
                  {assign?.assignedAt && (
                    <Row label={tr.ticketDetail.assignedDate}>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 13,
                        }}
                      >
                        <Calendar size={13} />
                        {new Date(assign.assignedAt).toLocaleString("ru-RU")}
                      </span>
                    </Row>
                  )}
                </>
              ) : (
                <p
                  style={{
                    color: "hsl(var(--muted-foreground))",
                    fontSize: 13,
                    textAlign: "center",
                    padding: "20px 0",
                  }}
                >
                  {tr.ticketDetail.notAssigned}
                </p>
              )}
            </div>
          </div>

          {assign?.assignmentReason && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">{tr.ticketDetail.reason}</h3>
              </div>
              <div className="card-body">
                <div className="reason-box">{assign.assignmentReason}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "hsl(var(--muted-foreground))",
          textTransform: "uppercase",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 500, textAlign: "right" }}>
        {children}
      </span>
    </div>
  );
}
