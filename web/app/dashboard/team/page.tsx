"use client";

import { Key, Link2, Pencil, Trash2, UserPlus, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { BusinessUnit, Manager } from "@/types";
import { ProtectedGuard } from "../../../components/protected-guard";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";

type Tab = "list" | "create" | "invite" | "api";

export default function TeamDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("list");

  // ── Team list state ──
  const [members, setMembers] = useState<Manager[]>([]);
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [listLoading, setListLoading] = useState(true);

  // ── Edit state ──
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    position: "",
    office: "",
    skills: "",
    role: "",
    newPassword: "",
  });

  // ── Delete confirm state ──
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ── Create user state ──
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("MANAGER");
  const [createMsg, setCreateMsg] = useState("");
  const [createError, setCreateError] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Invite state ──
  const [inviteRole, setInviteRole] = useState("MANAGER");
  const [inviteLink, setInviteLink] = useState("");
  const [inviteError, setInviteError] = useState("");

  const loadMembers = useCallback(async () => {
    setListLoading(true);
    try {
      const [data, bu] = await Promise.all([
        api.managers.list(),
        api.businessUnits.list(),
      ]);
      setMembers(data);
      setUnits(bu);
    } catch {
      setMembers([]);
    }
    setListLoading(false);
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // ── Edit handlers ──
  function startEdit(m: Manager) {
    setEditingId(m.id);
    setEditForm({
      name: m.name,
      position: m.position ?? "",
      office: m.office ?? "",
      skills: (m.skills ?? []).join(", "),
      role: m.role ?? "MANAGER",
      newPassword: "",
    });
  }

  async function saveEdit() {
    if (editingId === null) return;
    try {
      const payload: Record<string, unknown> = {
        name: editForm.name,
        position: editForm.position,
        office: editForm.office,
        skills: editForm.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        role: editForm.role,
      };
      if (editForm.newPassword) payload.newPassword = editForm.newPassword;
      await api.managers.update(editingId, payload);
      setEditingId(null);
      await loadMembers();
    } catch {}
  }

  // ── Delete handlers ──
  async function confirmDelete() {
    if (deletingId === null) return;
    try {
      await api.managers.delete(deletingId);
      setDeletingId(null);
      await loadMembers();
    } catch {}
  }

  // ── Create user ──
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setCreateError("");
    setCreateMsg("");
    try {
      const res = await api.post<{ success?: boolean; error?: string }>(
        "/auth/create-user",
        {
          email: newEmail,
          name: newName,
          password: newPassword,
          role: newRole,
        },
      );
      if (res.error) {
        setCreateError(res.error);
      } else {
        setCreateMsg("Пользователь создан!");
        setNewEmail("");
        setNewName("");
        setNewPassword("");
        await loadMembers();
      }
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Ошибка");
    }
    setLoading(false);
  }

  // ── Invite ──
  async function handleGenerateInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setInviteError("");
    setInviteLink("");
    try {
      const res = await api.post<{ inviteLink?: string; error?: string }>(
        "/auth/invite",
        { role: inviteRole },
      );
      if (res.error) setInviteError(res.error);
      else if (res.inviteLink) setInviteLink(res.inviteLink);
    } catch {
      setInviteError("Ошибка");
    }
    setLoading(false);
  }

  if (!user) return null;
  if (user.role !== "ADMIN") {
    return (
      <div className="p-8 text-foreground">
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="text-gray-400 mt-2">
          Только администраторы могут управлять командой.
        </p>
      </div>
    );
  }

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: "Администратор",
    MANAGER: "Менеджер",
    ANALYST: "Аналитик",
    USER: "Пользователь",
  };

  return (
    <ProtectedGuard requireAdmin={true}>
      <div className="p-8 text-foreground max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Управление командой</h1>
          <p className="text-gray-400 mt-1">
            Добавляйте, редактируйте и удаляйте сотрудников.
          </p>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-border space-x-6">
          {[
            { key: "list" as Tab, label: "Список команды", icon: Users },
            { key: "create" as Tab, label: "Создать аккаунт", icon: UserPlus },
            { key: "invite" as Tab, label: "Пригласить", icon: Link2 },
            { key: "api" as Tab, label: "API Настройки", icon: Key },
          ].map(({ key, label, icon: Icon }) => (
            <button
              type="button"
              key={key}
              className={`pb-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === key ? "text-blue-500 border-b-2 border-blue-500" : "text-gray-400 hover:text-white"}`}
              onClick={() => setActiveTab(key)}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* ═══════ TAB: LIST ═══════ */}
        {activeTab === "list" && (
          <div className="bg-card border border-border rounded-xl shadow-md overflow-hidden">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Имя</th>
                    <th>Email</th>
                    <th>Роль</th>
                    <th>Должность</th>
                    <th>Офис</th>
                    <th>Навыки</th>
                    <th>Нагрузка</th>
                    <th style={{ width: 90 }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {listLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={`skel-row-${i}`} style={{ cursor: "default" }}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          // biome-ignore lint/suspicious/noArrayIndexKey: order is stable for skeleton
                          <td key={`skel-cell-${i}-${j}`}>
                            <div
                              className="skeleton"
                              style={{ height: 16, width: "75%" }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : members.length === 0 ? (
                    <tr style={{ cursor: "default" }}>
                      <td
                        colSpan={8}
                        style={{
                          textAlign: "center",
                          padding: "40px 0",
                          color: "hsl(var(--muted-foreground))",
                        }}
                      >
                        Нет сотрудников
                      </td>
                    </tr>
                  ) : (
                    members.map((m) => (
                      <tr key={m.id} style={{ cursor: "default" }}>
                        <td style={{ fontWeight: 600, fontSize: 14 }}>
                          {m.name}
                        </td>
                        <td
                          style={{
                            fontSize: 13,
                            color: "hsl(var(--secondary-foreground))",
                          }}
                        >
                          {m.email ?? "—"}
                        </td>
                        <td>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.role === "ADMIN" ? "bg-purple-500/20 text-purple-400" : m.role === "MANAGER" ? "bg-blue-500/20 text-blue-400" : "bg-gray-500/20 text-gray-400"}`}
                          >
                            {ROLE_LABELS[m.role ?? ""] ?? m.role}
                          </span>
                        </td>
                        <td style={{ fontSize: 13 }}>{m.position ?? "—"}</td>
                        <td style={{ fontSize: 13 }}>{m.office ?? "—"}</td>
                        <td>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 4,
                            }}
                          >
                            {(m.skills ?? []).slice(0, 3).map((s) => (
                              <span key={s} className="skill-tag">
                                {s}
                              </span>
                            ))}
                            {(m.skills ?? []).length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{(m.skills ?? []).length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontSize: 13, fontWeight: 600 }}>
                          {m.currentLoad ?? 0}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: "4px 8px" }}
                              onClick={() => startEdit(m)}
                              title="Редактировать"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{
                                padding: "4px 8px",
                                color: "var(--danger)",
                              }}
                              onClick={() => setDeletingId(m.id)}
                              title="Удалить"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══════ TAB: CREATE ═══════ */}
        {activeTab === "create" && (
          <div className="bg-card border border-border rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4">
              Создать нового пользователя
            </h2>
            <form onSubmit={handleCreateUser} className="space-y-4 max-w-sm">
              <div>
                <label
                  htmlFor="new-name"
                  className="block text-sm font-medium text-gray-300"
                >
                  Имя
                </label>
                <input
                  id="new-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-blue-500 text-foreground"
                />
              </div>
              <div>
                <label
                  htmlFor="new-email"
                  className="block text-sm font-medium text-gray-300"
                >
                  Email
                </label>
                <input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-blue-500 text-foreground"
                />
              </div>
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-sm font-medium text-gray-300"
                >
                  Пароль
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-blue-500 text-foreground"
                />
              </div>
              <div>
                <label
                  htmlFor="new-role"
                  className="block text-sm font-medium text-gray-300"
                >
                  Роль
                </label>
                <select
                  id="new-role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                >
                  <option value="ANALYST">Аналитик (полный доступ)</option>
                  <option value="MANAGER">Менеджер</option>
                  <option value="USER">Пользователь (только чтение)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md w-full disabled:opacity-50 mt-4"
              >
                {loading ? "Создание..." : "Создать аккаунт"}
              </button>
            </form>
            {createError && (
              <p className="text-red-500 mt-4 text-sm">{createError}</p>
            )}
            {createMsg && (
              <p className="text-green-500 mt-4 text-sm font-medium">
                {createMsg}
              </p>
            )}
          </div>
        )}

        {/* ═══════ TAB: INVITE ═══════ */}
        {activeTab === "invite" && (
          <div className="bg-card border border-border rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4">Создать приглашение</h2>
            <form onSubmit={handleGenerateInvite} className="space-y-4">
              <div>
                <label
                  htmlFor="invite-role"
                  className="block text-sm font-medium text-gray-300"
                >
                  Роль
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="mt-1 block max-w-xs w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                >
                  <option value="ANALYST">Аналитик (полный доступ)</option>
                  <option value="MANAGER">Менеджер</option>
                  <option value="USER">Пользователь (только чтение)</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:bg-gray-600"
              >
                {loading ? "Генерация..." : "Сгенерировать ссылку"}
              </button>
            </form>
            {inviteError && (
              <div className="text-red-500 mt-4 text-sm">{inviteError}</div>
            )}
            {inviteLink && (
              <div className="mt-6 p-4 border border-green-900/50 bg-green-900/20 rounded-md">
                <p className="text-green-400 font-medium mb-2">
                  Ссылка создана!
                </p>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(inviteLink)}
                    className="px-3 py-2 bg-border hover:bg-background rounded-md text-sm font-medium text-foreground transition"
                  >
                    Копировать
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Ссылка одноразовая, действительна 7 дней.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ═══════ TAB: API ═══════ */}
        {activeTab === "api" && (
          <div className="bg-card border border-border rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-blue-400 flex items-center gap-2">
              <Key size={20} />
              API Доступ для внешних систем
            </h2>
            <div className="space-y-4 max-w-2xl">
              <p className="text-sm text-gray-400">
                Используйте этот токен для автоматической отправки тикетов из внешних систем (например, голосовых роботов или чат-виджетов) без авторизации.
              </p>
              
              <div className="p-4 bg-muted/30 border border-border rounded-lg space-y-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase text-gray-500 tracking-wider">
                    API Токен Компании
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={user.apiToken || "Загрузка..."}
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-foreground text-sm font-mono focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => user.apiToken && navigator.clipboard.writeText(user.apiToken)}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium text-white transition flex items-center gap-1.5"
                    >
                      Копировать
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mt-6">
                <h3 className="text-sm font-semibold uppercase text-gray-500 tracking-wider">
                  Пример запроса (cURL)
                </h3>
                <div className="p-3 bg-black/50 rounded-lg overflow-x-auto">
                  <pre className="text-xs text-blue-300 font-mono">
{`curl -X POST http://localhost:8000/api/ingest \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${user.apiToken || 'YOUR_TOKEN'}" \\
  -d '{
    "source": "voice",
    "payload": {
      "phone": "+7 777 000 1122",
      "status": "Завершен",
      "transcript": [{ "role": "user", "text": "Клиент доволен" }]
    }
  }'`}
                  </pre>
                </div>
              </div>

              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-xs text-yellow-500 flex items-start gap-2">
                  <span>⚠️</span>
                  <span>
                    Храните этот токен в секрете. Любой, у кого есть этот ключ, может создавать тикеты в вашей системе.
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ EDIT MODAL ═══════ */}
        {editingId !== null && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100,
            }}
            role="dialog"
            aria-modal="true"
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditingId(null);
            }}
            onClick={() => setEditingId(null)}
          >
            {/* biome-ignore lint/a11y/noStaticElementInteractions: simple overlay wrapper */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: simple overlay wrapper */}
            <div
              className="bg-card border border-border rounded-xl p-6 shadow-xl"
              style={{ maxWidth: 440, width: "100%" }}
              role="presentation"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-4">Редактирование</h2>
              <div className="space-y-3">
                <div>
                  <label
                    htmlFor="edit-name"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Имя
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-position"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Должность
                  </label>
                  <input
                    id="edit-position"
                    type="text"
                    value={editForm.position}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, position: e.target.value }))
                    }
                    className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-office"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Офис
                  </label>
                  <select
                    id="edit-office"
                    value={editForm.office}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, office: e.target.value }))
                    }
                    className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                  >
                    <option value="">— Не выбран —</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.office}>
                        {u.office}
                        {u.address ? ` — ${u.address}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="edit-skills"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Навыки (через запятую)
                  </label>
                  <input
                    id="edit-skills"
                    type="text"
                    value={editForm.skills}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, skills: e.target.value }))
                    }
                    className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-role"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Роль
                  </label>
                  <select
                    id="edit-role"
                    value={editForm.role}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, role: e.target.value }))
                    }
                    className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                  >
                    <option value="ADMIN">Администратор</option>
                    <option value="ANALYST">Аналитик</option>
                    <option value="MANAGER">Менеджер</option>
                    <option value="USER">Пользователь</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="edit-pass"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Новый пароль
                  </label>
                  <input
                    id="edit-pass"
                    type="password"
                    value={editForm.newPassword}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        newPassword: e.target.value,
                      }))
                    }
                    placeholder="Оставьте пустым, чтобы не менять"
                    className="mt-1 block w-full px-3 py-2 bg-background border border-border rounded-md text-foreground"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={saveEdit}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md"
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="flex-1 px-4 py-2 bg-border hover:bg-background text-foreground font-medium rounded-md"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ DELETE CONFIRM MODAL ═══════ */}
        {deletingId !== null && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100,
            }}
            role="dialog"
            aria-modal="true"
            onKeyDown={(e) => {
              if (e.key === "Escape") setDeletingId(null);
            }}
            onClick={() => setDeletingId(null)}
          >
            {/* biome-ignore lint/a11y/noStaticElementInteractions: simple overlay wrapper */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: simple overlay wrapper */}
            <div
              className="bg-card border border-border rounded-xl p-6 shadow-xl"
              style={{ maxWidth: 400, width: "100%" }}
              role="presentation"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-2">
                Удалить сотрудника?
              </h2>
              <p className="text-gray-400 text-sm mb-6">
                Это действие необратимо. Сотрудник и его аккаунт будут удалены.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md"
                >
                  Удалить
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingId(null)}
                  className="flex-1 px-4 py-2 bg-border hover:bg-background text-foreground font-medium rounded-md"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedGuard>
  );
}
