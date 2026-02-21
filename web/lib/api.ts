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
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  tickets: {
    list: (params?: Record<string, string>) => {
      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      return apiFetch<TicketRow[]>(`/tickets${qs}`);
    },
    get: (id: number) => apiFetch<TicketDetail>(`/tickets/${id}`),
    process: () =>
      apiFetch<ProcessResult>("/tickets/process", { method: "POST" }),
  },
  stats: {
    get: () => apiFetch<Stats>("/stats"),
  },
  managers: {
    list: () => apiFetch<Manager[]>("/managers"),
  },
  assignments: {
    list: () => apiFetch<unknown[]>("/assignments"),
  },
  starTask: {
    query: (q: string) =>
      apiFetch<StarTaskResult>("/star-task", {
        method: "POST",
        body: JSON.stringify({ query: q }),
      }),
  },
};
