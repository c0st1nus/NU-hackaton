"use client";

import { Pencil, Trash2, UserPlus, Link2, Users } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../../lib/api";
import type { Manager } from "@/types";
import { useAuth } from "../../../lib/auth-context";
import { ProtectedGuard } from "../../components/protected-guard";

type Tab = "list" | "create" | "invite";

export default function TeamDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("list");

  // ── Team list state ──
  const [members, setMembers] = useState<Manager[]>([]);
  const [listLoading, setListLoading] = useState(true);

  // ── Edit state ──
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: "", position: "", office: "", skills: "", role: "" });

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
      const data = await api.managers.list();
      setMembers(data);
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
    });
  }

  async function saveEdit() {
    if (editingId === null) return;
    try {
      await api.managers.update(editingId, {
        name: editForm.name,
        position: editForm.position,
        office: editForm.office,
        skills: editForm.skills.split(",").map((s) => s.trim()).filter(Boolean),
        role: editForm.role,
      } as any);
      setEditingId(null);
      await loadMembers();
    } catch { }
  }

  // ── Delete handlers ──
  async function confirmDelete() {
    if (deletingId === null) return;
    try {
      await api.managers.delete(deletingId);
      setDeletingId(null);
      await loadMembers();
    } catch { }
  }

  // ── Create user ──
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setCreateError("");
    setCreateMsg("");
    try {
      const res = await api.post<{ success?: boolean; error?: string }>("/auth/create-user", {
        email: newEmail, name: newName, password: newPassword, role: newRole,
      });
      if (res.error) { setCreateError(res.error); }
      else { setCreateMsg("Пользователь создан!"); setNewEmail(""); setNewName(""); setNewPassword(""); await loadMembers(); }
    } catch (e: any) { setCreateError(e.message || "Ошибка"); }
    setLoading(false);
  }

  // ── Invite ──
  async function handleGenerateInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setInviteError("");
    setInviteLink("");
    try {
      const res = await api.post<{ inviteLink?: string; error?: string }>("/auth/invite", { role: inviteRole });
      if (res.error) setInviteError(res.error);
      else if (res.inviteLink) setInviteLink(res.inviteLink);
    } catch { setInviteError("Ошибка"); }
    setLoading(false);
  }

  if (!user) return null;
  if (user.role !== "ADMIN") {
    return (
      <div className="p-8 text-(--text-primary)">
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="text-gray-400 mt-2">Только администраторы могут управлять командой.</p>
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
      <div className="p-8 text-(--text-primary) max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Управление командой</h1>
          <p className="text-gray-400 mt-1">Добавляйте, редактируйте и удаляйте сотрудников.</p>
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-(--border) space-x-6">
          {([
            { key: "list" as Tab, label: "Список команды", icon: Users },
            { key: "create" as Tab, label: "Создать аккаунт", icon: UserPlus },
            { key: "invite" as Tab, label: "Пригласить", icon: Link2 },
          ]).map(({ key, label, icon: Icon }) => (
            <button
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
          <div className="bg-(--bg-card) border border-(--border) rounded-xl shadow-md overflow-hidden">
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
                      <tr key={i} style={{ cursor: "default" }}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j}><div className="skeleton" style={{ height: 16, width: "75%" }} /></td>
                        ))}
                      </tr>
                    ))
                  ) : members.length === 0 ? (
                    <tr style={{ cursor: "default" }}>
                      <td colSpan={8} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                        Нет сотрудников
                      </td>
                    </tr>
                  ) : (
                    members.map((m) => (
                      <tr key={m.id} style={{ cursor: "default" }}>
                        <td style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</td>
                        <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>{m.email ?? "—"}</td>
                        <td>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.role === "ADMIN" ? "bg-purple-500/20 text-purple-400" : m.role === "MANAGER" ? "bg-blue-500/20 text-blue-400" : "bg-gray-500/20 text-gray-400"}`}>
                            {ROLE_LABELS[m.role ?? ""] ?? m.role}
                          </span>
                        </td>
                        <td style={{ fontSize: 13 }}>{m.position ?? "—"}</td>
                        <td style={{ fontSize: 13 }}>{m.office ?? "—"}</td>
                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {(m.skills ?? []).slice(0, 3).map((s) => (
                              <span key={s} className="skill-tag">{s}</span>
                            ))}
                            {(m.skills ?? []).length > 3 && (
                              <span className="text-xs text-gray-500">+{(m.skills ?? []).length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontSize: 13, fontWeight: 600 }}>{m.currentLoad ?? 0}</td>
                        <td>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: "4px 8px" }}
                              onClick={() => startEdit(m)}
                              title="Редактировать"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: "4px 8px", color: "var(--danger)" }}
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
          <div className="bg-(--bg-card) border border-(--border) rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4">Создать нового пользователя</h2>
            <form onSubmit={handleCreateUser} className="space-y-4 max-w-sm">
              <div>
                <label className="block text-sm font-medium text-gray-300">Имя</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-(--bg) border border-(--border) rounded-md focus:ring-blue-500 text-(--text-primary)" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Email</label>
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-(--bg) border border-(--border) rounded-md focus:ring-blue-500 text-(--text-primary)" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Пароль</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-(--bg) border border-(--border) rounded-md focus:ring-blue-500 text-(--text-primary)" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300">Роль</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-(--bg) border border-(--border) rounded-md text-(--text-primary)">
                  <option value="ANALYST">Аналитик (полный доступ)</option>
                  <option value="MANAGER">Менеджер</option>
                  <option value="USER">Пользователь (только чтение)</option>
                </select>
              </div>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md w-full disabled:opacity-50 mt-4">
                {loading ? "Создание..." : "Создать аккаунт"}
              </button>
            </form>
            {createError && <p className="text-red-500 mt-4 text-sm">{createError}</p>}
            {createMsg && <p className="text-green-500 mt-4 text-sm font-medium">{createMsg}</p>}
          </div>
        )}

        {/* ═══════ TAB: INVITE ═══════ */}
        {activeTab === "invite" && (
          <div className="bg-(--bg-card) border border-(--border) rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4">Создать приглашение</h2>
            <form onSubmit={handleGenerateInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">Роль</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="mt-1 block max-w-xs w-full px-3 py-2 bg-(--bg) border border-(--border) rounded-md text-(--text-primary)">
                  <option value="ANALYST">Аналитик (полный доступ)</option>
                  <option value="MANAGER">Менеджер</option>
                  <option value="USER">Пользователь (только чтение)</option>
                </select>
              </div>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:bg-gray-600">
                {loading ? "Генерация..." : "Сгенерировать ссылку"}
              </button>
            </form>
            {inviteError && <div className="text-red-500 mt-4 text-sm">{inviteError}</div>}
            {inviteLink && (
              <div className="mt-6 p-4 border border-green-900/50 bg-green-900/20 rounded-md">
                <p className="text-green-400 font-medium mb-2">Ссылка создана!</p>
                <div className="flex items-center space-x-2">
                  <input type="text" readOnly value={inviteLink} className="flex-1 px-3 py-2 bg-(--bg) border border-(--border) rounded-md text-(--text-primary) text-sm focus:outline-none" />
                  <button type="button" onClick={() => navigator.clipboard.writeText(inviteLink)} className="px-3 py-2 bg-(--border) hover:bg-(--bg) rounded-md text-sm font-medium text-(--text-primary) transition">
                    Копировать
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">Ссылка одноразовая, действительна 7 дней.</p>
              </div>
            )}
          </div>
        )}

        {/* ═══════ EDIT MODAL ═══════ */}
        {editingId !== null && (
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
            onClick={() => setEditingId(null)}
          >
            <div
              className="bg-(--bg-card) border border-(--border) rounded-xl p-6 shadow-xl"
              style={{ maxWidth: 440, width: "100%" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-4">Редактирование</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300">Имя</label>
                  <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="mt-1 block w-full px-3 py-2 bg-(--bg) border border-(--border) rounded-md text-(--text-primary)" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Должность</label>
                  <input type="text" value={editForm.position} onChange={e => setEditForm(f => ({ ...f, position: e.target.value }))} className="mt-1 block w-full px-3 py-2 bg-(--bg) border border-(--border) rounded-md text-(--text-primary)" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Офис</label>
                  <input type="text" value={editForm.office} onChange={e => setEditForm(f => ({ ...f, office: e.target.value }))} className="mt-1 block w-full px-3 py-2 bg-(--bg) border border-(--border) rounded-md text-(--text-primary)" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Навыки (через запятую)</label>
                  <input type="text" value={editForm.skills} onChange={e => setEditForm(f => ({ ...f, skills: e.target.value }))} className="mt-1 block w-full px-3 py-2 bg-(--bg) border border-(--border) rounded-md text-(--text-primary)" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300">Роль</label>
                  <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} className="mt-1 block w-full px-3 py-2 bg-(--bg) border border-(--border) rounded-md text-(--text-primary)">
                    <option value="ADMIN">Администратор</option>
                    <option value="ANALYST">Аналитик</option>
                    <option value="MANAGER">Менеджер</option>
                    <option value="USER">Пользователь</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={saveEdit} className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md">Сохранить</button>
                <button onClick={() => setEditingId(null)} className="flex-1 px-4 py-2 bg-(--border) hover:bg-(--bg) text-(--text-primary) font-medium rounded-md">Отмена</button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ DELETE CONFIRM MODAL ═══════ */}
        {deletingId !== null && (
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
            onClick={() => setDeletingId(null)}
          >
            <div
              className="bg-(--bg-card) border border-(--border) rounded-xl p-6 shadow-xl"
              style={{ maxWidth: 400, width: "100%" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-2">Удалить сотрудника?</h2>
              <p className="text-gray-400 text-sm mb-6">Это действие необратимо. Сотрудник и его аккаунт будут удалены.</p>
              <div className="flex gap-3">
                <button onClick={confirmDelete} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md">Удалить</button>
                <button onClick={() => setDeletingId(null)} className="flex-1 px-4 py-2 bg-(--border) hover:bg-(--bg) text-(--text-primary) font-medium rounded-md">Отмена</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedGuard>
  );
}
