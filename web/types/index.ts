// ── Business Unit ─────────────────────────────────────────────────────
export interface BusinessUnit {
  id: number;
  companyId: number;
  office: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

// ── Ticket row (list view) ─────────────────────────────────────────────
export interface TicketRow {
  id: number;
  guid: string;
  segment: "Mass" | "VIP" | "Priority" | string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  source: string | null;
  status: string | null;
  notes: string | null;
  createdAt: string | null;
  // Business Unit
  businessUnitId: number | null;
  businessUnitOffice: string | null;
  businessUnitAddress: string | null;
  businessUnitLatitude: number | null;
  businessUnitLongitude: number | null;
  // AI analysis
  ticketType: string | null;
  sentimentVal: "Позитивный" | "Нейтральный" | "Негативный" | string | null;
  priority: number | null;
  language: "RU" | "KZ" | "ENG" | string | null;
  summary: string | null;
  recommendation: string | null;
  // Assignment
  assignmentId: number | null;
  assignmentReason: string | null;
  assignedAt: string | null;
  // Manager
  managerId: number | null;
  managerName: string | null;
  managerPosition: string | null;
  managerOffice: string | null;
  managerSkills: string[] | null;
  managerLoad: number | null;
}

// ── Ticket detail (full row from join) ────────────────────────────────
export interface TicketDetail {
  tickets: {
    id: number;
    guid: string;
    gender: string | null;
    birthDate: string | null;
    segment: string | null;
    description: string | null;
    businessUnitId: number | null;
    latitude: number | null;
    longitude: number | null;
    source: string | null;
    status: string | null;
    notes: string | null;
    createdAt: string | null;
  };
  ticket_analysis: {
    id: number | null;
    ticketType: string | null;
    sentiment: string | null;
    priority: number | null;
    language: string | null;
    summary: string | null;
    recommendation: string | null;
    processedAt: string | null;
  } | null;
  managers: {
    id: number | null;
    name: string | null;
    position: string | null;
    office: string | null;
    skills: string[] | null;
    currentLoad: number | null;
  } | null;
  assignments: {
    id: number | null;
    assignedAt: string | null;
    assignmentReason: string | null;
  } | null;
  business_units: {
    id: number | null;
    office: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
}

// ── Stats ─────────────────────────────────────────────────────────────
export interface StatTotals {
  total_tickets: number;
  avg_priority: number;
  negative_count: number;
  vip_count: number;
}

export interface StatItem {
  name: string;
  count: number;
}
export interface ManagerLoad {
  name: string;
  office: string;
  load: number;
  position: string;
}

export interface Stats {
  totals: StatTotals;
  byType: StatItem[];
  bySentiment: StatItem[];
  byOffice: StatItem[];
  bySegment: StatItem[];
  managerLoads: ManagerLoad[];
}

// ── Manager ───────────────────────────────────────────────────────────
export interface Manager {
  id: number;
  userId: number | null;
  name: string;
  position: string | null;
  office: string | null;
  skills: string[] | null;
  currentLoad: number | null;
  email: string | null;
  role: string | null;
}

// ── Star Task ─────────────────────────────────────────────────────────
export interface StarTaskResult {
  type: "text" | "sql_result" | "error";
  text: string;
  data?: {
    sql: string;
    columns: string[];
    rows: unknown[][];
    chartType: "bar" | "pie" | "line";
    chartTitle: string;
  };
}

// ── Process result ────────────────────────────────────────────────────
export interface ProcessResult {
  count: number;
  errors: string[];
}
