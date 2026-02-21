"use client";

import { Building2, MapPin, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { BusinessUnit } from "@/types";

type FormData = {
  office: string;
  address: string;
};

type Suggestion = {
  displayName: string;
  latitude: number;
  longitude: number;
};

const emptyForm: FormData = { office: "", address: "" };

export default function BusinessUnitsPage() {
  const [units, setUnits] = useState<BusinessUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Address autocomplete
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sugLoading, setSugLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSugLoading(true);
      try {
        const results = await api.businessUnits.suggestions(q, form.office || undefined);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setSugLoading(false);
      }
    }, 400);
  }, [form.office]);

  const handleAddressChange = (value: string) => {
    setForm({ ...form, address: value });
    fetchSuggestions(value);
  };

  const selectSuggestion = (s: Suggestion) => {
    setForm({ ...form, address: s.displayName });
    setShowSuggestions(false);
    setSuggestions([]);
  };

  // Close suggestions on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const load = () => {
    setLoading(true);
    api.businessUnits
      .list()
      .then(setUnits)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setSuggestions([]);
    setShowSuggestions(false);
    setShowForm(true);
  };

  const openEdit = (bu: BusinessUnit) => {
    setEditId(bu.id);
    setForm({
      office: bu.office,
      address: bu.address ?? "",
    });
    setSuggestions([]);
    setShowSuggestions(false);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    const payload: any = {
      office: form.office,
      address: form.address || undefined,
    };
    try {
      if (editId) {
        await api.businessUnits.update(editId, payload);
      } else {
        await api.businessUnits.create(payload);
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditId(null);
      load();
    } catch (e) {
      alert("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить этот офис? Тикеты потеряют привязку.")) return;
    try {
      await api.businessUnits.delete(id);
      load();
    } catch {
      alert("Ошибка удаления");
    }
  };

  return (
    <div className="page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Building2 size={22} /> Управление офисами
          </h1>
          <p className="page-subtitle">Филиалы и отделения компании</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={14} /> Добавить
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title">{editId ? "Редактирование офиса" : "Новый офис"}</h3>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 600 }}>
            <div className="input-wrap">
              <label className="input-label" style={{ textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 12, fontWeight: 600 }}>
                Город / Название офиса *
              </label>
              <input
                className="input"
                type="text"
                value={form.office}
                onChange={(e) => setForm({ ...form, office: e.target.value })}
                placeholder="Алматы"
              />
            </div>
            <div ref={suggestionsRef} style={{ position: "relative" }}>
              <label className="input-label" style={{ textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 12, fontWeight: 600 }}>
                Адрес
              </label>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  type="text"
                  value={form.address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="Начните вводить адрес..."
                  style={{ paddingRight: 32 }}
                />
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: sugLoading ? "var(--primary)" : "var(--text-muted)",
                    animation: sugLoading ? "spin 1s linear infinite" : "none",
                  }}
                />
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)",
                    boxShadow: "var(--shadow-md)",
                    maxHeight: 240,
                    overflowY: "auto",
                    marginTop: 4,
                  }}
                >
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectSuggestion(s)}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                        width: "100%",
                        padding: "10px 14px",
                        background: "transparent",
                        border: "none",
                        borderBottom: i < suggestions.length - 1 ? "1px solid var(--border)" : "none",
                        color: "var(--text-primary)",
                        fontSize: 13,
                        textAlign: "left",
                        cursor: "pointer",
                        lineHeight: 1.5,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <MapPin size={14} style={{ marginTop: 3, flexShrink: 0, color: "var(--primary)" }} />
                      <span style={{ color: "var(--text-secondary)" }}>{s.displayName}</span>
                    </button>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                📍 Координаты определяются автоматически по адресу
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving || !form.office.trim()}>
                {saving ? "Определение координат..." : editId ? "Сохранить" : "Создать"}
              </button>
              <button className="btn btn-secondary" onClick={() => { setShowForm(false); setEditId(null); }}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: "grid", gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 72, borderRadius: 8 }} />
          ))}
        </div>
      ) : units.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 0" }}>
          <p style={{ color: "var(--text-muted)" }}>Нет офисов. Добавьте первый!</p>
        </div>
      ) : (
        <div className="card">
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "10px 12px" }}>Офис</th>
                <th style={{ textAlign: "left", padding: "10px 12px" }}>Адрес</th>
                <th style={{ textAlign: "center", padding: "10px 12px" }}>Координаты</th>
                <th style={{ textAlign: "right", padding: "10px 12px" }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {units.map((bu) => (
                <tr key={bu.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "12px", fontWeight: 600 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <MapPin size={14} style={{ color: "var(--primary)" }} />
                      {bu.office}
                    </span>
                  </td>
                  <td style={{ padding: "12px", color: "var(--text-secondary)", fontSize: 13 }}>
                    {bu.address || "—"}
                  </td>
                  <td style={{ padding: "12px", textAlign: "center", fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>
                    {bu.latitude != null && bu.longitude != null
                      ? `${bu.latitude.toFixed(4)}, ${bu.longitude.toFixed(4)}`
                      : "—"}
                  </td>
                  <td style={{ padding: "12px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(bu)} title="Редактировать">
                        <Pencil size={13} />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(bu.id)} title="Удалить">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
