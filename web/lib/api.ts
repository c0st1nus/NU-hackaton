import type {
  Manager,
  ProcessResult,
  StarTaskResult,
  Stats,
  TicketDetail,
  TicketRow,
} from "@/types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    credentials: "include", // Essential for auth cookies
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, init?: RequestInit) =>
    apiFetch<T>(path, { ...init, method: "GET" }),
  post: <T>(path: string, body: any, init?: RequestInit) =>
    apiFetch<T>(path, { ...init, method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: any, init?: RequestInit) =>
    apiFetch<T>(path, { ...init, method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string, init?: RequestInit) =>
    apiFetch<T>(path, { ...init, method: "DELETE" }),

  tickets: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return apiFetch<TicketRow[]>(`/api/tickets${qs}`);
    },
    get: (id: number) => apiFetch<TicketDetail>(`/api/tickets/${id}`),
    process: () =>
      apiFetch<ProcessResult>("/api/tickets/process", { method: "POST" }),
    update: (id: number, data: Partial<TicketRow>) =>
      apiFetch<{ success: boolean; error?: string }>(`/api/tickets/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      apiFetch<{ success: boolean; error?: string }>(`/api/tickets/${id}`, {
        method: "DELETE",
      }),
  },
  stats: {
    get: () => apiFetch<Stats>("/api/stats"),
  },
  managers: {
    list: () => apiFetch<Manager[]>("/api/managers"),
  },
  assignments: {
    list: () => apiFetch<unknown[]>("/api/assignments"),
  },
  starTask: {
    query: (q: string) =>
      apiFetch<StarTaskResult>("/star-task", {
        method: "POST",
        body: JSON.stringify({ query: q }),
      }),
  },
};
