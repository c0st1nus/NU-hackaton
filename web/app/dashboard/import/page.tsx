"use client";

import { useState } from "react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/auth-context";
import { ProtectedGuard } from "../../components/protected-guard";
import { useI18n } from "../../../dictionaries/i18n";

type PreviewResponse = {
  success?: boolean;
  previewId?: string;
  data?: any[];
  totalRecords?: number;
  error?: string;
};

export default function ImportDashboard() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const { t } = useI18n();

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setPreviewId(null);
    setPreviewData([]);

    try {
      const formData = new FormData();
      if (file) {
        formData.append("file", file);
      } else if (url) {
        formData.append("url", url);
      } else {
        setError("Please provide a file or a Google Sheets URL");
        setLoading(false);
        return;
      }

      // We need to use native fetch for FormData, since api.post stringifies JSON
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/data/preview`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        },
      );

      const data: PreviewResponse = await res.json();

      if (data.error) throw new Error(data.error);

      if (data.success && data.previewId && data.data) {
        setPreviewId(data.previewId);
        setPreviewData(data.data);
        setTotalRecords(data.totalRecords || 0);
      }
    } catch (e: any) {
      setError(e.message || "Failed to load preview");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!previewId) return;
    setLoading(true);
    try {
      const res = await api.post<{
        success?: boolean;
        error?: string;
        count?: number;
      }>("/api/data/confirm", { previewId });
      if (res.error) throw new Error(res.error);
      alert(`Successfully imported ${res.count} records!`);
      // Reset state
      setPreviewId(null);
      setPreviewData([]);
      setFile(null);
      setUrl("");
    } catch (e: any) {
      setError(e.message || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (user.role !== "ADMIN") {
    return (
      <div className="p-8 text-(--text-primary)">
        <h1 className="text-2xl font-bold">{t.import.title as string}</h1>
        <p className="text-gray-400 mt-2">
          {t.import.adminOnly as string}
        </p>
      </div>
    );
  }

  return (
    <ProtectedGuard requireAdmin={true}>
    <div className="p-8 text-(--text-primary) max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">{t.import.title as string}</h1>
        <p className="text-gray-400 mt-2">
          {t.import.subtitle as string}
        </p>
      </div>

      {!previewId ? (
        <div className="bg-(--bg-card) border border-(--border) rounded-xl p-6 shadow-md max-w-2xl">
          <form onSubmit={handlePreview} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t.import.uploadLabel as string}
              </label>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.json"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setUrl(""); // Clear URL if file selected
                }}
                className="w-full text-sm text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-blue-600 file:text-white
                  hover:file:bg-blue-700"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-(--border)" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-(--bg-card) text-gray-400">{t.import.or as string}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t.import.googleLink as string}
              </label>
              <input
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setFile(null); // Clear file if URL is typed
                }}
                className="w-full px-3 py-2 bg-(--bg) border border-(--border) rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm text-(--text-primary)"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t.import.googleLinkDesc as string}
              </p>
            </div>

            {error && <div className="text-red-500 text-sm">{error}</div>}

            <button
              type="submit"
              disabled={loading || (!file && !url)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md disabled:bg-gray-600 w-full"
            >
              {loading ? (t.import.loadingPreview as string) : (t.import.loadPreview as string)}
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-(--bg-card) p-4 rounded-xl border border-(--border)">
            <div>
              <h2 className="text-xl font-semibold">{t.import.dataPreview as string}</h2>
              <p className="text-sm text-gray-400">
                {(t.import.dataPreviewDesc as string).replace("{count}", totalRecords.toString())}
              </p>
            </div>
            <div className="space-x-4">
              <button
                onClick={() => setPreviewId(null)}
                className="px-4 py-2 bg-(--border) hover:bg-(--bg) rounded-md text-sm font-medium transition"
              >
                {t.import.cancel as string}
              </button>
              <button
                onClick={handleImport}
                disabled={loading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm font-medium transition"
              >
                {loading ? (t.import.importing as string) : (t.import.acceptImport as string)}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-(--bg-card) p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-(--border) bg-(--bg-card)">
            <table className="w-full text-sm text-left">
              <thead className="bg-(--bg) text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-4 py-3 border-b border-(--border)">GUID</th>
                  <th className="px-4 py-3 border-b border-(--border)">
                    {t.dashboard.segment as string}
                  </th>
                  <th className="px-4 py-3 border-b border-(--border)">
                    {t.ticketDetail.ticketInfo as string}
                  </th>
                  <th className="px-4 py-3 border-b border-(--border)">
                    {t.ticketDetail.city as string}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border)">
                {previewData.map((row, i) => (
                  <tr key={i} className="hover:bg-(--bg) transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-300">
                      {String(row.guid || "").slice(0, 12)}...
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-(--border) text-(--text-primary) text-xs px-2 py-1 rounded">
                        {row.segment || "Unknown"}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 max-w-md truncate"
                      title={row.description}
                    >
                      {row.description}
                    </td>
                    <td className="px-4 py-3">{row.city || "Not specified"}</td>
                  </tr>
                ))}
                {previewData.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      {t.import.noData as string}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    </ProtectedGuard>
  );
}
