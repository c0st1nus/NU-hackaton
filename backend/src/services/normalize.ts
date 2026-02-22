/**
 * Unified ticket normalization layer.
 *
 * Every ingest channel (CSV, JSON import, voice agent, chat widget)
 * converts its raw payload into a single UnifiedTicket shape.
 * The analysis worker downstream never knows where the data came from.
 */

// ─── Image attachments ────────────────────────────────────────────────────────

export interface ImageAttachment {
  /** "url" = external link, "base64" = inline data */
  type: "url" | "base64";
  /** The URL or base64-encoded content */
  data: string;
  /** MIME type for base64, e.g. "image/jpeg", "image/png" */
  mimeType?: string;
}

// ─── Unified ticket interface ─────────────────────────────────────────────────

export type TicketSource = "voice" | "csv" | "json" | "chat";

export interface UnifiedTicket {
  /** The original complaint / request text — always present */
  text: string;
  /** Channel the ticket arrived from */
  source: TicketSource;
  /** Company owning this ticket */
  companyId: number;

  // ── Optional structured fields ───────────────────────────────────────────
  guid?: string;
  segment?: string;
  language?: string;
  gender?: string;
  birthDate?: string;
  country?: string;
  city?: string;
  street?: string;
  house?: string;
  contact?: string;
  status?: string;

  /** Image attachments (screenshots, photos from chat, etc.) */
  images?: ImageAttachment[];

  /** Channel-specific data (phone, callId, chatSessionId, etc.) */
  meta: Record<string, unknown>;
}

// ─── Raw payload types per channel ────────────────────────────────────────────

export interface CsvRow {
  guid: string;
  gender?: string;
  birthDate?: string;
  segment?: string;
  description: string;
  country?: string;
  city?: string;
  street?: string;
  house?: string;
  contact?: string;
}

export interface VoicePayload {
  phone: string;
  callId: string;
  duration: number;
  city?: string;
  status?: string;
  transcript: Array<{ role: string; text: string }>;
}

export interface ChatPayload {
  sessionId: string;
  userId?: number;
  messages: Array<{ role: string; text: string }>;
  city?: string;
  status?: string;
  /** Attached images — URL links or base64 data */
  images?: ImageAttachment[];
}

// ─── Normalizer ───────────────────────────────────────────────────────────────

export function normalizeTicket(
  source: TicketSource,
  raw: unknown,
  companyId: number,
): UnifiedTicket {
  if (source === "csv" || source === "json") {
    const r = raw as CsvRow;
    return {
      text: r.description || "",
      source,
      companyId,
      guid: r.guid,
      segment: r.segment,
      gender: r.gender,
      birthDate: r.birthDate,
      country: r.country,
      city: r.city,
      street: r.street,
      house: r.house,
      contact: r.contact,
      meta: { guid: r.guid },
    };
  }

  if (source === "voice") {
    const r = raw as VoicePayload;
    return {
      text: r.transcript.map((t) => t.text).join(" "),
      source: "voice",
      companyId,
      city: r.city,
      status: r.status,
      country: "Казахстан",
      meta: { phone: r.phone, duration: r.duration, callId: r.callId },
    };
  }

  if (source === "chat") {
    const r = raw as ChatPayload;
    return {
      text: r.messages.map((m) => m.text).join("\n"),
      source: "chat",
      companyId,
      city: r.city,
      status: r.status,
      images: r.images,
      meta: { sessionId: r.sessionId, userId: r.userId },
    };
  }

  // Fallback — treat as raw text
  return {
    text: String(raw),
    source,
    companyId,
    meta: {},
  };
}
