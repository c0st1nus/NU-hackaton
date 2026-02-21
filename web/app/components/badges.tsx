// Segment badge: VIP / Priority / Mass
export function SegmentBadge({ segment }: { segment: string | null }) {
  if (!segment) return null;
  const cls =
    segment === "VIP"
      ? "badge-vip"
      : segment === "Priority"
        ? "badge-priority"
        : "badge-mass";
  return <span className={`badge ${cls}`}>{segment}</span>;
}

// Sentiment badge: Позитивный / Нейтральный / Негативный
export function SentimentBadge({ sentiment }: { sentiment: string | null }) {
  if (!sentiment) return null;
  const cls =
    sentiment === "Позитивный"
      ? "badge-positive"
      : sentiment === "Негативный"
        ? "badge-negative"
        : "badge-neutral";
  return <span className={`badge ${cls}`}>{sentiment}</span>;
}

// Priority badge: 1-10 coloured dot
export function PriorityBadge({ priority }: { priority: number | null }) {
  if (priority == null) return null;
  const cls =
    priority <= 3
      ? "priority-low"
      : priority <= 6
        ? "priority-medium"
        : "priority-high";
  return <span className={`priority-dot ${cls}`}>{priority}</span>;
}

// Assignment / processing status badge
export function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const map: Record<string, string> = {
    Assigned: "badge-assigned",
    Processing: "badge-processing",
    New: "badge-new",
    Escalated: "badge-escalated",
  };
  return (
    <span className={`badge ${map[status] ?? "badge-new"}`}>{status}</span>
  );
}

// Language badge: RU / KZ / ENG with flag emoji
const LANG_FLAGS: Record<string, string> = {
  RU: "🇷🇺",
  KZ: "🇰🇿",
  ENG: "🇬🇧",
  EN: "🇬🇧",
};
export function LangBadge({ lang }: { lang: string | null }) {
  if (!lang) return null;
  return (
    <span className="badge badge-lang">
      {LANG_FLAGS[lang] ?? ""} {lang}
    </span>
  );
}
